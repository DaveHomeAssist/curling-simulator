export const FIXED_STEP = 1 / 120;

export const COURT = Object.freeze({
  stakeDistance: 12.192,
  stakeRadius: 0.0127,
  stakeHeight: 0.3683,
  stakeLean: Math.atan2(0.0762, 0.3683),
  pitWidth: 1.22,
  pitLength: 1.55,
  pitTop: 0.025,
  releaseHeight: 1.05,
});

// Phase 1 provisional shoe. Regulation envelope: 7.25 x 7.625 x 1 in,
// with a 3.5 in opening. Mass is a representative 2.5 lb shoe, below the
// 2 lb 10 oz maximum. Refine these values from a measured production shoe.
export const SHOE = Object.freeze({
  width: 0.18415,
  length: 0.193675,
  height: 0.0254,
  opening: 0.0889,
  mass: 1.13398,
  centerOfMass: Object.freeze({ x: 0, y: 0, z: -0.014 }),
  principalInertia: Object.freeze({ x: 0.0038, y: 0.0064, z: 0.0034 }),
  friction: 0.72,
  restitution: 0.08,
  linearDamping: 0.012,
  angularDamping: 0.045,
});

export const PIT_MATERIAL = Object.freeze({
  friction: 1.15,
  restitution: 0.025,
});

export const ARC_PRESETS = Object.freeze({
  low: Object.freeze({ label: 'Low', angleDeg: 32 }),
  normal: Object.freeze({ label: 'Normal', angleDeg: 39 }),
  high: Object.freeze({ label: 'High', angleDeg: 46 }),
});

export const CONTROL_LIMITS = Object.freeze({
  aimMinDeg: -4,
  aimMaxDeg: 4,
  strengthMin: 8.5,
  strengthMax: 12.5,
});

export const LAUNCH_PRESETS = Object.freeze({
  center: Object.freeze({ label: 'Center mouth', aimDeg: 0, strength: 50, arc: 'normal', style: 'turn' }),
  stake: Object.freeze({ label: 'Stake hit', aimDeg: 0.35, strength: 50, arc: 'normal', style: 'flip' }),
  near: Object.freeze({ label: 'Near miss', aimDeg: 1.55, strength: 50, arc: 'normal', style: 'turn' }),
  loft: Object.freeze({ label: 'High flip', aimDeg: -0.25, strength: 52, arc: 'high', style: 'flip' }),
});

export const REST = Object.freeze({
  linearSpeed: 0.09,
  angularSpeed: 0.38,
  quietSeconds: 0.72,
  minimumFlightSeconds: 0.4,
  timeoutSeconds: 12,
});

export function strengthToSpeed(strength) {
  const clamped = Math.min(100, Math.max(0, strength));
  return CONTROL_LIMITS.strengthMin
    + (CONTROL_LIMITS.strengthMax - CONTROL_LIMITS.strengthMin) * clamped / 100;
}
