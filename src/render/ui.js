import { CHALLENGES } from '../game/challenges.js';
import { getShotCall, getWeightDisplay } from '../game/state.js';

function button(label, className = '', attrs = {}) {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${String(value)}"`)
    .join('');
  return `<button class="${className}"${attrString}>${label}</button>`;
}

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
}

function renderScoreTable(table, state) {
  const endCount = Math.max(state.scoreByEnd.red.length, state.scoreByEnd.yel.length, 1);
  const endHeaders = Array.from({ length: endCount }, (_, index) => `<th>${index + 1}</th>`).join('');
  table.innerHTML = `
    <thead>
      <tr><th>Team</th>${endHeaders}<th>T</th></tr>
    </thead>
    <tbody>
      <tr><td>RED</td>${Array.from({ length: endCount }, (_, index) => `<td>${state.scoreByEnd.red[index] ?? ''}</td>`).join('')}<td>${state.totalScore.red}</td></tr>
      <tr><td>YEL</td>${Array.from({ length: endCount }, (_, index) => `<td>${state.scoreByEnd.yel[index] ?? ''}</td>`).join('')}<td>${state.totalScore.yel}</td></tr>
    </tbody>
  `;
}

function broomPercent(aimX) {
  const percent = ((aimX + 2.2) / 4.4) * 100;
  return Math.max(10, Math.min(90, percent));
}

