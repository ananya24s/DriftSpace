const FONT_PIXEL  = "'Press Start 2P', monospace";
const FONT_MONO   = "'JetBrains Mono', 'Courier New', monospace";
const SHIP_POINTS = '10.00,1.00 19.00,19.00 10.00,16.23 1.00,19.00';

/* Rival status bar (bottom centre) + "INCOMING" warning when someone sends
   asteroids your way. Shown only during a versus match. */
export function VersusHUD({ rivals, incoming }) {
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
        <div key={incoming.tick} style={{
          ...styles.warn, color: incoming.color, textShadow: `0 0 18px ${incoming.color}cc`,
        }}>
          <div>
            <span style={styles.blink}>▲</span> INCOMING ×{incoming.n} <span style={styles.blink}>▲</span>
          </div>
          <div style={styles.warnFrom}>FROM {incoming.name}</div>
        </div>
      )}

      <div style={styles.bar}>
        {rivals.map(r => (
          <div key={r.id} style={{
            ...styles.chip,
            borderColor: `${r.color}${r.alive ? '66' : '22'}`,
            opacity: r.alive ? 1 : 0.45,
          }}>
            <span style={{
              ...styles.name, color: r.color, textShadow: r.alive ? `0 0 8px ${r.color}99` : 'none',
              textDecoration: r.alive ? 'none' : 'line-through',
            }}>
              {r.name || 'RIVAL'}
            </span>
            <span style={styles.score}>{r.score.toLocaleString()}</span>
            {r.alive ? (
              <span style={styles.lives}>
                {Array.from({ length: Math.max(3, r.lives) }, (_, i) => (
                  <svg key={i} width={8} height={8} viewBox="0 0 20 20" style={{ display: 'block' }}>
                    <polygon points={SHIP_POINTS} fill={r.color} fillOpacity={0.18}
                      stroke={r.color} strokeWidth={2.4} strokeLinejoin="round"
                      opacity={i < r.lives ? 1 : 0.2} />
                  </svg>
                ))}
              </span>
            ) : (
              <span style={styles.out}>{r.connected ? 'OUT' : 'LEFT'}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

const styles = {
  bar: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    bottom: 'max(env(safe-area-inset-bottom, 0px) + 14px, 18px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    flexWrap: 'wrap', maxWidth: 'calc(100vw - 32px)',
    pointerEvents: 'none', zIndex: 4,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px', whiteSpace: 'nowrap',
    border: '1px solid', background: 'rgba(0,0,0,0.6)',
  },
  name: {
    fontFamily: FONT_PIXEL, fontSize: 8, letterSpacing: 1,
    maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  score: { fontFamily: FONT_PIXEL, fontSize: 9, color: '#fff' },
  lives: { display: 'flex', gap: 3 },
  out: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.5)' },
  blink: { animation: 'vs-warn-blink 0.25s steps(1) infinite' },
  warn: {
    position: 'absolute', left: '50%', top: '26%', zIndex: 5, pointerEvents: 'none',
    fontFamily: FONT_PIXEL, fontSize: 14, letterSpacing: 3, textAlign: 'center',
    animation: 'vs-warn 1.4s steps(8) both',
  },
  warnFrom: { fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 3, marginTop: 8, opacity: 0.8 },
};
