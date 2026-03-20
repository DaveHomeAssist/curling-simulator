import { describe, expect, it } from 'vitest';
import { simulateTrajectory } from './trajectory.js';
import { buildStone } from '../test/buildStone.js';
import { makeHeadOnPair } from '../test/fixtures.js';

describe('trajectory', () => {
  it('does not mutate the input stones', () => {
    const initial = buildStone({ id: 'shot', x: 0, y: 0, vy: 2, omega: 1 });
    const blockers = [buildStone({ id: 'guard', x: 0, y: 9, moving: false })];
    const snapshot = JSON.stringify({ initial, blockers });

    const result = simulateTrajectory(initial, blockers, { maxTime: 2, dt: 0.1 });

    expect(JSON.stringify({ initial, blockers })).toBe(snapshot);
    expect(result.releasedStoneId).toBe('shot');
    expect(result.trajectory.length).toBeGreaterThan(1);
    expect(result.stones.length).toBe(2);
  });

  it('records a time-ordered sample path', () => {
    const result = simulateTrajectory(
      buildStone({ id: 'shot', x: 0, y: 0, vy: 2, omega: 1 }),
      [],
      { maxTime: 1, dt: 0.25 },
    );

    expect(result.trajectory[0].t).toBe(0);
    expect(result.trajectory.at(-1).t).toBeGreaterThanOrEqual(result.trajectory[0].t);
    expect(result.elapsedTime).toBeGreaterThan(0);
  });

  it('includes collision response when another stone is in the path', () => {
    const [moving, stationary] = makeHeadOnPair();
    const result = simulateTrajectory(moving, [stationary], { maxTime: 2, dt: 0.1 });

    expect(result.stones.some((stone) => stone.id === 'yel-stop' && stone.vx !== 0)).toBe(true);
    expect(result.trajectory.some((point) => point.y > 8)).toBe(true);
  });
});
