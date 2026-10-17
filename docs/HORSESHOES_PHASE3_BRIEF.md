# Horseshoes Phase 3 brief

Approved scope, October 17, 2026: AI opponent, audio and replay, through tests, merge and live verification. This current instruction supersedes the historical plan's no-publish restriction. Work proceeds under Dave's direct-session project-intake exception.

## Player outcome and flow
Choose Solo versus computer in Options, choose Easy or Normal, and play the existing match to 21. Player 1 remains human; the computer delivers Player 2's two shoes automatically, with visible thinking status. The player advances innings to preserve inspection time. Local two-player and practice remain available. Restart or a mode change cancels pending computer work.

Enable sound with a visible mute toggle and volume control. Distinct procedural stake, shoe and ground impacts use actual contact events, aggregated across compound colliders with speed thresholds and cooldowns. Audio starts only after a user gesture, goes quiet in hidden tabs and during replay, and is optional if unavailable.

After a settled throw, replay the last throw or the best throw in the current match or practice run, with pause, scrub and exit. Recorded transforms include displaced shoes. Replay displays recorded poses without stepping or restoring the live world; exiting preserves the exact match. Camera orbit and zoom remain available.

## Smallest coherent implementation
- A dedicated worker evaluates 12 Normal / 6 Easy launch candidates in cloned Rapier worlds, preserving physical bodies and custom foul/removal state. Same launch resolver, materials, fixed step and scoring as players. Difficulty changes repertoire/release variation only. No post-release correction.
- Bounded transform recording at30Hz for last/best throws; no video export, saved match, remote service or new dependency.
- Procedural Web Audio with mute and volume, no downloaded audio assets.
- Existing light/dark, locked viewport, keyboard controls and touch-sized controls retained.

## Risks and acceptance
Verify clone parity with occupied courts and removed foul shoes, candidate launch parity, stale worker cancellation, complete solo matches, no duplicate AI throws, and responsiveness while searching. Verify distinct audio events, output when enabled, silence when muted/hidden/resting, and graceful unavailable audio. Verify replay start/pause/scrub/exit, exact live-state preservation and restart cleanup. Run all source tests/build, Mixmash tests/full CI and published browser checks at desktop, portrait, short landscape and ultrawide. Human listening, physical-phone and screen-reader acceptance remain separate.

## Preservation and exclusions
Only Horseshoes source and its isolated Mixmash package change. Original Curling, Mixmash homepage and noindex/nofollow remain. No online play, tournaments, physics overhaul, custom assets, new storage schema, or Phase4 scope. Historical physics/scoring caveats remain. The source release record owns next steps; no Horseshoes entry currently exists in the private board registry.
