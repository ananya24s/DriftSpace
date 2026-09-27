import { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Menu, PauseScreen } from './components/Menu';
import { Leaderboard } from './components/Leaderboard';
import { ScoreSubmissionModal } from './components/ScoreSubmissionModal';
import { DeathScreen } from './components/DeathScreen';
import { AudioToggle } from './components/AudioToggle';
import { MobileControls } from './components/MobileControls';
import { PortraitOverlay } from './components/PortraitOverlay';
import './mobile.css';
import { useHighScores } from './hooks/useHighScores';
import { useVersus } from './hooks/useVersus';
import { VersusLobby } from './components/VersusLobby';
import { VersusHUD } from './components/VersusHUD';
import { VersusResult } from './components/VersusResult';
import audioManager from "./assets/audio/AudioManager";
export default function App() {
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [powerUps, setPowerUps] = useState([]);
  const [lastScore, setLastScore] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const { scores, saveScore } = useHighScores();

  // useRef — not useState — because useState's setter treats a function
  // argument as an updater: setFn(() => fn) calls fn() rather than storing fn.
  const virtualKeyRef = useRef(null);
  const setVirtualKey = useCallback((key, pressed) => {
    if (virtualKeyRef.current) virtualKeyRef.current(key, pressed);
  }, []);

  const handleCanvasReady = useCallback(({ setVirtualKey: fn }) => {
    virtualKeyRef.current = fn;
  }, []);

  const startGame = useCallback(() => {
    setScore(0); setLives(3); setWave(1); setPowerUps([]);
    setShowSubmit(false);
    setGameState('playing');
  }, []);

  // Versus is a separate mode layered on top — 'solo' is the original game.
  const [mode, setMode] = useState('solo');
  const modeRef = useRef('solo');
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const versus = useVersus({
    onMatchStart: () => startGame(),
    // Stop our game when we're knocked out or the match is decided
    onGameOver: () => setGameState(g => (g === 'playing' || g === 'versus' ? 'versus-result' : g)),
  });
  const versusLinkRef = useRef(null);
  useEffect(() => {
    versusLinkRef.current = mode === 'versus'
      ? { sendAttack: versus.sendAttack, attackQueueRef: versus.attackQueueRef }
      : null;
  }, [mode, versus.sendAttack, versus.attackQueueRef]);

  const handleDeath = useCallback((finalScore) => {
    if (modeRef.current === 'versus') {
      versus.reportDeath(finalScore);
      return;
    }
    saveScore(finalScore);
    setLastScore(finalScore);
    setShowSubmit(true);
    setGameState('dead');
  }, [saveScore, versus.reportDeath]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitDone = useCallback((name) => {
    setSubmittedName(name || null);
    setShowSubmit(false);
  }, []);

  useEffect(() => {
    const onKey = e => {
      if (e.code === 'KeyP' && modeRef.current === 'solo') {
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
  // Versus: stream our live score/lives/wave to the room
  useEffect(() => {
    if (mode === 'versus' && gameState === 'playing') versus.sendStatus({ score, lives, wave });
  }, [mode, gameState, score, lives, wave]); // eslint-disable-line react-hooks/exhaustive-deps

  const exitVersus = useCallback(() => {
    versus.leave();
    setMode('solo');
    setGameState('menu');
  }, [versus.leave]); // eslint-disable-line react-hooks/exhaustive-deps

useEffect(() => {
  switch (gameState) {
    case 'menu':
    case 'leaderboard':
    case 'versus':
      audioManager.playMenuMusic();
      break;

    case 'playing':
      audioManager.fadeToGameplay();
      break;

    case 'paused':
      break;

    case 'versus-result':
      audioManager.fadeToMenu();
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
    <div
      className={gameState === 'playing' ? 'ds-game-active' : ''}
      style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}
    >

      <GameCanvas
        gameState={gameState}
        onDeath={handleDeath}
        onScoreUpdate={setScore}
        onLivesUpdate={setLives}
        onWaveUpdate={setWave}
        onPowerUpsUpdate={setPowerUps}
        versusLinkRef={versusLinkRef}
        onReady={handleCanvasReady}
      />

      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD score={score} lives={lives} wave={wave} powerUps={powerUps}
          onPause={mode === 'solo' ? () => { audioManager.playClick(); setGameState('paused'); } : undefined} />
      )}

      {mode === 'versus' && gameState === 'playing' && (
        <VersusHUD rivals={versus.players.filter(p => !p.isMe)} incoming={versus.incoming} />
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
  onVersus={() => {
    audioManager.playClick();
    setMode('versus');
    setGameState('versus');
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

      {gameState === 'versus' && (
        <VersusLobby versus={versus} onBack={exitVersus} />
      )}

      {gameState === 'versus-result' && (
        <VersusResult versus={versus} onMenu={exitVersus} />
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

      {/* Mobile virtual controls — only visible on touch devices via CSS,
          only active during gameplay */}
      <MobileControls
        setVirtualKey={setVirtualKey}
        active={gameState === 'playing'}
      />

      {/* Portrait orientation warning — touch devices only via CSS */}
      {/* Versus lobby/result screens work in portrait (easier typing on a phone);
          everything else asks for landscape */}
      <PortraitOverlay enabled={gameState !== 'versus' && gameState !== 'versus-result'} />

    </div>
  );
}