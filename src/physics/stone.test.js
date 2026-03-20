import { describe, expect, it } from 'vitest';
import { PHYSICS } from './constants.js';
import { createStone, stepPhysics } from './stone.js';
import { approxEqual } from '../test/approx.js';
import { buildStone } from '../test/buildStone.js';

describe('stone', () => {
  it('creates a deterministic stone shape', () => {
    const stone = createStone(-0.25, 2.5, 1.2, 'red', 3);

    expect(stone.id).toBe('red-3');
    expect(stone.team).toBe('red');
    expect(stone.idx).toBe(3);
    expect(stone.radius).toBe(PHYSICS.STONE_RADIUS);
    expect(stone.y).toBe(0);
    expect(stone.vy).toBe(2.5);
  });

  it('steps forward and curls sideways while preserving in-place mutation', () => {
    const stone = buildStone({ x: 0, y: 0, vx: 0, vy: 2, omega: 1.5 });
    const before = { ...stone };
    const result = stepPhysics(stone, 0.5, false);

    expect(result).toBe(stone);
    expect(stone).not.toEqual(before);
    expect(stone.y).toBeGreaterThan(0);
    expect(stone.x).toBeGreaterThan(0);
    expect(stone.moving).toBe(true);
  });

  it('moves less when sweeping is active', () => {
    const swept = buildStone({ x: 0, y: 0, vx: 0, vy: 2, omega: 0.5 });
    const unswept = buildStone({ x: 0, y: 0, vx: 0, vy: 2, omega: 0.5 });

    stepPhysics(swept, 1, true);
    stepPhysics(unswept, 1, false);

    expect(swept.y).toBeGreaterThan(unswept.y);
    expect(swept.vy).toBeGreaterThan(unswept.vy);
  });

  it('stops low-energy stones deterministically', () => {
    const stone = buildStone({ vx: 0.01, vy: 0.01, omega: 0.01 });
    stepPhysics(stone, 0.25, false);
    expect(stone.moving).toBe(false);
    expect(approxEqual(stone.vx, 0)).toBe(true);
    expect(approxEqual(stone.vy, 0)).toBe(true);
  });
});
