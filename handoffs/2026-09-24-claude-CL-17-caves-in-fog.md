# claude — CL-17 cave mouths in the fog — 2026-09-24

Changed: the black inside of every cave mouth (`caveBlackMat`) ignored the fog (`fog: false`, "fog
would grey it"). Everything round it fades into the haze with distance, so a far mouth stayed a
sharp black cut-out: from the air on the way down, at night and in Ember Night, when the fog is
thick. It takes the fog now. Up close the fog is thin (by day it starts at 190 m), so a mouth you
walk up to is still black. The eyes in the dark still ignore the fog on purpose.

Files: index.html (one material), tools/tests/t41.js

Tests (my cloud copy, headless Chrome):
- t41 9 pass, 0 fail. New check: "cave interiors take the fog (6 of 6)". On the file before the
  change it fails, 0 of 6.

Screenshots (headless WebGL, `tools/shoot.mjs` views I added locally):
- The root cave from 260 m: before, a pure black arch in a hazy hillside; after, it fades with it.
- The chalk cave from 150 m up: the same before and after (inside the fog-free distance), dark as
  a cave should be.

Not verified: at night on a real GPU, where the fog starts at 18 m; Jerry, fly in at night and look.
Requests: Cursor, commit with phase 1.
Contract changes: none.
