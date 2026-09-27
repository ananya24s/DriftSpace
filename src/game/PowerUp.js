import { POWERUP } from './constants';
import { POWERUP_TYPES, randomPowerUpType, drawPowerUpBitmap } from './powerUpGlyph';

const FRAME = 15; // half-width of the square frame around the icon

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.color = POWERUP_TYPES[type].color;
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.3 + Math.random() * 0.4;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.age = 0;
    this.radius = FRAME;
  }

  static maybeDrop(asteroid, count) {
    if (count >= POWERUP.MAX_ON_SCREEN) return null;
    const chance = asteroid.size > 30 ? POWERUP.DROP_CHANCE_BIG : POWERUP.DROP_CHANCE;
    if (Math.random() >= chance) return null;
    return new PowerUp(asteroid.x, asteroid.y, randomPowerUpType());
  }

  update(dt, W, H) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    if (this.x < -20) this.x = W + 20;
    if (this.x > W + 20) this.x = -20;
    if (this.y < -20) this.y = H + 20;
    if (this.y > H + 20) this.y = -20;
  }

  isAlive() {
    return this.age < POWERUP.LIFETIME;
  }

  touchesShip(ship) {
    return Math.hypot(this.x - ship.x, this.y - ship.y) < this.radius + ship.radius + POWERUP.PICKUP_RADIUS - 10;
  }

  draw(ctx) {
    const remaining = POWERUP.LIFETIME - this.age;
    // Hard on/off blink (no fade) when about to expire — arcade style
    if (remaining < POWERUP.BLINK_AT && Math.floor(this.age / 6) % 2 === 0) return;

    // Stepped pulse: the frame snaps between 3 sizes instead of easing
    const step = Math.floor(this.age / 10) % 4;
    const f = FRAME + [0, 1, 2, 1][step];
    const bob = Math.round(Math.sin(this.age * 0.08) * 2);

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y) + bob);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    // Faint fill + outlined frame
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = this.color;
    ctx.fillRect(-f, -f, f * 2, f * 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-f, -f, f * 2, f * 2);

    // Corner brackets outside the frame
    const c = f + 4, l = 5;
    ctx.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      ctx.moveTo(sx * c, sy * (c - l));
      ctx.lineTo(sx * c, sy * c);
      ctx.lineTo(sx * (c - l), sy * c);
    });
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 6;
    drawPowerUpBitmap(ctx, this.type, 3);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
