// Independent view-only clock: never mutates a live or manually replayed frame.
export function createBroadcast() {
  let clip = null, time = 0;
  return {
    play(value) { clip = value ? structuredClone(value) : null; time = 0; },
    clear() { clip = null; time = 0; },
    step(dt) { if (clip) time = Math.min(time + Math.max(0, dt) * 0.7, (clip.frames.length - 1) / 30); },
    frame() { return clip ? clip.frames[Math.min(clip.frames.length - 1, Math.floor(time * 30))] : null; },
    snapshot() { const duration = clip ? (clip.frames.length - 1) / 30 : 0; return { available: Boolean(clip), playing: Boolean(clip) && time < duration, time, duration, end: clip?.end }; },
  };
}
