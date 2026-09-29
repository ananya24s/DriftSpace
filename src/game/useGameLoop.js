import { useEffect, useRef, useCallback } from 'react';
import { Ship } from './Ship';
import { Asteroid } from './Asteroid';
import { Bullet } from './Bullet';
import { Particle, DebrisShard, ImpactFlash, ScorePopup, NovaWave } from './Particle';
import { PowerUp } from './PowerUp';
import { Ufo } from './Ufo';
import { POWERUP_TYPES, randomPowerUpType } from './powerUpGlyph';
import { GAME, ASTEROID, POWERUP, UFO } from './constants';
import { worldScale, FX, createQualityMonitor, disableGlow } from './fx';
import audioManager from '../assets/audio/AudioManager';
// versusLinkRef — null in solo play. During a versus match its .current is
// { sendAttack(n), attackQueueRef } so the loop can send and receive attacks.
export function useGameLoop(canvasRef, gameState, onDeath, onScoreUpdate, onLivesUpdate, onWaveUpdate, onPowerUpsUpdate, versusLinkRef) {
  const stateRef = useRef({});
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const starsRef = useRef([]);
  // Tracks the previous gameState so resuming from pause continues the
  // current run instead of starting a new one.
  const prevGameStateRef = useRef(gameState);
  const pausedAtRef = useRef(0);

  const initState = useCallback(() => {
    const canvas = canvasRef.current;
    const scale = worldScale(canvas.width, canvas.height);
    stateRef.current = {
      ship: new Ship(canvas.width / scale / 2, canvas.height / scale / 2),
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
      powerUps: [],
      // Remaining frames for each timed effect (0 = inactive)
      effects: { SHIELD: 0, RAPID: 0, SPREAD: 0, MULTI: 0, SLOW: 0, MAGNET: 0 },
      novaWaves: [],
      effectsKey: '',
      attackTimer: 0,
      reportedWave: 0,
      ufos: [],
      enemyBullets: [],
      ufoTimer: UFO.SPAWN_INTERVAL * 0.6, // first saucer comes a bit sooner
      ufoWarble: 0,
    };
  }, [canvasRef]);

  const shake = (amt, dur) => {
    const s = stateRef.current;
    s.shakeAmt = Math.max(s.shakeAmt, amt);
    s.shakeDur = Math.max(s.shakeDur, dur);
  };

  // Awards points, applying the score multiplier power-up when active.
  const addScore = (pts) => {
    const s = stateRef.current;
    const gained = s.effects.MULTI > 0 ? pts * 2 : pts;
    s.score += gained;
    return gained;
  };

  // Shared kill effects: flash, debris, score popup, combo chain.
  const destroyAsteroid = (a, { combo = true } = {}) => {
    const s = stateRef.current;
    const big = a.size > 30;
    const pts = addScore(a.scoreValue());
    s.kills++;

    // Impact flash — brief white burst at kill point
    s.flashes.push(ImpactFlash.fromAsteroid(a));

    // Debris shards — line-segment spray
    s.shards.push(...DebrisShard.burst(a.x, a.y, big ? 10 : 6, a.color, big));

    // Floating score popup
    s.popups.push(ScorePopup.fromKill(a.x, a.y, pts, a.size));

    // Combo chain
    if (combo) {
      s.comboCount++;
      s.comboTimer = 120;
      if (s.comboCount >= 3) {
        // Versus: every other chain kill sends an asteroid to the opponent
        if (s.comboCount % 2 === 1) versusLinkRef?.current?.sendAttack(1);
        const bonus = addScore(50 + Math.max(0, s.comboCount - 3) * 25);
        s.popups.push(ScorePopup.chain(a.x, a.y - 28, bonus));
        audioManager.playChain();
      }
    }
  };

  // The ship takes a hit: lose a life, brief invincibility, maybe game over
  const hitShip = () => {
    const s = stateRef.current;
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
  };

  // UFO kill: big explosion, points, power-up drop, combo, versus attack
  const destroyUfo = (u, { combo = true } = {}) => {
    const s = stateRef.current;
    const pts = addScore(u.cfg.points);
    s.kills++;
    s.flashes.push(new ImpactFlash(u.x, u.y, u.radius * 1.6));
    s.particles.push(...Particle.burst(u.x, u.y, 18, '#e6e8ff', true));
    s.particles.push(...Particle.burst(u.x, u.y, 10, '#ff3b3b', true));
    s.shards.push(...DebrisShard.burst(u.x, u.y, 12, '#e6e8ff', true));
    s.popups.push(ScorePopup.fromKill(u.x, u.y, pts, 40));
    shake(8, 12);
    audioManager.playUfoExplode();

    if (s.powerUps.length < POWERUP.MAX_ON_SCREEN && Math.random() < u.cfg.dropChance) {
      s.powerUps.push(new PowerUp(u.x, u.y, randomPowerUpType()));
    }
    versusLinkRef?.current?.sendAttack(UFO.VERSUS_ATTACK);

    if (combo) {
      s.comboCount++;
      s.comboTimer = 120;
    }
  };

  const collectPowerUp = (p, W, H) => {
    const s = stateRef.current;
    const def = POWERUP_TYPES[p.type];
    s.particles.push(...Particle.burst(p.x, p.y, 14, def.color, true));

    if (p.type === 'LIFE') {
      if (s.lives < POWERUP.MAX_LIVES) {
        s.lives++;
        onLivesUpdate(s.lives);
        s.popups.push(ScorePopup.powerUp(p.x, p.y - 24, def.label, def.color));
      } else {
        const bonus = addScore(POWERUP.FULL_LIVES_BONUS);
        s.popups.push(ScorePopup.powerUp(p.x, p.y - 24, `MAX +${bonus}`, def.color));
      }
      audioManager.playPowerUp('LIFE');
    } else if (p.type === 'NOVA') {
      s.popups.push(ScorePopup.powerUp(p.x, p.y - 24, def.label, def.color));
      s.novaWaves.push(new NovaWave(s.ship.x, s.ship.y, Math.hypot(W, H)));
      s.asteroids.forEach(a => {
        s.particles.push(...Particle.burst(a.x, a.y, 8, a.color, a.size > 30));
        destroyAsteroid(a, { combo: false });
      });
      s.asteroids = [];
      s.ufos.forEach(u => destroyUfo(u, { combo: false }));
      s.ufos = [];
      s.enemyBullets = [];
      shake(14, 24);
      audioManager.playNova();
      versusLinkRef?.current?.sendAttack(3);
    } else {
      s.effects[p.type] = POWERUP.DURATION[p.type];
      s.popups.push(ScorePopup.powerUp(p.x, p.y - 24, def.label, def.color));
      audioManager.playPowerUp(p.type);
    }
    onScoreUpdate(s.score);
  };

  // Tells the HUD which timed effects are running. Only fires when the
  // (coarsely quantised) state changes, so React isn't re-rendered each frame.
  const reportEffects = (force = false) => {
    const s = stateRef.current;
    if (!onPowerUpsUpdate) return;
    const active = Object.entries(s.effects)
      .filter(([, t]) => t > 0)
      .map(([type, t]) => ({ type, remaining: t / POWERUP.DURATION[type] }));
    const key = active.map(e => `${e.type}:${Math.ceil(e.remaining * 20)}`).join('|');
    if (force || key !== s.effectsKey) {
      s.effectsKey = key;
      onPowerUpsUpdate(active);
    }
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
    const prevGameState = prevGameStateRef.current;
    prevGameStateRef.current = gameState;

    if (gameState !== 'playing') {
      cancelAnimationFrame(rafRef.current);
      if (gameState === 'paused') pausedAtRef.current = Date.now();
      return;
    }

    const canvas = canvasRef.current;
    // alpha:false — the playfield is always opaque, so the browser can skip
    // blending the canvas with the page (cheaper, especially on phones)
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!FX.glow) disableGlow(ctx);
    // Drop glow + extra particles once if this device can't hold ~50 fps
    const checkQuality = createQualityMonitor(() => disableGlow(ctx));

    // World size in world units (see fx.js): larger than the screen on phones
    const worldSize = () => {
      const k = worldScale(canvas.width, canvas.height);
      return { k, W: canvas.width / k, H: canvas.height / k };
    };

    if (prevGameState === 'paused') {
      // Resume: keep the run, and don't count paused time toward wave progression
      stateRef.current.startTime += Date.now() - pausedAtRef.current;
      keysRef.current = {};
    } else {
      initState();
      const { W: sw, H: sh } = worldSize();
      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * sw,
        y: Math.random() * sh,
        s: Math.random() * 1.6 + 0.2,
        a: Math.random() * 0.6 + 0.2,
        sp: Math.random() * 0.3 + 0.05,
      }));
    }
    reportEffects(true);
    const stars = starsRef.current;
    lastTimeRef.current = performance.now();

    function update(dt) {
      const s = stateRef.current;
      if (s.dead) return;
      const { W, H } = worldSize();
      if (!W || !H) return;
      const keys = keysRef.current;
      const elapsed = (Date.now() - s.startTime) / 1000;

      s.wave = Math.floor(elapsed / GAME.WAVE_DURATION) + 1;
      const spawnInterval = Math.max(ASTEROID.SPAWN_INTERVAL_MIN, ASTEROID.SPAWN_INTERVAL_BASE - s.wave * 5);
      if (s.wave !== s.reportedWave) {
        s.reportedWave = s.wave;
        onWaveUpdate(s.wave);
      }

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

      // Power-up effect timers
      for (const k in s.effects) {
        if (s.effects[k] > 0) s.effects[k] = Math.max(0, s.effects[k] - dt);
      }
      reportEffects();
      // Slow-mo scales asteroid time only — the ship stays at full speed
      const rockDt = s.effects.SLOW > 0 ? dt * POWERUP.SLOW_FACTOR : dt;

      // Shoot
      if ((keys['Space'] || keys['KeyZ']) && s.ship.canShoot()) {
        const spread = s.effects.SPREAD > 0;
        const offsets = spread ? [-POWERUP.SPREAD_ANGLE, 0, POWERUP.SPREAD_ANGLE] : [0];
        const cooldown = s.effects.RAPID > 0 ? POWERUP.RAPID_COOLDOWN : undefined;
        const shots = s.ship.shoot(offsets, cooldown);
        audioManager.playShoot();
        shots.forEach(bData => {
          s.bullets.push(new Bullet(bData));
          s.particles.push(...Particle.burst(bData.x, bData.y, 4, '#00e5ff', false));
        });
      }
      // Spawn asteroids
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.asteroids.push(Asteroid.spawn(W, H, s.wave));
        s.spawnTimer = spawnInterval + (Math.random() - 0.5) * 10;
      }

      // Versus: asteroids sent by rivals arrive one at a time, in the sender's colour
      const link = versusLinkRef?.current;
      if (link && link.attackQueueRef.current.length > 0) {
        s.attackTimer -= dt;
        if (s.attackTimer <= 0) {
          const a = Asteroid.spawn(W, H, s.wave);
          a.color = link.attackQueueRef.current.shift();
          s.asteroids.push(a);
          s.attackTimer = 22;
        }
      }

      // Update bullets
      s.bullets = s.bullets.filter(b => { b.update(dt, W, H); return b.isAlive(W, H); });

      // Update asteroids
      s.asteroids.forEach(a => a.update(rockDt, W, H));

      // UFOs: one at a time from UFO.FIRST_WAVE, sooner each wave
      if (s.wave >= UFO.FIRST_WAVE && s.ufos.length === 0) {
        s.ufoTimer -= dt;
        if (s.ufoTimer <= 0) {
          s.ufos.push(Ufo.spawn(W, H, s.wave));
          const interval = Math.max(UFO.SPAWN_INTERVAL_MIN,
            UFO.SPAWN_INTERVAL - (s.wave - UFO.FIRST_WAVE) * UFO.SPAWN_RAMP);
          s.ufoTimer = interval * (0.8 + Math.random() * 0.4);
        }
      }
      s.ufos = s.ufos.filter(u => {
        const shot = u.update(rockDt, W, H, s.ship);
        if (shot) { s.enemyBullets.push(shot); audioManager.playUfoShot(); }
        return u.isAlive(W);
      });
      if (s.ufos.length) {
        s.ufoWarble -= dt;
        if (s.ufoWarble <= 0) {
          audioManager.playUfoWarble(s.ufos[0].kind === 'SMALL');
          s.ufoWarble = s.ufos[0].kind === 'SMALL' ? 20 : 28;
        }
      }
      s.enemyBullets = s.enemyBullets.filter(b => { b.update(rockDt, W, H); return b.isAlive(); });

      // Update power-up pickups
      s.powerUps = s.powerUps.filter(p => { p.update(dt, W, H); return p.isAlive(); });

      // Magnet: reel pickups in, faster the closer they get
      if (s.effects.MAGNET > 0) {
        s.powerUps.forEach(p => {
          const dx = s.ship.x - p.x, dy = s.ship.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1 || dist > POWERUP.MAGNET_RADIUS) return;
          const speed = 1.5 + POWERUP.MAGNET_PULL * (1 - dist / POWERUP.MAGNET_RADIUS);
          const step = Math.min(dist, speed * dt);
          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;
        });
      }

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
              destroyAsteroid(a);
              const drop = PowerUp.maybeDrop(a, s.powerUps.length);
              if (drop) s.powerUps.push(drop);
              onScoreUpdate(s.score);
              surviving.push(...Asteroid.split(a));
              hit = true;
            }
          }
        });
        if (!hit) surviving.push(a);
      });
      s.asteroids = surviving;

      // Bullet-UFO collisions
      s.ufos = s.ufos.filter(u => {
        for (let i = 0; i < s.bullets.length; i++) {
          const b = s.bullets[i];
          if (!u.hitsPoint(b.x, b.y, 2)) continue;
          s.bullets.splice(i, 1);
          s.particles.push(...Particle.burst(b.x, b.y, 8, '#e6e8ff', false));
          if (u.hit()) {
            destroyUfo(u);
            onScoreUpdate(s.score);
            return false;
          }
          audioManager.playShieldBlock();
          return true;
        }
        return true;
      });

      // Power-up pickups
      s.powerUps = s.powerUps.filter(p => {
        if (!p.touchesShip(s.ship)) return true;
        collectPowerUp(p, W, H);
        return false;
      });

      // Shield: asteroids that touch the bubble are smashed instead of hurting the ship
      if (s.effects.SHIELD > 0) {
        s.asteroids = s.asteroids.filter(a => {
          if (Math.hypot(a.x - s.ship.x, a.y - s.ship.y) >= a.size + s.ship.radius + 12) return true;
          audioManager.playShieldBlock();
          audioManager.playExplosion();
          s.particles.push(...Particle.burst(a.x, a.y, 12, POWERUP_TYPES.SHIELD.color, a.size > 30));
          destroyAsteroid(a);
          shake(4, 8);
          onScoreUpdate(s.score);
          return false;
        });
      }

      // Shield also eats UFO shots and smashes saucers that ram it
      if (s.effects.SHIELD > 0) {
        const reach = s.ship.radius + 12;
        s.enemyBullets = s.enemyBullets.filter(b => {
          if (Math.hypot(b.x - s.ship.x, b.y - s.ship.y) >= reach) return true;
          audioManager.playShieldBlock();
          s.particles.push(...Particle.burst(b.x, b.y, 6, POWERUP_TYPES.SHIELD.color, false));
          return false;
        });
        s.ufos = s.ufos.filter(u => {
          if (!u.hitsPoint(s.ship.x, s.ship.y, reach)) return true;
          destroyUfo(u);
          onScoreUpdate(s.score);
          return false;
        });
      }

      // Ship hit by an asteroid, a UFO shot, or a UFO itself
      if (!s.ship.isInvincible() && s.effects.SHIELD <= 0) {
        const rammedUfo = s.ufos.find(u => u.hitsPoint(s.ship.x, s.ship.y, s.ship.radius - 4));
        const shotIdx = s.enemyBullets.findIndex(b => b.hitsShip(s.ship));
        if (s.asteroids.some(a => a.hitsShip(s.ship))) {
          hitShip();
        } else if (shotIdx >= 0) {
          s.enemyBullets.splice(shotIdx, 1);
          hitShip();
        } else if (rammedUfo) {
          // Ramming a saucer costs a life but still takes it down
          s.ufos = s.ufos.filter(u => u !== rammedUfo);
          destroyUfo(rammedUfo, { combo: false });
          onScoreUpdate(s.score);
          hitShip();
        }
      }

      // Particles, flashes, shards, popups
      s.particles = s.particles.filter(p => { p.update(dt); return p.isAlive(); });
      s.flashes   = s.flashes.filter(f => { f.update(dt); return f.isAlive(); });
      s.shards    = s.shards.filter(sh => { sh.update(dt); return sh.isAlive(); });
      s.popups    = s.popups.filter(p => { p.update(dt); return p.isAlive(); });
      s.novaWaves = s.novaWaves.filter(n => { n.update(dt); return n.isAlive(); });

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
      const { k, W, H } = worldSize();

      const sx = s.shakeAmt > 0.5 ? (Math.random() - 0.5) * s.shakeAmt : 0;
      const sy = s.shakeAmt > 0.5 ? (Math.random() - 0.5) * s.shakeAmt : 0;
      ctx.save();
      ctx.scale(k, k);          // world units → screen pixels
      ctx.translate(sx, sy);

      // BG
      ctx.fillStyle = '#000';
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Stars
      ctx.fillStyle = '#fff';
      stars.forEach(st => {
        ctx.globalAlpha = st.a;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      });
      ctx.globalAlpha = 1;

      // Impact flashes (behind everything)
      s.flashes.forEach(f => f.draw(ctx));

      // Particles
      s.particles.forEach(p => p.draw(ctx));

      // Asteroids
      s.asteroids.forEach(a => a.draw(ctx));

      // UFOs
      s.ufos.forEach(u => u.draw(ctx));

      // Magnet: dashed tractor beams to every pickup in range + a ring on the ship
      if (s.effects.MAGNET > 0 && !(s.effects.MAGNET < 90 && Math.floor(s.effects.MAGNET / 5) % 2 === 0)) {
        const col = POWERUP_TYPES.MAGNET.color;
        ctx.save();
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -Math.floor(Date.now() / 60) % 10;   // beams march inward
        ctx.globalAlpha = 0.45;
        s.powerUps.forEach(p => {
          if (Math.hypot(p.x - s.ship.x, p.y - s.ship.y) > POWERUP.MAGNET_RADIUS) return;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(s.ship.x, s.ship.y);
          ctx.stroke();
        });
        ctx.globalAlpha = 0.7;
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = Math.floor(Date.now() / 90) % 8;
        ctx.beginPath();
        ctx.arc(s.ship.x, s.ship.y, s.ship.radius + 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Power-up pickups
      s.powerUps.forEach(p => p.draw(ctx));

      // Bullets
      s.bullets.forEach(b => b.draw(ctx));
      s.enemyBullets.forEach(b => b.draw(ctx));

      // Debris shards (above asteroids, below ship)
      s.shards.forEach(sh => sh.draw(ctx));

      // Score popups
      s.popups.forEach(p => p.draw(ctx));

      // Ship
      s.ship.draw(ctx, keysRef.current);
      if (s.effects.SHIELD > 0) {
        s.ship.drawShield(ctx, s.effects.SHIELD, POWERUP_TYPES.SHIELD.color);
      }

      // Nova shockwaves (on top of everything)
      s.novaWaves.forEach(n => n.draw(ctx));

      ctx.restore();

      // Slow-mo: blue tint + CRT scanlines while time is slowed (screen space)
      if (s.effects.SLOW > 0) {
        const SW = canvas.width, SH = canvas.height;
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = POWERUP_TYPES.SLOW.color;
        ctx.fillRect(0, 0, SW, SH);
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#000';
        for (let y = 0; y < SH; y += 4) ctx.fillRect(0, y, SW, 2);
        ctx.restore();
      }
    }

    function loop(ts) {
      const frameMs = ts - lastTimeRef.current;
      const dt = Math.min(frameMs / 16.67, 3);
      lastTimeRef.current = ts;
      checkQuality(frameMs);
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