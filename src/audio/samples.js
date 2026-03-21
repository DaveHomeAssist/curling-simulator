// Sample files are an optional enhancement. When real .mp3 assets are present,
// they can be loaded here to replace the procedural fallbacks in manager.js.
// For now, loadSamples returns an empty Map so the audio system works without
// any external files — all sounds are generated procedurally by generators.js.
export async function loadSamples(_audioCtx, _basePath = '') {
  return new Map();
}

export function playSample(audioCtx, buffer, volume = 1) {
  if (!buffer || typeof audioCtx.createBufferSource !== 'function') {
    return null;
  }

  const source = audioCtx.createBufferSource();
  const gain = typeof audioCtx.createGain === 'function' ? audioCtx.createGain() : null;
  source.buffer = buffer;

  if (gain) {
    gain.gain.value = volume;
    source.connect(gain);
    if (audioCtx.destination) {
      gain.connect(audioCtx.destination);
    }
  } else if (audioCtx.destination) {
    source.connect(audioCtx.destination);
  }

  if (typeof source.start === 'function') {
    source.start(0);
  }

  return source;
}
