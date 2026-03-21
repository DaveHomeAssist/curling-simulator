import { createStone } from '../physics/stone.js';
import { simulateTrajectory } from '../physics/trajectory.js';
import { calcScore } from '../physics/scoring.js';
import { SHEET, PHYSICS } from '../physics/constants.js';
import { CHALLENGES } from './challenges.js';

const DEFAULT_TEAMS = {
  red: { id: 'red', name: 'Red' },
  yel: { id: 'yel', name: 'Yellow' },
};

const CAMERA_SEQUENCE = ['delivery', 'follow', 'house', 'broadcast', 'free'];
const RELEASE_SPIN = 2.2;
const STONE_CONTACT_EPSILON = PHYSICS.STONE_RADIUS * 2.15;

function makeScoreboard() {
  return {
    red: [],
    yel: [],
  };
}

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getChallengeSetupStoneId(stone, index) {
  return `${stone.team}-setup-${index}`;
}

function getChallenge(storyId) {
  return CHALLENGES.find((entry) => entry.id === storyId) ?? null;
}

function formatTeamName(team) {
  return team === 'red' ? 'Red' : 'Yellow';
}

function formatLineCall(aimX) {
  const absX = Math.abs(aimX);
  const side = aimX < 0 ? 'left' : 'right';
  if (absX < 0.18) return 'Center line';
  if (absX < 0.55) return `Half-stone ${side}`;
  if (absX < 1.1) return `One-stone ${side}`;
  if (absX < 1.7) return `Wide ${side}`;
  return `Edge ${side}`;
}

function getShotIntentLabel(shotType) {
  switch (shotType) {
    case 'hit-and-roll':
      return 'Hit & roll';
    case 'takeout':
      return 'Hit';
    case 'freeze':
      return 'Freeze';
    case 'guard':
      return 'Guard';
    case 'peel':
      return 'Peel';
    case 'draw':
    default:
      return 'Draw';
  }
}

function formatModeLabel(mode) {
  switch (mode) {
    case 'practice':
      return 'Practice';
    case 'challenge':
      return 'Challenge';
    case 'tournament':
      return 'Tournament';
    case 'multiplayer':
      return 'Multiplayer';
    case 'exhibition':
    default:
      return 'Exhibition';
  }
}

function getWeightFromShotType(shotType) {
  switch (shotType) {
    case 'guard':
      return 'guard';
    case 'freeze':
      return 'draw';
    case 'draw':
      return 'draw';
    case 'control':
      return 'control';
    case 'peel':
      return 'peel';
    case 'hit-and-roll':
    case 'takeout':
    default:
      return 'takeout';
  }
}

function describeWeightWindow(powerCharge) {
  if (powerCharge < 0.28) return 'Soft';
  if (powerCharge < 0.52) return 'Touch';
  if (powerCharge < 0.74) return 'Board';
  if (powerCharge < 0.9) return 'Firm';
  return 'Big';
}

function getStoneDistanceToTarget(stone, target) {
  return Math.hypot((stone?.x ?? 0) - target.x, (stone?.y ?? 0) - target.y);
}

function isStoneAlive(stone) {
  return Boolean(stone && stone.removed !== true && stone.inPlay !== false);
}

