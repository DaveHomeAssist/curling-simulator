import * as THREE from 'three';
import { buildSheet } from './models/sheet.js';
import { buildStone } from './models/stone.js';
import { buildArena } from './models/arena.js';
import { PHYSICS, SHEET } from '../physics/constants_v2.js';

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

export function createRenderer3D(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);
  scene.fog = new THREE.Fog(0x050507, 22, 88);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 5.6, -4.8);
  camera.lookAt(0, 0.18, 18.5);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
  root.add(buildArena(THREE));
  root.add(buildSheet(THREE));

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
  iceGlow.position.set(0, 0.015, SHEET.hackToTee);
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

    const liveIds = new Set();
    for (const stone of state.stones) {
      liveIds.add(stone.id);
      const mesh = ensureStoneMesh(stone);
      const pos = worldToScene(stone);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.y += (stone.omega ?? 0) * 0.04;
      mesh.visible = !(stone.removed || stone.inPlay === false);
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
  }

  return {
    resize,
    sync,
    render() {
      renderer.render(scene, camera);
    },
    setVisible(visible) {
      renderer.domElement.style.display = visible ? 'block' : 'none';
    },
    dispose() {
      renderer.dispose();
    },
  };
}
