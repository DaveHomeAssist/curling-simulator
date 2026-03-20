import { createStone } from '../physics/stone.js';
import { simulateTrajectory } from '../physics/trajectory.js';
import { calcScore } from '../physics/scoring.js';
import { SHEET, PHYSICS } from '../physics/constants.js';
import { CHALLENGES } from './challenges.js';

const DEFAULT_TEAMS = {
  red: { id: 'red', name: 'Crimson Skip' },
  yel: { id: 'yel', name: 'Golden Sweep' },
};

const CAMERA_SEQUENCE = ['delivery', 'follow', 'house', 'broadcast', 'free'];
const RELEASE_SPIN = 2.2;

function makeScoreboard() {
  return {
    red: [],
    yel: [],
  };
}

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function createGameState() {
  return {
    mode: 'aim',
    gameMode: 'exhibition',
    renderer: '3d',
    cameraMode: 'delivery',
    canThrow: true,
    teams: structuredClone(DEFAULT_TEAMS),
    scoreByEnd: makeScoreboard(),
    totalScore: { red: 0, yel: 0 },
    end: 1,
    maxEnds: 8,
    hammerTeam: 'yel',
    currentTeam: 'red',
    shotNumber: 0,
    stonesRemainingByTeam: { red: 8, yel: 8 },
    stones: [],
    movingStoneId: null,
    selectedWeight: 'draw',
    weightPresets: {
      guard: { label: 'Guard', velocity: 3.2 },
      draw: { label: 'Draw', velocity: 4.15 },
      control: { label: 'Control', velocity: 5.25 },
      takeout: { label: 'Takeout', velocity: 6.1 },
      peel: { label: 'Peel', velocity: 7.15 },
    },
    aimX: 0,
    aimY: SHEET.TEE_Y,
    spin: 1,
    powerCharge: 0.45,
    powerDirection: 1,
    chargeRate: 0.8,
    charging: false,
    sweeping: false,
    preview: [],
    lastReleased: null,
    messages: [
      'Renderer-agnostic curling simulator initialized.',
      'Drag to aim, hold and release to throw, space to sweep.',
    ],
    selectedStoneId: null,
    selectedChallengeId: CHALLENGES[0]?.id ?? null,
    challengeResult: null,
    challengeMedal: null,
    challengeUnlocked: true,
    practiceSetupEnabled: false,
    practiceGhostTeam: 'red',
    exhibitionDifficulty: 'regional',
    ai: {
      enabled: true,
      difficulty: 'regional',
      thinking: false,
      thinkUntil: 0,
      plannedShot: null,
    },
    tournament: {
      enabled: false,
      bracketSize: 4,
      round: 1,
      teams: ['Crimson Skip', 'Golden Sweep', 'Northern Pebble', 'Stone Lake'],
      currentMatch: 0,
      wins: {},
    },
    multiplayer: {
      enabled: false,
      status: 'offline',
      role: 'local',
      roomCode: randomRoomCode(),
      peerId: null,
      queue: [],
      transcript: [],
    },
    audio: {
      enabled: true,
      masterVolume: 0.7,
      crowdMood: 'idle',
      lastImpact: 0,
    },
    effects: {
      sweepTrail: [],
      wakeTrail: [],
      impacts: [],
    },
    stats: {
      shotsTaken: 0,
      hogViolations: 0,
      takeouts: 0,
      bestChallenge: {},
    },
    modal: null,
    dirtyPreview: true,
    needsRenderSync: true,
    turnStartedAt: 0,
    lastStoneSettledAt: 0,
  };
}

export function addMessage(state, text) {
  state.messages.unshift(text);
  state.messages = state.messages.slice(0, 8);
}

export function cycleCamera(state) {
  const index = CAMERA_SEQUENCE.indexOf(state.cameraMode);
  state.cameraMode = CAMERA_SEQUENCE[(index + 1) % CAMERA_SEQUENCE.length];
  state.needsRenderSync = true;
}

