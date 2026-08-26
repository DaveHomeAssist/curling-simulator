import { PHYSICS } from '../physics/constants.js';

export const STORAGE_KEY = 'curling-simulator:session';
export const SNAPSHOT_VERSION = 1;

const RESUMABLE_MODES = ['exhibition', 'practice', 'challenge', 'tournament'];

function serializeStone(stone) {
  return {
    id: stone.id,
    idx: stone.idx,
    team: stone.team,
    x: stone.x,
    y: stone.y,
    removed: stone.removed === true,
    inPlay: stone.inPlay !== false,
  };
}

function reviveStone(entry) {
  return {
    id: entry.id,
    idx: entry.idx,
    team: entry.team,
    x: entry.x,
    y: entry.y,
    vx: 0,
    vy: 0,
    omega: 0,
    radius: PHYSICS.STONE_RADIUS,
    moving: false,
    removed: entry.removed === true,
    inPlay: entry.inPlay !== false,
  };
}

/**
 * Build a plain-data snapshot of the resumable game state, or null when the
 * current state should not be persisted (mid-travel, or a transient mode).
 */
export function buildSnapshot(state) {
  if (state.mode === 'travel') return null;
  if (!RESUMABLE_MODES.includes(state.gameMode)) return null;
  return {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    gameMode: state.gameMode,
    mode: state.mode === 'game-over' ? 'game-over' : 'aim',
    end: state.end,
    maxEnds: state.maxEnds,
    scoreByEnd: structuredClone(state.scoreByEnd),
    totalScore: { ...state.totalScore },
    hammerTeam: state.hammerTeam,
    currentTeam: state.currentTeam,
    shotNumber: state.shotNumber,
    stonesRemainingByTeam: { ...state.stonesRemainingByTeam },
    stones: state.stones.map(serializeStone),
    teams: structuredClone(state.teams),
    selectedWeight: state.selectedWeight,
    spin: state.spin,
    aimX: state.aimX,
    selectedChallengeId: state.selectedChallengeId,
    challengeResult: state.challengeResult,
    challengeSummary: state.challengeSummary,
    challengeMedal: state.challengeMedal,
    tournament: structuredClone(state.tournament),
    exhibitionDifficulty: state.exhibitionDifficulty,
    aiDifficulty: state.ai.difficulty,
    audioEnabled: state.audio.enabled,
    audioMasterVolume: state.audio.masterVolume,
    preferredCameraMode: state.preferredCameraMode,
    stats: structuredClone(state.stats),
  };
}

/**
 * Apply a snapshot produced by buildSnapshot onto a freshly created state.
 */
export function applySnapshot(state, snapshot) {
  state.gameMode = snapshot.gameMode;
  state.end = snapshot.end;
  state.maxEnds = snapshot.maxEnds;
  state.scoreByEnd = snapshot.scoreByEnd;
  state.totalScore = snapshot.totalScore;
  state.hammerTeam = snapshot.hammerTeam;
  state.currentTeam = snapshot.currentTeam;
  state.shotNumber = snapshot.shotNumber;
  state.stonesRemainingByTeam = snapshot.stonesRemainingByTeam;
  state.stones = snapshot.stones.map(reviveStone);
  state.teams = snapshot.teams;
  state.selectedWeight = snapshot.selectedWeight;
  state.spin = snapshot.spin;
  state.aimX = snapshot.aimX;
  state.selectedChallengeId = snapshot.selectedChallengeId;
  state.challengeResult = snapshot.challengeResult;
  state.challengeSummary = snapshot.challengeSummary ?? '';
  state.challengeMedal = snapshot.challengeMedal;
  state.tournament = snapshot.tournament;
  state.exhibitionDifficulty = snapshot.exhibitionDifficulty;
  state.ai.difficulty = snapshot.aiDifficulty;
  state.ai.enabled = !['practice', 'challenge', 'multiplayer'].includes(snapshot.gameMode);
  state.ai.thinking = false;
  state.ai.thinkUntil = 0;
  state.audio.enabled = snapshot.audioEnabled;
  state.audio.masterVolume = snapshot.audioMasterVolume;
  state.preferredCameraMode = snapshot.preferredCameraMode;
  state.cameraMode = snapshot.preferredCameraMode;
  state.stats = snapshot.stats;
  state.multiplayer.enabled = false;
  state.multiplayer.status = 'offline';
  const finished = snapshot.mode === 'game-over';
  const challengeThrown = snapshot.gameMode === 'challenge' && snapshot.stonesRemainingByTeam.red === 0;
  state.mode = finished ? 'game-over' : 'aim';
  state.canThrow = !finished && !challengeThrown;
  state.movingStoneId = null;
  state.lastReleased = null;
  state.shotTypeCommitted = false;
  state.turnCommitted = false;
  state.preview = [];
  state.dirtyPreview = true;
  state.needsRenderSync = true;
  return state;
}

export function saveSnapshot(state, storage = globalThis.localStorage) {
  const snapshot = buildSnapshot(state);
  if (!snapshot || !storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    if (snapshot?.version !== SNAPSHOT_VERSION) return null;
    if (!RESUMABLE_MODES.includes(snapshot.gameMode)) return null;
    if (!Array.isArray(snapshot.stones)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

/**
 * Persist the session on tab hide/close and on a slow interval so a crash,
 * reload, or mobile tab eviction no longer loses the match, bracket, or
 * challenge record.
 */
export function bindPersistence(state, { intervalMs = 5000 } = {}) {
  const save = () => saveSnapshot(state);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  const timer = setInterval(save, intervalMs);
  return () => {
    clearInterval(timer);
    window.removeEventListener('pagehide', save);
  };
}
