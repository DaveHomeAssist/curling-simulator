import {
  armCharge,
  beginCharge,
  closeModal,
  isHumanTurn,
  releaseShot,
  setAim,
  setCameraMode,
  setChargeAnchor,
  setRenderer,
  setSpin,
  setWeightPreset,
  startMode,
  toggleAudioEnabled,
  toggleModal,
} from './state.js';
import { CHALLENGES } from './challenges.js';

const PRESET_KEYS = {
  Digit1: 'guard',
  Digit2: 'draw',
  Digit3: 'freeze',
  Digit4: 'takeout',
  Digit5: 'peel',
};

export function bindInput(state, elements, services) {
  const { surface } = elements;
  const pointer = {
    active: false,
  };

  function pointerPosition(event) {
    const rect = surface.getBoundingClientRect();
    return {
      rect,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      normalizedX: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    };
  }

  function pointerToAim(event) {
    const { normalizedX } = pointerPosition(event);
    setAim(state, normalizedX * 2.25);
  }

  function canStartCharge(position) {
    return state.powerArmed && position.y >= position.rect.height * 0.46;
  }

  function onPointerDown(event) {
    if (!isHumanTurn(state) || state.modal || event.button > 0 || state.preferredCameraMode === 'free') return;
    if (event.target !== surface && !surface.contains(event.target)) return;

    const pos = pointerPosition(event);
    pointer.active = true;
    surface.setPointerCapture?.(event.pointerId);

    if (canStartCharge(pos)) {
      setChargeAnchor(state, pos.x, pos.y);
      beginCharge(state);
      return;
    }

    if (state.mode !== 'travel') {
      pointerToAim(event);
    }
  }

  function onPointerMove(event) {
    if (!pointer.active) return;
    if (state.mode === 'power') return;
    if (state.mode !== 'travel') {
      pointerToAim(event);
    }
  }

  function onPointerUp() {
    if (!isHumanTurn(state)) return;
    if (!pointer.active) return;
    pointer.active = false;
    if (state.mode === 'power') {
      releaseShot(state, state.clock ?? performance.now());
    }
  }

  function cancelGesture() {
    pointer.active = false;
    state.sweeping = false;
    if (state.mode === 'power') {
      state.mode = 'aim';
      state.charging = false;
      state.powerArmed = false;
    }
  }

  function onKeyDown(event) {
    if (event.code === 'Escape') { cancelGesture(); closeModal(state); return; }
    if (state.modal || event.target?.closest?.('button, select, input, textarea, [contenteditable="true"]')) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (event.repeat && event.code === 'Space') return;
    if (!isHumanTurn(state)) return;
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
      case 'Space':
        if (state.mode === 'travel') {
          state.sweeping = true;
        } else if (isHumanTurn(state) && state.powerArmed) {
          beginCharge(state);
        } else if (isHumanTurn(state) && state.shotTypeCommitted && state.turnCommitted) {
          armCharge(state);
          const rect = surface.getBoundingClientRect();
          setChargeAnchor(state, rect.width / 2, rect.height * 0.78);
        }
        break;
      case 'KeyQ':
        setSpin(state, 1);
        break;
      case 'KeyE':
        setSpin(state, -1);
        break;
      case 'KeyF':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.querySelector('#app').requestFullscreen?.();
        break;
      case 'Escape':
        closeModal(state);
        break;
      default:
        break;
    }
  }

  function onKeyUp(event) {
    if (event.code === 'Space') {
      if (state.modal) { cancelGesture(); return; }
      if (state.mode === 'travel') {
        state.sweeping = false;
      } else if (state.mode === 'power') {
        releaseShot(state, state.clock ?? performance.now());
      }
    }
  }

  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', cancelGesture);
  surface.addEventListener('pointercancel', cancelGesture);

  elements.cameraSelect?.addEventListener('change', (event) => setCameraMode(state, event.target.value));
  elements.modeSelect?.addEventListener('change', (event) => startMode(state, event.target.value));
  elements.shotButtons?.forEach((button) => {
    button.addEventListener('click', () => setWeightPreset(state, button.dataset.preset));
  });
  elements.turnButtons?.forEach((button) => {
    button.addEventListener('click', () => setSpin(state, Number(button.dataset.spin)));
  });
  elements.chargeButton?.addEventListener('click', () => armCharge(state));
  elements.sweepButton?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    state.sweeping = true;
  });
  const stopSweep = () => {
    state.sweeping = false;
  };
  elements.sweepButton?.addEventListener('pointerup', stopSweep);
  elements.sweepButton?.addEventListener('pointercancel', stopSweep);
  elements.sweepButton?.addEventListener('pointerleave', stopSweep);
  elements.challengeSelect?.addEventListener('change', (event) => {
    const selected = CHALLENGES.find((challenge) => challenge.id === event.target.value);
    if (selected) {
      services.actions?.loadChallenge(selected.id);
      closeModal(state);
    }
  });
  elements.modeSelect?.addEventListener('change', () => closeModal(state));
  elements.resetButton?.addEventListener('click', () => services.actions?.resetSurface());
  elements.challengeMeta?.addEventListener('click', (event) => {
    if (event.target.closest?.('#challenge-try-again')) {
      services.actions?.loadChallenge(state.selectedChallengeId);
    }
  });
  elements.scoreStrip?.addEventListener('click', () => toggleModal(state, 'history'));
  elements.scoreStrip?.addEventListener('keydown', (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleModal(state, 'history');
    }
  });
  elements.settingsToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    cancelGesture();
    toggleModal(state, 'settings');
  });
  elements.audioToggle?.addEventListener('click', () => toggleAudioEnabled(state));
  elements.rendererToggle?.addEventListener('click', () => {
    const next = state.renderer === '3d' ? '2d' : '3d';
    if (next === '3d' && !state.rendererReady) return;
    setRenderer(state, next);
  });
  elements.historyModal?.querySelectorAll('[data-close-modal="history"]').forEach((node) => {
    node.addEventListener('click', () => closeModal(state));
  });
  elements.settingsModal?.querySelectorAll('[data-close-modal="settings"]').forEach((node) => {
    node.addEventListener('click', () => closeModal(state));
  });

  return () => {
    window.removeEventListener('blur', cancelGesture);
    surface.removeEventListener('pointercancel', cancelGesture);
    surface.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
