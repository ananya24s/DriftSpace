import { useEffect, useState } from 'react';
import { DriftSpaceMark } from './DriftSpaceMark';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN       = '#00e5ff';

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes ds-death-fadein {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ds-score-count {
        from { opacity: 0; transform: scale(0.88); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes ds-newbest-pulse {
        0%, 100% { opacity: 0.7; }
        50%       { opacity: 1; }
      }
    `}</style>
  );
}

function ActionButton({ children, onClick, primary }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary
          ? hovered ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.04)'
          : 'transparent',
        border: primary
          ? `1px solid ${hovered ? 'rgba(0,229,255,0.85)' : 'rgba(0,229,255,0.45)'}`
          : 'none',
        color: primary
          ? hovered ? '#fff' : CYAN
          : hovered ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
        fontFamily: FONT_PIXEL,
        fontSize: primary ? 13 : 9,
        letterSpacing: primary ? 4 : 3,
        padding: primary ? '16px 52px 14px' : '8px 4px',
        cursor: 'pointer',
        borderRadius: primary ? 2 : 0,
        boxShadow: primary && hovered
          ? '0 0 24px rgba(0,229,255,0.25), 0 0 48px rgba(0,229,255,0.1)'
          : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      {children}
    </button>
  );
}

export function DeathScreen({ score, scores, onRetry, onMenu }) {
  const [visible, setVisible] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);

  const best   = scores[0] || 0;
  const isNewBest = score > 0 && score >= best;

  // Stagger the reveal: emblem + title first, score second
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setScoreVisible(true), 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={st.screen}>
      <GlobalStyle />

      {/* Emblem + destroyed title */}
      <div style={{
        ...st.header,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <DriftSpaceMark
          size={52}
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,68,68,0.7)"
          glowColor="rgba(255,68,68,0.6)"
          style={{ marginBottom: 18 }}
        />
        <div style={st.destroyed}>SHIP DESTROYED</div>
      </div>

      {/* Score */}
      <div style={{
        ...st.scoreBlock,
        opacity: scoreVisible ? 1 : 0,
        transform: scoreVisible ? 'scale(1)' : 'scale(0.88)',
        transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={st.scoreNumber}>{score.toLocaleString()}</div>
        <div style={st.scoreLabel}>FINAL SCORE</div>
        {isNewBest && (
          <div style={st.newBest}>✦ NEW BEST ✦</div>
        )}
      </div>

      {/* Local high scores */}
      <div style={{
        ...st.tableWrap,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease 0.3s',
      }}>
        <div style={st.tableHeader}>HIGH SCORES</div>
        {(scores.length ? scores : Array(3).fill(0)).slice(0, 5).map((sc, i) => {
          const isCurrent = sc === score && scores.indexOf(score) === i;
          return (
            <div key={i} style={{
              ...st.tableRow,
              background: isCurrent ? 'rgba(0,229,255,0.05)' : 'transparent',
              borderLeft: isCurrent ? `2px solid ${CYAN}` : '2px solid transparent',
            }}>
              <span style={{ ...st.tableRank, color: i < 3 ? CYAN : 'rgba(255,255,255,0.2)' }}>
                {i + 1}
              </span>
              <span style={{ ...st.tableScore, color: isCurrent ? CYAN : '#fff' }}>
                {sc.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{
        ...st.actions,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease 0.45s',
      }}>
        <ActionButton primary onClick={onRetry}>RETRY</ActionButton>
        <ActionButton onClick={onMenu}>MAIN MENU</ActionButton>
      </div>
    </div>
  );
}

const st = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(3,4,8,0.92)',
    backdropFilter: 'blur(2px)',
    fontFamily: FONT_MONO,
    gap: 0,
  },
  header: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginBottom: 28,
  },
  destroyed: {
    fontFamily: FONT_PIXEL, fontSize: 13, letterSpacing: 4,
    color: 'rgba(255,68,68,0.85)',
    textShadow: '0 0 18px rgba(255,68,68,0.5)',
  },
  scoreBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginBottom: 32,
  },
  scoreNumber: {
    fontFamily: FONT_PIXEL, fontSize: 42, letterSpacing: 3,
    color: '#ffffff',
    textShadow: `0 0 28px rgba(0,229,255,0.35)`,
    lineHeight: 1.1,
  },
  scoreLabel: {
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 5,
    color: 'rgba(255,255,255,0.28)', marginTop: 10,
  },
  newBest: {
    fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 3,
    color: CYAN, marginTop: 14,
    animation: 'ds-newbest-pulse 2s ease-in-out infinite',
    textShadow: `0 0 12px rgba(0,229,255,0.6)`,
  },
  tableWrap: {
    border: '1px solid rgba(0,229,255,0.15)',
    background: 'rgba(0,229,255,0.02)',
    minWidth: 240, marginBottom: 32,
    overflow: 'hidden',
  },
  tableHeader: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 4,
    color: 'rgba(0,229,255,0.4)', textTransform: 'uppercase',
    padding: '10px 20px 8px',
    borderBottom: '1px solid rgba(0,229,255,0.12)',
  },
  tableRow: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '8px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.2s ease',
  },
  tableRank: {
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1,
    width: 18, textAlign: 'center',
  },
  tableScore: {
    fontFamily: FONT_MONO, fontSize: 13, letterSpacing: 1,
    flex: 1, textAlign: 'right',
  },
  actions: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  },
};