# AG-311 — Authoritative RTX 5080 WebGPU Look: GP-20108 Training Ground Ceiling (4 Lights, Lights Off + Torch, 3P Cutaway, Bullet Marks, J128 Audit)

- **Agent:** `antigravity` (`Claude Opus 5.5 (high)`)
- **Date:** `2026-11-11`
- **Target Card:** `GP-20108` (`ChatGPT`, `game/training-ceiling.js`, `J140` / `D-161`)
- **Note on Superseding 21:21Z Automation Draft:** Overwrites the premature `21:21Z` background `/automation` draft (`ag311-ceiling-look-v2.mjs`), whose 4 lighting shots had identical `worldTime` (`advanceSkyClock` reset) and missed close-up `J128` seating gaps, beam/duct intersections, and hanging-baffle ballistics.

## Changed:
- `qa/2026-11-11-AG-311/gp20108-5080-v3.mjs` & `qa/2026-11-11-AG-311/retake-impact-shot.mjs`: Deterministic offscreen RTX 5080 WebGPU verification (`1280x720`, `-3800,-3800`, `--jobs 1` inside shared game-test slot) holding world sun/hemi/ambient/moon presets via `TT.inspectHost().attach(...)` through `postProcessing`, testing all 7 indoor Training Ground zones, 3P cutaway visibility & camera collision, live upward projectiles, and `J128` part-to-part millimetre geometry checks.
- `qa/2026-11-11-AG-311/build-sheets.py`: Contact sheet builder + true pixel luminance/clipping analyzer.
- `review/AG-311/sheet-gp20108-lanes-4lights.jpg`, `review/AG-311/sheet-gp20108-areas-and-3p.jpg`, `review/AG-311/sheet-gp20108-j128-and-impacts.jpg`, `review/AG-311/gp20108-5080-summary.json`, and 27 validated PNGs in `review/AG-311/shots/`.

## What Passes on RTX 5080 WebGPU:
1. **Static Bake & 1P/3P Draw Cost (`gp20108-5080-summary.json`):**
   - `57` static ceiling child meshes bake into `4` material batches + `1` concrete deck (`baked: { merged: 4, removed: 57 }`).
   - Firing line `1P` looking `45°` up downrange: `169` draws (`85,343` tris) without ceiling -> **`174` draws (`86,169` tris) with ceiling (`+5` draws, `+826` tris)**; `+0` draws in `3P`.
2. **True Four Lights + Wall Switch OFF + Flashlight (`review/AG-311/sheet-gp20108-lanes-4lights.jpg`):**
   - **Firing line (`z = -3`, `45°` up downrange):** `noon` luma `44.69` (`fe1ff3cd93ab`), `overcast` `34.80` (`ac31912cdf6b`), `dusk` `29.53` (`4aa7e2704456`), `night` `25.02` (`75f3ae679108`), `lights-off` `22.05` (`5e7a629915c2`), `lights-off-torch` `24.09` (`c1a000290f2a`). `0.0%` blown pixels across all 6 modes.
   - **Mid-range (`z = +14`, `45°` up back toward firing line):** `noon` luma `46.01` (`077cfa8a1440`), `overcast` `37.53` (`bd0db8e4898a`), `dusk` `31.86` (`3b4bf791da71`), `night` `27.91` (`f9d4c8be98c1`), `lights-off` `20.39` (`7ace182ae27b`), `lights-off-torch` `23.38` (`aa6157a3d7c5`). `0.0%` blown pixels.
3. **All 7 Indoor Zones + 3P Overhead Cutaway (`review/AG-311/sheet-gp20108-areas-and-3p.jpg`):**
   - Zero sky/void leaks overhead across Firing Line (ON/OFF), Armory/Stations (`y = 6 m`), Apron, Infirmary, HQ Ladder, Hangar (`24 m` truss deck), and Containment Passage (`6.3 m` roof).
   - In `3P`: `tg.ceiling.root.visible === false`, `tg.cutaway.ignoreSolid(tg.ceiling.solid) === true`, `cameraCollision.pull(head, eye)` hits `ceiling === false`; overhead gameplay and wide views are 100% unobstructed.
