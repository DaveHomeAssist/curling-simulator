import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARC_PRESETS, COURT, SHOE } from './config.js';
import { buildShoePieceSpecs } from './geometry.js';
import { createLaunchCommand, sampleBallisticPath } from './launch.js';

const CAMERA_POSES = Object.freeze({
  pitching: Object.freeze({
    position: [0, 2.25, -3.15],
    target: [0, 0.35, 11.2],
  }),
  close: Object.freeze({
    position: [2.25, 1.35, 10.05],
    target: [0, 0.18, COURT.stakeDistance],
  }),
});

function makeShoeGroup(color = 0xe8e1d2) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.34,
    metalness: 0.88,
  });
  const edge = new THREE.LineBasicMaterial({
    color: 0x493f35,
    transparent: true,
    opacity: 0.5,
  });

  for (const piece of buildShoePieceSpecs()) {
    const geometry = new THREE.BoxGeometry(
      piece.halfExtents.x * 2,
      piece.halfExtents.y * 2,
      piece.halfExtents.z * 2,
    );
    const mesh = new THREE.Mesh(geometry, metal);
    mesh.position.set(
      piece.translation.x,
      piece.translation.y,
      piece.translation.z,
    );
    mesh.quaternion.set(
      piece.rotation.x,
      piece.rotation.y,
      piece.rotation.z,
      piece.rotation.w,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      edge,
    );
    outline.position.copy(mesh.position);
    outline.quaternion.copy(mesh.quaternion);
    group.add(outline);
  }

  return group;
}

