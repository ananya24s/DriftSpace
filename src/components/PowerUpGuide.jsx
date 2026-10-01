import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { POWERUP_TYPES, RACE_PICKUP } from '../game/powerUpGlyph';
import { PixelIcon } from './PixelIcon';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN  = '#00e5ff';
const RED   = '#ff3b3b';
const HULL  = '#e6e8ff';
const GOLD  = '#ffd700';

const SOLO_TYPES   = Object.keys(POWERUP_TYPES).filter(t => !POWERUP_TYPES[t].versusOnly);
const VERSUS_TYPES = Object.keys(POWERUP_TYPES).filter(t => POWERUP_TYPES[t].versusOnly);

const TABS = [
  { id: 'basics',   label: 'BASICS' },
  { id: 'powerups', label: 'POWER-UPS' },
  { id: 'enemies',  label: 'ENEMIES' },
  { id: 'versus',   label: 'VERSUS' },
];

/* Compact home-screen teaser: a row of the pickup sprites.
   Clicking it opens the Pilot's Manual. */
export function PowerUpStrip({ onOpen, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onOpen}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label="Open the pilot's manual"
      style={{
        ...styles.strip,
        borderColor: hov ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.18)',
        opacity: disabled ? 0.25 : 1,
      }}
    >
      <span style={styles.stripLabel}>MANUAL</span>
      <span style={styles.stripIcons}>
        {SOLO_TYPES.map(t => <PixelIcon key={t} type={t} size={12} glow={hov} />)}
      </span>
      <span style={{ ...styles.stripHint, color: hov ? '#fff' : 'rgba(0,229,255,0.55)' }}>?</span>
    </button>
  );
}

/* ---------- small building blocks ---------- */

function Rule({ title, color = CYAN, children }) {
  return (
    <div style={styles.rule}>
      <div style={{ ...styles.name, color, textShadow: `0 0 8px ${color}80` }}>{title}</div>
      <div style={styles.desc}>{children}</div>
    </div>
  );
}

function Item({ icon, color, title, children }) {
  return (
    <div style={styles.row}>
      <div style={{ ...styles.iconBox, borderColor: `${color}88`, boxShadow: `0 0 10px ${color}33` }}>{icon}</div>
      <div>
        <div style={{ ...styles.name, color, textShadow: `0 0 8px ${color}80` }}>{title}</div>
        <div style={styles.desc}>{children}</div>
      </div>
    </div>
  );
}

function Key({ children }) {
  return <span style={styles.key}>{children}</span>;
}

// Vector saucer, the same shape the game draws
function SaucerIcon({ small }) {
  const r = small ? 8 : 13;
  const pts = [[-r, 0], [-r * 0.45, -r * 0.35], [r * 0.45, -r * 0.35], [r, 0], [r * 0.45, r * 0.35], [-r * 0.45, r * 0.35]]
    .map(p => p.join(',')).join(' ');
  const dome = [[-r * 0.25, -r * 0.35], [-r * 0.15, -r * 0.7], [r * 0.15, -r * 0.7], [r * 0.25, -r * 0.35]].map(p => p.join(',')).join(' ');
  return (
    <svg width={30} height={24} viewBox="-15 -12 30 24" style={{ display: 'block' }}>
      <polygon points={pts} fill={`${HULL}22`} stroke={HULL} strokeWidth={1.2} />
      <line x1={-r} y1={0} x2={r} y2={0} stroke={HULL} strokeWidth={1.2} />
      <polyline points={dome} fill="none" stroke={HULL} strokeWidth={1.2} />
      <rect x={-1.5} y={r * 0.12} width={3} height={3} fill={RED} />
    </svg>
  );
}

function ShotIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <rect x={5} y={5} width={4} height={4} fill={RED} opacity={0.35} />
      <rect x={10} y={10} width={7} height={7} fill={RED} />
    </svg>
  );
}

function RockIcon() {
  return (
    <svg width={26} height={26} viewBox="-13 -13 26 26" style={{ display: 'block' }}>
      <polygon points="-10,-3 -5,-10 4,-9 10,-2 8,7 -1,10 -9,6" fill="#7b8fa122" stroke="#7b8fa1" strokeWidth={1.3} />
    </svg>
  );
}

/* ---------- tab pages ---------- */

