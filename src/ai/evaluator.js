const HOUSE_CENTER = { x: 0, y: 23.47 };
const HOUSE_RADIUS = 1.83;
const BUTTON_RADIUS = 0.61;
const HOG_LINE_Y = 10;

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function getDistance(stone) {
  const dx = (stone.x ?? 0) - HOUSE_CENTER.x;
  const dy = (stone.y ?? 0) - HOUSE_CENTER.y;
  return Math.hypot(dx, dy);
}

function getRunner(simulateTrajectory) {
  if (typeof simulateTrajectory === 'function') {
    return simulateTrajectory;
  }
  const fallback = globalThis.simulateTrajectory;
  if (typeof fallback === 'function') {
    return fallback;
  }
  throw new Error('evaluateShot requires a simulateTrajectory function.');
}

function pickDeliveredStone(result) {
  const stones = Array.isArray(result?.stones) ? result.stones : [];
  const deliveredId = result?.releasedStoneId;
  if (deliveredId !== undefined && deliveredId !== null) {
    const found = stones.find((stone) => stone && stone.id === deliveredId);
    if (found) {
      return found;
    }
  }
  return stones[0] ?? null;
}

function normalizeStone(stone) {
  return {
    inPlay: stone?.inPlay !== false && stone?.removed !== true,
    removed: stone?.removed === true || stone?.inPlay === false,
    team: stone?.team,
    distance: getDistance(stone ?? {}),
    x: stone?.x ?? 0,
    y: stone?.y ?? 0,
  };
}

function countInHouse(stones, team) {
  return stones.reduce((count, stone) => {
    const normalized = normalizeStone(stone);
    if (!normalized.inPlay || normalized.team !== team) {
      return count;
    }
    return normalized.distance <= HOUSE_RADIUS ? count + 1 : count;
  }, 0);
}

function classifyShot({ stonesRemoved, ownStonesRemoved, finalDistance }) {
  if (stonesRemoved > 0 && ownStonesRemoved === 0 && finalDistance <= HOUSE_RADIUS) {
    return 'hit-and-roll';
  }
  if (stonesRemoved > 0 && ownStonesRemoved === 0) {
    return 'takeout';
  }
  if (finalDistance <= BUTTON_RADIUS) {
    return 'draw';
  }
  if (finalDistance <= 1.22) {
    return 'freeze';
  }
  if (finalDistance <= HOUSE_RADIUS) {
    return 'guard';
  }
  return 'peel';
}

export function evaluateShot(stones, aimX, velocity, spin, team, simulateTrajectory) {
  const runner = getRunner(simulateTrajectory);
  const clonedStones = cloneValue(stones);
  const result = runner(clonedStones, aimX, velocity, spin, team);
  const finalStone = pickDeliveredStone(result);
  const finalDistance = finalStone ? getDistance(finalStone) : Math.abs(aimX ?? 0);
  const finalPos = finalStone
    ? { x: finalStone.x ?? 0, y: finalStone.y ?? 0 }
    : { x: aimX ?? 0, y: HOUSE_CENTER.y };

  const allStones = Array.isArray(result?.stones) ? result.stones : [];
  const stonesRemoved = allStones.filter((stone) => stone?.removed === true || stone?.inPlay === false).length;
  const ownStonesRemoved = allStones.filter((stone) => (stone?.removed === true || stone?.inPlay === false) && stone?.team === team).length;
  const teamStonesInHouse = countInHouse(allStones, team);

  let score = 0;
  const opponents = allStones
    .filter((stone) => stone?.team && stone.team !== team && stone?.inPlay !== false && stone?.removed !== true)
    .map(getDistance);
  const nearestOpponent = opponents.length > 0 ? Math.min(...opponents) : Number.POSITIVE_INFINITY;

  for (const stone of allStones) {
    if (stone?.team !== team || stone?.inPlay === false || stone?.removed === true) {
      continue;
    }
    const distance = getDistance(stone);
    if (distance <= HOUSE_RADIUS && distance < nearestOpponent) {
      score += 100;
    }
  }

  score += stonesRemoved * 50;
  score -= ownStonesRemoved * 30;

  if (finalDistance <= BUTTON_RADIUS) {
    score += 200;
  }

  const deliveredStoneCrossedHog = (finalStone?.y ?? 0) >= HOG_LINE_Y;
  if (!deliveredStoneCrossedHog) {
    score -= 100;
  }

  return {
    value: score,
    type: classifyShot({ stonesRemoved, ownStonesRemoved, finalDistance }),
    finalPos,
    stonesRemoved,
    ownStonesRemoved,
    teamStonesInHouse,
  };
}
