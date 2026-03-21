function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setValue(node, value) {
  if (!node) {
    return;
  }
  if (typeof node.setValueAtTime === 'function') {
    node.setValueAtTime(value, 0);
    return;
  }
  node.value = value;
}

function buildNoiseBuffer(audioCtx, durationSeconds, color = 'white') {
  const sampleRate = audioCtx.sampleRate ?? 44100;
  const length = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < channel.length; index += 1) {
    const seed = Math.sin(index * 12.9898 + durationSeconds * 78.233) * 43758.5453;
    const white = (seed - Math.floor(seed)) * 2 - 1;
    if (color === 'brown') {
      last = clamp(last + white * 0.02, -1, 1);
      channel[index] = last * 3.5;
    } else {
      channel[index] = white * 0.35;
    }
  }
  return buffer;
}

function makePlayable(node, source) {
  return {
    node,
    start(time = 0) {
      if (typeof source.start === 'function') {
        source.start(time);
      }
    },
    stop(time = 0) {
      if (typeof source.stop === 'function') {
        source.stop(time);
      }
    },
  };
}

export function createRumble(audioCtx, velocity) {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const frequency = 60 + clamp((velocity ?? 0) * 12, 0, 60);
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  setValue(gain.gain, 0.02 + clamp(velocity ?? 0, 0, 8) * 0.025);
  oscillator.connect(gain);
  return makePlayable(gain, oscillator);
}

export function createScrape(audioCtx, velocity) {
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = buildNoiseBuffer(audioCtx, 1, 'white');
  filter.type = 'bandpass';
  filter.frequency.value = 2000 + clamp((velocity ?? 0) * 300, 0, 4000);
  filter.Q.value = 0.9;
  setValue(gain.gain, 0.04 + clamp(velocity ?? 0, 0, 8) * 0.03);
  source.connect(filter);
  filter.connect(gain);
  return makePlayable(gain, source);
}

export function createCrowdAmbient(audioCtx) {
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  // 4-second looping brown noise shaped into the 200-800 Hz crowd-murmur band.
  source.buffer = buildNoiseBuffer(audioCtx, 4, 'brown');
  source.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;
  setValue(gain.gain, 0.035);
  source.connect(filter);
  filter.connect(gain);
  let started = false;
  return {
    node: gain,
    start(time = 0) {
      if (started) return;
      started = true;
      source.start(time);
    },
    stop(time = 0) {
      try { source.stop(time); } catch (_) { /* already stopped */ }
    },
    setLevel(level, time = audioCtx.currentTime) {
      const target = clamp(level, 0, 0.14);
      gain.gain.cancelScheduledValues?.(time);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value || 0.0001), time);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), time + 0.18);
    },
  };
}

export function createCrowdReaction(audioCtx, positive = true) {
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  // Burst of filtered noise: higher pitch for cheer, lower for groan.
  source.buffer = buildNoiseBuffer(audioCtx, 1.5, 'brown');
  filter.type = 'bandpass';
  filter.frequency.value = positive ? 700 : 280;
  filter.Q.value = 0.6;
  source.connect(filter);
  filter.connect(gain);
  let started = false;
  return {
    node: gain,
    start(time = 0) {
      if (started) return;
      started = true;
      const startAt = audioCtx.currentTime + time;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(0.18, startAt + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 1.5);
      source.start(startAt);
      source.stop(startAt + 1.5);
    },
    stop(time = 0) {
      try { source.stop(audioCtx.currentTime + time); } catch (_) { /* already stopped */ }
    },
  };
}

export function createImpact(audioCtx, impulse) {
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = buildNoiseBuffer(audioCtx, 0.35, 'brown');
  filter.type = 'lowpass';
  filter.frequency.value = 1200 + clamp((impulse ?? 0) * 800, 0, 2600);
  setValue(gain.gain, 0.08 + clamp(impulse ?? 0, 0, 10) * 0.06);
  source.connect(filter);
  filter.connect(gain);
  return makePlayable(gain, source);
}
