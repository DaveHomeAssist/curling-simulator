# Curling Simulator — 2D → 3D Upgrade Path

**Current state:** Single-file 2D canvas sim, ~900 lines, real physics (pivot-slide curl model), basic game loop
**Goal:** Full 3D browser game with camera system, AI opponent, audio, and visual polish
**Constraint:** Zero-backend, static deploy (GitHub Pages or Vercel)

---

## Phase 0 — Stabilize the 2D Engine (pre-requisite)
**Effort:** 1 session | **Risk:** Low

Fix the bugs in the current sim before migrating anything:

| Fix | Detail |
|-----|--------|
| UTF-8 mojibake | Replace all corrupted characters with proper entities/Unicode |
| Hog line violation | Remove stones that don't cross far hog line |
| Chain collisions | Run collision resolver in a loop until no new contacts per substep |
| Preview/physics divergence | Unify trajectory preview and stepPhysics to use same curl decay model |
| DOM thrash | Cache end pips, only rebuild on end change — not every frame |
| Pebble texture | Render once to offscreen canvas, blit per frame |
| Guard preset | Add missing button for guard weight (200–230) |
| Alert → modal | Replace `alert()` rules popup with in-page modal |

**Deliverable:** Clean, bug-free 2D sim as the stable reference implementation.

---

## Phase 1 — Extract and Modularize
**Effort:** 1–2 sessions | **Risk:** Low

Split the monolith into importable modules. This is the seam extraction that makes 3D migration possible without rewriting physics.

```
curling-simulator/
├── index.html              ← thin shell, mounts the game
├── src/
│   ├── physics/
│   │   ├── constants.js    ← PHYSICS, SHEET dimensions (pure data)
│   │   ├── stone.js        ← createStone(), stepPhysics()
│   │   ├── collision.js    ← checkCollisions(), resolveChain()
│   │   ├── trajectory.js   ← simulateTrajectory() (preview)
│   │   └── scoring.js      ← calcScore(), hog violation check
│   ├── game/
│   │   ├── state.js        ← game state machine (aim → travel → result)
│   │   ├── loop.js         ← requestAnimationFrame loop, fixed timestep
│   │   └── input.js        ← mouse, keyboard, touch handlers
│   ├── render/
│   │   ├── renderer2d.js   ← current canvas draw functions (kept as fallback)
│   │   └── ui.js           ← DOM panel updates, score display
│   └── main.js             ← wires modules, boots game
├── assets/                 ← textures, models (Phase 2+)
└── vite.config.js          ← Vite for dev server + HMR
```

**Key rule:** Physics modules have zero DOM or rendering imports. They operate on plain objects and return plain objects. This makes them renderer-agnostic — the same `stepPhysics()` drives both 2D canvas and 3D WebGL.

**Deliverable:** Identical gameplay, now modular. `npm run dev` works.

---

## Phase 2 — Three.js 3D Renderer
**Effort:** 3–5 sessions | **Risk:** Medium

Replace `renderer2d.js` with a Three.js scene while keeping the physics engine untouched.

### 2A — Scene Setup

| Component | Implementation |
|-----------|---------------|
| **Ice sheet** | Plane geometry + PBR material with ice normal map, subtle blue tint, reflectivity ~0.3 |
| **Sheet markings** | Decal textures or separate thin planes for hog lines, tee line, rings, centre line |
| **House rings** | Concentric ring meshes with team colors, slight emissive glow on scoring team |
| **Side boards** | Box geometries, wood PBR material |
| **Arena** | Skybox or low-poly arena shell (stands, roof beams, scoreboard) — cosmetic only |
| **Lighting** | 3-point: overhead area light (arena floods), rim light (dramatic), ambient fill |

### 2B — Stone Model

Option A: Procedural geometry (lathe a granite cross-section profile)
Option B: Import a .glb model (Blender → export, ~5KB)

Either way:
- Running band visible as a recessed ring on the bottom
- Handle on top (torus + cylinder)
- Team color as material tint (red granite / yellow granite)
- Number decal on top face
- Physics position drives `mesh.position.set(sx, 0, sy)` every frame

### 2C — Camera System

| Mode | Behavior |
|------|----------|
| **Delivery cam** | Behind hack, slightly elevated (8°), looking upsheet. Mouse controls lateral aim by raycasting onto ice plane |
| **Follow cam** | Lerps behind the moving stone, smooth damping. Slight orbit allowed via drag |
| **House cam** | Top-down orthographic view of the house after delivery. Toggle with `H` key |
| **Broadcast cam** | High angle from side boards, cinematic. Auto-activates during collisions |
| **Free cam** | OrbitControls for debug. Toggle with `F` key |

Camera transitions use smooth lerp (0.05–0.08 per frame).

### 2D — Rendering Bridge

