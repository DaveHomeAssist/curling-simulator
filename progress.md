Original prompt: You are working in /Users/daverobertson/Desktop/Code/25-scratch-projects/curling-simulator. You are not alone in the codebase. Do not revert others' edits; adapt to them. Own only src/ai, src/audio, and src/game/challenges.js plus their tests. Implement evaluator.js, shotSearch.js, generators.js, samples.js, challenges.js and corresponding Vitest tests. Keep interfaces deterministic and pure where expected. Use ES modules. Run the relevant tests you add if possible. At the end, report changed files and assumptions.

2026-03-20
- Workspace was effectively empty aside from `index.html` and the two planning docs.
- Building the requested modules as a self-contained layer with deterministic tests.
- Assumption: AI evaluation will accept an injected trajectory function in tests because the physics stack is not present in this workspace yet.
