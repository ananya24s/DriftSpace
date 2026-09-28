import { UFO } from './constants';

const HULL  = '#e6e8ff';   // classic silver vector saucer
const LIGHT = '#ff3b3b';   // blinking running lights / enemy shots

/*
  Ufo — an enemy saucer in the spirit of classic Asteroids.
  Crosses the screen once (entering from the left or right), zig-zagging
  vertically, and fires at the player. BIG saucers are slow and sloppy;
  SMALL ones are fast and aim well (and get sharper in later waves).
*/
export class Ufo {
  constructor(W, H, wave, kind) {
    const cfg = UFO[kind];
    this.kind = kind;
    this.cfg = cfg;
    this.radius = cfg.radius;
    this.hp = cfg.hp;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.x = this.dir === 1 ? -cfg.radius * 2 : W + cfg.radius * 2;
    this.y = H * (0.15 + Math.random() * 0.7);
    this.vx = this.dir * cfg.speed;
    this.vy = 0;
    this.turnTimer = 40 + Math.random() * 60;
    this.fireTimer = cfg.fireEvery * (0.6 + Math.random() * 0.4);
    this.age = 0;
    this.flash = 0;
    // Small saucers tighten their aim as the waves go on
    this.spread = kind === 'SMALL'
      ? cfg.spread * Math.max(0.35, 1 - (wave - UFO.SMALL_FROM_WAVE) * 0.08)
      : cfg.spread;
  }

  static spawn(W, H, wave) {
    const small = wave >= UFO.SMALL_FROM_WAVE && Math.random() < UFO.SMALL_CHANCE;
    return new Ufo(W, H, wave, small ? 'SMALL' : 'BIG');
  }

  // Returns an EnemyBullet when it fires this frame, otherwise null
  update(dt, W, H, ship) {
    this.age += dt;
    if (this.flash > 0) this.flash -= dt;

    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.vy = [-1, 0, 1][Math.floor(Math.random() * 3)] * this.cfg.speed * 0.6;
      this.turnTimer = 60 + Math.random() * 80;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -this.radius) this.y = H + this.radius;
    if (this.y > H + this.radius) this.y = -this.radius;

    this.fireTimer -= dt;
    if (this.fireTimer > 0 || !ship) return null;
    this.fireTimer = this.cfg.fireEvery * (0.8 + Math.random() * 0.4);

    // Big saucers sometimes just spray randomly
    const aimed = this.kind === 'SMALL' || Math.random() < 0.6;
    const base = aimed ? Math.atan2(ship.y - this.y, ship.x - this.x) : Math.random() * Math.PI * 2;
    const ang = base + (Math.random() - 0.5) * 2 * this.spread;
    return new EnemyBullet(this.x, this.y, Math.cos(ang) * this.cfg.bulletSpeed, Math.sin(ang) * this.cfg.bulletSpeed);
  }

  // Gone once it has crossed to the far side
  isAlive(W) {
    return this.dir === 1 ? this.x < W + this.radius * 3 : this.x > -this.radius * 3;
  }

  hitsPoint(x, y, pad = 0) {
    return Math.hypot(this.x - x, this.y - y) < this.radius + pad;
  }

  hit() {
    this.hp -= 1;
    this.flash = 6;
    return this.hp <= 0;
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.strokeStyle = HULL;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = HULL;
    ctx.shadowBlur = 10;

    // Hull: flat hexagon with a rim line through the middle
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(-r * 0.45, -r * 0.35);
    ctx.lineTo(r * 0.45, -r * 0.35);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.45, r * 0.35);
    ctx.lineTo(-r * 0.45, r * 0.35);
    ctx.closePath();
    ctx.globalAlpha = this.flash > 0 ? 0.7 : 0.12;
    ctx.fillStyle = HULL;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();

    // Dome
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -r * 0.35);
    ctx.lineTo(-r * 0.15, -r * 0.7);
    ctx.lineTo(r * 0.15, -r * 0.7);
    ctx.lineTo(r * 0.25, -r * 0.35);
    ctx.stroke();

    // Running lights chase along the rim in hard steps
    const step = Math.floor(this.age / 8) % 3;
    const size = Math.max(2, Math.round(r * 0.13));
    ctx.shadowColor = LIGHT;
    ctx.shadowBlur = 8;
    [-0.5, 0, 0.5].forEach((fx, i) => {
      ctx.fillStyle = i === step ? LIGHT : 'rgba(255,59,59,0.25)';
      ctx.fillRect(Math.round(fx * r) - size / 2, Math.round(r * 0.14), size, size);
    });

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/* EnemyBullet — a chunky red pixel with a short fading trail */
export class EnemyBullet {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.age = 0;
  }

  update(dt, W, H) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    // Wrap like everything else on the playfield
    if (this.x < 0) this.x += W;
    if (this.x > W) this.x -= W;
    if (this.y < 0) this.y += H;
    if (this.y > H) this.y -= H;
  }

  isAlive() { return this.age < UFO.BULLET_LIFE; }

  hitsShip(ship) {
    return Math.hypot(this.x - ship.x, this.y - ship.y) < ship.radius;
  }

  draw(ctx) {
    const fade = Math.min(1, (UFO.BULLET_LIFE - this.age) / 20);
    ctx.save();
    ctx.shadowColor = LIGHT;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = LIGHT;
    ctx.fillRect(Math.round(this.x - this.vx * 2) - 1.5, Math.round(this.y - this.vy * 2) - 1.5, 3, 3);
    ctx.globalAlpha = fade;
    ctx.fillRect(Math.round(this.x) - 2.5, Math.round(this.y) - 2.5, 5, 5);
    ctx.restore();
  }
}
