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
    const white = Math.random() * 2 - 1;
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
