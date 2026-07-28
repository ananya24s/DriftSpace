import { useState } from 'react';
import { submitScore } from '../services/supabase';
import { DriftSpaceMark } from './DriftSpaceMark';

const FONT_PIXEL = "'Press Start 2P', monospace";
const FONT_MONO  = "'JetBrains Mono', 'Courier New', monospace";
const CYAN       = '#00e5ff';

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes ds-modal-in {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes ds-blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
    `}</style>
  );
}

export function ScoreSubmissionModal({ score, onDone }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async () => {
    if (!name.trim() || status === 'submitting' || status === 'success') return;
    setStatus('submitting');
    try {
      await submitScore(name.trim(), score);
      setStatus('success');
      setTimeout(() => onDone(name.trim()), 1800);
    } catch {
      setStatus('error');
    }
  };

  const handleKey = e => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={st.overlay}>
      <GlobalStyle />
      <div style={st.panel}>

        {/* Emblem + Signal Lost */}
        <div style={st.header}>
          <DriftSpaceMark
            size={44}
            fill="rgba(255,255,255,0.1)"
            stroke="rgba(255,68,68,0.65)"
            glowColor="rgba(255,68,68,0.5)"
            style={{ marginBottom: 14 }}
          />
          <div style={st.signalLost}>— SIGNAL LOST —</div>
        </div>

        {/* Score */}
        <div style={st.scoreNumber}>{score.toLocaleString()}</div>
        <div style={st.scoreLabel}>FINAL SCORE</div>

        {/* Input / success */}
        {status !== 'success' ? (
          <div style={st.form}>
            <div style={st.inputLabel}>PILOT NAME</div>
            <input
              style={{
                ...st.input,
                borderColor: status === 'error'
                  ? 'rgba(255,68,68,0.6)'
                  : name.length > 0
                    ? 'rgba(0,229,255,0.65)'
                    : 'rgba(0,229,255,0.25)',
              }}
              maxLength={12}
              value={name}
              onChange={e => setName(e.target.value.toUpperCase())}
              onKeyDown={handleKey}
              placeholder="________"
              autoFocus
              disabled={status === 'submitting'}
            />

            <button
              style={{
                ...st.submitBtn,
                opacity: (!name.trim() || status === 'submitting') ? 0.4 : 1,
                cursor: (!name.trim() || status === 'submitting') ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSubmit}
              disabled={!name.trim() || status === 'submitting'}
            >
              {status === 'submitting'
                ? <span>TRANSMITTING<span style={{ animation: 'ds-blink 0.8s step-end infinite' }}>▋</span></span>
                : 'SUBMIT SCORE'
              }
            </button>

            <button style={st.skipBtn} onClick={() => onDone(null)}>SKIP</button>

            {status === 'error' && (
              <div style={st.errorMsg}>TRANSMISSION FAILED — TRY AGAIN</div>
            )}
          </div>
        ) : (
          <div style={st.successMsg}>
            <span style={{ animation: 'ds-blink 1.2s ease-in-out infinite' }}>✦</span>
            {' '}SCORE TRANSMITTED{' '}
            <span style={{ animation: 'ds-blink 1.2s ease-in-out 0.4s infinite' }}>✦</span>
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(3,4,8,0.92)', backdropFilter: 'blur(2px)',
    zIndex: 10, fontFamily: FONT_MONO,
  },
  panel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: '1px solid rgba(0,229,255,0.2)',
    background: 'rgba(0,229,255,0.02)',
    padding: '40px 52px',
    minWidth: 320, maxWidth: 400,
    animation: 'ds-modal-in 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  header: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    marginBottom: 20,
  },
  signalLost: {
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 3,
    color: 'rgba(255,68,68,0.8)',
    textShadow: '0 0 14px rgba(255,68,68,0.45)',
  },
  scoreNumber: {
    fontFamily: FONT_PIXEL, fontSize: 38, letterSpacing: 2,
    color: '#fff', lineHeight: 1.1,
    textShadow: `0 0 24px rgba(0,229,255,0.3)`,
  },
  scoreLabel: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 5,
    color: 'rgba(255,255,255,0.28)', marginTop: 8, marginBottom: 28,
  },
  form: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', gap: 0,
  },
  inputLabel: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 4,
    color: 'rgba(0,229,255,0.5)', marginBottom: 10, alignSelf: 'flex-start',
  },
  input: {
    background: 'transparent',
    border: '1px solid rgba(0,229,255,0.25)',
    color: CYAN,
    fontFamily: FONT_PIXEL, fontSize: 16, letterSpacing: 6,
    padding: '12px 16px', textAlign: 'center',
    width: '100%', outline: 'none',
    marginBottom: 14, boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    background: 'rgba(0,229,255,0.05)',
    border: '1px solid rgba(0,229,255,0.45)',
    color: CYAN,
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 3,
    padding: '14px 32px 12px', width: '100%',
    marginBottom: 10, borderRadius: 2,
    transition: 'opacity 0.2s ease',
  },
  skipBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.22)',
    fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 3,
    cursor: 'pointer', padding: '4px',
    transition: 'color 0.15s ease',
  },
  errorMsg: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 2,
    color: 'rgba(255,68,68,0.8)', marginTop: 10,
  },
  successMsg: {
    fontFamily: FONT_PIXEL, fontSize: 10, letterSpacing: 2,
    color: CYAN, marginTop: 8,
    textShadow: `0 0 12px rgba(0,229,255,0.6)`,
  },
};