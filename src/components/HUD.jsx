import { useRef, useEffect, useState } from 'react';
import { POWERUP_TYPES } from '../game/powerUpGlyph';
import { PixelIcon } from './PixelIcon';
import { GAME } from '../game/constants';

const SHIP_POINTS = '10.00,1.00 19.00,19.00 10.00,16.23 1.00,19.00';
const CYAN        = '#00e5ff';
const LOST_ALPHA  = 0.22;
const FLASH_MS    = 150;
const DIM_MS      = 400;

const FONT_PIXEL  = "'Press Start 2P', monospace";
const FONT_MONO   = "'JetBrains Mono', 'Courier New', monospace";

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500;600&display=swap');
      @keyframes wave-in {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.82); }
        18%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        28%  { transform: translate(-50%, -50%) scale(1); }
        72%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.06); }
      }
      @keyframes life-pop {
        0%   { transform: scale(0.4); }
        50%  { transform: scale(1.5); }
        100% { transform: scale(1); }
      }
      @keyframes pu-in {
        0%   { opacity: 0; transform: translateY(-6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes pu-blink {
        0%, 49%   { opacity: 1; }
        50%, 100% { opacity: 0.25; }
      }
    `}</style>
  );
}

function ShipLife({ active, lost, fresh }) {
  const [phase, setPhase] = useState(fresh ? 'gain' : 'idle');
  const wasLost = useRef(false);

  // Newly added bonus slot — pop in, then settle
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setPhase('idle'), 500);
    return () => clearTimeout(t);
  }, [fresh]);

  useEffect(() => {
    // Life restored by a +1 LIFE pickup
    if (!lost && wasLost.current) {
      wasLost.current = false;
      setPhase('gain');
      const t = setTimeout(() => setPhase('idle'), 500);
      return () => clearTimeout(t);
    }
    if (lost && !wasLost.current) {
      wasLost.current = true;
      setPhase('flash');
      const t1 = setTimeout(() => setPhase('dim'),   FLASH_MS);
      const t2 = setTimeout(() => setPhase('spent'), FLASH_MS + DIM_MS);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [lost]);

  let fill, opacity, transition, filter;
  switch (phase) {
    case 'gain':
      fill = '#ffffff'; opacity = 1;
      transition = 'fill 400ms ease';
      filter = `drop-shadow(0 0 5px ${POWERUP_TYPES.LIFE.color})`;
      break;
    case 'flash':
      fill = '#ffffff'; opacity = 1;
      transition = `opacity ${FLASH_MS}ms ease, fill ${FLASH_MS}ms ease`;
      filter = 'drop-shadow(0 0 4px #fff)';
      break;
    case 'dim':
      fill = CYAN; opacity = LOST_ALPHA;
      transition = `opacity ${DIM_MS}ms ease, fill ${DIM_MS}ms ease, filter ${DIM_MS}ms ease`;
      filter = 'none';
      break;
    case 'spent':
      fill = CYAN; opacity = LOST_ALPHA;
      transition = 'none'; filter = 'none';
      break;
    default:
      fill = CYAN;
      opacity = active ? 1 : LOST_ALPHA;
      transition = 'none';
      filter = active ? 'drop-shadow(0 0 3px rgba(0,229,255,0.7))' : 'none';
  }

  return (
    <svg width={18} height={18} viewBox="0 0 20 20"
      style={{ display: 'block', overflow: 'visible' }}>
      <polygon
        points={SHIP_POINTS}
        fill={fill} fillOpacity={0.18}
        stroke={fill} strokeWidth={1.6} strokeLinejoin="round"
        style={{
          opacity, transition, filter,
          transformOrigin: '50% 50%', transformBox: 'fill-box',
          animation: phase === 'gain' ? 'life-pop 400ms steps(4) both' : 'none',
        }}
      />
    </svg>
  );
}

/* Wave announcement overlay — pure DOM, animated with a single CSS keyframe.
   Triggers once per wave change, visible for ~2.4s then gone. */
function WaveAnnounce({ wave }) {
  const [shown, setShown] = useState(null); // wave number being announced
  const [key, setKey]     = useState(0);    // remount to retrigger animation
  const prevWave = useRef(wave);

  useEffect(() => {
    if (wave !== prevWave.current && wave > 1) {
      prevWave.current = wave;
      setShown(wave);
      setKey(k => k + 1);
      const t = setTimeout(() => setShown(null), 2600);
      return () => clearTimeout(t);
    }
    prevWave.current = wave;
  }, [wave]);

  if (!shown) return null;

  return (
    <div key={key} style={{
      position: 'absolute',
      left: '50%', top: '42%',
      transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
      animation: 'wave-in 2.6s cubic-bezier(0.16,1,0.3,1) both',
      zIndex: 5,
    }}>
      <div style={{
        fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 6,
        color: 'rgba(0,229,255,0.55)', marginBottom: 10,
        textTransform: 'uppercase',
      }}>
        INCOMING
      </div>
      <div style={{
        fontFamily: FONT_PIXEL, fontSize: 28, letterSpacing: 4,
        color: '#fff',
        textShadow: `0 0 28px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.25)`,
      }}>
        WAVE {shown}
      </div>
    </div>
  );
}

const PU_SEGMENTS = 10;

/* Active timed power-ups — each shows its sprite, tag and a segmented
   (block-by-block) countdown bar that blinks when nearly spent. */
function ActivePowerUps({ powerUps }) {
  if (!powerUps.length) return null;
  return (
    <div style={styles.puWrap}>
      {powerUps.map(({ type, remaining }) => {
        const { short, color } = POWERUP_TYPES[type];
        const filled = Math.ceil(remaining * PU_SEGMENTS);
        const low = remaining < 0.2;
        return (
          <div key={type} style={{
            ...styles.puChip,
            borderColor: `${color}66`,
            animation: `pu-in 200ms steps(3) both${low ? ', pu-blink 300ms steps(1) infinite' : ''}`,
          }}>
            <PixelIcon type={type} />
            <span style={{ ...styles.puLabel, color, textShadow: `0 0 8px ${color}99` }}>{short}</span>
            <div style={styles.puBar}>
              {Array.from({ length: PU_SEGMENTS }, (_, i) => (
                <div key={i} style={{
                  ...styles.puSeg,
                  background: i < filled ? color : 'rgba(255,255,255,0.08)',
                  boxShadow: i < filled ? `0 0 4px ${color}` : 'none',
                }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HUD({ score, lives, wave, powerUps = [] }) {
  const prevLivesRef = useRef(lives);
  const [lostSet, setLostSet] = useState(new Set());

  useEffect(() => {
    const prev = prevLivesRef.current;
    if (lives < prev) {
      const justLost = lives;
      setLostSet(s => new Set([...s, justLost]));
    } else if (lives > prev) {
      // Regained lives — un-dim those slots
      setLostSet(s => new Set([...s].filter(i => i >= lives)));
    }
    prevLivesRef.current = lives;
  }, [lives]);

  return (
    <>
      <GlobalStyle />

      {/* Wave announcement — centered overlay, above gameplay */}
      <WaveAnnounce wave={wave} />

      {/* Active power-ups — top centre */}
      <ActivePowerUps powerUps={powerUps} />

      <div style={styles.hud}>
        {/* Score — left */}
        <div>
          <div style={styles.label}>SCORE</div>
          <div style={styles.score}>{score.toLocaleString()}</div>
        </div>

        {/* Lives + Wave — right */}
        <div style={styles.right}>
          <div style={styles.livesRow}>
            {Array.from({ length: Math.max(GAME.LIVES, lives) }, (_, i) => (
              <ShipLife key={i} index={i} active={i < lives} lost={lostSet.has(i)}
                fresh={i >= GAME.LIVES} />
            ))}
          </div>
          <div style={styles.waveRow}>
            <span style={styles.label}>WAVE</span>
            <span style={styles.wave}>{wave}</span>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  hud: {
    position: 'absolute', top: 0, left: 0, width: '100%',
    // Safe-area insets ensure HUD clears iPhone notch in landscape
    paddingTop:   'max(env(safe-area-inset-top,    0px) + 12px, 20px)',
    paddingLeft:  'max(env(safe-area-inset-left,   0px) + 16px, 24px)',
    paddingRight: 'max(env(safe-area-inset-right,  0px) + 16px, 24px)',
    paddingBottom: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    pointerEvents: 'none',
    fontFamily: FONT_MONO, boxSizing: 'border-box',
  },
  label: {
    fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 3,
    textTransform: 'uppercase', marginBottom: 5,
  },
  score: {
    fontFamily: FONT_PIXEL, fontSize: 22, letterSpacing: 2,
    color: '#fff',
    textShadow: '0 0 16px rgba(0,229,255,0.25)',
  },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  livesRow: { display: 'flex', gap: 8, alignItems: 'center' },
  waveRow: { display: 'flex', alignItems: 'center', gap: 8 },
  wave: {
    fontFamily: FONT_PIXEL, fontSize: 11, letterSpacing: 2,
    color: CYAN, textShadow: `0 0 10px rgba(0,229,255,0.5)`,
  },
  puWrap: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    top: 'max(env(safe-area-inset-top, 0px) + 12px, 20px)',
    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6,
    pointerEvents: 'none', zIndex: 4,
  },
  puChip: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '5px 8px',
    border: '1px solid', background: 'rgba(0,0,0,0.55)',
  },
  puLabel: {
    fontFamily: FONT_PIXEL, fontSize: 8, letterSpacing: 1, width: 36,
  },
  puBar: { display: 'flex', gap: 2 },
  puSeg: { width: 5, height: 8 },
};