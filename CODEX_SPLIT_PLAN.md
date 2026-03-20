# Curling Simulator — Claude Code + Codex Work Split

**Principle:** Claude Code handles architecture, integration, and anything requiring cross-file reasoning or design judgment. Codex handles isolated, well-specified units with clear inputs/outputs and a test contract.

---

## How Codex Works Best

Codex operates in a sandboxed environment per task. It:
- Gets a branch, a prompt, and a file scope
- Can read/write files and run tests
- Cannot browse the web or ask clarifying questions
- Works best with: pure functions, clear specs, test files to validate against
- Struggles with: multi-file integration, subjective design, UI layout decisions

**Rule:** Every Codex task gets a spec file and at least one test file. If it can't be tested, it stays with Claude Code.

---

## Phase 0 — Stabilize (Claude Code only)

All 8 bug fixes stay with Claude Code. They require reading the full 900-line file, understanding the physics model, and making surgical edits across interleaved concerns. Not parallelizable.

---

## Phase 1 — Extract and Modularize

### Claude Code: Architecture + Scaffold

1. Create the directory structure:
   ```
   src/physics/  src/game/  src/render/
   ```
2. Write `src/main.js` — the wiring file that imports all modules and boots the game
3. Set up `vite.config.js` and `package.json`
4. Write the module interface contracts (what each module exports)
5. Extract `src/render/renderer2d.js` and `src/render/ui.js` (DOM-coupled, needs judgment)
6. Extract `src/game/state.js` and `src/game/loop.js` (integration logic)
7. Write deterministic test harnesses for each physics module
8. Create shared test helpers:
   ```
   src/test/buildStone.js
   src/test/fixtures.js
   src/test/approx.js
   ```

### Codex: Pure Physics Extraction (5 parallel tasks)

Each task gets: the original monolith as reference, a target file path, an export contract, and a test file.

**Task C1-1: `src/physics/constants.js`**
```
Prompt: Extract all physics constants (PHYSICS object) and sheet dimensions
(SHEET object) from the reference file into a standalone ES module.
Export both as named exports. Freeze both objects.
Run: npx vitest run src/physics/constants.test.js
```

**Task C1-2: `src/physics/stone.js`**
```
Prompt: Extract createStone() and stepPhysics() into a standalone ES module.
Import { PHYSICS } from ./constants.js. No DOM, canvas, window, or global state.
createStone(x0, v0, omega0, team, idx) returns a new stone object.
stepPhysics(stone, dt, sweeping) mutates the provided stone in place and returns
the same object for chaining.
Run: npx vitest run src/physics/stone.test.js
```

**Task C1-3: `src/physics/collision.js`**
```
Prompt: Extract collision detection into a standalone ES module.
Export checkCollisions(moving, allStones) and resolveChain(allStones).
Import { PHYSICS } from ./constants.js.
Both functions mutate the passed stone objects in place and must not reorder
the allStones array.
checkCollisions(moving, allStones) resolves all direct contacts involving the
moving stone using coefficient of restitution 0.92 and returns an array of
collision event objects describing each resolved contact.
resolveChain(allStones) repeats collision resolution until no new contacts are
found or 10 iterations have completed, then returns the total collision event
array for that pass.
Run: npx vitest run src/physics/collision.test.js
```

**Task C1-4: `src/physics/trajectory.js`**
```
Prompt: Create a standalone ES module that exports simulateTrajectory(initialStone,
stones, options = {}). Import { PHYSICS, SHEET } from ./constants.js and reuse
createStone/stepPhysics/checkCollisions/resolveChain via explicit imports.
No DOM, canvas, window, or global state.
simulateTrajectory must deep-clone its stone inputs, run the physics loop until
all stones are at rest or a max simulated time cap is reached, and return:
{ stones, trajectory, releasedStoneId, elapsedTime }.
trajectory is an array of sampled { x, y, vx, vy, t } points for the delivered
stone only. The input arrays and stone objects must remain unchanged.
Run: npx vitest run src/physics/trajectory.test.js
```

**Task C1-5: `src/physics/scoring.js`**
```
Prompt: Extract scoring logic into a standalone ES module.
Export calcScore(stones) that returns { team, points }.
Export isInPlay(stone) that checks hog line and back line bounds.
Export distToTee(stone) helper.
Import { SHEET, PHYSICS } from ./constants.js.
Run: npx vitest run src/physics/scoring.test.js
```

### Claude Code: Integration

After Codex tasks merge, Claude Code:
- Wires all modules into `main.js`
- Verifies the game plays identically to the monolith
- Fixes any interface mismatches

---

## Phase 2 — Three.js 3D Renderer

### Claude Code: Scene Architecture + Camera

