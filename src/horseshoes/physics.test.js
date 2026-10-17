import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COURT, FIXED_STEP, LAUNCH_PRESETS, SHOE } from './config.js';
import { createFixedStepRunner } from './fixedStep.js';
import { buildShoePieceSpecs, isPointInsideAnyShoePiece } from './geometry.js';
import { createLaunchCommand } from './launch.js';
import { createPracticePhysics } from './physics.js';

const activeSimulations = [];

function track(simulation) {
  activeSimulations.push(simulation);
  return simulation;
}

function runUntilDone(simulation, maxSeconds = 12) {
  const maxSteps = Math.ceil(maxSeconds / FIXED_STEP);
  for (
    let index = 0;
    index < maxSteps && simulation.snapshot().status === 'flying';
    index += 1
  ) {
    simulation.step();
  }
  return simulation.snapshot();
}

beforeAll(async () => {
  await RAPIER.init();
});

afterEach(() => {
  while (activeSimulations.length) activeSimulations.pop().dispose();
});

describe('horseshoes Phase 1 physics', () => {
  it('matches an analytical no-contact flight closely', () => {
    const simulation = track(
      createPracticePhysics(RAPIER, {
        includeCourt: false,
        includeStake: false,
      }),
    );
    const command = createLaunchCommand(LAUNCH_PRESETS.near);
    simulation.spawnShoe(command);
    const initial = simulation.snapshot();
    const steps = 60;
    for (let index = 0; index < steps; index += 1) simulation.step();

    const state = simulation.snapshot();
    const time = steps * FIXED_STEP;
    const expected = {
      x: initial.centerOfMassPosition.x + command.linearVelocity.x * time,
      y:
        initial.centerOfMassPosition.y +
        command.linearVelocity.y * time -
        0.5 * 9.81 * time * time,
      z: initial.centerOfMassPosition.z + command.linearVelocity.z * time,
    };

    expect(state.centerOfMassPosition.x).toBeCloseTo(expected.x, 2);
    expect(state.centerOfMassPosition.y).toBeCloseTo(expected.y, 1);
    expect(state.centerOfMassPosition.z).toBeCloseTo(expected.z, 1);
    expect(state.mass).toBeCloseTo(SHOE.mass, 4);
    expect(
      Math.hypot(
        state.angularVelocity.x,
        state.angularVelocity.y,
        state.angularVelocity.z,
      ),
    ).toBeGreaterThan(4);
    expect(Math.abs(state.rotation.w - command.orientation.w)).toBeGreaterThan(
      0.1,
    );
  });

  it('keeps the U opening empty and admits the stake through the mouth', () => {
    const pieces = buildShoePieceSpecs();
    expect(isPointInsideAnyShoePiece(0, 0.055, pieces)).toBe(false);

    const simulation = track(
      createPracticePhysics(RAPIER, {
        includeCourt: false,
        includeStake: true,
      }),
    );
    simulation.spawnShoe({
      position: { x: 0, y: 0.2, z: COURT.stakeDistance - 0.055 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      controls: {},
    });
    for (let index = 0; index < 8; index += 1) simulation.step();

    expect(simulation.snapshot().stakeHit).toBe(false);
  });

  it('reports a direct rail-to-stake impact without tunneling', () => {
    const simulation = track(createPracticePhysics(RAPIER));
    simulation.spawnShoe(createLaunchCommand(LAUNCH_PRESETS.stake));
    const state = runUntilDone(simulation, 6);

    expect(state.stakeHit).toBe(true);
    expect(state.groundContact).toBe(true);
  });

  it('keeps the repeatable near-miss clear of the stake', () => {
    const simulation = track(createPracticePhysics(RAPIER));
    simulation.spawnShoe(createLaunchCommand(LAUNCH_PRESETS.near));
    const state = runUntilDone(simulation, 6);

    expect(state.stakeHit).toBe(false);
    expect(state.position.x).toBeGreaterThan(0.35);
  });

  it('settles a normal throw on the rigid court', () => {
    const simulation = track(createPracticePhysics(RAPIER));
    simulation.spawnShoe(createLaunchCommand(LAUNCH_PRESETS.center));
    const state = runUntilDone(simulation);

    expect(state.status).toBe('resting');
    expect(state.groundContact).toBe(true);
    expect(state.elapsed).toBeLessThan(REST_TIMEOUT_GUARD);
    expect(state.position.y).toBeGreaterThan(-0.05);
  });

  it('produces the same fixed-step state at 30 and 144 render Hz', () => {
    const runAtRate = (framesPerSecond) => {
      const simulation = track(createPracticePhysics(RAPIER));
      simulation.spawnShoe(createLaunchCommand(LAUNCH_PRESETS.near));
      const runner = createFixedStepRunner(() => simulation.step());
      for (let index = 0; index < framesPerSecond * 2; index += 1)
        runner.advance(1 / framesPerSecond);
      return simulation.snapshot();
    };

    const slowRender = runAtRate(30);
    const fastRender = runAtRate(144);
    expect(slowRender.elapsed).toBeCloseTo(fastRender.elapsed, 10);
    expect(slowRender.position.x).toBeCloseTo(fastRender.position.x, 6);
    expect(slowRender.position.y).toBeCloseTo(fastRender.position.y, 6);
    expect(slowRender.position.z).toBeCloseTo(fastRender.position.z, 6);
    expect(slowRender.rotation.w).toBeCloseTo(fastRender.rotation.w, 6);
  });
});

const REST_TIMEOUT_GUARD = 12.1;

describe('multiple physical shoes', () => {
  it('retains fair bodies and allows later throws to move an earlier shoe', () => {
    const sim = track(createPracticePhysics(RAPIER, { retainShoes: true }));
    sim.spawnShoe({
      ...createLaunchCommand(LAUNCH_PRESETS.center),
      id: 0,
      player: 0,
    });
    runUntilDone(sim);
    const before = sim.getShoes()[0].position;
    for (let id = 1; id < 4; id++) {
      sim.spawnShoe({
        ...createLaunchCommand(LAUNCH_PRESETS.center),
        id,
        player: id < 2 ? 0 : 1,
      });
      runUntilDone(sim);
    }
    expect(sim.getShoes()).toHaveLength(4);
    expect(sim.getShoes()[0].position).not.toEqual(before);
    for (const shoe of sim.getShoes())
      expect(Object.values(shoe.position).every(Number.isFinite)).toBe(true);
    expect(sim.snapshot().status).toBe('resting');
    sim.retry();
    expect(sim.getShoes()).toEqual([]);
  });
  it('latches a foul after outside contact, even when repositioned into the pit, and removes it', () => {
    const sim = track(createPracticePhysics(RAPIER, { retainShoes: true }));
    sim.spawnShoe({
      ...createLaunchCommand({ ...LAUNCH_PRESETS.center, strength: 0 }),
      id: 0,
      player: 0,
    });
    runUntilDone(sim);
    expect(sim.getShoes()[0].foul).toBe(true);
    sim
      .getShoeBody()
      .setTranslation({ x: 0, y: 0.05, z: COURT.stakeDistance }, true);
    expect(sim.getShoes()[0].foul).toBe(true);
    sim.removeFouls();
    expect(sim.getShoes()[0].removed).toBe(true);
    sim.spawnShoe({
      ...createLaunchCommand(LAUNCH_PRESETS.center),
      id: 1,
      player: 0,
    });
    runUntilDone(sim);
    expect(sim.getShoes()).toHaveLength(2);
  });
});

it('does not mark a fair pit landing or a stacked fair landing as outside-ground contact', () => {
  const sim = track(createPracticePhysics(RAPIER, { retainShoes: true }));
  for (let id = 0; id < 2; id++) {
    sim.spawnShoe({
      id,
      player: 0,
      position: { x: 0, y: 0.3, z: COURT.stakeDistance + 0.3 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    });
    runUntilDone(sim);
  }
  expect(sim.getShoes().every((s) => !s.foul)).toBe(true);
  expect(sim.getShoes()[1].position.y).toBeGreaterThan(
    sim.getShoes()[0].position.y,
  );
});
