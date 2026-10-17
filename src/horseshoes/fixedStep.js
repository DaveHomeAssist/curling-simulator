import { FIXED_STEP } from './config.js';

export function createFixedStepRunner(update, step = FIXED_STEP) {
  let accumulator = 0;

  return {
    advance(seconds) {
      accumulator += Math.min(Math.max(seconds, 0), 0.1);
      let steps = 0;
      while (accumulator + Number.EPSILON >= step) {
        update(step);
        accumulator -= step;
        steps += 1;
      }
      return { alpha: Math.min(1, Math.max(0, accumulator / step)), steps };
    },
    stepCount(count) {
      for (let index = 0; index < count; index += 1) update(step);
      return { alpha: 0, steps: count };
    },
    reset() {
      accumulator = 0;
    },
    get alpha() {
      return accumulator / step;
    },
  };
}
