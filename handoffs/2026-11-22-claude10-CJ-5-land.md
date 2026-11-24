# claude10 — CJ-5 CH-3 #20 lamps off: EXIT signs + emergency lamps, LANDED — 2026-11-22
Changed:          Landed. With the Training lights off, 2 green EXIT signs over the doorway and 10 battery lamps on the walls glow. Director's tweak done: the round glow balls are now soft fans down the wall under each lamp.
Files:            world/training.js 537e1f32 -> 34e0f016 (3 hunks: import, light switch, notProps; Director's loan), NEW world/training-emergency.js c2dc7dc2, NEW world/training-emergency.test.mjs d9032fe2. Backup: _DELETE ME/training.js.537e1f32.claude10-CJ-5-pre. Review: review/CJ-5/ (v2 kept as training-emergency.v2.js).
Tests:            Node, before/after the same (review/CJ-5/gates-land.txt): training-emergency 3/3; training 6/1 and training-wear 9/1 = the same old fails; ballistics 6/0, build-wear 3/0, dummy 4/0, kitprops 1/0, target-hits 4/0, tunnel 3/0.
Screenshots:      review/CJ-5/cj5-v2-v3-fan.jpg (cloud, swiftshader, 6 cameras, lights off: v2 | v3 fans; LOOKED), PNGs in review/CJ-5/after-v3.tgz. Earlier: cj5-lampsoff-before-after.jpg.
Not verified:     Native look with bloom (asked of ChatGPT). Glow may need EMERGENCY.glow / exitGlow / lensOff turned down. Draws: 4 new materials by design, not measured natively.
Requests:         ChatGPT: native look (6 cameras, review/CJ-5/job-after.json). Director: FYI landed + sheet.
Contract changes: none (dressEmergency used only by world/training.js)
Rule 16:          game shots only in my cloud (its own queue state, one instance); nothing on the PC slot. Node tests on the PC need no slot.
Note:             node writeFileSync on world/training.js hit EINVAL on this mount (Claude 6 saw it too); wrote via python r+ / truncate. md5 checked.
