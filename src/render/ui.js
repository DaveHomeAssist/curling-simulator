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
    <div class="curling-shell">
      <header class="panel header">
        <div class="title-group">
          <span class="eyebrow">Olympic Venue Prototype</span>
          <h1 class="title">Curling Simulator</h1>
          <p class="subtitle">3D-first delivery view with tactical 2D fallback.</p>
        </div>
        <div class="header-strip">
          <div class="header-scoreline" id="header-scoreline">Red 0 · 0 Yellow</div>
          <div class="header-endline" id="header-endline">End 1 · Stone 1 / 16</div>
        </div>
        <div class="toolbar header-tools">
          ${button('Reset Sheet', 'action-button', { id: 'reset-button', type: 'button' })}
        </div>
      </header>

      <aside class="panel left-panel">
        <section class="control-group">
          <span class="small-label">Mode</span>
          <select id="mode-select">
            ${option('exhibition', 'Exhibition')}
            ${option('tournament', 'Tournament')}
            ${option('practice', 'Practice')}
            ${option('challenge', 'Shot Challenge')}
            ${option('multiplayer', 'Multiplayer (Experimental)')}
          </select>
        </section>
        <section class="control-group" id="camera-group">
          <span class="small-label">Camera</span>
          <select id="camera-select">
            ${option('delivery', 'Delivery')}
            ${option('follow', 'Follow')}
            ${option('house', 'House')}
            ${option('broadcast', 'Broadcast')}
            ${option('free', 'Free')}
          </select>
        </section>
        <section class="control-group" id="challenge-group">
          <span class="small-label">Challenge Sheet</span>
          <select id="challenge-select">
            ${CHALLENGES.map((challenge) => option(challenge.id, challenge.name)).join('')}
          </select>
        </section>
        <section class="control-group">
          <span class="small-label">Delivery</span>
          <div class="preset-grid" id="weight-preset-grid">
            ${button('Guard', 'action-button preset-button', { type: 'button', 'data-preset': 'guard' })}
            ${button('Draw', 'action-button preset-button', { type: 'button', 'data-preset': 'draw' })}
            ${button('Control', 'action-button preset-button', { type: 'button', 'data-preset': 'control' })}
            ${button('Takeout', 'action-button preset-button', { type: 'button', 'data-preset': 'takeout' })}
            ${button('Peel', 'action-button preset-button', { type: 'button', 'data-preset': 'peel' })}
          </div>
          ${button('Spin: In-turn', 'action-button is-primary', { id: 'spin-toggle', type: 'button' })}
        </section>
        <section class="meta-grid">
          <div class="stat-card">
            <div class="stat-label">End</div>
            <div class="stat-value" id="end-value">1</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Team</div>
            <div class="stat-value" id="current-team-value">RED</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Shot</div>
            <div class="stat-value" id="shot-value">1 / 16</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Hammer</div>
            <div class="stat-value" id="hammer-value">YEL</div>
          </div>
        </section>
        <section class="control-group">
          <span class="small-label">First Throw</span>
          <div class="legend">Drag on the sheet to aim. Hold to charge. Release to throw.</div>
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
          <div class="surface-hud surface-hud-left">
            <div class="small-label">Power</div>
            <div class="power-rail">
              <div class="power-fill-vertical" id="power-fill"></div>
            </div>
            <div class="legend tip-copy">Release at the peak.</div>
          </div>
          <div class="surface-hud surface-hud-bottom">
            <div class="hud-chip" id="hud-weight">Draw</div>
            <div class="hud-chip" id="hud-spin">In-turn</div>
            <div class="hud-chip" id="hud-team">Red hammer</div>
            <div class="hud-chip" id="hud-shot">Stone 1 / 16</div>
            <div class="legend surface-shot-summary" id="shot-summary">Aim the broom and prepare the throw.</div>
          </div>
        </div>
      </main>

      <aside class="panel right-panel">
        <section class="control-group scoreboard-wrap">
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
        <section class="control-group mode-wrap">
          <span class="small-label">Mode Detail</span>
          <div class="legend" id="challenge-meta"></div>
          <div class="legend" id="multiplayer-meta"></div>
        </section>
        <section class="control-group playbyplay-wrap">
          <span class="small-label">Play-by-Play</span>
          <div class="message-list" id="message-list"></div>
        </section>
      </aside>
    </div>
  `;

  const elements = {
    shell: root.querySelector('.curling-shell'),
    surface2d: root.querySelector('#surface-2d'),
    surface3d: root.querySelector('#surface-3d'),
    overlay: root.querySelector('#input-overlay'),
    headerScoreline: root.querySelector('#header-scoreline'),
    headerEndline: root.querySelector('#header-endline'),
    resetButton: root.querySelector('#reset-button'),
    challengeButton: root.querySelector('#challenge-button'),
    practiceButton: root.querySelector('#practice-button'),
    multiplayerButton: root.querySelector('#multiplayer-button'),
    cameraGroup: root.querySelector('#camera-group'),
    cameraSelect: root.querySelector('#camera-select'),
    modeSelect: root.querySelector('#mode-select'),
    challengeGroup: root.querySelector('#challenge-group'),
    challengeSelect: root.querySelector('#challenge-select'),
    spinToggle: root.querySelector('#spin-toggle'),
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
    hudWeight: root.querySelector('#hud-weight'),
    hudSpin: root.querySelector('#hud-spin'),
    hudTeam: root.querySelector('#hud-team'),
    hudShot: root.querySelector('#hud-shot'),
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
      elements.cameraGroup.hidden = state.renderer !== '3d';
      elements.challengeGroup.hidden = state.gameMode !== 'challenge';
      elements.rendererPill.textContent = `Renderer: ${state.renderer.toUpperCase()}`;
      elements.cameraPill.textContent = `Camera: ${state.cameraMode[0].toUpperCase()}${state.cameraMode.slice(1)}`;
      elements.scoreRed.textContent = String(state.totalScore.red);
      elements.scoreYel.textContent = String(state.totalScore.yel);
      elements.headerScoreline.textContent = `Red ${state.totalScore.red} · ${state.totalScore.yel} Yellow`;
      elements.headerEndline.textContent = `End ${state.end} · Stone ${state.shotNumber + 1} / 16`;
      elements.endValue.textContent = `${state.end}`;
      elements.hammerValue.textContent = state.hammerTeam.toUpperCase();
      elements.currentTeamValue.textContent = state.currentTeam.toUpperCase();
      elements.shotValue.textContent = `${state.shotNumber + 1} / 16`;
      renderScoreTable(state);
      elements.powerFill.style.height = `${Math.max(4, Math.round(state.powerCharge * 100))}%`;
      elements.shotSummary.textContent = `${state.weightPresets[state.selectedWeight].label} • ${state.spin > 0 ? 'In-turn' : 'Out-turn'} • ${state.mode.toUpperCase()}`;
      elements.hudWeight.textContent = state.weightPresets[state.selectedWeight].label;
      elements.hudSpin.textContent = state.spin > 0 ? 'In-turn' : 'Out-turn';
      elements.hudTeam.textContent = `${state.currentTeam.toUpperCase()} · hammer ${state.hammerTeam.toUpperCase()}`;
      elements.hudShot.textContent = `Stone ${state.shotNumber + 1} / 16`;
      elements.challengeMeta.textContent = state.gameMode === 'challenge'
        ? `Challenge result: ${state.challengeMedal ?? 'pending'}${state.challengeResult !== null ? ` · ${state.challengeResult.toFixed(2)}m` : ''}`
        : '';
      elements.multiplayerMeta.textContent = state.gameMode === 'multiplayer'
        ? `Room ${state.multiplayer.roomCode} · ${state.multiplayer.status}`
        : '';
      elements.rendererSummary.textContent = /(failed|unavailable|safe mode|cannot)/i.test(state.rendererMessage)
        ? state.rendererMessage
        : '';
      if (elements.spinToggle) {
        elements.spinToggle.textContent = `Spin: ${state.spin > 0 ? 'In-turn' : 'Out-turn'}`;
        elements.spinToggle.dataset.active = 'true';
        elements.spinToggle.classList.toggle('is-primary', state.spin > 0);
        elements.spinToggle.classList.toggle('is-accent', state.spin < 0);
      }

      const playerMessages = state.messages
        .filter((message) => !/(renderer|audio|initialized|safe mode|webgl|override|broadcast-channel|multiplayer status)/i.test(message))
        .slice(0, 6);
      elements.messageList.innerHTML = playerMessages
        .map((message) => `<div class="message-item">${message}</div>`)
        .join('');

      elements.weightButtons.forEach((button) => {
        button.dataset.active = String(button.dataset.preset === state.selectedWeight);
      });
    },
  };
}