export function setCameraMode(state, mode) {
  if (CAMERA_SEQUENCE.includes(mode)) {
    state.cameraMode = mode;
    state.needsRenderSync = true;
  }
}

export function setRenderer(state, renderer) {
  if (renderer === '2d' || renderer === '3d') {
    state.renderer = renderer;
    state.needsRenderSync = true;
    addMessage(state, `Switched to ${renderer.toUpperCase()} renderer.`);
  }
}

export function setAim(state, x) {
  const halfWidth = SHEET.WIDTH / 2 - PHYSICS.STONE_RADIUS * 1.15;
  state.aimX = Math.max(-halfWidth, Math.min(halfWidth, x));
  state.dirtyPreview = true;
}

export function setSpin(state, spin) {
  state.spin = spin < 0 ? -1 : 1;
  state.dirtyPreview = true;
}

export function toggleSpin(state) {
  state.spin *= -1;
  state.dirtyPreview = true;
}

export function setWeightPreset(state, preset) {
  if (state.weightPresets[preset]) {
    state.selectedWeight = preset;
    addMessage(state, `Weight preset: ${state.weightPresets[preset].label}`);
    state.dirtyPreview = true;
  }
}

export function setPowerCharge(state, value) {
  state.powerCharge = Math.max(0.05, Math.min(1, value));
  state.dirtyPreview = true;
}

export function beginCharge(state) {
  if (!state.canThrow || state.mode === 'travel') return;
  state.mode = 'power';
  state.charging = true;
}

export function updateCharge(state, dt) {
  if (!state.charging) return;
  state.powerCharge += dt * state.chargeRate * state.powerDirection;
  if (state.powerCharge >= 1) {
    state.powerCharge = 1;
    state.powerDirection = -1;
  } else if (state.powerCharge <= 0.08) {
    state.powerCharge = 0.08;
    state.powerDirection = 1;
  }
  state.dirtyPreview = true;
}

export function releaseShot(state, now = performance.now()) {
  if (!state.canThrow || state.mode === 'travel') return null;

  state.mode = 'travel';
  state.canThrow = false;
  state.charging = false;
  state.powerDirection = 1;

  const preset = state.weightPresets[state.selectedWeight];
  const baseVelocity = preset.velocity * (0.6 + state.powerCharge * 0.75);
  const releaseY = SHEET.HACK_Y + PHYSICS.STONE_RADIUS * 3.2;
  const x0 = state.aimX * 0.24;
  const stone = createStone(x0, baseVelocity, state.spin * RELEASE_SPIN, state.currentTeam, state.shotNumber);

  stone.y = releaseY;
  stone.releasedAt = now;
  stone.throwWeight = state.selectedWeight;

  state.stones.push(stone);
  state.movingStoneId = stone.id;
  state.lastReleased = stone.id;
  state.stats.shotsTaken += 1;
  state.shotNumber += 1;
  state.turnStartedAt = now;
  if (state.gameMode !== 'practice') {
    state.stonesRemainingByTeam[state.currentTeam] = Math.max(0, state.stonesRemainingByTeam[state.currentTeam] - 1);
  }
  state.preview = [];
  state.dirtyPreview = true;
  state.needsRenderSync = true;
  addMessage(
    state,
    `${state.teams[state.currentTeam].name} throws a ${preset.label.toLowerCase()} with ${state.spin > 0 ? 'in-turn' : 'out-turn'} rotation.`,
  );
  return stone;
}

export function getMovingStone(state) {
  return state.stones.find((stone) => stone.id === state.movingStoneId) ?? null;
}

export function isHumanTurn(state) {
  if (state.gameMode === 'multiplayer' && state.multiplayer.enabled) {
    return state.multiplayer.role !== 'remote';
  }

  if (state.gameMode === 'practice' || state.gameMode === 'challenge') {
    return true;
  }

  return !(state.ai.enabled && state.currentTeam === 'yel');
}

