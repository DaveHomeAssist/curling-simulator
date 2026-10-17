# Horseshoes release and next steps

## Phase 1 closure

Mixmash PR155 merged as `2c417b359b5d0b99188909fdd9e78283351a3d90`.
The full postmerge [CI run 38989410478](https://github.com/DaveHomeAssist/mixmash/actions/runs/38989410478) passed, completing October 17 at 01:42:21 UTC. Dedicated Horseshoes checks and Pages also passed. This closes the previously pending full CI check. Live route/assets, controls, normal-time settling and both return links were verified separately. Original Curling and Mixmash homepage were preserved.

## Phase 2

Accepted: local two-player match, two consecutive shoes each, final-arrangement cancellation scoring, innings, end reversal, history and first to 21. See HORSESHOES_PHASE2_BRIEF.md and HORSESHOES_PHASES.md.

Source recovery restores authored Phase 1 modules that previously existed only in the original development record, then applies the released navigation/keyboard fixes and match layer. Source main and the published static bundle have separate delivery gates.

Current state: implementation validated on the remote runner. Source tests: 71 passing; production build passed. Browser smoke completed 84-throw matches at desktop 1440×900, mobile 375×812 and short landscape 667×375, with no page errors or failed assets. Mouse/emulated-touch aim, strength, orbit and zoom; native keyboard controls; practice presets and retry; both themes; final score/history and restart passed. The first six-inch fixture incorrectly assumed the curved compound collider had the nominal width at every point; the corrected fixture measures the straight rail. Outside-ground colliders now exclude the pit footprint, avoiding false CCD foul contacts beneath the pit. Match bodies remain physical until the inning ends; foul contacts latch and foul bodies are removed between pitches. Geometry operates in the active end's local frame, transformed 180 degrees for the opposite physical end in the renderer. No change to Curling's source modules.

Source PR2 merged as `2773cb4a79dea95c8bbd0efd502e31481fc281f4`; source CI39001524753 and postmerge build/deploy39001586506 passed. Mixmash PR156 merged as `dfca5e0d1a66eb0343af001ead7ded221257fce6` after full CI39001623424 and dedicated gameplay39001623426 passed. Pages39003862355 published the exact merge; live HTML/assets matched SHA256. Live full matches passed at all three viewports; a normal-time throw settled in 2.45 seconds, wheel zoom and both return links passed. Dedicated postmerge gameplay39003862380 passed. Full postmerge repeat39003862372 is pending.

A follow-up keyboard regression reproduced one gap: Tab from Score skipped the long history panel. The focused correction places tabs before their panels in DOM order, gives score history an explicit focus target and visible focus ring, and preserves native scroll keys instead of routing them to throw controls. Next: publish and verify this correction, then record final CI/live evidence. Human/physical-phone acceptance remains separate. Phase 3 AI, audio and replay are deferred.

No Horseshoes record exists in the private cross-project board registry; board synchronization is pending routing rather than reported current. This public-safe document owns the project's current next steps.

## Reproducible checks

- `npm ci && npm test && npm run build`
- Build the Mixmash artifact using `npx vite build --base /horseshoes/`; package `dist/horseshoes.html` as `/horseshoes/index.html` plus only its referenced JS/CSS chunks.
- With the packaged site served: `HORSESHOES_BASE_URL=http://127.0.0.1:4178/horseshoes/ node scripts/horseshoes-smoke.cjs`. Requires Playwright on the runner, optionally supplied through `PLAYWRIGHT_MODULE`.
- Browser smoke completes a real 84-throw match at each viewport, tests practice, orbit/zoom, themes, keyboard and emulated touch. `advanceTime` advances the same Rapier step, never inserts scores.
