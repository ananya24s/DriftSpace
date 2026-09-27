import { useEffect, useState } from 'react';
import { EMOTES } from '../hooks/useVersus';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN       = '#00e5ff';

const IS_TOUCH = typeof window !== 'undefined'
  && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;

function EmoteStyle() {
  return (
    <style>{`
      @keyframes emote-pop {
        0%   { opacity: 0; transform: translateY(8px) scale(0.8); }
        12%  { opacity: 1; transform: translateY(0) scale(1.08); }
        20%  { transform: scale(1); }
        80%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-6px); }
      }
    `}</style>
  );
}

/* Recent emotes, bottom centre: "BLAZE  GG" in the pilot's colour.
   inGame lifts it above the rival chips. */
export function EmoteFeed({ emotes, inGame }) {
  if (!emotes.length) return null;
  return (
    <div style={{ ...styles.feed, bottom: inGame ? 'max(env(safe-area-inset-bottom, 0px) + 58px, 62px)' : 14 }}>
      <EmoteStyle />
      {emotes.map(e => (
        <div key={e.key} style={{
          ...styles.bubble,
          borderColor: `${e.color}88`,
          boxShadow: `0 0 14px ${e.color}33`,
        }}>
          <span style={{ ...styles.who, color: e.color }}>{e.isMe ? 'YOU' : e.name}</span>
          <span style={{ ...styles.text, textShadow: `0 0 10px ${e.color}aa` }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

function EmoteButton({ label, hint, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...styles.btn,
        borderColor: hov ? CYAN : 'rgba(0,229,255,0.3)',
        color: hov ? '#fff' : CYAN,
      }}
    >
      {hint && <span style={styles.hintKey}>{hint}</span>}
      {label}
    </button>
  );
}

/* Row of emote buttons, for the lobby / spectating / results panels */
export function EmoteBar({ onSend }) {
  return (
    <div style={styles.bar}>
      {EMOTES.map((e, i) => (
        <EmoteButton key={e} label={e} onClick={() => onSend(i)} />
      ))}
    </div>
  );
}

/* During a match: keys 1–6 on desktop; a SAY button + tray on phones */
export function InGameEmotes({ onSend }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = e => {
      const m = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
      if (m && !e.repeat) onSend(Number(m[1]) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSend]);

  if (!IS_TOUCH) {
    return (
      <div style={styles.keysHint}>
        <span style={styles.hintKey}>1–6</span> EMOTES
      </div>
    );
  }

  return (
    <div style={styles.touchWrap}>
      <button style={{ ...styles.sayBtn, borderColor: open ? CYAN : 'rgba(0,229,255,0.4)' }}
        onClick={() => setOpen(o => !o)} aria-label="Emotes">
        SAY
      </button>
      {open && (
        <div style={styles.tray}>
          {EMOTES.map((e, i) => (
            <EmoteButton key={e} label={e} onClick={() => { onSend(i); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  feed: {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 45,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    pointerEvents: 'none',
  },
  bubble: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 12px', border: '1px solid', background: 'rgba(3,4,8,0.85)',
    animation: 'emote-pop 2.8s steps(12) both', whiteSpace: 'nowrap',
  },
  who: { fontFamily: FONT_PIXEL, fontSize: 7, letterSpacing: 1 },
  text: { fontFamily: FONT_PIXEL, fontSize: 11, letterSpacing: 2, color: '#fff' },
  bar: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, width: '100%' },
  btn: {
    fontFamily: FONT_PIXEL, fontSize: 8, letterSpacing: 1,
    background: 'rgba(0,229,255,0.04)', border: '1px solid', borderRadius: 2,
    padding: '7px 9px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    transition: 'border-color 0.15s ease, color 0.15s ease',
  },
  hintKey: {
    fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(0,229,255,0.85)',
    border: '1px solid rgba(0,229,255,0.4)', borderRadius: 3, padding: '1px 5px',
  },
  keysHint: {
    position: 'absolute', left: 'clamp(16px, 2.5vw, 28px)',
    bottom: 'max(env(safe-area-inset-bottom, 0px) + 14px, 18px)',
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2, color: 'rgba(238,242,248,0.35)',
    display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none', zIndex: 4,
  },
  // Phones: under the score, where the solo pause button sits
  touchWrap: {
    position: 'absolute', zIndex: 6,
    left: 'max(env(safe-area-inset-left, 0px) + 16px, 24px)',
    top: 'max(env(safe-area-inset-top, 0px) + 72px, 80px)',
    display: 'flex', alignItems: 'flex-start', gap: 8,
  },
  sayBtn: {
    fontFamily: FONT_PIXEL, fontSize: 8, color: CYAN, letterSpacing: 1,
    background: 'rgba(0,229,255,0.05)', border: '1px solid', borderRadius: 2,
    height: 34, padding: '0 10px', cursor: 'pointer',
  },
  tray: {
    display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 6,
    padding: 6, background: 'rgba(3,4,8,0.9)', border: '1px solid rgba(0,229,255,0.25)',
  },
};
