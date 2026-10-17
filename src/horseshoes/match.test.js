import { describe, expect, it } from 'vitest';
import { createMatch } from './match.js';
import { classifyShoe, scoreInning, COUNT_DISTANCE } from './scoring.js';
import { COURT, SHOE } from './config.js';
const q = { x: 0, y: 0, z: 0, w: 1 };
const shoe = (id, player, x = 0, z = COURT.stakeDistance, extra = {}) => ({
  id,
  player,
  position: { x, y: COURT.pitTop + SHOE.height / 2, z },
  rotation: q,
  ...extra,
});
const foul = (id, player) =>
  shoe(id, player, 0, COURT.stakeDistance, { foul: true });
const close = (id, player, gap) =>
  shoe(
    id,
    player,
    SHOE.width / 2 + COURT.stakeRadius + gap,
    COURT.stakeDistance - 0.04,
  );
describe('final arrangement scoring', () => {
  it('scores 3, 4 and 6 with final geometry', () => {
    expect(
      scoreInning([shoe(0, 0), foul(1, 0), foul(2, 1), foul(3, 1)]).points,
    ).toEqual([3, 0]);
    expect(
      scoreInning([shoe(0, 0), close(1, 0, 0.03), foul(2, 1), foul(3, 1)])
        .points,
    ).toEqual([4, 0]);
    expect(
      scoreInning([shoe(0, 0), shoe(1, 0), foul(2, 1), foul(3, 1)]).points,
    ).toEqual([6, 0]);
  });
  it('cancels opposing ringers and scores remaining closest', () => {
    const result = scoreInning([
      shoe(0, 0),
      close(1, 0, 0.03),
      shoe(2, 1),
      close(3, 1, 0.08),
    ]);
    expect(result.points).toEqual([1, 0]);
    expect(result.cancelledRingers).toBe(2);
  });
  it('awards two closest shoes, not a subtraction of raw totals', () => {
    expect(
      scoreInning([
        close(0, 0, 0.01),
        close(1, 0, 0.02),
        close(2, 1, 0.08),
        close(3, 1, 0.09),
      ]).points,
    ).toEqual([2, 0]);
  });
  it('cancels equal opposing distances and checks the next closest', () => {
    expect(
      scoreInning([
        close(0, 0, 0.02),
        close(1, 0, 0.04),
        close(2, 1, 0.02),
        foul(3, 1),
      ]).points,
    ).toEqual([1, 0]);
  });
  it('includes six inches and excludes beyond it', () => {
    expect(classifyShoe(close(0, 0, COUNT_DISTANCE)).distance).toBeCloseTo(
      COUNT_DISTANCE,
      5,
    );
    expect(scoreInning([close(0, 0, COUNT_DISTANCE)]).points).toEqual([1, 0]);
    expect(scoreInning([close(0, 0, COUNT_DISTANCE + 0.001)]).points).toEqual([
      0, 0,
    ]);
  });
  it('rejects touching heel line and a stake above the shoe', () => {
    const level = COURT.pitTop + SHOE.height / 2;
    const stakeZ =
      COURT.stakeDistance - Math.tan(COURT.stakeLean) * (level - COURT.pitTop);
    expect(
      classifyShoe(shoe(0, 0, 0, stakeZ - SHOE.length / 2 + COURT.stakeRadius))
        .ringer,
    ).toBe(false);
    expect(
      classifyShoe(
        shoe(0, 0, 0, COURT.stakeDistance, {
          position: { x: 0, y: 1, z: COURT.stakeDistance },
        }),
      ).ringer,
    ).toBe(false);
  });
  it('excludes a foul bounced into a ringer and reevaluates displaced ringers', () => {
    expect(classifyShoe(foul(0, 0)).ringer).toBe(false);
    expect(classifyShoe(shoe(0, 0)).ringer).toBe(true);
    expect(classifyShoe(shoe(0, 0, 0.4)).ringer).toBe(false);
  });
});
describe('local match', () => {
  it('delivers two per player, rejects overlap, scores only at fourth rest, reverses ends and completes', () => {
    const match = createMatch();
    const arrangement = [shoe(0, 0), shoe(1, 0), foul(2, 1), foul(3, 1)];
    for (let inning = 1; inning <= 4; inning++) {
      for (let n = 0; n < 4; n++) {
        expect(match.launch().player).toBe(n < 2 ? 0 : 1);
        expect(match.launch()).toBe(null);
        match.settle(arrangement.slice(0, n + 1));
        if (n < 3)
          expect(match.snapshot().scores).toEqual([(inning - 1) * 6, 0]);
      }
      expect(match.settle(arrangement)).toBe(false);
      if (inning < 4) {
        expect(match.nextInning()).toBe(true);
        expect(match.snapshot().end).toBe(inning % 2);
      }
    }
    expect(match.snapshot().winner).toBe(0);
    expect(match.snapshot().scores).toEqual([24, 0]);
    expect(match.launch()).toBe(null);
    expect(match.nextInning()).toBe(false);
    match.restart();
    expect(match.snapshot()).toMatchObject({
      scores: [0, 0],
      inning: 1,
      delivered: 0,
      phase: 'ready',
      history: [],
    });
  });
  it('lets the scoring player lead the next inning', () => {
    const match = createMatch();
    for (let n = 0; n < 4; n++) {
      match.launch();
      match.settle([foul(0, 0), foul(1, 0), shoe(2, 1), foul(3, 1)]);
    }
    match.nextInning();
    expect(match.launch().player).toBe(1);
  });
});
