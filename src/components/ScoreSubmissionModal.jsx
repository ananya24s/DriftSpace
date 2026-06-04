import { useState } from 'react';
import { submitScore } from '../services/supabase';

const st = {
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)', fontFamily: 'Courier New, monospace',
    zIndex: 10,
  },
  box: {
    border: '1px solid rgba(0,229,255,0.3)',
    boxShadow: '0 0 40px rgba(0,229,255,0.1)',
    padding: '40px 48px',
    textAlign: 'center',
    minWidth: 300,
    maxWidth: 380,
  },
  title: {
    fontSize: 11, letterSpacing: 6, color: '#ff4444',
    textShadow: '0 0 12px rgba(255,68,68,0.5)', marginBottom: 8,
  },
  score: { fontSize: 48, color: '#fff', fontWeight: 700, marginBottom: 4 },
  scoreLabel: { fontSize: 10, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginBottom: 32 },
  label: { fontSize: 9, letterSpacing: 4, color: 'rgba(0,229,255,0.5)', marginBottom: 10 },
  input: {
    background: 'transparent', border: '1px solid rgba(0,229,255,0.3)',
    color: '#00e5ff', fontFamily: 'Courier New, monospace', fontSize: 18,
    letterSpacing: 6, padding: '12px 16px', textAlign: 'center',
    width: '100%', outline: 'none', marginBottom: 16,
    boxSizing: 'border-box',
  },
  btn: {
    background: 'transparent', border: '1px solid rgba(0,229,255,0.5)',
    color: '#00e5ff', fontFamily: 'Courier New, monospace', fontSize: 12,
    letterSpacing: 4, padding: '12px 32px', cursor: 'pointer',
    width: '100%', marginBottom: 8, transition: 'all 0.2s',
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  skip: {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)',
    fontFamily: 'Courier New, monospace', fontSize: 10, letterSpacing: 3,
    cursor: 'pointer', marginTop: 8,
  },
  success: { fontSize: 11, letterSpacing: 3, color: '#00e5ff', marginTop: 12 },
  error: { fontSize: 10, letterSpacing: 2, color: '#ff4444', marginTop: 12 },
};

export function ScoreSubmissionModal({ score, onDone }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleSubmit = async () => {
    if (!name.trim() || status === 'submitting' || status === 'success') return;
    setStatus('submitting');
    try {
      await submitScore(name, score);
      setStatus('success');
      setTimeout(() => onDone(), 1800);
    } catch {
      setStatus('error');
    }
  };

  const handleKey = e => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={st.overlay}>
      <div style={st.box}>
        <div style={st.title}>— SIGNAL LOST —</div>
        <div style={st.score}>{score.toLocaleString()}</div>
        <div style={st.scoreLabel}>FINAL SCORE</div>

        {status !== 'success' ? (
          <>
            <div style={st.label}>PILOT NAME</div>
            <input
              style={st.input}
              maxLength={12}
              value={name}
              onChange={e => setName(e.target.value.toUpperCase())}
              onKeyDown={handleKey}
              placeholder="________"
              autoFocus
              disabled={status === 'submitting'}
            />
            <button
              style={{ ...st.btn, ...((!name.trim() || status === 'submitting') ? st.btnDisabled : {}) }}
              onClick={handleSubmit}
              disabled={!name.trim() || status === 'submitting'}
            >
              {status === 'submitting' ? '[ TRANSMITTING... ]' : '[ SUBMIT SCORE ]'}
            </button>
            <button style={st.skip} onClick={onDone}>SKIP</button>
            {status === 'error' && (
              <div style={st.error}>TRANSMISSION FAILED. TRY AGAIN.</div>
            )}
          </>
        ) : (
          <div style={st.success}>✦ SCORE TRANSMITTED ✦</div>
        )}
      </div>
    </div>
  );
}