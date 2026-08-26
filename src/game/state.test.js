import { beforeEach, describe, expect, it } from 'vitest';
import { createGameState, finalizeTravel, prepareNextEnd, releaseShot, seedChallenge, startMode } from './state.js';
import { CHALLENGES } from './challenges.js';

function settleDeliveredStoneAt(state, x, y) {
  const stone = state.stones.find((entry) => entry.id === state.lastReleased);
  stone.x = x;
  stone.y = y;
  stone.vx = 0;
  stone.vy = 0;
  stone.moving = false;
  return stone;
}

describe('shot challenge flow', () => {
  let state;

  beforeEach(() => {
    state = createGameState();
    startMode(state, 'challenge');
  });

  it('keeps the drill, medal, and end intact after the single delivery', () => {
    const challenge = CHALLENGES.find((entry) => entry.id === state.selectedChallengeId);
    releaseShot(state, 1000);
    settleDeliveredStoneAt(state, challenge.target.x, challenge.target.y);

    finalizeTravel(state, 2000);

    expect(state.end).toBe(1);
    expect(state.gameMode).toBe('challenge');
    expect(state.challengeMedal).toBe('gold');
    expect(state.challengeSummary).toContain('from call');
    expect(state.stones).toHaveLength(1);
    expect(state.canThrow).toBe(false);
    expect(state.stonesRemainingByTeam).toEqual({ red: 0, yel: 0 });
    expect(state.resultChip.title).toBe('GOLD MEDAL');
  });

  it('records a miss without wiping the result', () => {
    releaseShot(state, 1000);
    settleDeliveredStoneAt(state, 1.8, 12);

    finalizeTravel(state, 2000);

    expect(state.challengeMedal).toBe('none');
    expect(state.resultChip.title).toBe('NO MEDAL');
    expect(state.end).toBe(1);
  });

  it('restores the drill setup and inventory on retry', () => {
    releaseShot(state, 1000);
    settleDeliveredStoneAt(state, 0, 23.47);
    finalizeTravel(state, 2000);

    seedChallenge(state);

    const challenge = CHALLENGES.find((entry) => entry.id === state.selectedChallengeId);
    expect(state.challengeMedal).toBeNull();
    expect(state.challengeResult).toBeNull();
    expect(state.canThrow).toBe(true);
    expect(state.shotNumber).toBe(0);
    expect(state.stonesRemainingByTeam).toEqual({ red: 1, yel: 0 });
    expect(state.stones).toHaveLength(challenge.setupStones.length);
  });
});

describe('tournament bracket', () => {
  let state;

  beforeEach(() => {
    state = createGameState();
    startMode(state, 'tournament');
  });

  function finishMatch(red, yel) {
    state.end = state.maxEnds;
    state.totalScore = { red, yel };
    prepareNextEnd(state);
  }

  it('seeds a named semifinal against a bracket opponent', () => {
    expect(state.tournament.enabled).toBe(true);
    expect(state.tournament.round).toBe(1);
    expect(state.teams.red.name).toBe('Crimson Skip');
    expect(state.teams.yel.name).toBe('Golden Sweep');
    expect(state.maxEnds).toBe(6);
  });

  it('advances the winning player into a final against the other semifinal winner', () => {
    finishMatch(5, 3);

    const bracket = state.tournament;
    expect(bracket.round).toBe(2);
    expect(bracket.wins['Crimson Skip']).toBe(1);
    expect(bracket.eliminated).toContain('Golden Sweep');
    expect(['Northern Pebble', 'Stone Lake']).toContain(bracket.opponent);
    expect(state.teams.yel.name).toBe(bracket.opponent);
    expect(state.mode).toBe('aim');
    expect(state.end).toBe(1);
    expect(state.totalScore).toEqual({ red: 0, yel: 0 });
    expect(state.stones).toHaveLength(0);
  });

  it('crowns the player champion after winning the final', () => {
    finishMatch(5, 3);
    finishMatch(7, 2);

    expect(state.tournament.champion).toBe('Crimson Skip');
    expect(state.tournament.wins['Crimson Skip']).toBe(2);
    expect(state.mode).toBe('game-over');
  });

  it('eliminates the player on a semifinal loss and resolves a champion', () => {
    finishMatch(2, 5);

    const bracket = state.tournament;
    expect(state.mode).toBe('game-over');
    expect(bracket.eliminated).toContain('Crimson Skip');
    expect(bracket.champion).not.toBeNull();
    expect(bracket.champion).not.toBe('Crimson Skip');
  });

  it('plays an extra end instead of ending a tied tournament match', () => {
    finishMatch(4, 4);

    expect(state.mode).toBe('aim');
    expect(state.maxEnds).toBe(7);
    expect(state.end).toBe(7);
    expect(state.tournament.champion).toBeNull();
  });
});
