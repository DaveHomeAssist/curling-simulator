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

The correction is included in the current Phase 3 publication verified below.
Physical-device testing and human acceptance remain outstanding.

## Reproducible checks

- `npm ci && npm test && npm run build`
- Build the Mixmash artifact using `npx vite build --base /horseshoes/`; package `dist/horseshoes.html` as `/horseshoes/index.html` plus only its referenced JS/CSS chunks.
- With the packaged site served: `HORSESHOES_BASE_URL=http://127.0.0.1:4178/horseshoes/ node scripts/horseshoes-smoke.cjs`. Requires Playwright on the runner, optionally supplied through `PLAYWRIGHT_MODULE`.
- Browser smoke completes a real 84-throw match at each viewport, tests practice, orbit/zoom, themes, keyboard and emulated touch. `advanceTime` advances the same Rapier step, never inserts scores.

## Phase 3 — AI, audio and replay

Approved October 17, 2026; see HORSESHOES_PHASE3_BRIEF.md. Published at [Mixmash Horseshoes](https://mixmash.games/horseshoes/). Options offers solo versus computer, local two-player and practice. Easy/Normal AI searches actual simulated candidates in a worker; contact-driven optional audio has mute/volume; last/best transform replay supports pause, scrub and exit without changing the live score or world.

The October 17 player feedback correction renames the former Play tab to Controls, uses neutral underlined navigation above the deck on all screen sizes, and keeps Throw as the primary colored action. Mobile placement follows WEB-2's explicit product-usability allowance and aligns visual order with keyboard order. Source PR4's fallback court reversal correction is included.

### Source and publication

- Phase 3 source [PR6](https://github.com/DaveHomeAssist/curling-simulator/pull/6) merged as `d206cceb6b494d1778eebabfa12597fbd2bde799`; source CI 39011494882 and postmerge 39011566624 passed.
- Initial publication [PR159](https://github.com/DaveHomeAssist/mixmash/pull/159) merged as `6db8334b41e2ec1f08a028a08e8a9eb3c33dd8b2`. Pages 39025463426 and dedicated gameplay 39025463788 passed. Full postmerge 39025463765 failed because the shared admin index omitted concurrently landed Mars files. That failure is retained as historical evidence, superseded by the current full checks below.
- Controls [source PR7](https://github.com/DaveHomeAssist/curling-simulator/pull/7), candidate `b16d2ffe6df47d0416a89f3b67fe951590047455`, merged as `a90b48ea8cbf8a32d8942db59d6e63cfad88bcbe`. Exact source CI 39035620247 and postmerge tests/build/Pages 39035674047 passed.
- Current [Mixmash PR163](https://github.com/DaveHomeAssist/mixmash/pull/163), candidate `3a0f692d75ebfb164192ab6674c57a329ba62fa7`, merged as `f48ad3e1873c6296ab1492c2c958e606e7884426`. Full premerge 39035757258 and dedicated gameplay 39035757217 passed. Full postmerge 39037840693 and dedicated gameplay 39037840695 passed.
- [Pages 39037839692](https://github.com/DaveHomeAssist/mixmash/actions/runs/39037839692) published the current merge. Public HTML and all four assets returned 200 with SHA256 matching the reviewed package. No original game or homepage files changed in this correction; `noindex, nofollow` and unlisted status remain.

### Verified behavior and next steps

Dominic ran 78 source tests, the production build and 471 current Mixmash tests successfully. Chromium checks against the published route covered desktop 1440×900, portrait 375×812, landscape 667×375 and ultrawide 3440×1440. Control hierarchy, both themes, viewport fit, keyboard and emulated-touch throws passed. Local matches completed 84 throws/21 innings on three viewports; solo matches completed 24 throws/six innings on four viewports with Easy and Normal AI. No page or asset errors were observed.

Replay pause/scrub/exit preserves exact match and shoe state, including during AI search and across ends. Restart cancels stale AI work. Audio produces a measurable signal, volume changes and mute work, and unavailable AudioContext degrades gracefully. Physics settle under normal time. Fallback desktop/mobile checks reverse both drawn ends, keep close view on the active stake and restore practice/retry. Existing Curling still loads in 3D and throws; both return links and the unlisted homepage were checked.

Automated release gates are complete. Physical-phone, screen-reader and human listening/play acceptance remain separate and unverified. Materials and tilted/stacked adjudication remain provisional. Next: collect player feedback on the clarified Throw action and physical-device feel; address confirmed issues only. The private board registry still has no Horseshoes entry, so no board synchronization is claimed; this source record owns the next steps.

## FMP lawn and menu — October 17

Approved scope: reuse the FMP camera simulator including its pavilion, distinguish control families by color, and provide a proper paused menu. See HORSESHOES_FMP_MENU_BRIEF.md and src/horseshoes/assets/README.md for model provenance and adaptation limits.

Implemented: decorative pavilion/lawn scene; blue aim/arc, violet delivery and orange Throw; arrival/resume menu with new-game, sound, display and instructions. Mode/difficulty selections apply only when explicitly starting a new game. The menu pauses physics, AI and replay, suppresses sound, contains keyboard focus and closes with Escape. Original game rules and other games remain unchanged.

Dominic verification: 78 source tests and production build passed. Menu pause/focus, explicit new-game choices, light/dark colors and viewport fit passed at 1440×900, 375×812, 667×375 and 3440×1440. Complete local matches (84 throws at three viewports) and solo matches (24 throws at four viewports), audio output/mute, replay isolation, AI cancellation and fallback checks passed. Ultrawide audio waveform sampling uses a standard desktop raster before restoring ultrawide for gameplay; this avoids missing brief waveforms during software rasterization. Human venue likeness and physical-device acceptance remain open.

Source PR9 merged as `82b10e1a1351e0cb7f5c6fb89b27bea07dc2aa25`; source checks39044035025 and postmerge39044165414 passed. Mixmash PR166 candidate `158a588dd237736c0cc3cacf55c4e961ccb04544` passed full CI39045017950 and dedicated39045017872, then merged as `b95276f707c29d6efd77bf366fb6a9c8ddb3d41d` with the identical tree. Pages39048751424 passed; public HTML and all five assets match the package. Full postmerge CI39048751976, dedicated39048751984 and live gameplay verification remain pending.

Next: complete the named release gates, then collect FMP likeness and physical-device play feedback. The private board routing gap remains; no unrelated project board was updated.
