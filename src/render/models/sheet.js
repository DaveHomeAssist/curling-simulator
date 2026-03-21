import { COLORS, SHEET } from './constants.js';
import { createIceMaterial } from './iceShader.js';

function makeLineGeometry(THREERef, length, thickness = 0.025, depth = 0.002) {
  return new THREERef.BoxGeometry(length, depth, thickness);
}

function addHouseRings(THREERef, group, teeZ) {
  const ringColors = [COLORS.sheetRed, COLORS.sheetBlue, COLORS.sheetRed, 0xffffff];
  const ringRadii = SHEET.houseRadii;

  ringRadii.forEach((radius, index) => {
    const ring = new THREERef.Mesh(
      new THREERef.RingGeometry(radius - 0.03, radius, 64),
      new THREERef.MeshStandardMaterial({
        color: ringColors[index],
        transparent: true,
        opacity: index === ringRadii.length - 1 ? 0.92 : 0.88,
        side: THREERef.DoubleSide,
        roughness: 0.5,
        metalness: 0.03,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.008, teeZ);
    group.add(ring);
  });

  const button = new THREERef.Mesh(
    new THREERef.CylinderGeometry(0.11, 0.11, 0.01, 32),
    new THREERef.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.02,
    }),
  );
  button.position.set(0, 0.011, teeZ);
  group.add(button);
}

function addLine(THREERef, group, width, z, color) {
  const line = new THREERef.Mesh(
    makeLineGeometry(THREERef, width),
    new THREERef.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: 0.05,
    }),
  );
  line.position.set(0, 0.012, z);
  group.add(line);
}

function addDashedCenterLine(THREERef, group, length) {
  const dashCount = 18;
  const dashLength = length / dashCount * 0.55;
  const gapLength = length / dashCount * 0.45;
  const start = dashLength / 2;

  for (let index = 0; index < dashCount; index += 1) {
    const z = start + index * (dashLength + gapLength);
    const dash = new THREERef.Mesh(
      new THREERef.BoxGeometry(0.03, 0.002, dashLength),
      new THREERef.MeshStandardMaterial({
        color: COLORS.sheetBlue,
        roughness: 0.5,
        metalness: 0.04,
      }),
    );
    dash.position.set(0, 0.011, z);
    group.add(dash);
  }
}

export function buildSheet(THREERef = globalThis.THREE) {
  const THREE = THREERef ?? globalThis.THREE;
  if (!THREE) {
    throw new Error('buildSheet requires a THREE namespace');
  }
  const group = new THREE.Group();
  group.name = 'curling-sheet';

  const iceMaterial = createIceMaterial(THREE);
  const ice = new THREE.Mesh(
    new THREE.PlaneGeometry(SHEET.width, SHEET.length, 1, 1),
    iceMaterial,
  );
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(0, 0, SHEET.length / 2);
  ice.userData.iceMaterial = iceMaterial;
  group.add(ice);

  const boardMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.boardWood,
    roughness: 0.82,
    metalness: 0.02,
  });

  const edgeBoardMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.boardDark,
    roughness: 0.92,
    metalness: 0.02,
  });

  const boardLength = SHEET.length;
  const sideBoard = new THREE.Mesh(
    new THREE.BoxGeometry(SHEET.boardThickness, SHEET.boardHeight, boardLength),
    boardMaterial,
  );
  sideBoard.position.set(-SHEET.width / 2 - SHEET.boardThickness / 2, SHEET.boardHeight / 2 - 0.005, SHEET.length / 2);
  group.add(sideBoard.clone());
  const farSideBoard = sideBoard.clone();
  farSideBoard.position.x *= -1;
  group.add(farSideBoard);

  const endBoard = new THREE.Mesh(
    new THREE.BoxGeometry(SHEET.width + SHEET.boardInset * 2, SHEET.boardHeight, SHEET.boardThickness),
    edgeBoardMaterial,
  );
  endBoard.position.set(0, SHEET.boardHeight / 2 - 0.005, SHEET.boardThickness / 2);
  group.add(endBoard.clone());
  const farEndBoard = endBoard.clone();
  farEndBoard.position.z = SHEET.length - SHEET.boardThickness / 2;
  group.add(farEndBoard);

  addLine(THREE, group, SHEET.width, SHEET.hogToTee, COLORS.sheetRed);
  addLine(THREE, group, SHEET.width, SHEET.hackToTee + SHEET.backLineFromTee, COLORS.sheetBlue);
  addLine(THREE, group, SHEET.width, SHEET.length - SHEET.hogToTee, COLORS.sheetRed);
  addLine(THREE, group, SHEET.width, SHEET.length - SHEET.backLineFromTee, COLORS.sheetBlue);
  addDashedCenterLine(THREE, group, SHEET.length);
  addHouseRings(THREE, group, SHEET.hackToTee);

  const hacks = new THREE.Group();
  const hackBlockGeometry = new THREE.BoxGeometry(0.18, 0.02, 0.08);
  const hackMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2f38,
    roughness: 0.5,
    metalness: 0.08,
  });

  const nearHack = new THREE.Mesh(hackBlockGeometry, hackMaterial);
  nearHack.position.set(-0.38, 0.01, 0.12);
  hacks.add(nearHack);

  const nearHackOther = nearHack.clone();
  nearHackOther.position.x = 0.38;
  hacks.add(nearHackOther);

  const farHack = nearHack.clone();
  farHack.position.z = SHEET.length - 0.12;
  hacks.add(farHack);

  const farHackOther = farHack.clone();
  farHackOther.position.x = 0.38;
  hacks.add(farHackOther);
  group.add(hacks);

  return group;
}