export function updatePreview(state) {
  if (!state.dirtyPreview || state.mode === 'travel') return state.preview;

  const preset = state.weightPresets[state.selectedWeight];
  const baseVelocity = preset.velocity * (0.6 + state.powerCharge * 0.75);
  const proto = createStone(state.aimX * 0.24, baseVelocity, state.spin * RELEASE_SPIN, state.currentTeam, 'preview');
  proto.y = SHEET.HACK_Y + PHYSICS.STONE_RADIUS * 3.2;
  const sim = simulateTrajectory(proto, state.stones, { sampleEvery: 4 });
  state.preview = sim.trajectory;
  state.dirtyPreview = false;
  return state.preview;
}

export function finalizeTravel(state, settledAt = performance.now()) {
  state.mode = 'result';
  state.movingStoneId = null;
  state.canThrow = true;
  state.sweeping = false;
  state.lastStoneSettledAt = settledAt;
  state.needsRenderSync = true;

  if (state.gameMode === 'challenge') {
    updateChallengeResult(state);
  }

  if (state.gameMode === 'practice') {
    state.currentTeam = 'red';
    state.mode = 'aim';
    state.canThrow = true;
    state.dirtyPreview = true;
    return;
  }

  if (isEndComplete(state)) {
    scoreEnd(state);
    prepareNextEnd(state);
    return;
  }

  state.currentTeam = state.currentTeam === 'red' ? 'yel' : 'red';
  state.mode = 'aim';
  state.dirtyPreview = true;
}

function updateChallengeResult(state) {
  const challenge = CHALLENGES.find((entry) => entry.id === state.selectedChallengeId);
  if (!challenge) return;
  const latestStone = state.stones[state.stones.length - 1];
  const dx = latestStone.x - challenge.target.x;
  const dy = latestStone.y - challenge.target.y;
  const dist = Math.hypot(dx, dy);
  let medal = 'none';
  if (dist <= challenge.thresholds.gold) medal = 'gold';
  else if (dist <= challenge.thresholds.silver) medal = 'silver';
  else if (dist <= challenge.thresholds.bronze) medal = 'bronze';
  state.challengeResult = dist;
  state.challengeMedal = medal;
  state.stats.bestChallenge[challenge.id] = Math.min(state.stats.bestChallenge[challenge.id] ?? Number.POSITIVE_INFINITY, dist);
  addMessage(state, `${challenge.name}: ${medal.toUpperCase()} (${dist.toFixed(2)}m from target)`);
}

export function isEndComplete(state) {
  if (state.gameMode === 'practice') {
    return false;
  }
  return state.stonesRemainingByTeam.red === 0 && state.stonesRemainingByTeam.yel === 0;
}

export function scoreEnd(state) {
  const score = calcScore(state.stones);
  state.scoreByEnd.red.push(score.team === 'red' ? score.points : 0);
  state.scoreByEnd.yel.push(score.team === 'yel' ? score.points : 0);
  state.totalScore.red += score.team === 'red' ? score.points : 0;
  state.totalScore.yel += score.team === 'yel' ? score.points : 0;
  state.hammerTeam = score.team === null ? state.hammerTeam : score.team === 'red' ? 'yel' : 'red';
  addMessage(
    state,
    score.team ? `${state.teams[score.team].name} scores ${score.points}.` : 'Blank end. Hammer stays with the current holder.',
  );
}

export function prepareNextEnd(state) {
  if (state.end >= state.maxEnds) {
    state.mode = 'game-over';
    state.canThrow = false;
    if (state.gameMode === 'tournament') {
      const winner = state.totalScore.red >= state.totalScore.yel ? 'red' : 'yel';
      const winnerName = state.teams[winner].name;
      state.tournament.wins[winnerName] = (state.tournament.wins[winnerName] ?? 0) + 1;
      state.tournament.currentMatch += 1;
      if (state.tournament.currentMatch >= Math.max(1, state.tournament.bracketSize / 2)) {
        state.tournament.round += 1;
        state.tournament.currentMatch = 0;
      }
      addMessage(state, `${winnerName} advances in the tournament bracket.`);
    }
    addMessage(state, `Game over. ${state.totalScore.red}-${state.totalScore.yel}.`);
    return;
  }

  state.end += 1;
  state.currentTeam = 'red';
  state.stonesRemainingByTeam = { red: 8, yel: 8 };
  state.stones = [];
  state.preview = [];
  state.mode = 'aim';
  state.canThrow = true;
  state.challengeResult = null;
  state.challengeMedal = null;
  state.dirtyPreview = true;
}

