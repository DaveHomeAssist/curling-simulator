import { evaluateShot } from './evaluator.js';

const SHEET_WIDTH = 4.75;
const DIFFICULTY = {
  club: { samples: 20, aimNoise: 0.3, velocityNoise: 0.15 },
  regional: { samples: 28, aimNoise: 0.15, velocityNoise: 0.08 },
  national: { samples: 34, aimNoise: 0.06, velocityNoise: 0.03 },
  olympic: { samples: 40, aimNoise: 0.02, velocityNoise: 0.01 },
};

const WEIGHT_OPTIONS = [
  { preset: 'guard', velocity: 3.2 },
  { preset: 'draw', velocity: 4.15 },
  { preset: 'control', velocity: 5.25 },
  { preset: 'takeout', velocity: 6.1 },
  { preset: 'peel', velocity: 7.15 },
];

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seedString) {
  let state = hashString(seedString) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = random();
  }
  while (v === 0) {
    v = random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildSamples(count, min, max) {
  if (count <= 1) {
    return [0];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function normalizeDifficulty(difficulty) {
  return DIFFICULTY[difficulty] ?? DIFFICULTY.regional;
}

export function findBestShot(stones, team, difficulty, evaluateFn = evaluateShot) {
  const config = normalizeDifficulty(difficulty);
  const random = createRandom(JSON.stringify({
    stones: cloneValue(stones),
    team,
    difficulty,
  }));
  const aimPositions = buildSamples(config.samples, -(SHEET_WIDTH / 2) + 0.2, SHEET_WIDTH / 2 - 0.2);
  const spinOptions = [-1, 1];

  let best = null;

  for (const baseAimX of aimPositions) {
    for (const weight of WEIGHT_OPTIONS) {
      for (const spin of spinOptions) {
        const aimX = baseAimX + gaussian(random) * config.aimNoise;
        const velocity = weight.velocity * (1 + gaussian(random) * config.velocityNoise);
        const result = evaluateFn(cloneValue(stones), aimX, velocity, spin, team);
        const candidate = {
          aimX,
          velocity,
          spin,
          expectedScore: result?.value ?? 0,
          shotType: result?.type ?? weight.preset,
          weightPreset: weight.preset,
        };
        if (!best || candidate.expectedScore > best.expectedScore) {
          best = candidate;
        }
      }
    }
  }

  return best ?? {
    aimX: 0,
    velocity: 0,
    spin: 1,
    expectedScore: 0,
    shotType: 'draw',
  };
}
