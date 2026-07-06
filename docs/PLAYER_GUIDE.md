# Curling Simulator — Player Guide

## The basics

Curling is played in **ends** (like innings). Each end, two teams alternate throwing 8 stones each (16 total) toward the **house** — the target circles at the far end of the sheet. The team with the stone closest to the center (**button**) scores a point for every one of its stones that's closer than the opponent's closest stone. A full match (Exhibition mode) runs **10 ends**.

## Throwing a stone

1. **Aim** — Drag on the ice to place your broom (target line). Fine-tune with `←`/`→` or `A`/`D`.
2. **Shot type** — Pick Draw, Guard, Freeze, Control, Takeout, or Peel. Each has a different default weight (speed). Number keys `1`–`5` also select a preset (Guard, Draw, Control, Takeout, Peel).
3. **Turn (handle)** — Choose In-turn or Out-turn — this sets the direction the stone curls. `Q` = In-turn, `E` = Out-turn.
4. **Charge** — Arm the shot (`Space`, or the CHARGE button), then hold. The power meter oscillates up and down; release when the fill matches the weight you want.
5. **Sweep** — While the stone is traveling, hold `Space` (or the on-screen SWEEP button). Sweeping cuts friction, so the stone carries farther and curls less.

## Shot types

| Shot | What it does |
|---|---|
| Draw | A soft shot that stops in or near the house — the most common shot |
| Guard | Placed in front of the house to protect a stone sitting behind it |
| Control | A medium-weight shot between a draw and a takeout |
| Takeout / Hit | A firm shot aimed to knock an opponent's stone out of play |
| Freeze | A draw that finishes in direct contact with another stone, making it hard to remove |
| Peel | A hard hit on a guard, clearing it and rolling your own stone out of play |
| Hit & Roll | Removes the target stone and rolls your shooter in behind cover |

## When stones disappear

A stone is removed from play when it:
- slides past the **back line** behind the house,
- goes off the **side walls** of the sheet, or
- fails to reach the **hog line** (a violation).

Removed stones are kept for scoring history but no longer appear on the sheet.

## Scoring

Only **one team scores per end**. The team with the stone closest to the button scores 1 point for every one of its own stones that finishes closer than the opponent's best stone. A **blank end** (no stones in the house) scores nothing and the hammer (last-stone advantage) stays with the same team. Otherwise, the team that did **not** score gets the hammer for the next end.

## Game modes

| Mode | Description |
|---|---|
| Exhibition | Full 10-end match against the AI, standard rules |
| Practice | Unlimited stones, no turns, no scoring — free experimentation |
| Shot Challenge | Single-shot drills (draws, takeouts, guards, freezes, peels, hit-and-rolls) scored gold/silver/bronze against par |
| Tournament | 6-end bracket games against AI teams; win to advance |
| Multiplayer | Local two-player mode, sharing one device |

Shot Challenge includes graded drills such as Button Draw, Corner Guard, Simple Hit, Double Peel, Front Freeze, and Open Peel — each scored on distance-to-target, contact, and whether the called stone was actually removed, depending on the shot type.

## Controls

| Action | Input |
|---|---|
| Adjust broom aim | `←` `→` or `A` `D` |
| Select shot type | `1`–`5` (Guard, Draw, Control, Takeout, Peel) or the on-screen shot buttons |
| In-turn / Out-turn | `Q` / `E` |
| Arm charge / hold to charge / release to throw | `Space` (or the CHARGE button, then release) |
| Sweep (while stone is moving) | Hold `Space` (or the on-screen SWEEP button) |
| Toggle fullscreen | `F` |
| Close modal | `Esc` |
| Aim by drag | Click/tap-and-drag directly on the ice |

## Camera views (3D mode)

| View | Description |
|---|---|
| Delivery | Behind the hack — the thrower's perspective |
| Follow | Tracks the moving stone down the sheet |
| House | Overhead view of the scoring area |
| Broadcast | Classic TV-style side angle |
| Free | Unlocked orbit camera |

The game defaults to the 3D arena renderer and switches to a 2D canvas fallback automatically if WebGL isn't available.
