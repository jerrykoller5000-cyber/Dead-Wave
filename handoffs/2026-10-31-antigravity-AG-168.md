# AG-168: CL-281 Stage 1 GPU Verification — First-Person View Gun (M9 Pistol)

**Date:** 2026-10-31  
**From:** Antigravity (`Gemini 4 Argon (High)`)  
**To:** Claude (`CL-281`), Jerry  
**GPU:** NVIDIA GeForce RTX 5080 (WebGPU backend, native 1280×720)  
**Target:** `CL-281` Stage 1 (`game/viewmodel.js`, `game/viewmodel-poses.js`, `studio/fp-arms.js`, `studio/marine-skin.js`, `index.html`)  
**Artifacts:**
- Contact Sheet: `qa/2026-10-31-AG-168/sheet.jpg` (`2000×2162`, 24-tile side-by-side comparison vs `?vm=0` and `AG-164`)
- Full Report: `qa/2026-10-31-AG-168/report.md`
- Raw Shots: `qa/2026-10-31-AG-168/*.png` (23 PNG captures)
- Telemetry & Bench Data: `qa/2026-10-31-AG-168/ag168-results.json`

Changed: `qa/2026-10-31-AG-168/*`, `handoffs/2026-10-31-antigravity-AG-168.md`
Tests: `node tools/realtest.mjs tcl281 --all` (36/0), `node tools/realtest.mjs t284` (7/0), `node tools/realtest.mjs t279` (17/0), `node tools/realtest.mjs t280` (13/0), `node tools/realtest.mjs t291` (13/0), `node tools/vmsheet.mjs --out qa/2026-10-31-AG-168`, 4x30s Night-20 `--gfx high --prof` benchmarks
Not verified: Other 7 weapons on view-gun system (`CL-281` stages 2–4 pending)

---

## 1. Real-Renderer Suite Checks (`tools/realtest.mjs` on RTX 5080)

All 5 suites were run through the game-test slot on the real RTX 5080 WebGPU renderer (no `--soft`):

| Command / Test | Result | Time | Notes |
| :--- | :---: | :---: | :--- |
| `node tools/realtest.mjs tcl281 --all` | **36 pass, 0 fail** | `36.8s` | All 36 view-gun assertions pass (`raise 1.00`, `258/258` arm meshes & `20/20` pistol meshes hidden from eye pass, `3/9` split rig skins hidden, shadow pass retained, wrists `0.00 cm` socket error, firing grip `0.09 cm`, wrist bend `0.61/0.61 rad`, nearest mesh `21.2 cm` across `24` meshes, hip `ndc (0.39, -0.74)` canted `-6.8°`, ADS sights `(0.000, 0.000)` within 1 px at 1080p, eye distance `0.000 m`, recoil kick `+1.5 cm`, reload state & palm ride `0.00 cm` error, clean teardown on M4 & 3P). |
| `node tools/realtest.mjs t284` (post-`GB-262`) | **7 pass, 0 fail** | `50.1s` | `PASS pistol aimed: rear -0.000 front 0.000 (ndc y, view gun)`, plus revolver, uzi, m4, ak, aa12, launcher all pass. (Pre-`GB-262` run logged the expected 6 pass / 1 fail on pistol `rear -1.320 front -0.708` because `t284` measured the world pistol while the eye stayed at his eyes.) |
| `node tools/realtest.mjs t279` | **17 pass, 0 fail** | `40.7s` | First-person view & transition checks pass on real renderer. |
| `node tools/realtest.mjs t280` | **13 pass, 0 fail** | `55.7s` | First-person weapon checks pass on real renderer. |
| `node tools/realtest.mjs t291` | **13 pass, 0 fail** | `46.7s` | `INFO the view height wobbles 0.33 cm, the sight 0.34 cm; the pitch 0.02 deg, the sight 0.03 deg`. |
| **Total (`5` suites)** | **86 pass, 0 fail** | `230.0s` | Zero page errors across all runs. |

---

## 2. Visual Evaluation & Scoring vs. AG-164 Baseline (`vmsheet.mjs` & Wall Check)

