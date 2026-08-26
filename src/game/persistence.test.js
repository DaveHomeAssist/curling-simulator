import { describe, expect, it } from 'vitest';
import { buildStone } from '../test/buildStone.js';
import { createGameState, startMode } from './state.js';
import {
  STORAGE_KEY,
  applySnapshot,
  buildSnapshot,
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from './persistence.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    map,
  };
}

describe('session persistence', () => {
  it('round-trips a mid-match exhibition through JSON', () => {
    const state = createGameState();
    startMode(state, 'exhibition');
    state.end = 4;
    state.totalScore = { red: 3, yel: 5 };
    state.scoreByEnd = { red: [1, 0, 2], yel: [0, 3, 2] };
    state.hammerTeam = 'red';
    state.currentTeam = 'yel';
    state.shotNumber = 6;
    state.stonesRemainingByTeam = { red: 5, yel: 5 };
    state.stones = [
      buildStone({ id: 'red-0', team: 'red', x: 0.2, y: 23.1, moving: false }),
      buildStone({ id: 'yel-1', idx: 1, team: 'yel', x: -0.4, y: 22.6, moving: false, removed: true, inPlay: false }),
    ];
    state.audio.enabled = false;

    const snapshot = JSON.parse(JSON.stringify(buildSnapshot(state)));
    const restored = applySnapshot(createGameState(), snapshot);

    expect(restored.gameMode).toBe('exhibition');
    expect(restored.end).toBe(4);
    expect(restored.totalScore).toEqual({ red: 3, yel: 5 });
    expect(restored.scoreByEnd).toEqual({ red: [1, 0, 2], yel: [0, 3, 2] });
    expect(restored.hammerTeam).toBe('red');
    expect(restored.currentTeam).toBe('yel');
    expect(restored.stonesRemainingByTeam).toEqual({ red: 5, yel: 5 });
    expect(restored.stones).toHaveLength(2);
    expect(restored.stones[0]).toMatchObject({ id: 'red-0', x: 0.2, y: 23.1, moving: false, vx: 0, vy: 0 });
    expect(restored.stones[1]).toMatchObject({ removed: true, inPlay: false });
    expect(restored.audio.enabled).toBe(false);
    expect(restored.mode).toBe('aim');
    expect(restored.canThrow).toBe(true);
    expect(restored.ai.enabled).toBe(true);
  });

  it('preserves tournament bracket progress and challenge medals', () => {
    const state = createGameState();
    startMode(state, 'tournament');
    state.tournament.round = 2;
    state.tournament.wins = { 'Crimson Skip': 1, 'Northern Pebble': 1 };
    state.tournament.eliminated = ['Golden Sweep', 'Stone Lake'];
    state.tournament.opponent = 'Northern Pebble';
    state.stats.bestChallenge = { 'draw-01': 0.09 };

    const snapshot = JSON.parse(JSON.stringify(buildSnapshot(state)));
    const restored = applySnapshot(createGameState(), snapshot);

    expect(restored.gameMode).toBe('tournament');
    expect(restored.tournament.round).toBe(2);
    expect(restored.tournament.wins).toEqual({ 'Crimson Skip': 1, 'Northern Pebble': 1 });
    expect(restored.tournament.opponent).toBe('Northern Pebble');
    expect(restored.teams.red.name).toBe('Crimson Skip');
    expect(restored.stats.bestChallenge).toEqual({ 'draw-01': 0.09 });
  });

  it('does not snapshot mid-travel or multiplayer sessions', () => {
    const state = createGameState();
    startMode(state, 'exhibition');
    state.mode = 'travel';
    expect(buildSnapshot(state)).toBeNull();

    const mp = createGameState();
    startMode(mp, 'multiplayer');
    expect(buildSnapshot(mp)).toBeNull();
  });

  it('saves, loads, and clears through a storage backend', () => {
    const storage = fakeStorage();
    const state = createGameState();
    startMode(state, 'exhibition');
    state.totalScore = { red: 2, yel: 1 };

    expect(saveSnapshot(state, storage)).toBe(true);
    const loaded = loadSnapshot(storage);
    expect(loaded.totalScore).toEqual({ red: 2, yel: 1 });

    clearSnapshot(storage);
    expect(loadSnapshot(storage)).toBeNull();
  });

  it('rejects corrupt or wrong-version payloads', () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadSnapshot(storage)).toBeNull();

    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, gameMode: 'exhibition', stones: [] }));
    expect(loadSnapshot(storage)).toBeNull();

    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, gameMode: 'exhibition', stones: 'nope' }));
    expect(loadSnapshot(storage)).toBeNull();
  });
});
