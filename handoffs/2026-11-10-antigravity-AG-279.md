# Antigravity — AG-279 J120: The Flames: Higher Fidelity, Black Char in Training Ground, No Decals Over Flames — 2026-11-10

Changed: Addressed Jerry's playtest feedback for J120 regarding the flamethrower's visual stream and Training Ground interaction:
  1. No Decals Over Flames (renderOrder sorting):
     - Identified root cause: Transparent decals (wall wear in `world/training-wear.js`, impact marks in `world/training-ballistics.js`, build room wear in `world/training-build-wear.js`) use `renderOrder = 1` with `depthWrite: false`. Flame stream particles acquired via `acquireEffectMesh` previously defaulted to `renderOrder = 0`. As a result, transparent wall wear decals and bullet holes rendered after the flames, drawing on top of and superimposing over the flame stream when firing toward walls.
     - Fixed in `index.html`: Set `p.mesh.renderOrder = 3` on all flame blobs and `flare.renderOrder = 3` on the nozzle flare. Transparent flames now consistently sort and render on top of wall decals, impact bullet holes, and char marks (`renderOrder = 1`).
  2. Higher Fidelity Flame Stream:
     - Geometry upgrade: Upgraded `flameGeo` from `IcosahedronGeometry(0.1, 0)` (20 flat faceted faces, low-poly crystal appearance) to `IcosahedronGeometry(0.1, 1)` (80 smooth triangular faces with interpolated normals), yielding smooth, organic fiery puffs.
     - Combustion stages (`FLAME_STAGES`): Restored combustion gradient starting with a brilliant incandescent white/yellow-hot core right at the nozzle tip (`[0.06, flameCoreMat]`), transitioning into rich hot orange (`[0.38, flameStreamHotMat]`), cooling into deep fiery red (`[0.65, flameMat]`), and finishing in billowy dark smoke (`[2, flameSmokeMat]`). Peripheral edge blobs (`p.edge`) start in hot orange and quickly feather into dark sooty edges (`flameEdgeMat`).
     - Velocity aerodynamics: Added velocity-aligned elongation (`quaternion.setFromUnitVectors(AXIS_Z, _flameDir)`) while speed > 3.5 m/s and age < 0.45, dynamically stretching high-velocity fuel blobs along their trajectory vector, then transitioning smoothly into expanding, tumbling spherical billowing clouds as drag slows them down.
  3. Black Char Marks on Training Ground Surfaces:
     - Created and exported `createTrainingChar(T, tg)` in `world/training-ballistics.js` with `CHAR_LIFE = 30` and `CHAR_FADE = 6`. Generates a procedural 64x64 organic carbon soot / ash splatter texture on double-sided quads batched into `tg.group` (128 quads) and `tg.targets[i].pivot` (16 quads each, hinging with the target plate).
     - Quads feature `renderOrder = 1`, `polygonOffset: true` (`factor: -1, units: -1`), normal offset (`+0.018`), random rotation around normal, and variable scale (0.34-0.48m on walls/floor, 0.18-0.26m on target plates).
     - Proximity rate limiting: Consecutive hits within 18cm within 0.12s refresh lifetime without consuming duplicate quad slots, allowing sweeping flame streams to paint continuous scorched soot trails while holding on a spot deepens the burn cleanly.
     - Collision integration in `updateFlameStream(dt)`: When `training.active && training.tg`, flame particles trace collision against `tg` geometry using `traceTraining`. On hit: sets particle position to `hit.point`, stamps char mark via `training.char?.add(hit)`, deflects velocity along surface normal, and grounds particle. Target hits trigger `rangeContacts` during drills or `trainingHitTarget` during free practice. Outdoor ground fire generation and outdoor terrain height sampling are bypassed inside the Training Ground bunker (`!training.active`).
     - Training lifecycle: Initialized in `enterTraining`, primed during WebGPU pipeline warmup in `prepareWarmup`, updated per frame in `updateTraining`, and cleared in `leaveTraining`.

Files:
  - `world/training-ballistics.js` (`createTrainingChar`, `CHAR_LIFE`, `CHAR_FADE`, `createTrainingImpacts` headless guard)
  - `world/training-ballistics.test.mjs` (unit tests for char mesh `renderOrder === 1`, mark additions on floor/wall/target, warmup, update decay, and clear)
  - `index.html` (flame stream geometry, materials, renderOrder, velocity orientation, Training Ground collision & char)
  - `tools/tests/tag279.js` (18-assertion test suite verifying renderOrder, geometry detail, firing, and char generation)
  - `handoffs/2026-11-10-antigravity-AG-279.md`

Tests:
  - `node world/training-ballistics.test.mjs`: 6 pass, 0 fail.
  - `node world/training.test.mjs`: 6 pass, 0 fail.
  - `node world/training-wear.test.mjs`: 10 pass, 0 fail.
  - `node tools/tests/run-all.mjs tag279 tcb247 --agent antigravity --task AG-279 --jobs 1`: 32 pass, 0 fail (tag279 18 pass, 0 fail; tcb247 14 pass, 0 fail; verified flare renderOrder 3, char/impact marks renderOrder 1, flame particles renderOrder 3, smooth icosahedron geometry, flamer firing in Training Ground leaving char marks, direct plate hit, and range computer prop fade).

Not verified:
  - Flamer hose detach on reload and gauge reposition to weapon back (assigned to ChatGPT per J120 note).
  - Target burning to ash / range computer lockout (assigned to Grokbot / Cursor per J120 note).
  - Hose clipping through arm (assigned to Claude per J120 note).
  - Subsequent queued task AG-280 (chainsaw effects: sparks on metal, splinters on wood, blood).

Contract changes: none.
