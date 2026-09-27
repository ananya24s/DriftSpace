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

    // Reverse thrust — 55% of forward power, opposite to facing direction.
    // Same inertia, drag, and speed cap apply automatically below.
    this.reversing = keys['ArrowDown'] || keys['KeyS'];
    if (this.reversing) {
      this.vx -= Math.cos(this.angle) * SHIP.THRUST * 0.55 * dt;
      this.vy -= Math.sin(this.angle) * SHIP.THRUST * 0.55 * dt;
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

  // offsets — angle offsets (radians) for each bullet; [0] is a single shot.
  shoot(offsets = [0], cooldown = SHIP.SHOOT_COOLDOWN) {
    this.shootCooldown = cooldown;
    return offsets.map(off => {
      const a = this.angle + off;
      return {
        x: this.x + Math.cos(a) * 16,
        y: this.y + Math.sin(a) * 16,
        vx: this.vx + Math.cos(a) * SHIP.BULLET_SPEED,
        vy: this.vy + Math.sin(a) * SHIP.BULLET_SPEED,
      };
    });
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

  // Shield bubble — a hexagon that rotates in hard 15° steps (retro feel)
  // and blinks during its final second and a half.
  drawShield(ctx, remaining, color) {
    if (remaining < 90 && Math.floor(remaining / 5) % 2 === 0) return;
    const r = this.radius + 12;
    const rot = Math.floor(Date.now() / 120) * (Math.PI / 12);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(rot);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
