import { useState, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import audioManager from '../assets/audio/AudioManager';

/*
  AudioToggle — a minimal SVG speaker icon in the DriftSpace style.
  Self-contained: reads and writes mute state directly on audioManager
  (which persists to localStorage automatically via AudioManager's
  _savePreference). Safe to render on any screen simultaneously —
  multiple instances stay in sync because they all read from the same
  audioManager singleton on click.
*/

function SpeakerIcon({ muted }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}>
      <polygon points="3,7 7,7 12,3 12,17 7,13 3,13"
        fill="rgba(0,229,255,0.18)" stroke="#00e5ff"
        strokeWidth="1.4" strokeLinejoin="round" />
      {!muted && (
        <>
          <path d="M14 7.5 C15.2 8.4 15.2 11.6 14 12.5"
            stroke="#00e5ff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M15.8 5.5 C17.8 7.2 17.8 12.8 15.8 14.5"
            stroke="#00e5ff" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
        </>
      )}
      {muted && (
        <line x1="3.5" y1="3.5" x2="16.5" y2="16.5"
          stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      )}
    </svg>
  );
}

export function AudioToggle({ style }) {
  const reduceMotion = useReducedMotion();
  const [muted, setMuted]   = useState(() => audioManager.muted);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleClick = useCallback(() => {
    audioManager.toggleMute();
    setMuted(audioManager.muted);
    setPressed(true);
    setTimeout(() => setPressed(false), 140);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={muted ? 'Audio Off — click to unmute' : 'Audio On — click to mute'}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        style={{
          background: 'none',
          border: '1px solid rgba(0,229,255,0.28)',
          borderRadius: 4,
          padding: '7px 8px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderColor: hovered ? 'rgba(0,229,255,0.65)' : 'rgba(0,229,255,0.28)',
          boxShadow: hovered
            ? '0 0 12px rgba(0,229,255,0.28), 0 0 24px rgba(0,229,255,0.12)'
            : 'none',
          transform: pressed ? 'scale(0.88)' : hovered ? 'scale(1.12)' : 'scale(1)',
          transition: reduceMotion
            ? 'none'
            : 'transform 0.15s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        }}
      >
        <SpeakerIcon muted={muted} />
      </button>

      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          background: 'rgba(3,4,8,0.92)',
          border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: 3, padding: '4px 8px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: 2,
          color: 'rgba(0,229,255,0.85)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {muted ? 'AUDIO OFF' : 'AUDIO ON'}
        </div>
      )}
    </div>
  );
}