# antigravity — AG-154 Pike behind his tree, and three small fixes, on the GPU (CL-263, CL-267) — 2026-10-29
Changed:          Captured and verified GPU visual outputs for CL-263 and CL-267 on the NVIDIA GeForce RTX 5080 through the game-testing slot. (1) Part 1 (CL-263 match camera): captured 4 shots and contact sheet in `review/sweep/pike-hide-2/` (`camp-three.png`, `camp-top.png`, `pike-close.png`, `pike-from-fire.png`, and `sheet.jpg`), measuring campsite fire at `(-1.98, 1.17, -81.68)` and Pike hide spot at `(-2.22, 3.50, -91.68)`. Visual finding: Pike STILL stands in open grass with zero tree cover because `treeHide` in `index.html` (lines 8727-8738) found no alive trees in the 9..22 m range along the outward arc (`da <= 1.2`) from the hikers' camp, falling back to `else hide` which placed Pike at `x = -2.22, z = -91.68` (identical to AG-152). (2) Part 2 (CL-267 inspector): captured all 13 subjects (26 shots across `props`, `animals`, and `person.brandt`) and contact sheet in `review/principles/claude/after-2/`. All 31 output images are verified non-black on disk (109 KB to 1.53 MB). Verified all three CL-267 fixes: (a) `prop.marrow-door` backing light geometry now follows the arch outline with zero corner protrusion above apex in three view; (b) `animal.frog` now displays proper muted pond olive (`0x56693c`); (c) `person.brandt` boonie hat brim now correctly maps the camo texture.
Files:            review/sweep/pike-hide-2/camp-three.png, review/sweep/pike-hide-2/camp-three.json, review/sweep/pike-hide-2/camp-top.png, review/sweep/pike-hide-2/camp-top.json, review/sweep/pike-hide-2/pike-close.png, review/sweep/pike-hide-2/pike-close.json, review/sweep/pike-hide-2/pike-from-fire.png, review/sweep/pike-hide-2/pike-from-fire.json, review/sweep/pike-hide-2/sheet.jpg, review/principles/claude/after-2/sheet.jpg, review/principles/claude/after-2/*.png, review/principles/claude/after-2/*.json, qa/2026-10-29-AG-154/run.mjs
Tests:            Visual inspection and screenshot verification through shared game-test slot (`qa/2026-10-29-AG-154/run.mjs`); 31/31 PNG/JPG outputs verified non-black and size-validated.
Screenshots:      review/sweep/pike-hide-2/sheet.jpg, review/sweep/pike-hide-2/camp-three.png, review/sweep/pike-hide-2/camp-top.png, review/sweep/pike-hide-2/pike-close.png, review/sweep/pike-hide-2/pike-from-fire.png, review/principles/claude/after-2/sheet.jpg, review/principles/claude/after-2/prop.marrow-door-three.png, review/principles/claude/after-2/animal.frog-three.png, review/principles/claude/after-2/person.brandt-three.png
Not verified:     Game code changes (none made; inspection role only per rule 16 and card guidelines).
Requests:         Request filed to Claude regarding CL-263 `treeHide` search radius / outward direction arc.
Contract changes: none

## Findings & Visual Verification

### 1. CL-263: Pike's Hiding Spot (`review/sweep/pike-hide-2/`)
- **Hardware**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`, `1600x900`.
- **Outputs**:
  - `camp-three.png` (`1,533,051` bytes)
  - `camp-top.png` (`1,442,255` bytes)
  - `pike-close.png` (`917,723` bytes)
  - `pike-from-fire.png` (`1,046,254` bytes)
  - `sheet.jpg` (`98,905` bytes)
- **Coordinates & Measurement**:
  - Campfire: `x = -1.98, y = 1.17, z = -81.68`
  - Pike spot (`T.historyProps.pikeHide`): `x = -2.22, y = 3.50, z = -91.68`
  - Distance fire to Pike: `10.00 m`
- **Visual Note (ISSUE DETECTED)**:
  - In `pike-close.png`, `pike-from-fire.png`, and `sheet.jpg`, Pike is standing completely exposed in open grass on the uphill slope.
  - Root cause in `index.html` lines 8726-8747: `treeHide` looks for trees 9 to 22 m out within `Math.abs(da) <= 1.2` of `out = Math.atan2(camp.z, camp.x)`. In the actual world generation at the hikers' camp, there are no alive trees in that range and sector (the nearest tree is `24.19 m` away at `(-1.61, -67.49)`).
  - Consequently, `treeHide` remained `null`, falling back to `else hide` at `r = 10, da = 0`, placing Pike at `x = -2.22, z = -91.68`—exactly the same open grass spot as in AG-152.
  - To put Pike behind an actual tree, the search sector/distance needs broadening or a designated pine placed near the camp perimeter.

### 2. CL-267: Three Fixes & Inspector Models (`review/principles/claude/after-2/`)
- **Outputs**: 26 PNGs (`109 KB` to `673 KB`) and `sheet.jpg` (`325,793` bytes).
- **CL-267 Fix Verification**:
  1. **Marrow Door Arch Backing Light (`prop.marrow-door`)**:
     - `prop.marrow-door-three.png` (`672,815` B) & `prop.marrow-door-front.png` (`439,999` B).
     - **PASS**: The backing black crack-light sheet (`marrow-crack-light`) was reshaped with `THREE.ShapeGeometry` following the door's arch outline (`px = x * 0.92, py = Math.max(0, y * 0.97)`). The rectangular black corners that previously protruded above the curved arch apex in `three` view are completely gone. Seam and relief look natural.
  2. **Frog Coloration (`animal.frog`)**:
     - `animal.frog-three.png` (`216,619` B) & `animal.frog-front.png` (`114,998` B).
     - **PASS**: The body and leg material (`frogBodyMat`) is now an authentic pond olive (`color: 0x56693c, roughness: 0.7`), replacing the earlier overly bright synthetic green. Dorsal ridge, eye rim, and pale throat integrate smoothly.
  3. **Brandt Boonie Camo Brim (`person.brandt`)**:
     - `person.brandt-three.png` (`615,185` B) & `person.brandt-front.png` (`346,902` B).
     - **PASS**: The boonie hat brim geometry now receives `vExtra` radial UV scaling in `studio/marine-hats.js` (`loft`), correctly sampling the multi-row woodland camouflage texture. The brim is no longer washed out or plain cream; it fully shares the camo pattern with the crown.
- **Other Models on Contact Sheet**:
  - `prop.dropped-helmet`: high-cut shell rolled on side, unclipped strap curled in dirt, interior liner visible.
  - `prop.insulated-boots`, `prop.rubber-boot`, `prop.worn-boots`: sculpted lugged soles and muddy shafts.
  - `prop.standing-stone` & `prop.ring-stone`: weathered mottled stone with rosette lichen colonies.
  - `prop.reliquary`: plinth with corner feet, askew lid with raised cross, holy grenade inside, moss tufts on joints.
  - `animal.squirrel`, `animal.butterfly`, `animal.turtle`: all clean geometry and textures.
