import { useEffect, useRef, useCallback } from 'react';

/*
  MobileControls — virtual joystick (bottom-left) and fire button (bottom-right).

  Only rendered on touch-oriented devices via CSS media query
  (@media (hover: none) and (pointer: coarse)). Never visible on
  desktop mouse/keyboard setups or hybrid devices that report touch
  but have a precision pointer.

  Both controls write into the same keysRef used by keyboard input via
  setVirtualKey(key, pressed), so there is one shared input state and
  zero duplicate movement logic.

  Multi-touch: each control tracks its own pointerId so the player can
  steer and fire simultaneously.
*/

const JOYSTICK_RADIUS = 52;  // outer ring radius px
const KNOB_RADIUS     = 22;  // draggable knob radius px
const DEAD_ZONE       = 0.18; // fraction of max travel before input fires
const FIRE_RADIUS     = 44;  // fire button radius px

// Threshold fractions of max travel to distinguish diagonal from cardinal
const DIAG = 0.42;

// Maps joystick offset to key presses. Supports diagonal (steer+thrust).
function joystickToKeys(dx, dy, maxR) {
  const nx = dx / maxR; // normalised -1..1
  const ny = dy / maxR;
  return {
    KeyW: ny < -DEAD_ZONE,
    KeyS: ny >  DEAD_ZONE,
    KeyA: nx < -DEAD_ZONE,
    KeyD: nx >  DEAD_ZONE,
  };
}

