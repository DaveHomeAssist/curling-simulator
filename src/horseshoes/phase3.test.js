import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { createPracticePhysics } from './physics.js';
import { createLaunchCommand } from './launch.js';
import { planThrow, candidates } from './ai.js';
import { createReplay } from './replay.js';
import { createImpactFilter } from './audio.js';

beforeAll(async () => { await RAPIER.init(); });
const controls = { aimDeg: 0, strength: 50, arc: 'normal', style: 'turn' };
function settle(sim) { for (let i = 0; i < 1441 && sim.snapshot().status === 'flying'; i++) sim.step(); }

describe('Phase 3 shared simulation', () => {
  it('clones occupied and removed-foul state and predicts an identical physical throw', () => {
    const live = createPracticePhysics(RAPIER, { retainShoes: true });
    let clone;
    try {
      live.spawnShoe({ ...createLaunchCommand(controls), id: 0, player: 0 }); settle(live);
      live.spawnShoe({ ...createLaunchCommand({ ...controls, strength: 0 }), id: 1, player: 0 }); settle(live); live.removeFouls();
      const before = live.getShoes();
      expect(before[0].removed).toBe(false); expect(before[1].removed).toBe(true);
      clone = createPracticePhysics(RAPIER, { saved: live.exportState(), retainShoes: true });
      expect(clone.getShoes()).toEqual(before);
      const command = { ...createLaunchCommand(controls), id: 2, player: 1 };
      for (const sim of [live, clone]) { sim.spawnShoe(command); settle(sim); }
      expect(clone.getShoes()).toEqual(live.getShoes());
    } finally { clone?.dispose(); live.dispose(); }
  });
  it('searches real candidates without changing the source world', () => {
    const live = createPracticePhysics(RAPIER, { retainShoes: true });
    try {
      const before = live.snapshot();
      const result = planThrow(RAPIER, live.exportState(), { id: 0, player: 1 }, 'normal');
      expect(result.candidates).toBe(12); expect(candidates('easy')).toHaveLength(6);
      expect(live.snapshot()).toEqual(before); expect(live.getShoes()).toEqual([]);
      live.spawnShoe({ ...createLaunchCommand(result.controls), id: 0, player: 1 }); settle(live);
      expect(live.getShoes()).toEqual(result.predicted);
      expect(result.value).toBeGreaterThan(90);
    } finally { live.dispose(); }
  });
  it('emits real impact categories and no resting chatter', () => {
    const sim = createPracticePhysics(RAPIER, { retainShoes: true });
    try {
      sim.spawnShoe({ ...createLaunchCommand(controls), id: 0, player: 0 }); settle(sim);
      const first = sim.drainImpacts(); expect(first.some((e) => e.type === 'ground')).toBe(true);
      sim.spawnShoe({ ...createLaunchCommand(controls), id: 1, player: 1 }); settle(sim);
      expect(sim.drainImpacts().some((e) => e.type === 'shoe')).toBe(true);
      for (let i = 0; i < 240; i++) sim.step();
      expect(sim.drainImpacts()).toEqual([]);
    } finally { sim.dispose(); }
  });
});

it('aggregates compound contacts and rejects quiet repeated impacts', () => {
  const filter = createImpactFilter();
  expect(filter.select([{ type: 'stake', speed: 3, time: 1 }, { type: 'stake', speed: 5, time: 1 }])).toEqual([{ type: 'stake', speed: 5, time: 1 }]);
  expect(filter.select([{ type: 'stake', speed: 3, time: 1.05 }, { type: 'ground', speed: 0.1, time: 2 }])).toEqual([]);
  expect(filter.select([{ type: 'shoe', speed: 3, time: 2 }])).toHaveLength(1);
  filter.reset(); expect(filter.select([{ type: 'stake', speed: 2, time: 0 }])).toHaveLength(1);
});

it('bounds replay, isolates frames, preserves best and clears on restart', () => {
  const replay = createReplay();
  const frame = { position: { x: 1 }, shoes: [{ id: 1 }] };
  replay.begin(frame, 1);
  for (let i = 0; i < 500; i++) replay.capture(frame);
  replay.finish(frame, 3); frame.position.x = 100;
  expect(replay.start('best')).toBe(true); expect(replay.end()).toBe(1);
  expect(replay.snapshot().duration).toBeLessThanOrEqual(12.1);
  expect(replay.frame().position.x).toBe(1);
  replay.seek(0.5); expect(replay.snapshot().paused).toBe(true);
  const time = replay.snapshot().time; replay.step(1); expect(replay.snapshot().time).toBe(time);
  replay.pause(); replay.step(1); expect(replay.snapshot().time).toBeGreaterThan(time);
  replay.exit(); expect(replay.snapshot().active).toBe(false);
  replay.begin({ position: { x: 2 } }, 0); replay.finish({ position: { x: 3 } }, 1);
  replay.start('best'); expect(replay.frame().position.x).toBe(1);
  replay.clear(); expect(replay.start()).toBe(false);
});
