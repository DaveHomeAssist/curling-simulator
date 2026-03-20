import { stepPhysics } from '../physics/stone.js';
import { resolveChain } from '../physics/collision.js';
import { getMovingStone, finalizeTravel, queueAiTurn, releaseShot, syncAiShot, updateCharge, updatePreview } from './state.js';
import { findBestShot } from '../ai/shotSearch.js';
import { evaluateShot } from '../ai/evaluator.js';

const FIXED_DT = 1 / 120;

export function createLoop(state, services) {
  let accumulator = 0;
  let lastTime = performance.now();
  let rafId = 0;

  function fixedUpdate(dt, now) {
    if (state.mode === 'power') {
      updateCharge(state, dt);
    }

    if (state.mode === 'aim' || state.mode === 'power') {
      updatePreview(state);
    }

    if (state.mode === 'travel') {
      let hadMotion = false;

      for (const stone of state.stones) {
        stepPhysics(stone, dt, state.sweeping && stone.id === state.movingStoneId);
        hadMotion ||= Math.abs(stone.vx) > 0.01 || Math.abs(stone.vy) > 0.01;
      }

      const events = resolveChain(state.stones);
      if (events.length > 0) {
        services.audio?.onCollision(events);
        state.effects.impacts.push(...events.map((event) => ({ ...event, createdAt: now })));
      }

      services.effects?.updateWake(state, dt, now);

      if (!hadMotion && !state.stones.some((stone) => Math.abs(stone.vx) > 0.01 || Math.abs(stone.vy) > 0.01)) {
        services.audio?.onShotComplete(state);
        finalizeTravel(state, now);
      }
    } else if (state.ai.enabled && state.currentTeam === 'yel') {
      queueAiTurn(state, now);
      if (state.ai.thinking && now >= state.ai.thinkUntil) {
        const shot = findBestShot(state.stones, 'yel', state.ai.difficulty);
        syncAiShot(state, shot);
        state.ai.thinking = false;
        services.audio?.onSkipCall('hard');
        releaseShot(state, now);
      }
    }

    services.effects?.tick(state, dt, now);
  }

  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    accumulator += delta;

    while (accumulator >= FIXED_DT) {
      fixedUpdate(FIXED_DT, now);
      accumulator -= FIXED_DT;
    }

    const movingStone = getMovingStone(state);
    services.render?.sync(state, movingStone);
    services.ui?.render(state);
    services.render?.render();
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      cancelAnimationFrame(rafId);
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
    step(ms = 16) {
      const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
      for (let index = 0; index < steps; index += 1) {
        fixedUpdate(FIXED_DT, performance.now());
      }
      const movingStone = getMovingStone(state);
      services.render?.sync(state, movingStone);
      services.ui?.render(state);
      services.render?.render();
    },
    previewShot() {
      const shot = evaluateShot(state.stones, state.aimX, state.weightPresets[state.selectedWeight].velocity, state.spin, state.currentTeam);
      return shot;
    },
  };
}
