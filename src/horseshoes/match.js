import { scoreInning } from './scoring.js';

export function createMatch() {
  let state;
  function restart() {
    state = {
      inning: 1,
      end: 0,
      leader: 0,
      player: 0,
      delivered: 0,
      phase: 'ready',
      scores: [0, 0],
      history: [],
      result: null,
      winner: null,
    };
  }
  restart();
  return {
    snapshot: () => structuredClone(state),
    restart,
    launch() {
      if (state.phase !== 'ready') return null;
      const delivery = { id: state.delivered, player: state.player };
      state.delivered++;
      state.phase = 'flying';
      return delivery;
    },
    settle(shoes) {
      if (state.phase !== 'flying') return false;
      if (state.delivered < 4) {
        state.player = state.delivered < 2 ? state.leader : 1 - state.leader;
        state.phase = 'ready';
      } else {
        state.result = scoreInning(shoes);
        state.scores = state.scores.map(
          (score, player) => score + state.result.points[player],
        );
        state.history.push({
          inning: state.inning,
          end: state.end,
          points: [...state.result.points],
          scores: [...state.scores],
          summary: state.result.summary,
        });
        state.winner = state.scores.findIndex((score) => score >= 21);
        if (state.winner < 0) state.winner = null;
        state.phase = state.winner === null ? 'inning' : 'complete';
      }
      return true;
    },
    nextInning() {
      if (state.phase !== 'inning') return false;
      if (state.result.points[0]) state.leader = 0;
      if (state.result.points[1]) state.leader = 1;
      state.inning++;
      state.end = 1 - state.end;
      state.player = state.leader;
      state.delivered = 0;
      state.result = null;
      state.phase = 'ready';
      return true;
    },
  };
}
