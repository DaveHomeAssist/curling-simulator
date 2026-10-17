// Procedural contact audio; compound colliders share one sound per type/cooldown.
export function createImpactFilter() {
  const last = new Map();
  return {
    reset: () => last.clear(),
    select(events) {
      const strongest = new Map();
      for (const event of events) {
        if (event.speed < 0.6) continue;
        if (!strongest.has(event.type) || strongest.get(event.type).speed < event.speed)
          strongest.set(event.type, event);
      }
      return [...strongest.values()].filter((event) => {
        if (event.time - (last.get(event.type) ?? -Infinity) < 0.12) return false;
        last.set(event.type, event.time); return true;
      });
    },
  };
}

export function createImpactAudio() {
  let context, master, analyser;
  let enabled = false, volume = 0.5, suppressed = false, unavailable = false;
  let played = 0;
  const counts = { stake: 0, shoe: 0, ground: 0 };
  const filter = createImpactFilter();
  function gain() { if (master) master.gain.value = enabled && !suppressed ? volume : 0; }
  async function unlock() {
    if (!enabled) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      if (!context) {
        context = new Audio(); master = context.createGain(); analyser = context.createAnalyser();
        analyser.fftSize = 256; master.connect(analyser); analyser.connect(context.destination);
      }
      gain(); await context.resume();
    } catch { unavailable = true; enabled = false; gain(); }
  }
  function impact(event) {
    if (!enabled || suppressed || !context || context.state !== 'running') return;
    const now = context.currentTime;
    const duration = event.type === 'stake' ? 0.38 : event.type === 'shoe' ? 0.12 : 0.09;
    const frequency = event.type === 'stake' ? 1650 : event.type === 'shoe' ? 780 : 105;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(Math.min(0.2, event.speed * 0.018), now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    envelope.connect(master);
    const oscillator = context.createOscillator();
    oscillator.type = event.type === 'ground' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.68, now + duration);
    oscillator.connect(envelope); oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    counts[event.type]++; played++;
  }
  return {
    unlock,
    setEnabled(value) { enabled = value; gain(); return unlock(); },
    setVolume(value) { volume = Math.max(0, Math.min(1, value)); gain(); },
    suppress(value) { suppressed = value; gain(); },
    reset: () => filter.reset(),
    consume(events) { for (const event of filter.select(events)) impact(event); },
    snapshot() {
      let energy = 0;
      if (analyser) {
        const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
        energy = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
      }
      return { enabled, volume, unavailable, context: context?.state ?? 'locked', played, counts: { ...counts }, energy };
    },
  };
}