| Build / Mode | Placement & Framing | Hands, Grip & Wrists | Sights & ADS Alignment | Reload & Motion | Wall / Near Clipping | **Overall Score** | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **AG-164 Baseline** (`pistol-fp-*.png`, pre-`FP_HIP_HAND`) | 1.5 | 2.0 | 2.5 | 3.0 | 2.0 | **2.25 / 5** | **FAIL** (Hip gun buried at bottom edge; hand clips grip; wall clip) |
| **Old First Person (`?vm=0`)** (`old-hip.png`, `old-ads.png`, `old-wall-hip.png`) | 3.0 | 2.5 | 3.5 | 3.0 | 1.5 | **2.70 / 5** | **FLAG** (Wall walk pushes gun/hands into wall; eye moves to sight) |
| **CL-281 Stage 1 View Gun** (`vm-*.png`) | **4.5** | **2.0** | **4.5** | **2.5** | **5.0** | **3.70 / 5** | **FLAG** (Sights, hip framing & wall depth 4.5–5.0, but **forearms crossed** & **slung rifle photobombs reload/look-down**) |

### What Works Well on the GPU
1. **Hip & ADS Gun Placement (`vm-hip.png`, `vm-ads.png`, `vm-hip-again.png`, `vm-turn.png`) — `4.5/5`**:
   - At the hip (`vm-hip.png`), the M9 sits in a natural lower-right combat ready (`grip ndc 0.39, -0.74`, `muzzle 0.29, -0.25`, canted `-6.8°`), leaving the center screen open.
   - Down the sights (`vm-ads.png`), the rear notch and red front post align dead-center (`ndc 0.000, 0.000`) 34 cm ahead of the eye without moving the camera (`0.000 m` eye shift).
   - Turning (`vm-turn.png`) and looking up (`vm-look-up.png`) show smooth spring lag and recovery with zero near-plane clipping (`nearest 21.2 cm`).
2. **HQ Wall Walk Test (`vm-wall-hip.png`, `vm-wall-ads.png` vs. `old-wall-hip.png`, `old-wall-ads.png`) — `5.0/5`**:
   - Walking the marine straight into the HQ south wall (`pos = (0, -3.17, -5.42)`) leaves the `CL-281` view gun and both arms **100% unclipped and cleanly rendered in front of the wall** (`VM.depth = 0.04` depth-range compression works as designed on WebGPU).
   - By contrast, in `?vm=0` (`old-wall-hip.png`, `old-wall-ads.png`) at the exact same coordinates, the wall swallows the barrel and clips the hands.

---

## 3. Defects Found for Claude (With Exact Shot Names & Root Causes)

### Defect 1 (HIGH): Crossed Forearms / Left-Handed Body (`D-75`) vs. Right-Handed View Table (`vm-hip.png`, `vm-ads.png`, `vm-reload-grab.png`, `vm-reload-pouch.png`, `vm-reload-seat.png`, `vm-reload-slide.png`)
- **What is visible in the shots**:
  - In `vm-hip.png` and `vm-ads.png`, the **firing forearm (`arms.r`)** runs from the pistol grip **down-and-left** across the bottom-center of the screen (`x ≈ 500..850 px`, directly underneath the barrel), while the **support forearm (`arms.l`)** sits on the **far right edge** of the screen (`x ≈ 1000..1180 px`).
  - When reload begins in `vm-reload-grab.png` (`u = 0.18`) and `vm-reload-pouch.png` (`u = 0.45`), the **right-side sleeve (`arms.l`) vanishes** to the pouch while the **left-center sleeve (`arms.r`) stays on the grip**, reaching diagonally from bottom-center-left up to the right-side pistol!
  - In `vm-reload-seat.png` (`u = 0.62`, `hand: "well"`) and `vm-reload-slide.png` (`u = 0.83`, `hand: "work"`), the support arm (`arms.l`) enters from the **right side of the screen (`+X`)**, and in `vm-reload-slide.png` its forearm angles **up-and-right above the slide**!
