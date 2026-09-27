import { useEffect, useState } from 'react';
import audioManager from '../assets/audio/AudioManager';
import { st } from './versusStyles';
import { MAX_PLAYERS, PLAYER_COLORS } from '../hooks/useVersus';

const FONT_PIXEL = "'Press Start 2P', monospace";
const CYAN       = '#00e5ff';
const NAME_KEY   = 'driftspace-pilot-name';

function loadName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* storage unavailable */ }
}

export function VsStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes vs-in {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes vs-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.2; } }
      @keyframes vs-count {
        0%   { opacity: 0; transform: scale(1.8); }
        25%  { opacity: 1; transform: scale(1); }
        85%  { opacity: 1; }
        100% { opacity: 0; transform: scale(0.9); }
      }
    `}</style>
  );
}

export function VsButton({ children, onClick, primary, disabled, color = CYAN }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: primary ? (hov && !disabled ? `${color}1a` : `${color}0a`) : 'transparent',
        border: primary ? `1px solid ${hov && !disabled ? color : `${color}73`}` : 'none',
        color: primary ? (hov && !disabled ? '#fff' : color) : hov ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
        fontFamily: FONT_PIXEL,
        fontSize: primary ? 11 : 8,
        letterSpacing: primary ? 4 : 3,
        padding: primary ? '15px 28px 13px' : '8px 4px',
        width: primary ? '100%' : 'auto',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        borderRadius: primary ? 2 : 0,
        lineHeight: 1.8,
        boxShadow: primary && hov && !disabled ? `0 0 20px ${color}38` : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      {children}
    </button>
  );
}

function Countdown({ count }) {
  return (
    <div key={count} style={{
      ...st.countNum,
      color: count === 0 ? '#39ff14' : '#fff',
      textShadow: `0 0 30px ${count === 0 ? 'rgba(57,255,20,0.7)' : 'rgba(0,229,255,0.6)'}`,
      animation: 'vs-count 0.9s steps(6) both',
    }}>
      {count === 0 ? 'GO!' : count}
    </div>
  );
}

/* Pilot list — filled slots in each pilot's colour, empty slots dimmed */
export function PilotSlots({ pilots, myId, showEmpty }) {
  const slots = showEmpty
    ? Array.from({ length: MAX_PLAYERS }, (_, i) => pilots[i] ?? null)
    : pilots;
  return (
    <div style={st.slots}>
      {slots.map((p, i) => {
        const color = p?.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length];
        return (
          <div key={p?.id ?? `empty-${i}`} style={{
            ...st.slot,
            borderColor: p ? `${color}66` : 'rgba(255,255,255,0.08)',
            borderStyle: p ? 'solid' : 'dashed',
          }}>
            <span style={{ ...st.slotNum, color: p ? color : 'rgba(255,255,255,0.2)' }}>P{i + 1}</span>
            {p ? (
              <>
                <span style={{ ...st.pilot, color, textShadow: `0 0 8px ${color}88` }}>{p.name}</span>
                {p.id === myId && <span style={st.youTag}>YOU</span>}
                {p.role === 'host' && <span style={st.youTag}>HOST</span>}
              </>
            ) : (
              <span style={st.openSlot}>OPEN SLOT</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function VersusLobby({ versus, onBack }) {
  const [step, setStep]         = useState('choose'); // choose | join
  const [name, setName]         = useState(loadName);
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied]     = useState(false);
  const { phase, code, role, members, players, myId, busy, error, count } = versus;
  const myName = name.trim() || 'PILOT';

  const click = () => audioManager.playClick();

  const back = () => {
    click();
    if (phase !== 'idle') { versus.leave(); return; }
    if (step === 'join') { setStep('choose'); versus.clearError(); return; }
    onBack();
  };

  useEffect(() => {
    const onKey = e => { if (e.code === 'Escape' && phase !== 'countdown') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const doHost = () => { click(); saveName(myName); versus.host(myName); };
  const doJoin = () => { click(); saveName(myName); versus.join(myName, codeInput); };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard blocked — code is visible anyway */ }
  };

  let body;
  if (phase === 'countdown') {
    body = (
      <>
        <PilotSlots pilots={players} myId={myId} />
        <Countdown count={count} />
        <div style={st.hint}>YOUR CHAINS SEND ASTEROIDS TO WHOEVER IS LEADING</div>
      </>
    );
  } else if (phase === 'lobby') {
    const canStart = members.length >= 2;
    body = (
      <>
        <div style={st.label}>ROOM CODE</div>
        <button style={st.codeBox} onClick={copyCode} title="Copy code">
          {code}
        </button>
        <div style={st.copyHint}>{copied ? '✦ COPIED ✦' : 'CLICK TO COPY · SEND IT TO FRIENDS'}</div>

        <div style={{ ...st.label, marginTop: 6 }}>PILOTS {members.length}/{MAX_PLAYERS}</div>
        <PilotSlots
          pilots={members.map((m, i) => ({ ...m, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }))}
          myId={myId}
          showEmpty
        />

        {busy ? (
          <div style={{ ...st.status, fontSize: 8, animation: 'vs-blink 1s steps(1) infinite' }}>
            ROUND IN PROGRESS · YOU'RE IN THE NEXT ONE
          </div>
        ) : role === 'host' ? (
          <div style={st.btnCol}>
            <VsButton primary onClick={() => { click(); versus.start(); }} disabled={!canStart}>
              {canStart ? `START (${members.length})` : 'NEED 2+ PILOTS'}
            </VsButton>
          </div>
        ) : (
          <div style={{ ...st.status, fontSize: 8, animation: 'vs-blink 1s steps(1) infinite' }}>
            WAITING FOR HOST TO START
          </div>
        )}
        <VsButton onClick={back}>LEAVE ROOM</VsButton>
      </>
    );
  } else if (phase === 'connecting') {
    body = (
      <>
        <div style={{ ...st.status, animation: 'vs-blink 1s steps(1) infinite' }}>
          {role === 'host' ? 'OPENING ROOM' : `SEARCHING FOR ${code}`}
        </div>
        <VsButton onClick={back}>CANCEL</VsButton>
      </>
    );
  } else if (step === 'join') {
    body = (
      <>
        <div style={st.label}>ROOM CODE</div>
        <input
          style={st.input}
          value={codeInput}
          maxLength={9}
          placeholder="DRIFT-___"
          autoFocus
          onChange={e => { setCodeInput(e.target.value.toUpperCase()); versus.clearError(); }}
          onKeyDown={e => { if (e.key === 'Enter') doJoin(); }}
        />
        {error && <div style={st.error}>{error}</div>}
        <div style={st.btnCol}>
          <VsButton primary onClick={doJoin} disabled={!codeInput.trim()}>CONNECT</VsButton>
          <VsButton onClick={back}>BACK</VsButton>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div style={st.label}>PILOT NAME</div>
        <input
          style={st.input}
          value={name}
          maxLength={12}
          placeholder="________"
          autoFocus
          onChange={e => setName(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') doHost(); }}
        />
        {error && <div style={st.error}>{error}</div>}
        <div style={st.btnCol}>
          <VsButton primary onClick={doHost}>HOST ROOM</VsButton>
          <VsButton primary onClick={() => { click(); versus.clearError(); setStep('join'); }}>JOIN ROOM</VsButton>
          <VsButton onClick={back}>BACK TO MENU</VsButton>
        </div>
      </>
    );
  }

  return (
    <div style={st.overlay}>
      <VsStyle />
      <div style={st.panel}>
        <div style={st.title}>VERSUS</div>
        <div style={st.subtitle}>2–4 PILOTS · LAST PILOT FLYING WINS</div>
        <div style={st.divider} />
        {body}
      </div>
    </div>
  );
}
