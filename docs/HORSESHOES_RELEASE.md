# Horseshoes release and next steps

## Phase 1 closure

Mixmash PR155 merged as `2c417b359b5d0b99188909fdd9e78283351a3d90`.
The full postmerge [CI run 38989410478](https://github.com/DaveHomeAssist/mixmash/actions/runs/38989410478) passed, completing October 17 at 01:42:21 UTC. Dedicated Horseshoes checks and Pages also passed. This closes the previously pending full CI check. Live route/assets, controls, normal-time settling and both return links were verified separately. Original Curling and Mixmash homepage were preserved.

## Phase 2

Accepted: local two-player match, two consecutive shoes each, final-arrangement cancellation scoring, innings, end reversal, history and first to 21. See HORSESHOES_PHASE2_BRIEF.md and HORSESHOES_PHASES.md.

Source recovery restores authored Phase 1 modules that previously existed only in the original development record, then applies the released navigation/keyboard fixes and match layer. Source main and the published static bundle have separate delivery gates.

Current state: Phase 2 and its keyboard history correction are published at [Mixmash Horseshoes](https://mixmash.games/horseshoes/). The full premerge and postmerge checks passed for the published revision. Automated release verification is complete as of October 17, 2026.

### Source and publication

- Source [PR2](https://github.com/DaveHomeAssist/curling-simulator/pull/2) merged as `2773cb4a79dea95c8bbd0efd502e31481fc281f4`. Source checks 39001524753 and postmerge tests/build/Pages 39001586506 passed.
- Initial Mixmash [PR156](https://github.com/DaveHomeAssist/mixmash/pull/156) merged as `dfca5e0d1a66eb0343af001ead7ded221257fce6`. Full premerge 39001623424 and postmerge 39003862372 passed, as did dedicated gameplay and Pages.
- Keyboard follow-up [source PR3](https://github.com/DaveHomeAssist/curling-simulator/pull/3) merged as `5a3dba920c5fd59899a6c9d9550b7ebcdbefc611`; source checks 39004180025 and postmerge tests/build/Pages 39004273272 passed.
- Current Mixmash [PR157](https://github.com/DaveHomeAssist/mixmash/pull/157) merged as `5949962515fd81ea16d3670bc022913efbd18374`. Full premerge 39004709635 and dedicated 39004709617 passed for candidate `f37ee6e4b6cf70c6139825a2dee6a8fb0fad68f0`; the merge has the identical tree. Dedicated postmerge 39006810831 passed. [Full postmerge 39006810917](https://github.com/DaveHomeAssist/mixmash/actions/runs/39006810917) passed.
- [Pages 39006810336](https://github.com/DaveHomeAssist/mixmash/actions/runs/39006810336) published the current merge on October 17 at 05:35:43 UTC. Live HTML and all three referenced assets returned 200 with SHA256 matching the packaged build.

### Verified behavior

Verification ran on Dominic using Chromium. All 71 source tests, 456 Mixmash tests and the production build passed. Live smoke completed 84-throw, 21-inning matches at 1440×900, 375×812 and 667×375 with no page errors or failed assets. Scores and bodies were not injected: accelerated checks advance the same Rapier simulation step used in normal play.

Mouse and emulated-touch aim/strength, turn/flip/arc, orbit/pinch/wheel zoom, native keyboard controls, practice presets, immediate retry, both themes, final score/history, end reversal and restart passed. A separate normal-time throw settled in 2.45 seconds and stayed stable. Native Enter activation reached the existing Mixmash homepage and Curling game. Original Curling also completed a live throw. Source inspection confirms no changes to Curling modules or the main Mixmash homepage; Horseshoes remains unlisted with `noindex, nofollow`.

Earlier navigation and focused-control keyboard problems are corrected. A follow-up regression also reproduced Tab skipping long score history; the published correction puts tabs before panels in DOM order, adds a visible panel focus target, and preserves native scrolling keys. Live Tab, ArrowDown, ArrowUp and End behavior passed, including unchanged throw strength at a nonzero value.

Physics checks cover compound shoe colliders, ringers, six-inch distance, cancellation, fouls and displaced shoes. Ground colliders exclude the pit footprint to avoid false CCD foul contacts beneath the pit. Match bodies remain physical until the inning ends; foul contacts latch and foul bodies are removed between pitches. The opposite physical end uses the same rules transformed 180 degrees.

### Remaining acceptance and next steps

Physical-phone, screen-reader and human play acceptance have not been supplied. Touch checks are browser emulation. Materials and tilted/stacked geometric adjudication remain provisional, not tournament certification. Next: play on a physical phone and desktop, collect throw-feel and scoring feedback, and address confirmed defects. Phase 3 is now authorized and tracked below.

No Horseshoes record exists in the private cross-project board registry; board synchronization is pending routing rather than reported current. This public-safe document owns the project's current next steps.

## October 17 publication review corrections

PR156 review confirmed that the Canvas fallback never applied the active-end
transform. The fallback now rotates the court, shoes, trajectory and diagnostics
180 degrees for end A in a fixed north-up view, and moves the close-view bounds
to the active stake. Restart and practice restore end B as the target. Two
canvas regression tests fail on the prior source and pass on the correction.
All 73 source tests and the production build pass in an isolated cloud Linux
checkout. The smoke script also honors a configured Chromium executable and
adds four interacting fair pitches plus desktop/mobile fallback innings.

Next: pass browser and source PR checks, publish the rebuilt isolated route with
the generated catalog, then verify the live match and full integration CI.
Physical-device testing and human acceptance remain outstanding.

## Reproducible checks

- `npm ci && npm test && npm run build`
- Build the Mixmash artifact using `npx vite build --base /horseshoes/`; package `dist/horseshoes.html` as `/horseshoes/index.html` plus only its referenced JS/CSS chunks.
- With the packaged site served: `HORSESHOES_BASE_URL=http://127.0.0.1:4178/horseshoes/ node scripts/horseshoes-smoke.cjs`. Requires Playwright on the runner, optionally supplied through `PLAYWRIGHT_MODULE`.
- Browser smoke completes a real 84-throw match at each viewport, tests practice, orbit/zoom, themes, keyboard and emulated touch. `advanceTime` advances the same Rapier step, never inserts scores.

## Phase 3 — AI, audio and replay

Approved October 17, 2026; see HORSESHOES_PHASE3_BRIEF.md. Implemented worker-based solo opponent with Easy/Normal candidate budgets, contact-driven procedural audio with mute/volume, last/best transform replay with pause/scrub/exit, and concise throw feedback. Local matches/practice and original game boundaries remain.

Validation on the Linux runner: 76 source tests and production build passed. Clone parity includes an occupied court and removed foul shoe; the selected candidate produces the same result when launched in the live simulator. Four viewport solo matches completed24 throws/six innings at0–22. Maximum observed candidate search767ms Normal /364ms Easy, with main-thread animation continuing. Replay leaves match/physics state unchanged; audio produced a measurable signal and mute silenced it. This does not establish human listening or physical-device acceptance.

Publication and full postmerge evidence remain pending. Next: complete source and isolated Mixmash delivery, then verify the published build and preserve the physical-device feedback step.
