export const SHIP = {
  THRUST: 0.28,
  FRICTION: 0.97,
  ROT_SPEED: 0.065,
  MAX_SPEED: 7,
  RADIUS: 12,
  SHOOT_COOLDOWN: 12,
  BULLET_SPEED: 12,
  INVINCIBLE_FRAMES: 120,
};

export const ASTEROID = {
  MIN_SIZE: 14,
  MAX_SIZE: 44,
  BASE_SPEED: 1.2,
  SPEED_VARIANCE: 1.8,
  SPAWN_INTERVAL_BASE: 90,
  SPAWN_INTERVAL_MIN: 28,
  SPLIT_THRESHOLD: 20,
  DIFFICULTY_RAMP: 0.08,
};

export const GAME = {
  LIVES: 3,
  WAVE_DURATION: 20,
  DIFFICULTY_RAMP: 0.08,
};

export const COLORS = {
  SHIP: '#00e5ff',
  BULLET: '#00e5ff',
  BG: '#000000',
  ASTEROID_DEFAULT: '#7b8fa1',
  ASTEROID_RARE_1: '#ff6b35',
  ASTEROID_RARE_2: '#a78bfa',
};
export const POWERUP = {
  DROP_CHANCE: 0.09,      // chance a destroyed asteroid drops a power-up
  DROP_CHANCE_BIG: 0.15,  // bigger rocks are more generous
  MAX_ON_SCREEN: 3,
  LIFETIME: 600,          // frames before an uncollected pickup vanishes (~10s)
  BLINK_AT: 150,          // start blinking this many frames before vanishing
  PICKUP_RADIUS: 14,
  MAX_LIVES: 5,
  FULL_LIVES_BONUS: 250,  // awarded instead of a life when already at max
  RAPID_COOLDOWN: 5,
  SPREAD_ANGLE: 0.22,
  SLOW_FACTOR: 0.4,
  DURATION: {             // timed effects, in frames (60 ≈ 1s)
    SHIELD: 480,
    RAPID: 600,
    SPREAD: 600,
    MULTI: 600,
    SLOW: 360,
  },
};
