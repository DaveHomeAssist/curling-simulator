import { COURT, SHOE } from './config.js';
import { buildShoePieceSpecs } from './geometry.js';

export const COUNT_DISTANCE = 0.1524;
const EPS = 1e-5; // Numerical equality, not an enlarged scoring zone.
const pieces = buildShoePieceSpecs();
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const along = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
function inverseRotate(v, q) {
  const x = -q.x,
    y = -q.y,
    z = -q.z,
    w = q.w;
  const tx = 2 * (y * v.z - z * v.y),
    ty = 2 * (z * v.x - x * v.z),
    tz = 2 * (x * v.y - y * v.x);
  return {
    x: v.x + w * tx + y * tz - z * ty,
    y: v.y + w * ty + z * tx - x * tz,
    z: v.z + w * tz + x * ty - y * tx,
  };
}
function segmentBoxDistance(a, b, half) {
  const distance = (t) => {
    const v = along(a, b, t);
    return Math.hypot(
      ...['x', 'y', 'z'].map((axis) =>
        Math.max(0, Math.abs(v[axis]) - half[axis]),
      ),
    );
  };
  // Distance to a convex box along a segment is convex. Include both endpoints.
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 64; i++) {
    const l = lo + (hi - lo) / 3,
      r = hi - (hi - lo) / 3;
    if (distance(l) < distance(r)) hi = r;
    else lo = l;
  }
  return Math.min(distance(0), distance(1), distance((lo + hi) / 2));
}

export function classifyShoe(shoe) {
  if (shoe.foul)
    return {
      ...shoe,
      ringer: false,
      distance: Infinity,
      reason: 'Foul — contacted outside ground',
    };
  const bottom = { x: 0, y: COURT.pitTop, z: COURT.stakeDistance };
  const top = {
    x: 0,
    y: bottom.y + Math.cos(COURT.stakeLean) * COURT.stakeHeight,
    z: bottom.z - Math.sin(COURT.stakeLean) * COURT.stakeHeight,
  };
  const a = inverseRotate(sub(bottom, shoe.position), shoe.rotation);
  const b = inverseRotate(sub(top, shoe.position), shoe.rotation);
  let distance = Infinity;
  for (const piece of pieces) {
    const pa = inverseRotate(sub(a, piece.translation), piece.rotation);
    const pb = inverseRotate(sub(b, piece.translation), piece.rotation);
    distance = Math.min(
      distance,
      Math.max(
        0,
        segmentBoxDistance(pa, pb, piece.halfExtents) - COURT.stakeRadius,
      ),
    );
  }
  // The finite stake must pass through the shoe plane inside the U, with the
  // actual heel straightedge clearing its cylindrical surface (touch fails).
  const t = -a.y / (b.y - a.y);
  const hit = along(a, b, t);
  const inner = SHOE.opening / 2;
  const outer = SHOE.width / 2;
  const railHalf = (outer - inner) / 2;
  const arcZ = -SHOE.length / 2 + inner + 2 * railHalf;
  const inside =
    Math.abs(hit.x) < inner &&
    hit.z < SHOE.length / 2 &&
    (hit.z >= arcZ || Math.hypot(hit.x, hit.z - arcZ) < inner);
  const heelDistance = segmentBoxDistance(
    sub(a, { x: 0, y: 0, z: SHOE.length / 2 }),
    sub(b, { x: 0, y: 0, z: SHOE.length / 2 }),
    { x: inner, y: 0, z: 0 },
  );
  const ringer =
    Number.isFinite(t) &&
    t >= 0 &&
    t <= 1 &&
    inside &&
    heelDistance > COURT.stakeRadius + EPS;
  return {
    ...shoe,
    ringer,
    distance,
    reason: ringer
      ? 'Ringer — stake enclosed; heel line clear'
      : distance <= COUNT_DISTANCE + EPS
        ? 'Within six inches'
        : 'Outside six inches',
  };
}

export function scoreInning(shoes) {
  const scored = shoes.map(classifyShoe);
  const ringers = [0, 1].map((player) =>
    scored.filter((s) => s.player === player && s.ringer),
  );
  const cancel = Math.min(ringers[0].length, ringers[1].length);
  const counted = [];
  const points = [0, 0];
  for (let player = 0; player < 2; player++) {
    for (const shoe of ringers[player].slice(cancel)) {
      points[player] += 3;
      counted.push(shoe.id);
    }
  }
  const close = scored
    .filter((s) => !s.foul && !s.ringer && s.distance <= COUNT_DISTANCE + EPS)
    .sort((a, b) => a.distance - b.distance);
  // Equal opposing shoes cancel pairwise, including simultaneous stake touches.
  const remaining = [...close];
  for (let i = 0; i < remaining.length; i++) {
    const j = remaining.findIndex(
      (s, index) =>
        index > i &&
        s.player !== remaining[i].player &&
        Math.abs(s.distance - remaining[i].distance) <= EPS,
    );
    if (j >= 0) {
      remaining.splice(j, 1);
      remaining.splice(i, 1);
      i--;
    }
  }
  const ringerOwner = points[0] ? 0 : points[1] ? 1 : null;
  const owner = ringerOwner ?? remaining[0]?.player;
  if (owner !== undefined && owner !== null) {
    for (const shoe of remaining) {
      if (shoe.player !== owner) break;
      points[owner]++;
      counted.push(shoe.id);
    }
  }
  return {
    points,
    counted,
    shoes: scored,
    cancelledRingers: cancel * 2,
    summary: points[0]
      ? `Player 1 scores ${points[0]}`
      : points[1]
        ? `Player 2 scores ${points[1]}`
        : 'No score — shoes cancel or are out of count',
  };
}
