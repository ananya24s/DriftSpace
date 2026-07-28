import { useEffect, useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';

/*
  Leaderboard — redesigned to match the menu's visual identity.
  Same data logic as before (useLeaderboard hook, all existing
  states preserved). New visual: Press Start 2P for the title,
  arcade cabinet border, top-3 podium treatment, scanning
  animation for loading, BACK button matching the LAUNCH style.
*/

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const FONT_BODY  = "'Inter', sans-serif";
const CYAN       = '#00e5ff';

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']; // gold, silver, bronze

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');

      @keyframes lb-scan {
        0%   { transform: translateY(-100%); opacity: 0.6; }
        100% { transform: translateY(800%);  opacity: 0; }
      }
      @keyframes lb-blink {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0; }
      }
      @keyframes lb-fadein {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}

function ScanLine() {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 0, height: '12%',
      background: 'linear-gradient(180deg, transparent, rgba(0,229,255,0.06), transparent)',
      animation: 'lb-scan 2.2s linear infinite',
      pointerEvents: 'none',
    }} />
  );
}

export function Leaderboard({ onBack, highlightName }) {
  const { scores, pilotCount, loading, error, load } = useLeaderboard();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    load();
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div style={st.screen}>
      <GlobalStyle />

      <div style={{
        ...st.panel,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>

        {/* Header */}
        <div style={st.header}>
          <div style={st.title}>HALL OF PILOTS</div>
          {pilotCount !== null && (
            <div style={st.subtitle}>{pilotCount} PILOTS RECORDED</div>
          )}
        </div>

        {/* Table */}
        <div style={st.tableWrap}>
          {/* Column headers */}
          <div style={st.colHeader}>
            <span style={st.colRank}>#</span>
            <span style={st.colName}>PILOT</span>
            <span style={st.colScore}>SCORE</span>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 200 }}>
              <ScanLine />
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ ...st.row, opacity: 0.15 - i * 0.02 }}>
                  <span style={st.rankCell}>{i + 1}</span>
                  <span style={{ ...st.nameCell, letterSpacing: 6 }}>{'· · · · · · ·'.slice(0, 8 + i * 2)}</span>
                  <span style={st.scoreCell}>— — —</span>
                </div>
              ))}
              <div style={st.scanMsg}>
                <span style={{ animation: 'lb-blink 1s step-end infinite' }}>▋</span>
                {' '}SCANNING DEEP SPACE
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div style={st.emptyMsg}>
              <div style={{ color: '#ff5555', marginBottom: 8 }}>⚠ SIGNAL LOST</div>
              <div style={{ fontSize: 9, opacity: 0.5 }}>UNABLE TO REACH SERVER</div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && scores.length === 0 && (
            <div style={st.emptyMsg}>
              NO PILOTS YET.<br />
              <span style={{ opacity: 0.5, fontSize: 9, marginTop: 8, display: 'block' }}>BE THE FIRST.</span>
            </div>
          )}

          {/* Rows */}
          {!loading && !error && scores.map((s, i) => {
            const isTop3     = i < 3;
            const isHighlight = highlightName && s.name === highlightName;
            const rankColor  = isTop3 ? RANK_COLORS[i] : 'rgba(255,255,255,0.22)';
            return (
              <div
                key={s.id ?? i}
                style={{
                  ...st.row,
                  background: isHighlight
                    ? 'rgba(0,229,255,0.06)'
                    : isTop3
                      ? `rgba(255,255,255,0.02)`
                      : 'transparent',
                  borderLeft: isHighlight ? `2px solid ${CYAN}` : '2px solid transparent',
                  animation: `lb-fadein 0.35s ease ${i * 0.04}s both`,
                }}
              >
                <span style={{ ...st.rankCell, color: rankColor, fontFamily: isTop3 ? FONT_PIXEL : FONT_MONO, fontSize: isTop3 ? 10 : 12 }}>
                  {i + 1}
                </span>
                <span style={{
                  ...st.nameCell,
                  color: isHighlight ? CYAN : isTop3 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)',
                  fontFamily: isTop3 ? FONT_MONO : FONT_MONO,
                  fontWeight: isTop3 ? 500 : 400,
                }}>
                  {s.name}
                  {isHighlight && <span style={{ marginLeft: 8, fontSize: 9, opacity: 0.6 }}>← YOU</span>}
                </span>
                <span style={{
                  ...st.scoreCell,
                  color: isTop3 ? rankColor : CYAN,
                  fontFamily: isTop3 ? FONT_PIXEL : FONT_MONO,
                  fontSize: isTop3 ? 11 : 12,
                }}>
                  {s.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Back button — matches LAUNCH box style */}
        <button style={st.backBtn} onClick={onBack}>
          <span style={st.backText}>BACK</span>
        </button>
      </div>
    </div>
  );
}

const st = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT_MONO,
    background: 'rgba(3,4,8,0.88)',
    backdropFilter: 'blur(2px)',
    overflowY: 'auto', padding: '32px 20px', boxSizing: 'border-box',
  },
  panel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', maxWidth: 580,
  },

  /* header */
  header: { textAlign: 'center', marginBottom: 32 },
  title: {
    fontFamily: FONT_PIXEL, fontSize: 18, letterSpacing: 4,
    color: '#eaf7fc',
    textShadow: `0 0 20px rgba(0,229,255,0.7), 0 0 40px rgba(0,229,255,0.3)`,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 4,
    color: 'rgba(0,229,255,0.45)', textTransform: 'uppercase',
  },

  /* table */
  tableWrap: {
    width: '100%',
    border: '1px solid rgba(0,229,255,0.2)',
    background: 'rgba(0,229,255,0.02)',
    marginBottom: 28,
    position: 'relative', overflow: 'hidden',
  },
  colHeader: {
    display: 'grid', gridTemplateColumns: '52px 1fr 130px',
    padding: '10px 20px',
    borderBottom: '1px solid rgba(0,229,255,0.18)',
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 4,
    color: 'rgba(0,229,255,0.4)', textTransform: 'uppercase',
  },
  colRank:  { textAlign: 'center' },
  colName:  {},
  colScore: { textAlign: 'right' },
  row: {
    display: 'grid', gridTemplateColumns: '52px 1fr 130px',
    padding: '11px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    alignItems: 'center',
    transition: 'background 0.2s ease',
  },
  rankCell:  { textAlign: 'center', color: 'rgba(255,255,255,0.22)' },
  nameCell:  { fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 2, color: 'rgba(255,255,255,0.6)' },
  scoreCell: { fontFamily: FONT_MONO, fontSize: 12, letterSpacing: 1, color: CYAN, textAlign: 'right' },

  /* states */
  scanMsg: {
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 3,
    color: 'rgba(0,229,255,0.5)', textAlign: 'center',
    padding: '16px 0 20px', textTransform: 'uppercase',
  },
  emptyMsg: {
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)', textAlign: 'center',
    padding: '40px 20px', lineHeight: 2,
  },

  /* back button — mirrors LAUNCH box */
  backBtn: {
    background: 'rgba(0,229,255,0.04)',
    border: '1px solid rgba(0,229,255,0.35)',
    borderRadius: 2,
    padding: '14px 48px 12px',
    cursor: 'pointer',
    transition: 'border-color 0.22s ease, box-shadow 0.22s ease',
  },
  backText: {
    fontFamily: FONT_PIXEL, fontSize: 13, letterSpacing: 6,
    backgroundImage: 'linear-gradient(100deg, #00b8d9, #00e5ff 40%, #eafcff 50%, #00e5ff 60%, #00b8d9)',
    backgroundSize: '250% 100%',
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', WebkitTextFillColor: 'transparent',
  },
};