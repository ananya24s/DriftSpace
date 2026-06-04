export class Particle {
  constructor(x, y, color, big = false) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (big ? 3 : 1.5) + Math.random() * (big ? 4 : 3);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.life = 1;
    this.decay = 0.018 + Math.random() * 0.025;
    this.size = (big ? 2.5 : 1) + Math.random() * 2;
    this.color = color;
  }

  static burst(x, y, n, color, big = false) {
    return Array.from({ length: n }, () => new Particle(x, y, color, big));
  }

  static thrust(ship) {
    const ang = ship.angle + Math.PI + (Math.random() - 0.5) * 0.4;
    const spd = 1.5 + Math.random() * 2;
    const p = new Particle(
      ship.x + Math.cos(ship.angle + Math.PI) * 14,
      ship.y + Math.sin(ship.angle + Math.PI) * 14,
      Math.random() < 0.5 ? '#00e5ff' : '#ff9500'
    );
    p.vx = Math.cos(ang) * spd;
    p.vy = Math.sin(ang) * spd;
    p.decay = 0.06 + Math.random() * 0.04;
    p.size = 2 + Math.random() * 2.5;
    return p;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.pow(0.93, dt);
    this.vy *= Math.pow(0.93, dt);
    this.life -= this.decay * dt;
  }

  isAlive() {
    return this.life > 0;
  }

  draw(ctx) {
    ctx.globalAlpha = this.life * 0.9;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}