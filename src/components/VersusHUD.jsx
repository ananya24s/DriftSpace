const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const RED        = '#ff3b3b';
const SHIP_POINTS = '10.00,1.00 19.00,19.00 10.00,16.23 1.00,19.00';

/* Opponent status bar (bottom centre) + "INCOMING" warning when they
   send asteroids your way. Shown only during a versus match. */
export function VersusHUD({ opponent, incoming }) {
  // Each new attack bumps incoming.tick; keying on it replays the warning,
  // whose animation ends fully transparent, so no timer/state is needed.
  return (
    <>
      <style>{`
        @keyframes vs-warn {
          0%   { opacity: 0; transform: translateX(-50%) scale(1.3); }
          15%  { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
        @keyframes vs-warn-blink { 0%, 49% { visibility: visible; } 50%, 100% { visibility: hidden; } }
      `}</style>

      {incoming.tick > 0 && (
        <div key={incoming.tick} style={styles.warn}>
          <span style={{ animation: 'vs-warn-blink 0.25s steps(1) infinite' }}>▲</span>
          {' '}INCOMING ×{incoming.n}{' '}
          <span style={{ animation: 'vs-warn-blink 0.25s steps(1) infinite' }}>▲</span>
        </div>
      )}

      <div style={styles.bar}>
        <span style={styles.tag}>VS</span>
        <span style={styles.name}>{opponent.name || 'RIVAL'}</span>
        <span style={styles.score}>{opponent.score.toLocaleString()}</span>
        <span style={styles.lives}>
          {Array.from({ length: Math.max(3, opponent.lives) }, (_, i) => (
            <svg key={i} width={10} height={10} viewBox="0 0 20 20" style={{ display: 'block' }}>
              <polygon points={SHIP_POINTS} fill={RED} fillOpacity={0.18}
                stroke={RED} strokeWidth={2} strokeLinejoin="round"
                opacity={i < opponent.lives ? 1 : 0.2} />
            </svg>
          ))}
        </span>
        <span style={styles.wave}>W{opponent.wave}</span>
        {!opponent.connected && <span style={styles.lost}>SIGNAL LOST</span>}
      </div>
    </>
  );
}

const styles = {
  bar: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    bottom: 'max(env(safe-area-inset-bottom, 0px) + 14px, 18px)',
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 14px', pointerEvents: 'none', zIndex: 4,
    border: `1px solid ${RED}55`, background: 'rgba(0,0,0,0.6)',
    boxShadow: `0 0 16px ${RED}22`, whiteSpace: 'nowrap',
  },
  tag: { fontFamily: FONT_PIXEL, fontSize: 8, color: 'rgba(255,255,255,0.4)' },
  name: {
    fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 1, color: RED,
    textShadow: `0 0 8px ${RED}99`, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  score: { fontFamily: FONT_PIXEL, fontSize: 10, color: '#fff' },
  lives: { display: 'flex', gap: 4 },
  wave: { fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
  lost: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2, color: RED },
  warn: {
    position: 'absolute', left: '50%', top: '26%', zIndex: 5, pointerEvents: 'none',
    fontFamily: FONT_PIXEL, fontSize: 14, letterSpacing: 3, color: RED,
    textShadow: `0 0 18px ${RED}cc`,
    animation: 'vs-warn 1.4s steps(8) both',
  },
};
