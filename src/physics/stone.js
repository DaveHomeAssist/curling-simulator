import { PHYSICS, SHEET } from './constants.js';

const GRAVITY = 9.81;
const SPEED_FLOOR = 0.05;

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

function effectiveMu(speed, sweeping, pebbleWear = 0) {
  const base = PHYSICS.MU_BASE * Math.pow(Math.max(speed, SPEED_FLOOR), -PHYSICS.MU_VELOCITY_EXPONENT);
  const wearBoost = 1 + pebbleWear * PHYSICS.PEBBLE_WEAR_MU_SCALE;
  const mu = (sweeping ? base * PHYSICS.SWEEP_FRICTION_MULTIPLIER : base) * wearBoost;
  return Math.min(mu, 0.06);
}

export function stepPhysics(stone, dt, sweeping = false, pebbleWear = 0) {
  if (!stone || stone.removed || !stone.inPlay) {
    return stone;
  }

  const radius = stone.radius ?? PHYSICS.STONE_RADIUS;
  const speed = Math.hypot(stone.vx, stone.vy);
  const spin = stone.omega ?? 0;

  if (speed <= PHYSICS.STOP_SPEED) {
    stone.vx = 0;
    stone.vy = 0;
    stone.omega = 0;
    stone.moving = false;
    stone.radius = radius;
    return stone;
  }

  const mu = effectiveMu(speed, sweeping, pebbleWear);
  const decel = mu * GRAVITY * dt;
  const nextSpeed = Math.max(0, speed - decel);

  if (speed > 0) {
    const nx = stone.vx / speed;
    const ny = stone.vy / speed;
    stone.vx = nx * nextSpeed;
    stone.vy = ny * nextSpeed;

    if (Math.abs(spin) > 0) {
      const curlMultiplier = sweeping ? PHYSICS.SWEEP_CURL_MULTIPLIER : 1;
      const curl = PHYSICS.CURL_K * (spin / Math.max(speed, 0.1)) * curlMultiplier;
      stone.vx += curl * dt;
    }
  }

  stone.x += stone.vx * dt;
  stone.y += stone.vy * dt;

  const speedAfter = Math.hypot(stone.vx, stone.vy);
  if (speedAfter <= PHYSICS.STOP_SPEED) {
    stone.vx = 0;
    stone.vy = 0;
    stone.omega = 0;
    stone.moving = false;
  } else {
    stone.moving = true;
    const omegaDrag = Math.max(0, 1 - (mu * 0.065 * dt));
    stone.omega *= omegaDrag;
    if (Math.abs(stone.omega) <= PHYSICS.STOP_SPIN) {
      stone.omega = 0;
    }
  }

  stone.radius = radius;
  return stone;
}