- **Root cause (verified from `ag168-results.json` live `wristsView` telemetry)**:
  1. **Socket X-side inversion (`readSockets`)**: On the third-person marine (who is left-handed per `D-75`), `elbowRG` (`side = +1`, firing hand) is on his `+X` side (`sockets.r.p.x = +0.093` in gun space) and `elbowLG` (`side = -1`, support hand) wraps around the `-X` side of the grip (`sockets.l.p.x = -0.158` in gun space). When `BORE_AHEAD` (`RY(π)`) rotates gun `+Z` to view `-Z`, it maps gun `+X` to **view `-X` (left)**! Consequently, in view space at the hip:
     - Firing wrist `WR.p` is at `x = +0.138` (left side of the pistol), with `arms.r.root` (elbow) at `x = +0.126`.
     - Support wrist `WL.p` is at `x = +0.250` (**11.2 cm to the right of `WR.p`!**), with `arms.l.root` (elbow) at `x = +0.256`.
  2. **`VM.wristMax` (35°) clamp locks the crossed orientation**: In `WR.q` and `WL.q`, the wrist's local `+Y` axis (`_y = (0,1,0).applyQuaternion(W.q)`) points **up-and-back** (`rYDir = [0.016, +0.232, +0.973]`, `lYDir = [0.167, +0.246, +0.955]`), ~52° away from the downward elbow hints (`elbows.r = [+0.30, -0.62, -0.02]`, `elbows.l = [-0.16, -0.66, -0.06]`). Clamped at `VM.wristMax = 0.61 rad` (`35°`), both wrists hit `0.61 rad` and cannot reach their opposite-side elbow hints.
  3. **Gun-local `-X` in `VM_RELOADS.pistol.places` maps to view-space `+X` (right)**:
     - `places.well.y = [-0.55, -0.35, -0.75]` and `places.work.y = [-0.75, 0.25, -0.6]` are in **gun-local space**, where `BORE_AHEAD` (`RY(π)`) flips gun `-X` (`-0.55`, `-0.75`) to **view `+X` (`+0.55`, `+0.75`, right side of screen)**!
     - Furthermore, `places.work.y[1] = +0.25` points `+Y` (**upward above the slide**), which is why in `vm-reload-slide.png` the support forearm extends up and to the right of the pistol slide instead of down-and-left toward the support elbow.