function BasicsTab() {
  return (
    <div style={styles.stack}>
      <Rule title="CONTROLS · KEYBOARD">
        <Key>W</Key>/<Key>↑</Key> thrust · <Key>S</Key>/<Key>↓</Key> reverse · <Key>A</Key><Key>D</Key>/<Key>←</Key><Key>→</Key> turn ·{' '}
        <Key>SPACE</Key>/<Key>Z</Key> fire · <Key>P</Key> pause · <Key>R</Key> retry after game over
      </Rule>
      <Rule title="CONTROLS · PHONE">
        Hold your phone sideways. The left joystick steers and thrusts, the right button fires,
        and the pause button sits under your score.
      </Rule>
      <Rule title="LIVES">
        You start with 3 ships and can hold up to 5. After a hit you blink and can't be hurt for a moment.
      </Rule>
      <Rule title="WAVES">
        Every 20 seconds a new wave starts: more asteroids, moving faster. Big asteroids take 2 hits and split in two.
      </Rule>
      <Rule title="CHAINS">
        Destroy 3 or more things in quick succession for a CHAIN bonus, and it grows the longer you keep it going.
      </Rule>
      <Rule title="LEADERBOARD">
        Solo runs can be submitted at game over. Versus scores never go on the leaderboard.
      </Rule>
    </div>
  );
}

function PowerUpsTab() {
  return (
    <>
      <div style={styles.lead}>SHOOT ASTEROIDS TO SHAKE THEM LOOSE · FLY INTO ONE TO GRAB IT</div>
      <div style={styles.grid}>
        {SOLO_TYPES.map(t => {
          const { label, desc, color } = POWERUP_TYPES[t];
          return <Item key={t} icon={<PixelIcon type={t} size={21} />} color={color} title={label}>{desc}</Item>;
        })}
      </div>
      <div style={styles.note}>
        Pickups blink before they vanish, so grab them fast. Timed power-ups show a countdown bar at the top of the screen.
      </div>
    </>
  );
}

function EnemiesTab() {
  return (
    <>
      <div style={styles.grid}>
        <Item icon={<RockIcon />} color="#9fb0c0" title="ASTEROIDS">
          Drift in from the edges and split when hit. Touching one costs a life.
        </Item>
        <Item icon={<SaucerIcon />} color={HULL} title="BIG SAUCER">
          From wave 2. Slow, takes 2 hits, fires loose shots. 200 points and always drops a power-up.
        </Item>
        <Item icon={<SaucerIcon small />} color={HULL} title="SMALL SAUCER">
          From wave 4. Fast and aims at you. 500 points and a 50% power-up chance.
        </Item>
        <Item icon={<ShotIcon />} color={RED} title="ENEMY SHOTS">
          Red pixel squares. A hit costs a life, but a Shield blocks them.
        </Item>
      </div>
      <div style={{ ...styles.note, color: 'rgba(255,59,59,0.75)' }}>
        Only red shots and touching a hull hurt you. The blinking lights on saucers are just decoration.
      </div>
    </>
  );
}

function VersusTab() {
  return (
    <div style={styles.stack}>
      <Rule title="THE MATCH">
        2–4 pilots, each flying their own asteroid field. The host presses START, and the last pilot still flying wins.
      </Rule>
      <Rule title="ATTACKS · INCOMING" color={RED}>
        Chain combos, UFO kills and Nova Bombs send extra asteroids to whoever is leading.
        They arrive in the sender's colour with an INCOMING warning.
      </Rule>

      <div style={styles.subhead}>SABOTAGE PICKUPS <span style={styles.subheadHint}>(red brackets · versus only)</span></div>
      <div style={styles.grid}>
        {VERSUS_TYPES.map(t => {
          const { label, desc, color } = POWERUP_TYPES[t];
          return <Item key={t} icon={<PixelIcon type={t} size={21} />} color={color} title={label}>{desc}</Item>;
        })}
      </div>
      <div style={styles.note}>
        Sabotage always hits the top rival. If you're leading, it hits whoever is second.
        A Shield blocks sabotage aimed at you.
      </div>

      <div style={{ ...styles.subhead, color: GOLD, textShadow: `0 0 8px ${GOLD}80` }}>RACE PICKUP</div>
      <div style={styles.grid}>
        <Item icon={<PixelIcon def={RACE_PICKUP} size={21} />} color={GOLD} title="GOLD FLAG">
          {RACE_PICKUP.desc}
        </Item>
      </div>

      <Rule title="EMOTES">
        Send GLHF, GG, NICE!, LOL, OOPS or RIP to the room: keys <Key>1</Key>–<Key>6</Key> mid-match,
        the SAY button on phones, or the buttons in the lobby.
      </Rule>
      <Rule title="GOOD TO KNOW">
        No pausing in Versus, since the match is live for everyone. If you're knocked out, you can watch the live standings until the round ends.
      </Rule>
    </div>
  );
}

