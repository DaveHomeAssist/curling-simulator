import { SHOE } from './config.js';

function quaternionFromYaw(yaw) {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

export function buildShoePieceSpecs(arcSegments = 7) {
  const outerHalfWidth = SHOE.width / 2;
  const innerHalfWidth = SHOE.opening / 2;
  const railHalfWidth = (outerHalfWidth - innerHalfWidth) / 2;
  const centerRadius = innerHalfWidth + railHalfWidth;
  const backEdge = -SHOE.length / 2;
  const arcCenterZ = backEdge + centerRadius + railHalfWidth;
  const heightHalf = SHOE.height / 2;
  const pieces = [];
  const segmentLength = Math.PI * centerRadius / arcSegments * 1.09;

  for (let index = 0; index < arcSegments; index += 1) {
    const angle = Math.PI + (index + 0.5) * Math.PI / arcSegments;
    pieces.push({
      id: `heel-${index}`,
      halfExtents: { x: railHalfWidth, y: heightHalf, z: segmentLength / 2 },
      translation: {
        x: centerRadius * Math.cos(angle),
        y: 0,
        z: arcCenterZ + centerRadius * Math.sin(angle),
      },
      rotation: quaternionFromYaw(-angle),
    });
  }

  const sideMinZ = arcCenterZ - railHalfWidth * 0.7;
  const sideMaxZ = SHOE.length / 2;
  const sideHalfLength = (sideMaxZ - sideMinZ) / 2;
  const sideCenterZ = (sideMaxZ + sideMinZ) / 2;
  for (const side of [-1, 1]) {
    pieces.push({
      id: side < 0 ? 'left-rail' : 'right-rail',
      halfExtents: { x: railHalfWidth, y: heightHalf, z: sideHalfLength },
      translation: { x: side * centerRadius, y: 0, z: sideCenterZ },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
  }

  return pieces;
}

export function isPointInsideAnyShoePiece(x, z, pieces = buildShoePieceSpecs()) {
  return pieces.some((piece) => {
    const { y, w } = piece.rotation;
    const yaw = 2 * Math.atan2(y, w);
    const dx = x - piece.translation.x;
    const dz = z - piece.translation.z;
    const localX = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
    const localZ = Math.sin(yaw) * dx + Math.cos(yaw) * dz;
    return Math.abs(localX) <= piece.halfExtents.x && Math.abs(localZ) <= piece.halfExtents.z;
  });
}
