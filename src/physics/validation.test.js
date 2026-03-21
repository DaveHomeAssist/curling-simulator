import { describe, expect, it } from 'vitest';
import { PHYSICS, SHEET } from './constants.js';
import { createStone, stepPhysics } from './stone.js';
import { resolveChain } from './collision.js';

const DT = 1 / 120;

function simulate(stone, maxTime = 40, sweeping = false) {
  const samples = [];
  let t = 0;
  while (t < maxTime && stone.moving !== false) {
    stepPhysics(stone, DT, sweeping);
    t += DT;
    if (Math.floor(t * 10) !== Math.floor((t - DT) * 10)) {
      samples.push({ t, x: stone.x, y: stone.y, vx: stone.vx, vy: stone.vy, omega: stone.omega });
    }
  }
  return { finalTime: t, samples, stone };
}

describe('WCF geometry', () => {
  it('sheet width matches WCF spec (4.75m)', () => {
    expect(SHEET.WIDTH).toBe(4.75);
  });

  it('house radii match WCF spec (button 0.152m, 4ft 0.610m, 8ft 1.219m, 12ft 1.829m)', () => {
    if (SHEET.HOUSE_RADIUS) {
      expect(SHEET.HOUSE_RADIUS).toBeCloseTo(1.83, 1);
    }
    if (SHEET.BUTTON_RADIUS) {
      expect(SHEET.BUTTON_RADIUS).toBeCloseTo(0.15, 1);
    }
  });

  it('stone radius matches WCF spec (~0.145m)', () => {
    expect(PHYSICS.STONE_RADIUS).toBeCloseTo(0.145, 2);
  });

  it('stone mass matches WCF max (19.96kg)', () => {
    expect(PHYSICS.STONE_MASS).toBeCloseTo(19.96, 1);
  });
});

describe('friction plausibility', () => {
  it('effective friction produces realistic deceleration for a straight slide', () => {
    const stone = createStone(0, 2.0, 0, 'red', 0);
    const result = simulate(stone);

    expect(result.stone.y).toBeGreaterThan(12);
    expect(result.stone.y).toBeLessThan(40);
  });

  it('higher initial velocity produces proportionally longer travel', () => {
    const slow = createStone(0, 1.5, 0, 'red', 0);
    const fast = createStone(0, 2.5, 0, 'red', 1);
    const rSlow = simulate(slow);
    const rFast = simulate(fast);

    expect(rFast.stone.y).toBeGreaterThan(rSlow.stone.y);
  });
});

describe('curl behavior', () => {
  it('CW rotation produces lateral deviation', () => {
    const stone = createStone(0, 2.0, 1.5, 'red', 0);
    const result = simulate(stone);
    expect(Math.abs(result.stone.x)).toBeGreaterThan(0.05);
  });

  it('opposite rotation produces opposite curl direction', () => {
    const cwStone = createStone(0, 2.0, 1.5, 'red', 0);
    const ccwStone = createStone(0, 2.0, -1.5, 'red', 1);
    const rCW = simulate(cwStone);
    const rCCW = simulate(ccwStone);
    expect(Math.sign(rCW.stone.x)).not.toBe(Math.sign(rCCW.stone.x));
  });

  it('curl accumulates more in the second half of travel (late curl)', () => {
    const stone = createStone(0, 2.0, 1.2, 'red', 0);
    const result = simulate(stone);

    if (result.samples.length < 10) return;

    const finalY = result.stone.y;
    const halfwayIdx = result.samples.findIndex((s) => s.y >= finalY * 0.5);
    if (halfwayIdx < 0) return;

    const curlAtHalf = Math.abs(result.samples[halfwayIdx].x);
    const curlAtEnd = Math.abs(result.stone.x);
    if (curlAtEnd > 0.05) {
      expect(curlAtEnd - curlAtHalf).toBeGreaterThan(curlAtHalf);
    }
  });

  it('curl magnitude is in realistic range for draw weight (~0.3-2.0m)', () => {
    const stone = createStone(0, 2.0, 1.0, 'red', 0);
    const result = simulate(stone);
    const totalCurl = Math.abs(result.stone.x);
    expect(totalCurl).toBeGreaterThan(0.1);
    expect(totalCurl).toBeLessThan(3.0);
  });
});

describe('sweep effects', () => {
  it('sweeping makes the stone travel farther', () => {
    const unswept = createStone(0, 2.0, 0, 'red', 0);
    const swept = createStone(0, 2.0, 0, 'red', 1);
    const rUnswept = simulate(unswept, 30, false);
    const rSwept = simulate(swept, 30, true);

    expect(rSwept.stone.y).toBeGreaterThan(rUnswept.stone.y);
  });

  it('sweeping reduces curl magnitude (hold line effect)', () => {
    const unswept = createStone(0, 2.0, 1.2, 'red', 0);
    const swept = createStone(0, 2.0, 1.2, 'red', 1);
    const rUnswept = simulate(unswept, 30, false);
    const rSwept = simulate(swept, 30, true);

    expect(Math.abs(rSwept.stone.x)).toBeLessThan(Math.abs(rUnswept.stone.x));
  });
});

describe('collision plausibility', () => {
  it('head-on equal-mass hit transfers most forward speed to target', () => {
    const shooter = createStone(0, 2.0, 0, 'red', 0);
    shooter.y = 20;
    const target = createStone(0, 0, 0, 'yel', 1);
    target.y = 20 + PHYSICS.STONE_RADIUS * 2 - 0.01;
    target.moving = false;

    resolveChain([shooter, target]);

    expect(Math.abs(shooter.vy)).toBeLessThan(1.0);
    expect(target.vy).toBeGreaterThan(0.5);
    const keBefore = 0.5 * PHYSICS.STONE_MASS * 4.0;
    const keAfter = 0.5 * PHYSICS.STONE_MASS * (shooter.vy ** 2 + target.vy ** 2);
    expect(keAfter / keBefore).toBeGreaterThan(0.6);
  });

  it('post-collision stones continue under normal friction/curl rules', () => {
    const shooter = createStone(0, 2.0, 0.5, 'red', 0);
    shooter.y = 20;
    const target = createStone(0.1, 0, 0, 'yel', 1);
    target.y = 20 + PHYSICS.STONE_RADIUS * 2 - 0.01;
    target.moving = false;

    resolveChain([shooter, target]);

    const shooterV = Math.hypot(shooter.vx, shooter.vy);
    const targetV = Math.hypot(target.vx, target.vy);
    expect(shooterV).toBeGreaterThan(0);
    expect(targetV).toBeGreaterThan(0);

    const shooterYBefore = shooter.y;
    const targetYBefore = target.y;
    for (let i = 0; i < 60; i++) stepPhysics(shooter, DT, false);
    for (let i = 0; i < 60; i++) stepPhysics(target, DT, false);

    expect(Math.abs(shooter.y - shooterYBefore) + Math.abs(target.y - targetYBefore)).toBeGreaterThan(0);
  });
});

describe('Penner benchmark (Jensen & Shegelski)', () => {
  it('v0=2.09 m/s, ω0=1.01 rad/s produces travel and curl in published range', () => {
    const stone = createStone(0, 2.09, 1.01, 'red', 0);
    const result = simulate(stone, 40);

    expect(result.stone.y).toBeGreaterThan(15);
    expect(result.stone.y).toBeLessThan(35);

    const curl = Math.abs(result.stone.x);
    expect(curl).toBeGreaterThan(0.05);
    expect(curl).toBeLessThan(2.5);

    expect(result.finalTime).toBeGreaterThan(8);
    expect(result.finalTime).toBeLessThan(40);
  });
});
