const HOUSE_CENTER = { x: 0, y: 23.47 };
const HOUSE_RADIUS = 1.83;
const BUTTON_RADIUS = 0.61;
const HOG_LINE_Y = 10;
const TOUCH_TOLERANCE = 0.31;

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

function stoneIsAlive(stone) {
  return stone?.removed !== true && stone?.inPlay !== false;
}

function scoreBoard(stones, team) {
  const alive = stones.filter((stone) => stoneIsAlive(stone) && getDistance(stone) <= HOUSE_RADIUS);
  if (alive.length === 0) return 0;
  const sorted = [...alive].sort((a, b) => getDistance(a) - getDistance(b));
  const leader = sorted[0]?.team;
  if (!leader) return 0;
  const threshold = sorted.find((stone) => stone.team !== leader);
  const count = sorted.filter((stone) => stone.team === leader && getDistance(stone) < (threshold ? getDistance(threshold) : Number.POSITIVE_INFINITY)).length;
  return leader === team ? count : -count;
}

function countRemovals(beforeStones, afterStones, team) {
  const afterById = new Map(afterStones.map((stone) => [stone?.id, stone]));
  let opponentRemoved = 0;
  let ownRemoved = 0;
  for (const stone of beforeStones) {
    if (!stoneIsAlive(stone)) continue;
    const after = afterById.get(stone.id);
    const removed = !after || !stoneIsAlive(after);
    if (!removed) continue;
    if (stone.team === team) ownRemoved += 1;
    else opponentRemoved += 1;
  }
  return { opponentRemoved, ownRemoved };
}

function hasFrontGuard(stones, team) {
  return stones.some((stone) => {
    if (!stoneIsAlive(stone) || stone.team !== team) return false;
    return stone.y >= HOG_LINE_Y && stone.y < HOUSE_CENTER.y - HOUSE_RADIUS;
  });
}

function classifyShot({ opponentRemoved, ownRemoved, finalDistance, touchedStone }) {
  if (opponentRemoved > 0 && ownRemoved === 0 && finalDistance <= HOUSE_RADIUS) {
    return 'hit-and-roll';
  }
  if (opponentRemoved > 0 && ownRemoved === 0) {
    return 'takeout';
  }
  if (touchedStone && finalDistance <= HOUSE_RADIUS) {
    return 'freeze';
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
  const beforeStones = cloneValue(stones);
  const result = runner(cloneValue(stones), aimX, velocity, spin, team);
  const finalStone = pickDeliveredStone(result);
  const finalDistance = finalStone ? getDistance(finalStone) : Math.abs(aimX ?? 0);
  const finalPos = finalStone
    ? { x: finalStone.x ?? 0, y: finalStone.y ?? 0 }
    : { x: aimX ?? 0, y: HOUSE_CENTER.y };

  const allStones = Array.isArray(result?.stones) ? result.stones : [];
  const { opponentRemoved, ownRemoved } = countRemovals(beforeStones, allStones, team);
  const teamStonesInHouse = countInHouse(allStones, team);
  const boardDelta = scoreBoard(allStones, team) - scoreBoard(beforeStones, team);
  const touchedStone = beforeStones.some((stone) => stone.team !== team && finalStone && Math.hypot((stone.x ?? 0) - finalStone.x, (stone.y ?? 0) - finalStone.y) <= TOUCH_TOLERANCE);

  let score = 0;
  score += boardDelta * 140;
  score += opponentRemoved * 85;
  score -= ownRemoved * 110;
  score += teamStonesInHouse * 30;

  if (finalDistance <= BUTTON_RADIUS) {
    score += 200;
  }

  if (hasFrontGuard(allStones, team) && finalDistance > HOUSE_RADIUS) {
    score += 40;
  }

  const deliveredStoneCrossedHog = (finalStone?.y ?? 0) >= HOG_LINE_Y;
  if (!deliveredStoneCrossedHog) {
    score -= 100;
  }

  return {
    value: score,
    type: classifyShot({ opponentRemoved, ownRemoved, finalDistance, touchedStone }),
    finalPos,
    stonesRemoved: opponentRemoved,
    ownStonesRemoved: ownRemoved,
    teamStonesInHouse,
  };
}
