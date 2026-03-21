import { addMessage, createGameState, resetPlayingSurface, seedChallenge, setRenderer, startMode } from './game/state.js';
import { createLoop } from './game/loop.js';
import { bindInput } from './game/input.js';
import { createRenderer2D } from './render/renderer2d.js';
import { createRenderer3D } from './render/renderer3d.js';
import { createUI } from './render/ui.js';
import { createAudioManager } from './audio/manager.js';
import { simulateTrajectory } from './physics/trajectory.js';
import { createStone } from './physics/stone.js';
import { PHYSICS, SHEET } from './physics/constants.js';

function parseRuntimeOptions() {
  const params = new URLSearchParams(window.location.search);
  const renderer = params.get('renderer');
  return {
    requestedRenderer: renderer === '3d' ? renderer : null,
    diagnostics: params.get('diagnostics') === '1',
  };
}

function createEffectsService() {
  return {
    updateWake(state, dt, now) {
      const moving = state.stones.filter((stone) => stone.moving && !stone.removed);
      for (const stone of moving) {
        state.effects.wakeTrail.push({ x: stone.x, y: stone.y, createdAt: now });
      }
      state.effects.wakeTrail = state.effects.wakeTrail.slice(-120);
      if (state.sweeping) {
        state.effects.sweepTrail.push({ x: state.aimX, y: SHEET.TEE_Y - 1.5, createdAt: now });
      }
      state.effects.sweepTrail = state.effects.sweepTrail.slice(-80);
    },
    tick(state, dt, now) {
      state.effects.wakeTrail = state.effects.wakeTrail.filter((entry) => now - entry.createdAt < 10000);
      state.effects.sweepTrail = state.effects.sweepTrail.filter((entry) => now - entry.createdAt < 1400);
      state.effects.impacts = state.effects.impacts.filter((entry) => now - entry.createdAt < 900);
    },
  };
}

function createMultiplayerService(state) {
  let channel = null;

  function ensureChannel() {
    if (channel || typeof BroadcastChannel === 'undefined') return channel;
    channel = new BroadcastChannel(`curling-simulator-${state.multiplayer.roomCode}`);
    channel.addEventListener('message', (event) => {
      const payload = event.data;
      if (!payload || payload.type !== 'shot') return;
      state.multiplayer.transcript.unshift(`Remote shot: aim ${payload.aimX.toFixed(2)}, velocity ${payload.velocity.toFixed(2)}`);
      state.multiplayer.transcript = state.multiplayer.transcript.slice(0, 6);
    });
    return channel;
  }

  return {
    sync() {
      if (state.gameMode === 'multiplayer') {
        ensureChannel();
        state.multiplayer.status = channel ? 'broadcast-channel-ready' : 'unsupported';
      }
    },
    sendShot(shot) {
      const active = ensureChannel();
      active?.postMessage({ type: 'shot', ...shot });
    },
  };
}

function buildTextState(state) {
  const moving = state.stones.filter((stone) => stone.moving && !stone.removed).map((stone) => ({
    id: stone.id,
    x: Number(stone.x.toFixed(3)),
    y: Number(stone.y.toFixed(3)),
    vx: Number((stone.vx ?? 0).toFixed(3)),
    vy: Number((stone.vy ?? 0).toFixed(3)),
  }));

  return JSON.stringify({
    coordinateSystem: 'x centered across the sheet, y from hack toward house',
    mode: state.mode,
    gameMode: state.gameMode,
    renderer: state.renderer,
    cameraMode: state.cameraMode,
    currentTeam: state.currentTeam,
    hammerTeam: state.hammerTeam,
    end: state.end,
    score: state.totalScore,
    shotNumber: state.shotNumber,
    aimX: Number(state.aimX.toFixed(3)),
    powerCharge: Number(state.powerCharge.toFixed(3)),
    powerArmed: state.powerArmed,
    spin: state.spin,
    moving,
    stones: state.stones.filter((stone) => !stone.removed).map((stone) => ({
      id: stone.id,
      team: stone.team,
      x: Number(stone.x.toFixed(3)),
      y: Number(stone.y.toFixed(3)),
      moving: stone.moving,
    })),
    challenge: state.selectedChallengeId,
    multiplayer: state.multiplayer.status,
    messages: state.messages.slice(0, 4),
  });
}

