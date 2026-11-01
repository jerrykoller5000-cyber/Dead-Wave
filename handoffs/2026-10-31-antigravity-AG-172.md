Changed:
- `qa/2026-10-31-AG-172/run-ag172.mjs`: Automated `CL-281` v4 QA runner capturing all 11 viewmodel screenshots (including `vm-reload-seat.png` at `at=0.50` and `vm-reload-seat-058.png` at `at=0.58`) and probing `TT.drawsOf(TT.marine)` + world-vertex screen projections in `vm-look-down.png`.
- `qa/2026-10-31-AG-172/realtest-tcl281.txt`: Output of `node tools/realtest.mjs tcl281 --all` (`40 pass, 0 fail`).
- `qa/2026-10-31-AG-172/ag172-summary.json`, `qa/2026-10-31-AG-172/*.png`, `qa/2026-10-31-AG-172/report.md`: Full `CL-281` v4 screenshot suite, `TT.drawsOf(TT.marine)` mesh breakdown, and comparative report against `AG-171` (v3).

Tests:
- `node crew/crew.mjs slot run antigravity AG-172 --checks "realtest:tcl281,vmsheet:ag172" -- node qa/2026-10-31-AG-172/run-ag172.mjs`:
  - `node tools/realtest.mjs tcl281 --all`: **`40 pass, 0 fail` in `36.8s`** on the real WebGPU renderer, including the new `CL-281` v4 check:
    `PASS racking the slide, the support forearm runs down out of the view, at least 35 degrees below level on screen (53)` (`53°` minimum across the entire `work` phase).

Not verified:
- Rifle, shotgun, and rocket launcher viewmodel poses (out of scope for `CL-281` pistol slice).

---

## 1. `CL-281` v4 Reload 4 Beats (`qa/2026-10-31-AG-172/`) Scored Against `AG-171` (v3)

