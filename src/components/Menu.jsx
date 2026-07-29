import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { drawShipGlyph } from '../game/shipGlyph';
import { generateAsteroidPoints, randomAsteroidColor, drawAsteroidGlyph } from '../game/asteroidGlyph';
import { DriftSpaceLogo } from './DriftSpaceLogo';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { COLORS } from '../game/constants';
import audioManager from '../assets/audio/AudioManager';
import { AudioToggle } from './AudioToggle';

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
  // Match gameplay size distribution: tiny fragments up to large chunks.
  // One 'hero' large rock per field gives the scene a visual anchor.
  const depths = [
    ...Array(7).fill('far'),   // small, dim, slow
    ...Array(6).fill('mid'),   // medium
    ...Array(4).fill('near'),  // larger, brighter, faster
    ...Array(2).fill('hero'),  // large slow background anchors
  ];
  const ranges = {
    far:  { size: [6,  13], speed: [0.8, 2.5], alpha: [0.25, 0.42] },
    mid:  { size: [13, 24], speed: [2,   4.5], alpha: [0.48, 0.68] },
    near: { size: [22, 36], speed: [3.5, 7],   alpha: [0.72, 0.95] },
    hero: { size: [32, 44], speed: [0.4, 1.2], alpha: [0.28, 0.42] },
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
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      /* ── Border sweep: the 1px cyan border gets its own specular pass,
         separate from the text sweep so the box feels like a physical
         lit panel rather than just a styled <div>. ───────────────────── */
      @keyframes ds-border-sweep {
        0%   { border-color: rgba(0,229,255,0.35); box-shadow: 0 0 10px rgba(0,229,255,0.12) inset, 0 0 10px rgba(0,229,255,0.08); }
        45%  { border-color: rgba(0,229,255,0.9);  box-shadow: 0 0 22px rgba(0,229,255,0.28) inset, 0 0 22px rgba(0,229,255,0.22); }
        55%  { border-color: rgba(0,229,255,0.9);  box-shadow: 0 0 22px rgba(0,229,255,0.28) inset, 0 0 22px rgba(0,229,255,0.22); }
        100% { border-color: rgba(0,229,255,0.35); box-shadow: 0 0 10px rgba(0,229,255,0.12) inset, 0 0 10px rgba(0,229,255,0.08); }
      }

            /* ── Press Start 2P arcade LAUNCH animations ────────────────── */

      /* Breath: the whole word idles with a gentle slow dim-and-return,
         suggesting standby. Depth changes to 4% scale on hover
         via inline style; this keyframe handles idle-only opacity. */
      @keyframes ds-px-breath {
        0%, 100% { opacity: 0.72; }
        50%      { opacity: 1; }
      }

      /* Sweep: a single bright specular band travels across the face
         of the word, like a CRT stripe or scoreboard cycling.
         Background-position drives it; the band is a narrow highlight
         inside the background gradient.
         Idle: one pass every 5s with a long rest after.
         Hover: one pass every 1.6s, no rest — rapid cycling. */
      @keyframes ds-px-sweep-idle {
        0%   { background-position: 240% center; }
        48%  { background-position: -60% center; }
        100% { background-position: -60% center; }
      }
      @keyframes ds-px-sweep-hover {
        0%   { background-position: 240% center; }
        100% { background-position: -60% center; }
      }
    `}</style>
  );
}

const CONTROLS = [
  ['W',     'Thrust'],
  ['S',     'Reverse'],
  ['A / D', 'Turn'],
  ['SPACE', 'Fire'],
  ['P',     'Pause'],
  ['R',     'Retry'],
];

/* ============================================================
   MENU — a single running scene, not a static composition.
   Asteroids are drawn with the exact same drawAsteroidGlyph()
   gameplay uses, and the ship with the exact same drawShipGlyph(),
   so there is no visual seam between the title screen and the
   moment Launch fires.
   ============================================================ */

/* ============================================================
   AUDIO TOGGLE — top-right corner, minimal SVG speaker icon.
   Reads initial state from audioManager.muted (which itself
   reads localStorage on construction), so the icon is correct
   on first render with no flash.
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
  const [markFlaring, setMarkFlaring] = useState(false);
  const [markBobbing, setMarkBobbing] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const markFlareTimerRef = useRef(null);
  const markFlareRef = useRef(false); // tracks flare state for canvas sync

  // Global leaderboard data for the ticker
  const { scores: lbScores, load: lbLoad } = useLeaderboard();
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerVisible, setTickerVisible] = useState(true);

  const prefersReducedMotion = useReducedMotion();

  // Fetch global scores once on mount for the ticker
  useEffect(() => { lbLoad(); }, [lbLoad]);

  // Cycle ticker entries every 3.5s with a fade transition
  useEffect(() => {
    if (lbScores.length < 2) return;
    const interval = setInterval(() => {
      setTickerVisible(false);
      setTimeout(() => {
        setTickerIdx(i => (i + 1) % Math.min(lbScores.length, 10));
        setTickerVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, [lbScores]);

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
      const contentRect = { x: W * 0.02, y: H * 0.25, w: W * 0.96, h: H * 0.50 };
      const controlsRect = { x: 8, y: H - 92, w: 400, h: 82 };

      // Hero zone: where the ship travels. Slightly larger patch of sky
      // to match the increased hero presence, still left of the text.
      const heroZone = { xMin: W * 0.03, xMax: W * 0.16, yMin: H * 0.08, yMax: H * 0.42 };
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

  // Trigger a mark flare: brightens the ship-A glow for 600ms, and
  // simultaneously bumps the canvas ship's engine intensity so the
  // A and the drifting ship feel like the same craft responding.
  const triggerMarkFlare = useCallback((force = false) => {
    if (markFlareRef.current && !force) return; // already flaring, skip timer-only
    markFlareRef.current = true;
    // Bob first (thruster fires → ship nudges up), then glow flare
    setMarkBobbing(true);
    setTimeout(() => setMarkBobbing(false), 600);
    setTimeout(() => {
      setMarkFlaring(true);
      // Burst-thrust the canvas ship so its engine flicker visibly fires
      if (worldRef.current) {
        worldRef.current.ship.intensity = 2.4;
        worldRef.current.ship.thrusting = true;
      }
    }, 60);
    clearTimeout(markFlareTimerRef.current);
    markFlareTimerRef.current = setTimeout(() => {
      markFlareRef.current = false;
      setMarkFlaring(false);
      // Return ship to its normal nav-driven thrusting state
      if (worldRef.current) {
        worldRef.current.ship.intensity = 1;
        worldRef.current.ship.thrusting = false;
      }
    }, 700);
  }, []);

  // Schedule rare autonomous flares (every 8–14s, randomised)
  useEffect(() => {
    if (prefersReducedMotion) return;
    let timer;
    const schedule = () => {
      const delay = 8000 + Math.random() * 6000;
      timer = setTimeout(() => { triggerMarkFlare(); schedule(); }, delay);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(markFlareTimerRef.current); };
  }, [triggerMarkFlare, prefersReducedMotion]);

  return (
    <div style={styles.screen}>
      <GlobalStyle />
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Audio toggle — fixed top-right, z above everything */}
      <div style={{
        position: 'fixed', top: 'clamp(16px, 2.5vh, 28px)',
        right: 'clamp(16px, 2.5vw, 32px)', zIndex: 20,
      }}>
        <AudioToggle />
      </div>

      <div style={styles.content}>
        <div
          style={{ ...styles.logoWrap, pointerEvents: 'all' }}
          onMouseEnter={() => { setLogoHovered(true); triggerMarkFlare(true); }}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <DriftSpaceLogo
            height={130}
            style={{ width: 'clamp(360px, 96vw, 1280px)', height: 'auto', cursor: 'default' }}
            markFlaring={markFlaring}
            markBobbing={markBobbing}
          />
        </div>

        <button
          style={{
            ...styles.launchBtn,
            opacity: launching ? 0.45 : 1,
            // Hover: border brightens and inner glow intensifies
            borderColor: launchHover && !launching
              ? 'rgba(0,229,255,0.92)'
              : undefined,
            boxShadow: launchHover && !launching
              ? '0 0 28px rgba(0,229,255,0.32) inset, 0 0 32px rgba(0,229,255,0.28), 0 0 64px rgba(0,229,255,0.12)'
              : undefined,
            animation: prefersReducedMotion || launchHover || launching
              ? 'none'
              : 'ds-border-sweep 5s ease-in-out infinite',
          }}
          onMouseEnter={() => { hoveredRef.current = true; setLaunchHover(true); }}
          onMouseLeave={() => { hoveredRef.current = false; setLaunchHover(false); }}
          onClick={handleLaunch}
          disabled={launching}
        >
          <span
            style={{
              ...styles.launchText,
              animation: prefersReducedMotion
                ? 'none'
                : launchHover && !launching
                  ? 'ds-px-sweep-hover 1.6s linear infinite'
                  : 'ds-px-sweep-idle 5s linear infinite, ds-px-breath 2.6s ease-in-out infinite',
              filter: launchHover && !launching
                ? 'drop-shadow(0 0 14px rgba(0,229,255,1)) drop-shadow(0 0 36px rgba(0,229,255,0.5))'
                : 'drop-shadow(0 0 8px rgba(0,229,255,0.55))',
              opacity: launchHover && !launching ? 1 : undefined,
            }}
          >
            LAUNCH
          </span>
        </button>

        {/* Arcade ticker — cycles through global top scores.
             Clicking opens the full leaderboard. */}
        <button
          style={{ ...styles.ticker, opacity: launching ? 0.25 : 1 }}
          onClick={handleLeaderboard}
          disabled={launching}
        >
          <span style={styles.tickerLabel}>PILOTS</span>
          <span style={styles.tickerSep}>·</span>
          <span
            style={{
              ...styles.tickerEntry,
              opacity: tickerVisible ? 1 : 0,
              transform: tickerVisible ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {lbScores.length > 0
              ? `${lbScores[tickerIdx]?.name ?? '—'}  ${(lbScores[tickerIdx]?.score ?? 0).toLocaleString()}`
              : '· SCANNING DEEP SPACE ·'}
          </span>
          <span style={styles.tickerArrow}>›</span>
        </button>

      </div>

      {/* Controls HUD — fixed bottom-left, outside the centered stack */}
      <div style={styles.controlsStrip}>
        {CONTROLS.map(([key, label], i) => (
          <span key={key} style={styles.controlItem}>
            <span style={styles.controlKeyCap}>{key}</span>
            <span style={styles.controlLabel}>{label}</span>
            {i < CONTROLS.length - 1 && <span style={styles.controlSep} />}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAUSE SCREEN — redesigned to match game visual identity.
   ============================================================ */
function PauseBtn({ children, onClick, primary }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: primary
          ? hov ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.04)'
          : 'transparent',
        border: primary
          ? `1px solid ${hov ? 'rgba(0,229,255,0.85)' : 'rgba(0,229,255,0.45)'}`
          : 'none',
        color: primary
          ? hov ? '#fff' : '#00e5ff'
          : hov ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: primary ? 11 : 8,
        letterSpacing: primary ? 4 : 3,
        padding: primary ? '16px 48px 14px' : '8px 4px',
        cursor: 'pointer', borderRadius: primary ? 2 : 0,
        boxShadow: primary && hov
          ? '0 0 20px rgba(0,229,255,0.22), 0 0 40px rgba(0,229,255,0.1)'
          : 'none',
        transition: 'all 0.18s ease',
      }}
    >
      {children}
    </button>
  );
}

export function PauseScreen({ onResume, onQuit }) {
  const reduceMotion = useReducedMotion();
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 40); return () => clearTimeout(t); }, []);

  return (
    <div style={styles.pauseOverlay}>
      <GlobalStyle />
      <div style={{
        ...styles.pauseContent,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(10px)',
        transition: reduceMotion ? 'none' : 'opacity 0.3s ease, transform 0.3s ease',
      }}>
        <div style={styles.pauseTitle}>PAUSED</div>
        <div style={styles.pauseDivider} />
        <div style={styles.pillRow}>
          <PauseBtn primary onClick={onResume}>RESUME</PauseBtn>
          <PauseBtn onClick={onQuit}>QUIT TO MENU</PauseBtn>
        </div>
        <div style={styles.pauseHint}>[ P ] to resume</div>
      </div>
    </div>
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
    left: '50%', top: '52%', transform: 'translate(-50%, -50%)',
    zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: 'min(92vw, 1060px)',
  },
  logoWrap: { marginBottom: 36 },
  callsign: {
    fontFamily: FONT_MONO, fontSize: 14, letterSpacing: 4,
    color: 'rgba(0,229,255,0.75)', marginBottom: 26, textTransform: 'uppercase',
  },
  // Arcade cabinet box: 1px cyan border, dark inner tint, no fill.
  // The border gets its own sweep animation (ds-border-sweep) so the
  // box reads as a lit physical panel, not a CSS styled div.
  launchBtn: {
    background: 'rgba(0,229,255,0.04)',
    border: '1px solid rgba(0,229,255,0.35)',
    borderRadius: 2,
    padding: '18px 52px 16px',
    margin: 0, cursor: 'pointer', lineHeight: 1,
    transition: 'border-color 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease',
    // Initial inset shadow gives depth without paint
    boxShadow: '0 0 10px rgba(0,229,255,0.12) inset, 0 0 10px rgba(0,229,255,0.08)',
  },
  launchText: {
    display: 'inline-block',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 28,
    letterSpacing: 10,
    textTransform: 'uppercase',
    backgroundImage: [
      'linear-gradient(',
      '100deg,',
      '#00b8d9 0%,',
      '#00d4f0 28%,',
      '#d4f8ff 48%,',
      '#ffffff 50%,',
      '#d4f8ff 52%,',
      '#00d4f0 72%,',
      '#00b8d9 100%)',
    ].join(''),
    backgroundSize: '320% 100%',
    backgroundPosition: '-60% center',
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
    color: 'transparent', WebkitTextFillColor: 'transparent',
    transition: 'filter 0.28s ease, opacity 0.28s ease',
  },
  ticker: {
    marginTop: 28,
    background: 'rgba(0,229,255,0.03)',
    border: '1px solid rgba(0,229,255,0.18)',
    borderRadius: 2,
    padding: '10px 18px',
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background 0.2s ease, opacity 0.15s ease',
    ':hover': { borderColor: 'rgba(0,229,255,0.45)' },
  },
  tickerLabel: {
    fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 3,
    color: 'rgba(0,229,255,0.55)', textTransform: 'uppercase', flexShrink: 0,
  },
  tickerSep: {
    color: 'rgba(0,229,255,0.25)', fontSize: 10, flexShrink: 0,
  },
  tickerEntry: {
    fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2,
    color: 'rgba(238,242,248,0.75)', textTransform: 'uppercase',
    transition: 'opacity 0.35s ease, transform 0.35s ease',
    flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tickerArrow: {
    color: 'rgba(0,229,255,0.4)', fontSize: 14, flexShrink: 0,
    transition: 'color 0.2s ease',
  },

  // Controls: keycap-styled HUD legend, bottom-left corner.
  // Each key is a small bordered cap; the label sits beside it.
  controlsStrip: {
    position: 'fixed',
    left: 'clamp(20px, 3vw, 40px)',
    bottom: 'clamp(20px, 3vh, 36px)',
    zIndex: 10,
    display: 'flex', flexWrap: 'wrap', gap: 12, rowGap: 8, alignItems: 'center',
  },
  controlItem: { display: 'flex', alignItems: 'center', gap: 6 },
  controlKeyCap: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 500,
    color: 'rgba(0,229,255,0.85)',
    border: '1px solid rgba(0,229,255,0.4)',
    borderRadius: 3,
    padding: '3px 6px 2px',
    lineHeight: 1,
    background: 'rgba(0,229,255,0.05)',
    boxShadow: '0 1px 0 rgba(0,229,255,0.2)',
    letterSpacing: 0.5,
    minWidth: 18, textAlign: 'center',
  },
  controlLabel: {
    fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 400,
    color: 'rgba(238,242,248,0.32)', letterSpacing: 0.3,
  },
  controlSep: {
    display: 'inline-block', width: 1, height: 11,
    background: 'rgba(255,255,255,0.08)', marginLeft: 2,
  },

  /* -- pause screen (unchanged) -- */
  pauseOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(3,4,8,0.82)', backdropFilter: 'blur(3px)',
  },
  pauseContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: '1px solid rgba(0,229,255,0.18)',
    background: 'rgba(0,229,255,0.02)',
    padding: '44px 64px 36px',
  },
  pauseTitle: {
    fontFamily: "'Press Start 2P', monospace", fontSize: 20, letterSpacing: 5,
    color: '#eaf7fc', marginBottom: 28,
    textShadow: '0 0 24px rgba(0,229,255,0.55)',
  },
  pauseDivider: {
    width: '100%', height: 1,
    background: 'rgba(0,229,255,0.15)', marginBottom: 28,
  },
  pillRow: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  pauseHint: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 3,
    color: 'rgba(255,255,255,0.2)', marginTop: 24, textTransform: 'uppercase',
  },
};