import menuMusicUrl from './music/menu.mp3';
import gameplayMusicUrl from './music/gameplay.mp3';

import shootSfxUrl from './sfx/shoot.wav';
import explosionSfxUrl from './sfx/explosion.wav';
import playerHitSfxUrl from './sfx/playerHit.wav';
import gameOverSfxUrl from './sfx/gameOver.wav';
import clickSfxUrl from './sfx/click.wav';
const DEFAULT_MUSIC_VOLUME = 0.38;
const FADE_DURATION_MS = 600;
const FADE_STEPS = 20;
const FADE_STEP_MS = FADE_DURATION_MS / FADE_STEPS;

const SFX_BASE_VOLUMES = {
  shoot: 0.10,
  explosion: 0.28,
  playerHit: 0.22,
  gameOver: 0.45,
  click: 0.08,
};
function clampVolume(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

class AudioManager {
  constructor() {
    if (AudioManager._instance) {
      // eslint-disable-next-line no-constructor-return
      return AudioManager._instance;
    }
    AudioManager._instance = this;

    // --- Persistent music tracks ---
    this.menuMusic = new Audio(menuMusicUrl);
    this.menuMusic.loop = true;
    this.menuMusic.volume = DEFAULT_MUSIC_VOLUME;

    this.gameplayMusic = new Audio(gameplayMusicUrl);
    this.gameplayMusic.loop = true;
    this.gameplayMusic.volume = DEFAULT_MUSIC_VOLUME;

    this.currentMusic = null;
    this.fadeInterval = null;

    // --- Reusable base SFX objects (used only as clone templates) ---
    this.sfxBase = {
      shoot: new Audio(shootSfxUrl),
      explosion: new Audio(explosionSfxUrl),
      playerHit: new Audio(playerHitSfxUrl),
      gameOver: new Audio(gameOverSfxUrl),
      click: new Audio(clickSfxUrl),
    };

    this.activeSfxClones = new Set();

    // --- Volume / mute state ---
    this.musicVolume = DEFAULT_MUSIC_VOLUME;
    this.sfxVolumeScale = 1;
    // Load persisted preference — all Audio objects must exist before this
    this.isMuted = this._loadPreference();
    if (this.isMuted) {
      this.menuMusic.volume = 0;
      this.gameplayMusic.volume = 0;
    }

    // Browsers block autoplay until the first user gesture. Register a
    // one-time listener on every plausible interaction event so that the
    // pending music track (set by playMenuMusic() on mount) retries the
    // moment the user touches anything — before they even click Launch.
    this._autoplayUnlocked = false;
    this._unlockAutoplay = this._unlockAutoplay.bind(this);
    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
      window.addEventListener(evt, this._unlockAutoplay, { once: false, passive: true })
    );
  }

  // ---------- Preference persistence ----------

  _loadPreference() {
    try {
      return localStorage.getItem('driftspace-audio-muted') === 'true';
    } catch { return false; }
  }

  _savePreference() {
    try {
      localStorage.setItem('driftspace-audio-muted', String(this.isMuted));
    } catch {}
  }

  /** Public getter — read mute state without touching internals. */
  get muted() {
    return this.isMuted;
  }

  // Retry the pending music track on the first user interaction.
  // Removes itself after the track is successfully playing so it
  // doesn't keep firing on every keypress.
  _unlockAutoplay() {
    if (this._autoplayUnlocked) return;
    if (!this.currentMusic || !this.currentMusic.paused) {
      // Nothing pending, or already playing — clean up listener.
      this._autoplayUnlocked = true;
      this._removeUnlockListeners();
      return;
    }
    // currentMusic was set but play() was rejected by the browser.
    // Retry it now that we have a user gesture.
    const result = this.currentMusic.play();
    if (result && typeof result.then === 'function') {
      result.then(() => {
        this._autoplayUnlocked = true;
        this._removeUnlockListeners();
      }).catch(() => {
        // Still blocked (e.g. iframe policy) — leave listener in place
        // to retry on the next interaction.
      });
    } else {
      this._autoplayUnlocked = true;
      this._removeUnlockListeners();
    }
  }

  _removeUnlockListeners() {
    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
      window.removeEventListener(evt, this._unlockAutoplay)
    );
  }

  // ---------- Internal helpers ----------

  _safePlay(audio) {
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  }

  _effectiveMusicVolume() {
    return this.isMuted ? 0 : this.musicVolume;
  }

  _clearFadeInterval() {
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

_startTrack(track) {
  // Already playing this exact track
  if (this.currentMusic === track && !track.paused) {
    return;
  }

  this._clearFadeInterval();

  if (this.currentMusic && this.currentMusic !== track) {
    this.currentMusic.pause();
    this.currentMusic.currentTime = 0;
  }

  track.currentTime = 0;
  track.volume = this._effectiveMusicVolume();

  this.currentMusic = track;
  this._safePlay(track);
}

_crossfade(fromTrack, toTrack) {
  this._clearFadeInterval();

  if (fromTrack === toTrack) {
    this._startTrack(toTrack);
    return;
  }

  if (toTrack.paused) {
    toTrack.currentTime = 0;
    toTrack.volume = 0;
    this._safePlay(toTrack);
  }

  this.currentMusic = toTrack;

  let step = 0;

  this.fadeInterval = setInterval(() => {
    step += 1;
    const progress = Math.min(step / FADE_STEPS, 1);
    const targetVolume = this._effectiveMusicVolume();

    fromTrack.volume = clampVolume(targetVolume * (1 - progress));
    toTrack.volume = clampVolume(targetVolume * progress);

    if (step >= FADE_STEPS) {
      this._clearFadeInterval();

      fromTrack.pause();
      fromTrack.currentTime = 0;
      fromTrack.volume = this.musicVolume;

      toTrack.volume = this._effectiveMusicVolume();
    }
  }, FADE_STEP_MS);
}

_playSfx(name) {
  const base = this.sfxBase[name];
  if (!base) return;

  const clone = base.cloneNode(true);
  const baseVolume = SFX_BASE_VOLUMES[name] ?? 1;
  const intendedVolume = clampVolume(
    baseVolume * this.sfxVolumeScale
  );

  clone.dataset.audioName = name;
  clone.dataset.intendedVolume = String(intendedVolume);
  clone.volume = this.isMuted ? 0 : intendedVolume;

  this.activeSfxClones.add(clone);

  const cleanup = () => {
    this.activeSfxClones.delete(clone);
    clone.removeEventListener('ended', cleanup);
  };

  clone.addEventListener('ended', cleanup);
  this._safePlay(clone);
}

  // ---------- Music controls ----------

  playMenuMusic() {
    this._startTrack(this.menuMusic);
  }

  playGameplayMusic() {
    this._startTrack(this.gameplayMusic);
  }

  fadeToMenu() {
    this._crossfade(this.gameplayMusic, this.menuMusic);
  }

  fadeToGameplay() {
    this._crossfade(this.menuMusic, this.gameplayMusic);
  }

  stopMusic() {
    this._clearFadeInterval();
    this.menuMusic.pause();
    this.menuMusic.currentTime = 0;
    this.gameplayMusic.pause();
    this.gameplayMusic.currentTime = 0;
    this.currentMusic = null;
  }

  stopAll() {
    this.stopMusic();
    this.activeSfxClones.forEach((clone) => {
      clone.pause();
      clone.currentTime = 0;
    });
    this.activeSfxClones.clear();
  }

  // ---------- SFX controls ----------

  playShoot() {
    this._playSfx('shoot');
  }

  playExplosion() {
    this._playSfx('explosion');
  }

  playPlayerHit() {
    this._playSfx('playerHit');
  }

  playGameOver() {
    this._playSfx('gameOver');
  }

  playClick() {
    this._playSfx('click');
  }

  playChain() {
    // Chain bonus audio: layered click + explosion at reduced volume.
    // Uses existing assets — no new files needed.
    this._playSfx('click');
    // Slight delay on the explosion so the two hits feel distinct
    setTimeout(() => this._playSfx('explosion'), 60);
  }

  // ---------- Synthesized chiptune SFX (power-ups) ----------
  // Square/noise voices generated with Web Audio so pickups sound like
  // classic 8-bit cartridges without shipping extra audio files.

  _chipCtx() {
    if (this.isMuted) return null;
    try {
      if (!this._ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this._ctx = new Ctx();
      }
      if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
      return this._ctx;
    } catch { return null; }
  }

  _chipNotes(freqs, { step = 0.07, dur = 0.09, type = 'square', vol = 0.07 } = {}) {
    const ctx = this._chipCtx();
    if (!ctx) return;
    const level = vol * this.sfxVolumeScale;
    const t0 = ctx.currentTime + 0.01;
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = t0 + i * step;
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }

  playPowerUp(type) {
    const tunes = {
      LIFE:   [523, 659, 784, 1047, 1319],   // C major run, classic 1-up
      SHIELD: [392, 523, 659, 784],
      RAPID:  [880, 1175, 880, 1175, 1568],
      SPREAD: [659, 523, 784, 659, 988],
      MULTI:  [523, 784, 1047, 1568],
      SLOW:   [784, 659, 523, 392],          // descending — time slowing down
      MAGNET: [440, 880, 554, 1109, 659, 1319], // zig-zag "reeling in"
      JAM:      [659, 622, 587, 554],       // sly chromatic slide down — you're the saboteur
      BLACKOUT: [659, 622, 587, 554],
      FREEZE:   [659, 622, 587, 554],
    };
    const fast = type === 'RAPID';
    this._chipNotes(tunes[type] ?? tunes.SHIELD, fast ? { step: 0.045, dur: 0.06 } : undefined);
  }

  playNova() {
    const ctx = this._chipCtx();
    if (!ctx) return;
    // White-noise blast through a falling lowpass — 8-bit explosion
    const len = Math.floor(ctx.sampleRate * 0.9);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const gain = ctx.createGain();
    const t = ctx.currentTime + 0.01;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.85);
    gain.gain.setValueAtTime(0.22 * this.sfxVolumeScale, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    this._chipNotes([220, 165, 110, 82], { step: 0.08, dur: 0.14, vol: 0.06 });
  }

  // Versus countdown: short blips on 3-2-1, a higher long tone on GO
  playCountdown(go) {
    if (go) this._chipNotes([1047, 1568], { step: 0.06, dur: 0.28, vol: 0.07 });
    else this._chipNotes([523], { dur: 0.12, vol: 0.07 });
  }

  // Versus emote: a quick two-note chirp
  playEmote() {
    this._chipNotes([988, 1319], { step: 0.05, dur: 0.07, vol: 0.05 });
  }

  // UFO: low two-tone warble while a saucer is on screen (called on a beat)
  playUfoWarble(small) {
    const base = small ? 330 : 196;
    this._chipNotes([base, base * 1.19], { step: 0.09, dur: 0.1, vol: 0.025 });
  }

  playUfoShot() {
    this._chipNotes([1175, 784], { step: 0.03, dur: 0.05, vol: 0.035 });
  }

  playUfoExplode() {
    this._playSfx('explosion');
    this._chipNotes([880, 659, 440, 330, 220], { step: 0.05, dur: 0.08, vol: 0.05 });
  }

  // Hit by a rival's sabotage: harsh buzzing drop
  playSabotaged() {
    this._chipNotes([311, 294, 277, 262, 247], { step: 0.05, dur: 0.07, type: 'sawtooth', vol: 0.05 });
  }

  // Versus race pickup appeared: quick bright fanfare
  playRaceStart() {
    this._chipNotes([784, 988, 1175, 1568], { step: 0.07, dur: 0.1, vol: 0.06 });
  }

  playRaceResult(won) {
    if (won) this._chipNotes([1047, 1319, 1568, 2093], { step: 0.07, dur: 0.12, vol: 0.06 });
    else this._chipNotes([523, 494, 440], { step: 0.09, dur: 0.12, vol: 0.05 });
  }

  playShieldBlock() {
    this._chipNotes([1568, 1047], { step: 0.04, dur: 0.06, vol: 0.05 });
  }

  // ---------- Volume / mute controls ----------

  setMusicVolume(volume) {
    this.musicVolume = clampVolume(volume);
    if (!this.isMuted && this.currentMusic && this.fadeInterval === null) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  setSfxVolume(volume) {
    this.sfxVolumeScale = clampVolume(volume);
  }

setMuted(isMuted) {
  this.isMuted = Boolean(isMuted);
  this._savePreference();

  this.menuMusic.volume = this.isMuted
    ? 0
    : this.menuMusic === this.currentMusic
      ? this.musicVolume
      : this.menuMusic.volume;

  this.gameplayMusic.volume = this.isMuted
    ? 0
    : this.gameplayMusic === this.currentMusic
      ? this.musicVolume
      : this.gameplayMusic.volume;

  this.activeSfxClones.forEach((clone) => {
    const intendedVolume = Number(
      clone.dataset.intendedVolume ?? 0
    );

    clone.volume = this.isMuted
      ? 0
      : clampVolume(intendedVolume);
  });
}

  toggleMute() {
    this.setMuted(!this.isMuted);
  }

  // ---------- Preloading ----------

  preload() {
    this.menuMusic.load();
    this.gameplayMusic.load();
    Object.values(this.sfxBase).forEach((audio) => audio.load());
  }
}

const audioManager = new AudioManager();

export default audioManager;