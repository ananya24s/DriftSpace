import { POWERUP } from './constants';
import { POWERUP_TYPES, RACE_PICKUP, randomPowerUpType, drawPowerUpBitmap } from './powerUpGlyph';

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

  static maybeDrop(asteroid, count, includeVersus = false) {
    if (count >= POWERUP.MAX_ON_SCREEN) return null;
    const chance = asteroid.size > 30 ? POWERUP.DROP_CHANCE_BIG : POWERUP.DROP_CHANCE;
    if (Math.random() >= chance) return null;
    return new PowerUp(asteroid.x, asteroid.y, randomPowerUpType(includeVersus));
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

    // Corner brackets outside the frame (red warning brackets on sabotage pickups)
    const c = f + 4, l = 5;
    if (POWERUP_TYPES[this.type].mean) { ctx.strokeStyle = '#ff3b3b'; ctx.shadowColor = '#ff3b3b'; }
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

/*
  RacePickup — versus only. The host drops one at the same relative spot on
  every pilot's screen; the first to touch it (as judged by the host) wins.
  It sits still, with a golden frame, spinning brackets and a countdown ring.
*/
export class RacePickup {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.age = 0;
    this.claimed = false;   // touched locally; waiting for the host's verdict
    this.radius = 20;
  }

  update(dt) { this.age += dt; }

  isAlive() { return !this.claimed && this.age < POWERUP.RACE_LIFETIME; }

  touchesShip(ship) {
    return Math.hypot(this.x - ship.x, this.y - ship.y) < this.radius + ship.radius;
  }

  draw(ctx) {
    const left = POWERUP.RACE_LIFETIME - this.age;
    if (left < 150 && Math.floor(this.age / 5) % 2 === 0) return;
    const col = RACE_PICKUP.color;
    const f = this.radius + [0, 1, 2, 1][Math.floor(this.age / 8) % 4];
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = col;
    ctx.fillRect(-f, -f, f * 2, f * 2);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(-f, -f, f * 2, f * 2);

    // Brackets spin in 45° steps
    ctx.save();
    ctx.rotate(Math.floor(this.age / 12) * (Math.PI / 4));
    const c = f + 8, l = 7;
    ctx.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      ctx.moveTo(sx * c, sy * (c - l));
      ctx.lineTo(sx * c, sy * c);
      ctx.lineTo(sx * (c - l), sy * c);
    });
    ctx.stroke();
    ctx.restore();

    // Countdown ring
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, f + 16, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * left) / POWERUP.RACE_LIFETIME);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 6;
    drawPowerUpBitmap(ctx, RACE_PICKUP, 4);

    ctx.shadowBlur = 0;
    ctx.fillStyle = col;
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('RACE', 0, f + 30);
    ctx.restore();
  }
}
