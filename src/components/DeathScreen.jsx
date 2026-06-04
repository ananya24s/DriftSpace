const s = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Courier New, monospace',
  },
  btn: {
    background: 'transparent', border: '1px solid rgba(0,229,255,0.5)',
    color: '#00e5ff', fontFamily: 'Courier New, monospace', fontSize: 13,
    letterSpacing: 4, padding: '14px 40px', cursor: 'pointer', margin: 6,
  },
  btnGhost: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New, monospace',
    fontSize: 11, letterSpacing: 4, padding: '10px 28px', cursor: 'pointer', margin: 6,
  },
};

export function DeathScreen({ score, scores, onRetry, onMenu }) {
  const best = scores[0] || 0;
  const isNewBest = score >= best;

  return (
    <div style={s.screen}>
      <div style={{ fontSize: 36, letterSpacing: 8, color: '#ff4444', marginBottom: 6,
        textShadow: '0 0 20px rgba(255,68,68,0.5)' }}>
        SHIP DESTROYED
      </div>
      <div style={{ fontSize: 48, color: '#fff', margin: '20px 0 6px', fontWeight: 700 }}>
        {score.toLocaleString()}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 12 }}>
        FINAL SCORE
      </div>
      {isNewBest && (
        <div style={{ fontSize: 13, color: 'rgba(0,229,255,0.7)', letterSpacing: 2, marginBottom: 20 }}>
          ✦ NEW BEST SCORE ✦
        </div>
      )}
      <div style={{ border: '1px solid rgba(0,229,255,0.15)', padding: '20px 40px', minWidth: 260, marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(0,229,255,0.5)', marginBottom: 14 }}>
          HIGH SCORES
        </div>
        {(scores.length ? scores : Array(5).fill(0)).slice(0, 8).map((sc, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: 13, color: sc === score && i === scores.indexOf(score) ? '#00e5ff' : '#fff',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', width: 24 }}>{i + 1}.</span>
            <span>{sc.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <button style={s.btn} onClick={onRetry}>[ RETRY ]</button>
      <button style={s.btnGhost} onClick={onMenu}>MAIN MENU</button>
    </div>
  );
}