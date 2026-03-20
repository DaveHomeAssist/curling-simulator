import { describe, expect, it } from 'vitest';
import { findBestShot } from './shotSearch.js';

describe('findBestShot', () => {
  it('returns a deterministic best shot for the same input and does not mutate stones', () => {
    const stones = [
      { id: 1, team: 'red', x: 0, y: 23.1, inPlay: true },
      { id: 2, team: 'yel', x: 0.3, y: 22.8, inPlay: true },
    ];
    const snapshot = JSON.parse(JSON.stringify(stones));
    const evaluate = (_, aimX, velocity, spin) => ({
      value: Math.round(aimX * 100) + Math.round(velocity * 10) + spin,
      type: spin > 0 ? 'draw' : 'guard',
      finalPos: { x: aimX, y: velocity },
      stonesRemoved: 0,
      ownStonesRemoved: 0,
      teamStonesInHouse: 0,
    });

    const first = findBestShot(stones, 'red', 'club', evaluate);
    const second = findBestShot(stones, 'red', 'club', evaluate);

    expect(stones).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      spin: 1,
      shotType: 'draw',
    });
    expect(typeof first.aimX).toBe('number');
    expect(typeof first.velocity).toBe('number');
    expect(typeof first.expectedScore).toBe('number');
  });
});
