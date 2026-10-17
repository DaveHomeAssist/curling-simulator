import { COURT } from './config.js';
import { buildShoePieceSpecs } from './geometry.js';
import { createLaunchCommand, sampleBallisticPath } from './launch.js';

const VIEWS = Object.freeze({
  pitching: Object.freeze({ xMin: -2.1, xMax: 2.1, zMin: -1, zMax: 14.1 }),
  close: Object.freeze({ xMin: -0.9, xMax: 0.9, zMin: 10.35, zMax: 13.7 }),
});

function normalizeQuaternion(quaternion) {
  const length =
    Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w) || 1;
  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length,
  };
}

function interpolateQuaternion(a, b, alpha) {
  const sign = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w < 0 ? -1 : 1;
  return normalizeQuaternion({
    x: a.x + (b.x * sign - a.x) * alpha,
    y: a.y + (b.y * sign - a.y) * alpha,
    z: a.z + (b.z * sign - a.z) * alpha,
    w: a.w + (b.w * sign - a.w) * alpha,
  });
}

function rotateVector(vector, q) {
  const ix = q.w * vector.x + q.y * vector.z - q.z * vector.y;
  const iy = q.w * vector.y + q.z * vector.x - q.x * vector.z;
  const iz = q.w * vector.z + q.x * vector.y - q.y * vector.x;
  const iw = -q.x * vector.x - q.y * vector.y - q.z * vector.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

export function createHorseshoeRenderer2D(container) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute(
    'aria-label',
    'Top-down horseshoes court, pitching from end A to B',
  );
  container.appendChild(canvas);
  const context = canvas.getContext('2d');
  let width = 1;
  let height = 1;
  let cameraMode = 'pitching';
  let diagnostics = false;
  let end = 0;

  function viewBounds() {
    const view = VIEWS[cameraMode];
    return end
      ? {
          ...view,
          zMin: COURT.stakeDistance - view.zMax,
          zMax: COURT.stakeDistance - view.zMin,
        }
      : view;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function projector() {
    const view = viewBounds();
    const scale = Math.min(
      width / (view.xMax - view.xMin),
      height / (view.zMax - view.zMin),
    );
    const offsetX = (width - (view.xMax - view.xMin) * scale) / 2;
    const offsetY = (height - (view.zMax - view.zMin) * scale) / 2;
    // Physics stays in the active end's local frame. Keep the top-down view
    // north-up and rotate every court, shoe, trajectory and diagnostic point
    // into the same physical end transform used by the Three renderer.
    return (x, z) => ({
      x: offsetX + ((end ? -x : x) - view.xMin) * scale,
      y:
        height - offsetY -
        ((end ? COURT.stakeDistance - z : z) - view.zMin) * scale,
      scale,
    });
  }

  function drawRect(project, xMin, zMin, xMax, zMax, fill) {
    const first = project(xMin, zMax);
    const second = project(xMax, zMin);
    context.fillStyle = fill;
    context.fillRect(first.x, first.y, second.x - first.x, second.y - first.y);
  }

  function drawCourt(project) {
    context.fillStyle = '#0c1715';
    context.fillRect(0, 0, width, height);
    drawRect(project, -2.1, -1, 2.1, 14.1, '#192d27');
    drawRect(project, -1.25, -0.2, 1.25, 14, '#25483b');
    drawRect(
      project,
      -COURT.pitWidth / 2,
      COURT.stakeDistance - COURT.pitLength / 2,
      COURT.pitWidth / 2,
      COURT.stakeDistance + COURT.pitLength / 2,
      '#9f7951',
    );

    const lineA = project(-1.3, 0);
    const lineB = project(1.3, 0);
    context.strokeStyle = '#e9bc63';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(lineA.x, lineA.y);
    context.lineTo(lineB.x, lineB.y);
    context.stroke();

    const stakeBase = project(0, COURT.stakeDistance);
    const stakeTop = project(
      0,
      COURT.stakeDistance - Math.sin(COURT.stakeLean) * COURT.stakeHeight,
    );
    context.strokeStyle = '#d7dfdf';
    context.lineWidth = Math.max(4, stakeBase.scale * COURT.stakeRadius * 2);
    context.beginPath();
    context.moveTo(stakeBase.x, stakeBase.y);
    context.lineTo(stakeTop.x, stakeTop.y);
    context.stroke();
    context.fillStyle = '#f2d79c';
    context.beginPath();
    context.arc(
      stakeBase.x,
      stakeBase.y,
      Math.max(3, stakeBase.scale * 0.06),
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  function drawTrajectory(project, controls) {
    const points = sampleBallisticPath(createLaunchCommand(controls));
    if (points.length < 2) return;
    context.save();
    context.strokeStyle = 'rgba(255, 212, 119, 0.72)';
    context.lineWidth = 2;
    context.setLineDash([7, 6]);
    context.beginPath();
    points.forEach((point, index) => {
      const projected = project(point.x, point.z);
      if (index === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    });
    context.stroke();
    context.restore();
  }

  function drawShoe(project, position, rotation, color = '#e8e1d2') {
    const marker = project(position.x, position.z);
    context.save();
    context.strokeStyle = 'rgba(255, 212, 119, 0.72)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(
      marker.x,
      marker.y,
      Math.max(8, marker.scale * 0.13),
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();

    context.fillStyle = color;
    context.strokeStyle = '#493f35';
    context.lineWidth = 1.2;
    for (const piece of buildShoePieceSpecs()) {
      const corners = [
        { x: -piece.halfExtents.x, y: 0, z: -piece.halfExtents.z },
        { x: piece.halfExtents.x, y: 0, z: -piece.halfExtents.z },
        { x: piece.halfExtents.x, y: 0, z: piece.halfExtents.z },
        { x: -piece.halfExtents.x, y: 0, z: piece.halfExtents.z },
      ];
      const worldCorners = corners.map((corner) => {
        const local = rotateVector(corner, piece.rotation);
        const offset = rotateVector(
          {
            x: local.x + piece.translation.x,
            y: local.y + piece.translation.y,
            z: local.z + piece.translation.z,
          },
          rotation,
        );
        return project(position.x + offset.x, position.z + offset.z);
      });
      context.beginPath();
      worldCorners.forEach((corner, index) => {
        if (index === 0) context.moveTo(corner.x, corner.y);
        else context.lineTo(corner.x, corner.y);
      });
      context.closePath();
      context.fill();
      context.stroke();
    }
  }

  function drawDiagnostics(project, world) {
    if (!diagnostics) return;
    const buffers = world.debugRender();
    context.lineWidth = 1;
    for (let index = 0; index < buffers.vertices.length; index += 6) {
      const colorOffset = (index / 3) * 4;
      const first = project(
        buffers.vertices[index],
        buffers.vertices[index + 2],
      );
      const second = project(
        buffers.vertices[index + 3],
        buffers.vertices[index + 5],
      );
      const red = Math.round(buffers.colors[colorOffset] * 255);
      const green = Math.round(buffers.colors[colorOffset + 1] * 255);
      const blue = Math.round(buffers.colors[colorOffset + 2] * 255);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, 0.78)`;
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.stroke();
    }
  }

  function render(pair, alpha, state, controls, world) {
    const project = projector();
    drawCourt(project);
    if (state.status === 'ready') drawTrajectory(project, controls);
    const position = {
      x:
        pair.previous.position.x +
        (pair.current.position.x - pair.previous.position.x) * alpha,
      y:
        pair.previous.position.y +
        (pair.current.position.y - pair.previous.position.y) * alpha,
      z:
        pair.previous.position.z +
        (pair.current.position.z - pair.previous.position.z) * alpha,
    };
    const rotation = interpolateQuaternion(
      pair.previous.rotation,
      pair.current.rotation,
      alpha,
    );
    if (!state.shoes || state.status === 'ready')
      drawShoe(project, position, rotation);
    for (const item of state.shoes || [])
      if (!item.removed)
        drawShoe(
          project,
          item.position,
          item.rotation,
          item.player === 0 ? '#55b5ff' : '#ff9f43',
        );
    drawDiagnostics(project, world);
  }

  return {
    kind: '2d-fallback',
    setEnd(value) {
      end = value ? 1 : 0;
      canvas.setAttribute(
        'aria-label',
        `Top-down horseshoes court, pitching from end ${end ? 'B to A' : 'A to B'}`,
      );
    },
    getCamera: () => ({ end, ...viewBounds() }),
    resize,
    render,
    setCameraMode(mode) {
      cameraMode = mode in VIEWS ? mode : 'pitching';
    },
    getCameraMode: () => cameraMode,
    setDiagnostics(enabled) {
      diagnostics = Boolean(enabled);
    },
    getDiagnostics: () => diagnostics,
    dispose() {
      canvas.remove();
    },
  };
}
