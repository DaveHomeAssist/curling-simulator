import {
  beginCharge,
  cycleCamera,
  isHumanTurn,
  releaseShot,
  setAim,
  setCameraMode,
  setPowerCharge,
  setRenderer,
  setSpin,
  setWeightPreset,
  startMode,
  toggleSpin,
} from './state.js';
import { CHALLENGES } from './challenges.js';

const PRESET_KEYS = {
  Digit1: 'guard',
  Digit2: 'draw',
  Digit3: 'control',
  Digit4: 'takeout',
  Digit5: 'peel',
};

export function bindInput(state, elements, services) {
  const { surface, overlay } = elements;
  const pointer = {
    active: false,
  };

  function pointerToAim(event) {
    const rect = surface.getBoundingClientRect();
    const normalized = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    setAim(state, normalized * 2.25);
  }

  function onPointerDown(event) {
    if (!isHumanTurn(state)) return;
    pointer.active = true;
    pointerToAim(event);
    beginCharge(state);
  }

  function onPointerMove(event) {
    pointerToAim(event);
    if (pointer.active) {
      const rect = surface.getBoundingClientRect();
      const ratio = 1 - (event.clientY - rect.top) / rect.height;
      setPowerCharge(state, ratio);
    }
  }

  function onPointerUp() {
    if (!isHumanTurn(state)) return;
    pointer.active = false;
    releaseShot(state, performance.now());
  }

  function onKeyDown(event) {
    if (event.code in PRESET_KEYS) {
      setWeightPreset(state, PRESET_KEYS[event.code]);
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        setAim(state, state.aimX - 0.08);
        break;
      case 'ArrowRight':
      case 'KeyD':
        setAim(state, state.aimX + 0.08);
        break;
      case 'ArrowUp':
      case 'KeyW':
        setPowerCharge(state, state.powerCharge + 0.04);
        break;
      case 'ArrowDown':
      case 'KeyS':
        setPowerCharge(state, state.powerCharge - 0.04);
        break;
      case 'Space':
        if (state.mode === 'travel') state.sweeping = true;
        else if (isHumanTurn(state)) beginCharge(state);
        break;
      case 'KeyQ':
        setSpin(state, -1);
        break;
      case 'KeyE':
        setSpin(state, 1);
        break;
      case 'KeyR':
        toggleSpin(state);
        break;
      case 'KeyV':
        setRenderer(state, state.renderer === '2d' ? '3d' : '2d');
        break;
      case 'KeyC':
        cycleCamera(state);
        break;
      case 'KeyH':
        setCameraMode(state, 'house');
        break;
      case 'KeyB':
        setCameraMode(state, 'broadcast');
        break;
      case 'KeyF':
        if (document.fullscreenElement) document.exitFullscreen();
        else overlay.requestFullscreen?.();
        break;
      case 'Enter':
        if (isHumanTurn(state)) releaseShot(state, performance.now());
        break;
      default:
        break;
    }
  }

  function onKeyUp(event) {
    if (event.code === 'Space') {
      state.sweeping = false;
      if (pointer.active) {
        pointer.active = false;
        releaseShot(state, performance.now());
      }
    }
  }

  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  elements.rendererToggle?.addEventListener('click', () => setRenderer(state, state.renderer === '2d' ? '3d' : '2d'));
  elements.cameraSelect?.addEventListener('change', (event) => setCameraMode(state, event.target.value));
  elements.modeSelect?.addEventListener('change', (event) => startMode(state, event.target.value));
  elements.weightButtons?.forEach((button) => {
    button.addEventListener('click', () => setWeightPreset(state, button.dataset.preset));
  });
  elements.spinToggle?.addEventListener('click', () => toggleSpin(state));
  elements.challengeSelect?.addEventListener('change', (event) => {
    const selected = CHALLENGES.find((challenge) => challenge.id === event.target.value);
    if (selected) services.actions?.loadChallenge(selected.id);
  });
  elements.resetButton?.addEventListener('click', () => services.actions?.resetSurface());
  elements.practiceButton?.addEventListener('click', () => startMode(state, 'practice'));
  elements.multiplayerButton?.addEventListener('click', () => startMode(state, 'multiplayer'));
  elements.challengeButton?.addEventListener('click', () => startMode(state, 'challenge'));

  return () => {
    surface.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
