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
/*
  DebrisShard — a short line segment that flies outward from an explosion.
  Visually distinct from circle particles: reads as physical debris rather
  than energy. Used alongside Particle.burst() on asteroid kills.
*/
export class DebrisShard {
  constructor(x, y, color, big = false) {
    const ang  = Math.random() * Math.PI * 2;
    const spd  = (big ? 2.5 : 1.2) + Math.random() * (big ? 3.5 : 2.5);
    const len  = (big ? 6 : 3) + Math.random() * (big ? 8 : 5);
    this.x  = x; this.y  = y;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.ang = ang;
    this.len = len;
    this.life  = 1;
    this.decay = 0.022 + Math.random() * 0.02;
    this.color = color;
    this.rotV  = (Math.random() - 0.5) * 0.18;
  }

  static burst(x, y, n, color, big = false) {
    return Array.from({ length: n }, () => new DebrisShard(x, y, color, big));
  }

  update(dt) {
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.vx  *= Math.pow(0.91, dt);
    this.vy  *= Math.pow(0.91, dt);
    this.ang += this.rotV * dt;
    this.life -= this.decay * dt;
  }

  isAlive() { return this.life > 0; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0) * 0.85;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    const dx = Math.cos(this.ang) * this.len * this.life;
    const dy = Math.sin(this.ang) * this.len * this.life;
    ctx.moveTo(this.x - dx * 0.5, this.y - dy * 0.5);
    ctx.lineTo(this.x + dx * 0.5, this.y + dy * 0.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/*
  ImpactFlash — a brief expanding white circle at the kill point.
  Fades out quickly (8 frames). Gives weight to the moment of impact
  before the debris spray takes over.
*/
export class ImpactFlash {
  constructor(x, y, radius) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.life   = 1;
    this.decay  = 0.14; // very fast — gone in ~7 frames
  }

  static fromAsteroid(asteroid) {
    return new ImpactFlash(asteroid.x, asteroid.y, asteroid.size * 0.9);
  }

  update(dt) { this.life -= this.decay * dt; }
  isAlive()  { return this.life > 0; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0) * 0.45;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (1.4 - this.life * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
}

/*
  ScorePopup — floating score text that appears at the kill position
  and drifts upward before fading out.
*/
export class ScorePopup {
  constructor(x, y, text, color = '#ffffff', big = false) {
    this.x = x; this.y = y;
    this.text     = text;
    this.color    = color;
    this.life     = 1;
    this.decay    = big ? 0.016 : 0.022;
    this.vy       = -(big ? 1.4 : 1.0);
    this.fontSize = big ? 18 : 13;
    this.big      = big;
  }

  static fromKill(x, y, points, asteroidSize) {
    const big   = asteroidSize > 30;
    const color = big ? '#ffd700' : '#00e5ff';
    return new ScorePopup(x, y, `+${points}`, color, big);
  }

  static chain(x, y, bonus) {
    const p = new ScorePopup(x, y, `CHAIN +${bonus}`, '#ffffff', true);
    p.fontSize = 16; p.decay = 0.012; p.vy = -1.8;
    return p;
  }

  update(dt) { this.y += this.vy * dt; this.life -= this.decay * dt; }
  isAlive()  { return this.life > 0; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(this.life, 0) * 0.95;
    ctx.fillStyle   = this.color;
    ctx.font        = `${this.big ? 700 : 600} ${this.fontSize}px 'JetBrains Mono', 'Courier New', monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = this.big ? 10 : 6;
    ctx.fillText(this.text, this.x, this.y);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}