import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Menu, PauseScreen } from './components/Menu';
import { Leaderboard } from './components/Leaderboard';
import { ScoreSubmissionModal } from './components/ScoreSubmissionModal';
import { useHighScores } from './hooks/useHighScores';
import audioManager from "./assets/audio/AudioManager";
export default function App() {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [lastScore, setLastScore] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const { scores, saveScore } = useHighScores();

  const startGame = useCallback(() => {
    setScore(0); setLives(3); setWave(1);
    setShowSubmit(false);
    setGameState('playing');
  }, []);

  const handleDeath = useCallback((finalScore) => {
    saveScore(finalScore);
    setLastScore(finalScore);
    setShowSubmit(true);
    setGameState('dead');
  }, [saveScore]);

  const handleSubmitDone = useCallback((name) => {
    setSubmittedName(name || null);
    setShowSubmit(false);
  }, []);

  useEffect(() => {
    const onKey = e => {
      if (e.code === 'KeyP') {
        setGameState(prev => {
          if (prev === 'playing') return 'paused';
          if (prev === 'paused') return 'playing';
          return prev;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
useEffect(() => {
  switch (gameState) {
    case 'menu':
    case 'leaderboard':
      audioManager.playMenuMusic();
      break;

    case 'playing':
      audioManager.fadeToGameplay();
      break;

    case 'paused':
      break;

    case 'dead':
      audioManager.playGameOver();
      audioManager.fadeToMenu();
      break;

    default:
      break;
  }
}, [gameState]);
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

      <GameCanvas
        gameState={gameState}
        onDeath={handleDeath}
        onScoreUpdate={setScore}
        onLivesUpdate={setLives}
        onWaveUpdate={setWave}
      />

      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD score={score} lives={lives} wave={wave} />
      )}

      {gameState === 'menu' && (
        <Menu
  onStart={() => {
    audioManager.playClick();
    startGame();
  }}
  onLeaderboard={() => {
    audioManager.playClick();
    setGameState('leaderboard');
  }}
/>
      )}

      {gameState === 'paused' && (
        <PauseScreen
  onResume={() => {
    audioManager.playClick();
    setGameState('playing');
  }}
  onQuit={() => {
    audioManager.playClick();
    setGameState('menu');
  }}
/>
      )}

      {gameState === 'leaderboard' && (
        <Leaderboard
  onBack={() => {
    audioManager.playClick();
    setGameState('menu');
  }}
  highlightName={submittedName}
/>
      )}

      {gameState === 'dead' && showSubmit && (
        <ScoreSubmissionModal score={lastScore} onDone={() => setShowSubmit(false)} />
      )}

      {gameState === 'dead' && !showSubmit && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'Courier New, monospace',
        }}>
          <div style={{ fontSize: 48, color: '#fff', fontWeight: 700, marginBottom: 4 }}>
            {lastScore.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 4, marginBottom: 32 }}>
            FINAL SCORE
          </div>
          <button
  onClick={() => {
    audioManager.playClick();
    startGame();
  }}
  style={{
    background: 'transparent',
    border: '1px solid rgba(0,229,255,0.5)',
    color: '#00e5ff',
    fontFamily: 'Courier New, monospace',
    fontSize: 13,
    letterSpacing: 4,
    padding: '14px 40px',
    cursor: 'pointer',
    margin: 6,
  }}
>
  [ RETRY ]
</button>
          <button
  onClick={() => {
    audioManager.playClick();
    setGameState('leaderboard');
  }}
  style={{
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Courier New, monospace',
    fontSize: 11,
    letterSpacing: 4,
    padding: '10px 28px',
    cursor: 'pointer',
    margin: 6,
  }}
>
  LEADERBOARD
</button>
          <button
  onClick={() => {
    audioManager.playClick();
    setGameState('menu');
  }}
  style={{
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Courier New, monospace',
    fontSize: 10,
    letterSpacing: 3,
    padding: '8px',
    cursor: 'pointer',
    marginTop: 4,
  }}
>
  MAIN MENU
</button>
        </div>
      )}

    </div>
  );
}