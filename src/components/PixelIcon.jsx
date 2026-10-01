import { POWERUP_TYPES } from '../game/powerUpGlyph';

/* 7×7 pixel sprite — the same bitmap the in-game pickup uses */
// type: a POWERUP_TYPES key, or pass def ({ bitmap, color }) directly
export function PixelIcon({ type, def, size = 14, glow = true }) {
  const { bitmap, color } = def ?? POWERUP_TYPES[type];
  const rects = [];
  bitmap.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'X') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
  }));
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges"
      style={{ display: 'block', fill: color, filter: glow ? `drop-shadow(0 0 3px ${color})` : 'none' }}>
      {rects}
    </svg>
  );
}