function getChallengeOutcome(challenge, state) {
  const deliveredStone = state.stones.find((stone) => stone.id === state.lastReleased) ?? state.stones[state.stones.length - 1];
  if (!deliveredStone) {
    return {
      medal: 'none',
      metric: Number.POSITIVE_INFINITY,
      summary: 'No delivered stone to grade.',
    };
  }

  const deliveredInPlay = isStoneAlive(deliveredStone);
  const finalDistance = getStoneDistanceToTarget(deliveredStone, challenge.target);
  const setupIds = challenge.setupStones.map((stone, index) => getChallengeSetupStoneId(stone, index));
  const setupStones = setupIds
    .map((id) => state.stones.find((stone) => stone.id === id))
    .filter(Boolean);
  const opponentTargetsRemoved = setupStones.filter((stone) => stone.team !== deliveredStone.team && !isStoneAlive(stone)).length;
  const contactStone = setupStones[0] ?? null;
  const deliveredContact = contactStone
    ? Math.hypot(deliveredStone.x - contactStone.x, deliveredStone.y - contactStone.y) <= STONE_CONTACT_EPSILON
    : false;

  let metric = finalDistance;
  let summary = `${finalDistance.toFixed(2)}m from target`;

  switch (challenge.shotType) {
    case 'guard': {
      const inGuardZone = deliveredStone.y >= SHEET.HOG_LINE_Y && deliveredStone.y < SHEET.TEE_Y - SHEET.HOUSE_RADIUS;
      metric = finalDistance + (inGuardZone ? 0 : 0.65) + (deliveredInPlay ? 0 : 0.8);
      summary = inGuardZone
        ? `Guard landed ${finalDistance.toFixed(2)}m from call`
        : 'Missed the guard zone';
      break;
    }
    case 'freeze': {
      metric = finalDistance + (deliveredContact ? 0 : 0.75) + (deliveredInPlay ? 0 : 0.5);
      summary = deliveredContact
        ? `Freeze finished ${finalDistance.toFixed(2)}m from call`
        : 'Shooter did not finish in freeze contact';
      break;
    }
    case 'takeout': {
      metric = (opponentTargetsRemoved > 0 ? 0 : 1.2) + (deliveredInPlay ? 0 : 0.45) + Math.min(finalDistance, 1.2) * 0.2;
      summary = opponentTargetsRemoved > 0
        ? `Removed ${opponentTargetsRemoved} target stone${opponentTargetsRemoved > 1 ? 's' : ''}`
        : 'Target stone stayed in play';
      break;
    }
    case 'peel': {
      metric = (opponentTargetsRemoved > 0 ? 0 : 1.25) + (deliveredInPlay ? 0.55 : 0) + Math.min(finalDistance, 1.2) * 0.15;
      summary = opponentTargetsRemoved > 0
        ? deliveredInPlay
          ? 'Peel made, but shooter stayed in play'
          : 'Peel made and shooter rolled out'
        : 'Guard was not peeled cleanly';
      break;
    }
    case 'hit-and-roll': {
      metric = (opponentTargetsRemoved > 0 ? 0 : 1.1) + (deliveredInPlay ? 0 : 0.75) + finalDistance;
      summary = opponentTargetsRemoved > 0
        ? `Hit made, rolled ${finalDistance.toFixed(2)}m from roll target`
        : 'Did not remove the called stone';
      break;
    }
    case 'draw':
    default: {
      metric = finalDistance + (deliveredInPlay ? 0 : 0.9);
      summary = `Draw finished ${finalDistance.toFixed(2)}m from call`;
      break;
    }
  }

  let medal = 'none';
  if (metric <= challenge.thresholds.gold) medal = 'gold';
  else if (metric <= challenge.thresholds.silver) medal = 'silver';
  else if (metric <= challenge.thresholds.bronze) medal = 'bronze';

  return { medal, metric, summary };
}

export function createGameState() {
  return {
    mode: 'aim',
    gameMode: 'exhibition',
    renderer: '3d',
    rendererReady: false,
    rendererMessage: '3D arena renderer active. Fallback only appears if WebGL fails.',
    cameraMode: 'delivery',
    preferredCameraMode: 'delivery',
    cameraHoldUntil: 0,
    canThrow: true,
    teams: structuredClone(DEFAULT_TEAMS),
    scoreByEnd: makeScoreboard(),
    totalScore: { red: 0, yel: 0 },
    end: 1,
    maxEnds: 10,
    hammerTeam: 'yel',
    currentTeam: 'red',
    shotNumber: 0,
    stonesRemainingByTeam: { red: 8, yel: 8 },
    stones: [],
    movingStoneId: null,
    selectedWeight: 'draw',
    shotTypeCommitted: false,
    weightPresets: {
      guard: { label: 'Guard', velocity: 3.2 },
      draw: { label: 'Draw', velocity: 4.15 },
      freeze: { label: 'Freeze', velocity: 4.3 },
      control: { label: 'Control', velocity: 5.25 },
      takeout: { label: 'Takeout', velocity: 6.1 },
      peel: { label: 'Peel', velocity: 7.15 },
    },
    aimX: 0,
    aimY: SHEET.TEE_Y,
    spin: 1,
    turnCommitted: false,
    powerCharge: 0.45,
    powerDirection: 1,
    chargeRate: 0.8,
    powerArmed: false,
    chargeAnchor: null,
    lastHapticMark: 0,
    charging: false,
    sweeping: false,
    preview: [],
    lastReleased: null,
    messages: [
      'Drag to aim, hold to charge, release to throw.',
      'Space sweeps once the stone is in motion.',
    ],
    selectedStoneId: null,
    selectedChallengeId: CHALLENGES[0]?.id ?? null,
    challengeResult: null,
    challengeSummary: '',
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
    resultChip: null,
    pebbleWear: 0,
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
    state.preferredCameraMode = mode;
    state.cameraHoldUntil = 0;
    state.needsRenderSync = true;
  }
}

