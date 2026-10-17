# Horseshoes Phase 2: local match

Decision: on October 16, 2026, Dave selected local two-player play: two shoes each, innings, scoring and match completion. This implements Phase 2 of HORSESHOES_PHASES.md. Direct user instruction supplies project intake authority.

Player outcome: finish a pass-and-play singles game to 21 with two physical shoes per player, clear turn prompts, cancellation scoring, inning history and restart. Players pitch both shoes consecutively; the scoring player leads next inning, otherwise the previous leader continues. Ends alternate each inning. Scores are awarded only after all four shoes and displaced shoes settle. Practice remains available separately.

Smallest useful flow: aim/strength/arc/style → throw → wait for all shoes → next delivery → final geometry scoring → inspect close view and explanation → next inning → first player reaching 21 wins. Restart clears the match. Switching modes explicitly starts a fresh game. State is in memory, with no accounts, network, saves, or tracking.

Rules: ringers worth 3 cancel pairwise; closest nonringers within six inches can score 1 each; leaners have no bonus. Outside-ground contact is latched as a foul even after bounce-in. Foul bodies are removed after settling and before the next pitch; displaced fair shoes remain. Scoring uses the finite inclined stake and actual compound shoe pieces. Borderline tilted/stacked geometry remains provisional, not tournament adjudication. Source: https://www.horseshoepitching.com/rules/PlayingRules.html .

Source: recovered the original Phase 1 authored file diffs from its development record, based on source main 3c8eab6. The original unpushed d855db8 object is unavailable locally. Preserve the verified Phase 1 navigation and keyboard fixes in this readable implementation. Pin Rapier 0.21.0, retaining the established fixed-step solver and physical dimensions.

Scope excludes AI, online play, audio, replay, soil deformation and regulation certification. The existing Curling entry point and Mixmash homepage are preserved. Horseshoes stays unlisted and noindex, nofollow. Keep the established pitching/close views and add drag orbit and wheel/pinch zoom for inspection.

Acceptance: rules fixtures for 3/4/6 points, cancellation, equal distances, six-inch boundary, ringer clearance, fouls and displaced shoes; all-body settling and collision regressions; complete browser match using real throws; restart, end reversal, practice, mouse, emulated touch, keyboard activation, return links, both themes and viewport containment at 1440×900 and 375×812. Build/tests/browser execute on the remote runner; publish source and isolated Mixmash bundle through reviewed PRs and verify live output.