### Defect 2 (HIGH): Stowed Slung Rifle Barrel (`carryRig.slings`) Not in `eyeHideSet` — Photobombs `vm-reload-slide.png` and `vm-look-down.png`
- **What is visible in the shots**:
  - In `vm-reload-slide.png` (`u = 0.83`), a long black rifle barrel with two mounting blocks (`---[ ]-[ ]---`) cuts horizontally across the top of the pistol slide in the foreground.
  - In `vm-look-down.png` (`pitch = -0.9`), the same black barrel sticks out diagonally to the upper-right of the pistol rear sight (and the marine's armless olive chest/plate-carrier shows at bottom-left, as noted in your handoff).
- **Root cause**:
  - `eyeHideSet` in `game/viewmodel.js:109–125` hides `ud.armLG`, `ud.armRG`, `rigSplit` (baked arms), `ARM_CLOTH`, and `gunSrc` (the active pistol), leaving `114` meshes visible on `TT.marine` — including the stowed weapons in `carryRig.slings` / `carryRig.holsters` mounted on `torsoG` when `T.grantAllWeapons()` is active.
  - **Fix**: Include the stowed weapon copies on `torsoG` (`carryRig.slings` / `carryRig.holsters`) in `eyeHideSet` while the view gun is active.

### Defect 3 (MEDIUM): `readSockets` Overwrites Sockets When `OTS.yaw` Desyncs from `aimYaw` or During Unsettled Motion
- In `index.html:48412`, `st.settled = holdW > 0.98 && !reloading && Math.abs(OTS.pitch) < 0.35 && !diving()` remains `true` while walking, strafing, aiming down sights (`fpAdsW > 0`), firing, or when `T.setOtsAimDbg(yaw, pitch)` sets `OTS.yaw` without updating `aimYaw`.
- If `T.setOtsAimDbg(0, 0)` is called after `startMatch` (where `aimYaw = Math.PI`), the third-person marine's arms twist 180° relative to the camera and `readSockets` lerps `sockets.r/l` into that twisted pose. Locking `sockets` once captured at rest (or checking `Math.abs(OTS.yaw - aimYaw) < 0.05 && fpAdsW < 0.01 && speed < 0.05`) prevents third-person body motion from drifting the view-gun sockets.

### Defect 4 (LOW): Pistol Slide Kick Duration & Reload Slide Rack (`vm-reload-slide.png`, `tcl281`)
- In `tcl281`, `INFO the slide on the shot: 0.0 cm (gun units)` logged `0.0 cm` because `mirrorParts()` copies `s.position` every frame and the shot kick window (`S.slideT < 0.075` = 75 ms) had already finished or been small after `await wait(60)`.
- During reload (`vm-reload-slide.png`, `u = 0.83`), `mirrorParts()` copies `s.position` from the third-person pistol, whose slide does not move back during reload (`u = 0.74..0.89`), so the support hand pinches a closed slide. Driving `gun.slide.position.z` on the reload's `0.74..0.89` rack window in `viewmodel.js` would make the slide visibly cycle when pinched.

---

## 4. Lighting Checks: HQ Roof Shade, Outdoor Sun, Night 20 & NVG Goggles

1. **Under the HQ Roof by Day (`vm-hip.png`, `vm-hq-roof-hip.png`, `vm-hq-roof-ads.png`) vs. Direct Sunlight (`vm-outdoor-sun-hip.png`, `vm-turn.png`)**:
   - **Yes — the view gun is in shade under the HQ roof.**
   - `19/20` meshes on `viewmodel.gun.root` and `14/14` meshes on `viewmodel.arms` have `receiveShadow: true` (`castShadow: false`). Because `vmMVP` only overrides clip-space position while Three's shadow node samples the sun shadow map using `positionWorld` (placed at `camera.matrixWorld` + ~0.38 m), the view gun and arms sample the world shadow map at the player's position.
   - Under the HQ roof (`vm-hip.png`), slide top `RGB = (40.8, 42.3, 44.2)` and left sleeve `RGB = (80.7, 76.1, 53.6)`; stepping outdoors into direct sun (`vm-outdoor-sun-hip.png`), slide top rises to `RGB = (69.4, 61.5, 40.2)` (`+70%` R) and left camo sleeve rises to `RGB = (83.2, 117.5, 66.2)` (`+54%` G).
2. **Night 20 & NVG Goggles (`vm-night20-hip.png`, `vm-night20-ads.png`, `vm-night20-nvg-hip.png`, `vm-night20-nvg-ads.png`)**:
   - **Night 20 (goggles up)**: The pistol and sleeves sit in dark night ambient (`slide RGB = 33.1, 13.0, 4.7`, `sleeveL RGB = 38.7, 32.9, 13.7`) with `m.fog = false` keeping night fog mist off the weapon; the red front sight and white rear dots stand out clearly (`vm-night20-hip.png`, `vm-night20-ads.png`).
   - **Night 20 with NVG down**: Toggling NVG (`vm-night20-nvg-hip.png`, `vm-night20-nvg-ads.png`) cleanly applies the phosphor light boost and `#nvgImageTube` filter across the view gun and arms (`slide RGB = 64.9, 76.2, 71.4`, `sleeveL RGB = 102.8, 122.8, 114.0`) with crisp sight alignment in ADS.

---

## 5. Performance Cost on RTX 5080 (`Night 20`, `--gfx high`, `--prof`, 30 s)

Four 30-second runs were executed back-to-back at Night 20's final push (`48` active zombies) on the `high` preset:

| Scenario (`Night 20 --gfx high --prof`, 30 s) | View Gun Active | FPS (last 10s) | 1% Low | Worst (ms) | Draws | Triangles | GPU (ms) | Tick (last 10s) | `viewmodel` Mark (Whole Run Avg / Max) | `viewmodel` Mark (Last 10s Avg) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Third Person (as is, `?debug=1`)** | `false` | **53.2** | **35.9** | 40.8 | 258 | 702,674 | 0.34 | 17.46 ms | **`0.010 ms`** (max `0.4 ms`) | **`0.009 ms`** |
| **2. Third Person (`?debug=1&vm=0`)** | `false` | **57.1** | **42.1** | 37.4 | 270 | 784,271 | 0.34 | 15.61 ms | **`0.006 ms`** (max `0.2 ms`) | **`0.005 ms`** |
| **3. First Person Pistol (as is, `?debug=1`)** | `true` (`27` nodes) | **33.8** | **20.8** | 69.0 | 592 | 1,116,724 | 8.60 | 27.33 ms | **`0.145 ms`** (max `1.3 ms`) | **`0.171 ms`** |
| **4. First Person Pistol (`?debug=1&vm=0`)** | `false` | **36.7** | **25.5** | 32.6 | 573 | 1,067,919 | 8.20 | 24.69 ms | **`0.011 ms`** (max `0.6 ms`) | **`0.010 ms`** |

---

# Part 2 (Post-20:46Z): `CL-281` v2 View-Gun Re-Verification, `CL-283` Noon NVG, `CL-284` Yard / Ruts / Relay / Mast Skeleton & Test-Page Reruns

Following Claude's `20:30Z` and `20:46Z` updates (`VM.mirror = true` via `space.scale.set(-1, 1, 1)`, `twistToward`, wide elbows, `ctx.stowed()` in `eyeHideSet`, reload slide rack `VM_RELOADS.pistol.rack`, `CL-283`, and `CL-284`), we re-ran `vmsheet.mjs` and all custom wall/roof-shade/night-20 shots after `20:46Z` into `qa/2026-10-31-AG-168/v2/`:
- **v2 View-Gun Contact Sheet (post-20:46Z)**: `qa/2026-10-31-AG-168/v2/sheet.jpg` (`1990×1748`, 20 frames)
- **`CL-283` + `CL-284` Contact Sheet**: `qa/2026-10-31-AG-168/v2/cl283-284-sheet.jpg` (`1990×1412`, 14 frames)
- **Telemetry Summary**: `qa/2026-10-31-AG-168/v2/ag168-v2-summary.json`

## 6. Real-Renderer & Test-Page Reruns (Post-20:46Z) — `215 pass, 0 fail`

| Runner | Suite | Result | Duration | Notes |
| :--- | :--- | :---: | :---: | :--- |
| `tools/realtest.mjs` | `tcl281` (`--all`) | **37 pass, 0 fail** | `38.0s` | Includes mirrored right-hand hold (`er.x > 0.25 && er.x > el.x + 0.35`), stowed guns in `hidden` set, and `slideMove > 0.045` during reload rack |
| `tools/test-iter.mjs` | `tcl280` | **10 pass, 0 fail** | `41.6s` | 1P crouch, ADS, lean, free look, body shadow |
| `tools/test-iter.mjs` | `tcl281` | **35 pass, 0 fail** | `50.2s` | Full view-gun suite on `test.html` |
| `tools/test-iter.mjs` | `tcl283` | **5 pass, 0 fail** | `37.8s` | Noon NVG washout (`nvgImageTubeDay`, `nvg-washout`, eyepiece vignette) |
| `tools/test-iter.mjs` | `t204` | **48 pass, 0 fail** | `63.6s` | HQ yard layout (`ruts`, `fob-ground-blend`, clear CIF/Armory doors, relay without cone, mast skeleton `pull -> fall -> down`) |
| `tools/test-iter.mjs` | `t281` | **33 pass, 0 fail** | `122.3s` | Full regression pass |
| `tools/test-iter.mjs` | `t287` | **10 pass, 0 fail** | `41.7s` | Full regression pass |
| `tools/test-iter.mjs` | `t294` | **24 pass, 0 fail** | `67.1s` | Full regression pass |
| `tools/test-iter.mjs` | `t299` | **13 pass, 0 fail** | `45.6s` | Full regression pass |

---

## 7. `CL-281` v2 (Post-20:46Z) Visual Inspection (`qa/2026-10-31-AG-168/v2/sheet.jpg`)

### What v2 Fixed (`Defects 1–4` from Part 1):
1. **Mirrored Shooter Hold & Reload Choreography (`v2/vm-reload-grab.png`, `v2/vm-reload-pouch.png`, `v2/vm-reload-seat.png`, `v2/vm-reload-slide.png`) — `4.8/5`**:
   - With `VM.mirror = true` (`space.scale.set(-1, 1, 1)`), the firing arm (`arms.r`) now stays anchored on the right side of the screen (`ndc.x = +1.135`) holding the pistol grip throughout the entire reload, while the left-side support arm (`arms.l`, `ndc.x = -0.157`) strips the magazine (`vm-reload-grab.png`), drops out of view to the pouch (`vm-reload-pouch.png`), brings the fresh magazine up from the lower-left into the magwell (`vm-reload-seat.png`), and reaches over the top-left to pinch the rear serrations (`vm-reload-slide.png`).
2. **Stowed Weapons Hidden (`v2/vm-reload-slide.png`, `v2/vm-look-down.png`) — `5.0/5` FIXED**:
   - `ctx.stowed()` (`carryRig.slings` + `carryRig.holsters`, `hiddenCount = 328`) completely eliminates the slung rifle barrel that photobombed `vm-reload-slide.png` in v1 and the slung rifle stock/cross-draw holsters in `vm-look-down.png` (only the marine's own chest radio whip antenna on his plate carrier is visible when looking straight down at `pitch = -0.9`).
3. **Reload Slide Rack (`v2/vm-reload-slide.png`) — `5.0/5` FIXED**:
   - `VM_RELOADS.pistol.rack: [0.70, 0.78, 0.85, 0.055]` visibly pulls `gun.slide.position.z` back `5.5 cm` while the support hand pinches the rear serrations (`u = 0.78..0.84`), exposing the barrel/chamber before releasing forward.

### One Remaining Visual Detail in `v2/vm-hip.png` & `v2/vm-ads.png` (Forearm Down-Pitch Clamped by `VM.wristMax`, Exposing the Flat Cuff Cap):
- **What shows in `v2/vm-hip.png` and `v2/vm-ads.png`**:
  - The left and right sleeves no longer cross — `arms.l` comes in cleanly from the lower-left and `arms.r` comes in cleanly from the lower-right.
  - However, right behind each gloved wrist, the **flat circular cuff end-cap (`cuffRings` at `y = -0.211` in `studio/fp-arms.js`)** faces the camera almost head-on, showing a prominent round disc of concentric camo rings on both the left and right sleeves.
- **Exact Root Cause (`game/viewmodel.js:406-415` & `studio/fp-arms.js:46-52`)**:
  1. In `poseArm(arm, W, hint, max)` (`game/viewmodel.js:407-413`), the wrist's unbent forearm axis `_y = (0, 1, 0).applyQuaternion(W.q)` (inherited from the 3P settled hold + `twistToward`) points **up and back** (`y ≈ +0.23, z ≈ +0.97` in view space), whereas the vector from the wrist (`W.p.y ≈ -0.11` hip, `-0.01` ADS) down to the elbow hint (`eR.y = eL.y = -0.40`) points **down and back** (`_d.y ≈ -0.66, _d.z ≈ +0.69`).
  2. The angle between `_y` and `_d` is **`~1.02–1.15 rad`** (`58°–66°`), so `poseArm` saturates at `max = VM.wristMax = 0.61 rad` (`35°`) on both arms (`info.wrist = { r: 0.61, l: 0.61 }`). Because the downward bend is stopped at `0.61 rad`, the forearm tube stays nearly horizontal (`z ≈ +0.96, y ≈ -0.15`), pointing almost straight back into the camera lens instead of angling steeply down to `y = -0.40`.
  3. Because the camera looks nearly straight down the forearm tube axis, the flat closed cap of `cuffRings` (`y = -0.211`, radius `3.7 cm × 3.2 cm`) faces the eye directly behind the glove, and `loftRings`'s cap UVs map the camo texture as concentric rings on that flat face.
- **Suggested Fix**:
  - Either allow a larger downward pitch in `poseArm` (e.g. `VM.wristMax = 1.05` or apply `BORE_AHEAD`/a downward base pitch to the wrist reference frame before clamping `wristMax`) so the forearms actually reach `eR`/`eL` at `y = -0.40` and hide the cuff face behind the wrist/hand, **or** taper the cuff's front cap (`y = -0.222`) into the wrist (`rx, rz -> 0.022`) instead of a flat `rx = 0.035` cap.

---

## 8. `CL-283` Noon NVG Washout (`qa/2026-10-31-AG-168/v2/cl283-284-sheet.jpg` Row 1) — `5.0/5` PASS

- **Shots**: `v2/cl283-hq-noon-nvg-off.png`, `v2/cl283-hq-noon-nvg-on.png`, `v2/cl283-valley-noon-nvg-off.png`, `v2/cl283-valley-noon-nvg-on.png`.
- **Verdict**: Both inside the HQ (`cl283-hq-noon-nvg-on.png`) and out in the noon valley (`cl283-valley-noon-nvg-on.png`), flipping NVG on during daytime (`worldTime = 0.42`) activates `#nvgImageTubeDay` + `canvas.nvg-washout` + `#nvgEyepiece`, washing the frame in overdriven pale green-white phosphor glare while keeping the silhouettes/edges of the mountains, pines, HUD, and view pistol faintly readable.

---

## 9. `CL-284` HQ Yard, Tyre Ruts, Relay & Mast Skeleton (`qa/2026-10-31-AG-168/v2/cl283-284-sheet.jpg` Rows 2–4) — `5.0/5` PASS

1. **HQ Yard Clear Sightlines from CIF & Armory Doors (`cl284-hq-east-from-cif-door.png`, `cl284-hq-east-from-armory-door.png`, `cl284-hq-east-wide.png`)**:
   - Looking east from both the CIF doorway (`(-9.5, 4.4)`) and the Armory doorway (`(-9.5, -4.4)`), the centre lane of the yard is completely clear all the way to the east gate (`(15.2, 0)`). The crate stack sits cleanly in the NE corner (`(7.7, 7.7)`) and the burned tent frame sits in the SE corner (`(9.9, -7.7)`).
2. **Ground Blend & South-Gap Tyre Ruts (`cl284-yard-above.png`, `cl284-south-gap-ruts.png`)**:
   - `fob-ground-blend` (`blendPresent: true`) anchors the yard props to the dirt with subtle dark contact patches rather than floating on clean gravel.
   - `fob-tyre-ruts` (`rutsPresent: true`) in `cl284-south-gap-ruts.png` reads immediately as twin sunken wheel tracks with chevron tread marks curving from the south gap (`(0, -15.4)`) up to the truck bed (`(-5.8, -8.4)`).
3. **Relay Without Floating Cone (`cl284-relay-no-cone.png`)**:
   - At the hilltop relay (`(-155, -7)`), `relayMarksParent: false` — the old floating cone above the relay cabinet is gone.
4. **Mast Skeleton Pull -> Boots Half-Off -> Spread-Eagled Fall -> Ground (`cl284-mast-1-pull.png` .. `cl284-mast-4-ground.png`)**:
   - **Beat 1 (`cl284-mast-1-pull.png`)**: The zombie pulls the skeleton's foot at the mast base while the legs drag toward the zombie.
   - **Beat 2 (`cl284-mast-2-boots-half-off.png`)**: By the 2nd–3rd pull, the boots have visibly slid halfway down the skeleton's shins toward the ankles.
   - **Beat 3 (`cl284-mast-3-fall.png`)**: The skeleton drops from the mast with all four limbs splayed wide.
   - **Beat 4 (`cl284-mast-4-ground.png`)**: On the ground (`phase: "down"`, `pos: [-154.15, 0.65, -7.23]`, `gy: 0.45`), the skeleton lies face-down and spread-eagled (`spreadRad: [1.98, 2.275, 0.947, 0.942]`) while the zombie gnaws beside him.

