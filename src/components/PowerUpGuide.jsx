import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { POWERUP_TYPES } from '../game/powerUpGlyph';
import { PixelIcon } from './PixelIcon';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const TYPES = Object.keys(POWERUP_TYPES);

/* Compact home-screen teaser: a row of the pickup sprites.
   Clicking it opens the full guide. */
export function PowerUpStrip({ onOpen, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onOpen}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label="How power-ups work"
      style={{
        ...styles.strip,
        borderColor: hov ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.18)',
        opacity: disabled ? 0.25 : 1,
      }}
    >
      <span style={styles.stripLabel}>POWER-UPS</span>
      <span style={styles.stripIcons}>
        {TYPES.map(t => <PixelIcon key={t} type={t} size={12} glow={hov} />)}
      </span>
      <span style={{ ...styles.stripHint, color: hov ? '#fff' : 'rgba(0,229,255,0.55)' }}>?</span>
    </button>
  );
}

/* Full guide overlay — an arcade "attract mode" style instruction card. */
export function PowerUpGuide({ onClose }) {
  const reduceMotion = useReducedMotion();
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 20);
    const onKey = e => {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-label="Power-ups"
        onClick={e => e.stopPropagation()}
        style={{
          ...styles.panel,
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0)' : 'translateY(10px)',
          transition: reduceMotion ? 'none' : 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <div style={styles.title}>POWER-UPS</div>
        <div style={styles.subtitle}>
          SHOOT ASTEROIDS TO SHAKE THEM LOOSE · FLY INTO ONE TO GRAB IT
        </div>
        <div style={styles.divider} />

        <div style={styles.grid}>
          {TYPES.map(t => {
            const { label, desc, color } = POWERUP_TYPES[t];
            return (
              <div key={t} style={styles.row}>
                <div style={{ ...styles.iconBox, borderColor: `${color}88`, boxShadow: `0 0 10px ${color}33` }}>
                  <PixelIcon type={t} size={21} />
                </div>
                <div>
                  <div style={{ ...styles.name, color, textShadow: `0 0 8px ${color}80` }}>{label}</div>
                  <div style={styles.desc}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.divider} />
        <div style={styles.footer}>
          Pickups blink before they vanish, so grab them fast.
          Timed power-ups show a countdown bar at the top of the screen.
        </div>
        <div style={{ ...styles.footer, marginTop: 10, color: 'rgba(255,59,59,0.75)' }}>
          ⚠ From wave 2, enemy UFOs fly through and shoot back.
          Take them down for big points and a power-up.
        </div>
        <button style={styles.closeBtn} onClick={onClose}>GOT IT</button>
      </div>
    </div>
  );
}

const styles = {
  strip: {
    background: 'rgba(0,229,255,0.03)',
    border: '1px solid',
    borderRadius: 2,
    padding: '9px 14px',
    display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, opacity 0.15s ease',
  },
  stripLabel: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 3,
    color: 'rgba(0,229,255,0.55)',
  },
  stripIcons: { display: 'flex', gap: 8, alignItems: 'center' },
  stripHint: {
    fontFamily: FONT_PIXEL, fontSize: 8, transition: 'color 0.2s ease',
  },

  overlay: {
    position: 'fixed', inset: 0, zIndex: 40, // above mobile controls (30)
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(3,4,8,0.82)', backdropFilter: 'blur(3px)',
    padding: 16, boxSizing: 'border-box',
  },
  panel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: '1px solid rgba(0,229,255,0.22)',
    background: 'rgba(3,6,12,0.92)',
    boxShadow: '0 0 40px rgba(0,229,255,0.08)',
    padding: 'clamp(18px, 4vh, 36px) clamp(18px, 4vw, 44px)',
    width: 'min(760px, 100%)',
    maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box',
  },
  title: {
    fontFamily: FONT_PIXEL, fontSize: 18, letterSpacing: 5,
    color: '#eaf7fc', textShadow: '0 0 24px rgba(0,229,255,0.55)',
    marginBottom: 12, textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2.5,
    color: 'rgba(0,229,255,0.6)', textAlign: 'center', lineHeight: 1.6,
  },
  divider: {
    width: '100%', height: 1, flexShrink: 0,
    background: 'rgba(0,229,255,0.15)', margin: '18px 0',
  },
  grid: {
    width: '100%',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px 28px',
  },
  row: { display: 'flex', alignItems: 'center', gap: 14 },
  iconBox: {
    flexShrink: 0, width: 38, height: 38,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', background: 'rgba(255,255,255,0.02)',
  },
  name: { fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 1.5, marginBottom: 6 },
  desc: {
    fontFamily: FONT_MONO, fontSize: 11, lineHeight: 1.5,
    color: 'rgba(238,242,248,0.6)',
  },
  footer: {
    fontFamily: FONT_MONO, fontSize: 10, lineHeight: 1.6, letterSpacing: 0.3,
    color: 'rgba(238,242,248,0.4)', textAlign: 'center', maxWidth: 520,
  },
  closeBtn: {
    marginTop: 20,
    background: 'rgba(0,229,255,0.04)',
    border: '1px solid rgba(0,229,255,0.45)',
    color: '#00e5ff', cursor: 'pointer', borderRadius: 2,
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 4,
    padding: '13px 34px 11px',
  },
};
