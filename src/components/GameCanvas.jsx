import { useEffect, useRef } from 'react';
import { useGameLoop } from '../game/useGameLoop';

export function GameCanvas({ gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate }) {
  const canvasRef = useRef(null);

useEffect(() => {
  function resize() {
    if (!canvasRef.current) return;
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;
  }
  resize(); // call immediately
  window.addEventListener('resize', resize);
  return () => window.removeEventListener('resize', resize);
}, []); // <-- make sure deps array is empty

  useGameLoop(canvasRef, gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', background: '#000' }}
    />
  );
}