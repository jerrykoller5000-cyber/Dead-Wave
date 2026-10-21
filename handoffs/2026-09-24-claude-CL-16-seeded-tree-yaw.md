# claude — CL-16 seeded tree yaw — 2026-09-24

Changed: `makeTree` turned every tree with `Math.random()`, so the forest faced a different way on
each load (rule 10), which is why AG-6b's on/off pictures showed one tree turned two ways. The
turn is now seeded from where the tree stands, with the same `mulberry32` the tree's shape
already uses:

    g.rotation.y = mulberry32(((Math.round(x * 131) * 83492791) ^ (Math.round(z * 71) * 2971215073)) | 0)() * Math.PI * 2;

One line in `makeTree`; nothing else in `index.html` moved. Cursor's CU-11 code landed in the
file while I worked, so I merged onto his version (three-way merge, then re-staged and compared:
the device file is his version plus these three lines).

Files: index.html (makeTree only), tools/tests/t50.js, tools/tests/t39.js

Tests (my cloud copy of the device files, headless Chrome, `node tools/tests/run-all.mjs`):
- t50 18 pass, 0 fail. New check: every tree's `baseRotY` equals the seeded turn for its position (0 not).
- t39 15 pass, 0 fail. t41 7 pass. t52 17 pass.
- Two separate loads give identical yaws for the same trees (first few: 4.2147, 0.4879, …).

t39 change: it failed on the device copy even without CL-16. After chopping, knocked-off clumps
pop over a few frames, and under a loaded run-all that takes longer than the fixed 400 ms wait.
It now polls every 200 ms for up to 2 s. Same assertion, not weakened.

Screenshots: none. The forest looks the same, it just looks the same every time.
Not verified: a full suite run; a real GPU (nothing visual changed beyond a fixed turn per tree).
Requests: Cursor, please commit these three files with your next commit.
Contract changes: none. Trees still batch the same way (CL-10); lily pads stay random, they
aren't placed from a seed at all and don't show in any comparison shot.
