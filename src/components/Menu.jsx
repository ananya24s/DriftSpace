import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { drawShipGlyph } from '../game/shipGlyph';
import { generateAsteroidPoints, randomAsteroidColor, drawAsteroidGlyph } from '../game/asteroidGlyph';
import { DriftSpaceLogo } from './DriftSpaceLogo';
import { COLORS } from '../game/constants';

const FONT_DISPLAY = "'Space Grotesk', 'Inter', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

// Hero group scale-up (~25%): the ship is drawn slightly larger and
// the DOM hero cluster is enlarged/spaced to match, so the centre of
// attention occupies more of the screen without zooming the world.
const SHIP_SCALE = 1.28;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Memoryless spawn check: independent per event type, no shared
// schedule, no per-object timer bookkeeping needed.
function maybeSpawn(dt, avgSeconds) {
  return Math.random() < dt / avgSeconds;
}

// Turns `current` toward `target` by at most `maxDelta` radians,
// taking the shorter way round — the limited turn rate is what
// produces the ship's natural banked arc rather than a snap.
function turnToward(current, target, maxDelta) {
  const diff = ((target - current + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const clamped = Math.max(-maxDelta, Math.min(maxDelta, diff));
  return current + clamped;
}

function pointInRect(x, y, rect, pad = 0) {
  return x > rect.x - pad && x < rect.x + rect.w + pad && y > rect.y - pad && y < rect.y + rect.h + pad;
}

// Hard, cheap correction: if something drifts into a protected rect
// (menu text, controls), nudge it to the nearest outside edge.
function clampOutsideRect(obj, rect, pad) {
  const left = rect.x - pad, right = rect.x + rect.w + pad;
  const top = rect.y - pad, bottom = rect.y + rect.h + pad;
  if (obj.x > left && obj.x < right && obj.y > top && obj.y < bottom) {
    const dl = obj.x - left, dr = right - obj.x, dt_ = obj.y - top, db = bottom - obj.y;
    const m = Math.min(dl, dr, dt_, db);
    if (m === dl) obj.x = left - 1;
    else if (m === dr) obj.x = right + 1;
    else if (m === dt_) obj.y = top - 1;
    else obj.y = bottom + 1;
  }
}

// Same silhouette/color language as gameplay's Asteroid class (via the
// shared glyph functions), sized and dimmed per depth layer. Count is
// modest — enough that the gameplay color variety (the occasional
// purple/orange from randomAsteroidColor's own distribution) actually
// shows up, while large open regions remain.
function spawnAsteroidField(W, H, contentRect, controlsRect) {
  const depths = [...Array(5).fill('far'), ...Array(4).fill('mid'), ...Array(3).fill('near')];
  const ranges = {
    far: { size: [5, 9], speed: [1, 3], alpha: [0.3, 0.46] },
    mid: { size: [8, 14], speed: [2.5, 5], alpha: [0.5, 0.7] },
    near: { size: [12, 21], speed: [4, 9], alpha: [0.78, 0.98] },
  };
  return depths.map((depth) => {
    const r = ranges[depth];
    let x, y, tries = 0;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
      tries++;
    } while (tries < 10 && (pointInRect(x, y, contentRect, 60) || pointInRect(x, y, controlsRect, 40)));

    const size = rand(r.size[0], r.size[1]);
    return {
      depth, x, y, size,
      vx: (Math.random() < 0.5 ? 1 : -1) * rand(r.speed[0], r.speed[1]),
      vy: (Math.random() < 0.5 ? 1 : -1) * rand(r.speed[0], r.speed[1]) * 0.35,
      rot: rand(0, Math.PI * 2),
      rotV: (Math.random() < 0.5 ? 1 : -1) * rand(0.03, 0.16),
      color: randomAsteroidColor(),
      alpha: rand(r.alpha[0], r.alpha[1]),
      pts: generateAsteroidPoints(size),
    };
  });
}

function spawnWreckage(W, H) {
  const fromLeft = Math.random() < 0.5;
  return {
    x: fromLeft ? -60 : W + 60,
    y: rand(H * 0.1, H * 0.85),
    vx: (fromLeft ? 1 : -1) * rand(6, 13),
    vy: rand(-2, 2),
    rot: rand(0, Math.PI * 2),
    rotSpeed: (Math.random() < 0.5 ? 1 : -1) * rand(0.15, 0.4),
    alpha: rand(0.2, 0.34),
    life: 1,
    maxLife: rand(90, 150),
  };
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes ds-launch-pulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
    `}</style>
  );
}

const CONTROLS = [
  ['WASD', 'Navigate'],
  ['SPACE', 'Fire'],
  ['P', 'Pause'],
  ['R', 'Retry'],
];

/* ============================================================
   MENU — a single running scene, not a static composition.
   Asteroids are drawn with the exact same drawAsteroidGlyph()
   gameplay uses, and the ship with the exact same drawShipGlyph(),
   so there is no visual seam between the title screen and the
   moment Launch fires.
   ============================================================ */
export function Menu({ onStart, onLeaderboard }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const worldRef = useRef(null);
  const hoveredRef = useRef(false);
  const launchStartRef = useRef(null);
  const launchOriginRef = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);
  const inputLockedRef = useRef(false);
  const onStartRef = useRef(onStart);

  const [launching, setLaunching] = useState(false);
  const [launchHover, setLaunchHover] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = !!prefersReducedMotion;

    function buildWorld() {
      const W = canvas.width, H = canvas.height;

      const makeStars = (count, sizeRange, alphaRange, speed) =>
        Array.from({ length: count }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          size: rand(sizeRange[0], sizeRange[1]),
          baseAlpha: rand(alphaRange[0], alphaRange[1]),
          twinklePhase: rand(0, Math.PI * 2),
          twinkleSpeed: rand(0.5, 1.7),
          speed,
          vy: rand(-0.4, 0.4) * (speed * 0.05),
        }));

      const dust = Array.from({ length: 30 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        size: rand(0.4, 1.3), alpha: rand(0.06, 0.2),
        vx: rand(-4, -1), vy: rand(-0.5, 0.5),
      })).concat(
        Array.from({ length: 4 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          size: rand(1.6, 2.4), alpha: rand(0.05, 0.11),
          vx: rand(-1.1, -0.3), vy: rand(-0.15, 0.15),
        }))
      );

      const nebula = [0, 1].map((i) => {
        const r = rand(Math.min(W, H) * 0.32, Math.min(W, H) * 0.5);
        const x = i === 0 ? rand(W * 0.55, W * 0.95) : rand(W * 0.05, W * 0.35);
        const y = i === 0 ? rand(H * 0.05, H * 0.35) : rand(H * 0.55, H * 0.92);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(0,150,180,0.045)');
        grad.addColorStop(1, 'rgba(0,150,180,0)');
        return { x, y, r, gradient: grad, phase: rand(0, Math.PI * 2) };
      });

      const vignette = ctx.createRadialGradient(
        W / 2, H / 2, Math.min(W, H) * 0.4,
        W / 2, H / 2, Math.max(W, H) * 0.75
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.32)');

      // Protected rects — enlarged to match the bigger hero cluster.
      const contentRect = { x: W * 0.30 + 20, y: H * 0.50 - 120, w: 520, h: 340 };
      const controlsRect = { x: 8, y: H - 92, w: 400, h: 82 };

      // Hero zone: where the ship travels. Slightly larger patch of sky
      // to match the increased hero presence, still left of the text.
      const heroZone = { xMin: W * 0.05, xMax: W * 0.28, yMin: H * 0.16, yMax: H * 0.64 };
      const heroCenter = { x: (heroZone.xMin + heroZone.xMax) / 2, y: (heroZone.yMin + heroZone.yMax) / 2 };

      worldRef.current = {
        starsFar: makeStars(90, [0.6, 1.2], [0.12, 0.32], 3),
        starsMid: makeStars(45, [1, 1.9], [0.22, 0.52], 7),
        starsNear: makeStars(18, [1.4, 2.6], [0.38, 0.8], 14),
        dust,
        nebula,
        vignette,
        contentRect,
        controlsRect,
        heroZone,
        heroCenter,
        asteroids: spawnAsteroidField(W, H, contentRect, controlsRect),
        wreckage: null,
        camera: { x: 0, y: 0 },
        ship: {
          x: heroCenter.x, y: heroCenter.y,
          angle: -Math.PI / 2, vx: 0, vy: 0,
          speed: rand(14, 24),
          scale: 1, warp: 0, thrusting: false, intensity: 1,
          navState: 'pause',
          waypoint: { x: heroCenter.x, y: heroCenter.y },
          stateTimer: rand(1, 2.4),
          pausePuffTimer: rand(1, 2.4),
          pausePuffUntil: 0,
        },
      };
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildWorld();
    }

    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();

    function updateShipNavigation(ship, w, t, dt) {
      const zone = w.heroZone;
      const TURN_RATE = 1.0;
      const ARRIVE_DIST = 10;

      if (ship.navState === 'travel') {
        const desiredAngle = Math.atan2(ship.waypoint.y - ship.y, ship.waypoint.x - ship.x);
        ship.angle = turnToward(ship.angle, desiredAngle, TURN_RATE * dt);
        ship.vx = Math.cos(ship.angle) * ship.speed;
        ship.vy = Math.sin(ship.angle) * ship.speed;
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.thrusting = true;

        ship.x = Math.max(zone.xMin, Math.min(zone.xMax, ship.x));
        ship.y = Math.max(zone.yMin, Math.min(zone.yMax, ship.y));

        const dist = Math.hypot(ship.waypoint.x - ship.x, ship.waypoint.y - ship.y);
        if (dist < ARRIVE_DIST) {
          ship.navState = 'coast';
          ship.stateTimer = rand(0.6, 1.3);
        }
      } else if (ship.navState === 'coast') {
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.vx *= Math.pow(0.05, dt);
        ship.vy *= Math.pow(0.05, dt);
        ship.x = Math.max(zone.xMin, Math.min(zone.xMax, ship.x));
        ship.y = Math.max(zone.yMin, Math.min(zone.yMax, ship.y));
        ship.thrusting = false;
        ship.stateTimer -= dt;
        if (ship.stateTimer <= 0) {
          ship.navState = 'pause';
          ship.stateTimer = rand(1.4, 4.6);
          ship.pausePuffTimer = rand(1, 2.4);
          ship.pausePuffUntil = 0;
        }
      } else {
        ship.thrusting = false;
        ship.stateTimer -= dt;
        ship.pausePuffTimer -= dt;
        if (ship.pausePuffTimer <= 0) {
          ship.pausePuffUntil = t + rand(0.1, 0.22);
          ship.pausePuffTimer = rand(1.5, 3);
        }
        if (t < ship.pausePuffUntil) ship.thrusting = true;

        if (ship.stateTimer <= 0) {
          let wx, wy, tries = 0;
          do {
            wx = rand(zone.xMin, zone.xMax);
            wy = rand(zone.yMin, zone.yMax);
            tries++;
          } while (tries < 4 && Math.hypot(wx - ship.x, wy - ship.y) < 50);
          ship.waypoint = { x: wx, y: wy };
          ship.speed = rand(14, 24);
          ship.navState = 'travel';
        }
      }

      if (hoveredRef.current) ship.thrusting = true;
      ship.intensity = hoveredRef.current ? 1.2 : 1;
    }

    function update(t, dt) {
      const w = worldRef.current;
      if (!w) return;
      const W = canvas.width, H = canvas.height;

      if (!reduceMotion) {
        [w.starsFar, w.starsMid, w.starsNear].forEach((list) => {
          list.forEach((s) => {
            s.x -= s.speed * dt * 3;
            s.y += s.vy * dt * 3;
            if (s.x < -4) s.x = W + 4;
            if (s.y < -4) s.y = H + 4;
            if (s.y > H + 4) s.y = -4;
          });
        });

        w.dust.forEach((d) => {
          d.x += d.vx * dt * 6;
          d.y += d.vy * dt * 6;
          if (d.x < -4) d.x = W + 4;
          if (d.x > W + 4) d.x = -4;
          if (d.y < -4) d.y = H + 4;
          if (d.y > H + 4) d.y = -4;
        });

        w.asteroids.forEach((a) => {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          a.rot += a.rotV * dt;
          if (a.x < -80) a.x = W + 80;
          if (a.x > W + 80) a.x = -80;
          if (a.y < -80) a.y = H + 80;
          if (a.y > H + 80) a.y = -80;
          clampOutsideRect(a, w.contentRect, a.size + 10);
          clampOutsideRect(a, w.controlsRect, a.size + 10);
        });

        if (!w.wreckage && maybeSpawn(dt, 130)) {
          w.wreckage = spawnWreckage(W, H);
        } else if (w.wreckage) {
          const wr = w.wreckage;
          wr.x += wr.vx * dt;
          wr.y += wr.vy * dt;
          wr.rot += wr.rotSpeed * dt;
          wr.life -= dt / wr.maxLife;
          clampOutsideRect(wr, w.contentRect, 40);
          clampOutsideRect(wr, w.controlsRect, 40);
          if (wr.life <= 0 || wr.x < -100 || wr.x > W + 100) w.wreckage = null;
        }
      }

      const ship = w.ship;
      if (launchStartRef.current == null) {
        if (reduceMotion) {
          ship.x = w.heroCenter.x;
          ship.y = w.heroCenter.y;
          ship.angle = -Math.PI / 2;
          ship.thrusting = hoveredRef.current;
          ship.intensity = 1;
        } else {
          updateShipNavigation(ship, w, t, dt);
        }
        ship.scale = 1;
        ship.warp = 0;
      } else {
        const duration = reduceMotion ? 0.18 : 0.65;
        const elapsed = t - launchStartRef.current;
        const p = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);

        ship.x = launchOriginRef.current.x + Math.cos(ship.angle) * ease * 20;
        ship.y = launchOriginRef.current.y + Math.sin(ship.angle) * ease * 20;
        ship.thrusting = true;
        ship.intensity = 1 + ease * (reduceMotion ? 0.6 : 2.2);
        ship.scale = 1 + ease * 0.08;
        ship.warp = reduceMotion ? 0 : ease;

        if (p >= 1 && !firedRef.current) {
          firedRef.current = true;
          onStartRef.current();
        }
      }

      if (!reduceMotion) {
        const cam = w.camera;
        const desiredCamX = Math.max(-14, Math.min(14, ship.vx * 0.5));
        const desiredCamY = Math.max(-10, Math.min(10, ship.vy * 0.5));
        cam.x += (desiredCamX - cam.x) * Math.min(dt * 0.6, 1);
        cam.y += (desiredCamY - cam.y) * Math.min(dt * 0.6, 1);
      }
    }

    function drawStarLayer(list) {
      const w = worldRef.current;
      const ship = w.ship;
      list.forEach((s) => {
        const twinkle = reduceMotion
          ? s.baseAlpha
          : s.baseAlpha + Math.sin(performance.now() / 1000 * s.twinkleSpeed + s.twinklePhase) * s.baseAlpha * 0.5;
        const alpha = Math.max(twinkle, 0.05);

        if (ship.warp > 0.02) {
          const dx = -Math.cos(ship.angle);
          const dy = -Math.sin(ship.angle);
          const len = ship.warp * s.speed * 22;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + dx * len, s.y + dy * len);
          ctx.stroke();
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#fff';
          ctx.fillRect(s.x, s.y, s.size, s.size);
          ctx.globalAlpha = 1;
        }
      });
    }

    function drawAsteroid(a) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      drawAsteroidGlyph(ctx, { pts: a.pts, color: a.color, size: a.size, alpha: a.alpha });
      ctx.restore();
    }

    function drawWreckage(wr) {
      ctx.save();
      ctx.translate(wr.x, wr.y);
      ctx.rotate(wr.rot);
      ctx.strokeStyle = `rgba(150,160,180,${wr.alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -2.5, 14, 5);
      ctx.save();
      ctx.translate(6, -1);
      ctx.rotate(0.6);
      ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-14, -4);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      const w = worldRef.current;
      if (!w) return;
      const W = canvas.width, H = canvas.height;
      const cam = w.camera;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030408';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(cam.x * 0.15, cam.y * 0.15);
      w.nebula.forEach((n) => {
        ctx.globalAlpha = reduceMotion ? 0.8 : 0.6 + Math.sin(performance.now() / 1000 * 0.035 + n.phase) * 0.3;
        ctx.fillStyle = n.gradient;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.save();
      ctx.translate(cam.x * 0.3, cam.y * 0.3);
      drawStarLayer(w.starsFar);
      w.asteroids.filter((a) => a.depth === 'far').forEach(drawAsteroid);
      ctx.restore();

      ctx.save();
      ctx.translate(cam.x * 0.6, cam.y * 0.6);
      drawStarLayer(w.starsMid);
      w.asteroids.filter((a) => a.depth === 'mid').forEach(drawAsteroid);
      if (w.wreckage) drawWreckage(w.wreckage);
      ctx.restore();

      ctx.save();
      ctx.translate(cam.x, cam.y);
      w.dust.forEach((d) => {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = '#fff';
        ctx.fillRect(d.x, d.y, d.size, d.size);
      });
      ctx.globalAlpha = 1;
      drawStarLayer(w.starsNear);
      w.asteroids.filter((a) => a.depth === 'near').forEach(drawAsteroid);
      ctx.restore();

      ctx.fillStyle = w.vignette;
      ctx.fillRect(0, 0, W, H);

      const ship = w.ship;
      ctx.save();
      ctx.translate(ship.x + cam.x, ship.y + cam.y);
      ctx.rotate(ship.angle);
      ctx.scale(ship.scale * SHIP_SCALE, ship.scale * SHIP_SCALE);
      drawShipGlyph(ctx, { thrusting: ship.thrusting, intensity: ship.intensity });
      ctx.restore();
    }

    function step(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(now / 1000, dt);
      draw();
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [prefersReducedMotion]);

  const handleLaunch = useCallback(() => {
    if (inputLockedRef.current) return;
    inputLockedRef.current = true;
    setLaunching(true);
    const w = worldRef.current;
    if (w) launchOriginRef.current = { x: w.ship.x, y: w.ship.y };
    launchStartRef.current = performance.now() / 1000;
  }, []);

  const handleLeaderboard = useCallback(() => {
    if (inputLockedRef.current) return;
    onLeaderboard();
  }, [onLeaderboard]);

  return (
    <div style={styles.screen}>
      <GlobalStyle />
      <canvas ref={canvasRef} style={styles.canvas} />

      <div style={styles.content}>
        <div style={styles.logoWrap}>
          <DriftSpaceLogo height={84} />
        </div>

        <button
          style={{
            ...styles.launch,
            color: launching ? 'rgba(238,242,248,0.4)' : launchHover ? '#eef2f8' : COLORS.SHIP,
            textShadow: launchHover && !launching
              ? '0 0 24px rgba(0,229,255,0.65), 0 0 48px rgba(0,229,255,0.35)'
              : '0 0 18px rgba(0,229,255,0.35)',
          }}
          onMouseEnter={() => { hoveredRef.current = true; setLaunchHover(true); }}
          onMouseLeave={() => { hoveredRef.current = false; setLaunchHover(false); }}
          onClick={handleLaunch}
          disabled={launching}
        >
          <span
            style={{
              ...styles.launchMark,
              transform: launchHover ? 'translateX(6px)' : 'translateX(0)',
              opacity: launching ? 0.4 : 1,
            }}
          >
            ›
          </span>
          <span style={styles.launchWord}>Launch</span>
          <span
            style={{
              ...styles.launchUnderline,
              transform: launchHover ? 'scaleX(1)' : 'scaleX(0.4)',
              opacity: launchHover ? 1 : 0.5,
            }}
          />
        </button>

        <button
          style={{ ...styles.leaderboard, opacity: launching ? 0.25 : 1 }}
          onClick={handleLeaderboard}
          disabled={launching}
        >
          Leaderboard
        </button>

        <div style={styles.controlsStrip}>
          {CONTROLS.map(([key, label], i) => (
            <span key={key} style={styles.controlItem}>
              <span style={styles.controlKey}>{key}</span>
              <span style={styles.controlLabel}>{label}</span>
              {i < CONTROLS.length - 1 && <span style={styles.controlDot}>·</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAUSE SCREEN — unchanged presentation.
   ============================================================ */
function PillButton({ children, onClick, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  return (
    <motion.button
      onClick={onClick}
      whileHover={
        isPrimary
          ? { scale: 1.04, boxShadow: '0 0 0 1px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.3)' }
          : { color: '#eef2f8' }
      }
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      style={isPrimary ? styles.pillPrimary : styles.pillGhost}
    >
      {children}
    </motion.button>
  );
}

export function PauseScreen({ onResume, onQuit }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      style={styles.pauseOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <GlobalStyle />
      <motion.div
        style={styles.pauseContent}
        initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={styles.pauseTitle}>Paused</div>
        <div style={styles.pillRow}>
          <PillButton variant="primary" onClick={onResume}>Resume</PillButton>
          <PillButton variant="ghost" onClick={onQuit}>Quit to Menu</PillButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
   LEADERBOARD SCREEN — untouched, out of scope for this redesign.
   ============================================================ */
const legacy = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Courier New, monospace',
  },
  btnGhost: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.5)', fontFamily: 'Courier New, monospace',
    fontSize: 11, letterSpacing: 4, padding: '10px 28px', cursor: 'pointer', margin: 6,
  },
};

export function LeaderboardScreen({ scores, onBack }) {
  return (
    <div style={legacy.screen}>
      <div style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(0,229,255,0.5)', marginBottom: 32 }}>
        TOP PILOTS
      </div>
      <div style={{
        border: '1px solid rgba(0,229,255,0.15)', padding: '20px 40px', minWidth: 280,
      }}>
        {(scores.length ? scores : Array(5).fill(0)).slice(0, 8).map((sc, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'Courier New, monospace', fontSize: 13,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', width: 24 }}>{i + 1}.</span>
            <span style={{ color: '#fff' }}>{sc.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <button style={{ ...legacy.btnGhost, marginTop: 24 }} onClick={onBack}>BACK</button>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const styles = {
  screen: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    overflow: 'hidden', background: '#030408', fontFamily: FONT_BODY,
  },
  canvas: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'block',
  },

  // Hero cluster: enlarged and given more internal breathing room so
  // the centre of attention occupies more of the screen.
  content: {
    position: 'absolute',
    left: 'calc(30% + 40px)', top: 'calc(50% - 24px)', transform: 'translateY(-4%)',
    zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    maxWidth: 'min(84vw, 440px)',
  },
  logoWrap: { marginBottom: 40, marginLeft: -4 },
  callsign: {
    fontFamily: FONT_MONO, fontSize: 14, letterSpacing: 4,
    color: 'rgba(0,229,255,0.75)', marginBottom: 26, textTransform: 'uppercase',
  },
  // Launch as a primary in-world action: large display type, a
  // leading chevron, a persistent soft glow that intensifies on hover,
  // and an animated underline "charge" — no card, border, or fill.
  launch: {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'none', border: 'none',
    fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: 3,
    padding: '6px 2px 12px', cursor: 'pointer', transition: 'color 0.15s ease, text-shadow 0.2s ease',
  },
  launchMark: { fontSize: 30, transition: 'transform 0.22s ease, opacity 0.15s ease' },
  launchWord: { position: 'relative', zIndex: 1 },
  launchUnderline: {
    position: 'absolute', left: 2, right: 2, bottom: 2, height: 2,
    background: 'linear-gradient(90deg, rgba(0,229,255,0.9), rgba(0,229,255,0))',
    transformOrigin: 'left center',
    transition: 'transform 0.28s ease, opacity 0.2s ease',
  },
  leaderboard: {
    marginTop: 26,
    background: 'none', border: 'none',
    color: 'rgba(238,242,248,0.42)',
    fontFamily: FONT_BODY, fontWeight: 500, fontSize: 13, letterSpacing: 2.5,
    textTransform: 'uppercase', padding: '2px', cursor: 'pointer',
    transition: 'opacity 0.15s ease, color 0.15s ease',
  },

  // Controls: larger and a touch higher-contrast, still quiet.
  controlsStrip: {
    position: 'fixed', left: 'clamp(24px, 4vw, 48px)', bottom: 'clamp(24px, 4vh, 42px)',
    display: 'flex', flexWrap: 'wrap', gap: 12, rowGap: 8,
  },
  controlItem: { display: 'flex', alignItems: 'center', gap: 10 },
  controlKey: { fontFamily: FONT_MONO, fontSize: 12.5, color: 'rgba(0,229,255,0.72)', letterSpacing: 1 },
  controlLabel: { fontFamily: FONT_BODY, fontSize: 12.5, color: 'rgba(238,242,248,0.42)', letterSpacing: 0.5 },
  controlDot: { color: 'rgba(255,255,255,0.2)', fontSize: 12, marginLeft: 2 },

  /* -- pause screen (unchanged) -- */
  pauseOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(4,5,10,0.74)', backdropFilter: 'blur(3px)',
  },
  pauseContent: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  pauseTitle: {
    fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 28, letterSpacing: 6,
    color: '#eef2f8', marginBottom: 32, textTransform: 'uppercase',
  },
  pillRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  pillPrimary: {
    background: 'linear-gradient(180deg, rgba(0,229,255,0.14), rgba(0,229,255,0.05))',
    border: '1px solid rgba(0,229,255,0.45)',
    color: '#eef2f8',
    fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, letterSpacing: 3,
    padding: '15px 52px', borderRadius: 999, cursor: 'pointer',
  },
  pillGhost: {
    background: 'transparent', border: 'none',
    color: 'rgba(238,242,248,0.6)',
    fontFamily: FONT_BODY, fontWeight: 500, fontSize: 12, letterSpacing: 3,
    textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer',
  },
};