1. Set up Three.js scene, renderer, lighting rig
2. Build camera system (delivery, follow, house, broadcast modes)
3. Write the `renderer3d.js` interface that mirrors `renderer2d.js`
4. Wire camera transitions and mode switching
5. Ice surface shader (Fresnel, pebble normal map, swept path)

### Codex: 3D Asset Generation (3 parallel tasks)

**Task C2-1: `src/render/models/sheet.js`**
```
Prompt: Create a Three.js function buildSheet(THREE) that returns a Group
containing: ice plane (50m x 5m, MeshStandardMaterial), hog lines (red),
tee line (blue), back line (blue), centre line (dashed), four concentric
house rings at radii [0.15, 0.61, 1.22, 1.83] from tee position,
side boards (wood material), hack blocks.
All dimensions from SHEET constants (provided).
Export as ES module.
```

**Task C2-2: `src/render/models/stone.js`**
```
Prompt: Create a Three.js function buildStone(THREE, team, number) that
returns a Mesh of a curling stone. Use lathe geometry with this cross-section
profile: flat bottom with recessed running band (r=0.065m), curved body
(r=0.1455m, h=0.114m), concave top, handle (torus + cylinder).
Team 'red' = red granite material, team 'yel' = yellow granite material.
Number rendered as texture on top face.
Export as ES module.
```

**Task C2-3: `src/render/models/arena.js`**
```
Prompt: Create a Three.js function buildArena(THREE) that returns a Group
containing a low-poly arena shell: stands (stepped boxes), roof beams,
overhead lights (point lights), scoreboard placeholder (plane with texture slot).
Cosmetic only — no physics interaction.
Dark/moody lighting atmosphere, Olympic venue feel.
Export as ES module.
```

### Claude Code: Integration

- Import models, place in scene
- Sync stone mesh positions to physics state each frame
- Test camera modes
- Verify 2D fallback still works

---

## Phase 3 — Controls Rework

### Claude Code: All

This is integration-heavy and UX-sensitive. Camera, raycasting, power meter, and delivery feel all require iteration in-context. Not suitable for Codex.

---

## Phase 4 — AI Opponent

### Claude Code: Strategy Layer + Integration

1. Design shot type taxonomy (draw, guard, takeout, peel, freeze, hit-and-roll)
2. Build strategy layer — situation evaluation, shot selection
3. Wire AI into game state machine (AI turn → deliberation delay → delivery)
4. Difficulty tier system (error injection)
5. Write test scenarios for strategy layer

### Codex: Shot Evaluator (2 parallel tasks)

**Task C4-1: `src/ai/evaluator.js`**
```
Prompt: Create a shot evaluator module. Export evaluateShot(stones, aimX,
velocity, spin, team) that runs simulateTrajectory (imported from physics/trajectory.js)
and returns a score object:
{ value: number, type: string, finalPos: {x,y}, stonesRemoved: number,
  ownStonesRemoved: number, teamStonesInHouse: number }.
This function must be pure with respect to its inputs: do not mutate the passed
stones array or any of its stone objects.
Scoring heuristic:
- +100 per own stone closer to tee than any opponent stone
- +50 per opponent stone removed from play
- -30 per own stone removed from play
- +200 bonus if final position is within 0.61m of tee (4-foot)
- -100 if stone doesn't cross hog line
Run: npx vitest run src/ai/evaluator.test.js
```

**Task C4-2: `src/ai/shotSearch.js`**
```
Prompt: Create a shot search module. Export findBestShot(stones, team,
difficulty) that samples N aim positions across the sheet width at M weight
levels and both spin directions, evaluates each with evaluateShot(), adds
Gaussian noise based on difficulty, and returns the best { aimX, velocity,
spin, expectedScore, shotType }.
Difficulty maps: 'club' = ±0.3m/±15%, 'regional' = ±0.15m/±8%,
'national' = ±0.06m/±3%, 'olympic' = ±0.02m/±1%.
N=20 for club, N=40 for olympic. M=5 weight levels always.
Do not mutate the passed stones array.
Run: npx vitest run src/ai/shotSearch.test.js
```

---

## Phase 5 — Audio

### Claude Code: Audio Engine + Integration

1. Build audio manager (Web Audio API context, gain nodes, master volume)
2. Procedural sound generators (stone rumble, sweep brush)
3. Trigger system — hook audio to physics events (collision impulse, velocity, sweep state)

### Codex: Procedural Sound Functions (2 parallel tasks)

**Task C5-1: `src/audio/generators.js`**
```
Prompt: Create Web Audio API procedural sound generators. Export:
- createRumble(audioCtx, velocity) — low-frequency oscillator (60-120Hz),
  gain proportional to velocity, returns { node, start(), stop() }
- createScrape(audioCtx, velocity) — filtered white noise (2000-6000Hz bandpass),
  gain proportional to velocity, returns { node, start(), stop() }
- createImpact(audioCtx, impulse) — short burst, brown noise through
  low-pass filter, attack 0.005s, decay 0.3s, volume proportional to impulse,
  returns { node, start(), stop() }
In all cases, node is the final AudioNode to connect to the destination.
Run: test file verifies functions return objects with expected interface.
```

