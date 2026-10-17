import { createPracticePhysics } from './physics.js';
import { createLaunchCommand } from './launch.js';
import { scoreInning } from './scoring.js';

export function candidates(difficulty = 'normal') {
  const throws = [];
  for (const strength of [47, 50, 53])
    for (const aimDeg of [-0.6, 0, 0.6])
      throws.push({ strength, aimDeg, arc: 'normal', style: 'turn' });
  for (const aimDeg of [-0.35, 0, 0.35])
    throws.push({ strength: 50, aimDeg, arc: 'normal', style: 'flip' });
  return difficulty === 'easy' ? throws.filter((_, i) => i % 2 === 0) : throws;
}

export function planThrow(RAPIER, saved, delivery, difficulty) {
  const started = performance.now();
  let best;
  for (const controls of candidates(difficulty)) {
    const sim = createPracticePhysics(RAPIER, { saved, retainShoes: saved.retainShoes });
    try {
      sim.spawnShoe({ ...createLaunchCommand(controls), ...delivery });
      for (let i = 0; i < 1441 && sim.snapshot().status === 'flying'; i++) sim.step();
      const shoes = sim.getShoes();
      const score = scoreInning(shoes);
      const own = score.shoes.filter((s) => s.player === delivery.player && !s.foul);
      const distance = Math.min(4, ...own.map((s) => s.distance));
      const value = 100 * (score.points[delivery.player] - score.points[1 - delivery.player])
        + own.filter((s) => s.ringer).length * 5 - distance;
      if (!best || value > best.value) best = { controls, value, predicted: shoes };
    } finally { sim.dispose(); }
  }
  return { ...best, candidates: candidates(difficulty).length, milliseconds: performance.now() - started };
}
