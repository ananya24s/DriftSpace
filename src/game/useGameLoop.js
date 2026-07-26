import { useEffect, useRef, useCallback } from 'react';
import { Ship } from './Ship';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { Particle } from './Particle';
import { GAME, ASTEROID } from './constants';
import audioManager from '../assets/audio/AudioManager';
export function useGameLoop(canvasRef, gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate) {
  const stateRef = useRef({});
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const initState = useCallback(() => {
    const canvas = canvasRef.current;
    stateRef.current = {
      ship: new Ship(canvas.width / 2, canvas.height / 2),
      bullets: [],
      asteroids: [],
      particles: [],
      score: 0,
      kills: 0,
      lives: GAME.LIVES,
      wave: 1,
      startTime: Date.now(),
      spawnTimer: 60,
      shakeAmt: 0,
      shakeDur: 0,
      dead: false,
    };
  }, [canvasRef]);

  const shake = (amt, dur) => {
    const s = stateRef.current;
    s.shakeAmt = Math.max(s.shakeAmt, amt);
    s.shakeDur = Math.max(s.shakeDur, dur);
  };

  useEffect(() => {
    const onKeyDown = e => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
    const onKeyUp = e => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    initState();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 1.6 + 0.2,
      a: Math.random() * 0.6 + 0.2,
      sp: Math.random() * 0.3 + 0.05,
    }));

    function update(dt) {
      const s = stateRef.current;
      if (s.dead) return;
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;
      const keys = keysRef.current;
      const elapsed = (Date.now() - s.startTime) / 1000;

      s.wave = Math.floor(elapsed / GAME.WAVE_DURATION) + 1;
      const spawnInterval = Math.max(ASTEROID.SPAWN_INTERVAL_MIN, ASTEROID.SPAWN_INTERVAL_BASE - s.wave * 5);
      onWaveUpdate(s.wave);

      // Ship
      s.ship.update(keys, dt, W, H);
      if (s.ship.thrusting && Math.random() < 0.4) {
        s.particles.push(Particle.thrust(s.ship));
      }

      // Shoot
if ((keys['Space'] || keys['KeyZ']) && s.ship.canShoot()) {
  const bData = s.ship.shoot();

  audioManager.playShoot();

  s.bullets.push(new Bullet(bData));
  s.particles.push(...Particle.burst(bData.x, bData.y, 4, '#00e5ff', false));
}
     if ((keys['Space'] || keys['KeyZ']) && s.ship.canShoot()) {
  const bData = s.ship.shoot();
  s.bullets.push(new Bullet(bData));
  s.particles.push(...Particle.burst(bData.x, bData.y, 4, '#00e5ff', false));

  audioManager.playShoot();
}
      // Spawn asteroids
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.asteroids.push(Asteroid.spawn(W, H, s.wave));
        s.spawnTimer = spawnInterval + (Math.random() - 0.5) * 10;
      }

      // Update bullets
      s.bullets = s.bullets.filter(b => { b.update(dt, W, H); return b.isAlive(W, H); });

      // Update asteroids
      s.asteroids.forEach(a => a.update(dt, W, H));

      // Bullet-asteroid collisions
      const surviving = [];
      s.asteroids.forEach(a => {
        let hit = false;
        s.bullets.forEach((b, bi) => {
          if (hit) return;
          if (a.hitsBullet(b)) {
            s.bullets.splice(bi, 1);
            a.hp--;
            s.particles.push(...Particle.burst(b.x, b.y, 8 + (a.size > 30 ? 6 : 0), a.color, a.size > 30));
            shake(a.size > 30 ? 4 : 2, 6);
            if (a.hp <= 0) {
  audioManager.playExplosion();

  s.score += a.scoreValue();
  s.kills++;
  onScoreUpdate(s.score);
  surviving.push(...Asteroid.split(a));
  hit = true;
}
          }
        });
        if (!hit) surviving.push(a);
      });
      s.asteroids = surviving;

      // Ship-asteroid collisions
      if (!s.ship.isInvincible()) {
        for (let a of s.asteroids) {
          if (a.hitsShip(s.ship)) {
  audioManager.playPlayerHit();

  s.lives--;
  onLivesUpdate(s.lives);
            shake(10, 20);
            s.particles.push(...Particle.burst(s.ship.x, s.ship.y, 20, '#00e5ff', true));
            s.ship.hit();
            if (s.lives <= 0) {
              s.dead = true;
              setTimeout(() => onDeath(s.score), 400);
            }
            break;
          }
        }
      }

      // Particles
      s.particles = s.particles.filter(p => { p.update(dt); return p.isAlive(); });

      // Screenshake decay
      if (s.shakeDur > 0) { s.shakeDur -= dt; if (s.shakeDur <= 0) s.shakeAmt *= 0.8; }
      else s.shakeAmt *= Math.pow(0.88, dt);

      // Stars parallax
      stars.forEach(st => {
        st.x -= st.sp * s.ship.vx * 0.02;
        st.y -= st.sp * s.ship.vy * 0.02;
        if (st.x < 0) st.x += W;
        if (st.x > W) st.x -= W;
        if (st.y < 0) st.y += H;
        if (st.y > H) st.y -= H;
      });
    }

    function draw() {
      const s = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const sx = s.shakeAmt > 0.5 ? (Math.random() - 0.5) * s.shakeAmt : 0;
      const sy = s.shakeAmt > 0.5 ? (Math.random() - 0.5) * s.shakeAmt : 0;
      ctx.save();
      ctx.translate(sx, sy);

      // BG
      ctx.fillStyle = '#000';
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Stars
      stars.forEach(st => {
        ctx.globalAlpha = st.a;
        ctx.fillStyle = '#fff';
        ctx.fillRect(st.x, st.y, st.s, st.s);
      });
      ctx.globalAlpha = 1;

      // Particles
      s.particles.forEach(p => p.draw(ctx));

      // Asteroids
      s.asteroids.forEach(a => a.draw(ctx));

      // Bullets
      s.bullets.forEach(b => b.draw(ctx));

      // Ship
      s.ship.draw(ctx, keysRef.current);

      ctx.restore();
    }

    function loop(ts) {
      const dt = Math.min((ts - lastTimeRef.current) / 16.67, 3);
      lastTimeRef.current = ts;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  return { initState };
}