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
import { createBroadcast } from './broadcast.js';
import { createReplay } from './replay.js';
import { createImpactAudio } from './audio.js';
import { classifyShoe } from './scoring.js';
import './styles.css';

const root = document.querySelector('#horseshoes-app');
const $ = (selector) => root.querySelector(selector);
const controls = { aimDeg: 0, strength: 50, arc: 'normal', style: 'turn' };
const params = new URLSearchParams(location.search);
let mode = ['practice', 'solo'].includes(params.get('mode')) ? params.get('mode') : 'match';

async function boot() {
  await RAPIER.init();
  root.innerHTML = `<div class="game-shell">
    <header><div><span class="eyebrow">FMP LAWN · PROVISIONAL</span><h1>Backyard Horseshoes</h1></div>
      <nav aria-label="Existing games"><a href="https://mixmash.games/">Mixmash</a><a href="https://davehomeassist.github.io/curling-simulator/">Curling ↗</a></nav>
      <button id="settings-tab" aria-haspopup="dialog">Menu</button><button id="theme-button" aria-label="Switch to dark theme">Dark</button></header>
    <section class="scoreboard" aria-label="Match scoreboard"><div class="player one">Player 1 <strong id="score-one">0</strong></div>
      <div class="inning"><span id="inning-label">Inning 1 · End B</span><small>First to 21 · cancellation scoring</small></div>
      <div class="player two"><span id="player-two-label">Player 2</span> <strong id="score-two">0</strong></div></section>
    <section class="stage-wrap" aria-label="Horseshoes court"><div id="horseshoe-stage"></div>
      <div class="stage-status"><span id="status-pill">Ready</span><span id="flight-readout"></span></div>
      <div id="stake-flash" hidden>STAKE HIT</div><button id="camera-button">Close view</button>
      <div id="tour-title" hidden><span>LIVE FROM THE LAWN</span><strong>Backyard Horseshoes</strong><small>FMP Pavilion</small></div><button id="skip-tour" hidden>Skip intro</button><span class="camera-help">Drag to orbit · wheel / pinch to zoom</span></section>
    <div class="tabs" role="tablist" aria-label="Game panels"><button id="play-tab" role="tab" aria-selected="true" aria-controls="play-panel" data-panel="play">Controls</button><button id="score-tab" role="tab" aria-selected="false" aria-controls="score-panel" data-panel="score" tabindex="-1">Score</button></div>
    <section class="deck" aria-label="Game controls">
      <div class="panel" id="play-panel" role="tabpanel" aria-labelledby="play-tab">
        <div id="live-controls"><div class="sliders"><label for="aim">Aim <output id="aim-value"></output><input id="aim" type="range" min="-4" max="4" step="0.05" value="0"></label>
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
        <div class="actions"><button id="throw-button" class="primary">Throw</button><button id="next-button" hidden>Next inning</button><button id="retry-button" hidden>Retry</button><button id="replay-last" disabled>Replay last</button><button id="replay-best" disabled>Best throw</button></div></div><div id="replay-controls" hidden><button id="replay-pause">Pause replay</button><label for="replay-position">Replay position<input id="replay-position" type="range" min="0" max="100" value="0"></label><button id="replay-exit">Exit replay</button></div><p id="throw-feedback" aria-live="polite"></p>
      </div>
      <div class="panel results" id="score-panel" role="tabpanel" tabindex="0" aria-labelledby="score-tab" hidden><h2>Inning result</h2><p id="result-copy">Throw all four shoes to score the inning.</p><ol id="shoe-results"></ol><h2>Match history</h2><ol id="history"></ol></div>
    </section>
<dialog id="game-menu" aria-labelledby="menu-title"><div class="menu-heading"><div><span class="eyebrow">BACKYARD HORSESHOES</span><h2 id="menu-title">On the lawn at FMP</h2><p id="menu-caption">Pick a game, settle in, take your shot.</p></div><button id="menu-resume" class="menu-resume">Play</button></div><div id="settings-panel" class="menu-body">        <section class="menu-group"><h3>New game</h3><label for="mode">Mode for a new game</label><select id="mode"><option value="solo">Solo versus computer</option><option value="match">Local two-player match</option><option value="practice">Practice</option></select>
        <label for="difficulty">Computer difficulty</label><select id="difficulty"><option value="normal">Normal</option><option value="easy">Easy</option></select></section><section class="menu-group"><h3>Sound</h3><button id="sound-button" aria-pressed="false">Sound: off</button><label for="volume">Volume<input id="volume" type="range" min="0" max="100" value="50"></label></section><section class="menu-group"><h3>Display</h3><button id="menu-theme-button">Switch theme</button><button id="fullscreen-button">Fullscreen</button><button id="tour-button">Tour venue</button><button id="monitors-button">View delay screens</button><button id="debug-button" aria-pressed="false">Physics guides: off</button>
        </section><details class="menu-help"><summary>How to play & practice</summary><div id="preset-row"><span>Practice presets</span>${Object.entries(
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
</details><p class="venue-note">FMP setting adapted from the camera simulator. Venue geometry is approximate; the game court is a level practice patch.</p></div><footer class="menu-footer"><button id="restart-button">Start new game</button><span>Your current game pauses here.</span></footer></dialog>
    <p class="sr-only" id="announcement" role="status" aria-live="polite"></p>
  </div>`;
  let physics = createPracticePhysics(RAPIER, {
    retainShoes: mode !== 'practice',
  });
  const match = createMatch();
  const replay = createReplay();
  const broadcast = createBroadcast();
  const audio = createImpactAudio();
  let difficulty = 'normal', worker, aiTimeout, aiBusy = false, aiGeneration = 0, aiMetrics = null, aiError = '';
  let recordSteps = 0, feedback = '';
  const menu = $('#game-menu');
  let hasStarted = false;
  const aiTurn = () => mode === 'solo' && match.snapshot().player === 1 && match.snapshot().phase === 'ready';
  const captureFrame = () => ({ ...physics.snapshot(), shoes: mode === 'practice' ? undefined : physics.getShoes() });
  function cancelAI() { clearTimeout(aiTimeout); aiGeneration++; worker?.terminate(); worker = null; aiBusy = false; }
  function scheduleAI() {
    if (renderer?.getTour?.().active || menu.open || !aiTurn() || aiBusy || replay.snapshot().active || document.hidden || aiError) return;
    aiBusy = true;
    const id = ++aiGeneration;
    const fail = () => { if (id !== aiGeneration) return; cancelAI(); aiError = 'Computer unavailable. Restart to retry or choose local play.'; announce(aiError); };
    try {
      worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
      worker.onerror = fail;
      aiTimeout = setTimeout(fail, 15000);
      worker.onmessage = ({ data }) => {
        if (menu.open || id !== aiGeneration || !aiTurn() || replay.snapshot().active) return;
        if (data.error) { fail(); return; }
        clearTimeout(aiTimeout);
        aiMetrics = { candidates: data.result.candidates, milliseconds: data.result.milliseconds };
        worker.terminate(); worker = null; aiBusy = false;
        launch(data.result.controls, true);
      };
      worker.postMessage({ id, saved: physics.exportState(), delivery: { id: match.snapshot().delivered, player: 1 }, difficulty });
    } catch { fail(); }
  }
  function finishRecording() {
    const state = physics.snapshot();
    const active = mode === 'practice' ? { ...state, id: 0, player: 0, foul: false } : physics.getShoes().find((shoe) => shoe.id === match.snapshot().delivered - 1);
    const result = classifyShoe(active);
    feedback = result.foul ? 'Foul — outside ground contact' : result.ringer ? 'Ringer!' : result.distance <= 0.1524 ? 'Within six inches' : `${state.position.z < COURT.stakeDistance ? 'Short' : 'Long'}${Math.abs(state.position.x) > 0.15 ? state.position.x < 0 ? ' · left' : ' · right' : ''} of the stake`;
    replay.finish(captureFrame(), result.foul ? -100 : result.ringer ? 10 : -result.distance);
    broadcast.play(replay.lastClip());
  }
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
  function openMenu() {
    if (menu.open) return;
    cancelAI(); audio.suppress(true); runner.reset();
    $('#menu-resume').textContent = hasStarted ? 'Resume' : 'Play';
    $('#menu-caption').textContent = hasStarted ? 'Your game is paused. Resume or start fresh.' : 'Pick a game, settle in, take your shot.';
    $('#mode').value = mode; $('#difficulty').value = difficulty;
    menu.showModal(); $('#menu-resume').focus();
  }
  function closeMenu() {
    const firstPlay = !hasStarted;
    hasStarted = true; menu.close();
    if (firstPlay) renderer.startTour?.(); lastTime = performance.now(); runner.reset();
    audio.suppress(document.hidden || menu.open || replay.snapshot().active);
    $('#settings-tab').focus();
  }
  $('#settings-tab').onclick = openMenu;
  $('#menu-resume').onclick = () => hasStarted ? closeMenu() : startNewGame();
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('button:not(:disabled),select,input,summary,a[href]')].filter(el => el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  menu.addEventListener('cancel', (e) => { e.preventDefault(); closeMenu(); });
  function showPanel(name) {
    if (name === 'settings') { openMenu(); return; }
    if (menu.open) closeMenu();
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
      mode !== 'pitching' ? 'Pitching view' : 'Close view';
  }
  function tick() {
    if (menu.open) return;
    renderer.stepTour?.(FIXED_STEP);
    if (renderer.getTour?.().active) return;
    broadcast.step(FIXED_STEP);
    if (replay.snapshot().active) { replay.step(FIXED_STEP); return; }
    const wasFlying = physics.snapshot().status === 'flying';
    physics.step();
    audio.consume(physics.drainImpacts());
    if (wasFlying && ++recordSteps % 4 === 0) replay.capture(captureFrame());
    if (wasFlying && physics.snapshot().status !== 'flying') finishRecording();
    if (
      mode !== 'practice' &&
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
    const playingReplay = replay.snapshot();
    const canThrow = !playingReplay.active && !aiTurn() && (mode !== 'practice' ? m.phase === 'ready' : state.status !== 'flying');
    const view =
      mode !== 'practice'
        ? {
            ...state,
            status: canThrow ? 'ready' : state.status,
            shoes: physics.getShoes(),
            counted: m.result?.counted,
          }
        : state;
    const pair =
      mode !== 'practice' && canThrow
        ? { previous: ready(), current: ready() }
        : physics.getInterpolationPair();
    renderer.broadcast?.(broadcast.frame());
    $('#skip-tour').hidden = !renderer.getTour?.().active;
    $('#tour-title').hidden = $('#skip-tour').hidden;
    const playbackFrame = replay.frame();
    renderer.render(playbackFrame ? { previous: playbackFrame, current: playbackFrame } : pair, playbackFrame ? 1 : alpha, playbackFrame || view, controls, playbackFrame ? null : physics.world);
    $('#player-two-label').textContent = mode === 'solo' ? 'Computer' : 'Player 2';
    $('#replay-last').disabled = !playingReplay.available || state.status === 'flying' || playingReplay.active;
    $('#replay-best').disabled = !playingReplay.bestAvailable || state.status === 'flying' || playingReplay.active;
    $('#replay-controls').hidden = !playingReplay.active;
    $('#live-controls').hidden = playingReplay.active;
    $('#replay-pause').textContent = playingReplay.paused ? 'Resume replay' : 'Pause replay';
    if (playingReplay.active) $('#replay-position').value = 100 * playingReplay.time / (playingReplay.duration || 1);
    $('#throw-feedback').textContent = feedback;
    $('#next-button').disabled = playingReplay.active;
    $('#retry-button').disabled = playingReplay.active;
    const audioState = audio.snapshot();
    $('#sound-button').textContent = audioState.unavailable ? 'Sound unavailable' : `Sound: ${audioState.enabled ? 'on' : 'off'}`;
    $('#sound-button').setAttribute('aria-pressed', String(audioState.enabled));
    $('#throw-button').disabled = !canThrow;
    $('#next-button').hidden = mode === 'practice' || m.phase !== 'inning';
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
          ? `${mode === 'solo' && m.winner === 1 ? 'Computer' : `Player ${m.winner + 1}`} wins!`
          : m.phase === 'inning'
            ? m.result.summary
            : m.phase === 'flying'
              ? 'In flight — wait for all shoes'
              : `Player ${m.player + 1} · shoe ${(m.delivered % 2) + 1} of 2`;
    $('#status-pill').textContent = playingReplay.active ? `Replay · ${playingReplay.which} throw` : aiError || (aiBusy ? 'Computer is choosing a throw…' : label);
    $('#flight-readout').textContent =
      state.status === 'flying'
        ? `${state.elapsed.toFixed(1)} s`
        : mode !== 'practice' && m.result
          ? m.winner === null
            ? 'Inspect Score, then continue from Controls'
            : 'Match complete · restart from Menu'
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
  function launch(chosen = controls, computer = false) {
    if (menu.open) return false;
    renderer.stopTour?.();
    if (renderer.getCameraMode() === 'monitors') setCamera('pitching');
    if (chosen instanceof Event) chosen = controls;
    if (replay.snapshot().active || (aiTurn() && !computer)) return false;
    audio.unlock();
    audio.reset();
    if (mode !== 'practice') {
      const delivery = match.launch();
      if (!delivery) return false;
      physics.spawnShoe({ ...createLaunchCommand(chosen), ...delivery });
    } else {
      if (physics.snapshot().status === 'flying') return false;
      physics.spawnShoe(createLaunchCommand(chosen));
    }
    recordSteps = 0; feedback = '';
    replay.begin(captureFrame(), match.snapshot().end);
    clearFlash();
    runner.reset();
    render();
    return true;
  }
  function retry() {
    if (mode !== 'practice' || replay.snapshot().active) return false;
    physics.retry(ready());
    clearFlash();
    runner.reset();
    render();
    return true;
  }
  function restart() {
    cancelAI(); aiError = ''; replay.clear(); broadcast.clear(); renderer.stopTour?.(); audio.reset(); audio.suppress(document.hidden || menu.open); feedback = '';
    match.restart();
    physics.dispose();
    physics = createPracticePhysics(RAPIER, { retainShoes: mode !== 'practice' });
    physics.retry(ready());
    renderer.setEnd?.(0);
    clearFlash();
    runner.reset();
    setCamera('pitching');
    lastUi = '';
    render();
    announce(
      mode !== 'practice' ? 'New match. Player 1 starts.' : 'Practice ready.',
    );
  }
  function nextInning() {
    if (replay.snapshot().active) return false;
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
  $('#monitors-button').onclick = () => { closeMenu(); setCamera('monitors'); render(); };
  $('#skip-tour').onclick = () => { renderer.stopTour?.(); render(); $('#throw-button').focus(); };
  $('#tour-button').onclick = () => { closeMenu(); renderer.startTour?.(); render(); if (renderer.getTour?.().active) $('#skip-tour').focus(); };
  $('#throw-button').onclick = launch;
  $('#retry-button').onclick = retry;
  $('#next-button').onclick = nextInning;
  function startNewGame() {
    mode = $('#mode').value;
    difficulty = $('#difficulty').value;
    restart(); showPanel('play');
  }
  $('#restart-button').onclick = startNewGame;
  $('#mode').value = mode;
  $('#sound-button').onclick = async () => { await audio.setEnabled(!audio.snapshot().enabled); render(); };
  $('#volume').oninput = (e) => audio.setVolume(Number(e.target.value) / 100);
  function startReplay(which) {
    if (physics.snapshot().status === 'flying' || !replay.start(which)) return;
    cancelAI(); audio.suppress(true); runner.reset();
    renderer.setEnd?.(replay.end()); setCamera('close'); render();
  }
  $('#replay-last').onclick = () => startReplay('last');
  $('#replay-best').onclick = () => startReplay('best');
  $('#replay-pause').onclick = () => { replay.pause(); render(); };
  $('#replay-position').oninput = (e) => { replay.seek(Number(e.target.value) / 100); render(); };
  $('#replay-exit').onclick = () => { replay.exit(); renderer.setEnd?.(match.snapshot().end); audio.suppress(document.hidden); runner.reset(); render(); };
  $('#camera-button').onclick = () =>
    setCamera(renderer.getCameraMode() === 'pitching' ? 'close' : 'pitching');
  $('#debug-button').onclick = () => {
    const value = !renderer.getDiagnostics();
    renderer.setDiagnostics(value);
    $('#debug-button').setAttribute('aria-pressed', String(value));
    $('#debug-button').textContent = `Physics guides: ${value ? 'on' : 'off'}`;
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
    $('#menu-theme-button').textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
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
  $('#menu-theme-button').onclick = () => $('#theme-button').click();
  for (const button of root.querySelectorAll('[data-panel]')) {
    button.onclick = () => showPanel(button.dataset.panel);
    button.onkeydown = (e) => {
      const tabs = [...root.querySelectorAll('[data-panel]')];
      let index = tabs.indexOf(button);
      if (e.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') index = 0;
      else if (e.key === 'End') index = tabs.length - 1;
      else return;
      e.preventDefault();
      showPanel(tabs[index].dataset.panel);
      tabs[index].focus();
    };
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.open && renderer.getTour?.().active) { e.preventDefault(); renderer.stopTour(); render(); return; }
    if (
      menu.open ||
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
    audio.suppress(document.hidden || menu.open || replay.snapshot().active);
    if (document.hidden) cancelAI();
    runner.reset();
  });
  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!document.hidden && !menu.open) { runner.advance(delta); scheduleAI(); }
    if (!menu.open) render(runner.alpha);
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
      menu: { open: menu.open },
      environment: renderer.getEnvironment?.() || 'fallback',
      controls: { ...controls, speedMps: strengthToSpeed(controls.strength) },
      camera: renderer.getCameraMode(),
      cameraPose: renderer.getCamera?.(),
      diagnostics: renderer.getDiagnostics(),
      ai: { busy: aiBusy, difficulty, error: aiError, metrics: aiMetrics },
      audio: audio.snapshot(),
      broadcast: { ...broadcast.snapshot(), ...renderer.getBroadcast?.() },
      tour: renderer.getTour?.() || { active: false },
      replay: { ...replay.snapshot(), displayed: replay.frame() },
      feedback,
      shoe: physics.snapshot(),
      shoes: physics.getShoes(),
      match: mode !== 'practice' ? match.snapshot() : null,
    });
  window.advanceTime = (ms = 16) => {
    runner.stepCount(Math.max(1, Math.round(ms / (FIXED_STEP * 1000))));
    scheduleAI();
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
  $('#tour-button').disabled = renderer.kind !== 'three';
  $('#monitors-button').disabled = renderer.kind !== 'three';
  updateControls();
  renderer.resize();
  render();
  openMenu();
  rafId = requestAnimationFrame(frame);
}
boot().catch((error) => {
  console.error('Horseshoes failed to start', error);
  root.textContent = 'Could not set the court. Please reload to try again.';
});
