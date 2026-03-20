import { buildStone } from './buildStone.js';
import { SHEET } from '../physics/constants_v2.js';

export function makeBlankEnd() {
  return [
    buildStone({ id: 'red-0', team: 'red', x: -0.6, y: SHEET.TEE_Y + 5, moving: false }),
    buildStone({ id: 'yel-0', team: 'yel', x: 0.8, y: SHEET.TEE_Y - 5, moving: false }),
  ];
}

export function makeHeadOnPair() {
  return [
    buildStone({ id: 'moving-red', team: 'red', x: 0, y: 8, vy: 1.6, omega: 1.2 }),
    buildStone({ id: 'yel-stop', team: 'yel', x: 0, y: 8.27, vy: 0, omega: 0, moving: false }),
  ];
}

export function makeScoringHouse() {
  return [
    buildStone({ id: 'red-shot', team: 'red', x: 0.15, y: SHEET.TEE_Y + 0.05, moving: false }),
    buildStone({ id: 'yel-second', team: 'yel', x: 0.55, y: SHEET.TEE_Y + 0.1, moving: false }),
    buildStone({ id: 'red-third', team: 'red', x: 1.4, y: SHEET.TEE_Y - 0.1, moving: false }),
    buildStone({ id: 'red-out', team: 'red', x: 0.1, y: SHEET.BACK_LINE_Y + 0.5, moving: false }),
  ];
}
