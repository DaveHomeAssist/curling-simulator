import * as THREE from 'three';
import { buildSheet } from './models/sheet.js';
import { buildStone } from './models/stone.js';
import { buildArena } from './models/arena.js';
import { updateIceMaterial } from './models/iceShader.js';
import { PHYSICS, SHEET } from '../physics/constants.js';

const CAMERA_POSES = {
  delivery: { position: [0, 5.6, -4.8], target: [0, 0.18, 18.5] },
  follow: { position: [0, 4.7, -5.6], target: [0, 0.18, 14.5] },
  house: { position: [0, 10.5, 23.47], target: [0, 0, 23.47] },
  broadcast: { position: [7.8, 6.6, 20], target: [0, 0, 24] },
  free: { position: [0, 9, 8], target: [0, 0, 20] },
};

function worldToScene(stone) {
  return {
    x: stone.x,
    y: 0.145,
    z: stone.y,
  };
}

function getDeadStoneSlot(stones, stone) {
  const removedByTeam = stones.filter((entry) => (entry.removed || entry.inPlay === false) && entry.team === stone.team);
  const slot = Math.max(0, removedByTeam.findIndex((entry) => entry.id === stone.id));
  const side = stone.team === 'yel' ? 1 : -1;
  return {
    x: side * (SHEET.WIDTH / 2 + 0.72 + (slot % 2) * 0.22),
    y: 0.12,
    z: 4.2 + Math.floor(slot / 2) * 0.42,
  };
}