4. **Ceiling Deck Bullet Impacts (`review/AG-311/sheet-gp20108-j128-and-impacts.jpg`, top-left `33a37a3e6577`):**
   - 5 live upward pistol rounds (`T.fireRoundDbg` + `T.stepProjectilesDbg`) strike `solid.ceiling` at `y = 5.975` (`normal = [0, -1, 0]`) and leave 5 crisp radial impact craters on the `y = 5.985` ceiling deck.

## Defects Found in `game/training-ceiling.js` (Sent to `ChatGPT` & `CLAUDE DIRECTOR`):
Proof close-ups in `review/AG-311/sheet-gp20108-j128-and-impacts.jpg`:
1. **Floating Sprinkler Drop Nozzles (`20.0 mm` mid-air gap, `J128` breach, `game/training-ceiling.js:60-63`):** At all 5 sprinkler stations (`x = -7.25, z = -7, 1, 9, 17, 25`), `CylinderGeometry(.018, .052, .20)` centered at `y = 5.64` (`y = [5.540..5.740]`) floats **`20.0 mm`** in mid-air below the ceiling bracket (`minY = 5.760`). (`closeup-sprinkler-floating-z1.png`)
2. **Floating Sprinkler Deflector Cones (`5.0 mm` mid-air gap, `J128` breach, `game/training-ceiling.js:64`):** At all 5 sprinkler stations, `ConeGeometry(.14, .05)` centered at `y = 5.51` (`y = [5.485..5.535]`) floats **`5.0 mm`** in mid-air below the nozzle bottom (`minY = 5.540`). (`closeup-sprinkler-floating-z1.png`)
3. **Cross-Beams Slice Through Galvanized Supply Duct & `z = 9` Sprinkler Bracket + `10 mm` / `100 mm` Gaps (`J128` breaches, `game/training-ceiling.js:38, 57-61`):**
   - All 7 steel cross-beams (`box(15.8, .07, .12)` at `y = 5.94`, `z = -9, -3, 3, 9, 15, 21, 27`) pass straight through the galvanized supply duct (`x = [6.83..7.41], y = [5.525..5.985]`) (`closeup-duct-beam-clash-z3.png`), and the `z = 9` cross-beam intersects the `z = 9` sprinkler bracket (`closeup-sprinkler-beam-clash-z9.png`).
   - Cross-beams also float **`10.0 mm` below** the `y = 5.985` concrete deck (`maxY = 5.975`) and stop **`100.0 mm` short** of the `x = ±8.00` range side walls (`x = ±7.90`), while the supply duct penetrates `65 mm` into its own top steel rail (`y = [5.920..5.990]`).
4. **Fixture Lens Gap (`1.0 mm` > `0.5 mm` `J128` limit) & Rotated Baffle Overlaps (`game/training-ceiling.js:44-54`):**
   - All 7 linear lenses (`maxY = 5.854`) sit `1.0 mm` below their steel cages (`minY = 5.855`).
   - On all 6 angled safety baffles (`rx = -0.12`), the rubber facing sits `12.0 mm` inside the `0.18 m` steel baffle plate, and the rotated baffle top penetrates ~`122 mm` into its `0.26 m` ceiling hanger (`closeup-baffle-end-z5_4.png`).
5. **6 Hanging Safety Baffles Lack Ballistic Solids (`game/training-ceiling.js:78-84`):**
   - Only the `y = 6.0` deck is registered in `tg.solids`. Upward rounds aimed straight into a hanging safety baffle (`z = 5.4`, `y = 4.84..5.85`, ray crossing `z = 5.4` at `y = 5.511`) pass straight through the steel/rubber baffle and impact the `y = 5.975` concrete deck behind it (`baffleHasOwnSolid: false`). (Any added baffle solids should also carry `ceiling: true` so `cutaway.ignoreSolid` and `3P` `cameraCollision` ignore them.)

## Tests:
- `node tools/tests/run-all.mjs t38 t182 t219 t310 --agent antigravity --task AG-311 --jobs 1` -> PASS (`89 pass, 0 fail`).
- `gp20108-5080-v3.mjs` + `retake-impact-shot.mjs` + `build-sheets.py` inside `crew.mjs slot run` -> PASS (`27` validated captures, `0` page errors, all 3 sheets multimodally verified).

## Not verified:
- Re-verification of `game/training-ceiling.js` after `ChatGPT` repairs the 5 `J128`/ballistic-solid items above.
