import { COLORS, SHEET } from './constants.js';
import { createIceMaterial } from './iceShader.js';

function makeLineGeometry(THREERef, length, thickness = 0.025, depth = 0.002) {
  return new THREERef.BoxGeometry(length, depth, thickness);
}

function addHouseRings(THREERef, group, teeZ) {
  const ringColors = [COLORS.sheetRed, COLORS.sheetBlue, COLORS.sheetRed, 0xffffff];
  const fillColors = [0x2255AA, 0xffffff, 0xCC2222, 0xffffff];
  const fillOpacities = [0.3, 0.45, 0.3, 0.9];
  const ringRadii = SHEET.houseRadii;

  // Item 6: Filled house ring discs (from largest to smallest)
  for (let i = ringRadii.length - 1; i >= 0; i--) {
    const disc = new THREERef.Mesh(
      new THREERef.CircleGeometry(ringRadii[i], 64),
      new THREERef.MeshStandardMaterial({
        color: fillColors[i],
        transparent: true,
        opacity: fillOpacities[i],
        side: THREERef.DoubleSide,
        roughness: 0.6,
        metalness: 0.02,
        depthWrite: false,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 0.005 + i * 0.001, teeZ);
    group.add(disc);
  }

  // Ring outlines
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

  // Button
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

  // Item 8: Tee crosshair
  const crossMat = new THREERef.MeshStandardMaterial({ color: COLORS.sheetBlue, roughness: 0.5, metalness: 0.04 });
  const crossH = new THREERef.Mesh(new THREERef.BoxGeometry(0.06, 0.002, 0.005), crossMat);
  crossH.position.set(0, 0.013, teeZ);
  group.add(crossH);
  const crossV = new THREERef.Mesh(new THREERef.BoxGeometry(0.005, 0.002, 0.06), crossMat);
  crossV.position.set(0, 0.013, teeZ);
  group.add(crossV);
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

  // Item 10: Ice branding decal (faint text on ice)
  const brandCanvas = document.createElement('canvas');
  brandCanvas.width = 512; brandCanvas.height = 128;
  const bctx = brandCanvas.getContext('2d');
  bctx.clearRect(0,0,512,128);
  bctx.globalAlpha = 0.08;
  bctx.fillStyle = '#88AACC';
  bctx.font = 'bold 72px system-ui';
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  bctx.fillText('CURLING', 256, 64);
  const brandTex = new THREE.CanvasTexture(brandCanvas);
  brandTex.colorSpace = THREE.SRGBColorSpace;
  const brandMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.8),
    new THREE.MeshBasicMaterial({ map: brandTex, transparent: true, depthWrite: false }),
  );
  brandMesh.rotation.x = -Math.PI / 2;
  brandMesh.position.set(0, 0.004, 6);
  group.add(brandMesh);

  // Item 4: Scratch/wear marks (procedural lines on ice surface)
  const scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = 256; scratchCanvas.height = 1024;
  const sctx = scratchCanvas.getContext('2d');
  sctx.clearRect(0,0,256,1024);
  sctx.strokeStyle = 'rgba(255,255,255,0.4)';
  for (let i=0; i<30; i++) {
    sctx.lineWidth = 0.3+Math.random()*0.5;
    sctx.globalAlpha = 0.03+Math.random()*0.04;
    sctx.beginPath();
    const cx = 100+Math.random()*56;
    sctx.moveTo(cx+(Math.random()-0.5)*16, 800+Math.random()*200);
    sctx.bezierCurveTo(cx+(Math.random()-0.5)*20,500+Math.random()*200, cx+(Math.random()-0.5)*14,200+Math.random()*150, cx+(Math.random()-0.5)*10,Math.random()*100);
    sctx.stroke();
  }
  const scratchTex = new THREE.CanvasTexture(scratchCanvas);
  scratchTex.colorSpace = THREE.SRGBColorSpace;
  const scratchMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(SHEET.width * 0.4, SHEET.length * 0.8),
    new THREE.MeshBasicMaterial({ map: scratchTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  scratchMesh.rotation.x = -Math.PI / 2;
  scratchMesh.position.set(0, 0.003, SHEET.length * 0.45);
  scratchMesh.userData.scratchMesh = true; // for wear-based opacity update
  group.add(scratchMesh);

  // Item 11: Hack scuff marks
  const scuffMat = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.04, depthWrite: false });
  const scuff = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), scuffMat);
  scuff.rotation.x = -Math.PI / 2;
  scuff.position.set(0, 0.003, 0.2);
  group.add(scuff);

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
