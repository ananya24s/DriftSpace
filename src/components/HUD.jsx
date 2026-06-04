export function HUD({ score, lives, wave }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%',
      padding: '20px 24px', display: 'flex',
      justifyContent: 'space-between', alignItems: 'flex-start',
      pointerEvents: 'none', fontFamily: 'Courier New, monospace',
    }}>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>SCORE</div>
        <div style={{ fontSize: 28, color: '#fff', fontWeight: 700, letterSpacing: 2 }}>
          {score.toLocaleString()}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <svg key={i} width={12} height={12} viewBox="0 0 20 20">
              <polygon
                points="10,2 18,18 10,14 2,18"
                fill={i < lives ? '#00e5ff' : '#222'}
              />
            </svg>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>WAVE</span>
          <span style={{ fontSize: 13, color: 'rgba(0,229,255,0.8)' }}>{wave}</span>
        </div>
      </div>
    </div>
  );
}