import { createGameState, resetPlayingSurface, seedChallenge, startMode } from './game/state.js';
import { createLoop } from './game/loop.js';
import { bindInput } from './game/input.js';
import { createRenderer2D } from './render/renderer2d.js';
import { createRenderer3D } from './render/renderer3d.js';
import { createUI } from './render/ui.js';
import { createAudioManager } from './audio/manager.js';
import { simulateTrajectory } from './physics/trajectory.js';
import { createStone } from './physics/stone.js';
import { PHYSICS, SHEET } from './physics/constants.js';

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

function mount() {
  const root = document.querySelector('#app');
  const ui = createUI(root);
  const state = createGameState();
  const renderer2d = createRenderer2D(ui.elements.surface2d);
  const renderer3d = createRenderer3D(ui.elements.surface3d);
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
      renderer2d.setVisible(currentState.renderer === '2d');
      renderer3d.setVisible(currentState.renderer === '3d');
      renderer2d.sync(currentState);
      renderer3d.sync(currentState, movingStone);
      audio.updateMotion(movingStone, currentState.sweeping);
      multiplayer.sync();
    },
    render() {
      if (state.renderer === '2d') renderer2d.render();
      else renderer3d.render();
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
    rendererToggle: ui.elements.rendererToggle,
    cameraSelect: ui.elements.cameraSelect,
    modeSelect: ui.elements.modeSelect,
    weightButtons: ui.elements.weightButtons,
    challengeSelect: ui.elements.challengeSelect,
    resetButton: ui.elements.resetButton,
    practiceButton: ui.elements.practiceButton,
    multiplayerButton: ui.elements.multiplayerButton,
    challengeButton: ui.elements.challengeButton,
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

  window.addEventListener('resize', resize);
  resize();
  startMode(state, 'exhibition');
  ui.render(state);
  loop.start();

  window.render_game_to_text = () => buildTextState(state);
  window.advanceTime = (ms = 16) => {
    loop.step(ms);
    return buildTextState(state);
  };

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
