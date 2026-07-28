import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Menu, PauseScreen } from './components/Menu';
import { Leaderboard } from './components/Leaderboard';
import { ScoreSubmissionModal } from './components/ScoreSubmissionModal';
import { DeathScreen } from './components/DeathScreen';
import { AudioToggle } from './components/AudioToggle';
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

      {(gameState === 'playing' || gameState === 'paused') && (
        <div style={{
          position: 'fixed',
          top: 'clamp(16px, 2.5vh, 28px)',
          right: 'clamp(16px, 2.5vw, 32px)',
          zIndex: 20,
        }}>
          <AudioToggle />
        </div>
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
        <ScoreSubmissionModal score={lastScore} onDone={handleSubmitDone} />
      )}

      {gameState === 'dead' && !showSubmit && (
        <DeathScreen
          score={lastScore}
          scores={scores}
          onRetry={() => { audioManager.playClick(); startGame(); }}
          onMenu={() => { audioManager.playClick(); setGameState('menu'); }}
        />
      )}

    </div>
  );
}