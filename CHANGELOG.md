# Changelog

Grouped by development day. See `git log` for the full commit-level history.

## 2026-08-26 — Audit remediation: challenge flow, real tournament bracket, CI test gate, session persistence

- Shot Challenge no longer scores/advances an end after its single delivery: the drill, stones, medal, and summary stay on screen, the result chip shows the medal, and a working Try Again (plus Reset) reseeds the drill (audit H-1).
- Tournament is a real 4-team single-elimination bracket: named semifinal vs a bracket opponent, the other semifinal is simulated, winning advances you into the final, losing eliminates you and resolves a champion, and tied matches play an extra end. The bracket card renders the actual bracket state — round, wins, eliminations, champion (audit H-2).
- The Pages deploy workflow now runs `npm test` before the Vite build, so a broken physics/scoring/challenge/mode change can no longer publish green (audit M-1).
- Session persistence (`src/game/persistence.js`): match score, ends, hammer, stones, mode, challenge medals, bracket progress, and audio preference survive reloads, crashes, and mobile tab eviction via localStorage snapshots saved on hide/close and a 5s interval (audit M-2).
- New Vitest coverage for the challenge flow, tournament bracket, and persistence round-trip (13 new tests; 53 total).

## 2026-03-20 — Core build: physics, 3D renderer, mobile shell

- Phase 0–2 build-out: modular physics engine + test harnesses, then the Three.js 3D renderer, camera system, and `main.js` wiring.
- Full mount system: audio manager, effects service, dual (2D/3D) renderer bridge, and a multiplayer stub.
- GitHub Pages deploy workflow added (Vite build + `deploy-pages`).
- v2 physics model shipped: velocity-dependent friction, curl model calibrated against published benchmarks (15/15 validation).
- Renderer hardening: WebGL detection with 2D fallback, error boundary on mount, fixes for blank/init-failure states, diagnostic wrappers to trace 3D init errors.
- `t27` glitch palette theme applied across the app.
- Mobile gameplay shell: sequential shot-setup flow (shot type → turn → charge), touch-friendly menus, fixes for menus covering the screen on small viewports.
- "How to Play" guide added to the settings panel; curling favicon added.
- Full-stack polish pass consolidating the physics stack and fixing 9 outstanding issues.

## 2026-03-21 — Audio, ice shader, presentation polish

- Procedural audio system: rumble/scrape/impact effects plus crowd ambience that swells during travel and clutch moments.
- Custom ice-surface shader: Fresnel reflection, procedural pebble texture, and visible ice wear.
- 3D scenery improvements: house fills, scratches, vignette, and an in-scene scoreboard.
- Arena feedback and match-presentation polish; pebble intensity tuned down (scale 180→80, bump 4x→2x, highlight 0.15→0.06).
- Navigation/control UI polish pass; production-hardening pass.

## 2026-03-22 — Ice texture fix

- Fixed the Voronoi hemisphere pebble pattern on the ice shader.

## 2026-07-06 — Licensing

- Added an explicit all-rights-reserved `LICENSE`.
