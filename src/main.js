import { createGameState } from './game/state.js';
import { createLoop } from './game/loop.js';
import { bindInput } from './game/input.js';
import { createRenderer3D } from './render/renderer3d.js';

const app = document.getElementById('app');
if (!app) throw new Error('#app container not found');

// ── Build DOM shell ──
app.innerHTML = `
<div id="curling-root" style="display:flex;flex-direction:column;height:100vh;overflow:hidden;font-family:'DM Sans',system-ui,sans-serif;color:#E8EAF2">
  <header style="background:#12151F;border-bottom:1px solid #1E2235;padding:8px 20px;display:flex;align-items:center;gap:16px;flex-shrink:0">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px">CURLING <span style="color:#4488FF">SIM</span></div>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:#5A6080;letter-spacing:0.08em">3D ENGINE</div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:12px;font-family:'DM Mono',monospace;font-size:11px">
      <span style="color:#FF5555" id="ui-score-red">0</span>
      <span style="color:#5A6080">&middot;</span>
      <span style="color:#D4A017" id="ui-score-yel">0</span>
      <span style="color:#5A6080;margin-left:8px">End</span>
      <span id="ui-end">1</span>
      <span style="color:#5A6080;margin-left:8px">Stone</span>
      <span id="ui-shot">1</span>
    </div>
  </header>

  <div style="display:flex;flex:1;overflow:hidden">
    <div id="viewport" style="flex:1;position:relative;min-width:0"></div>

    <div style="width:240px;flex-shrink:0;background:#12151F;border-left:1px solid #1E2235;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:14px">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#5A6080;margin-bottom:8px">Weight</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="weight-buttons">
          <button data-preset="guard" class="wbtn">Guard</button>
          <button data-preset="draw" class="wbtn active">Draw</button>
          <button data-preset="control" class="wbtn">Control</button>
          <button data-preset="takeout" class="wbtn">Takeout</button>
          <button data-preset="peel" class="wbtn">Peel</button>
        </div>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#5A6080;margin-bottom:8px">Rotation</div>
        <button id="spin-toggle" class="wbtn" style="width:100%">In-turn (CW)</button>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#5A6080;margin-bottom:8px">Camera</div>
        <select id="camera-select" style="width:100%;background:#1E2235;color:#E8EAF2;border:1px solid #1E2235;padding:6px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px">
          <option value="delivery">Delivery</option>
          <option value="follow">Follow</option>
          <option value="house">House (Top)</option>
          <option value="broadcast">Broadcast</option>
          <option value="free">Free</option>
        </select>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#5A6080;margin-bottom:8px">Mode</div>
        <select id="mode-select" style="width:100%;background:#1E2235;color:#E8EAF2;border:1px solid #1E2235;padding:6px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-size:10px">
          <option value="exhibition">Exhibition</option>
          <option value="practice">Practice</option>
          <option value="challenge">Challenge</option>
        </select>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#5A6080;margin-bottom:8px">Status</div>
        <div id="ui-status" style="font-family:'DM Mono',monospace;font-size:10px;color:#5A6080;line-height:1.8">Awaiting delivery...</div>
      </div>
      <button id="reset-btn" class="wbtn" style="width:100%;margin-top:auto;border-color:#663333;color:#FF6666">Reset Surface</button>
    </div>
  </div>

  <div style="background:#12151F;border-top:1px solid #1E2235;padding:6px 20px;font-family:'DM Mono',monospace;font-size:10px;color:#5A6080;display:flex;gap:16px;flex-shrink:0">
    <span style="color:#4488FF" id="ui-phase">AIM</span>
    <span>Turn: <span id="ui-turn">Red</span></span>
    <span style="margin-left:auto">Click/drag to aim &middot; Hold to charge &middot; Space to sweep</span>
  </div>
</div>

<style>
  .wbtn {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    padding: 5px 8px;
    border-radius: 4px;
    border: 1px solid #1E2235;
    background: transparent;
    color: #5A6080;
    cursor: pointer;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    transition: all 0.1s;
  }
  .wbtn:hover, .wbtn.active {
    border-color: #4488FF;
    color: #4488FF;
    background: rgba(68,136,255,0.08);
  }
</style>
`;

// ── State ──
const state = createGameState();

// ── 3D Renderer ──
const viewport = document.getElementById('viewport');
const render = createRenderer3D(viewport);

function handleResize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  if (w > 0 && h > 0) render.resize(w, h);
}
window.addEventListener('resize', handleResize);
requestAnimationFrame(handleResize);

// ── UI sync ──
const ui = {
  render(s) {
    document.getElementById('ui-score-red').textContent = s.totalScore.red;
    document.getElementById('ui-score-yel').textContent = s.totalScore.yel;
    document.getElementById('ui-end').textContent = s.end;
    document.getElementById('ui-shot').textContent = s.shotNumber + 1;
    document.getElementById('ui-phase').textContent = s.mode.toUpperCase();
    document.getElementById('ui-turn').textContent = s.currentTeam === 'red' ? 'Red' : 'Yellow';
    document.getElementById('ui-status').textContent = s.messages[0] || '';

    // Weight button active state
    document.querySelectorAll('#weight-buttons .wbtn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === s.selectedWeight);
    });

    // Spin label
    const spinBtn = document.getElementById('spin-toggle');
    if (spinBtn) spinBtn.textContent = s.spin > 0 ? 'In-turn (CW)' : 'Out-turn (CCW)';
  },
};

// ── Input ──
const elements = {
  surface: viewport.querySelector('canvas') || viewport,
  overlay: document.getElementById('curling-root'),
  weightButtons: document.querySelectorAll('#weight-buttons .wbtn'),
  spinToggle: document.getElementById('spin-toggle'),
  cameraSelect: document.getElementById('camera-select'),
  modeSelect: document.getElementById('mode-select'),
  resetButton: document.getElementById('reset-btn'),
};

const services = {
  render,
  ui,
  audio: {
    onCollision() {},
    onShotComplete() {},
    onSkipCall() {},
  },
  effects: {
    updateWake() {},
    tick() {},
  },
  actions: {
    resetSurface() {
      state.stones = [];
      state.preview = [];
      state.movingStoneId = null;
      state.canThrow = true;
      state.mode = 'aim';
      state.dirtyPreview = true;
      state.effects = { sweepTrail: [], wakeTrail: [], impacts: [] };
    },
  },
};

bindInput(state, elements, services);

// ── Game loop ──
const loop = createLoop(state, services);
loop.start();
