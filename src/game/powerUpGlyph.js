/**
 * Power-up definitions shared by gameplay (canvas) and the HUD (SVG).
 * Each icon is a 7×7 pixel bitmap so pickups read as chunky 8-bit sprites
 * next to the vector ship and asteroids.
 */
export const POWERUP_TYPES = {
  LIFE: {
    label: '+1 LIFE', short: 'LIFE', color: '#ff3b6b', weight: 1.2, timed: false,
    desc: 'Adds an extra ship, up to 5. Already full? Bonus points instead.',
    bitmap: [
      '.XX.XX.',
      'XXXXXXX',
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '..XXX..',
      '...X...',
    ],
  },
  SHIELD: {
    label: 'SHIELD', short: 'SHLD', color: '#39ff14', weight: 1.5, timed: true,
    desc: '8 seconds of armour. Asteroids that touch it are smashed.',
    bitmap: [
      'XXXXXXX',
      'X.XXX.X',
      'X.XXX.X',
      'X.XXX.X',
      '.X.X.X.',
      '..X.X..',
      '...X...',
    ],
  },
  RAPID: {
    label: 'RAPID FIRE', short: 'RAPD', color: '#ffd700', weight: 2, timed: true,
    desc: 'Your blaster fires much faster for 10 seconds.',
    bitmap: [
      '...XXX.',
      '..XXX..',
      '.XXX...',
      'XXXXXXX',
      '...XXX.',
      '..XXX..',
      '.XX....',
    ],
  },
  SPREAD: {
    label: 'SPREAD SHOT', short: 'SPRD', color: '#ff8c1a', weight: 2, timed: true,
    desc: 'Fires three bullets in a fan for 10 seconds.',
    bitmap: [
      'X..X..X',
      'X..X..X',
      '.X.X.X.',
      '.X.X.X.',
      '..XXX..',
      '..XXX..',
      '...X...',
    ],
  },
  MULTI: {
    label: 'SCORE X2', short: 'X2', color: '#ff4dff', weight: 1.5, timed: true,
    desc: 'Every point, including chain bonuses, counts double for 10 seconds.',
    bitmap: [
      '....XX.',
      '...X..X',
      'X.X...X',
      '.X...X.',
      'X.X.X..',
      '...XXXX',
      '.......',
    ],
  },
  NOVA: {
    label: 'NOVA BOMB', short: 'NOVA', color: '#ffffff', weight: 0.8, timed: false,
    desc: 'Wipes out every asteroid on screen at once.',
    bitmap: [
      'X..X..X',
      '.X.X.X.',
      '..XXX..',
      'XXXXXXX',
      '..XXX..',
      '.X.X.X.',
      'X..X..X',
    ],
  },
  SLOW: {
    label: 'SLOW-MO', short: 'SLOW', color: '#4d9fff', weight: 1.2, timed: true,
    desc: 'Asteroids crawl for 6 seconds while you move at full speed.',
    bitmap: [
      'XXXXXXX',
      '.X...X.',
      '..X.X..',
      '...X...',
      '..XXX..',
      '.XXXXX.',
      'XXXXXXX',
    ],
  },
  MAGNET: {
    label: 'MAGNET', short: 'MAGN', color: '#2dffd2', weight: 1.3, timed: true,
    desc: 'Pulls pickups toward you from across the screen for 12 seconds.',
    bitmap: [
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XX...XX',
      'XXX.XXX',
      '.XXXXX.',
      '..XXX..',
    ],
  },

  // ---- Versus-only sabotage pickups ("mean": red warning frame) ----
  // Collecting one hits the current leader; a Shield blocks it.
  JAM: {
    label: 'JAM', short: 'JAM', color: '#ff2e9a', weight: 1.3, timed: true, versusOnly: true, mean: true,
    desc: "Reverses the leader's controls for 4 seconds.",
    hitText: 'CONTROLS REVERSED',
    bitmap: [
      '..X....',
      '.XXXXXX',
      '..X....',
      '.......',
      '....X..',
      'XXXXXX.',
      '....X..',
    ],
  },
  BLACKOUT: {
    label: 'BLACKOUT', short: 'DARK', color: '#a66bff', weight: 1.3, timed: true, versusOnly: true, mean: true,
    desc: "Blacks out the leader's screen except around their ship for 5 seconds.",
    hitText: 'SCREEN BLACKED OUT',
    bitmap: [
      '..XXX..',
      '.X...X.',
      'X.XXX.X',
      'X.XXX.X',
      'X.XXX.X',
      '.X...X.',
      '..XXX..',
    ],
  },
  FREEZE: {
    label: 'FREEZE', short: 'FRZ', color: '#9ff3ff', weight: 1.3, timed: true, versusOnly: true, mean: true,
    desc: "Freezes the leader's blaster for 4 seconds.",
    hitText: 'BLASTER FROZEN',
    bitmap: [
      '...X...',
      '.X.X.X.',
      '..XXX..',
      'XXX.XXX',
      '..XXX..',
      '.X.X.X.',
      '...X...',
    ],
  },
};

// Versus race pickup (golden flag) — not a power-up, but drawn the same way
export const RACE_PICKUP = {
  label: 'RACE PICKUP', color: '#ffd700',
  desc: 'Appears on every screen at once. First pilot to grab it wins +1 life (or +1,000 if full).',
  bitmap: [
    'X.X.X..',
    '.X.X.X.',
    'X.X.X..',
    '.X.X.X.',
    'X......',
    'X......',
    'X......',
  ],
};

// includeVersus: allow the versus-only sabotage pickups (versus matches only)
export function randomPowerUpType(includeVersus = false) {
  const entries = Object.entries(POWERUP_TYPES).filter(([, t]) => includeVersus || !t.versusOnly);
  const total = entries.reduce((sum, [, t]) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const [key, t] of entries) {
    r -= t.weight;
    if (r <= 0) return key;
  }
  return entries[0][0];
}

/**
 * Draws a power-up bitmap centred on (0,0). Assumes ctx is already
 * translated to the pickup's position.
 */
export function drawPowerUpBitmap(ctx, type, pixel) {
  const { bitmap, color } = typeof type === 'string' ? POWERUP_TYPES[type] : type;
  const n = bitmap.length;
  const off = -(n * pixel) / 2;
  ctx.fillStyle = color;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      if (bitmap[row][col] === 'X') {
        ctx.fillRect(off + col * pixel, off + row * pixel, pixel, pixel);
      }
    }
  }
}
