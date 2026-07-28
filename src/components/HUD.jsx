import { useRef, useEffect, useState } from 'react';

/*
  Ship geometry: SHIP_GLYPH_POINTS rotated -90° (nose up) and scaled
  to a 20×20 SVG viewBox with 1px padding. Matches the exact shape used
  in gameplay and the menu — one visual identity throughout.

  Points:
    nose      (10.00,  1.00)
    right wing (19.00, 19.00)
    tail notch (10.00, 16.23)
    left wing   (1.00, 19.00)
*/
const SHIP_POINTS = '10.00,1.00 19.00,19.00 10.00,16.23 1.00,19.00';

const CYAN       = '#00e5ff';
const LOST_ALPHA = 0.22;   // opacity of a spent life
const FLASH_MS   = 150;    // duration of the white flash
const DIM_MS     = 400;    // duration of the fade to LOST_ALPHA

/*
  ShipLife — one life icon.

  Props:
    active   — true while this life is still held
    lost     — true the moment this life was just spent (drives the animation)
    index    — position (unused visually, kept for key stability)
*/
function ShipLife({ active, lost }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'flash' | 'dim' | 'spent'

  // Trigger the flash → dim sequence whenever `lost` goes from false → true.
  // Using a ref to track previous value avoids stale-closure issues.
  const wasLost = useRef(false);

  useEffect(() => {
    if (lost && !wasLost.current) {
      wasLost.current = true;
      setPhase('flash');
      const t1 = setTimeout(() => setPhase('dim'), FLASH_MS);
      const t2 = setTimeout(() => setPhase('spent'), FLASH_MS + DIM_MS);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [lost]);

  let fill, opacity, transition, filter;
  switch (phase) {
    case 'flash':
      fill       = '#ffffff';
      opacity    = 1;
      transition = `opacity ${FLASH_MS}ms ease, fill ${FLASH_MS}ms ease`;
      filter     = 'drop-shadow(0 0 4px #fff)';
      break;
    case 'dim':
      fill       = CYAN;
      opacity    = LOST_ALPHA;
      transition = `opacity ${DIM_MS}ms ease, fill ${DIM_MS}ms ease, filter ${DIM_MS}ms ease`;
      filter     = 'none';
      break;
    case 'spent':
      fill       = CYAN;
      opacity    = LOST_ALPHA;
      transition = 'none';
      filter     = 'none';
      break;
    default: // 'idle' — active life
      fill       = active ? CYAN : CYAN;
      opacity    = active ? 1 : LOST_ALPHA;
      transition = 'none';
      filter     = active
        ? `drop-shadow(0 0 3px rgba(0,229,255,0.7))`
        : 'none';
  }

  return (
    <svg
      width={18} height={18}
      viewBox="0 0 20 20"
      style={{ display: 'block', overflow: 'visible', transition: 'transform 0.15s ease' }}
    >
      <polygon
        points={SHIP_POINTS}
        fill={fill}
        fillOpacity={0.18}
        stroke={fill}
        strokeWidth={1.6}
        strokeLinejoin="round"
        style={{ opacity, transition, filter }}
      />
    </svg>
  );
}

export function HUD({ score, lives, wave }) {
  // Track which icons have been lost so we can fire the animation exactly once
  // per life lost rather than every render.
  const prevLivesRef = useRef(lives);
  const [lostSet, setLostSet] = useState(new Set()); // indices that were just lost

  useEffect(() => {
    const prev = prevLivesRef.current;
    if (lives < prev) {
      // The life that just disappeared is at index `lives` (0-based)
      // e.g. lives goes 3→2: index 2 was just spent
      const justLost = lives; // icon index that should animate
      setLostSet(s => new Set([...s, justLost]));
    }
    prevLivesRef.current = lives;
  }, [lives]);

  return (
    <div style={styles.hud}>
      {/* Score — left */}
      <div>
        <div style={styles.label}>SCORE</div>
        <div style={styles.score}>{score.toLocaleString()}</div>
      </div>

      {/* Lives + Wave — right */}
      <div style={styles.right}>
        <div style={styles.livesRow}>
          {Array.from({ length: 3 }, (_, i) => (
            <ShipLife
              key={i}
              index={i}
              active={i < lives}
              lost={lostSet.has(i)}
            />
          ))}
        </div>
        <div style={styles.waveRow}>
          <span style={styles.label}>WAVE</span>
          <span style={styles.wave}>{wave}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hud: {
    position: 'absolute', top: 0, left: 0, width: '100%',
    padding: '20px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    pointerEvents: 'none',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    boxSizing: 'border-box',
  },
  label: {
    fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3,
    textTransform: 'uppercase', marginBottom: 4,
  },
  score: {
    fontSize: 28, color: '#fff', fontWeight: 700, letterSpacing: 2,
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  livesRow: { display: 'flex', gap: 8, alignItems: 'center' },
  waveRow: { display: 'flex', alignItems: 'center', gap: 8 },
  wave: { fontSize: 13, color: 'rgba(0,229,255,0.8)', letterSpacing: 1 },
};