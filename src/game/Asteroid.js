import { ASTEROID } from './constants';
import { generateAsteroidPoints, randomAsteroidColor, drawAsteroidGlyph } from './asteroidGlyph';

export class Asteroid {
  constructor(x, y, size, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.angle = 0;
    this.rotV = (Math.random() - 0.5) * 0.04;
    this.hp = size > 30 ? 2 : 1;
    this.color = randomAsteroidColor();
    this.pts = generateAsteroidPoints(this.size);
  }

  static spawn(W, H, wave) {
    const size = Math.max(
      ASTEROID.MIN_SIZE,
      Math.min((Math.random() * 28 + 16) * (1 / (1 + wave * 0.02)), ASTEROID.MAX_SIZE)
    );

    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = Math.random() * W; y = -size; }
    else if (edge === 1) { x = W + size; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + size; }
    else { x = -size; y = Math.random() * H; }

    const cx = W / 2 + (Math.random() - 0.5) * W * 0.4;
    const cy = H / 2 + (Math.random() - 0.5) * H * 0.4;
    const ang = Math.atan2(cy - y, cx - x) + (Math.random() - 0.5) * 0.8;
    const spd = (ASTEROID.BASE_SPEED + Math.random() * ASTEROID.SPEED_VARIANCE) * (1 + wave * ASTEROID.DIFFICULTY_RAMP);

    return new Asteroid(x, y, size, Math.cos(ang) * spd, Math.sin(ang) * spd);
  }

  static split(a) {
    if (a.size < ASTEROID.SPLIT_THRESHOLD) return [];
    return [0, 1].map(i => {
      const ang = Math.atan2(a.vy, a.vx) + (i === 0 ? 0.5 : -0.5) + (Math.random() - 0.5) * 0.3;
      const spd = Math.hypot(a.vx, a.vy) * 1.1 + 0.5;
      const ns = a.size * 0.55;
      return new Asteroid(a.x, a.y, ns, Math.cos(ang) * spd, Math.sin(ang) * spd);
    });
  }

  update(dt, W, H) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.rotV * dt;

    if (this.x < -100) this.x = W + 100;
    if (this.x > W + 100) this.x = -100;
    if (this.y < -100) this.y = H + 100;
    if (this.y > H + 100) this.y = -100;
  }

  hitsShip(ship) {
    return Math.hypot(this.x - ship.x, this.y - ship.y) < this.size + ship.radius - 4;
  }

  hitsBullet(bullet) {
    return Math.hypot(this.x - bullet.x, this.y - bullet.y) < this.size;
  }

  scoreValue() {
    return Math.floor(this.size * 2 + 10);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawAsteroidGlyph(ctx, { pts: this.pts, color: this.color, size: this.size });
    ctx.restore();
  }
}