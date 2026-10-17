# FMP venue geometry

`fmp-venue.json` is a decorative Three.js scene exported from the existing FMP camera simulator in DaveHomeAssist/system-by-dave, `apps/fmp-camera-sim`, revision `18a1a4e165f326aa8f7a0ae9505b29b67db575ac`.

Reused with Dave Robertson's explicit October 17, 2026 instruction. Copyright (c) 2026 Dave Robertson. All rights reserved. The original venue remains unchanged. The export contains geometry and materials only, with helper labels and user data omitted; no operational camera records, network configuration or photos.

Reproduce with `node scripts/export-horseshoes-venue.mjs /path/to/apps/fmp-camera-sim` after installing the existing project build dependencies. The exporter uses the simulator's default venue, bowl, terrain and structures builders. It places the game 24 metres beyond the schematic rear concourse, turns the view toward the pavilion and levels a decorative patch beneath the independent horseshoes court. These are game adaptations, not measured venue dimensions or a claim that a real court exists there. Float serialization is rounded to five decimal places.

The asset is loaded independently of physics; unavailable scenery leaves the court playable. No runtime dependency on the FMP application is introduced.
