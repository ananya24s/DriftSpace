import { COLORS } from './constants';

/**
 * The player ship's silhouette, in local space, nose pointing along +x
 * (canvas 0-angle). This is the SINGLE SOURCE OF TRUTH for the ship's
 * shape: gameplay (drawShipGlyph below, via Ship.js) and the branding
 * wordmark (DriftSpaceLogo) both build their geometry from this exact
 * point list. Do not redefine the shape anywhere else.
 *
 *   nose (16,0) -> wing (-10,9) -> tail notch (-6,0) -> wing (-10,-9)
 */
export const SHIP_GLYPH_POINTS = [
  { x: 16, y: 0 },
  { x: -10, y: 9 },
  { x: -6, y: 0 },
  { x: -10, y: -9 },
];

/**
 * Draws the player ship glyph. Assumes ctx is already translated to the
 * ship's position and rotated to its facing angle - this function only
 * draws the shape itself, in local space.
 *
 * Renders byte-for-byte identically to the original inline Ship.js code
 * (it now traces SHIP_GLYPH_POINTS instead of hardcoding the same
 * coordinates). Called with no options (or intensity: 1), gameplay
 * output is unchanged.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ thrusting?: boolean, intensity?: number }} options
 */
export function drawShipGlyph(ctx, { thrusting = false, intensity = 1 } = {}) {
  ctx.strokeStyle = COLORS.SHIP;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = COLORS.SHIP;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  SHIP_GLYPH_POINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = COLORS.SHIP;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (thrusting) {
    ctx.beginPath();
    ctx.arc(-6, 0, (4 + Math.random() * 3) * intensity, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,150,0,0.7)';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = 0;
}