export function resetPlayingSurface(state) {
  state.stones = [];
  state.preview = [];
  state.movingStoneId = null;
  state.canThrow = true;
  state.mode = 'aim';
  state.dirtyPreview = true;
  state.challengeResult = null;
  state.challengeMedal = null;
  state.lastReleased = null;
  state.effects = { sweepTrail: [], wakeTrail: [], impacts: [] };
}

export function startMode(state, mode) {
  state.gameMode = mode;
  state.end = 1;
  state.maxEnds = mode === 'tournament' ? 6 : mode === 'practice' ? 1 : 8;
  state.totalScore = { red: 0, yel: 0 };
  state.scoreByEnd = makeScoreboard();
  state.currentTeam = 'red';
  state.hammerTeam = 'yel';
  state.shotNumber = 0;
  state.stonesRemainingByTeam = mode === 'practice' ? { red: 99, yel: 0 } : mode === 'challenge' ? { red: 1, yel: 0 } : { red: 8, yel: 8 };
  state.ai.enabled = mode !== 'practice' && mode !== 'challenge' && mode !== 'multiplayer';
  state.multiplayer.enabled = mode === 'multiplayer';
  state.multiplayer.status = mode === 'multiplayer' ? 'local-lobby' : 'offline';
  resetPlayingSurface(state);
  addMessage(state, `Mode changed to ${mode}.`);
  if (mode === 'challenge') {
    seedChallenge(state);
  }
}

export function seedChallenge(state, challengeId = state.selectedChallengeId) {
  const challenge = CHALLENGES.find((entry) => entry.id === challengeId) ?? CHALLENGES[0];
  state.selectedChallengeId = challenge.id;
  resetPlayingSurface(state);
  state.gameMode = 'challenge';
  state.currentTeam = 'red';
  state.ai.enabled = false;
  state.stonesRemainingByTeam = { red: 1, yel: 0 };
  state.stones = challenge.setupStones.map((stone, index) => {
    const seeded = createStone(stone.x, 0, 0, stone.team, `setup-${index}`);
    seeded.x = stone.x;
    seeded.y = stone.y;
    seeded.vx = 0;
    seeded.vy = 0;
    return seeded;
  });
  state.challengeResult = null;
  state.challengeMedal = null;
  state.selectedWeight = challenge.shotType === 'draw'
    ? 'draw'
    : challenge.shotType === 'guard'
      ? 'guard'
      : challenge.shotType === 'freeze'
        ? 'draw'
        : challenge.shotType === 'peel'
          ? 'peel'
          : 'takeout';
  addMessage(state, `Challenge loaded: ${challenge.name}`);
}

export function queueAiTurn(state, now) {
  if (!state.ai.enabled || state.currentTeam !== 'yel' || state.mode === 'travel') return;
  if (state.ai.thinking || !state.canThrow) return;
  state.ai.thinking = true;
  state.ai.thinkUntil = now + 950;
  addMessage(state, `${state.teams.yel.name} is reading the house.`);
}

export function syncAiShot(state, shot) {
  state.ai.plannedShot = shot;
  state.aimX = shot.aimX;
  state.spin = shot.spin;
  state.selectedWeight = shot.shotType in state.weightPresets ? shot.shotType : state.selectedWeight;
  state.powerCharge = Math.max(0.1, Math.min(1, shot.velocity / 8));
  state.dirtyPreview = true;
}

export function resetGame(state) {
  const next = createGameState();
  Object.assign(state, next);
}
