import { COLORS, STONE } from './constants.js';

function makeProfile(THREERef) {
  return [
    [0, STONE.height * 0.5],
    [STONE.runningBandRadius - 0.01, STONE.height * 0.43],
    [STONE.radius * 0.63, STONE.height * 0.38],
    [STONE.radius * 0.87, STONE.height * 0.18],
    [STONE.radius, 0.04],
    [STONE.radius * 0.9, -0.02],
    [STONE.runningBandRadius + 0.012, -STONE.height * 0.36],
    [STONE.runningBandRadius, -STONE.height * 0.48],
    [0.035, -STONE.height * 0.48],
  ].map(([x, y]) => new THREERef.Vector2(x, y));
}

function makeNumberLabel(THREERef, number) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#142033';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), size / 2, size / 2 + 2);

  const texture = new THREERef.CanvasTexture(canvas);
  texture.colorSpace = THREERef.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addHandle(THREERef, group) {
  const handleMaterial = new THREERef.MeshStandardMaterial({
    color: 0x2d7bd9,
    roughness: 0.35,
    metalness: 0.16,
  });
  const tube = new THREERef.Mesh(
    new THREERef.TorusGeometry(STONE.handleRadius, STONE.handleTube, 10, 24),
    handleMaterial,
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.y = STONE.height * 0.54;
  group.add(tube);

  const bridge = new THREERef.Mesh(
    new THREERef.CylinderGeometry(STONE.handleTube * 0.65, STONE.handleTube * 0.65, STONE.handleRadius * 1.35, 12),
    handleMaterial,
  );
  bridge.rotation.z = Math.PI / 2;
  bridge.position.y = STONE.height * 0.54;
  group.add(bridge);
}

export function buildStone(THREERef = globalThis.THREE, team = 'red', number = 0) {
  const THREE = THREERef ?? globalThis.THREE;
  if (!THREE) {
    throw new Error('buildStone requires a THREE namespace');
  }
  const group = new THREE.Group();
  group.name = `curling-stone-${team}-${number}`;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: team === 'yel' ? COLORS.yellowStone : COLORS.redStone,
    roughness: 0.32,
    metalness: 0.12,
  });

  const body = new THREE.Mesh(
    new THREE.LatheGeometry(makeProfile(THREE), 48),
    bodyMaterial,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const baseBand = new THREE.Mesh(
    new THREE.TorusGeometry(STONE.runningBandRadius, 0.01, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.55,
      metalness: 0.24,
    }),
  );
  baseBand.rotation.x = Math.PI / 2;
  baseBand.position.y = -STONE.height * 0.47;
  group.add(baseBand);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(STONE.radius * 0.88, STONE.radius * 0.84, 0.025, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf0f2f5,
      roughness: 0.2,
      metalness: 0.04,
    }),
  );
  topCap.position.y = STONE.height * 0.465;
  group.add(topCap);

  addHandle(THREE, group);

  if (typeof document !== 'undefined') {
    const labelTexture = makeNumberLabel(THREE, number);
    if (labelTexture) {
      const label = new THREE.Mesh(
        new THREE.CylinderGeometry(STONE.numberRadius, STONE.numberRadius, 0.008, 32),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: labelTexture,
          roughness: 0.3,
          metalness: 0.02,
        }),
      );
      label.position.y = STONE.height * 0.58;
      group.add(label);
    }
  }

  return group;
}
