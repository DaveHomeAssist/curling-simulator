import { describe, it, expect } from 'vitest';
import { syncAiShot, prepareNextEnd, createGameState, startMode, releaseShot, setAim, setPowerCharge, setSpin, setWeightPreset, setCameraMode } from './state.js';
import { createLoop } from './loop.js';

describe('curling stress regression', () => {
  it('settles 2,200 delivery combinations with finite coordinates and no stuck travel', () => {
    const presets = ['draw', 'guard', 'freeze', 'takeout', 'peel'];
    for (let n = 0; n < 2200; n++) {
      const state = createGameState();
      startMode(state, 'practice');
      setWeightPreset(state, presets[n % 5]);
      setAim(state, (Math.floor(n / 5) % 11 - 5) * 0.9);
      setSpin(state, Math.floor(n / 55) % 2 ? 1 : -1);
      setPowerCharge(state, (Math.floor(n / 110) % 10) / 9);
      const loop = createLoop(state, {});
      expect(releaseShot(state, 0)).toBeTruthy();
      state.sweeping = Math.floor(n / 1100) % 2 === 0;
      loop.step(90000);
      expect(state.mode, `delivery ${n}`).not.toBe('travel');
      expect(state.shotNumber).toBe(1);
      for (const stone of state.stones) {
        for (const key of ['x', 'y', 'vx', 'vy']) expect(Number.isFinite(stone[key])).toBe(true);
      }
    }
  }, 60000);
  it('resets delivery numbering and lets the non-hammer team lead each new end', () => {
    const state = createGameState();
    startMode(state, 'multiplayer');
    const loop = createLoop(state, {});
    for (let end = 1; end <= 3; end++) {
      for (let shot = 0; shot < 16; shot++) {
        setPowerCharge(state, 0.1);
        releaseShot(state, 0);
        loop.step(90000);
      }
      expect(state.end).toBe(end + 1);
      expect(state.shotNumber).toBe(0);
      expect(state.currentTeam).not.toBe(state.hammerTeam);
      expect(state.stonesRemainingByTeam).toEqual({red:8,yel:8});
    }
  });
  it('gives red hammer the last stone in a new end', () => {
    const state = createGameState();
    state.hammerTeam = 'red';
    prepareNextEnd(state);
    expect(state.currentTeam).toBe('yel');
  });
  it('completes an AI reply and returns control to the human', () => {
    const state = createGameState();
    startMode(state, 'exhibition');
    state.ai.difficulty = 'easy';
    releaseShot(state, 0);
    createLoop(state, {}).step(120000);
    expect(state.shotNumber).toBe(2);
    expect(state.currentTeam).toBe('red');
    expect(state.canThrow).toBe(true);
  }, 15000);
  it('lands default draw weight in the house on fresh ice', () => {
    const state = createGameState(); startMode(state, 'practice');
    releaseShot(state); createLoop(state, {}).step(90000);
    const stone = state.stones[0];
    expect(stone.removed).toBe(false);
    expect(Math.hypot(stone.x, stone.y - 23.47)).toBeLessThan(1.83);
  });
  it('launches an AI delivery at the speed it evaluated', () => {
    const state = createGameState();
    syncAiShot(state, {aimX:0, spin:1, weightPreset:'draw', velocity:1.97});
    const stone = releaseShot(state);
    expect(stone.vy).toBeCloseTo(1.97, 10);
  });
  it('keeps the selected free camera through collisions and settling', () => {
    const state = createGameState();
    startMode(state, 'practice');
    setCameraMode(state, 'free');
    releaseShot(state, 0);
    createLoop(state, {}).step(90000);
    expect(state.preferredCameraMode).toBe('free');
  });
});