export function createRenderer3D(container) {
  // Pre-test WebGL before handing off to Three.js
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
  if (!gl) {
    throw new Error('WebGL context creation failed — browser may not support WebGL');
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.fog = new THREE.Fog(0x050507, 22, 88);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 5.6, -4.8);
  camera.lookAt(0, 0.18, 18.5);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (glErr) {
    throw new Error('THREE.WebGLRenderer failed: ' + (glErr.message || glErr));
  }

  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const root = new THREE.Group();
  scene.add(root);
  try { root.add(buildArena(THREE)); } catch (e) { throw new Error('buildArena failed: ' + e.message); }
  let sheetGroup;
  try { sheetGroup = buildSheet(THREE); root.add(sheetGroup); } catch (e) { throw new Error('buildSheet failed: ' + e.message); }
  const iceMat = sheetGroup?.children?.find(c => c.userData?.iceMaterial)?.userData.iceMaterial ?? null;
  const startTime = performance.now();

  const iceGlow = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  iceGlow.rotation.x = -Math.PI / 2;
  iceGlow.position.set(0, 0.015, SHEET.TEE_Y);
  root.add(iceGlow);

  const hemi = new THREE.HemisphereLight(0xf8fdff, 0x250812, 0.82);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0x00ffff, 1.5);
  keyLight.position.set(0, 12, 10);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xff0040, 0.7);
  fillLight.position.set(-8, 8, -6);
  scene.add(fillLight);

  const spot = new THREE.SpotLight(0xf7fbff, 2.5, 120, 0.42, 0.3, 1.4);
  spot.position.set(0, 16, 14);
  spot.target.position.set(0, 0.2, 21);
  spot.castShadow = true;
  scene.add(spot);
  scene.add(spot.target);

  const stoneMeshes = new Map();
  const aimGroup = new THREE.Group();
  const aimLineMaterial = new THREE.LineDashedMaterial({
    color: 0x00ffff,
    dashSize: 0.3,
    gapSize: 0.18,
    transparent: true,
    opacity: 0.8,
  });
  const aimGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.025, 0),
    new THREE.Vector3(0, 0.025, 1),
  ]);
  const aimLine = new THREE.Line(aimGeometry, aimLineMaterial);
  aimLine.computeLineDistances();
  aimGroup.add(aimLine);
  scene.add(aimGroup);

  // --- Sweep particles ---
  const SWEEP_COUNT = 20;
  const sweepPositions = new Float32Array(SWEEP_COUNT * 3);
  const sweepGeometry = new THREE.BufferGeometry();
  sweepGeometry.setAttribute('position', new THREE.BufferAttribute(sweepPositions, 3));
  const sweepMaterial = new THREE.PointsMaterial({
    color: 0xaaffff,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sweepPoints = new THREE.Points(sweepGeometry, sweepMaterial);
  sweepPoints.visible = false;
  scene.add(sweepPoints);

  // --- Wake trail ---
  const WAKE_MAX = 120;
  const wakePositions = new Float32Array(WAKE_MAX * 3);
  const wakeColors = new Float32Array(WAKE_MAX * 3);
  const wakeGeometry = new THREE.BufferGeometry();
  wakeGeometry.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
  wakeGeometry.setAttribute('color', new THREE.BufferAttribute(wakeColors, 3));
  const wakeMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    linewidth: 1,
  });
  const wakeLine = new THREE.Line(wakeGeometry, wakeMaterial);
  wakeLine.visible = false;
  scene.add(wakeLine);

  // --- Impact flash pool ---
  const IMPACT_POOL = 4;
  const IMPACT_DURATION = 300;
  const impactPool = [];
  for (let i = 0; i < IMPACT_POOL; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    mesh.visible = false;
    mesh.userData.activeUntil = 0;
    mesh.userData.startAt = 0;
    scene.add(mesh);
    impactPool.push(mesh);
  }

  // Item 13: Visible spotlight cone (volumetric light cone mesh)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xf8fbff, transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide,
  });
  const coneGeo = new THREE.ConeGeometry(3.5, 12, 32, 1, true);
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.set(0, 10, SHEET.TEE_Y);
  coneMesh.rotation.x = Math.PI;
  scene.add(coneMesh);

  // Item 15: Ice gloss reflection plane
  const glossMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.02, depthWrite: false,
  });
  const glossPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 30), glossMat);
  glossPlane.rotation.x = -Math.PI / 2;
  glossPlane.rotation.z = 0.15;
  glossPlane.position.set(0.8, 0.006, SHEET.TEE_Y);
  root.add(glossPlane);

  // Item 21: 3D Scoreboard emissive display
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = 512; sbCanvas.height = 256;
  const sbTex = new THREE.CanvasTexture(sbCanvas);
  sbTex.colorSpace = THREE.SRGBColorSpace;
  const sbMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 2.1),
    new THREE.MeshBasicMaterial({ map: sbTex, transparent: true }),
  );
  sbMesh.position.set(0, 8.25, 2.5);
  scene.add(sbMesh);

  function updateScoreboard(state) {
    const ctx2 = sbCanvas.getContext('2d');
    ctx2.clearRect(0,0,512,256);
    ctx2.fillStyle = 'rgba(7,8,12,0.85)';
    ctx2.fillRect(0,0,512,256);
    // Team colors + scores
    ctx2.fillStyle = '#FF5555';
    ctx2.beginPath(); ctx2.arc(130,90,24,0,Math.PI*2); ctx2.fill();
    ctx2.fillStyle = '#D4A017';
    ctx2.beginPath(); ctx2.arc(382,90,24,0,Math.PI*2); ctx2.fill();
    ctx2.fillStyle = '#FFFFFF';
    ctx2.font = 'bold 72px system-ui';
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    ctx2.fillText(String(state.scores?.red ?? 0), 200, 90);
    ctx2.fillText('·', 256, 82);
    ctx2.fillText(String(state.scores?.yel ?? 0), 312, 90);
    // End
    ctx2.fillStyle = '#5A6080';
    ctx2.font = '32px system-ui';
    ctx2.fillText('END ' + (state.end ?? 1), 256, 180);
    sbTex.needsUpdate = true;
  }

  // Item 14: Vignette — applied as a screen-space overlay via a second scene
  const vignetteScene = new THREE.Scene();
  const vignetteCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = 512; vignetteCanvas.height = 512;
  const vCtx = vignetteCanvas.getContext('2d');
  const vGrad = vCtx.createRadialGradient(256,256,100,256,256,360);
  vGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
  vCtx.fillStyle = vGrad;
  vCtx.fillRect(0,0,512,512);
  const vignetteTex = new THREE.CanvasTexture(vignetteCanvas);
  const vignetteMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2,2),
    new THREE.MeshBasicMaterial({ map: vignetteTex, transparent: true, depthTest: false }),
  );
  vignetteScene.add(vignetteMesh);

  let snapshot = null;

  function ensureStoneMesh(stone) {
    if (stoneMeshes.has(stone.id)) return stoneMeshes.get(stone.id);
    const mesh = buildStone(THREE, stone.team, stone.idx);
    mesh.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    root.add(mesh);
    stoneMeshes.set(stone.id, mesh);
    return mesh;
  }

  function setCamera(state, movingStone) {
    const pose = CAMERA_POSES[state.cameraMode] ?? CAMERA_POSES.delivery;
    const focusZ = movingStone ? movingStone.y : pose.target[2];
    const focusX = movingStone ? movingStone.x * 0.3 : pose.target[0];
    const desired = new THREE.Vector3(
      pose.position[0] + (state.cameraMode === 'follow' && movingStone ? movingStone.x * 0.24 : 0),
      pose.position[1],
      pose.position[2] + (state.cameraMode === 'follow' && movingStone ? movingStone.y - 12 : 0),
    );
    camera.position.lerp(desired, 0.08);
    camera.lookAt(focusX, pose.target[1], focusZ);
  }

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function sync(state, movingStone) {
    snapshot = state;
    setCamera(state, movingStone);

    // Update ice shader with pebble wear and elapsed time
    if (iceMat) {
      updateIceMaterial(iceMat, state.pebbleWear ?? 0, (performance.now() - startTime) * 0.001);
    }

    // Item 4: Scratch marks intensify with wear
    const scratchMesh = sheetGroup?.getObjectByProperty?.('userData', { scratchMesh: true });
    if (!scratchMesh) {
      sheetGroup?.traverse(child => {
        if (child.userData?.scratchMesh) child.material.opacity = Math.min(0.3, (state.pebbleWear ?? 0) * 0.4);
      });
    }

    // Item 21: Update scoreboard display
    updateScoreboard(state);

    const liveIds = new Set();
    for (const stone of state.stones) {
      liveIds.add(stone.id);
      const mesh = ensureStoneMesh(stone);
      const removed = stone.removed || stone.inPlay === false;
      const pos = removed ? getDeadStoneSlot(state.stones, stone) : worldToScene(stone);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.y = (mesh.rotation.y + (stone.omega ?? 0) * 0.04) % (Math.PI * 2);
      mesh.visible = true;
      mesh.scale.setScalar(removed ? 0.9 : 1);
    }

    for (const [id, mesh] of stoneMeshes.entries()) {
      if (!liveIds.has(id)) {
        mesh.visible = false;
      }
    }

    if (state.preview?.length > 1 && state.mode !== 'travel') {
      const points = state.preview.map((point) => new THREE.Vector3(point.x, 0.03, point.y));
      aimLine.geometry.dispose();
      aimLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      aimLine.computeLineDistances();
      aimGroup.visible = true;
    } else {
      aimGroup.visible = false;
    }

    const now = performance.now();

    // --- Sweep particles ---
    if (state.sweeping && state.mode === 'travel') {
      const cx = state.aimX;
      const cz = state.effects.sweepTrail.length > 0
        ? state.effects.sweepTrail[state.effects.sweepTrail.length - 1].y
        : 21.97;
      const pos = sweepGeometry.attributes.position;
      for (let i = 0; i < SWEEP_COUNT; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.22;
        pos.setXYZ(i, cx + Math.cos(angle) * r, 0.02 + Math.random() * 0.06, cz + Math.sin(angle) * r);
      }
      pos.needsUpdate = true;
      sweepPoints.visible = true;
    } else {
      sweepPoints.visible = false;
    }

    // --- Wake trail ---
    const trail = state.effects.wakeTrail;
    if (trail.length >= 2) {
      const count = Math.min(trail.length, WAKE_MAX);
      const wakePos = wakeGeometry.attributes.position;
      const wakeCol = wakeGeometry.attributes.color;
      const WAKE_TTL = 10000;
      for (let i = 0; i < count; i += 1) {
        const pt = trail[trail.length - count + i];
        const age = now - pt.createdAt;
        const t = Math.max(0, 1 - age / WAKE_TTL);
        wakePos.setXYZ(i, pt.x, 0.012, pt.y);
        wakeCol.setXYZ(i, t * 0.4, t * 0.85, t * 0.9);
      }
      wakePos.needsUpdate = true;
      wakeCol.needsUpdate = true;
      wakeGeometry.setDrawRange(0, count);
      wakeLine.visible = true;
    } else {
      wakeLine.visible = false;
    }

    // --- Impact flashes ---
    // Activate pool slots for new impacts (< IMPACT_DURATION ms old and impulse > 0)
    for (const impact of state.effects.impacts) {
      if (impact.impulse <= 0) continue;
      const age = now - impact.createdAt;
      if (age > IMPACT_DURATION) continue;
      // Check if already being rendered by a pool slot
      const alreadyActive = impactPool.some((mesh) => mesh.userData.impactId === impact.createdAt + impact.pair[0]);
      if (alreadyActive) continue;
      // Find the two stones to place flash at their midpoint
      const stoneA = state.stones.find((s) => s.id === impact.pair[0]);
      const stoneB = state.stones.find((s) => s.id === impact.pair[1]);
      if (!stoneA && !stoneB) continue;
      const fx = stoneA && stoneB ? (stoneA.x + stoneB.x) / 2 : (stoneA ?? stoneB).x;
      const fz = stoneA && stoneB ? (stoneA.y + stoneB.y) / 2 : (stoneA ?? stoneB).y;
      // Grab an idle or oldest pool slot
      const slot = impactPool.find((mesh) => !mesh.visible) ?? impactPool.reduce((oldest, mesh) => mesh.userData.startAt < oldest.userData.startAt ? mesh : oldest);
      slot.position.set(fx, 0.145, fz);
      slot.userData.impactId = impact.createdAt + impact.pair[0];
      slot.userData.startAt = now - age;
      slot.userData.activeUntil = slot.userData.startAt + IMPACT_DURATION;
      slot.visible = true;
    }
    // Animate active pool slots
    for (const mesh of impactPool) {
      if (!mesh.visible) continue;
      const elapsed = now - mesh.userData.startAt;
      const total = IMPACT_DURATION;
      if (elapsed >= total) {
        mesh.visible = false;
        mesh.userData.impactId = null;
        continue;
      }
      const t = elapsed / total;
      const scale = 1.0 - t * 0.85;
      mesh.scale.setScalar(scale);
      mesh.material.opacity = (1 - t) * 0.9;
      mesh.material.emissiveIntensity = (1 - t) * 3.0;
    }
  }

  return {
    resize,
    sync,
    render() {
      renderer.render(scene, camera);
      // Item 14: Vignette overlay pass
      renderer.autoClear = false;
      renderer.render(vignetteScene, vignetteCamera);
      renderer.autoClear = true;
    },
    setVisible(visible) {
      renderer.domElement.style.display = visible ? 'block' : 'none';
    },
    dispose() {
      renderer.dispose();
    },
  };
}
