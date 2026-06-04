import { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Menu, PauseScreen, LeaderboardScreen } from './components/Menu';
import { DeathScreen } from './components/DeathScreen';
import { useHighScores } from './hooks/useHighScores';

export default function App() {
  const [gameState, setGameState] = useState('menu'); // menu | playing | paused | dead | leaderboard
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const { scores, saveScore } = useHighScores();

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setWave(1);
    setGameState('playing');
  }, []);

  const handleDeath = useCallback((finalScore) => {
    saveScore(finalScore);
    setGameState('dead');
  }, [saveScore]);

  const handlePause = useCallback(() => setGameState('paused'), []);
  const handleResume = useCallback(() => setGameState('playing'), []);
  const handleMenu = useCallback(() => setGameState('menu'), []);

  // P key for pause/resume
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
          onStart={startGame}
          onLeaderboard={() => setGameState('leaderboard')}
        />
      )}

      {gameState === 'paused' && (
        <PauseScreen onResume={handleResume} onQuit={handleMenu} />
      )}

      {gameState === 'leaderboard' && (
        <LeaderboardScreen scores={scores} onBack={handleMenu} />
      )}

      {gameState === 'dead' && (
        <DeathScreen
          score={score}
          scores={scores}
          onRetry={startGame}
          onMenu={handleMenu}
        />
      )}

    </div>
  );
}