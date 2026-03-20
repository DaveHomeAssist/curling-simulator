import { PHYSICS, SHEET } from './constants.js';

export function createStone(x0, v0, omega0, team, idx) {
  return {
    id: `${team}-${idx}`,
    idx,
    team,
    x: x0,
    y: SHEET.HACK_Y,
    vx: 0,
    vy: v0,
    omega: omega0,
    radius: PHYSICS.STONE_RADIUS,
    moving: true,
    removed: false,
    inPlay: true,
  };
}

export function stepPhysics(stone, dt, sweeping = false) {
  if (!stone || stone.removed || !stone.inPlay) {
    return stone;
  }

  const radius = stone.radius ?? PHYSICS.STONE_RADIUS;
  const speed = Math.hypot(stone.vx, stone.vy);
  const spin = stone.omega ?? 0;

  if (speed <= PHYSICS.STOP_SPEED && Math.abs(spin) <= PHYSICS.STOP_SPIN) {
    stone.vx = 0;
    stone.vy = 0;
    stone.omega = 0;
    stone.moving = false;
    return stone;
  }

  const friction = PHYSICS.LINEAR_FRICTION * (sweeping ? PHYSICS.SWEEP_FRICTION_MULTIPLIER : 1);
  const decel = friction * dt;

  if (speed > 0) {
    const nx = stone.vx / speed;
    const ny = stone.vy / speed;
    const nextSpeed = Math.max(0, speed - decel);
    stone.vx = nx * nextSpeed;
    stone.vy = ny * nextSpeed;

    const curlSign = spin === 0 ? 0 : Math.sign(spin);
    const curl = PHYSICS.CURL_ACCEL * speed * dt * curlSign;
    stone.vx += curl;
  }

  stone.x += stone.vx * dt;
  stone.y += stone.vy * dt;

  const nextSpeed = Math.hypot(stone.vx, stone.vy);
  if (nextSpeed <= PHYSICS.STOP_SPEED && Math.abs(spin) <= PHYSICS.STOP_SPIN) {
    stone.vx = 0;
    stone.vy = 0;
    stone.omega = 0;
    stone.moving = false;
  } else {
    stone.moving = true;
    const spinDrag = Math.max(0, 1 - (friction * 0.04 * dt));
    stone.omega *= spinDrag;
  }

  stone.radius = radius;
  return stone;
}
