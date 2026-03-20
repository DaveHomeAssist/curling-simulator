import { CHALLENGES } from '../game/challenges.js';

function button(label, className = '', attrs = {}) {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${String(value)}"`)
    .join('');
  return `<button class="${className}"${attrString}>${label}</button>`;
}

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
}

export function createUI(root) {
  root.innerHTML = `
    <style>
      .curling-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr) 320px;
        grid-template-rows: auto 1fr auto;
        gap: 14px;
        padding: 16px;
      }

      .panel {
        background: rgba(10, 18, 29, 0.88);
        border: 1px solid rgba(152, 187, 233, 0.14);
        border-radius: 18px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(16px);
      }

      .panel h2, .panel h3, .panel p {
        margin: 0;
      }

      .header {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
      }

      .title-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .eyebrow {
        color: #8bb7e5;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 11px;
      }

      .title {
        font-size: 28px;
        font-weight: 800;
      }

      .subtitle {
        color: #c1d6ec;
        font-size: 14px;
      }

      .left-panel, .right-panel {
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .surface-panel {
        position: relative;
        overflow: hidden;
        min-height: 700px;
      }

      .surface-stack {
        position: absolute;
        inset: 0;
      }

      .render-surface, .input-overlay {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .render-surface canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .input-overlay {
        z-index: 2;
      }

      .surface-badges {
        position: absolute;
        top: 16px;
        left: 16px;
        right: 16px;
        z-index: 4;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
      }

      .pill {
        border-radius: 999px;
        padding: 7px 11px;
        background: rgba(6, 14, 22, 0.74);
        border: 1px solid rgba(158, 192, 231, 0.14);
        color: #dfeefe;
        font-size: 12px;
      }

      .toolbar, .button-row, .preset-grid, .meta-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-group label,
      .small-label {
        color: #9ab7d3;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      select, button {
        font: inherit;
      }

      select, .action-button {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(145, 177, 214, 0.14);
        background: rgba(9, 17, 28, 0.78);
        color: #ecf5ff;
        padding: 11px 12px;
      }

      .action-button {
        cursor: pointer;
        transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
      }

      .action-button:hover {
        transform: translateY(-1px);
        border-color: rgba(172, 205, 244, 0.28);
        background: rgba(18, 30, 46, 0.92);
      }

      .action-button.is-primary {
        background: linear-gradient(135deg, #2b73cb 0%, #5594e5 100%);
        color: #f9fdff;
      }

      .action-button.is-accent {
        background: linear-gradient(135deg, #bb4b49 0%, #d06a58 100%);
      }

      .preset-button[data-active="true"] {
        background: rgba(67, 118, 183, 0.48);
        border-color: rgba(178, 214, 255, 0.32);
      }

      .stat-card {
        padding: 14px;
        border-radius: 16px;
        background: rgba(8, 16, 26, 0.76);
        border: 1px solid rgba(145, 177, 214, 0.1);
      }

      .stat-label {
        color: #87a6c6;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .stat-value {
        margin-top: 6px;
        font-size: 28px;
        font-weight: 800;
      }

      .score-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .message-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 240px;
        overflow: auto;
      }

      .message-item {
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(8, 14, 23, 0.9);
        border: 1px solid rgba(145, 177, 214, 0.08);
        color: #cfe2f7;
        line-height: 1.45;
      }

      .scoreboard-table {
        width: 100%;
        border-collapse: collapse;
      }

      .scoreboard-table th,
      .scoreboard-table td {
        padding: 8px 6px;
        text-align: center;
        border-bottom: 1px solid rgba(145, 177, 214, 0.08);
      }

      .scoreboard-table th {
        color: #90b1cf;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .hud {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        gap: 14px;
      }

      .hud-card {
        padding: 16px 18px;
      }

      .meter {
        width: 100%;
        height: 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        overflow: hidden;
      }

      .meter-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #79b5ff, #e8f4ff, #efb16b);
      }

      .legend {
        color: #98b8d8;
        font-size: 13px;
        line-height: 1.55;
      }

      .legend.is-warning {
        color: #ffd3a2;
      }

      @media (max-width: 1260px) {
        .curling-shell {
          grid-template-columns: 1fr;
          grid-template-rows: auto auto minmax(600px, 1fr) auto auto;
        }

        .surface-panel {
          min-height: 560px;
        }

        .hud {
          grid-template-columns: 1fr;
        }
      }
    </style>
    <div class="curling-shell">
      <header class="panel header">
        <div class="title-group">
          <span class="eyebrow">Olympic Venue Prototype</span>
          <h1 class="title">Curling Simulator</h1>
          <p class="subtitle">3D arena renderer, AI skip, audio, challenges, and experimental multiplayer.</p>
        </div>
        <div class="toolbar">
          ${button('Reset Sheet', 'action-button', { id: 'reset-button', type: 'button' })}
          ${button('Challenge', 'action-button', { id: 'challenge-button', type: 'button' })}
          ${button('Practice', 'action-button', { id: 'practice-button', type: 'button' })}
          ${button('Multiplayer', 'action-button is-accent', { id: 'multiplayer-button', type: 'button' })}
        </div>
      </header>

      <aside class="panel left-panel">
        <section class="control-group">
          <span class="small-label">Game Mode</span>
          <select id="mode-select">
            ${option('exhibition', 'Exhibition')}
            ${option('tournament', 'Tournament')}
            ${option('practice', 'Practice')}
            ${option('challenge', 'Shot Challenge')}
            ${option('multiplayer', 'Multiplayer (Experimental)')}
          </select>
        </section>
        <section class="control-group">
          <span class="small-label">Camera</span>
          <select id="camera-select">
            ${option('delivery', 'Delivery')}
            ${option('follow', 'Follow')}
            ${option('house', 'House')}
            ${option('broadcast', 'Broadcast')}
            ${option('free', 'Free')}
          </select>
        </section>
        <section class="control-group">
          <span class="small-label">Shot Weight</span>
          <div class="preset-grid" id="weight-preset-grid">
            ${button('Guard', 'action-button preset-button', { type: 'button', 'data-preset': 'guard' })}
            ${button('Draw', 'action-button preset-button', { type: 'button', 'data-preset': 'draw' })}
            ${button('Control', 'action-button preset-button', { type: 'button', 'data-preset': 'control' })}
            ${button('Takeout', 'action-button preset-button', { type: 'button', 'data-preset': 'takeout' })}
            ${button('Peel', 'action-button preset-button', { type: 'button', 'data-preset': 'peel' })}
          </div>
        </section>
        <section class="control-group">
          <span class="small-label">Challenge Sheet</span>
          <select id="challenge-select">
            ${CHALLENGES.map((challenge) => option(challenge.id, challenge.name)).join('')}
          </select>
        </section>
        <section class="meta-grid">
          <div class="stat-card">
            <div class="stat-label">Current End</div>
            <div class="stat-value" id="end-value">1</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Hammer</div>
            <div class="stat-value" id="hammer-value">YEL</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Current Team</div>
            <div class="stat-value" id="current-team-value">RED</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Shot</div>
            <div class="stat-value" id="shot-value">1 / 16</div>
          </div>
        </section>
        <section class="control-group">
          <span class="small-label">Controls</span>
          <div class="legend">
            Drag or arrow keys to aim. Hold mouse or press space to charge, release to throw.
            Q/E sets turn direction. 1–5 swaps shot weight. C cycles cameras. 3D is the primary view.
          </div>
          <div class="legend is-warning" id="renderer-summary"></div>
        </section>
      </aside>

      <main class="panel surface-panel">
        <div class="surface-badges">
          <div class="pill" id="renderer-pill">Renderer: 3D</div>
          <div class="pill" id="camera-pill">Camera: Delivery</div>
        </div>
        <div class="surface-stack">
          <canvas id="surface-2d" class="render-surface"></canvas>
          <div id="surface-3d" class="render-surface"></div>
          <div id="input-overlay" class="input-overlay"></div>
        </div>
      </main>

      <aside class="panel right-panel">
        <section class="control-group">
          <span class="small-label">Scoreboard</span>
          <div class="score-grid">
            <div class="stat-card">
              <div class="stat-label">Red</div>
              <div class="stat-value" id="score-red">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Yellow</div>
              <div class="stat-value" id="score-yel">0</div>
            </div>
          </div>
          <table class="scoreboard-table" id="scoreboard-table"></table>
        </section>
        <section class="control-group">
          <span class="small-label">Challenge / Multiplayer</span>
          <div class="legend" id="challenge-meta"></div>
          <div class="legend" id="multiplayer-meta"></div>
        </section>
        <section class="control-group">
          <span class="small-label">Ice-side Notes</span>
          <div class="message-list" id="message-list"></div>
        </section>
      </aside>

      <section class="panel hud">
        <div class="hud-card">
          <div class="small-label">Power</div>
          <div class="meter"><div id="power-fill" class="meter-fill"></div></div>
          <div class="legend" id="shot-summary">Aim the broom and prepare the throw.</div>
        </div>
        <div class="hud-card">
          <div class="small-label">AI Skip</div>
          <div class="legend" id="ai-summary">Regional difficulty, yellow team skip enabled.</div>
        </div>
        <div class="hud-card">
          <div class="small-label">Audio / Renderer</div>
          <div class="legend" id="tech-summary">Audio ready, wake trail live, renderer synced.</div>
        </div>
      </section>
    </div>
  `;

  const elements = {
    shell: root.querySelector('.curling-shell'),
    surface2d: root.querySelector('#surface-2d'),
    surface3d: root.querySelector('#surface-3d'),
    overlay: root.querySelector('#input-overlay'),
    resetButton: root.querySelector('#reset-button'),
    challengeButton: root.querySelector('#challenge-button'),
    practiceButton: root.querySelector('#practice-button'),
    multiplayerButton: root.querySelector('#multiplayer-button'),
    cameraSelect: root.querySelector('#camera-select'),
    modeSelect: root.querySelector('#mode-select'),
    challengeSelect: root.querySelector('#challenge-select'),
    weightButtons: [...root.querySelectorAll('.preset-button')],
    rendererPill: root.querySelector('#renderer-pill'),
    cameraPill: root.querySelector('#camera-pill'),
    scoreRed: root.querySelector('#score-red'),
    scoreYel: root.querySelector('#score-yel'),
    endValue: root.querySelector('#end-value'),
    hammerValue: root.querySelector('#hammer-value'),
    currentTeamValue: root.querySelector('#current-team-value'),
    shotValue: root.querySelector('#shot-value'),
    scoreboardTable: root.querySelector('#scoreboard-table'),
    messageList: root.querySelector('#message-list'),
    powerFill: root.querySelector('#power-fill'),
    shotSummary: root.querySelector('#shot-summary'),
    aiSummary: root.querySelector('#ai-summary'),
    techSummary: root.querySelector('#tech-summary'),
    challengeMeta: root.querySelector('#challenge-meta'),
    multiplayerMeta: root.querySelector('#multiplayer-meta'),
    rendererSummary: root.querySelector('#renderer-summary'),
  };

  function renderScoreTable(state) {
    const endCount = Math.max(state.scoreByEnd.red.length, state.scoreByEnd.yel.length, 1);
    const endHeaders = Array.from({ length: endCount }, (_, index) => `<th>${index + 1}</th>`).join('');
    elements.scoreboardTable.innerHTML = `
      <thead>
        <tr><th>Team</th>${endHeaders}<th>T</th></tr>
      </thead>
      <tbody>
        <tr><td>RED</td>${Array.from({ length: endCount }, (_, index) => `<td>${state.scoreByEnd.red[index] ?? ''}</td>`).join('')}<td>${state.totalScore.red}</td></tr>
        <tr><td>YEL</td>${Array.from({ length: endCount }, (_, index) => `<td>${state.scoreByEnd.yel[index] ?? ''}</td>`).join('')}<td>${state.totalScore.yel}</td></tr>
      </tbody>
    `;
  }

  return {
    elements,
    render(state) {
      elements.modeSelect.value = state.gameMode;
      elements.cameraSelect.value = state.cameraMode;
      elements.challengeSelect.value = state.selectedChallengeId ?? CHALLENGES[0].id;
      elements.rendererPill.textContent = `Renderer: ${state.renderer.toUpperCase()}`;
      elements.cameraPill.textContent = `Camera: ${state.cameraMode[0].toUpperCase()}${state.cameraMode.slice(1)}`;
      elements.scoreRed.textContent = String(state.totalScore.red);
      elements.scoreYel.textContent = String(state.totalScore.yel);
      elements.endValue.textContent = `${state.end}`;
      elements.hammerValue.textContent = state.hammerTeam.toUpperCase();
      elements.currentTeamValue.textContent = state.currentTeam.toUpperCase();
      elements.shotValue.textContent = `${state.shotNumber + 1} / 16`;
      renderScoreTable(state);
      elements.powerFill.style.width = `${Math.round(state.powerCharge * 100)}%`;
      elements.shotSummary.textContent = `${state.weightPresets[state.selectedWeight].label} • ${state.spin > 0 ? 'In-turn' : 'Out-turn'} • ${state.mode.toUpperCase()}`;
      elements.aiSummary.textContent = state.ai.enabled
        ? `${state.ai.difficulty} AI skip ${state.ai.thinking ? 'is calling line…' : 'is ready.'}`
        : 'AI disabled for this mode.';
      elements.techSummary.textContent = `Renderer ${state.renderer.toUpperCase()} • Audio ${state.audio.enabled ? 'on' : 'off'} • Multiplayer ${state.multiplayer.status}`;
      elements.challengeMeta.textContent = state.gameMode === 'challenge'
        ? `Challenge result: ${state.challengeMedal ?? 'pending'}${state.challengeResult !== null ? ` · ${state.challengeResult.toFixed(2)}m` : ''}`
        : 'Select challenge mode for target-shot drills.';
      elements.multiplayerMeta.textContent = `Room ${state.multiplayer.roomCode} · Role ${state.multiplayer.role} · ${state.multiplayer.status}`;
      elements.rendererSummary.textContent = state.rendererMessage;

      elements.messageList.innerHTML = state.messages
        .map((message) => `<div class="message-item">${message}</div>`)
        .join('');

      elements.weightButtons.forEach((button) => {
        button.dataset.active = String(button.dataset.preset === state.selectedWeight);
      });
    },
  };
}
