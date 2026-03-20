import { createImpact, createRumble, createScrape } from './generators.js';
import { loadSamples, playSample } from './samples.js';

function safeConnect(playable, destination) {
  if (playable?.node && typeof playable.node.connect === 'function' && destination) {
    playable.node.connect(destination);
  }
}

export function createAudioManager(state) {
  let audioCtx = null;
  let masterGain = null;
  let samples = new Map();
  let initialized = false;

  async function ensureContext() {
    if (audioCtx) return audioCtx;
    const AudioContextRef = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextRef) return null;
    audioCtx = new AudioContextRef();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.audio.masterVolume;
    masterGain.connect(audioCtx.destination);
    samples = await loadSamples(audioCtx, '/assets/audio');
    initialized = true;
    return audioCtx;
  }

  async function prime() {
    const ctx = await ensureContext();
    if (ctx?.state === 'suspended') {
      await ctx.resume();
    }
  }

  return {
    async ensureStarted() {
      await prime();
    },
    async onCollision(events) {
      await prime();
      if (!audioCtx || !masterGain || events.length === 0) return;
      const strongest = events.reduce((max, event) => Math.max(max, Math.abs(event.impulse ?? 0)), 0);
      const playable = createImpact(audioCtx, strongest);
      safeConnect(playable, masterGain);
      playable.start();
      playable.stop(audioCtx.currentTime + 0.35);
      state.audio.lastImpact = strongest;
    },
    async onSkipCall(type = 'hard') {
      await prime();
      if (!audioCtx || !masterGain) return;
      const sample = samples.get(type === 'whoa' ? 'skip-whoa' : 'skip-hard');
      if (sample) playSample(audioCtx, sample, 0.38);
    },
    async onShotComplete(gameState) {
      await prime();
      if (!audioCtx || !masterGain) return;
      const sample = gameState.challengeMedal === 'gold'
        ? samples.get('crowd-cheer')
        : gameState.stats.hogViolations > 0
          ? samples.get('crowd-groan')
          : null;
      if (sample) playSample(audioCtx, sample, 0.32);
    },
    async updateMotion(movingStone, sweeping) {
      if (!movingStone || !state.audio.enabled) return;
      await prime();
      if (!audioCtx || !masterGain) return;
      const velocity = Math.hypot(movingStone.vx ?? 0, movingStone.vy ?? 0);
      if (velocity < 0.3) return;

      const rumble = createRumble(audioCtx, velocity);
      safeConnect(rumble, masterGain);
      rumble.start();
      rumble.stop(audioCtx.currentTime + 0.08);

      if (sweeping) {
        const scrape = createScrape(audioCtx, velocity);
        safeConnect(scrape, masterGain);
        scrape.start();
        scrape.stop(audioCtx.currentTime + 0.08);
      }
    },
    setEnabled(enabled) {
      state.audio.enabled = enabled;
      if (masterGain) {
        masterGain.gain.value = enabled ? state.audio.masterVolume : 0;
      }
    },
    isReady() {
      return initialized;
    },
  };
}
