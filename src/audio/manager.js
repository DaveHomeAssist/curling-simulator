import { createCrowdAmbient, createCrowdReaction, createImpact, createRumble, createScrape } from './generators.js';

function safeConnect(playable, destination) {
  if (playable?.node && typeof playable.node.connect === 'function' && destination) {
    playable.node.connect(destination);
  }
}

export function createAudioManager(state) {
  let audioCtx = null;
  let masterGain = null;
  let crowdAmbient = null;
  let initialized = false;

  function setCrowdMood(level, label = 'idle') {
    crowdAmbient?.setLevel?.(state.audio.enabled ? level * state.audio.masterVolume : 0.0001);
    state.audio.crowdMood = label;
  }

  async function ensureContext() {
    if (audioCtx) return audioCtx;
    const AudioContextRef = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextRef) return null;
    audioCtx = new AudioContextRef();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = state.audio.masterVolume;
    masterGain.connect(audioCtx.destination);
    crowdAmbient = createCrowdAmbient(audioCtx);
    safeConnect(crowdAmbient, masterGain);
    crowdAmbient.start(audioCtx.currentTime);
    setCrowdMood(0.035, 'idle');
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
      // Procedural blip: short sine tone — higher for 'whoa', lower for 'hard'.
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === 'whoa' ? 880 : 523;
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.18);
    },
    async onShotComplete(gameState) {
      await prime();
      if (!audioCtx || !masterGain) return;
      const title = gameState.resultChip?.title ?? '';
      const positive = gameState.challengeMedal === 'gold'
        || gameState.challengeMedal === 'silver'
        || /SCORES/.test(title);
      const groan = gameState.challengeMedal === 'miss'
        || gameState.challengeMedal === 'bronze'
        || title === 'Removed';
      if (!positive && !groan) return;
      const reaction = createCrowdReaction(audioCtx, positive);
      safeConnect(reaction, masterGain);
      reaction.start();
    },
    async updateMotion(gameState, movingStone, sweeping) {
      if (!state.audio.enabled) {
        setCrowdMood(0, 'muted');
        return;
      }
      await prime();
      if (!audioCtx || !masterGain) return;
      const clutchStone = gameState.currentTeam === gameState.hammerTeam && gameState.shotNumber >= 15;
      if (gameState.mode === 'travel' && movingStone) {
        setCrowdMood(clutchStone ? 0.085 : 0.06, clutchStone ? 'clutch' : 'travel');
      } else if (gameState.mode === 'result') {
        setCrowdMood(0.05, 'result');
      } else {
        setCrowdMood(gameState.gameMode === 'tournament' ? 0.05 : 0.035, gameState.gameMode === 'tournament' ? 'tournament' : 'idle');
      }
      if (!movingStone) return;
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
      setCrowdMood(enabled ? 0.035 : 0, enabled ? 'idle' : 'muted');
    },
    isReady() {
      return initialized;
    },
  };
}
