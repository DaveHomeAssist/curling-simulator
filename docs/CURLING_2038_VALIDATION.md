# Curling 2038 validation

Evidence date: 2026-10-18. Scope: curling main page. Existing horseshoes source
and behavior are excluded; its unit tests remain part of the full suite.

## Repairs found by successive passes

- Keyboard actions leaked into play while menus were open; interrupted pointer
  charges could throw. Input now isolates controls, captures pointers, cancels
  unfinished charges on blur/cancel/Escape and enters fullscreen on the app shell.
- Free camera was a fixed pose. Orbit now has unrestricted horizontal rotation,
  bounded elevation and zoom, with separate camera input and touch zoom buttons.
- House discs layered a large white disc over colored rings. Corrected ordering
  and opaque ice restore a readable target. Scoreboard now uses actual totals.
- Short landscape theme variables enlarged the dock; the summary chip intercepted
  charge input. Corrected specificity and noninteractive overlay hit testing.
- End transitions retained the old shot number and always led with Red. New ends
  reset delivery numbering and lead with the non-hammer team.
- Legacy Draw speeds overshot the back line at every charge setting. Shared shot
  presets now match the existing friction engine; AI applies the inverse release
  formula, so the selected velocity is the actual launch velocity.
- Renderer rebuilt unchanged previews and score textures every frame, retained
  meshes after resets, and audio queued suspended resumes before user interaction.
  Cache unchanged work, dispose retired meshes, and unlock audio by user gesture.

## Automated evidence

- Linux command runner, Node 24, isolated Playwright container; Mac reserved for
  edits, coordination and the explicitly requested local development server.
- Full suite: 87 tests across 19 files passed after delivery corrections.
- Stress matrix: 2,200 combinations (5 shot types × 11 aim values × 2 spins ×
  10 power values × 2 sweep states), finite coordinates and no stuck travel.
- Three complete local ends; non-hammer lead; AI reply; default draw inside house;
  exact AI planned/released velocity; persistence and existing physics tests.
- Production build passes. Existing large Three.js and horseshoes chunk warning
  remains a bundle-size observation, not a failed build.
- Keyboard, touch taps, interrupted charge, fullscreen, challenge retry, full
  orbit, zoom bounds and WebGL fallback passed against production preview.
  All four viewports (1440x900, 375x812, 667x375, 2560x720) passed six throws
  each, both themes, cancellation, sweeping, orbit/zoom and saved-game reload,
  with no page overflow or page runtime errors. Final deployment evidence is
  recorded in the session closeout and progress record after execution.

## Repeatable commands

`npm test` and `npm run build` use the locked project dependencies.

With Playwright available, run `node scripts/curling-stress-smoke.cjs` and
`node scripts/curling-controls-smoke.cjs`. `PLAYWRIGHT_MODULE` can select an
existing runner installation. `CURLING_URL` selects dev, preview or deployed
root; `CURLING_OUTPUT` selects screenshot/results output. Optional
`CURLING_VIEWPORTS` accepts a JSON array of [width,height] pairs.

`node scripts/curling-live-smoke.cjs` checks a browser-controlled default draw
lands in the house and captures a close 3D view. `CURLING_IMAGE` sets its output.

Browser tests use software WebGL and emulated viewports. They do not establish
physical touch feel, hardware GPU frame rate, or human approval of the art direction.

## Released evidence

Runtime commit `63c1dda963ec0ffbb48c69913043a81121813c41` is pushed to main.
[Pages run 39186353507](https://github.com/DaveHomeAssist/curling-simulator/actions/runs/39186353507)
passed tests, build and deployment. The [live game](https://davehomeassist.github.io/curling-simulator/)
passed `curling-live-smoke.cjs` with renderer `3d`, stone coordinates
`x=0.826, y=23.611` inside the house, and no page runtime errors. The resulting
close orbit screenshot was inspected. This supplements the full production
preview suite above; it is not a claim of physical-device acceptance.
