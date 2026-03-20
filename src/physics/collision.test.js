import { describe, expect, it } from 'vitest';
import { checkCollisions, resolveChain } from './collision.js';
import { buildStone } from '../test/buildStone.js';
import { makeHeadOnPair } from '../test/fixtures.js';
import { approxEqual } from '../test/approx.js';

describe('collision', () => {
  it('resolves a direct overlap with an impulse event', () => {
    const moving = buildStone({ id: 'moving', x: 0, y: 0, vx: 1, vy: 0 });
    const other = buildStone({ id: 'other', x: 0.25, y: 0, vx: 0, vy: 0, moving: false });
    const events = checkCollisions(moving, [moving, other]);

    expect(events.length).toBeGreaterThan(0);
    expect(moving.vx).toBeLessThan(1);
    expect(other.vx).toBeGreaterThan(0);
  });

  it('propagates chain contacts without reordering the array', () => {
    const world = [
      buildStone({ id: 'a', x: 0, y: 0, vx: 1, vy: 0 }),
      buildStone({ id: 'b', x: 0.27, y: 0, vx: 0, vy: 0, moving: false }),
      buildStone({ id: 'c', x: 0.54, y: 0, vx: 0, vy: 0, moving: false }),
    ];
    const beforeIds = world.map((stone) => stone.id);
    const events = resolveChain(world);

    expect(world.map((stone) => stone.id)).toEqual(beforeIds);
    expect(events.length).toBeGreaterThan(0);
    expect(world.some((stone) => stone.vx !== 0)).toBe(true);
  });

  it('supports the fixture pair scenario', () => {
    const [moving, stationary] = makeHeadOnPair();
    const events = checkCollisions(moving, [moving, stationary]);

    expect(events.length).toBeGreaterThan(0);
    expect(approxEqual(moving.vy, 1.6)).toBe(false);
  });
});
