// Bounded, view-only transform recording. Live physics is never restored from it.
export function createReplay() {
  let recording = null, last = null, best = null, playback = null;
  const copy = (value) => structuredClone(value);
  return {
    begin(frame, end) { recording = { frames: [copy(frame)], end, rank: -Infinity }; },
    capture(frame) {
      if (recording && recording.frames.length < 362) recording.frames.push(copy(frame));
    },
    finish(frame, rank) {
      if (!recording) return;
      recording.frames.push(copy(frame)); recording.rank = rank;
      last = recording;
      if (!best || rank > best.rank) best = last;
      recording = null;
    },
    start(which = 'last') {
      const clip = which === 'best' ? best : last;
      if (!clip) return false;
      playback = { clip, time: 0, paused: false, which }; return true;
    },
    step(dt) {
      if (!playback || playback.paused) return;
      playback.time = Math.min(playback.time + dt, (playback.clip.frames.length - 1) / 30);
      if (playback.time >= (playback.clip.frames.length - 1) / 30) playback.paused = true;
    },
    seek(fraction) { if (playback) { playback.time = Math.max(0, Math.min(1, fraction)) * (playback.clip.frames.length - 1) / 30; playback.paused = true; } },
    pause() { if (playback) playback.paused = !playback.paused; },
    exit() { playback = null; },
    clear() { recording = last = best = playback = null; },
    snapshot() { return { available: Boolean(last), bestAvailable: Boolean(best), active: Boolean(playback), paused: playback?.paused ?? false, which: playback?.which, time: playback?.time ?? 0, duration: playback ? (playback.clip.frames.length - 1) / 30 : 0 }; },
    frame() { return playback ? copy(playback.clip.frames[Math.min(playback.clip.frames.length - 1, Math.floor(playback.time * 30))]) : null; },
    end: () => playback?.clip.end,
  };
}
