const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
};

export const SHEET = deepFreeze({
  WIDTH: 4.75,
  LENGTH: 44.5,
  HACK_Y: 0,
  HOG_LINE_Y: 6.4,
  TEE_Y: 23.47,
  BACK_LINE_Y: 29,
  HOUSE_RADIUS: 1.83,
  BUTTON_RADIUS: 0.15,
});

export const PHYSICS = deepFreeze({
  TIME_STEP: 1 / 60,
  MAX_SIM_TIME: 24,
  STONE_RADIUS: 0.145,
  STONE_MASS: 19.96,
  RESTITUTION: 0.92,
  LINEAR_FRICTION: 0.12,
  SWEEP_FRICTION_MULTIPLIER: 0.72,
  SWEEP_CURL_MULTIPLIER: 0.3,
  CURL_ACCEL: 0.022,
  STOP_SPEED: 0.05,
  STOP_SPIN: 0.07,
  RESIDUAL_SPIN_DECAY: 0.996,
  COLLISION_EPSILON: 0.01,
});