| Shot | Phase (`at` -> `u`) | `wristL` NDC / `elbowL` NDC (`steepL`) | `wristR` NDC / `elbowR` NDC (`steepR`) | `AG-171` (v3) | `AG-172` (v4) | Assessment vs `AG-171` (v3) |
|---|---|---|---|---|---|---|
| `vm-reload-grab.png` | `at=0.14` -> `u=0.198` (`mag="hand"`, `hand="below"`) | `[0.018, -1.122]` / `[-0.312, -2.388]` (`65.1°`) | `[0.438, -0.397]` / `[0.865, -1.509]` (`55.7°`) | `4.6 / 5` | **`4.6 / 5`** | Clean canted right-hand hold while the support hand drops the spent magazine below the frame (`steepL = 65.1°`). *(Note: `shot()`'s `30 ms` settle + `evaluate` overhead advances `u` by `~0.06` after breaking at `at = 0.14`; triggering at `at = 0.08` captures `u ≈ 0.14` while the support hand is still at the magwell.)* |
| `vm-reload-pouch.png` | `at=0.40` -> `u=0.474` (`mag="hand"`, `hand="below"`) | `[0.027, -1.084]` / `[-0.296, -2.321]` (`65.0°`) | `[0.438, -0.391]` / `[0.865, -1.501]` (`55.6°`) | `4.7 / 5` | **`4.7 / 5`** | Support hand rises from the pouch with the `GB-260` scaled magazine (`40×46 mm` body + `52×54 mm` floorplate) visible at bottom-center approaching the well (`u = 0.474`; use `at = 0.28` if `vmsheet.mjs` wants the pure empty-well pouch beat `mag === "pouch"`). |
| `vm-reload-seat.png` | `at=0.50` -> `u=0.569` (`mag="hand"`, `hand="well"`) | `[0.150, -0.711]` / `[-0.145, -1.817]` (`64.5°`) | `[0.439, -0.369]` / `[0.864, -1.470]` (`55.6°`) | `4.3 / 5` (at `at=0.58`) | **`4.8 / 5`** (at `at=0.50`) | **Major improvement over `at=0.58` (`vm-reload-seat-058.png`, `u=0.653`, `4.3 / 5`)**: At `at=0.50` (`u=0.569`), the support palm squarely cups the magazine floorplate and drives the magazine up into the pistol's magwell, with both forearms descending cleanly (`64.5°` and `55.6°` below horizontal) and zero wrist pinch or cuff artifacts. |
| `vm-reload-slide.png` | `at=0.78` -> `u=0.821` (`mag="seated"`, `hand="work"`) | `[0.376, -0.389]` / `[-0.209, -2.105]` (`58.8°`) | `[0.502, -0.297]` / `[1.295, -1.575]` (`42.2°`) | `3.4 / 5` | **`4.6 / 5`** | **Finding 1 (`AG-171`) Fixed**: Rolling the pistol inward (`VM_RELOADS.pistol.gun` at `0.68, 0.80, 0.90`: `roll 0.55, 0.60, 0.42`) completely eliminated the horizontal sleeve banner across the screen! The support forearm now comes up from low-left at **`58.8°` below horizontal** (`elbowL_ndc.y = -2.105`), the gloved left hand grips the rear slide serrations from above, and the pistol's muzzle and red front sight remain visible to the upper-left of the support hand. |

---

## 2. Finding 2 (`vm-look-down.png`): Exact `TT.drawsOf(TT.marine)` Paths & Parent Names for the Antenna, Cable, and Chest Carrier

### Parent Group & Why They Draw in the Eye's Pass
- **Parent Group**: Every single one of the meshes projecting into `vm-look-down.png` is a direct child of **`TT.marine.userData.torsoG`** (`const torsoG = new T.Group(); torsoG.position.y = 0.7; root.add(torsoG)` at `index.html:19292` / `studio/marine-body.js:305`), which is an **unnamed `Group`** under `TT.marine`.
- In `index.html:19639`, `mergeRigidMeshes(g, gearParts, ...)` merges all rigid children of `torsoG` by material + `gearParts` bucket (`vest`, `bareTorso`, or always-on torso), creating unnamed `Mesh` children directly under `TT.marine.userData.torsoG` (so `TT.drawsOf(TT.marine)` reports `path: "(unnamed)"` for all of them).
- Furthermore, those chest rig / radio / antenna / cable meshes are stored in the **`TT.marine.userData.gearParts.vest`** array (`11` merged meshes).
- When `T.grantAllWeapons()` enables `gearParts.vest`, `syncRigSkins()` in `studio/marine-skin.js` un-hides them as individual draws (either because `parts.length < 2` for a textured material, or after `CHURN_N = 3` bakes — `rig.bakes = 11` after `grantAllWeapons()`).
- Because `bakeRigSkin` at `index.html:19686` only splits `[[armLG, armRG]]` (NOT `torsoG`) and `eyeHideSet()` in `game/viewmodel.js:121-139` only walks `ud.armLG`, `ud.armRG`, `ctx.stowed()`, `ARM_CLOTH`, and `gunSrc`, **every mesh under `TT.marine.userData.torsoG` remains `vmEyeHide = false` in the eye's pass**.

### Exact `TT.drawsOf(TT.marine)` Indices Projecting On-Screen in `vm-look-down.png`

| `drawsOf(TT.marine)` Index | `drawsOf` `path` | `drawsOf` `mat` (`color`) | `verts` (`onScreen`) | Parent / Bucket | Screen NDC Box in `vm-look-down.png` | Exact Geometry & Source Lines in `studio/marine-body.js` |
|---|---|---|---|---|---|---|
| **`[95]`** | `"(unnamed)"` | `"MeshStandardMaterial"` (`#2c3038` = `nvgMat`) | `792` (`678`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [0.093, 0.785]`, `y: [-1.049, -0.130]` | **The Whip Antenna + Radio + Black PTT Cable** (`studio/marine-body.js:380-386`, merged into one `nvgMat` mesh under `torsoG`):<br>• **Line 386**: `const antenna = v(cyl(.0035,.0035,.17,nvgMat,5), -.158, 1.185, .19); antenna.rotation.z = .1;` (**the diagonal black whip antenna** on the right)<br>• **Line 384**: `torsoSeam([[-.143,1.116,.19],[-.113,1.159,.144],[-.08,1.181,.113],[-.063,1.142,.144],[-.067,1.115,.186]], nvgMat, 'vest', .003)` (**the curved black PTT cable** under the pistol grip)<br>• **Line 385**: `v(rmesh(.022,.035,.012,nvgMat,.004), -.065, 1.105, .189)` (PTT box)<br>• **Lines 380, 383**: radio body & knobs |
| **`[92]`** | `"(unnamed)"` | `"wear:carrier"` (`#4c5138` = `carrierMatW`) | `3264` (`1309`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.717, 0.621]`, `y: [-1.043, -0.699]` | **Plate carrier front/back plate bags + shoulder straps + cummerbund** (`studio/marine-body.js:355-368`) |
| **`[94]`** | `"(unnamed)"` | `"wear:carrier"` (`#34382c` = `carrierPouchW`) | `2448` (`865`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.394, 0.266]`, `y: [-1.047, -0.738]` | **Triple front rifle mag pouches + chest admin pouch** (`studio/marine-body.js:370-378`) |
| **`[97]`** | `"(unnamed)"` | `"wear:pack"` (`#5a6b3e` = `packMatW`) | `1536` (`47`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.635, 0.573]`, `y: [-1.024, -0.566]` | **Assault pack front shoulder harness straps** (`studio/marine-body.js:418-427`) |
| **`[87]`** | `"(unnamed)"` | `"MeshStandardMaterial"` (`#2b2e24` = `strapMat`) | `1752` (`386`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.608, 0.450]`, `y: [-1.048, -0.572]` | **Carrier/pack retention straps** (`studio/marine-body.js:369, 376, 428-433`) |
| **`[93]`** | `"(unnamed)"` | `"MeshStandardMaterial"` (`#2f3326` = `webMat`) | `792` (`166`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.407, 0.404]`, `y: [-1.046, -0.610]` | **MOLLE webbing rows on chest carrier** (`studio/marine-body.js:362-363, 379`) |
| **`[90]`** | `"(unnamed)"` | `"MeshStandardMaterial"` (`#7a7c74` = `buckleMat`) | `360` (`134`) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [-0.658, 0.457]`, `y: [-1.022, -0.567]` | **Shoulder & chest strap buckles** (`studio/marine-body.js:369, 430`) |
| **`[46, 47, 48]`** | `"(unnamed)"` | `"MeshStandardMaterial"` (`#c8c8c0`, `#1e2a48`, `#b03030`) | `24` each (`24` each) | `TT.marine.userData.torsoG` (`gearParts.vest`) | `x: [0.062, 0.351]`, `y: [-0.907, -0.698]` | **Chest patch plate (`patchMat`, `patchInk`, `patchRed`)** (`studio/marine-body.js:389-393`) |
| **`[85]`** | `"(unnamed)"` | `"wear:shirt"` (`#e2ded0` = `shirtMatW`) | `7584` (`1`) | `TT.marine.userData.torsoG` (always-on) | `x: [0.475, 0.475]`, `y: [-1.013, -1.013]` | **Upper torso shirt/collar mesh under `torsoG`** (`1` vertex at bottom edge; plus `drawsOf(TT.marine)[146]` `"rig-skin"`, `3` vertices at `y: [-1.045, -1.020]`) |

### Recommended Fix for `CL-281`
- To take the antenna, PTT cable, and upper chest carrier out of the eye's pass while keeping them in the shadow pass:
  1. In `index.html:19686` (`bakeRigSkin` call), include `torsoG` in `split` (`split: [[armLG, armRG, torsoG]]`) so `torsoG` isn't baked into the main `"rig-skin"` mesh before `CHURN_N` bakes.
  2. In `game/viewmodel.js` `eyeHideSet()`, walk `ud.torsoG` (skipping `ud.headG` if needed, though `headG` is already hidden in FPS) — or walk `ud.gearParts?.vest` and `ud.gearParts?.bareTorso` if you want to hide only the chest rig/antenna/cable while keeping the bare `torsoG` shirt mesh.
