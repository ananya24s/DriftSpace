import { useEffect, useRef, useCallback } from 'react';
import { Ship } from './Ship';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { Particle, DebrisShard, ImpactFlash, ScorePopup } from './Particle';
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
      comboCount: 0,
      comboTimer: 0,
      popups: [],
      flashes: [],
      shards: [],
      prevWave: 1,
      waveAnnounceTimer: 0,
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

      // Combo timer decay
      if (s.comboTimer > 0) {
        s.comboTimer -= dt;
        if (s.comboTimer <= 0) s.comboCount = 0;
      }

      // Wave announcement trigger
      if (s.wave !== s.prevWave) {
        s.prevWave = s.wave;
        s.waveAnnounceTimer = 180; // ~3s at 60fps
      }
      if (s.waveAnnounceTimer > 0) s.waveAnnounceTimer -= dt;

      // Shoot
      if ((keys['Space'] || keys['KeyZ']) && s.ship.canShoot()) {
        const bData = s.ship.shoot();
        audioManager.playShoot();
        s.bullets.push(new Bullet(bData));
        s.particles.push(...Particle.burst(bData.x, bData.y, 4, '#00e5ff', false));
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

              const pts  = a.scoreValue();
              const big  = a.size > 30;
              s.score   += pts;
              s.kills++;

              // Impact flash — brief white burst at kill point
              s.flashes.push(ImpactFlash.fromAsteroid(a));

              // Debris shards — line-segment spray
              s.shards.push(
                ...DebrisShard.burst(a.x, a.y, big ? 10 : 6, a.color, big)
              );

              // Floating score popup
              s.popups.push(ScorePopup.fromKill(a.x, a.y, pts, a.size));

              // Combo chain
              s.comboCount++;
              s.comboTimer = 120;
              if (s.comboCount >= 3) {
                const bonus = 50 + Math.max(0, s.comboCount - 3) * 25;
                s.score += bonus;
                s.popups.push(ScorePopup.chain(a.x, a.y - 28, bonus));
                audioManager.playChain();
              }

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

      // Particles, flashes, shards, popups
      s.particles = s.particles.filter(p => { p.update(dt); return p.isAlive(); });
      s.flashes   = s.flashes.filter(f => { f.update(dt); return f.isAlive(); });
      s.shards    = s.shards.filter(sh => { sh.update(dt); return sh.isAlive(); });
      s.popups    = s.popups.filter(p => { p.update(dt); return p.isAlive(); });

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

      // Impact flashes (behind everything)
      s.flashes.forEach(f => f.draw(ctx));

      // Particles
      s.particles.forEach(p => p.draw(ctx));

      // Asteroids
      s.asteroids.forEach(a => a.draw(ctx));

      // Bullets
      s.bullets.forEach(b => b.draw(ctx));

      // Debris shards (above asteroids, below ship)
      s.shards.forEach(sh => sh.draw(ctx));

      // Score popups
      s.popups.forEach(p => p.draw(ctx));

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

  // setVirtualKey — lets mobile controls write into the same keysRef
  // that keyboard input uses. One shared input state, no duplicate logic.
  const setVirtualKey = (key, pressed) => {
    if (pressed) {
      keysRef.current[key] = true;
    } else {
      delete keysRef.current[key];
    }
  };

  return { initState, stateRef, setVirtualKey };
}