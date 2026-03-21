import { describe, expect, it } from 'vitest';
import { evaluateShot } from './evaluator.js';

describe('evaluateShot', () => {
  it('scores a draw without mutating the input stones', () => {
    const stones = [
      { id: 1, team: 'red', x: 0.05, y: 23.25, inPlay: true },
      { id: 2, team: 'yel', x: 0.4, y: 23.3, inPlay: true },
    ];
    const snapshot = JSON.parse(JSON.stringify(stones));
    const runner = () => ({
      releasedStoneId: 1,
      stones: [
        { id: 1, team: 'red', x: 0.01, y: 23.48, inPlay: true },
        { id: 2, team: 'yel', x: 0.4, y: 23.3, inPlay: true },
      ],
      trajectory: [{ x: 0.01, y: 23.48, vx: 0, vy: 0, t: 3.2 }],
    });

    const result = evaluateShot(stones, 0.1, 3.2, 1, 'red', runner);

    expect(stones).toEqual(snapshot);
    expect(result).toEqual({
      value: 230, // boardDelta(1)*140 + teamInHouse(1)*30 + proximity bonus 60
      type: 'draw',
      finalPos: { x: 0.01, y: 23.48 },
      stonesRemoved: 0,
      ownStonesRemoved: 0,
      teamStonesInHouse: 1,
    });
  });

  it('classifies a takeout when the shot removes an opponent stone', () => {
    const stones = [
      { id: 1, team: 'red', x: 0, y: 20, inPlay: true },
      { id: 2, team: 'yel', x: 0.1, y: 20.1, inPlay: true },
    ];
    const runner = () => ({
      releasedStoneId: 1,
      stones: [
        { id: 1, team: 'red', x: 0.2, y: 21.2, inPlay: true },
        { id: 2, team: 'yel', x: 0.1, y: 20.1, removed: true, inPlay: false },
      ],
      trajectory: [{ x: 0.2, y: 21.2, vx: 0, vy: 0, t: 2.4 }],
    });

    const result = evaluateShot(stones, 0.2, 4.1, -1, 'red', runner);

    expect(result.type).toBe('takeout');
    expect(result.stonesRemoved).toBe(1);
    expect(result.ownStonesRemoved).toBe(0);
    expect(result.value).toBe(125); // takeout bonus + board position delta
  });
});
