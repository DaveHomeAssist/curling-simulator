# Curling Simulator

A browser-based Olympic curling game with a real physics model — velocity-dependent friction, pivot-slide curl, sweeping, and stone-on-stone collisions — rendered in 3D (Three.js) with a 2D canvas fallback. Play live at **[davehomeassist.github.io/curling-simulator](https://davehomeassist.github.io/curling-simulator/)**.

## What's here

| Path | What it is |
|---|---|
| `src/physics/` | The sim core — stone dynamics (`stone.js`), trajectory integration (`trajectory.js`), collisions (`collision.js`), scoring (`scoring.js`), and the tunable constants (`constants.js`) |
| `src/game/` | Game state machine (`state.js`), fixed-step loop (`loop.js`), input bindings (`input.js`), and shot-challenge definitions (`challenges.js`) |
| `src/render/` | `renderer3d.js` (Three.js arena, camera rig, ice shader) and `renderer2d.js` (canvas fallback), plus `ui.js` for the HUD/drawers |
| `src/ai/` | AI opponent — shot evaluation (`evaluator.js`) and shot search/planning (`shotSearch.js`) |
| `src/audio/` | Procedural audio — rumble, scrape, impact, and crowd ambience, with an optional sample-based path |
| `scripts/calibrate.py`, `scripts/calibrate_v2.py` | Python scripts used to calibrate the friction/curl model against published curling physics benchmarks |
| `.github/workflows/pages.yml` | Builds with Vite and deploys `dist/` to GitHub Pages on every push to `main` |
| `docs/PLAYER_GUIDE.md` | How to play — controls, shot types, scoring, game modes |

## How to run

```
npm install
npm run dev       # local dev server (Vite) at http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview the production build
npm test           # run the Vitest suite (physics, AI, audio, challenges)
```

## Conventions

- **Units**: the physics engine works in real-world SI units — metres for position/distance, m/s for velocity, and a 44.5m × 4.75m sheet (`src/physics/constants.js`) matching regulation curling ice.
- **Coordinate system**: `y` runs down the sheet from the hack (`y = 0`) through the hog line, to the tee line (button, `y = 23.47`) and back line (`y = 29`); `x` is centered on the sheet (`0`), with the house radius and stone radius also defined in `constants.js`.
- **Calibration**: friction/curl coefficients were tuned against published curling physics benchmarks (see `VALIDATION_RESEARCH.md` and `src/physics/validation.test.js`) rather than picked arbitrarily.
