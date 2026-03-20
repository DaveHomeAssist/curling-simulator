import { describe, expect, it } from 'vitest';
import { calcScore, distToTee, isInPlay } from './scoring.js';
import { SHEET } from './constants.js';
import { buildStone } from '../test/buildStone.js';
import { makeBlankEnd, makeScoringHouse } from '../test/fixtures.js';

describe('scoring', () => {
  it('calculates tee distance and in-play bounds', () => {
    const stone = buildStone({ x: 0, y: SHEET.TEE_Y });
    expect(distToTee(stone)).toBe(0);
    expect(isInPlay(stone)).toBe(true);
    expect(isInPlay(buildStone({ y: SHEET.HOG_LINE_Y - 0.1 }))).toBe(false);
  });

  it('returns a blank end when no stones are in the house', () => {
    expect(calcScore(makeBlankEnd())).toEqual({ team: null, points: 0 });
  });

  it('scores the closest team only for stones ahead of the opponent count', () => {
    const score = calcScore(makeScoringHouse());
    expect(score.team).toBe('red');
    expect(score.points).toBe(1);
  });

  it('ignores stones beyond the back line', () => {
    const stones = [
      buildStone({ team: 'red', x: 0.1, y: SHEET.TEE_Y + 0.05, moving: false }),
      buildStone({ team: 'yel', x: 0.2, y: SHEET.BACK_LINE_Y + 0.01, moving: false }),
    ];

    expect(calcScore(stones)).toEqual({ team: 'red', points: 1 });
  });
});
