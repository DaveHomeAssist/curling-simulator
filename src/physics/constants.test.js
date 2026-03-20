import { describe, expect, it } from 'vitest';
import { PHYSICS, SHEET } from './constants.js';

describe('constants', () => {
  it('exposes frozen sheet and physics constants', () => {
    expect(Object.isFrozen(SHEET)).toBe(true);
    expect(Object.isFrozen(PHYSICS)).toBe(true);
    expect(SHEET.TEE_Y).toBe(23.47);
    expect(SHEET.HOUSE_RADIUS).toBe(1.83);
    expect(PHYSICS.RESTITUTION).toBeCloseTo(0.92);
    expect(PHYSICS.STONE_RADIUS).toBeGreaterThan(0.1);
  });

  it('rejects mutation attempts in practice', () => {
    expect(() => {
      SHEET.TEE_Y = 99;
    }).toThrow();
  });
});
