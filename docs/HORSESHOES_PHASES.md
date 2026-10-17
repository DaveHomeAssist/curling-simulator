> Historical planning record recovered from the original development conversation. Phase 1 instructions below applied to its initial delivery only. The current October 16–17 instruction authorizes Phase 2 implementation and the repository merge/deployment workflow; see HORSESHOES_PHASE2_BRIEF.md.

# Horseshoes Simulator: Three-Phase Prototype Plan and Execution Prompts
**Prepared:** October 15, 2026
**Goal:** a fun, playable browser horseshoes game built from the existing Curling Simulator infrastructure. Prioritize satisfying throwing, believable open-shoe contacts and understandable scoring. This is a prototype, not a scientific validation project.

**Repository:** https://github.com/DaveHomeAssist/curling-simulator
**Research baseline:** commit `3c8eab6eed06291e2142d89ce4dac232dbf3c188`; inspect the actual current checkout before implementation.
**Source:** Horseshoes-Research-and-Implementation-Spec-2026-10-15.md, produced earlier in this session. The research findings are historical inputs, not proof of current code or package availability.

## Keep the scope small

Use Three.js, vanilla JavaScript, Vite and Vitest. Add Rapier 3D if its actual published package initializes correctly. Preserve the original curling game. Build horseshoes behind a separate local entry or mode with its own state and storage key.

Keep these fundamentals: an open collision shape, real 3D rotation, gravity, fixed stepping, stake and shoe contacts, and scoring from the resting arrangement. Approximate the pit with a high-friction, low-bounce rigid surface. Tune by playing and obvious behavioral checks.

Defer phone-video calibration, measured inertia studies, deformable soil, stake compliance, wind, elaborate tournaments, online multiplayer, many shoe models and a custom physics engine. Do not require 10,000 collision cases, broad device certification or bitwise cross-browser determinism to finish this prototype. Never claim those deferred items were validated.

Use reasonable defaults without an interview. A missing measurement does not block the prototype: mark the relevant geometry/material value provisional and keep going. A broken collision system does block a completion claim.

## Three phases

| Phase | Usable result | Work | Completion gate |
| --- | --- | --- | --- |
| 1. Throw Something | A playable single-shoe practice court | Open shoe, stake, flight, flip/turn presets, aim, strength, arc, retry, camera | Human can repeatedly throw; hits deflect and misses miss; open mouth works; no common tunneling or obvious instability |
| 2. Play a Game | Local two-player horseshoes | Four shoes, two per player, cancellation scoring, innings, match to 21, restart, close-up inspection | Entire match works; final poses determine points; cancelled shoes remain obstacles until inning ends |
| 3. Make It Fun | Solo opponent and a more satisfying finish | Small simulation-backed AI search, impact audio, useful feedback, touch polish, best-shot replay | Opponent throws through same physics; controls remain responsive; phone layout works; no major regressions |

**Priority:** finish Phase 1 as a playable build before spending time on AI, fancy art or expanded realism. Phase 2 is the minimum complete game. Phase 3 should improve the game, not become another engine project.

## Execution rules for all phases

1. Inspect the current repository, `AGENTS.md`, available scripts and existing work before editing. Keep unrelated changes intact.
2. Use a local feature branch or isolated worktree. Do not merge into or push to `main`: the audited workflow deploys on pushes to main. Do not deploy or publish without a separate instruction.
3. Retain the current curling entry and behavior. Prefer a small `src/horseshoes/` domain over a broad shared-framework refactor.
4. Use one authoritative simulation for player throws, previews and AI. Renderers only display it.
5. Start at 120 Hz fixed physics with interpolated rendering. Use quaternions from physics rather than visual spin per frame.
6. Ship the smallest coherent feature set. Run focused tests for nontrivial physics/rules behavior, the existing regression suite and production build where available. Use a browser to actually throw and play when available.
7. Fix ordinary failures autonomously. If a requested device or tool is unavailable, state the unverified check precisely and continue useful work.
8. Finish each phase with changed files, actual commands/checks and results, local launch instructions, remaining limitations, and a concise handoff. Do not label unrun checks passed.
9. Do not stop after scaffolding, mock controls or a screenshot. The deliverable is working interaction.

## Phase 1: Throw Something

**Deliverable:** a local browser practice mode where a player can aim, throw, watch a rotating shoe interact with a stake, and retry immediately.

**Reuse:** assembly patterns from `src/main.js`; rendering setup from `src/render/renderer3d.js`; event patterns from `src/game/input.js`; fixed-step structure from `src/game/loop.js`; existing Vite/Vitest tooling.

**Add:** a small horseshoes entry, physics world, shoe definition, launch resolver, practice state, renderer adapter and minimal controls. Suggested paths are responsibilities, not a requirement to create dozens of tiny files. Combine modules where that keeps the prototype readable.

