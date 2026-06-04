import { SHIP, COLORS } from './constants';

export class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = SHIP.RADIUS;
    this.shootCooldown = 0;
    this.invincible = 0;
  }

  update(keys, dt, W, H) {
    if (keys['ArrowLeft'] || keys['KeyA']) this.angle -= SHIP.ROT_SPEED * dt;
    if (keys['ArrowRight'] || keys['KeyD']) this.angle += SHIP.ROT_SPEED * dt;

    this.thrusting = keys['ArrowUp'] || keys['KeyW'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP.THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP.THRUST * dt;
    }

    const spd = Math.hypot(this.vx, this.vy);
    if (spd > SHIP.MAX_SPEED) {
      this.vx = (this.vx / spd) * SHIP.MAX_SPEED;
      this.vy = (this.vy / spd) * SHIP.MAX_SPEED;
    }

    this.vx *= Math.pow(SHIP.FRICTION, dt);
    this.vy *= Math.pow(SHIP.FRICTION, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < -20) this.x = W + 20;
    if (this.x > W + 20) this.x = -20;
    if (this.y < -20) this.y = H + 20;
    if (this.y > H + 20) this.y = -20;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.invincible > 0) this.invincible -= dt;
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  shoot() {
    this.shootCooldown = SHIP.SHOOT_COOLDOWN;
    return {
      x: this.x + Math.cos(this.angle) * 16,
      y: this.y + Math.sin(this.angle) * 16,
      vx: this.vx + Math.cos(this.angle) * SHIP.BULLET_SPEED,
      vy: this.vy + Math.sin(this.angle) * SHIP.BULLET_SPEED,
    };
  }

  hit() {
    this.invincible = SHIP.INVINCIBLE_FRAMES;
  }

  isInvincible() {
    return this.invincible > 0;
  }

  isVisible() {
    return !this.isInvincible() || Math.floor(Date.now() / 80) % 2 === 0;
  }

  draw(ctx, keys) {
    if (!this.isVisible()) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = COLORS.SHIP;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = COLORS.SHIP;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -9);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.SHIP;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (this.thrusting) {
      ctx.beginPath();
      ctx.arc(-6, 0, 4 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,150,0,0.7)';
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}