export function MobileControls({ setVirtualKey, active }) {
  const joystickRef   = useRef(null);
  const fireRef       = useRef(null);
  const joystickState = useRef({ pointerId: null, centerX: 0, centerY: 0, keys: {} });
  const fireState     = useRef({ pointerId: null });
  const knobRef       = useRef(null);

  // Release all virtual keys — called on cleanup and pointer cancel/up
  const releaseJoystick = useCallback(() => {
    const prev = joystickState.current.keys;
    Object.keys(prev).forEach(k => { if (prev[k]) setVirtualKey(k, false); });
    joystickState.current.keys = {};
    joystickState.current.pointerId = null;
    // Reset knob to center
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [setVirtualKey]);

  const releaseFire = useCallback(() => {
    setVirtualKey('Space', false);
    fireState.current.pointerId = null;
  }, [setVirtualKey]);

  // ── Joystick handlers ─────────────────────────────────────────────────────
  const onJoystickDown = useCallback((e) => {
    e.preventDefault();
    if (joystickState.current.pointerId !== null) return; // already tracking
    const el = joystickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    joystickState.current.pointerId = e.pointerId;
    joystickState.current.centerX   = rect.left + rect.width  / 2;
    joystickState.current.centerY   = rect.top  + rect.height / 2;
    el.setPointerCapture(e.pointerId);
  }, []);

  const onJoystickMove = useCallback((e) => {
    e.preventDefault();
    const st = joystickState.current;
    if (st.pointerId !== e.pointerId) return;

    const rawDx = e.clientX - st.centerX;
    const rawDy = e.clientY - st.centerY;
    const dist  = Math.hypot(rawDx, rawDy);
    const clamp = Math.min(dist, JOYSTICK_RADIUS - KNOB_RADIUS);
    const scale = dist > 0 ? clamp / dist : 0;
    const dx    = rawDx * scale;
    const dy    = rawDy * scale;

    // Move knob visually
    if (knobRef.current) {
      knobRef.current.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    // Update virtual keys — only changed keys trigger setVirtualKey
    const next = joystickToKeys(rawDx, rawDy, JOYSTICK_RADIUS - KNOB_RADIUS);
    const prev = st.keys;
    Object.entries(next).forEach(([k, v]) => {
      if (v !== !!prev[k]) setVirtualKey(k, v);
    });
    st.keys = next;
  }, [setVirtualKey]);

  const onJoystickUp = useCallback((e) => {
    e.preventDefault();
    if (joystickState.current.pointerId !== e.pointerId) return;
    releaseJoystick();
  }, [releaseJoystick]);

  // ── Fire button handlers ──────────────────────────────────────────────────
  const onFireDown = useCallback((e) => {
    e.preventDefault();
    if (fireState.current.pointerId !== null) return;
    fireState.current.pointerId = e.pointerId;
    fireRef.current?.setPointerCapture(e.pointerId);
    setVirtualKey('Space', true);
  }, [setVirtualKey]);

  const onFireUp = useCallback((e) => {
    e.preventDefault();
    if (fireState.current.pointerId !== e.pointerId) return;
    releaseFire();
  }, [releaseFire]);

  // ── Cleanup on unmount or game state change ───────────────────────────────
  useEffect(() => {
    if (!active) {
      releaseJoystick();
      releaseFire();
    }
  }, [active, releaseJoystick, releaseFire]);

  useEffect(() => {
    return () => {
      releaseJoystick();
      releaseFire();
    };
  }, [releaseJoystick, releaseFire]);

  if (!setVirtualKey) return null;

  return (
    <div className="ds-mobile-controls" style={st.wrapper}>
      {/* Joystick — bottom-left */}
      <div
        ref={joystickRef}
        onPointerDown={onJoystickDown}
        onPointerMove={onJoystickMove}
        onPointerUp={onJoystickUp}
        onPointerCancel={onJoystickUp}
        style={st.joystickOuter}
      >
        <div ref={knobRef} style={st.joystickKnob} />
      </div>

      {/* Fire button — bottom-right */}
      <div
        ref={fireRef}
        onPointerDown={onFireDown}
        onPointerUp={onFireUp}
        onPointerCancel={onFireUp}
        style={st.fireBtn}
      >
        <div style={st.fireBtnInner} />
      </div>
    </div>
  );
}

/*
  All positioning uses env(safe-area-inset-*) with a px fallback so
  the controls clear the iPhone notch and home indicator in landscape.
  The entire wrapper is hidden on non-touch devices via the CSS
  @media (hover: none) and (pointer: coarse) query — this is more
  reliable than JS touch detection for distinguishing real touch
  devices from hybrid laptops.
*/
const BOTTOM = `max(env(safe-area-inset-bottom, 0px) + 18px, 24px)`;
const LEFT   = `max(env(safe-area-inset-left,   0px) + 18px, 24px)`;
const RIGHT  = `max(env(safe-area-inset-right,  0px) + 18px, 24px)`;

const st = {
  wrapper: {
    position: 'fixed', inset: 0,
    pointerEvents: 'none',
    zIndex: 30,
    // Hide on hover+precise pointer (desktop, hybrid) — show only on
    // coarse touch devices (phones, tablets).
    display: 'none',
  },
  joystickOuter: {
    position: 'absolute',
    bottom: BOTTOM,
    left: LEFT,
    width:  JOYSTICK_RADIUS * 2,
    height: JOYSTICK_RADIUS * 2,
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.06)',
    border: '1.5px solid rgba(0,229,255,0.30)',
    boxShadow: '0 0 16px rgba(0,229,255,0.08)',
    pointerEvents: 'all',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  joystickKnob: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width:  KNOB_RADIUS * 2,
    height: KNOB_RADIUS * 2,
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.18)',
    border: '1.5px solid rgba(0,229,255,0.55)',
    boxShadow: '0 0 10px rgba(0,229,255,0.22)',
    pointerEvents: 'none',
    transition: 'transform 0.05s ease',
  },
  fireBtn: {
    position: 'absolute',
    bottom: BOTTOM,
    right: RIGHT,
    width:  FIRE_RADIUS * 2,
    height: FIRE_RADIUS * 2,
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.08)',
    border: '1.5px solid rgba(0,229,255,0.35)',
    boxShadow: '0 0 20px rgba(0,229,255,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'all',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  fireBtnInner: {
    width: 28, height: 28,
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.35)',
    boxShadow: '0 0 12px rgba(0,229,255,0.4)',
    pointerEvents: 'none',
  },
};