export function createUI(root) {
  root.innerHTML = `
    <div class="mobile-shell" data-phase="setup">
      <header class="score-strip" id="score-strip" role="button" tabindex="0" aria-label="Open end-by-end scoring">
        <div class="score-team score-team-red"><span class="team-dot"></span><span>RED</span></div>
        <div class="score-core">
          <div class="score-values"><span id="score-red">0</span><span class="score-sep">·</span><span id="score-yel">0</span></div>
          <div class="score-meta"><span id="score-end">END 1 / 10</span><span id="score-hammer">🔨 YELLOW</span></div>
        </div>
        <div class="score-team score-team-yel"><span>YELLOW</span><span class="team-dot"></span></div>
        ${button('⚙', 'icon-button score-settings', { id: 'settings-toggle', type: 'button', 'aria-label': 'Open settings' })}
      </header>

      <main class="viewport-shell">
        <div class="surface-stack">
          <canvas id="surface-2d" class="render-surface"></canvas>
          <div id="surface-3d" class="render-surface"></div>
          <div id="input-overlay" class="input-overlay">
            <div class="broom-marker" id="broom-marker">🧹</div>
            <div class="power-arc" id="power-arc" hidden>
              <div class="power-arc-ring" id="power-ring"></div>
              <div class="power-arc-content">
                <div class="power-value" id="power-value">45%</div>
                <div class="power-label" id="power-label">DRAW</div>
              </div>
            </div>
          </div>
          <div class="surface-summary-chip" id="shot-summary">DRAW · IN-TURN · 45% · STONE 1/16</div>
          <div class="result-chip" id="result-chip" hidden>
            <div class="result-chip-title" id="result-title"></div>
            <div class="result-chip-detail" id="result-detail"></div>
          </div>
          <div class="tutorial-card" id="tutorial-panel" hidden>
            <div class="tutorial-step"><span>1</span><strong>Drag to place the broom.</strong></div>
            <div class="tutorial-step"><span>2</span><strong>Pick shot and turn, then tap CHARGE.</strong></div>
            <div class="tutorial-step"><span>3</span><strong>Hold and release to throw. Sweep while the stone runs.</strong></div>
            ${button('Got it', 'drawer-button drawer-button-primary', { id: 'tutorial-dismiss', type: 'button' })}
          </div>
        </div>
      </main>

      <footer class="shot-drawer" id="shot-drawer">
        <div class="drawer-phase drawer-setup" id="drawer-setup">
          <div class="drawer-header">
            <div>
              <div class="drawer-kicker" id="drawer-stone">STONE 1 / 16</div>
              <div class="drawer-caption" id="drawer-caption">Select the shot call, then charge.</div>
            </div>
            ${button('Reset', 'drawer-chip-button', { id: 'reset-button', type: 'button' })}
          </div>

          <div class="drawer-steps">
            <section class="step-card">
              <div class="step-label">STEP 1 · SHOT TYPE</div>
              <div class="shot-grid">
                ${button('Draw', 'step-pill shot-button', { type: 'button', 'data-preset': 'draw' })}
                ${button('Guard', 'step-pill shot-button', { type: 'button', 'data-preset': 'guard' })}
                ${button('Hit', 'step-pill shot-button', { type: 'button', 'data-preset': 'takeout' })}
                ${button('Freeze', 'step-pill shot-button', { type: 'button', 'data-preset': 'freeze' })}
                ${button('Peel', 'step-pill shot-button', { type: 'button', 'data-preset': 'peel' })}
              </div>
            </section>

            <section class="step-card">
              <div class="step-label">STEP 2 · TURN</div>
              <div class="turn-grid">
                ${button('In ↻', 'step-pill turn-button', { id: 'turn-in', type: 'button', 'data-spin': '1' })}
                ${button('Out ↺', 'step-pill turn-button', { id: 'turn-out', type: 'button', 'data-spin': '-1' })}
              </div>
            </section>

            <section class="step-card step-card-ready">
              <div class="step-label">STEP 3 · READY</div>
              ${button('CHARGE', 'drawer-button drawer-button-primary', { id: 'charge-button', type: 'button' })}
            </section>
          </div>

          <div class="drawer-call-row">
            <div class="call-chip"><span>Intent</span><strong id="call-intent">Draw</strong></div>
            <div class="call-chip"><span>Broom</span><strong id="call-line">Center line</strong></div>
            <div class="call-chip"><span>Handle</span><strong id="call-handle">In-turn</strong></div>
            <div class="call-chip"><span>Weight</span><strong id="call-weight">Draw · Board</strong></div>
          </div>

          <div class="drawer-detail" id="challenge-detail"></div>
        </div>

        <div class="drawer-phase drawer-travel" id="drawer-travel" hidden>
          <div class="travel-summary" id="travel-summary">DRAW · IN-TURN · 74% · STONE 3/16</div>
          <div class="sweep-call" id="sweep-call">HARD!</div>
          ${button('SWEEP', 'sweep-button', { id: 'sweep-button', type: 'button' })}
        </div>
      </footer>

      <div class="sheet-modal" id="history-modal" hidden>
        <div class="sheet-backdrop" data-close-modal="history"></div>
        <div class="sheet-panel">
          <div class="sheet-panel-header">
            <div>
              <div class="drawer-kicker">END-BY-END</div>
              <div class="sheet-panel-title">Score history</div>
            </div>
            ${button('Close', 'drawer-chip-button', { type: 'button', 'data-close-modal': 'history' })}
          </div>
          <table class="scoreboard-table" id="scoreboard-table"></table>
          <div class="play-list" id="message-list"></div>
        </div>
      </div>

      <div class="sheet-modal" id="settings-modal" hidden>
        <div class="sheet-backdrop" data-close-modal="settings"></div>
        <div class="sheet-panel">
          <div class="sheet-panel-header">
            <div>
              <div class="drawer-kicker">SETTINGS</div>
              <div class="sheet-panel-title">Match options</div>
            </div>
            ${button('Close', 'drawer-chip-button', { type: 'button', 'data-close-modal': 'settings' })}
          </div>

          <div class="settings-grid">
            <label class="settings-field">
              <span>Game Mode</span>
              <select id="mode-select">
                ${option('exhibition', 'Exhibition')}
                ${option('practice', 'Practice')}
                ${option('challenge', 'Shot Challenge')}
                ${option('tournament', 'Tournament')}
                ${option('multiplayer', 'Multiplayer')}
              </select>
            </label>

            <label class="settings-field" id="challenge-group">
              <span>Challenge Sheet</span>
              <select id="challenge-select">
                ${CHALLENGES.map((challenge) => option(challenge.id, challenge.name)).join('')}
              </select>
            </label>

            <label class="settings-field" id="camera-group">
              <span>Camera</span>
              <select id="camera-select">
                ${option('delivery', 'Delivery')}
                ${option('follow', 'Follow')}
                ${option('house', 'House')}
                ${option('broadcast', 'Broadcast')}
                ${option('free', 'Free')}
              </select>
            </label>

            <div class="settings-actions">
              ${button('Toggle Audio', 'drawer-chip-button', { id: 'audio-toggle', type: 'button' })}
              ${button('2D / 3D', 'drawer-chip-button', { id: 'renderer-toggle', type: 'button' })}
            </div>
          </div>

          <div class="drawer-detail" id="settings-detail"></div>

          <details class="help-section">
            <summary class="help-heading">How to Play</summary>

            <div class="help-block">
              <div class="help-subhead">The Basics</div>
              <p>Curling is played in <strong>ends</strong> (like innings). Each end, two teams alternate throwing 8 stones each (16 total) toward the <strong>house</strong> — the target circles at the far end of the sheet. The team with the stone closest to the center (<strong>button</strong>) scores points for every stone closer than the opponent's best.</p>
            </div>

            <div class="help-block">
              <div class="help-subhead">Throwing a Stone</div>
              <ol class="help-steps">
                <li><strong>Aim</strong> — Drag on the ice to place your broom (target line). Use <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> for fine adjustment.</li>
                <li><strong>Shot type</strong> — Pick from Draw, Guard, Hit, Freeze, or Peel. Each sets a default weight (speed). Keys <kbd>1</kbd>–<kbd>5</kbd> also work.</li>
                <li><strong>Turn</strong> — Choose In-turn (clockwise) or Out-turn (counter-clockwise). This controls the curl direction. <kbd>Q</kbd> = In, <kbd>E</kbd> = Out.</li>
                <li><strong>Charge</strong> — Tap CHARGE (or <kbd>Space</kbd>), then hold. A power meter oscillates — release when the fill matches your desired weight.</li>
                <li><strong>Sweep</strong> — While the stone travels, hold the SWEEP button or <kbd>Space</kbd>. Sweeping reduces friction, making the stone travel farther and curl less.</li>
              </ol>
            </div>

            <div class="help-block">
              <div class="help-subhead">Shot Types</div>
              <dl class="help-dl">
                <dt>Draw</dt><dd>A soft shot that stops in or near the house. The most common shot.</dd>
                <dt>Guard</dt><dd>A stone placed in front of the house to protect a scoring stone behind it.</dd>
                <dt>Takeout / Hit</dt><dd>A firm shot aimed to knock an opponent's stone out of play.</dd>
                <dt>Freeze</dt><dd>A draw that stops in direct contact with another stone, making it hard to remove.</dd>
                <dt>Peel</dt><dd>A hard hit on a guard stone, clearing it and rolling out of play yourself.</dd>
                <dt>Hit &amp; Roll</dt><dd>Remove the target stone and roll your shooter behind cover.</dd>
              </dl>
            </div>

            <div class="help-block">
              <div class="help-subhead">When Stones Disappear</div>
              <p>A stone is removed from play when it:</p>
              <ul class="help-ul">
                <li>Slides past the <strong>back line</strong> behind the house</li>
                <li>Goes off the <strong>side walls</strong> of the sheet</li>
                <li>Fails to reach the <strong>hog line</strong> (front of scoring zone) — a violation</li>
              </ul>
              <p>Removed stones stay in memory for scoring but are no longer visible on the sheet.</p>
            </div>

            <div class="help-block">
              <div class="help-subhead">Scoring</div>
              <p>Only <strong>one team scores per end</strong>. The team with the closest stone to the button scores 1 point for each of their stones that is closer than the opponent's closest stone. A <strong>blank end</strong> (no stones in the house) means no points and the hammer stays.</p>
              <p>The team that did <strong>not</strong> score gets the <strong>hammer</strong> (last stone advantage) in the next end.</p>
            </div>

            <div class="help-block">
              <div class="help-subhead">Game Modes</div>
              <dl class="help-dl">
                <dt>Exhibition</dt><dd>Full 8-end match against the AI. Standard rules.</dd>
                <dt>Practice</dt><dd>Unlimited stones, no turns, no scoring. Experiment freely.</dd>
                <dt>Shot Challenge</dt><dd>Single-shot drills — draws, takeouts, guards, freezes, peels. Earn gold, silver, or bronze medals.</dd>
                <dt>Tournament</dt><dd>6-end bracket games against AI teams. Win to advance.</dd>
                <dt>Multiplayer</dt><dd>Local two-player mode (share a device).</dd>
              </dl>
            </div>

            <div class="help-block">
              <div class="help-subhead">Keyboard Shortcuts</div>
              <table class="help-keys">
                <tr><td><kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd></td><td>Adjust broom aim</td></tr>
                <tr><td><kbd>1</kbd>–<kbd>5</kbd></td><td>Shot type (Guard, Draw, Control, Takeout, Peel)</td></tr>
                <tr><td><kbd>Q</kbd> / <kbd>E</kbd></td><td>In-turn / Out-turn</td></tr>
                <tr><td><kbd>Space</kbd></td><td>Arm charge · hold to charge · release to throw · sweep while moving</td></tr>
                <tr><td><kbd>F</kbd></td><td>Toggle fullscreen</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>Close modal</td></tr>
              </table>
            </div>

            <div class="help-block">
              <div class="help-subhead">Camera Views (3D mode)</div>
              <dl class="help-dl">
                <dt>Delivery</dt><dd>Behind the hack — the thrower's perspective.</dd>
                <dt>Follow</dt><dd>Tracks the moving stone down the sheet.</dd>
                <dt>House</dt><dd>Overhead view of the scoring area.</dd>
                <dt>Broadcast</dt><dd>Classic TV camera angle from the side.</dd>
                <dt>Free</dt><dd>Unlocked orbit camera.</dd>
              </dl>
            </div>
          </details>
        </div>
      </div>
    </div>
  `;

  const elements = {
    shell: root.querySelector('.mobile-shell'),
    surface2d: root.querySelector('#surface-2d'),
    surface3d: root.querySelector('#surface-3d'),
    overlay: root.querySelector('#input-overlay'),
    scoreStrip: root.querySelector('#score-strip'),
    settingsToggle: root.querySelector('#settings-toggle'),
    scoreRed: root.querySelector('#score-red'),
    scoreYel: root.querySelector('#score-yel'),
    scoreEnd: root.querySelector('#score-end'),
    scoreHammer: root.querySelector('#score-hammer'),
    resetButton: root.querySelector('#reset-button'),
    modeSelect: root.querySelector('#mode-select'),
    challengeGroup: root.querySelector('#challenge-group'),
    challengeSelect: root.querySelector('#challenge-select'),
    cameraGroup: root.querySelector('#camera-group'),
    cameraSelect: root.querySelector('#camera-select'),
    audioToggle: root.querySelector('#audio-toggle'),
    rendererToggle: root.querySelector('#renderer-toggle'),
    shotButtons: [...root.querySelectorAll('.shot-button')],
    turnButtons: [...root.querySelectorAll('.turn-button')],
    chargeButton: root.querySelector('#charge-button'),
    sweepButton: root.querySelector('#sweep-button'),
    sweepCall: root.querySelector('#sweep-call'),
    shotSummary: root.querySelector('#shot-summary'),
    travelSummary: root.querySelector('#travel-summary'),
    broomMarker: root.querySelector('#broom-marker'),
    powerArc: root.querySelector('#power-arc'),
    powerRing: root.querySelector('#power-ring'),
    powerValue: root.querySelector('#power-value'),
    powerLabel: root.querySelector('#power-label'),
    drawerSetup: root.querySelector('#drawer-setup'),
    drawerTravel: root.querySelector('#drawer-travel'),
    drawerStone: root.querySelector('#drawer-stone'),
    drawerCaption: root.querySelector('#drawer-caption'),
    callIntent: root.querySelector('#call-intent'),
    callLine: root.querySelector('#call-line'),
    callHandle: root.querySelector('#call-handle'),
    callWeight: root.querySelector('#call-weight'),
    challengeDetail: root.querySelector('#challenge-detail'),
    historyModal: root.querySelector('#history-modal'),
    settingsModal: root.querySelector('#settings-modal'),
    scoreboardTable: root.querySelector('#scoreboard-table'),
    messageList: root.querySelector('#message-list'),
    settingsDetail: root.querySelector('#settings-detail'),
    resultChip: root.querySelector('#result-chip'),
    resultTitle: root.querySelector('#result-title'),
    resultDetail: root.querySelector('#result-detail'),
    tutorialPanel: root.querySelector('#tutorial-panel'),
    tutorialDismiss: root.querySelector('#tutorial-dismiss'),
  };

  const tutorialKey = 'curling-simulator:tutorial-dismissed';
  try {
    if (localStorage.getItem(tutorialKey) !== '1') {
      elements.tutorialPanel.hidden = false;
    }
  } catch {
    elements.tutorialPanel.hidden = false;
  }

  elements.tutorialDismiss?.addEventListener('click', () => {
    elements.tutorialPanel.hidden = true;
    try {
      localStorage.setItem(tutorialKey, '1');
    } catch {
      // ignore storage failures
    }
  });

  return {
    elements,
    render(state) {
      const shotCall = getShotCall(state);
      const chargeReady = state.shotTypeCommitted && state.turnCommitted;
      const travelPhase = state.mode === 'travel';
      const activeResult = state.resultChip && state.resultChip.until > performance.now();
      const activeDelivery = ['aim', 'charge-ready', 'power', 'travel'].includes(state.mode);
      const clutchStone = state.currentTeam === state.hammerTeam && state.shotNumber >= 15;

      elements.shell.dataset.phase = travelPhase ? 'travel' : 'setup';
      elements.shell.dataset.clutch = clutchStone ? 'true' : 'false';
      elements.modeSelect.value = state.gameMode;
      elements.challengeSelect.value = state.selectedChallengeId ?? CHALLENGES[0]?.id ?? '';
      elements.cameraSelect.value = state.preferredCameraMode;
      elements.challengeGroup.hidden = state.gameMode !== 'challenge';
      elements.cameraGroup.hidden = state.renderer !== '3d';

      elements.scoreRed.textContent = String(state.totalScore.red);
      elements.scoreYel.textContent = String(state.totalScore.yel);
      elements.scoreEnd.textContent = `END ${state.end} / ${state.maxEnds}`;
      elements.scoreHammer.textContent = `🔨 ${state.teams[state.hammerTeam].name.toUpperCase()}`;

      elements.drawerStone.textContent = `STONE ${state.shotNumber + 1} / 16`;
      elements.drawerCaption.textContent = travelPhase
        ? 'Sweep to carry the stone farther and straighter.'
        : chargeReady
          ? 'Tap CHARGE, then hold and release on the ice.'
          : 'Choose the shot type and turn before charging.';

      elements.callIntent.textContent = shotCall.intent;
      elements.callLine.textContent = shotCall.line;
      elements.callHandle.textContent = shotCall.handle;
      elements.callWeight.textContent = shotCall.weight;

      const chargePct = Math.round(state.powerCharge * 100);
      const summary = `${shotCall.intent.toUpperCase()} · ${shotCall.handle.toUpperCase()} · ${chargePct}% · STONE ${state.shotNumber + 1}/16`;
      elements.shotSummary.textContent = summary;
      elements.travelSummary.textContent = summary;
      elements.shotSummary.hidden = activeResult || !activeDelivery;

      elements.chargeButton.disabled = !chargeReady || !state.canThrow || travelPhase;
      elements.chargeButton.textContent = state.powerArmed ? 'HOLD ON ICE' : 'CHARGE';

      elements.drawerSetup.hidden = travelPhase;
      elements.drawerTravel.hidden = !travelPhase;
      elements.sweepCall.textContent = state.sweeping ? 'HARD!' : 'WHOA!';
      elements.sweepButton.classList.toggle('is-active', state.sweeping);

      elements.shotButtons.forEach((buttonEl) => {
        const isActive = buttonEl.dataset.preset === state.selectedWeight || (buttonEl.dataset.preset === 'takeout' && state.selectedWeight === 'takeout');
        buttonEl.dataset.active = String(isActive);
      });
      elements.turnButtons.forEach((buttonEl) => {
        buttonEl.dataset.active = String(Number(buttonEl.dataset.spin) === state.spin);
      });

      const broomLeft = `${broomPercent(state.aimX)}%`;
      elements.broomMarker.style.left = broomLeft;
      elements.broomMarker.style.opacity = travelPhase ? '0' : '1';

      elements.powerArc.hidden = !(state.mode === 'power' && state.chargeAnchor);
      if (state.mode === 'power' && state.chargeAnchor) {
        elements.powerArc.style.left = `${state.chargeAnchor.x}px`;
        elements.powerArc.style.top = `${state.chargeAnchor.y}px`;
        elements.powerRing.style.setProperty('--charge', `${state.powerCharge}`);
        elements.powerValue.textContent = `${chargePct}%`;
        elements.powerLabel.textContent = getWeightDisplay(state.powerCharge);
      }

      renderScoreTable(elements.scoreboardTable, state);
      const filteredMessages = state.messages
        .filter((message) => !/(renderer|audio|initialized|safe mode|webgl|override|broadcast-channel|multiplayer status|mode ready)/i.test(message))
        .slice(0, 8);
      elements.messageList.innerHTML = filteredMessages
        .map((message) => `<div class="message-item">${message}</div>`)
        .join('');

      const activeChallenge = CHALLENGES.find((challenge) => challenge.id === state.selectedChallengeId);
      elements.challengeDetail.textContent = state.gameMode === 'challenge' && activeChallenge
        ? `${activeChallenge.description}${state.challengeSummary ? ` · ${state.challengeMedal ?? 'pending'} · ${state.challengeSummary}` : ''}`
        : `${state.teams[state.currentTeam].name.toUpperCase()} TO PLAY · ${state.rendererReady ? '3D arena live' : state.rendererMessage}`;

      elements.settingsDetail.textContent = `${state.rendererReady ? `Renderer ${state.renderer.toUpperCase()}` : state.rendererMessage} · Audio ${state.audio.enabled ? 'on' : 'off'}`;
      elements.audioToggle.textContent = state.audio.enabled ? 'Audio On' : 'Audio Off';
      elements.rendererToggle.textContent = state.renderer === '3d' ? 'Use 2D' : 'Use 3D';

      elements.historyModal.hidden = state.modal !== 'history';
      elements.settingsModal.hidden = state.modal !== 'settings';

      if (activeResult) {
        elements.resultChip.hidden = false;
        elements.resultTitle.textContent = state.resultChip.title;
        elements.resultDetail.textContent = state.resultChip.detail;
      } else {
        elements.resultChip.hidden = true;
      }
    },
  };
}