```js
// render/renderer3d.js
export function init(container) { /* Three.js scene, camera, renderer */ }
export function updateStones(stones, currentStone) { /* sync mesh positions */ }
export function updateAimLine(aimX, trajectory) { /* dashed line + ghost stone */ }
export function updateSweep(stone, sweeping) { /* brush particles */ }
export function render() { /* renderer.render(scene, camera) */ }
```

The game loop calls the same interface whether 2D or 3D. A `RENDERER` flag switches between them for development/fallback.

**Deliverable:** Playable 3D curling with the same physics. 2D fallback still works.

---

## Phase 3 — Controls Rework for 3D
**Effort:** 2 sessions | **Risk:** Medium

### 3A — Delivery Mechanic

Replace click-to-throw with a 3-step delivery:

1. **Aim** — Move mouse/touch to position broom on ice. Raycast from camera through cursor onto ice plane. Broom model follows. Trajectory preview renders as dashed line on ice surface.

2. **Power** — Hold mouse/touch, power meter fills (maps to velocity). Release to set power. Visual: radial gauge near hack, or a slide-back-and-release gesture.

3. **Release** — Stone slides out of hack along aim vector. Player can apply last-moment rotation adjustment (drag left/right during first 0.5s of travel).

### 3B — Sweep Control

- **Desktop:** Hold `Space` — camera switches to follow cam, brush particles appear in front of stone, friction/curl reductions apply
- **Mobile:** Hold a "SWEEP" button that appears during travel phase
- Visual feedback: ice surface shader brightens where swept (temporary texture blend)

### 3C — Touch / Mobile

| Gesture | Action |
|---------|--------|
| Drag on ice | Aim broom position |
| Tap + hold | Power meter |
| Release | Throw |
| Two-finger drag | Orbit camera |
| Pinch | Zoom |

### 3D — Gamepad (optional, stretch)

Left stick = aim, right trigger = power, A = throw, B = sweep.

**Deliverable:** Satisfying delivery feel. Mouse, touch, and keyboard all work.

---

## Phase 4 — AI Opponent
**Effort:** 2–3 sessions | **Risk:** Medium-High

### 4A — Shot Evaluation

The AI needs to evaluate board positions. Score each possible shot by simulating trajectories at different aim points and weights:

```js
function evaluateShot(stones, aimX, weight, spin) {
  const result = simulateTrajectory(aimX, weight, spin);
  // Score based on:
  // - Final position relative to tee (closer = better for draws)
  // - Opponent stones removed (for takeouts)
  // - Guard protection (for guards)
  // - Risk of giving up steals
  return { score, type }; // type: draw, guard, takeout, peel, freeze
}
```

### 4B — Strategy Layer

| Situation | AI preference |
|-----------|---------------|
| No stones in play | Draw to button or corner guard |
| Opponent has shot stone | Takeout or freeze |
| Team has shot stone | Guard it |
| Last stone advantage | Draw for 2+ |
| Behind by 3+ | Aggressive takeouts, try to force extras |
| Ahead late | Peel guards, keep house clean |

### 4C — Difficulty Levels

| Level | Aim error | Weight error | Strategy depth |
|-------|-----------|--------------|----------------|
| **Club** | ±0.3m | ±15% | Greedy (best immediate shot) |
| **Regional** | ±0.15m | ±8% | 2-stone lookahead |
| **National** | ±0.06m | ±3% | Full end strategy |
| **Olympic** | ±0.02m | ±1% | Multi-end game theory |

Error is applied as Gaussian noise to aimX and velocity at delivery time.

### 4D — AI Animation

AI "thinks" for 1–2 seconds (fake deliberation), then delivers. Camera shows the AI's broom placement, then follows the stone. Player can skip with `Space`.

**Deliverable:** Single-player vs AI at selectable difficulty.

---

## Phase 5 — Audio
**Effort:** 1–2 sessions | **Risk:** Low

All audio via Web Audio API — no external libraries.

| Sound | Source | Trigger |
|-------|--------|---------|
| Stone on ice | Low rumble + high scrape, pitch tied to velocity | During travel |
| Collision | Sharp granite crack, volume tied to impulse magnitude | On collision |
| Sweep | Rhythmic brush strokes, tempo tied to sweep effort | While sweeping |
| Crowd murmur | Low ambient loop | Always (fades during delivery) |
| Crowd reaction | Cheer/groan, triggered by scoring result | End of end |
| Button hit | Satisfying "thunk" + crowd gasp | Stone stops on button |
| UI clicks | Subtle tick | Button presses |
| Skip call | "HARD!" / "WHOA!" voice clips | During sweep (optional) |

Generate procedural sounds where possible (oscillators + filters for rumble/scrape). Use small .mp3/.ogg files for crowd and collision impacts (~50KB total).

**Deliverable:** Immersive audio that responds to physics state.

---

## Phase 6 — Visual Polish
**Effort:** 2–3 sessions | **Risk:** Low

### 6A — Particles

