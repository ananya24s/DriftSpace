import { useEffect, useRef } from 'react';
import { useGameLoop } from '../game/useGameLoop';

export function GameCanvas({ gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate, onReady }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const { setVirtualKey } = useGameLoop(canvasRef, gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate);

  // Expose setVirtualKey to parent via onReady callback so App can
  // pass it down to MobileControls without prop-drilling through GameCanvas.
  useEffect(() => {
    if (onReady && setVirtualKey) onReady({ setVirtualKey });
  }, [onReady, setVirtualKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', background: '#000' }}
    />
  );
}