**Defaults:** one ground-level court; 40-foot stake spacing using the research's stated measurement datum; 1-inch diameter inclined stake; one approximately regulation-sized shoe; flip and 1¼-turn styles; no wind; zero random release error. Use a short practice distance if it helps initial control testing. Label shorter practice modes separately from regulation-style court geometry.

**Physics:** use one rigid body with several convex pieces arranged into a U. Preserve the opening. Use plausible approximate COM/inertia and a mass within the equipment limit. Enable appropriate CCD and verify the actual package's behavior. Ground is rigid, absorbent and grippy. No custom soil model.

**Controls:** aim left/right; hold/release strength or a straightforward strength slider; low/normal/high arc; style selector; Throw and Retry. Derive nominal spin from style and flight time to make beginner throws approachable, then freeze the release state. No guidance after release.

**Pass:** actual browser throws; both styles visibly rotate; the shoe can surround the stake through its opening; offset strikes deflect; clear misses do not collide; normal throws do not routinely pass through the stake; rest is stable enough to retry; existing curling still launches; build succeeds.

### Copy-ready execution prompt

```text
Implement Phase 1 of a fun browser horseshoes prototype in:
https://github.com/DaveHomeAssist/curling-simulator

Deliver a working single-shoe practice mode now. This is a playable prototype,
not a calibration research project. Inspect the current checkout and AGENTS.md;
preserve unrelated work and the original curling game. Work on a local feature
branch/worktree. Do not push or merge main, deploy, or publish.

The earlier audit found vanilla JS, Three.js, Vite, Vitest, planar curling physics,
a 120 Hz live loop, a 60 Hz trajectory default, and frame-driven visual spin.
Verify current files yourself. Reuse useful infrastructure, but keep the new
horseshoes domain separate, preferably under src/horseshoes/. Avoid a broad
refactor or rewriting the existing curling physics.

Use an actually available Rapier 3D package. Verify package initialization and
lock the exact installed version. The earlier research's proposed version is
not an instruction to install an unavailable or unsuitable package.

Build:
1. A minimal practice court, rigid ground/pit and inclined stake.
2. One U-shaped shoe made from multiple convex colliders on a single rigid body.
   Its opening must remain open. Use approximate documented dimensions, mass,
   COM/inertia and material settings; mark these provisional.
3. Real gravity, 3D orientation/angular velocity, fixed 120 Hz stepping,
   quaternion render interpolation, suitable CCD and reliable rest detection.
4. Aim, strength, three arc settings, flip/turn preset, Throw and immediate Retry.
   Support mouse, keyboard basics and touch through the same release command.
5. A readable pitching view and an optional close view. Controls must actually
   launch shoes and display their simulated motion.
6. Small diagnostics for collider wireframes and repeatable launch presets.

Use a grippy low-bounce rigid pit. Defer deformable soil, aerodynamic research,
wind, stake vibration, online play, sophisticated assets and large benchmarks.
No magnetic stake, snap-to-ringer or post-release steering. Beginner spin
assistance may resolve initial conditions before launch.

Verify analytic no-contact flight approximately, open-mouth passage, a direct
stake hit, a near miss, basic settling, and the same launch at different render
rates. Play real throws in a browser, check console errors, run focused tests,
existing regression checks and production build when available. If an engine
problem appears, fix the smallest reproducible case; do not spend the phase
comparing four engines.

Finish with a playable local entry, launch instructions, changed files, checks
actually run, limitations, and Phase 2 handoff. If a check is unavailable, state
that rather than claiming it passed. Do not stop at scaffolding or a mockup.
Proceed with sensible defaults without interview gating.
```

## Phase 2: Play a Game

**Depends on:** playable Phase 1. Verify it; fix small defects before layering match rules on top.

**Deliverable:** pass-and-play singles using four physical shoes. Each player pitches two shoes, then the opponent pitches two. Score after the inning settles, clear shoes, reverse ends, and continue.

**Reuse/add:** retain Phase 1 world/input/rendering. Add a match state machine, geometry classification, cancellation scoring, score display, inning inspection and restart. Reuse persistence patterns only if useful; saving is not a gate for this phase.

**Default format:** cancellation, first to at least 21 after a completed inning. Label this as the prototype's casual preset rather than claiming it is the sole NHPA match format. Ringer 3; eligible close shoe within six inches 1; leaner has no bonus. Do not subtract every close shoe's point value from its opponent.

**Boundary policy:** use a virtual straightedge across the shoe's proper heel/tip landmarks; require clearance from the actual inclined stake. Evaluate geometry rather than screenshots. Mark tilted/stacked adjudication as provisional if not reviewed. Fouled shoes remain invalid after bouncing back. Cancelled ringers remain physical obstacles for the rest of the inning.

