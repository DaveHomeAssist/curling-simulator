import RAPIER from '@dimforge/rapier3d-compat';
import {
  ARC_PRESETS,
  COURT,
  FIXED_STEP,
  LAUNCH_PRESETS,
  strengthToSpeed,
} from './config.js';
import { createFixedStepRunner } from './fixedStep.js';
import { createLaunchCommand } from './launch.js';
import { createPracticePhysics } from './physics.js';
import { createMatch } from './match.js';
import { createHorseshoeRenderer } from './renderer.js';
import { createHorseshoeRenderer2D } from './renderer2d.js';
import './styles.css';

const root = document.querySelector('#horseshoes-app');
const $ = (selector) => root.querySelector(selector);
const controls = { aimDeg: 0, strength: 50, arc: 'normal', style: 'turn' };
const params = new URLSearchParams(location.search);
let mode = params.get('mode') === 'practice' ? 'practice' : 'match';

async function boot() {
  await RAPIER.init();
  root.innerHTML = `<div class="game-shell">
    <header><div><span class="eyebrow">PHASE 2 · PROVISIONAL</span><h1>Backyard Horseshoes</h1></div>
      <nav aria-label="Existing games"><a href="https://mixmash.games/">Mixmash</a><a href="https://davehomeassist.github.io/curling-simulator/">Curling ↗</a></nav>
      <button id="theme-button" aria-label="Switch to dark theme">Dark</button></header>
    <section class="scoreboard" aria-label="Match scoreboard"><div class="player one">Player 1 <strong id="score-one">0</strong></div>
      <div class="inning"><span id="inning-label">Inning 1 · End B</span><small>First to 21 · cancellation scoring</small></div>
      <div class="player two">Player 2 <strong id="score-two">0</strong></div></section>
    <section class="stage-wrap" aria-label="Horseshoes court"><div id="horseshoe-stage"></div>
      <div class="stage-status"><span id="status-pill">Ready</span><span id="flight-readout"></span></div>
      <div id="stake-flash" hidden>STAKE HIT</div><button id="camera-button">Close view</button>
      <span class="camera-help">Drag to orbit · wheel / pinch to zoom</span></section>
    <div class="tabs" role="tablist" aria-label="Game panels"><button id="play-tab" role="tab" aria-selected="true" aria-controls="play-panel" data-panel="play">Play</button><button id="score-tab" role="tab" aria-selected="false" aria-controls="score-panel" data-panel="score" tabindex="-1">Score</button><button id="settings-tab" role="tab" aria-selected="false" aria-controls="settings-panel" data-panel="settings" tabindex="-1">Options</button></div>
    <section class="deck" aria-label="Game controls">
      <div class="panel" id="play-panel" role="tabpanel" aria-labelledby="play-tab">
        <div class="sliders"><label for="aim">Aim <output id="aim-value"></output><input id="aim" type="range" min="-4" max="4" step="0.05" value="0"></label>
        <label for="strength">Strength <output id="strength-value"></output><input id="strength" type="range" min="0" max="100" step="1" value="50"></label></div>
        <div class="choices"><fieldset id="arc-buttons"><legend>Arc</legend>${Object.entries(
          ARC_PRESETS,
        )
          .map(
            ([key, value]) =>
              `<button data-arc="${key}" aria-pressed="false">${value.label}</button>`,
          )
          .join('')}</fieldset>
        <fieldset id="style-buttons"><legend>Delivery</legend><button data-style="flip" aria-pressed="false">Flip</button><button data-style="turn" aria-pressed="false">Turn</button></fieldset></div>
        <div class="actions"><button id="throw-button" class="primary">Throw</button><button id="next-button" hidden>Next inning</button><button id="retry-button" hidden>Retry</button></div>
      </div>
      <div class="panel results" id="score-panel" role="tabpanel" tabindex="0" aria-labelledby="score-tab" hidden><h2>Inning result</h2><p id="result-copy">Throw all four shoes to score the inning.</p><ol id="shoe-results"></ol><h2>Match history</h2><ol id="history"></ol></div>
      <div class="panel settings" id="settings-panel" role="tabpanel" aria-labelledby="settings-tab" hidden>
        <label for="mode">Mode (starts fresh)</label><select id="mode"><option value="match">Local two-player match</option><option value="practice">Practice</option></select>
        <button id="restart-button">Restart match</button><button id="fullscreen-button">Fullscreen</button><button id="debug-button" aria-pressed="false">Collider lines: off</button>
        <div id="preset-row"><span>Practice presets</span>${Object.entries(
          LAUNCH_PRESETS,
        )
          .map(
            ([key, value]) =>
              `<button data-preset="${key}">${value.label}</button>`,
          )
          .join('')}</div>
        <p>Two consecutive shoes per player. Ringers score 3 and cancel opposing ringers. Closest fair shoes within six inches score 1. Leaners have no bonus. Outside-ground contact makes a foul. Scoring shoes glow in close view.</p>
        <p>← → aim · ↑ ↓ strength · 1–3 arc · Q/T delivery · Space throw · R retry in practice · C view · F fullscreen. Focused controls retain their normal keys.</p>
        <p>Provisional rigid-body physics and geometric scoring; tilted/stacked shoes are not tournament-certified. No wind, deformable soil or stake flex. No saved match; reloading starts fresh.</p>
      </div>
    </section>
    <p class="sr-only" id="announcement" role="status" aria-live="polite"></p>
  </div>`;
  let physics = createPracticePhysics(RAPIER, {
    retainShoes: mode === 'match',
  });
  const match = createMatch();
  let renderer;
  try {
    renderer =
      params.get('renderer') === '2d'
        ? createHorseshoeRenderer2D($('#horseshoe-stage'))
        : createHorseshoeRenderer($('#horseshoe-stage'));
  } catch {
    renderer = createHorseshoeRenderer2D($('#horseshoe-stage'));
  }
  let lastHit = false,
    flashTimer,
    lastUi = '',
    lastTime = performance.now(),
    rafId;
  const ready = () => ({
    position: { x: 0, y: COURT.releaseHeight, z: 0 },
    rotation: createLaunchCommand(controls).orientation,
  });
  physics.retry(ready());
  function announce(text) {
    $('#announcement').textContent = text;
  }
  function showPanel(name) {
    for (const button of root.querySelectorAll('[data-panel]')) {
      const active = button.dataset.panel === name;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $(`#${button.dataset.panel}-panel`).hidden = !active;
    }
  }
  function clearFlash() {
    clearTimeout(flashTimer);
    $('#stake-flash').hidden = true;
    lastHit = false;
  }
  function setCamera(mode) {
    renderer.setCameraMode(mode);
    $('#camera-button').textContent =
      mode === 'close' ? 'Pitching view' : 'Close view';
  }
  function tick() {
    physics.step();
    if (
      mode === 'match' &&
      match.snapshot().phase === 'flying' &&
      ['resting', 'out'].includes(physics.snapshot().status)
    ) {
      match.settle(physics.getShoes());
      physics.removeFouls();
      const m = match.snapshot();
      announce(
        m.result
          ? `${m.result.summary}. ${m.winner === null ? 'Next inning is ready.' : `Player ${m.winner + 1} wins the match.`}`
          : `Player ${m.player + 1}, shoe ${(m.delivered % 2) + 1}.`,
      );
      if (m.result) setCamera('close');
    }
  }
  const runner = createFixedStepRunner(tick);
  function updateControls() {
    $('#aim').value = controls.aimDeg;
    $('#strength').value = controls.strength;
    $('#aim-value').value = `${controls.aimDeg.toFixed(2)}°`;
    $('#strength-value').value =
      `${strengthToSpeed(controls.strength).toFixed(2)} m/s`;
    for (const key of ['arc', 'style'])
      for (const b of root.querySelectorAll(`[data-${key}]`))
        b.setAttribute(
          'aria-pressed',
          String(b.dataset[key] === controls[key]),
        );
  }
  function render(alpha = 1) {
    const state = physics.snapshot(),
      m = match.snapshot();
    const canThrow =
      mode === 'match' ? m.phase === 'ready' : state.status !== 'flying';
    const view =
      mode === 'match'
        ? {
            ...state,
            status: canThrow ? 'ready' : state.status,
            shoes: physics.getShoes(),
            counted: m.result?.counted,
          }
        : state;
    const pair =
      mode === 'match' && canThrow
        ? { previous: ready(), current: ready() }
        : physics.getInterpolationPair();
    renderer.render(pair, alpha, view, controls, physics.world);
    $('#throw-button').disabled = !canThrow;
    $('#next-button').hidden = mode !== 'match' || m.phase !== 'inning';
    $('#retry-button').hidden = mode !== 'practice';
    $('#score-one').textContent = m.scores[0];
    $('#score-two').textContent = m.scores[1];
    $('#inning-label').textContent =
      mode === 'practice'
        ? 'Practice court'
        : `Inning ${m.inning} · End ${m.end ? 'A' : 'B'}`;
    const label =
      mode === 'practice'
        ? state.status
        : m.phase === 'complete'
          ? `Player ${m.winner + 1} wins!`
          : m.phase === 'inning'
            ? m.result.summary
            : m.phase === 'flying'
              ? 'In flight — wait for all shoes'
              : `Player ${m.player + 1} · shoe ${(m.delivered % 2) + 1} of 2`;
    $('#status-pill').textContent = label;
    $('#flight-readout').textContent =
      state.status === 'flying'
        ? `${state.elapsed.toFixed(1)} s`
        : mode === 'match' && m.result
          ? m.winner === null
            ? 'Inspect Score, then continue from Play'
            : 'Match complete · restart from Options'
          : 'Aim, choose strength, throw';
    if (state.stakeHit && !lastHit) {
      $('#stake-flash').hidden = false;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => {
        $('#stake-flash').hidden = true;
      }, 1000);
    }
    lastHit = state.stakeHit;
    const uiKey = `${mode}/${m.inning}/${m.phase}`;
    if (uiKey !== lastUi) {
      lastUi = uiKey;
      $('#result-copy').textContent = m.result
        ? `${m.result.summary}. ${m.result.cancelledRingers} ringers cancelled. Scoring shoes glow green.`
        : 'Throw all four shoes to score the inning.';
      $('#shoe-results').innerHTML = (m.result?.shoes || [])
        .map(
          (s) =>
            `<li>Player ${s.player + 1}, shoe ${(s.id % 2) + 1}: ${s.reason}${s.foul || s.ringer ? '' : ` (${(s.distance * 100).toFixed(1)} cm)`}${m.result.counted.includes(s.id) ? ' — counts' : ''}</li>`,
        )
        .join('');
      $('#history').innerHTML = m.history
        .map(
          (h) =>
            `<li>Inning ${h.inning}: ${h.summary} · ${h.scores.join('–')}</li>`,
        )
        .join('');
    }
  }
  function launch() {
    if (mode === 'match') {
      const delivery = match.launch();
      if (!delivery) return false;
      physics.spawnShoe({ ...createLaunchCommand(controls), ...delivery });
    } else {
      if (physics.snapshot().status === 'flying') return false;
      physics.spawnShoe(createLaunchCommand(controls));
    }
    clearFlash();
    runner.reset();
    render();
    return true;
  }
  function retry() {
    if (mode !== 'practice') return false;
    physics.retry(ready());
    clearFlash();
    runner.reset();
    render();
    return true;
  }
  function restart() {
    match.restart();
    physics.dispose();
    physics = createPracticePhysics(RAPIER, { retainShoes: mode === 'match' });
    physics.retry(ready());
    renderer.setEnd?.(0);
    clearFlash();
    runner.reset();
    setCamera('pitching');
    lastUi = '';
    render();
    announce(
      mode === 'match' ? 'New match. Player 1 starts.' : 'Practice ready.',
    );
  }
  function nextInning() {
    if (!match.nextInning()) return false;
    physics.retry(ready());
    renderer.setEnd?.(match.snapshot().end);
    clearFlash();
    runner.reset();
    setCamera('pitching');
    render();
    announce(
      `Inning ${match.snapshot().inning}. Ends reversed. Player ${match.snapshot().player + 1} starts.`,
    );
    return true;
  }
  function applyPreset(name) {
    const p = LAUNCH_PRESETS[name];
    if (!p) return;
    Object.assign(controls, {
      aimDeg: p.aimDeg,
      strength: p.strength,
      arc: p.arc,
      style: p.style,
    });
    updateControls();
    if (mode === 'practice' && physics.snapshot().status === 'ready') retry();
    render();
  }
  $('#aim').oninput = (e) => {
    controls.aimDeg = Number(e.target.value);
    updateControls();
  };
  $('#strength').oninput = (e) => {
    controls.strength = Number(e.target.value);
    updateControls();
  };
  for (const key of ['arc', 'style'])
    $(`#${key}-buttons`).onclick = (e) => {
      const b = e.target.closest(`[data-${key}]`);
      if (b) {
        controls[key] = b.dataset[key];
        updateControls();
      }
    };
  $('#throw-button').onclick = launch;
  $('#retry-button').onclick = retry;
  $('#next-button').onclick = nextInning;
  $('#restart-button').onclick = () => {
    restart();
    showPanel('play');
  };
  $('#mode').value = mode;
  $('#mode').onchange = (e) => {
    mode = e.target.value;
    restart();
    showPanel('play');
  };
  $('#camera-button').onclick = () =>
    setCamera(renderer.getCameraMode() === 'close' ? 'pitching' : 'close');
  $('#debug-button').onclick = () => {
    const value = !renderer.getDiagnostics();
    renderer.setDiagnostics(value);
    $('#debug-button').setAttribute('aria-pressed', String(value));
    $('#debug-button').textContent = `Collider lines: ${value ? 'on' : 'off'}`;
  };
  $('#preset-row').onclick = (e) => {
    const name = e.target.closest('[data-preset]')?.dataset.preset;
    if (name) applyPreset(name);
  };
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch {
      announce('Fullscreen is unavailable in this browser.');
    }
  }
  $('#fullscreen-button').onclick = fullscreen;
  function theme(value) {
    document.documentElement.dataset.theme = value;
    $('#theme-button').textContent = value === 'dark' ? 'Light' : 'Dark';
    $('#theme-button').setAttribute(
      'aria-label',
      `Switch to ${value === 'dark' ? 'light' : 'dark'} theme`,
    );
    try {
      localStorage.setItem('horseshoes-theme', value);
    } catch {}
  }
  let savedTheme;
  try {
    savedTheme = localStorage.getItem('horseshoes-theme');
  } catch {}
  theme(savedTheme === 'dark' ? 'dark' : 'light');
  $('#theme-button').onclick = () =>
    theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  for (const button of root.querySelectorAll('[data-panel]')) {
    button.onclick = () => showPanel(button.dataset.panel);
    button.onkeydown = (e) => {
      const tabs = [...root.querySelectorAll('[data-panel]')];
      let index = tabs.indexOf(button);
      if (e.key === 'ArrowRight') index = (index + 1) % 3;
      else if (e.key === 'ArrowLeft') index = (index + 2) % 3;
      else if (e.key === 'Home') index = 0;
      else if (e.key === 'End') index = 2;
      else return;
      e.preventDefault();
      showPanel(tabs[index].dataset.panel);
      tabs[index].focus();
    };
  }
  window.addEventListener('keydown', (e) => {
    if (
      e.defaultPrevented ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target.closest?.(
        'button,a,input,select,textarea,summary,[contenteditable="true"],[role="button"],[role="tabpanel"]',
      )
    )
      return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      launch();
    } else if (e.code === 'KeyR') retry();
    else if (e.code === 'KeyC') $('#camera-button').click();
    else if (e.code === 'KeyF') fullscreen();
    else if (e.code === 'KeyD') $('#debug-button').click();
    else if (e.code === 'KeyQ') controls.style = 'flip';
    else if (e.code === 'KeyT') controls.style = 'turn';
    else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code))
      controls.arc = ['low', 'normal', 'high'][Number(e.code.slice(-1)) - 1];
    else if (e.code === 'ArrowLeft')
      controls.aimDeg = Math.max(-4, controls.aimDeg - 0.1);
    else if (e.code === 'ArrowRight')
      controls.aimDeg = Math.min(4, controls.aimDeg + 0.1);
    else if (e.code === 'ArrowUp')
      controls.strength = Math.min(100, controls.strength + 2);
    else if (e.code === 'ArrowDown')
      controls.strength = Math.max(0, controls.strength - 2);
    else return;
    e.preventDefault();
    updateControls();
  });
  new ResizeObserver(() => {
    renderer.resize();
    render();
  }).observe($('#horseshoe-stage'));
  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
    runner.reset();
  });
  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!document.hidden) runner.advance(delta);
    render(runner.alpha);
    rafId = requestAnimationFrame(frame);
  }
  window.render_game_to_text = () =>
    JSON.stringify({
      mode: `horseshoes-${mode}`,
      coordinateSystem:
        'meters; local +z toward active stake; end B world z=12.192, end A world z=0',
      physics: {
        engine: `Rapier ${RAPIER.version()}`,
        stepHz: 120,
        provisionalParameters: true,
      },
      renderer: renderer.kind,
      controls: { ...controls, speedMps: strengthToSpeed(controls.strength) },
      camera: renderer.getCameraMode(),
      cameraPose: renderer.getCamera?.(),
      diagnostics: renderer.getDiagnostics(),
      shoe: physics.snapshot(),
      shoes: physics.getShoes(),
      match: mode === 'match' ? match.snapshot() : null,
    });
  window.advanceTime = (ms = 16) => {
    runner.stepCount(Math.max(1, Math.round(ms / (FIXED_STEP * 1000))));
    render();
    return window.render_game_to_text();
  };
  window.__horseshoes = {
    launch,
    retry,
    applyPreset,
    nextInning,
    getState: () => JSON.parse(window.render_game_to_text()),
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
  updateControls();
  renderer.resize();
  render();
  rafId = requestAnimationFrame(frame);
}
boot().catch((error) => {
  console.error('Horseshoes failed to start', error);
  root.textContent = 'Could not set the court. Please reload to try again.';
});
