import { COLORS } from './constants';

/**
 * Generates the irregular polygon points for an asteroid silhouette,
 * in local space (relative to its own center). Identical to
 * Asteroid.js's original _generatePoints — same vertex count range,
 * same radius jitter — so shapes are statistically indistinguishable
 * from gameplay's.
 */
export function generateAsteroidPoints(size) {
  const pts = [];
  const n = Math.floor(Math.random() * 4) + 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = size * (0.7 + Math.random() * 0.5);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

/**
 * Same color distribution as gameplay: mostly the default silhouette
 * color, with the same 10%/10% odds of the two rare accent colors.
 */
export function randomAsteroidColor() {
  const r = Math.random();
  if (r < 0.1) return COLORS.ASTEROID_RARE_1;
  if (r < 0.2) return COLORS.ASTEROID_RARE_2;
  return COLORS.ASTEROID_DEFAULT;
}

/**
 * Draws the asteroid glyph. Assumes ctx is already translated to the
 * asteroid's position and rotated to its current spin angle — this
 * function only draws the shape itself, in local space.
 *
 * This is the exact drawing code from Asteroid.js's draw() method,
 * extracted so it can be shared by gameplay and the title screen
 * without duplicating it. Called with no alpha (or alpha: 1), it
 * renders byte-for-byte identically to the original inline code.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ pts: {x:number,y:number}[], color: string, size: number, alpha?: number }} options
 *   alpha - overall opacity multiplier (default 1, gameplay never
 *           passes this). Used by the title screen to dim distant
 *           asteroids using this same renderer rather than a
 *           different art style.
 */
export function drawAsteroidGlyph(ctx, { pts, color, size, alpha = 1 }) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = size > 30 ? 8 : 4;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.globalAlpha = 0.15 * alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}