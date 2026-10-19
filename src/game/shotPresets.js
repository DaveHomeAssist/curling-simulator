// Baseline release speeds for the current calibrated friction model (m/s).
// At the initial 45% charge, draw weight releases at 1.97 m/s.
export const SHOT_PRESETS = Object.freeze({
  guard: { label: 'Guard', velocity: 1.9 },
  draw: { label: 'Draw', velocity: 2.1 },
  freeze: { label: 'Freeze', velocity: 2.08 },
  control: { label: 'Control', velocity: 2.5 },
  takeout: { label: 'Takeout', velocity: 3.2 },
  peel: { label: 'Peel', velocity: 3.8 },
});
