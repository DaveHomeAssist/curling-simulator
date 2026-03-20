import { PHYSICS } from './constants.js';
import { resolveChain } from './collision.js';
import { createStone, stepPhysics } from './stone.js';

function cloneStone(stone) {
  return {
    id: stone.id,
    idx: stone.idx,
    team: stone.team,
    x: stone.x,
    y: stone.y,
    vx: stone.vx ?? 0,
    vy: stone.vy ?? 0,
    omega: stone.omega ?? 0,
    radius: stone.radius ?? PHYSICS.STONE_RADIUS,
    moving: stone.moving ?? true,
    removed: stone.removed ?? false,
    inPlay: stone.inPlay ?? true,
  };
}

function isMoving(stone) {
  return Boolean(stone && stone.moving && !stone.removed && stone.inPlay);
}

export function simulateTrajectory(initialStone, stones, options = {}) {
  const dt = options.dt ?? PHYSICS.TIME_STEP;
  const maxTime = options.maxTime ?? PHYSICS.MAX_SIM_TIME;
  const sweepingOption = options.sweeping ?? false;

  const delivered = createStone(
    initialStone.x,
    initialStone.vy ?? 0,
    initialStone.omega ?? 0,
    initialStone.team,
    initialStone.idx ?? 0,
  );
  Object.assign(delivered, cloneStone(initialStone));
  const world = [delivered, ...stones.map(cloneStone)];
  const trajectory = [];
  const releasedStoneId = delivered.id;

  let elapsedTime = 0;
  trajectory.push({ x: delivered.x, y: delivered.y, vx: delivered.vx, vy: delivered.vy, t: elapsedTime });

  while (elapsedTime < maxTime && world.some(isMoving)) {
    const sweeping = typeof sweepingOption === 'function'
      ? sweepingOption(elapsedTime, delivered, world)
      : sweepingOption;

    for (const stone of world) {
      if (isMoving(stone)) {
        stepPhysics(stone, dt, Boolean(sweeping && stone.id === releasedStoneId));
      }
    }

    resolveChain(world);

    elapsedTime += dt;
    trajectory.push({
      x: delivered.x,
      y: delivered.y,
      vx: delivered.vx,
      vy: delivered.vy,
      t: elapsedTime,
    });
  }

  return {
    stones: world,
    trajectory,
    releasedStoneId,
    elapsedTime,
  };
}

export { createStone };
