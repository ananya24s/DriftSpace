import { useEffect } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';

const st = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Courier New, monospace',
    overflowY: 'auto', padding: '40px 20px', boxSizing: 'border-box',
  },
  heading: { fontSize: 11, letterSpacing: 6, color: 'rgba(0,229,255,0.5)', marginBottom: 6 },
  subheading: { fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 32 },
  table: {
    border: '1px solid rgba(0,229,255,0.15)',
    minWidth: 340, maxWidth: 480, width: '100%', marginBottom: 28,
  },
  headerRow: {
    display: 'grid', gridTemplateColumns: '40px 1fr auto',
    padding: '10px 20px', borderBottom: '1px solid rgba(0,229,255,0.15)',
    fontSize: 9, letterSpacing: 4, color: 'rgba(0,229,255,0.4)',
  },
  row: {
    display: 'grid', gridTemplateColumns: '40px 1fr auto',
    padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontSize: 13, alignItems: 'center',
  },
  rank: { color: 'rgba(255,255,255,0.3)' },
  name: { color: '#fff', letterSpacing: 2 },
  score: { color: '#00e5ff', letterSpacing: 1 },
  topRank: { color: '#00e5ff' },
  btn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New, monospace',
    fontSize: 11, letterSpacing: 4, padding: '10px 28px', cursor: 'pointer',
  },
  msg: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 },
};

export function Leaderboard({ onBack, highlightName }) {
  const { scores, pilotCount, loading, error, load } = useLeaderboard();

  useEffect(() => { load(); }, [load]);

  return (
    <div style={st.screen}>
      <div style={st.heading}>GLOBAL LEADERBOARD</div>
      {pilotCount !== null && (
        <div style={st.subheading}>{pilotCount} PILOTS RECORDED</div>
      )}

      <div style={st.table}>
        <div style={st.headerRow}>
          <span>#</span>
          <span>PILOT</span>
          <span>SCORE</span>
        </div>

        {loading && (
          <div style={{ ...st.msg, padding: 24, textAlign: 'center' }}>
            SCANNING DEEP SPACE...
          </div>
        )}

        {error && (
          <div style={{ ...st.msg, padding: 24, textAlign: 'center', color: '#ff4444' }}>
            {error}
          </div>
        )}

        {!loading && !error && scores.length === 0 && (
          <div style={{ ...st.msg, padding: 24, textAlign: 'center' }}>
            NO PILOTS YET. BE FIRST.
          </div>
        )}

        {!loading && scores.map((s, i) => {
          const isTop3 = i < 3;
          const isHighlight = highlightName && s.name === highlightName;
          return (
            <div key={s.id} style={{
              ...st.row,
              background: isHighlight ? 'rgba(0,229,255,0.05)' : 'transparent',
            }}>
              <span style={isTop3 ? st.topRank : st.rank}>{i + 1}</span>
              <span style={{
                ...st.name,
                color: isHighlight ? '#00e5ff' : isTop3 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
              }}>
                {s.name}
              </span>
              <span style={st.score}>{s.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      <button style={st.btn} onClick={onBack}>BACK</button>
    </div>
  );
}