/* ---------- the manual ---------- */

export function PowerUpGuide({ onClose, initialTab = 'basics' }) {
  const reduceMotion = useReducedMotion();
  const [vis, setVis] = useState(false);
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 20);
    const onKey = e => {
      if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); onClose(); return; }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setTab(cur => {
          const i = TABS.findIndex(x => x.id === cur);
          const step = e.code === 'ArrowRight' ? 1 : TABS.length - 1;
          return TABS[(i + step) % TABS.length].id;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-label="Pilot's manual"
        onClick={e => e.stopPropagation()}
        style={{
          ...styles.panel,
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0)' : 'translateY(10px)',
          transition: reduceMotion ? 'none' : 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        <div style={styles.title}>PILOT&apos;S MANUAL</div>

        <div style={styles.tabs} role="tablist">
          {TABS.map(t => {
            const on = t.id === tab;
            return (
              <button key={t.id} role="tab" aria-selected={on} onClick={() => setTab(t.id)}
                style={{
                  ...styles.tab,
                  color: on ? '#03060c' : CYAN,
                  background: on ? CYAN : 'rgba(0,229,255,0.04)',
                  borderColor: on ? CYAN : 'rgba(0,229,255,0.35)',
                  boxShadow: on ? '0 0 14px rgba(0,229,255,0.35)' : 'none',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={styles.divider} />

        <div style={styles.body}>
          {tab === 'basics' && <BasicsTab />}
          {tab === 'powerups' && <PowerUpsTab />}
          {tab === 'enemies' && <EnemiesTab />}
          {tab === 'versus' && <VersusTab />}
        </div>

        <div style={styles.divider} />
        <div style={styles.footerHint}>← → SWITCH TABS · ESC TO CLOSE</div>
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
    padding: 'clamp(16px, 3.5vh, 32px) clamp(16px, 4vw, 40px)',
    width: 'min(780px, 100%)',
    maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box',
  },
  title: {
    fontFamily: FONT_PIXEL, fontSize: 18, letterSpacing: 4,
    color: '#eaf7fc', textShadow: '0 0 24px rgba(0,229,255,0.55)',
    marginBottom: 16, textAlign: 'center',
  },
  tabs: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  tab: {
    fontFamily: FONT_PIXEL, fontSize: 8, letterSpacing: 2,
    border: '1px solid', borderRadius: 2, padding: '9px 12px 8px', cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
  },
  divider: {
    width: '100%', height: 1, flexShrink: 0,
    background: 'rgba(0,229,255,0.15)', margin: '16px 0',
  },
  body: { width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  stack: { display: 'flex', flexDirection: 'column', gap: 14 },
  lead: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2.5,
    color: 'rgba(0,229,255,0.6)', textAlign: 'center', lineHeight: 1.6,
  },
  grid: {
    width: '100%',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '14px 26px',
  },
  row: { display: 'flex', alignItems: 'center', gap: 14 },
  rule: { display: 'flex', flexDirection: 'column', gap: 6 },
  iconBox: {
    flexShrink: 0, width: 38, height: 38,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', background: 'rgba(255,255,255,0.02)',
  },
  name: { fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  desc: {
    fontFamily: FONT_MONO, fontSize: 11, lineHeight: 1.7,
    color: 'rgba(238,242,248,0.62)',
  },
  key: {
    fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,229,255,0.9)',
    border: '1px solid rgba(0,229,255,0.4)', borderRadius: 3, padding: '0 5px', margin: '0 1px',
    background: 'rgba(0,229,255,0.05)',
  },
  subhead: {
    fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 2, color: RED,
    textShadow: `0 0 8px ${RED}80`, marginTop: 4,
  },
  subheadHint: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.35)', textShadow: 'none' },
  note: {
    fontFamily: FONT_MONO, fontSize: 10, lineHeight: 1.6, letterSpacing: 0.3,
    color: 'rgba(238,242,248,0.42)', textAlign: 'center',
  },
  footerHint: { fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.3)' },
  closeBtn: {
    marginTop: 14,
    background: 'rgba(0,229,255,0.04)',
    border: '1px solid rgba(0,229,255,0.45)',
    color: CYAN, cursor: 'pointer', borderRadius: 2,
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 4,
    padding: '13px 34px 11px',
  },
};
