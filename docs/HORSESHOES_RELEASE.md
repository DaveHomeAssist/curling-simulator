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

Published at [Mixmash Horseshoes](https://mixmash.games/horseshoes/). The existing FMP camera simulator's schematic pavilion, seating bowl and lawn form the decorative setting. A level practice patch is a game adaptation, not a surveyed or installed court. Model provenance and reproduction are in `src/horseshoes/assets/README.md`; the owning FMP project is unchanged.

Aim/arc are blue, delivery violet, strength warm and Throw orange. Controls/Score navigation is neutral, with a separate Menu button. The arrival/resume menu groups new-game choices, sound/volume, theme/fullscreen, physics guides and help. Opening it pauses physics, AI and replay and contains keyboard focus. Escape resumes. Mode/difficulty changes apply only on explicit start. Status hints now name Controls between innings and Menu after completion.

### Source and publication

- Source PR9 introduced the setting/menu; PR10 and PR11 corrected two old navigation labels and made audio verification independent of graphics timing. Final source candidate `7c28a798c402a990997947314e474d2bf4c963c7` merged as `41601de98b05f15b3782d6f5d6ecfaba7e882341`. Source checks 39052465755 and postmerge tests/build/Pages 39052525146 passed.
- Initial Mixmash PR166 merged as `b95276f707c29d6efd77bf366fb6a9c8ddb3d41d`; full pre/post CI, dedicated gameplay, Pages and comprehensive published verification passed.
- Final [Mixmash PR167](https://github.com/DaveHomeAssist/mixmash/pull/167) candidate `6b1a1aabd8ebd5780a79542407dad6182a7f761c` merged as `772e2afa49747c6e32fa976e9ad8211bad10d608`. Full premerge 39052515239, dedicated premerge 39052515193, full postmerge 39054668950 and dedicated postmerge 39054668953 passed. Pages 39054667986 passed. Public HTML and all five assets match the final package.

### Verification and remaining acceptance

Dominic ran the production build, 78 source tests, 471 Mixmash tests and browser checks. Comprehensive public checks completed three local 84-throw matches and four solo 24-throw matches, with menu pause/focus/new-game behavior, both themes, pointer/emulated touch, camera orbit/zoom, keyboard controls, stable physics, fallback, audio/mute, replay and AI cancellation. Native Enter activation reached both return destinations; original Curling launched a stone in its 3D view. No page errors were observed.

An instantaneous audio analyser probe could miss short sounds during software rendering; a smaller raster did not fully cure that measurement failure. The final harness records actual browser audio output and asserts nonzero decoded RMS at the original viewport. It passed all four public solo scenarios. The final publication differs from that comprehensively tested build only in two status strings. Final candidate/postmerge suites checked the updated artifact, and a public solo match plus return-link/original-game spot checks verified the final guidance and playback. Physics, scoring, AI, scenery and layout did not change in that follow-up.

Original games, the Mixmash homepage and `noindex, nofollow` remain preserved. Horseshoes is still unlisted. Browser touch emulation and measured audio output do not establish physical-phone, screen-reader, human listening/play or FMP likeness acceptance.

Next: collect physical-device and venue-likeness feedback and address confirmed issues. No new feature scope is inferred. No Horseshoes record exists in the private cross-project board registry; this public release record owns next steps and the board routing gap remains explicit.

## Pavilion instant replay and intro — October 17

Published at [Mixmash Horseshoes](https://mixmash.games/horseshoes/). Four schematic FMP lawn delay screens show a silent instant replay while the main game remains available. The shared 512×288 feed has a bounded independent clock and scene, holds its final frame, never restores physics and remains separate from manual replay. Menu/hidden page pause animation and new games clear it.

The six-second pavilion-to-court introduction has a visible Skip button. Escape, pointer interaction or throwing cancels it; reduced motion skips the pass. Every exit restores the pitching view. Menu offers Tour venue and View delay screens; throwing from screen view returns to the court. Compact intro labels and hidden camera/status overlays prevent overlap in short landscape. Original games, homepage, unlisted route, noindex/nofollow and match rules remain preserved.

ECP-1.0 revision1.0 mapping is scoped in `HORSESHOES_BROADCAST_BRIEF.md`: the existing pinned D1–D4 anchors and schematic dimensions drive display overlays; no shared producer, equipment schema or physical controls change. Source provenance remains in `src/horseshoes/assets/README.md`.

### Exact release evidence

- [Source PR13](https://github.com/DaveHomeAssist/curling-simulator/pull/13) and [PR14](https://github.com/DaveHomeAssist/curling-simulator/pull/14), final candidate `78a16b5a458c8d1f5dd4bb40af4ef8698e96fbbf`, merge `34528d472448e4422b99527637475a3fc70f9367`. Source CI 39064305894 and exact postmerge tests/build/Pages 39064530207 passed. Review findings were corrected: tour exits restore pitching mode; venue actions remain disabled until all four supported anchors load, with a visible loading/unavailable state. Failed and unsupported assets leave the court playable. Visual inspection also caught and corrected a replay camera that lost high throws; it now follows the full recorded position. Focused regression checks passed and the source review threads were resolved.
- [Mixmash PR170](https://github.com/DaveHomeAssist/mixmash/pull/170), candidate `a02bbb8e79372c639ebe0e6ddca2a51072e66b7e`, merge `009be088b65ec82663faed06aafa7575344f3a0e`. Full premerge 39081033268, dedicated premerge 39081033294, full postmerge 39082621567, dedicated postmerge 39082621545 and Pages 39082621053 passed. Public HTML and all five assets match.
- Dominic ran 80 source tests, production build, 473 site tests and focused catalog checks. Four-viewport packaged and public browser checks passed for monitor feed/concurrent next throw, end reversal, menu pause/reset, manual replay, intro skip/completion, pointer/Escape cancellation, delayed asset loading, reduced motion and viewport fit. Actual game-skill client and screenshots were inspected. Public close-up images differ as recorded shoe positions advance while live physics/match state remain identical; throwing resumes the pitching view. Fallback remains playable. Existing dedicated regression covers complete local/solo matches, audio, replay, AI and input. Public return-link/original Curling checks passed without page errors.

Next: collect physical-phone and cinematic/venue-likeness feedback, then address confirmed issues. Browser touch emulation is not physical-device acceptance; measured audio is not human listening acceptance. No Horseshoes record exists in the private Next Steps Board registry, so this source record owns next steps and that routing gap remains explicit.

## October 18 audit repairs

Approved correction scope: short-landscape control clipping and court visibility; the nine development dependency findings from the 100-game audit; supported static-host security controls; stale publisher verification wording. Acceptance requires visible reachable controls in both themes at short viewports, unchanged gameplay and original games, clean scoped dependency audit, tested CSP behavior, exact CI/merge/Pages and live artifact verification. Work is in progress; no new closure is claimed. The source release record remains the next-steps owner because the private board has no Horseshoes mapping.

### Static-host hardening boundary

The production Horseshoes document has a CSP restricting scripts, connections
and workers to its own origin; inline scripts, frames, objects, base URLs and
form submissions are blocked. `wasm-unsafe-eval` permits the bundled Rapier
WebAssembly engine without allowing JavaScript `eval`. Referrer information is
suppressed. The development server defaults to loopback; LAN exposure requires
an explicit host option. Curling's entry document has no added policy.

GitHub Pages is the direct publisher with HTTPS enforcement enabled. It does not
provide a per-route response-header configuration here. A document policy cannot
enforce `frame-ancestors`, HSTS or `X-Content-Type-Options`; these remain hosting
hardening gaps, not claimed fixes. Adding inert `_headers` or meta substitutes
would not provide protection. An edge proxy/hosting change would affect a wider
boundary than this isolated game correction and is not included. No live exploit
was established by the audit.

### Dependency repair decision

Dave approved the Vitest4 major upgrade on October18. Vite7.3.7 and Vitest4.1.12 retain the supported Node20/22 runtime and existing test APIs. Patched transitive packages are esbuild0.28.2, picomatch4.0.7, postcss8.5.31, nanoid3.3.20 and source-map-js1.2.2. Vitest4 removes the vulnerable Tinypool path and updates @vitest/mocker. The fresh full and runtime-only npm audits report zero known advisories. These are development dependency findings; no live exploit was established. There were no overlapping open update PRs at repair intake. Exact final verification and publication remain pending below.