**Pass:** complete a real match; verify 3, 4 and 6-point examples, ringer cancellation, close-shoe equality, displaced ringers, fouls and restart. No premature scoring on the first apparent catch.

### Copy-ready execution prompt

```text
Implement Phase 2 of the horseshoes prototype in:
https://github.com/DaveHomeAssist/curling-simulator

Continue the existing horseshoes feature branch/worktree. Inspect AGENTS.md,
current source and Phase 1 handoff. Preserve unrelated work and the curling
game. Do not merge/push main or deploy. Verify the practice mode still works;
fix small blocking Phase 1 issues before continuing. If Phase 1 is absent,
implement its playable minimum first rather than creating a fake match screen.

Deliver local two-player pass-and-play:
1. Four real physics shoes, two per player. First player pitches both, then the
   opponent pitches both. Let every shoe settle before the next throw.
2. Inning completion, final arrangement scoring, next inning at the opposite
   end, score history, match completion and Restart.
3. Cancellation scoring: ringer 3; qualifying close shoe within six inches 1;
   leaners have no extra value. Cancel opposing ringers pairwise and apply
   closest-shoe rules correctly. Cancelled ringers remain physical obstacles.
4. A default casual game to at least 21 after the completed inning. Label the
   preset; do not present 21 as the only official format.
5. Ringer classification using proper heel/tip landmarks, encirclement and
   straightedge clearance from the inclined stake. Use final 3D geometry, not
   center distance or the rendered image. Include finite stake height.
6. Track outside-ground/backboard/platform fouls so a bounced-in shoe cannot
   regain points. Remove foul shoes when required before the next delivery;
   preserve displacement of other shoes.
7. Recompute all shoes after later collisions. Provide a close scoring view
   that highlights the counted shoe and the reason for the score.

Keep the rules module separate from rendering and physics contacts. Use the
research report's official-rule references as a starting point; verify any
uncertain rule against the current NHPA source rather than inventing it.
Do not turn this into tournament administration or an exhaustive judge simulator.
Document unresolved unusual tilted/stacked cases as prototype limitations.

Test cancellation, 3/4/6-point examples, equal close shoes, six-inch boundaries,
straightedge contact failing a ringer, invalid bounce-ins, and a displaced ringer.
Play an entire local match in a browser. Check restart, end reversal, console
errors, existing regressions and production build.

Finish with a working match, local launch instructions, actual verification
results, remaining prototype limits and a concise Phase 3 handoff.
Proceed without interview gating. Do not stop at UI scaffolding.
```

## Phase 3: Make It Fun

**Depends on:** playable match and correct common scoring cases.

**Deliverable:** solo play against a modest opponent, satisfying impact feedback and comfortable touch controls.

**Reuse/add:** adapt the existing `src/ai/shotSearch.js` evaluator-injection pattern, `src/audio/manager.js` lifecycle, procedural sound generators and persistence concepts. Add a small candidate planner, contact-to-audio adapter, touch refinements and last-throw playback.

**AI:** generate a small set of launch candidates around useful range/arc/style solutions, simulate them through a cloned copy of the same world, score final states, and choose one. Start with 12–24 candidates and measure. A worker is preferred if main-thread search causes visible stalls. Reduce candidate count before adding complicated planning. Difficulty can change search quality or explicit initial release variation, never collision laws.

**Polish:** distinct stake ring, shoe clack and pit thud; concise short/long/left/right/opening-phase feedback where supported; responsive touch controls; simple last-throw replay from recorded transforms. No need for a cinematic replay editor or a separate 2D physics fallback.

**Pass:** solo match completes; AI plays ordinary launches through identical physics; sound does not chatter at rest; inputs stay responsive; restart/retry/replay do not corrupt the match; the interface works in an actual touch browser if available.

### Copy-ready execution prompt

```text
Implement Phase 3 of the horseshoes prototype in:
https://github.com/DaveHomeAssist/curling-simulator

Inspect the current feature branch, AGENTS.md and phase handoffs. Preserve the
working local match and original curling game. Do not merge/push main or deploy.
Focus on a fun solo game and practical polish, not expanding the research scope.

Build:
1. A modest AI opponent that uses the SAME launch resolver, physics step,
   materials, existing-shoe state and scoring as the human player.
2. Start with about 12–24 candidate throws near useful aim/strength/arc/style
   combinations. Actually simulate candidates in cloned state and choose by
   resulting score/position. Preserve all custom state in the clone. Measure
   search cost; use a worker or smaller budget to keep the interface responsive.
   Do not script ringers or select an outcome before simulating the throw.
3. Easy and normal difficulty through search budget/repertoire or recorded
   pre-release variation. No invisible after-release correction.
4. Distinct procedural stake, shoe and ground impact sounds. Aggregate compound
   contacts and suppress repeated resting