export function setRenderer(state, renderer) {
  if (renderer === '2d' || renderer === '3d') {
    state.renderer = renderer;
    state.needsRenderSync = true;
    state.rendererMessage = renderer === '2d'
      ? 'Fallback renderer active because 3D could not initialize.'
      : '3D arena renderer active.';
    if (renderer === '3d') {
      addMessage(state, 'Switched to the 3D arena renderer.');
    }
  }
}

export function setAim(state, x) {
  const halfWidth = SHEET.WIDTH / 2 - PHYSICS.STONE_RADIUS * 1.15;
  state.aimX = Math.max(-halfWidth, Math.min(halfWidth, x));
  state.dirtyPreview = true;
}

export function setSpin(state, spin) {
  state.spin = spin < 0 ? -1 : 1;
  state.turnCommitted = true;
  state.dirtyPreview = true;
}

export function toggleSpin(state) {
  state.spin *= -1;
  state.turnCommitted = true;
  state.dirtyPreview = true;
}

export function setWeightPreset(state, preset) {
  if (state.weightPresets[preset]) {
    state.selectedWeight = preset;
    state.shotTypeCommitted = true;
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
  state.powerArmed = false;
  state.charging = true;
  state.resultChip = null;
  state.lastHapticMark = 0;
}

export function armCharge(state) {
  if (!state.canThrow || state.mode === 'travel') return;
  if (!state.shotTypeCommitted || !state.turnCommitted) return;
  state.mode = 'charge-ready';
  state.powerArmed = true;
  state.charging = false;
}

export function setChargeAnchor(state, x, y) {
  state.chargeAnchor = { x, y };
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
  const marks = [0.25, 0.5, 0.75, 0.99];
  const nextMark = marks.find((mark) => state.powerCharge >= mark && mark > state.lastHapticMark);
  if (nextMark) {
    state.lastHapticMark = nextMark;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10]);
    } catch {
      // ignore vibration failures
    }
  }
  state.dirtyPreview = true;
}

