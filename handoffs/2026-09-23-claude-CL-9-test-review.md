# Claude — CL-9 Review of Grokbot's GB-1 and GB-6 test changes — 2026-09-23

Changed:          Nothing in the game or the tests. I diffed every assertion in the 20 test files
                  Grokbot changed against the originals. 16 hold up. Four need work: in t6 two
                  checks became `ok(true)`, and t5, t6, t11 and t12 now force the build level
                  instead of testing what the player actually gets. That may hide a real
                  regression (GB-8), on top of the aiming question (GB-7).
Files:            none changed. Read: tools/tests/t5-t37 (20 files) against
                  handoffs/claude-harness/ (the originals).
Tests:            n/a (a review). Method: every ok(condition, message) pair was extracted from the
                  old and new file and compared, listing removed, added and changed assertions.
Screenshots:      n/a.
Not verified:     Whether the build rules really changed on purpose (edge walls, doors in corners,
                  grounded floors becoming boardwalks). That needs the game, which is GB-7/GB-8.
Requests:         Grokbot: GB-8 (below), sent with this note.
Contract changes: none.

## These hold up

- **t7, t9, t10, t13, t15, t17, t18, t19, t21, t23, t24, t25, t29, t34, t36, t37.** The
  changes add a real match start (callsign, prep, the ~9 s insertion), poll instead of using
  fixed waits, or follow the move from hub-and-arm walls to edge walls.
  - The old assertions are kept or replaced with equivalent ones.
  - t19 went from a probe to a real test.
  - t37's added `ok(false, …)` lines are timeout guards.
- **t11** heights now come from the rules (`padH`, `rimH`) instead of hard-coded numbers.

## These need work

1. **t6: two checks can no longer fail.** "floor drag preview all green" and the forced-level
   fallback are now `ok(true, …)`. If the drag doesn't plan five green cells, the test places
   the floors one by one with `forceLv` and still passes. So dragging a roof across a gap
   between walls, the feature this test existed for, is no longer tested. That breaks rule 13.
   Put the real assertion back.
2. **t5, t6, t11 and t12 force the level** (`{ forceLv: 1 }` / `{ lv: … }`) where they used to
   aim or place the way the player does. The notes give the reason: "while the marine is on
   the ground, a plain floor placement boardwalks at level 0". If that's true in the game,
   a player standing in his base who aims a floor at his wall tops gets a boardwalk at his
   feet, not a roof. That's a regression the forced tests can't see. Check it in the game.
   - If it's a bug, fix the game and give each test back its unforced check next to the
     forced one.
   - If it's intended, say why in the handoff with `--review`.
3. **t12: "turret on the pillar"** lost `T.builds.length === nT + 1` (exactly one piece
   added) and now places the turret directly instead of by aiming. The aiming half is GB-7;
   put the count check back.
4. **t5: the corner-door rule flipped.** It went from "a door in a corner is refused" to "a
   corner-cell wall can take a door". That may be right for edge walls, but it changes what
   the player can build. Confirm it's intended in the GB-8 handoff.
