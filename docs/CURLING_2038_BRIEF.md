# Curling 2038

Approved 2026-10-18: redesign, repeatedly stress test and repair the curling main
page, then push and deploy. Horseshoes is excluded.

Player problem: the free camera is a fixed preset, mobile controls bury delivery,
and keyboard/gesture interruption can accidentally affect a shot.

Direction: luminous architectural ice arena, teal instrumentation, compact shot
dock, light default and persistent dark mode. Preserve calibrated physics.
Flow: select shot and handle, aim, charge, release, sweep, review. Orbit is a
separate camera mode with 360 degree drag and bounded wheel/button zoom.

Scope: input isolation/cancellation, fullscreen shell, camera controls, responsive
presentation and regression/stress tests. No accounts, new network services,
physics recalibration or horseshoes feature changes. Existing Three.js suffices.
Theme preference is a separate optional localStorage key; match schema unchanged.

Acceptance: finite settled shots across extreme inputs; no accidental throw on
cancel; menus isolate shortcuts; orbit does not aim or throw; controls fit mobile,
short desktop and ultrawide; both themes readable; no page scroll or runtime
errors; save/reload and AI progression work. Automated proof and human feel are
separate gates. Device GPU performance remains a physical acceptance check.

Gameplay correction found during acceptance: legacy delivery speeds overshot the
back line at every Draw charge. Align shot presets with the existing engine;
share them with AI and invert the release formula when applying an AI plan.
This changes delivery controls, not friction/curl constants. Require a fresh-ice
default draw to stop in the house and planned AI velocity to match actual release.