function addCourt(scene) {
  const court = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x192d27, roughness: 0.96 }),
  );
  ground.position.set(0, -0.1, 8);
  ground.receiveShadow = true;
  court.add(ground);

  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 15.8),
    new THREE.MeshStandardMaterial({ color: 0x25483b, roughness: 0.94 }),
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(0, 0.003, 6.15);
  lane.receiveShadow = true;
  court.add(lane);

  const pit = new THREE.Mesh(
    new THREE.BoxGeometry(COURT.pitWidth, 0.1, COURT.pitLength),
    new THREE.MeshStandardMaterial({ color: 0x8b6845, roughness: 1 }),
  );
  pit.position.set(0, COURT.pitTop - 0.05, COURT.stakeDistance);
  pit.receiveShadow = true;
  court.add(pit);

  const pitRake = new THREE.Mesh(
    new THREE.PlaneGeometry(
      COURT.pitWidth * 0.92,
      COURT.pitLength * 0.9,
      14,
      18,
    ),
    new THREE.MeshBasicMaterial({
      color: 0xba9568,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    }),
  );
  pitRake.rotation.x = -Math.PI / 2;
  pitRake.position.set(0, COURT.pitTop + 0.002, COURT.stakeDistance);
  court.add(pitRake);

  const lean = COURT.stakeLean;
  const stake = new THREE.Mesh(
    new THREE.CylinderGeometry(
      COURT.stakeRadius,
      COURT.stakeRadius,
      COURT.stakeHeight,
      18,
    ),
    new THREE.MeshStandardMaterial({
      color: 0xaeb7b7,
      roughness: 0.26,
      metalness: 0.92,
    }),
  );
  stake.position.set(
    0,
    COURT.pitTop + (Math.cos(lean) * COURT.stakeHeight) / 2,
    COURT.stakeDistance - (Math.sin(lean) * COURT.stakeHeight) / 2,
  );
  stake.rotation.x = -lean;
  stake.castShadow = true;
  court.add(stake);

  const throwLine = new THREE.Mesh(
    new THREE.PlaneGeometry(2.65, 0.035),
    new THREE.MeshBasicMaterial({ color: 0xe9bc63 }),
  );
  throwLine.rotation.x = -Math.PI / 2;
  throwLine.position.set(0, 0.012, 0);
  court.add(throwLine);

  for (const offset of [-1, 0, 1]) {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(
        0.058 + Math.abs(offset) * 0.08,
        0.064 + Math.abs(offset) * 0.08,
        40,
      ),
      new THREE.MeshBasicMaterial({
        color: offset === 0 ? 0xd75e47 : 0xf0d09b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(
      0,
      COURT.pitTop + 0.004 + offset * 0.0001,
      COURT.stakeDistance,
    );
    court.add(marker);
  }

  for (const object of [pit, pitRake, stake]) {
    const opposite = object.clone();
    opposite.position.z = COURT.stakeDistance - object.position.z;
    if (object === stake) opposite.rotation.x = lean;
    court.add(opposite);
  }
  scene.add(court);
}

export function createHorseshoeRenderer(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1715);
  scene.fog = new THREE.Fog(0x0c1715, 18, 36);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 80);
  let cameraMode = 'pitching';
  let end = 0;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute(
    'aria-label',
    '3D horseshoes practice court',
  );
  container.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enablePan = false;
  orbit.minDistance = 0.6;
  orbit.maxDistance = 20;
  orbit.maxPolarAngle = Math.PI * 0.49;
  orbit.enableDamping = false;
  renderer.domElement.style.touchAction = 'none';
  addCourt(scene);
  scene.add(new THREE.HemisphereLight(0xd8f4eb, 0x1b241d, 1.9));
  const sun = new THREE.DirectionalLight(0xffe3b0, 3.2);
  sun.position.set(-3.5, 8, -1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  scene.add(sun);

  const shoe = makeShoeGroup();
  scene.add(shoe);
  const matchShoes = new Map();

  const trajectoryMaterial = new THREE.LineDashedMaterial({
    color: 0xffd477,
    dashSize: 0.2,
    gapSize: 0.13,
    transparent: true,
    opacity: 0.82,
  });
  const trajectory = new THREE.Line(
    new THREE.BufferGeometry(),
    trajectoryMaterial,
  );
  scene.add(trajectory);
  let trajectoryKey = '';

  const debugMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
  });
  const debugLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    debugMaterial,
  );
  debugLines.visible = false;
  scene.add(debugLines);
  let diagnostics = false;

  const tempPosition = new THREE.Vector3();
  const previousPosition = new THREE.Vector3();
  const currentPosition = new THREE.Vector3();
  const previousRotation = new THREE.Quaternion();
  const currentRotation = new THREE.Quaternion();

  function applyCamera() {
    const pose = CAMERA_POSES[cameraMode];
    camera.position.fromArray(pose.position);
    orbit.target.fromArray(pose.target);
    if (end) {
      camera.position.x *= -1;
      camera.position.z = COURT.stakeDistance - camera.position.z;
      orbit.target.x *= -1;
      orbit.target.z = COURT.stakeDistance - orbit.target.z;
    }
    camera.lookAt(orbit.target);
    orbit.update();
  }
  applyCamera();

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = Math.max(1, width) / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function updateTrajectory(controls, visible) {
    trajectory.visible = visible;
    if (!visible) {
      trajectoryKey = '';
      return;
    }
    const nextKey = `${controls.aimDeg}|${controls.strength}|${controls.arc}|${controls.style}`;
    if (nextKey === trajectoryKey) return;
    trajectoryKey = nextKey;
    const command = createLaunchCommand(controls);
    const points = sampleBallisticPath(command).map(
      (point) => new THREE.Vector3(point.x, point.y, point.z),
    );
    trajectory.geometry.dispose();
    trajectory.geometry = new THREE.BufferGeometry().setFromPoints(points);
    trajectory.computeLineDistances();
  }

  function updateDebug(world) {
    debugLines.visible = diagnostics && Boolean(world);
    if (!debugLines.visible) return;
    const buffers = world.debugRender();
    debugLines.geometry.dispose();
    debugLines.geometry = new THREE.BufferGeometry();
    debugLines.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(buffers.vertices, 3),
    );
    debugLines.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(buffers.colors, 4),
    );
  }

  function render(pair, alpha, state, controls, world) {
    previousPosition.set(
      pair.previous.position.x,
      pair.previous.position.y,
      pair.previous.position.z,
    );
    currentPosition.set(
      pair.current.position.x,
      pair.current.position.y,
      pair.current.position.z,
    );
    tempPosition.lerpVectors(previousPosition, currentPosition, alpha);
    previousRotation.set(
      pair.previous.rotation.x,
      pair.previous.rotation.y,
      pair.previous.rotation.z,
      pair.previous.rotation.w,
    );
    currentRotation.set(
      pair.current.rotation.x,
      pair.current.rotation.y,
      pair.current.rotation.z,
      pair.current.rotation.w,
    );
    shoe.position.copy(tempPosition);
    shoe.quaternion
      .slerpQuaternions(previousRotation, currentRotation, alpha)
      .normalize();
    shoe.visible = !state.shoes || state.status === 'ready';
    const ids = new Set();
    for (const item of state.shoes || []) {
      if (item.removed) continue;
      ids.add(item.id);
      let mesh = matchShoes.get(item.id);
      if (!mesh) {
        mesh = makeShoeGroup(item.player === 0 ? 0x55b5ff : 0xff9f43);
        matchShoes.set(item.id, mesh);
        scene.add(mesh);
      }
      mesh.position.set(item.position.x, item.position.y, item.position.z);
      mesh.quaternion.set(
        item.rotation.x,
        item.rotation.y,
        item.rotation.z,
        item.rotation.w,
      );
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.material.emissive.set(
            state.counted?.includes(item.id) ? 0x52702a : 0x000000,
          );
          child.material.emissiveIntensity = 0.7;
        }
      });
    }
    for (const [id, mesh] of matchShoes)
      if (!ids.has(id)) {
        scene.remove(mesh);
        mesh.traverse((child) => {
          child.geometry?.dispose();
          child.material?.dispose();
        });
        matchShoes.delete(id);
      }
    updateTrajectory(controls, state.status === 'ready');
    updateDebug(world);
    renderer.render(scene, camera);
  }

  return {
    kind: 'three',
    setEnd(value) {
      end = value;
      scene.rotation.y = end ? Math.PI : 0;
      scene.position.z = end ? COURT.stakeDistance : 0;
      applyCamera();
    },
    getCamera: () => ({
      position: camera.position.toArray(),
      target: orbit.target.toArray(),
    }),
    resize,
    render,
    setCameraMode(mode) {
      cameraMode = mode in CAMERA_POSES ? mode : 'pitching';
      applyCamera();
    },
    getCameraMode: () => cameraMode,
    setDiagnostics(enabled) {
      diagnostics = Boolean(enabled);
      debugLines.visible = diagnostics;
    },
    getDiagnostics: () => diagnostics,
    dispose() {
      orbit.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