export function releaseShot(state, now = performance.now()) {
  if (!state.canThrow || state.mode === 'travel') return null;

  state.mode = 'travel';
  state.canThrow = false;
  state.charging = false;
  state.powerArmed = false;
  state.chargeAnchor = null;
  state.powerDirection = 1;
  state.cameraMode = 'follow';
  state.cameraHoldUntil = 0;

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
  state.resultChip = null;
  const lineCall = formatLineCall(state.aimX);
  const handle = state.spin > 0 ? 'in-turn' : 'out-turn';
  addMessage(
    state,
    `${formatTeamName(state.currentTeam)} calls ${preset.label.toLowerCase()}, ${handle}, ${lineCall}.`,
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
  const sim = simulateTrajectory(proto, state.stones);
  state.preview = sim.trajectory;
  state.dirtyPreview = false;
  return state.preview;
}

export function finalizeTravel(state, settledAt = performance.now()) {
  const deliveredStone = state.stones.find((stone) => stone.id === state.lastReleased) ?? null;
  const scoring = calcScore(state.stones);
  const finalDistance = deliveredStone
    ? Math.hypot(deliveredStone.x, deliveredStone.y - SHEET.TEE_Y)
    : null;
  const recentCollision = state.effects.impacts.some((entry) => settledAt - entry.createdAt < 900);
  state.mode = 'result';
  state.movingStoneId = null;
  state.canThrow = true;
  state.sweeping = false;
  state.powerArmed = false;
  state.chargeAnchor = null;
  state.lastStoneSettledAt = settledAt;
  state.needsRenderSync = true;
  state.cameraMode = recentCollision ? 'broadcast' : 'house';
  state.cameraHoldUntil = settledAt + (recentCollision ? 3000 : 2000);
  state.resultChip = deliveredStone
    ? {
        title: deliveredStone.removed || deliveredStone.inPlay === false ? 'Removed' : 'Shot Stone',
        detail: deliveredStone.removed || deliveredStone.inPlay === false
          ? `${formatTeamName(deliveredStone.team)} ${deliveredStone.idx + 1} out of play`
          : `${finalDistance?.toFixed(2) ?? '0.00'}m from button`,
        until: settledAt + 2500,
      }
    : null;

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
  if (state.shotNumber >= 15 && scoring.team === state.hammerTeam) {
    state.resultChip = {
      title: `${formatTeamName(scoring.team)} scores ${scoring.points}`,
      detail: 'Hammer conversion',
      until: settledAt + 2600,
    };
  }
}

function updateChallengeResult(state) {
  const challenge = getChallenge(state.selectedChallengeId);
  if (!challenge) return;
  const outcome = getChallengeOutcome(challenge, state);
  state.challengeResult = outcome.metric;
  state.challengeSummary = outcome.summary;
  state.challengeMedal = outcome.medal;
  state.stats.bestChallenge[challenge.id] = Math.min(state.stats.bestChallenge[challenge.id] ?? Number.POSITIVE_INFINITY, outcome.metric);
  addMessage(state, `${challenge.name}: ${outcome.medal.toUpperCase()} · ${outcome.summary}`);
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
  state.resultChip = score.team
    ? { title: `${state.teams[score.team].name.toUpperCase()} SCORES ${score.points}`, detail: `End ${state.end}`, until: performance.now() + 2200 }
    : { title: 'BLANK END', detail: `${state.teams[state.hammerTeam].name} keeps hammer`, until: performance.now() + 2200 };
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
  state.pebbleWear = PHYSICS.PEBBLE_RESET_RESIDUAL;
  state.mode = 'aim';
  state.canThrow = true;
  state.challengeResult = null;
  state.challengeSummary = '';
  state.challengeMedal = null;
  state.dirtyPreview = true;
  state.cameraMode = state.preferredCameraMode;
  state.cameraHoldUntil = 0;
}

export function resetPlayingSurface(state) {
  state.stones = [];
  state.preview = [];
  state.movingStoneId = null;
  state.canThrow = true;
  state.mode = 'aim';
  state.powerArmed = false;
  state.chargeAnchor = null;
  state.charging = false;
  state.lastHapticMark = 0;
  state.dirtyPreview = true;
  state.challengeResult = null;
  state.challengeSummary = '';
  state.challengeMedal = null;
  state.lastReleased = null;
  state.resultChip = null;
  state.cameraMode = state.preferredCameraMode;
  state.cameraHoldUntil = 0;
  state.effects = { sweepTrail: [], wakeTrail: [], impacts: [] };
}

export function startMode(state, mode) {
  state.gameMode = mode;
  state.end = 1;
  state.maxEnds = mode === 'tournament' ? 6 : mode === 'practice' ? 1 : 10;
  state.totalScore = { red: 0, yel: 0 };
  state.scoreByEnd = makeScoreboard();
  state.currentTeam = 'red';
  state.hammerTeam = 'yel';
  state.shotNumber = 0;
  state.stonesRemainingByTeam = mode === 'practice' ? { red: 99, yel: 0 } : mode === 'challenge' ? { red: 1, yel: 0 } : { red: 8, yel: 8 };
  state.ai.enabled = mode !== 'practice' && mode !== 'challenge' && mode !== 'multiplayer';
  state.multiplayer.enabled = mode === 'multiplayer';
  state.multiplayer.status = mode === 'multiplayer' ? 'local-lobby' : 'offline';
  state.shotTypeCommitted = false;
  state.turnCommitted = false;
  resetPlayingSurface(state);
  addMessage(state, `${formatModeLabel(mode)} mode ready.`);
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
  state.challengeSummary = '';
  state.challengeMedal = null;
  state.selectedWeight = getWeightFromShotType(challenge.shotType);
  state.shotTypeCommitted = true;
  state.turnCommitted = false;
  addMessage(state, `${challenge.name}: ${challenge.description}`);
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
  state.selectedWeight = shot.weightPreset in state.weightPresets
    ? shot.weightPreset
    : shot.shotType in state.weightPresets
      ? shot.shotType
      : state.selectedWeight;
  state.powerCharge = Math.max(0.1, Math.min(1, shot.velocity / 8));
  state.dirtyPreview = true;
}

export function getShotCall(state) {
  const preset = state.weightPresets[state.selectedWeight];
  const activeChallenge = state.gameMode === 'challenge' ? getChallenge(state.selectedChallengeId) : null;
  const intentKey = activeChallenge?.shotType ?? state.selectedWeight;
  return {
    intent: getShotIntentLabel(intentKey),
    line: formatLineCall(state.aimX),
    handle: state.spin > 0 ? 'In-turn' : 'Out-turn',
    weight: `${preset.label} · ${describeWeightWindow(state.powerCharge)}`,
  };
}

export function toggleAudioEnabled(state) {
  state.audio.enabled = !state.audio.enabled;
}

export function toggleModal(state, modal) {
  state.modal = state.modal === modal ? null : modal;
}

export function closeModal(state) {
  state.modal = null;
}

export function getWeightDisplay(powerCharge) {
  if (powerCharge < 0.55) return 'GUARD';
  if (powerCharge < 0.72) return 'DRAW';
  if (powerCharge < 0.85) return 'NORMAL';
  if (powerCharge < 0.95) return 'HIT';
  return 'PEEL';
}

export function resetGame(state) {
  const next = createGameState();
  Object.assign(state, next);
}
