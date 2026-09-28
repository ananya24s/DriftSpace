/*
  Screen-size and performance settings shared by the game loop and effects.

  World scale — the game world is sized in "world units". On large screens
  one unit is one CSS pixel (scale 1, unchanged). On small screens (phones in
  landscape) the camera zooms out so you see more of the field and
  everything is drawn a bit smaller.

  Visual quality — canvas glow (shadowBlur) is the most expensive thing we
  draw, and phone GPUs struggle with it. The loop measures real frame times
  and, if they stay slow, switches glow off and trims particle counts.
*/

// Screens whose short side is below this get zoomed out proportionally
const REF_SHORT_SIDE = 520;
const MIN_SCALE = 0.6;

export function worldScale(width, height) {
  const short = Math.min(width, height);
  return Math.max(MIN_SCALE, Math.min(1, short / REF_SHORT_SIDE));
}

export const FX = {
  glow: true,         // canvas shadowBlur glow on/off
  particleScale: 1,   // multiplier for particle / debris counts
};

// Scales a particle count by the current quality level (never below 1)
export function fxCount(n) {
  return Math.max(1, Math.round(n * FX.particleScale));
}

const SAMPLE_FRAMES = 45;     // measure over ~0.75s
const SLOW_FRAME_MS = 21;     // average slower than this ≈ under ~48 fps
const WARMUP_FRAMES = 30;     // ignore start-up hitches
const SLOW_WINDOWS = 2;       // must be slow for 2 windows in a row (~1.5s)

/*
  Watches frame times and drops to low quality once if the device can't keep
  up. Stays low for the rest of the session so the look doesn't flicker.
*/
export function createQualityMonitor(onDowngrade) {
  let frames = 0;
  let sum = 0;
  let seen = 0;
  let slowStreak = 0;
  return frameMs => {
    if (!FX.glow) return;
    seen++;
    if (seen <= WARMUP_FRAMES || frameMs > 250) return; // skip tab-switch gaps
    sum += frameMs;
    frames++;
    if (frames < SAMPLE_FRAMES) return;
    const avg = sum / frames;
    frames = 0;
    sum = 0;
    slowStreak = avg > SLOW_FRAME_MS ? slowStreak + 1 : 0;
    if (slowStreak >= SLOW_WINDOWS) {
      FX.glow = false;
      FX.particleScale = 0.5;
      onDowngrade?.(avg);
    }
  };
}

// Turns every shadowBlur assignment on this context into a no-op
export function disableGlow(ctx) {
  Object.defineProperty(ctx, 'shadowBlur', {
    configurable: true,
    get: () => 0,
    set: () => {},
  });
}
