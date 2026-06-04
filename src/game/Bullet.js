import { COLORS } from './constants';

export class Bullet {
  constructor({ x, y, vx, vy }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.age = 0;
    this.life = 1;
  }

  update(dt, W, H) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    this.life = 1 - this.age / 70;
  }

  isAlive(W, H) {
    return (
      this.life > 0 &&
      this.x > -10 && this.x < W + 10 &&
      this.y > -10 && this.y < H + 10
    );
  }

  draw(ctx) {
    ctx.globalAlpha = this.life;
    ctx.strokeStyle = COLORS.BULLET;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.BULLET;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.5, this.y - this.vy * 0.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}