function createAiAdapter() {
  return (stones, aimX, velocity, spin, team) => {
    const delivered = createStone(aimX * 0.24, velocity, spin * 2.2, team, 'adapter');
    delivered.y = SHEET.HACK_Y + PHYSICS.STONE_RADIUS * 3.2;
    delivered.vx = aimX * 0.06;
    return simulateTrajectory(delivered, stones);
  };
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function mount() {
  const runtime = parseRuntimeOptions();
  const root = document.querySelector('#app');
  const ui = createUI(root);
  const state = createGameState();

  const webglOk = hasWebGL();
  if (!webglOk) {
    state.renderer = '2d';
    state.rendererReady = false;
    state.rendererMessage = 'WebGL unavailable in this browser session. Running in fallback mode.';
    if (runtime.diagnostics) console.warn('WebGL not available — using fallback renderer');
  }

  const renderer2d = createRenderer2D(ui.elements.surface2d);
  let renderer3d;
  try {
    renderer3d = webglOk ? createRenderer3D(ui.elements.surface3d) : { resize() {}, sync() {}, render() {}, setVisible() {}, dispose() {} };
    if (webglOk) {
      state.rendererReady = true;
      state.renderer = '3d';
      state.rendererMessage = '3D arena renderer active.';
    }
  } catch (err) {
    if (runtime.diagnostics) console.error('3D renderer failed to initialize:', err);
    state.renderer = '2d';
    state.rendererReady = false;
    state.rendererMessage = '3D init error: ' + (err.message || String(err));
    renderer3d = { resize() {}, sync() {}, render() {}, setVisible() {}, dispose() {} };
  }
  const audio = createAudioManager(state);
  const effects = createEffectsService();
  const multiplayer = createMultiplayerService(state);
  globalThis.simulateTrajectory = createAiAdapter();

  const renderBridge = {
    resize() {
      const rect = ui.elements.surface3d.getBoundingClientRect();
      renderer2d.resize(rect.width, rect.height);
      renderer3d.resize(rect.width, rect.height);
    },
    sync(currentState, movingStone) {
      const use3d = currentState.renderer === '3d' && currentState.rendererReady;
      renderer2d.setVisible(!use3d);
      renderer3d.setVisible(use3d);
      renderer2d.sync(currentState);
      if (use3d) renderer3d.sync(currentState, movingStone);
      audio.updateMotion(currentState, movingStone, currentState.sweeping);
      multiplayer.sync();
    },
    render() {
      if (state.renderer === '3d' && state.rendererReady) renderer3d.render();
      else renderer2d.render();
    },
  };

  const actions = {
    resetSurface() {
      resetPlayingSurface(state);
    },
    loadChallenge(challengeId) {
      seedChallenge(state, challengeId);
    },
  };

  const loop = createLoop(state, {
    render: renderBridge,
    ui,
    audio,
    effects,
  });

  bindInput(state, {
    surface: ui.elements.overlay,
    overlay: ui.elements.overlay,
    scoreStrip: ui.elements.scoreStrip,
    settingsToggle: ui.elements.settingsToggle,
    cameraSelect: ui.elements.cameraSelect,
    modeSelect: ui.elements.modeSelect,
    shotButtons: ui.elements.shotButtons,
    turnButtons: ui.elements.turnButtons,
    chargeButton: ui.elements.chargeButton,
    sweepButton: ui.elements.sweepButton,
    audioToggle: ui.elements.audioToggle,
    rendererToggle: ui.elements.rendererToggle,
    historyModal: ui.elements.historyModal,
    settingsModal: ui.elements.settingsModal,
    challengeSelect: ui.elements.challengeSelect,
    resetButton: ui.elements.resetButton,
  }, {
    actions,
  });

  ui.elements.overlay.addEventListener('pointerdown', () => {
    audio.ensureStarted();
  }, { once: true });

  function resize() {
    renderBridge.resize();
    renderBridge.render();
  }

  const resizeTarget = ui.elements.surface3d || ui.elements.overlay;
  if (typeof ResizeObserver !== 'undefined' && resizeTarget) {
    new ResizeObserver(() => resize()).observe(resizeTarget);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();
  startMode(state, 'exhibition');
  if (runtime.requestedRenderer === '3d') {
    if (state.rendererReady) {
      setRenderer(state, '3d');
      state.rendererMessage = '3D renderer forced by URL parameter.';
    } else {
      state.renderer = '2d';
      state.rendererMessage = '3D renderer was requested by URL parameter, but this session stayed in fallback mode.';
    }
  } else if (runtime.requestedRenderer === '2d') {
    setRenderer(state, '2d');
    state.rendererMessage = '2D renderer forced by URL parameter.';
  } else if (state.rendererReady) {
    setRenderer(state, '3d');
    state.rendererMessage = '3D delivery view active. Switch to 2D only when you want the tactical sheet.';
  } else {
    setRenderer(state, '2d');
  }
  ui.render(state);
  loop.start();

  if (runtime.diagnostics) {
    window.render_game_to_text = () => buildTextState(state);
    window.advanceTime = (ms = 16) => { loop.step(ms); return buildTextState(state); };
    window.forceRenderer = (renderer) => {
      if (renderer === '2d') { setRenderer(state, '2d'); ui.render(state); return state.renderer; }
      if (renderer === '3d' && state.rendererReady) { setRenderer(state, '3d'); ui.render(state); return state.renderer; }
      return state.renderer;
    };
    window.__curlingDiagnostics = {
      rendererReady: state.rendererReady,
      renderer: state.renderer,
      rendererMessage: state.rendererMessage,
      webglOk,
    };
  }

  return {
    state,
    ui,
    loop,
    renderBridge,
    audio,
  };
}

try {
  mount();
} catch (err) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<pre style="color:#ff6666;padding:24px;font-family:monospace;white-space:pre-wrap;max-width:100vw;overflow-x:auto">${err.stack || err.message || err}</pre>`;
  }
  console.error('Mount failed:', err);
}
