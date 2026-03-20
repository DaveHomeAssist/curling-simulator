import * as THREE from 'three';
import { buildSheet } from './models/sheet.js';
import { buildStone } from './models/stone.js';
import { buildArena } from './models/arena.js';
import { PHYSICS, SHEET } from '../physics/constants.js';

const CAMERA_POSES = {
  delivery: { position: [0, 4.4, -1.4], target: [0, 0.2, 16] },
  follow: { position: [0, 3.4, -2.2], target: [0, 0.2, 12] },
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
  scene.background = new THREE.Color(0x08111c);
  scene.fog = new THREE.Fog(0x08111c, 18, 70);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 4.4, -1.4);
  camera.lookAt(0, 0.2, 16);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const root = new THREE.Group();
  scene.add(root);
  root.add(buildArena(THREE));
  root.add(buildSheet(THREE));

  const hemi = new THREE.HemisphereLight(0xdcecff, 0x172236, 0.55);
  scene.add(hemi);

  const spot = new THREE.SpotLight(0xe8f4ff, 2.2, 90, 0.5, 0.35, 1.6);
  spot.position.set(0, 14, 12);
  spot.target.position.set(0, 0, 22);
  spot.castShadow = true;
  scene.add(spot);
  scene.add(spot.target);

  const stoneMeshes = new Map();
  const aimGroup = new THREE.Group();
  const aimLineMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
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
    const focusX = movingStone ? movingStone.x * 0.28 : pose.target[0];
    const desired = new THREE.Vector3(
      pose.position[0] + (state.cameraMode === 'follow' && movingStone ? movingStone.x * 0.22 : 0),
      pose.position[1],
      pose.position[2] + (state.cameraMode === 'follow' && movingStone ? movingStone.y - 10 : 0),
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