| Effect | Implementation |
|--------|---------------|
| Ice spray from sweep | Billboard particle emitter, white/blue, velocity-aligned |
| Stone wake on ice | Fading trail decal on ice surface |
| Collision sparks | Small burst at contact point, granite-colored |
| Snow/frost ambient | Slow-falling particles in arena, cosmetic |

### 6B — Post-Processing

- Subtle bloom on house ring colors
- Depth of field (shallow) during delivery cam
- Screen-space reflections on ice surface
- Vignette during dramatic moments (last stone of end)

### 6C — Ice Surface Shader

Custom shader for the ice plane:
- Fresnel reflections (more reflective at glancing angles)
- Pebble normal map with wear parameter (smooths over game)
- Swept path appears as lighter/smoother band (temporary texture modification)
- Subtle subsurface scattering tint

### 6D — Scoreboard

3D scoreboard model in the arena showing:
- End-by-end scores
- Current end / stone
- Team names
- Hammer indicator

### 6E — Stone Trail

Replace 2D dashed line with a fading decal projected onto ice surface. Shows the actual curl path. Fades over 10 seconds.

**Deliverable:** Visually competitive with casual 3D sports games.

---

## Phase 7 — Game Modes & Progression
**Effort:** 2–3 sessions | **Risk:** Low

| Mode | Description |
|------|-------------|
| **Exhibition** | Single game vs AI, choose difficulty + team |
| **Tournament** | Bracket of 4/8 AI teams, best-of-3 |
| **Practice** | Unlimited stones, no scoring, free placement of target stones |
| **Shot Challenge** | "Make this draw" / "Hit and roll to here" — graded precision |
| **Multiplayer (local)** | Pass-and-play, same device |

### Progression (optional)

- Shot accuracy stats tracked in localStorage
- "Personal best" for challenge mode shots
- Unlock arena skins (outdoor lake, club rink, Olympic venue)

---

## Phase 8 — Multiplayer (stretch goal)
**Effort:** 3–5 sessions | **Risk:** High

### 8A — WebRTC P2P

No server needed. Use WebRTC data channels for peer-to-peer:
- Share delivery parameters (aimX, velocity, spin) — not physics state
- Each client runs identical physics locally (deterministic)
- Reconcile on end scoring

### 8B — Signaling

Use a free signaling service (e.g., PeerJS cloud, or a simple Cloudflare Worker) for connection setup only. Game data flows P2P after handshake.

### 8C — Lobby

Simple room code system: host generates 4-character code, opponent enters it. No accounts, no auth.

**Deliverable:** 1v1 online play with ~50ms latency tolerance (turn-based, so latency is non-critical).

---

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Renderer** | Three.js | Industry standard, huge ecosystem, good perf on mobile |
| **Physics** | Custom (keep current) | Already tuned to published curling research; no general-purpose engine needed |
| **Build** | Vite | Fast HMR, native ESM, zero config |
| **Audio** | Web Audio API | No deps, procedural generation support |
| **Multiplayer** | PeerJS / WebRTC | Zero-backend, P2P |
| **State** | Plain JS objects | No framework needed — game state is simple |
| **Deploy** | GitHub Pages | Free, static, matches zero-backend rule |

**No React.** This is a game, not an app. The DOM panel (weight slider, score display) stays as vanilla JS. The 3D viewport is a Three.js canvas. Mixing React with a 60fps game loop creates unnecessary overhead.

---

## Milestone Summary

| Phase | Milestone | Cumulative Effort |
|-------|-----------|-------------------|
| 0 | Bug-free 2D sim | 1 session |
| 1 | Modular codebase | 2–3 sessions |
| 2 | 3D renderer + scene | 5–8 sessions |
| 3 | 3D controls + delivery feel | 7–10 sessions |
| 4 | AI opponent | 9–13 sessions |
| 5 | Audio | 10–15 sessions |
| 6 | Visual polish | 12–18 sessions |
| 7 | Game modes | 14–21 sessions |
| 8 | Online multiplayer | 17–26 sessions |

Each phase is independently shippable. Phase 2 alone (3D renderer) transforms the game. Phase 4 (AI) makes it a complete single-player experience. Everything after that is polish and features.

---

## Critical Design Decisions

1. **Keep physics engine as-is.** The pivot-slide curl model, WCF constants, and Nyberg sweep data are the sim's competitive advantage. Don't replace with a generic physics engine — it won't model curling correctly.

2. **Renderer-agnostic game loop.** The physics/game layer never imports Three.js. A `Renderer` interface abstracts the visual layer. This means the 2D canvas version can always be maintained as a lightweight fallback.

3. **No framework for the game itself.** React/Vue add latency to the render loop. Use vanilla JS for the game, Vite for bundling. The DOM panel is simple enough to update directly.

4. **Ship each phase.** Don't wait for Phase 6 to deploy. Phase 0 is deployable today. Phase 2 is a dramatic visual upgrade. Each phase has a clear "done" state.
