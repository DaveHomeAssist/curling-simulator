import { describe, expect, it } from 'vitest';
import { CHALLENGES } from './challenges.js';

describe('CHALLENGES', () => {
  it('exports twenty challenge definitions with the requested mix', () => {
    expect(CHALLENGES).toHaveLength(20);

    const counts = CHALLENGES.reduce(
      (acc, challenge) => {
        acc[challenge.shotType] = (acc[challenge.shotType] ?? 0) + 1;
        return acc;
      },
      {},
    );

    expect(counts).toEqual({
      draw: 5,
      takeout: 5,
      guard: 3,
      freeze: 3,
      'hit-and-roll': 2,
      peel: 2,
    });
  });

  it('keeps every challenge structurally complete and monotonic thresholds', () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.id).toEqual(expect.any(String));
      expect(challenge.name).toEqual(expect.any(String));
      expect(challenge.description).toEqual(expect.any(String));
      expect(Array.isArray(challenge.setupStones)).toBe(true);
      expect(challenge.target).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          radius: expect.any(Number),
        }),
      );
      expect(challenge.par).toEqual(expect.any(Number));
      expect(challenge.thresholds.gold).toBeLessThan(challenge.thresholds.silver);
      expect(challenge.thresholds.silver).toBeLessThan(challenge.thresholds.bronze);
    }
  });
});
