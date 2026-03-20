import { PHYSICS, SHEET } from './constants_v2.js';

export function distToTee(stone) {
  return Math.hypot(stone.x, stone.y - SHEET.TEE_Y);
}

export function isInPlay(stone) {
  if (!stone || stone.removed) {
    return false;
  }

  return stone.y >= SHEET.HOG_LINE_Y && stone.y <= SHEET.BACK_LINE_Y;
}

export function calcScore(stones) {
  const inPlay = stones.filter(isInPlay);
  const inHouse = inPlay.filter((stone) => distToTee(stone) <= SHEET.HOUSE_RADIUS);

  if (inHouse.length === 0) {
    return { team: null, points: 0 };
  }

  const sorted = [...inHouse].sort((a, b) => distToTee(a) - distToTee(b));
  const leadingTeam = sorted[0].team;
  const opponentBest = sorted.find((stone) => stone.team !== leadingTeam);
  const threshold = opponentBest ? distToTee(opponentBest) : Infinity;
  const points = sorted.filter((stone) => stone.team === leadingTeam && distToTee(stone) < threshold).length;

  return {
    team: leadingTeam,
    points,
  };
}

export { PHYSICS, SHEET };
