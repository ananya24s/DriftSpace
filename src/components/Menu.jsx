const s = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Courier New, monospace',
  },
  title: {
    fontSize: 56, fontWeight: 700, letterSpacing: 12, color: '#00e5ff',
    textShadow: '0 0 30px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.3)',
    marginBottom: 8,
  },
  subtitle: { fontSize: 12, letterSpacing: 6, color: 'rgba(0,229,255,0.5)', marginBottom: 48 },
  btn: {
    background: 'transparent', border: '1px solid rgba(0,229,255,0.5)',
    color: '#00e5ff', fontFamily: 'Courier New, monospace', fontSize: 13,
    letterSpacing: 4, padding: '14px 40px', cursor: 'pointer', margin: 6,
    transition: 'all 0.2s',
  },
  btnGhost: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New, monospace',
    fontSize: 11, letterSpacing: 4, padding: '10px 28px', cursor: 'pointer', margin: 6,
  },
  hint: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 24, letterSpacing: 2 },
};

export function Menu({ onStart, onLeaderboard }) {
  return (
    <div style={s.screen}>

      {/* Logo image — full banner, centered, proportional */}
      <img
        src="/logo.png"
        alt="DRIFTSPACE"
        style={{
          width: '100%',
          maxWidth: 520,
          height: 'auto',
          objectFit: 'contain',
          marginBottom: 32,
        }}
      />

      <button style={s.btn} onClick={onStart}>[ LAUNCH ]</button>
      <button style={s.btnGhost} onClick={onLeaderboard}>LEADERBOARD</button>

      {/* Controls Card */}
      <div style={{
        marginTop: 20,
        border: '1px solid rgba(0,229,255,0.25)',
        boxShadow: '0 0 12px rgba(0,229,255,0.08)',
        padding: '12px 28px',
        textAlign: 'center',
        minWidth: 260,
      }}>
        <div style={{
          fontSize: 9,
          letterSpacing: 4,
          color: 'rgba(0,229,255,0.4)',
          marginBottom: 10,
        }}>
          CONTROLS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 16px',
          fontSize: 10,
          letterSpacing: 2,
        }}>
          {[
            ['WASD', 'NAVIGATE'],
            ['SPACE', 'FIRE'],
            ['P', 'PAUSE'],
            ['R', 'RETRY'],
          ].map(([key, action]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'rgba(0,229,255,0.7)' }}>{key}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{action}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export function PauseScreen({ onResume, onQuit }) {
  return (
    <div style={{ ...s.screen, background: 'rgba(0,0,0,0.7)' }}>
      <div style={{ ...s.title, fontSize: 32, marginBottom: 32 }}>PAUSED</div>
      <button style={s.btn} onClick={onResume}>[ RESUME ]</button>
      <button style={s.btnGhost} onClick={onQuit}>QUIT TO MENU</button>
    </div>
  );
}

export function LeaderboardScreen({ scores, onBack }) {
  return (
    <div style={s.screen}>
      <div style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(0,229,255,0.5)', marginBottom: 32 }}>
        TOP PILOTS
      </div>
      <div style={{
        border: '1px solid rgba(0,229,255,0.15)', padding: '20px 40px', minWidth: 280,
      }}>
        {(scores.length ? scores : Array(5).fill(0)).slice(0, 8).map((sc, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'Courier New, monospace', fontSize: 13,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', width: 24 }}>{i + 1}.</span>
            <span style={{ color: '#fff' }}>{sc.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <button style={{ ...s.btnGhost, marginTop: 24 }} onClick={onBack}>BACK</button>
    </div>
  );
}