import { useEffect } from 'react';
import { VsStyle, VsButton } from './VersusLobby';
import { st } from './versusStyles';
import audioManager from '../assets/audio/AudioManager';

const FONT_PIXEL = "'Press Start 2P', monospace";
const CYAN  = '#00e5ff';
const RED   = '#ff3b3b';
const GREEN = '#39ff14';

const HEADLINE = {
  win:  { text: 'YOU WIN',  color: GREEN },
  lose: { text: 'YOU LOSE', color: RED },
  draw: { text: 'DRAW',     color: CYAN },
};

function reasonText(result, oppName) {
  switch (result.reason) {
    case 'opponent-dead': return `${oppName} RAN OUT OF LIVES`;
    case 'you-dead':      return 'YOU RAN OUT OF LIVES';
    case 'disconnect':    return `${oppName} DISCONNECTED`;
    case 'both-dead':     return 'BOTH SHIPS DOWN · DECIDED ON SCORE';
    default:              return '';
  }
}

export function VersusResult({ versus, myName, onMenu }) {
  const { result, opponent, rematch, phase, count } = versus;
  const oppName = opponent.name || 'RIVAL';

  useEffect(() => {
    if (!result) return;
    if (result.outcome === 'win') audioManager.playPowerUp('LIFE');
    else audioManager.playGameOver();
  }, [result?.outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'countdown') {
    return (
      <div style={st.overlay}>
        <VsStyle />
        <div style={st.panel}>
          <div style={st.title}>REMATCH</div>
          <div style={st.divider} />
          <div key={count} style={{
            ...st.countNum,
            color: count === 0 ? GREEN : '#fff',
            animation: 'vs-count 0.9s steps(6) both',
          }}>
            {count === 0 ? 'GO!' : count}
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;
  const head = HEADLINE[result.outcome];

  let rematchLabel = 'REMATCH';
  if (!opponent.connected) rematchLabel = 'RIVAL LEFT';
  else if (rematch.me) rematchLabel = `WAITING FOR ${oppName}`;

  return (
    <div style={st.overlay}>
      <VsStyle />
      <div style={st.panel}>
        <div style={{
          fontFamily: FONT_PIXEL, fontSize: 30, letterSpacing: 4, color: head.color,
          textShadow: `0 0 26px ${head.color}aa`, textAlign: 'center',
        }}>
          {head.text}
        </div>
        <div style={st.hint}>{reasonText(result, oppName)}</div>
        <div style={st.divider} />

        <div style={styles.scores}>
          <ScoreCol name={myName} score={result.myScore} color={CYAN}
            best={result.myScore >= result.oppScore} />
          <div style={styles.vs}>VS</div>
          <ScoreCol name={oppName} score={result.oppScore} color={RED}
            best={result.oppScore >= result.myScore} />
        </div>

        {rematch.opp && !rematch.me && opponent.connected && (
          <div style={{ ...st.status, fontSize: 8, color: GREEN, animation: 'vs-blink 0.8s steps(1) infinite' }}>
            {oppName} WANTS A REMATCH
          </div>
        )}

        <div style={st.btnCol}>
          <VsButton primary onClick={() => { audioManager.playClick(); versus.requestRematch(); }}
            disabled={!opponent.connected || rematch.me}>
            {rematchLabel}
          </VsButton>
          <VsButton onClick={() => { audioManager.playClick(); onMenu(); }}>MENU</VsButton>
        </div>
        <div style={st.hint}>VERSUS SCORES DON&apos;T GO ON THE LEADERBOARD</div>
      </div>
    </div>
  );
}

function ScoreCol({ name, score, color, best }) {
  return (
    <div style={styles.col}>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 9, color, letterSpacing: 1, textShadow: `0 0 8px ${color}88` }}>
        {name}
      </div>
      <div style={{ fontFamily: FONT_PIXEL, fontSize: 16, color: best ? '#fff' : 'rgba(255,255,255,0.45)' }}>
        {score.toLocaleString()}
      </div>
    </div>
  );
}

const styles = {
  scores: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, width: '100%' },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  vs: { fontFamily: FONT_PIXEL, fontSize: 9, color: 'rgba(255,255,255,0.35)' },
};
