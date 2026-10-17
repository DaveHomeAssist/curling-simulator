import { COURT, FIXED_STEP, PIT_MATERIAL, REST, SHOE } from './config.js';
import { buildShoePieceSpecs } from './geometry.js';

const IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });

function copyVector(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function copyRotation(rotation) {
  return { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w };
}

function createMaterialCollider(RAPIER, descriptor, material) {
  return descriptor
    .setFriction(material.friction)
    .setRestitution(material.restitution)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
    .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min);
}

export function createPracticePhysics(RAPIER, options = {}) {
  const includeCourt = options.includeCourt ?? true;
  const includeStake = options.includeStake ?? true;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = FIXED_STEP;
  world.numSolverIterations = 8;
  world.numInternalPgsIterations = 2;
  world.maxCcdSubsteps = 4;

  const eventQueue = new RAPIER.EventQueue(true);
  const handles = {
    ground: new Set(),
    pit: new Set(),
    stake: new Set(),
    shoe: new Set(),
  };
  const retained = [];
  const retainShoes = options.retainShoes ?? false;
  let activeRecord;
  let shoeBody;
  let shoeColliders = [];
  let elapsed = 0;
  let quietTime = 0;
  let stakeHit = false;
  let groundContact = false;
  let status = 'ready';
  let previous = {
    position: { x: 0, y: COURT.releaseHeight, z: 0 },
    rotation: IDENTITY,
  };
  let current = structuredClone(previous);

  if (includeCourt) {
    // Separate outside ground from the pit footprint: a full underlying slab
    // can report CCD contacts beneath the pit and falsely mark a fair shoe foul.
    const pitFront = COURT.stakeDistance - COURT.pitLength / 2;
    const pitBack = COURT.stakeDistance + COURT.pitLength / 2;
    const groundRegions = [
      [3.2, (pitFront + 4) / 2, 0, (pitFront - 4) / 2],
      [3.2, (20 - pitBack) / 2, 0, (20 + pitBack) / 2],
      [
        (3.2 - COURT.pitWidth / 2) / 2,
        COURT.pitLength / 2,
        (3.2 + COURT.pitWidth / 2) / 2,
        COURT.stakeDistance,
      ],
      [
        (3.2 - COURT.pitWidth / 2) / 2,
        COURT.pitLength / 2,
        -(3.2 + COURT.pitWidth / 2) / 2,
        COURT.stakeDistance,
      ],
    ];
    for (const [halfX, halfZ, x, z] of groundRegions) {
      const ground = createMaterialCollider(
        RAPIER,
        RAPIER.ColliderDesc.cuboid(halfX, 0.1, halfZ).setTranslation(
          x,
          -0.1,
          z,
        ),
        { friction: 0.72, restitution: 0.035 },
      );
      handles.ground.add(world.createCollider(ground).handle);
    }

    const pit = createMaterialCollider(
      RAPIER,
      RAPIER.ColliderDesc.cuboid(
        COURT.pitWidth / 2,
        0.05,
        COURT.pitLength / 2,
      ).setTranslation(0, COURT.pitTop - 0.05, COURT.stakeDistance),
      PIT_MATERIAL,
    );
    handles.pit.add(world.createCollider(pit).handle);
  }

  if (includeStake) {
    const lean = COURT.stakeLean;
    const stakeBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(
          0,
          COURT.pitTop + (Math.cos(lean) * COURT.stakeHeight) / 2,
          COURT.stakeDistance - (Math.sin(lean) * COURT.stakeHeight) / 2,
        )
        .setRotation({
          x: -Math.sin(lean / 2),
          y: 0,
          z: 0,
          w: Math.cos(lean / 2),
        }),
    );
    const stake = createMaterialCollider(
      RAPIER,
      RAPIER.ColliderDesc.cylinder(COURT.stakeHeight / 2, COURT.stakeRadius),
      { friction: 0.5, restitution: 0.18 },
    ).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    handles.stake.add(world.createCollider(stake, stakeBody).handle);
  }

  function removeShoe() {
    if (shoeBody?.isValid()) world.removeRigidBody(shoeBody);
    shoeBody = undefined;
    shoeColliders = [];
    handles.shoe.clear();
  }

  function spawnShoe(command) {
    if (!retainShoes) removeShoe();
    else {
      shoeBody = undefined;
      shoeColliders = [];
    }
    const bodyDescriptor = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        command.position.x,
        command.position.y,
        command.position.z,
      )
      .setRotation(command.orientation)
      .setLinvel(
        command.linearVelocity.x,
        command.linearVelocity.y,
        command.linearVelocity.z,
      )
      .setAngvel(command.angularVelocity)
      .setLinearDamping(SHOE.linearDamping)
      .setAngularDamping(SHOE.angularDamping)
      .setCcdEnabled(true)
      .setSoftCcdPrediction(0.08)
      .setCanSleep(true)
      .setAdditionalMassProperties(
        SHOE.mass,
        SHOE.centerOfMass,
        SHOE.principalInertia,
        IDENTITY,
      );

    shoeBody = world.createRigidBody(bodyDescriptor);
    shoeBody.setAdditionalSolverIterations(4);
    shoeBody.setAdditionalPgsIterations(2);
    shoeBody.userData = { kind: 'horseshoe' };
    for (const piece of buildShoePieceSpecs()) {
      const colliderDescriptor = createMaterialCollider(
        RAPIER,
        RAPIER.ColliderDesc.cuboid(
          piece.halfExtents.x,
          piece.halfExtents.y,
          piece.halfExtents.z,
        )
          .setTranslation(
            piece.translation.x,
            piece.translation.y,
            piece.translation.z,
          )
          .setRotation(piece.rotation)
          .setMass(0)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        SHOE,
      );
      const collider = world.createCollider(colliderDescriptor, shoeBody);
      shoeColliders.push(collider);
      handles.shoe.add(collider.handle);
    }

    activeRecord = {
      id: command.id ?? retained.length,
      player: command.player ?? 0,
      body: shoeBody,
      colliders: [...shoeColliders],
      foul: false,
      removed: false,
    };
    if (retainShoes) retained.push(activeRecord);
    elapsed = 0;
    quietTime = 0;
    stakeHit = false;
    groundContact = false;
    status = 'flying';
    const transform = readTransform();
    previous = structuredClone(transform);
    current = structuredClone(transform);
    return shoeBody;
  }

  function readTransform() {
    if (!shoeBody?.isValid()) return current;
    return {
      position: copyVector(shoeBody.translation()),
      rotation: copyRotation(shoeBody.rotation()),
    };
  }

  function classifyCollision(first, second, started) {
    if (!started) return;
    if (
      retainShoes &&
      (handles.ground.has(first) || handles.ground.has(second))
    ) {
      for (const record of retained) {
        if (
          !record.removed &&
          record.colliders.some(
            (c) => c.handle === first || c.handle === second,
          )
        )
          record.foul = true;
      }
    }
    const shoeInvolved = handles.shoe.has(first) || handles.shoe.has(second);
    if (!shoeInvolved) return;
    if (handles.stake.has(first) || handles.stake.has(second)) stakeHit = true;
    if (
      handles.ground.has(first) ||
      handles.ground.has(second) ||
      handles.pit.has(first) ||
      handles.pit.has(second)
    )
      groundContact = true;
  }

  function step() {
    if (!shoeBody?.isValid() || status !== 'flying') return;
    previous = structuredClone(current);
    world.step(eventQueue);
    eventQueue.drainCollisionEvents(classifyCollision);
    current = readTransform();
    elapsed += FIXED_STEP;

    const bodies = retainShoes
      ? retained.filter((r) => !r.removed).map((r) => r.body)
      : [shoeBody];
    const linear = shoeBody.linvel();
    const angular = shoeBody.angvel();
    const linearSpeed = Math.hypot(linear.x, linear.y, linear.z);
    const angularSpeed = Math.hypot(angular.x, angular.y, angular.z);
    const quiet = retainShoes
      ? bodies.every((body) => {
          const v = body.linvel(),
            w = body.angvel();
          return (
            Math.hypot(v.x, v.y, v.z) < REST.linearSpeed &&
            Math.hypot(w.x, w.y, w.z) < REST.angularSpeed
          );
        })
      : linearSpeed < REST.linearSpeed && angularSpeed < REST.angularSpeed;
    quietTime = quiet && groundContact ? quietTime + FIXED_STEP : 0;

    const escaped =
      current.position.y < -0.75 ||
      Math.abs(current.position.x) > 4 ||
      current.position.z < -3 ||
      current.position.z > 20;
    if (escaped && !retainShoes) {
      status = 'out';
      shoeBody.sleep();
    } else if (
      bodies.every((body) => body.isSleeping()) ||
      (elapsed >= REST.minimumFlightSeconds &&
        quietTime >= REST.quietSeconds) ||
      elapsed >= REST.timeoutSeconds
    ) {
      shoeBody.sleep();
      current = readTransform();
      previous = structuredClone(current);
      status = 'resting';
      if (retainShoes) {
        for (const record of retained) {
          if (record.removed) continue;
          const position = copyVector(record.body.translation());
          if (
            position.y < -0.75 ||
            Math.abs(position.x) > 4 ||
            position.z < -3 ||
            position.z > 20
          )
            record.foul = true;
          record.body.sleep();
          record.saved = {
            position,
            rotation: copyRotation(record.body.rotation()),
          };
        }
      }
    }
  }

  function retry(transform = previous) {
    if (retainShoes) {
      for (const record of retained)
        if (!record.removed && record.body.isValid())
          world.removeRigidBody(record.body);
      retained.length = 0;
      shoeBody = undefined;
    }
    removeShoe();
    elapsed = 0;
    quietTime = 0;
    stakeHit = false;
    groundContact = false;
    status = 'ready';
    previous = structuredClone(transform);
    current = structuredClone(transform);
  }

  function snapshot() {
    const linear = shoeBody?.isValid()
      ? copyVector(shoeBody.linvel())
      : { x: 0, y: 0, z: 0 };
    const angular = shoeBody?.isValid()
      ? copyVector(shoeBody.angvel())
      : { x: 0, y: 0, z: 0 };
    const centerOfMassPosition = shoeBody?.isValid()
      ? copyVector(shoeBody.worldCom())
      : copyVector(current.position);
    return {
      status,
      elapsed,
      quietTime,
      stakeHit,
      groundContact,
      position: structuredClone(current.position),
      centerOfMassPosition,
      rotation: structuredClone(current.rotation),
      linearVelocity: linear,
      angularVelocity: angular,
      sleeping: shoeBody?.isValid() ? shoeBody.isSleeping() : false,
      mass: shoeBody?.isValid() ? shoeBody.mass() : SHOE.mass,
    };
  }

  return {
    world,
    handles,
    getShoes: () =>
      retained.map((record) => ({
        id: record.id,
        player: record.player,
        foul: record.foul,
        removed: record.removed,
        ...(record.removed
          ? record.saved
          : {
              position: copyVector(record.body.translation()),
              rotation: copyRotation(record.body.rotation()),
            }),
      })),
    removeFouls() {
      for (const record of retained) {
        if (!record.foul || record.removed) continue;
        record.saved = {
          position: copyVector(record.body.translation()),
          rotation: copyRotation(record.body.rotation()),
        };
        for (const collider of record.colliders)
          handles.shoe.delete(collider.handle);
        world.removeRigidBody(record.body);
        record.removed = true;
      }
    },
    spawnShoe,
    retry,
    step,
    snapshot,
    getInterpolationPair: () => ({ previous, current }),
    getShoeBody: () => shoeBody,
    getShoeColliders: () => [...shoeColliders],
    dispose() {
      eventQueue.free();
      world.free();
    },
  };
}
