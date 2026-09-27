import { useEffect } from 'react';
import { VsStyle, VsButton, PilotSlots } from './VersusLobby';
import { st } from './versusStyles';
import audioManager from '../assets/audio/AudioManager';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN  = '#00e5ff';
const RED   = '#ff3b3b';
const GREEN = '#39ff14';

function ordinal(n) {
  return ['1ST', '2ND', '3RD', '4TH'][n - 1] ?? `${n}TH`;
}

/* Standings table: place, pilot, score, status */
function Standings({ rows, live }) {
  return (
    <div className="ds-vs-table" style={styles.table}>
      {rows.map((p, i) => {
        const place = live ? null : p.place;
        const winner = !live && p.place === 1;
        return (
          <div key={p.id} className="ds-vs-row" style={{
            ...styles.row,
            borderColor: p.isMe ? `${CYAN}55` : 'rgba(255,255,255,0.06)',
            background: winner ? `${p.color}12` : 'transparent',
          }}>
            <span style={{ ...styles.place, color: winner ? GREEN : 'rgba(255,255,255,0.4)' }}>
              {live ? (p.alive ? '▲' : '✕') : ordinal(place ?? i + 1)}
            </span>
            <span style={{
              ...styles.name, color: p.color,
              textShadow: `0 0 8px ${p.color}77`,
              opacity: live && !p.alive ? 0.45 : 1,
            }}>
              {p.name}
            </span>
            {p.isMe && <span style={st.youTag}>YOU</span>}
            {!p.connected && <span style={styles.tag}>LEFT</span>}
            <span style={styles.score}>{p.score.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VersusResult({ versus, onMenu }) {
  const { phase, result, players, members, myId, role, hostPresent, count } = versus;
  const isHost = role === 'host';

  useEffect(() => {
    if (!result) return;
    if (result.myPlace === 1) audioManager.playPowerUp('LIFE');
    else audioManager.playGameOver();
  }, [result?.myPlace]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => { audioManager.playClick(); onMenu(); };

  // Next round starting
  if (phase === 'countdown') {
    return (
      <div style={st.overlay}>
        <VsStyle />
        <div className="ds-vs-panel" style={st.panel}>
          <div className="ds-vs-title" style={st.title}>NEXT ROUND</div>
          <div className="ds-vs-divider" style={st.divider} />
          <PilotSlots pilots={players} myId={myId} />
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

  // We're out, others are still flying
  if (phase === 'spectating') {
    const me = players.find(p => p.isMe);
    const flying = players.filter(p => p.alive).length;
    const live = [...players].sort((a, b) => (a.alive === b.alive ? b.score - a.score : a.alive ? -1 : 1));
    return (
      <div style={st.overlay}>
        <VsStyle />
        <div className="ds-vs-panel" style={st.panel}>
          <div className="ds-vs-title" style={{ ...styles.headline, color: RED, textShadow: `0 0 26px ${RED}aa` }}>ELIMINATED</div>
          <div style={st.hint}>
            YOU FINISHED {ordinal(me?.rank ?? players.length)} · {flying} PILOT{flying === 1 ? '' : 'S'} STILL FLYING
          </div>
          <div className="ds-vs-divider" style={st.divider} />
          <div style={{ ...st.label, animation: 'vs-blink 1s steps(1) infinite' }}>● LIVE</div>
          <Standings rows={live} live />
          <div style={st.btnCol}>
            <VsButton onClick={leave}>LEAVE ROOM</VsButton>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const won = result.myPlace === 1;
  const oneVsOne = result.ranking.length === 2;
  const headline = won ? 'YOU WIN' : oneVsOne ? 'YOU LOSE' : `${ordinal(result.myPlace)} PLACE`;
  const color = won ? GREEN : oneVsOne ? RED : CYAN;
  const champ = result.ranking[0];
  const canPlayAgain = members.length >= 2;

  return (
    <div style={st.overlay}>
      <VsStyle />
      <div className="ds-vs-panel" style={st.panel}>
        <div className="ds-vs-title" style={{ ...styles.headline, color, textShadow: `0 0 26px ${color}aa` }}>{headline}</div>
        <div style={st.hint}>
          {won ? 'LAST PILOT FLYING' : `${champ.name} WAS THE LAST PILOT FLYING`}
        </div>
        <div className="ds-vs-divider" style={st.divider} />

        <Standings rows={result.ranking} />

        <div style={st.btnCol}>
          {isHost ? (
            <VsButton primary onClick={() => { audioManager.playClick(); versus.start(); }} disabled={!canPlayAgain}>
              {canPlayAgain ? `PLAY AGAIN (${members.length})` : 'EVERYONE LEFT'}
            </VsButton>
          ) : hostPresent ? (
            <div style={{ ...st.status, fontSize: 8, animation: 'vs-blink 1s steps(1) infinite' }}>
              WAITING FOR HOST TO START NEXT ROUND
            </div>
          ) : (
            <div style={{ ...st.status, fontSize: 8, color: RED }}>HOST LEFT · NO MORE ROUNDS</div>
          )}
          <VsButton onClick={leave}>LEAVE ROOM</VsButton>
        </div>
        <div className="ds-short-hide" style={st.hint}>VERSUS SCORES DON&apos;T GO ON THE LEADERBOARD</div>
      </div>
    </div>
  );
}

const styles = {
  headline: { fontFamily: FONT_PIXEL, fontSize: 26, letterSpacing: 4, textAlign: 'center', lineHeight: 1.3 },
  table: { display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    border: '1px solid', padding: '9px 12px',
  },
  place: { fontFamily: FONT_PIXEL, fontSize: 8, width: 30, flexShrink: 0 },
  name: {
    fontFamily: FONT_PIXEL, fontSize: 9, letterSpacing: 1, flex: 1, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tag: { fontFamily: FONT_MONO, fontSize: 8, letterSpacing: 2, color: RED },
  score: { fontFamily: FONT_PIXEL, fontSize: 10, color: '#fff' },
};
