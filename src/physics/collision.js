import { PHYSICS } from './constants.js';

function resolvePair(a, b) {
  if (a.removed || b.removed) {
    return null;
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = (a.radius ?? PHYSICS.STONE_RADIUS) + (b.radius ?? PHYSICS.STONE_RADIUS);

  if (distance > minDistance + PHYSICS.COLLISION_EPSILON) {
    return null;
  }

  const invDistance = distance > PHYSICS.COLLISION_EPSILON ? 1 / distance : 0;
  const nx = distance > PHYSICS.COLLISION_EPSILON ? dx * invDistance : 0;
  const ny = distance > PHYSICS.COLLISION_EPSILON ? dy * invDistance : 1;
  const overlap = Math.max(0, minDistance - distance);

  if (overlap > 0) {
    const push = overlap / 2;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
  }

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const relVel = rvx * nx + rvy * ny;

  if (relVel >= 0) {
    return {
      pair: [a.id, b.id],
      overlap,
      impulse: 0,
      restitution: PHYSICS.RESTITUTION,
    };
  }

  const impulse = -((1 + PHYSICS.RESTITUTION) * relVel) / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
  a.moving = true;
  b.moving = true;

  return {
    pair: [a.id, b.id],
    overlap,
    impulse,
    restitution: PHYSICS.RESTITUTION,
  };
}

export function checkCollisions(moving, allStones) {
  const events = [];
  if (!moving || moving.removed) {
    return events;
  }

  for (const other of allStones) {
    if (other === moving || other.removed) {
      continue;
    }
    const event = resolvePair(moving, other);
    if (event && (event.impulse !== 0 || event.overlap > 0)) {
      events.push(event);
    }
  }

  return events;
}

export function resolveChain(allStones) {
  const events = [];

  for (let iteration = 0; iteration < 10; iteration += 1) {
    let resolved = false;

    for (let i = 0; i < allStones.length; i += 1) {
      const stone = allStones[i];
      if (!stone || stone.removed || !stone.moving) {
        continue;
      }
      const contacts = checkCollisions(stone, allStones);
      if (contacts.length > 0) {
        events.push(...contacts);
        resolved = true;
      }
    }

    if (!resolved) {
      break;
    }
  }

  return events;
}
