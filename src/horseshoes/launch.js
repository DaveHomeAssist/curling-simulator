import { ARC_PRESETS, COURT, strengthToSpeed } from './config.js';

function axisAngle(axis, angle) {
  const half = angle / 2;
  const scale = Math.sin(half);
  return { x: axis.x * scale, y: axis.y * scale, z: axis.z * scale, w: Math.cos(half) };
}

function multiply(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function createLaunchCommand(controls) {
  const aim = controls.aimDeg * Math.PI / 180;
  const elevation = ARC_PRESETS[controls.arc].angleDeg * Math.PI / 180;
  const speed = strengthToSpeed(controls.strength);
  const horizontal = speed * Math.cos(elevation);
  const forward = { x: Math.sin(aim), z: Math.cos(aim) };
  const lateral = { x: Math.cos(aim), y: 0, z: -Math.sin(aim) };
  const yaw = axisAngle({ x: 0, y: 1, z: 0 }, aim);
  const releasePitch = controls.style === 'flip' ? -0.18 : -0.08;
  const orientation = multiply(yaw, axisAngle({ x: 1, y: 0, z: 0 }, releasePitch));

  const angularVelocity = controls.style === 'flip'
    ? { x: lateral.x * 5.6, y: 0.35, z: lateral.z * 5.6 }
    : { x: lateral.x * 0.7, y: 5.25, z: lateral.z * 0.7 };

  return {
    position: { x: 0, y: COURT.releaseHeight, z: 0 },
    orientation,
    linearVelocity: {
      x: forward.x * horizontal,
      y: speed * Math.sin(elevation),
      z: forward.z * horizontal,
    },
    angularVelocity,
    speed,
    elevation,
    aim,
    controls: { ...controls },
  };
}

export function sampleBallisticPath(command, step = 0.08, maxSeconds = 3) {
  const points = [];
  for (let time = 0; time <= maxSeconds; time += step) {
    const y = command.position.y + command.linearVelocity.y * time - 0.5 * 9.81 * time * time;
    if (y < 0.04) break;
    points.push({
      x: command.position.x + command.linearVelocity.x * time,
      y,
      z: command.position.z + command.linearVelocity.z * time,
    });
  }
  return points;
}