**Task C5-2: `src/audio/samples.js`**
```
Prompt: Create an audio sample loader. Export loadSamples(audioCtx, basePath)
that loads .mp3 files from basePath: crowd-ambient.mp3, crowd-cheer.mp3,
crowd-groan.mp3, skip-hard.mp3, skip-whoa.mp3.
Returns a Map of AudioBuffer objects keyed by filename (without extension).
Export playSample(audioCtx, buffer, volume) that creates a BufferSourceNode
and plays it once.
Handle fetch failures gracefully (warn, return empty buffer).
Run: test with mock fetch.
```

---

## Phase 6 — Visual Polish

### Claude Code: All

Particle systems, post-processing, ice shader, and trail decals are tightly coupled to the Three.js scene and require visual iteration. Not suitable for isolated Codex tasks.

---

## Phase 7 — Game Modes

### Claude Code: State Machine + UI

1. Game mode selector (exhibition, tournament, practice, challenge)
2. Tournament bracket logic
3. Challenge mode level definitions

### Codex: Challenge Definitions (1 task)

**Task C7-1: `src/game/challenges.js`**
```
Prompt: Create a challenge mode definition module. Export CHALLENGES as an
array of 20 challenge objects, each with:
{ id, name, description, setupStones: [{x, y, team}], target: {x, y, radius},
  shotType: 'draw'|'takeout'|'guard'|'freeze', par: number, gold/silver/bronze
  thresholds as distances in metres }.
Cover: 5 draw challenges, 5 takeout, 3 guard, 3 freeze, 2 hit-and-roll,
2 peel. Increasing difficulty.
All coordinates use sheet dimensions: hack at y=0, tee at y=23.47.
Run: npx vitest run src/game/challenges.test.js
```

---

## Phase 8 — Multiplayer

### Claude Code: All

WebRTC signaling, PeerJS integration, state reconciliation, and connection UI are integration-heavy with error handling edge cases. Not suitable for Codex.

---

## Summary: Work Distribution

| Phase | Claude Code | Codex Tasks | Codex Parallelism |
|-------|-------------|-------------|-------------------|
| **0** | 8 bug fixes | — | — |
| **1** | Architecture + integration | 5 physics extractions | 5 parallel |
| **2** | Scene + camera + shader | 3 model builders | 3 parallel |
| **3** | All (controls) | — | — |
| **4** | Strategy + integration | 2 AI modules | 2 parallel |
| **5** | Audio engine + integration | 2 sound modules | 2 parallel |
| **6** | All (polish) | — | — |
| **7** | State machine + UI | 1 challenge defs | 1 |
| **8** | All (multiplayer) | — | — |

**Totals:** Claude Code handles ~65% of work (architecture, integration, UX). Codex handles ~35% as isolated, testable units (13 tasks, max 5 parallel).

---

## Codex Task Template

Every Codex task follows this format:

```
Branch: codex/curling-{phase}-{task-id}
Base: main

Files to create:
- src/{path}/{file}.js
- src/{path}/{file}.test.js

Reference files (read-only):
- src/physics/constants.js

Prompt:
[Exact prompt from above]

Interface contract:
- Exact named exports
- Allowed imports
- Whether functions are pure or mutate passed objects
- Whether arrays/collections may be reordered
- Exact return shape

Test helpers available:
- src/test/buildStone.js
- src/test/fixtures.js
- src/test/approx.js

Validation:
npx vitest run src/{path}/{file}.test.js

Merge criteria:
- All tests pass
- No lint errors
- No imports from DOM, canvas, or window
- Exports match the specified interface
- Pure tasks do not mutate inputs
- Mutating tasks only mutate the objects explicitly allowed by the contract
```

---

## Test File Responsibility

**Claude Code writes all test files before Codex tasks launch.** This is critical — Codex validates against tests, not against vibes. If the test file is wrong, Codex will produce wrong code confidently.

Test files live next to their source:
```
src/physics/constants.test.js    ← Claude Code writes
src/physics/stone.test.js        ← Claude Code writes
src/physics/collision.test.js    ← Claude Code writes
src/physics/trajectory.test.js   ← Claude Code writes
src/physics/scoring.test.js      ← Claude Code writes
src/ai/evaluator.test.js         ← Claude Code writes
src/ai/shotSearch.test.js        ← Claude Code writes
src/audio/generators.test.js     ← Claude Code writes
src/audio/samples.test.js        ← Claude Code writes
src/game/challenges.test.js      ← Claude Code writes
```

**10 Codex-facing test files total.** Written by Claude Code, run by Codex.
