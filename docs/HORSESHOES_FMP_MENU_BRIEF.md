# FMP lawn and game menu

Approved player feedback, October 17: use the existing FMP PTZ simulator venue as the lawn setting, introduce clearer control colors, and provide a proper game menu with settings.

The scene will reuse the camera simulator's schematic pavilion, seating bowl and lawn geometry from system-by-dave/apps/fmp-camera-sim (revision 18a1a4e165f326aa8f7a0ae9505b29b67db575ac). A level game patch is a deliberate adaptation; no venue measurement or real horseshoes installation is asserted. Imported environment meshes are decorative, with no change to court dimensions, physics, scoring or camera orbit/zoom. No operational device data, photos or network configuration is packaged.

The menu opens on arrival and from a visible Menu button. Start/resume, game mode, difficulty, sound/volume, display and instructions are grouped clearly. Opening it pauses physics, replay and AI, suppresses sound and traps keyboard focus; Escape resumes without a stray throw. Starting a fresh mode or restarting is explicit. Existing local, solo, practice, replay and return links remain available.

Colors identify control families: blue aim/arc, violet delivery, warm strength, and a distinct primary Throw action. Labels and selected borders remain, so color is not the only cue. Light/dark themes, visible focus and the viewport-locked shell remain.

Acceptance: source tests/build; menu open/close/Escape/focus, pause during flight/replay/AI, restart and sound; complete local/solo games; scenery visible with full orbit/zoom; desktop, portrait, short landscape and ultrawide in both themes; exact packaged/public assets and live gameplay; full CI and original games preserved. Physical-device and venue likeness acceptance remain human follow-ups.
