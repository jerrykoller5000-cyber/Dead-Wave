# GB-67 follow-up (Claude, 2026-09-27): the marine fell to a swipe under the real basis

Changed:
- Found it, and it's host wiring in index.html, not the engine, so it's not CL-68.
  - `updateMarinePose` writes only some of a joint's angles. The marine's hips (`lowerBody`) get their yaw and roll every frame but never their pitch. Other joints are eased from last frame's value.
  - After his body wrote its pose, the next frame's animation kept the body's pitch and lean. `body.follow()` read that back as the animation, so the body chased its own lean.
  - A 0.05 m/s tap had him stepping and then falling within 0.6–0.9 s. So did legs tone 1.0.
  - Probed headless: the animation's pelvis point jumped ±0.3–0.6 m while the marine group and `player.position` sat still.
  - The old fakethree didn't carry a written quaternion back into the Euler angles, which hid it. Three on the GPU always did, so this was a real bug in the game since GB-67.
- Fix: his animation's own pose is kept each frame, right after `body.follow()` reads it and before `body.apply()` writes over it. It's put back at the top of the next `updateMarinePose`. The animation carries on from its own values, as if no body had touched them.
  - The joints are the adopted rig's (`inst.R`, 15 of them).
  - This only runs once his body has been used. An asleep body leaves nothing to put back.
- CL-67's `body.shift(dx, dy, dz)` is now used. While he's on his feet, whatever moves him on the host side (GB-50's slide, his walk, the ground) moves his body's points and planted feet with him. When he's down, his body's drift moves the host instead, as before.
- GB-50's knee stays skipped when his body takes the blow. I tried it back on with the shift in: a brute's blow still put him down (3/3: stagger, step, fall, 1.9 m back). So the GB-67 rule stands.
- Jerry's marine legs 0.30, tried in the game with this fix: he still can't stand (a swipe, a brute's blow and a 0.05 m/s tap all put him down). Claude's 0.65 is right, and marine.json is unchanged.
Files: index.html (`marineBodyJoints`, `marineAnimSnap`, `snapMarineAnim`/`restoreMarineAnim` after `marineDown`; `restoreMarineAnim()` first in `updateMarinePose`; `marineBodyHost` and the shift in `updateMarineBody`; `marineHit` notes where he was when his body wakes) tools/tests/t92.js (one new check, (4); nothing changed or removed).
Tests:
- t92: 10/0 twice. The new (4) is a 0.05 m/s tap: he stays up and it's over within 1.5 s. Without the fix it fell every time.
- t75: 16/0 twice alone.
- t59: 48/0 alone (Claude's number).
- Full suite: 1369 pass, 6 fail, down from 11 before this fix:
  - t75 "nobody inside him" (−0.19 m) and t59 (2.1 m short) fail only under suite load. Both pass alone.
  - t79 is its known 0.32 rad load flake.
  - tfish (Claude's fish) and t37 (the `#winMsg` count, ui/*) aren't mine.
Screenshots: none (headless).
Not verified: how he feels on Jerry's GPU.
Requests: to Claude, a reply covering what I found and did (below). Zombies have the same pattern of partial writes. It isn't fixed here.
Contract changes: none.

## How

The trail:
1. `b.points()` against `b.animPoints()` each 100 ms after a 0.05 m/s blade tap. P stayed over the feet, while A's pelvis jumped from 0 to +0.33 m, then −0.30, then +0.42 along z.
2. The marine group's matrixWorld and `player.position` didn't move. So the joints themselves were moving in the "animation".
3. `lowerBody` is the pelvis joint. `updateMarinePose` sets `lower.rotation.y` and `.z` only (lines ~16387). Three's Euler write keeps `.x` from the quaternion the body wrote, and motion.js's own "put back what I wrote" test (quaternion equals wroteQ) no longer matched after the partial write.

Zombies: `updateZombies` writes `legLG.rotation.x` only, `armLG.rotation.x += ...`, and the hips' x and z but not y (lines ~38011–38129). So a reacting zombie probably reads some of its own pose back as well. Their tests stand (t90/t93), so it's milder, but it may be part of t91's back-shot pitch. The same snapshot per awake body would fix it. I've proposed it to Claude rather than doing it unasked.