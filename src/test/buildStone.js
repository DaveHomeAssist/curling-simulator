import { PHYSICS, SHEET } from '../physics/constants.js';

export function buildStone(overrides = {}) {
  return {
    id: overrides.id ?? 'stone-0',
    idx: overrides.idx ?? 0,
    team: overrides.team ?? 'red',
    x: overrides.x ?? 0,
    y: overrides.y ?? SHEET.HACK_Y,
    vx: overrides.vx ?? 0,
    vy: overrides.vy ?? 0,
    omega: overrides.omega ?? 0,
    radius: overrides.radius ?? PHYSICS.STONE_RADIUS,
    moving: overrides.moving ?? true,
    removed: overrides.removed ?? false,
    inPlay: overrides.inPlay ?? true,
  };
}
