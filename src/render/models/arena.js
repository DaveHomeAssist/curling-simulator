import { COLORS, SHEET } from './constants.js';

function makeBeam(THREERef, length, height, depth, color) {
  return new THREERef.Mesh(
    new THREERef.BoxGeometry(length, height, depth),
    new THREERef.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.08,
    }),
  );
}

function addSeatingRows(THREERef, group) {
  const rowCount = 8;
  const rowWidth = SHEET.width + 14;
  const startZ = -4.5;

  for (let index = 0; index < rowCount; index += 1) {
    const row = new THREERef.Mesh(
      new THREERef.BoxGeometry(rowWidth - index * 0.8, 0.55, 1.2),
      new THREERef.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x140915 : 0x08090d,
        roughness: 0.94,
        metalness: 0.02,
      }),
    );
    row.position.set(0, 0.28 + index * 0.56, startZ - index * 1.05);
    group.add(row);
  }
}

function addLights(THREERef, group) {
  const lightPositions = [
    [-8, 8.5, -12],
    [8, 8.5, -12],
    [-8, 8.5, 8],
    [8, 8.5, 8],
  ];

  lightPositions.forEach(([x, y, z]) => {
    const bulb = new THREERef.Mesh(
      new THREERef.SphereGeometry(0.18, 16, 12),
      new THREERef.MeshStandardMaterial({
        color: index % 2 === 0 ? 0xf8fbff : 0x18141d,
        emissive: index % 2 === 0 ? 0x00ffff : 0xff0040,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.02,
      }),
    );
    bulb.position.set(x, y, z);
    group.add(bulb);

    const light = new THREERef.PointLight(index % 2 === 0 ? 0x00ffff : 0xff0040, 600, 45, 2);
    light.position.set(x, y + 0.4, z);
    group.add(light);
  });
}

export function buildArena(THREERef = globalThis.THREE) {
  const THREE = THREERef ?? globalThis.THREE;
  if (!THREE) {
    throw new Error('buildArena requires a THREE namespace');
  }
  const group = new THREE.Group();
  group.name = 'curling-arena';

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(SHEET.width + 20, 0.25, SHEET.length + 28),
      new THREE.MeshStandardMaterial({
      color: COLORS.arenaDark,
      roughness: 1,
      metalness: 0.02,
    }),
  );
  floor.position.set(0, -0.16, SHEET.length / 2);
  group.add(floor);

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(SHEET.width + 24, 14, SHEET.length + 34),
      new THREE.MeshStandardMaterial({
      color: COLORS.arenaLight,
      roughness: 0.9,
      metalness: 0.06,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    }),
  );
  shell.position.y = 6.5;
  group.add(shell);

  addSeatingRows(THREE, group);

  const roofBeam = makeBeam(THREE, SHEET.width + 18, 0.25, 0.45, 0x0f1016);
  roofBeam.position.set(0, 10.2, 7.5);
  group.add(roofBeam);

  const crossBeam = roofBeam.clone();
  crossBeam.position.z = SHEET.length - 7.5;
  group.add(crossBeam);

  const scoreboard = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x07080c,
      roughness: 0.65,
      metalness: 0.1,
    }),
  );
  scoreboard.position.set(0, 8.2, 2.5);
  group.add(scoreboard);

  addLights(THREE, group);

  const ambient = new THREE.AmbientLight(0x2b3041, 0.62);
  group.add(ambient);

  const rim = new THREE.DirectionalLight(0x00ffff, 0.95);
  rim.position.set(-8, 12, 10);
  group.add(rim);

  return group;
}
