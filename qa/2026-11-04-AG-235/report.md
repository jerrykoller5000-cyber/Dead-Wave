# AG-235 Report — `GP-20024` Minigun 4-Light Gate & `t298` Eye-Ease Red Bisection

## Part 1: ChatGPT `GP-20024` Minigun Side Peg 4-Light Gate (1P + 3P) — **PASS**

- **3P 4-Light Contact Sheet**: `qa/2026-11-04-AG-235/minigun-3p-4light-sheet.jpg` (`159 KB`, 2x2 grid: Noon, Dusk, Night + Headlamp, Campfire)
- **Combined 8-Panel 1P + 3P Gate Sheet**: `qa/2026-11-04-AG-235/minigun-gp20024-gate-sheet.jpg` (`358 KB`, 4x2 grid: 1P Noon/Dusk/Night+Headlamp/Campfire over 3P Noon/Dusk/Night+Headlamp/Campfire)
- **Quantitative Checks**:
  - `gunMeshes.minigun.userData.hold.fore`: `[-0.125, -0.02, -0.145]` (`GP-20024` left-side peg at `x = -0.125`, `y = -0.020`, `z = -0.145`, forward of the `z = -0.18` rear clamp)
  - 1P (`w = 1`, `ads = 0`, `raise = 1`, `canvas = 1920x1080`): left palm wraps the left side peg (`leftHandPalmToForePegDist = 0.0273 m`, palm world `[41.970, 3.069, -19.512]` vs `fore` world `[41.975, 3.077, -19.486]`); right palm wraps the spade grip (`rightHandPalmToGripDist = 0.0308 m`). All 4 lighting conditions render cleanly with zero silhouette collapse or highlight blowout.
  - 3P (`first = false`, `w = 0`): left fist meets the left side peg (`leftFistToForePegDist = 0.0211 m`, fist world `[41.894, 2.752, -19.442]` vs `fore` world `[41.897, 2.760, -19.423]`); right fist meets the spade grip (`rightFistToGripDist = 0.0329 m`).

---

## Part 2: `t298` Eye-Ease Red (`after the eye ease the camera position matches within 1 mm`, bar `< 0.001 m`)

### 1. Summary Verdict

1. **None of the post-`5adede46` changes (`index.html`'s `CL-301` and `CL-293` lines, `game/viewmodel.js`, `GB-272`'s zombie field init, `GB-255`'s guards) caused the `t298` `lateC` red.**
   - `5adede46` itself (`lateC = 0.001769 m` at frame `165` on the test page; `lateC = 0.006497 m` at frame `180` on the real renderer) and `f645ba77` (2026-11-02 morning: `lateC = 0.001953 m` at frame `147` on the test page; `lateC = 0.005126 m` at frame `184` on the real renderer) and `5abd7576` (2026-11-01 afternoon: `lateC = 0.015041 m` at frame `163` on the test page) all fail in the **exact same mid-clip frame window (`frames 147..186`, `pz = +14..+23 m`)**.
   - Note: checking out `5adede46`'s `game/viewmodel.js` alone without `game/viewmodel-poses.js` throws `TypeError: Cannot read properties of undefined (reading 'out') at gunFrame (game/viewmodel.js:567:86)` because `5adede46` committed `CL-293`'s `VM.sprint` / `VM.camera` usage in `game/viewmodel.js` while `game/viewmodel-poses.js` was still untracked. With `game/viewmodel-poses.js` present, `5adede46` runs cleanly and reproduces the exact same `frames 147..186` red.
   - Reverting `CL-293` in `index.html` (`ky` posture-moving check) makes `lateC` blow up to `0.4694 m` (`469.4 mm` at frame `552`) on the test page because ADS vertical bob diverges without `CL-293`.

2. **Which change actually introduced the `t298` `lateC` red**:
   - **`CU-209`** (committed in checkpoint **`5abd7576`**, 2026-11-01 afternoon), which moved `SPAWN_X, SPAWN_Z` from `(1.2, 13.8)` (in front of the HQ cabin) to **`LANDING_X = 42, LANDING_Z = -20`**.
   - At `e10ed377` (2026-11-01 morning) and `2d9ab0b2` (2026-11-01 midday, before `index.html` with `CU-209` was committed in `5abd7576`), `t298` spawned at `(1.2, 13.8)` and walked North along `x = 1.2`, passing every time with **`lateC = 0.000267 m` (`0.267 mm`, frame `16`)** on both the test page and the real renderer.
   - Once `CU-209` moved `SPAWN_X, SPAWN_Z` to `(42, -20)`, `t298`'s 200-frame `KeyW` walk (`yaw = 0`, straight North along `x = 42` from `z = -20` to `z = +26`) walks **straight through `nearestHqPoi()` (`campsite[0]` at `(42.5, 25.5)`)**, where `spawnPoiGuards()` (`index.html:45114-45123`) places 2–3 sleeping POI guards (`'shambler'`).

3. **Exact Mechanism of the Mid-Clip Spike (`frames 147..186`, `lateC = 1.8–22.6 mm`)**:
   - **During recording (`rec`)**: The 2–3 POI guards at `(42.5, 25.5)` start **asleep** (`z.poiAwake = false`). They stay stationary at their post until frame ~75 (`pz ≈ +7.5`), when the marine walks within `POI_GUARD_WAKE = 18 m` (`index.html:45064`), waking them (`wakePoiGuards('near', post)`, `z.poiAwake = true`, `z.poiLungeT = 1.0`).
   - **During replay (`flightRestore(clip)`)**: `flightTakeSnap()` (`index.html:62954`) only snapshots `{ type, x, y, z, yaw, hp }` per zombie, and `flightPlaceZombies()` (`index.html:63024-63040`) only restores `x, y, z, yaw, hp` — **it does NOT save or restore `z.poiAwake`, `z.poiWake`, `z.poiLungeT`, `z._mvVX`, `z._mvVZ`, `z._tickAcc`, or `z.walkPhase`**.
   - As a result, at frame `0` of `flightRestore(clip)`, the POI guards are placed back at their `t = 0` ring around `(42.5, 25.5)` **while still awake (`z.poiAwake === true` from the recording)**! They immediately walk South toward the marine from frame `0` instead of sleeping until frame `75`.
   - At **frames `147..186`** (`pz = +14..+23`), the replay guards and recording guards sit at different positions near `(42.5, 17.6..25.8)`. When a guard crosses the first-person centre aim ray (`aimRaycaster.ray`) in one pass and not the other (`recAimKind: "ground"` vs `repAimKind: "zombie"`), `updateMouseAimBody` (`index.html:51305-51359`) sets `aimTarget` to the zombie hit (pulled sideways by `AIM_AXIS_PULL = 0.12` at line 51320 and target lead `pz._mvVX * tf` at line 51329) and snaps `aimYaw = Math.atan2(dx, dz)` (`player.rotation.y = aimYaw` at line 63595) by up to **`0.1426 rad` (`8.17°`)**!
   - In first person (`OTS.on && viewFirst`), player movement (`mvYaw = OTS.yaw`, line 63382) and camera quaternion (`OTS.look`, line 64122) use `OTS.yaw` rather than `aimYaw`, so `player.position` (`dp = 1.4e-12 m`) and `camera.quaternion` (`da = 0.000002°`) are unaffected — **but `player.rotation.y = aimYaw` and `POSE.lowerYaw` (`+0.0936 rad`) rotate the marine's body and `headG` beneath the camera**, swinging `_fpEye` (`FP_EYE = (0, 0.205, 0.12)` in `headG`) sideways in `X` by up to **`20.68 mm`** (`dfp = [-0.0196, -0.0001, -0.0066]`) and pulling `camera.position` off by **`4.2–22.6 mm`** (`lateC`)!

4. **Secondary Finding — Why Opening Frame `0` Has `worstC = 4.3–4.7 mm` (`dFpEye = 11.58 mm`)**:
   - In `flightRestoreSnap(s)` (`index.html:63064-63066`), `camera.position` and `_fpOff` are restored from the snapshot `s`, **but `_fpEye` (`index.html:51025`) is not restored** — it retains the world position from frame `599` (the end of the clip, `(15.1, y, 66.5)`).
   - On replay frame `0`, `updateMouseAimBody` (`index.html:63339`) runs before `firstPersonEye` (`index.html:64095`). At line 51278 (`if (_otsCentre && viewFirst && fpOffSet) aimRaycaster.ray.origin.copy(_fpEye)`), the aim ray fires from the stale end-of-clip `_fpEye` `(15.1, y, 66.5)`, hitting terrain at `(15.117, 239.985)` instead of `(42.003, -4.292)`.
   - Line 51359 (`aimYaw = Math.atan2(dx, dz)`) snaps `aimYaw` (`player.rotation.y`) to `-0.1030 rad` (`-5.90°`) on frame `0` (`dFpEye = 11.58 mm`, `dc = 4.32 mm`), which then decays over frames `0..16` down to `0.131 mm` at frame `16`.

---

### 2. Bisection & Counterfactual Table

| Tree / Configuration | Mode | `worstP` (m) | `worstA` (deg) | `worstC` (m) | `at` | `lateC` (`i >= 16`, bar `< 0.001 m`) | `lateAt` | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `e10ed377` (2026-11-01 morning, pre-`CU-209`) | Real | `1.39e-12` | `0.000002` | `0.009050` | `0` | **`0.000267`** (`0.27 mm`) | `16` | **PASS** |
| `e10ed377` (2026-11-01 morning, pre-`CU-209`) | Test | `1.39e-12` | `0.000002` | `0.009209` | `0` | **`0.000267`** (`0.27 mm`) | `16` | **PASS** |
| `2d9ab0b2` (2026-11-01 midday, `index.html` pre-`CU-209`) | Real | `1.39e-12` | `0.000002` | `0.009057` | `0` | **`0.000267`** (`0.27 mm`) | `16` | **PASS** |
| `2d9ab0b2` (2026-11-01 midday, `index.html` pre-`CU-209`) | Test | `1.39e-12` | `0.000002` | `0.009322` | `0` | **`0.000267`** (`0.27 mm`) | `16` | **PASS** |
| `5abd7576` (2026-11-01 afternoon, **`CU-209` `(42, -20)` spawn**) | Test | `1.39e-12` | `0.000002` | `0.015041` | `163` | **`0.015041`** (`15.04 mm`) | `163` | **FAIL** |
| `f645ba77` (2026-11-02 morning) | Real | `1.39e-12` | `0.000002` | `0.005126` | `184` | **`0.005126`** (`5.13 mm`) | `184` | **FAIL** |
| `f645ba77` (2026-11-02 morning) | Test | `1.39e-12` | `0.000002` | `0.004696` | `0` | **`0.001953`** (`1.95 mm`) | `147` | **FAIL** |
| `5adede46` (+ `viewmodel-poses.js`) | Real | `1.39e-12` | `0.000002` | `0.006497` | `180` | **`0.006497`** (`6.50 mm`) | `180` | **FAIL** |
| `5adede46` (+ `viewmodel-poses.js`) | Test | `1.39e-12` | `0.000002` | `0.004592` | `0` | **`0.001769`** (`1.77 mm`) | `165` | **FAIL** |
| `5adede46` + `WORKING_TREE` `index.html` (`CL-301`, `GB-272`, `GB-255`) | Real | `1.39e-12` | `0.000002` | `0.006752` | `183` | **`0.006752`** (`6.75 mm`) | `183` | **FAIL** |
| `5adede46` + `WORKING_TREE` `index.html` (`CL-301`, `GB-272`, `GB-255`) | Test | `1.39e-12` | `0.000002` | `0.010986` | `172` | **`0.010986`** (`10.99 mm`) | `172` | **FAIL** |
| `5adede46` with `CL-293` reverted in `index.html` | Test | `0.375759` | `0.125456` | `0.469444` | `552` | **`0.469444`** (`469.4 mm`) | `552` | **FAIL (ADS bob)** |
| `WORKING_TREE` (run 1 / run 2 / run 3) | Real | `1.39e-12` | `0.000002` | `0.009004` | `159` | **`0.004159–0.009004`** (`4.2–9.0 mm`) | `159–186` | **FAIL** |
| `WORKING_TREE` (run 1 / run 2 / run 3) | Test | `1.39e-12` | `0.000002` | `0.022615` | `164` | **`0.001945–0.022615`** (`1.9–22.6 mm`) | `164–174` | **FAIL** |
| **Counterfactual A**: `WORKING_TREE` + `T.clearZombies()` before `flightReset()` | Real | `1.39e-12` | `0.000002` | `0.004431` | `0` | **`0.000131`** (`0.131 mm`) | `16` | **PASS (7.6x under bar)** |
| **Counterfactual A**: `WORKING_TREE` + `T.clearZombies()` before `flightReset()` | Test | `1.39e-12` | `0.000002` | `0.004735` | `0` | **`0.000131`** (`0.131 mm`) | `16` | **PASS (7.6x under bar)** |
| **Counterfactual B**: `WORKING_TREE` + `aimYaw = OTS.yaw` when `_otsCentre && viewFirst && fpOffSet` | Real | `1.39e-12` | `0.000002` | `0.000100` | `6` | **`0.000031`** (`0.031 mm`) | `16` | **PASS (32x under bar)** |
| **Counterfactual B**: `WORKING_TREE` + `aimYaw = OTS.yaw` when `_otsCentre && viewFirst && fpOffSet` | Test | `1.39e-12` | `0.000002` | `0.000100` | `6` | **`0.000031`** (`0.031 mm`) | `16` | **PASS (32x under bar)** |

---

### 3. Per-Frame Diagnostic Trace (`WORKING_TREE`, `qa/2026-11-04-AG-235/bisect-verify.json`)

#### Opening Frame `0` (Stale `_fpEye` from End of Clip)
| Frame `i` | `pz` (m) | `recAimKind` | `repAimKind` | `recAimT` `[x, z]` | `repAimT` `[x, z]` | `dAimYaw` (rad) | `dLowerYaw` (rad) | `dFpEye` (m) | `dc` (m) |
|---:|---:|---|---|---|---|---:|---:|---:|---:|
| `0` | `-19.95` | `ground` | `ground` | `[42.0025, -4.2919]` | `[15.1170, 239.9846]` | `-0.103197` | `+0.031814` | `0.011580` | `0.004318` |
| `1` | `-19.84` | `ground` | `ground` | `[41.9974, -4.2989]` | `[41.9931, -4.3021]` | `-0.000273` | `+0.023160` | `0.000225` | `0.002719` |
| `2` | `-19.69` | `ground` | `ground` | `[41.9902, -4.3140]` | `[41.9875, -4.3158]` | `-0.000174` | `+0.016957` | `0.000160` | `0.001668` |
| `16` | `-16.32` | `ground` | `ground` | `[41.9542, -4.0921]` | `[41.9542, -4.0921]` | `0.000000` | `+0.000195` | `0.000002` | `0.000131` |
| `30..146` | `-12.8..+13.3` | `ground` | `ground` | identical | identical | `0.000000` | `0.000000` | `0.000000` | `0.000000` |

#### Mid-Clip Spike (`frames 156..190`, POI Guard Crossing First-Person Centre Ray)
- **Test Page (`wt_test`)**:
| Frame `i` | `pz` (m) | `recAimKind` | `repAimKind` | `recAimT` `[x, z]` | `repAimT` `[x, z]` | `dAimYaw` (rad) | `dLowerYaw` (rad) | `dFpEye` (m) | `dc` (m) |
|---:|---:|---|---|---|---|---:|---:|---:|---:|
| `156` | `15.68` | `ground` | `ground` | `[42.6362, 25.8850]` | `[42.6362, 25.8850]` | `0.000000` | `0.000000` | `0.000000` | `0.000000` |
| `159` | `16.40` | `ground` | **`zombie`** | `[42.6186, 25.9998]` | `[42.5530, 17.6299]` | `-0.032742` | `+0.009023` | `0.004235` | `0.001579` |
| `162` | `17.13` | `ground` | **`zombie`** | `[42.5826, 26.1110]` | `[42.4893, 17.6330]` | `-0.142587` | `+0.074469` | `0.020682` | `0.012289` |
| `164` | `17.61` | `ground` | **`zombie`** | `[42.5618, 26.2452]` | `[42.4631, 17.6412]` | `-0.169104` | `+0.123511` | `0.027319` | **`0.022615`** |
| `165` | `17.85` | `ground` | `ground` | `[42.5567, 26.3248]` | `[42.5355, 26.3205]` | `-0.002430` | `+0.093600` | `0.002569` | `0.015059` |

- **Real Renderer (`wt_real`)**:
| Frame `i` | `pz` (m) | `recAimKind` | `repAimKind` | `recAimT` `[x, z]` | `repAimT` `[x, z]` | `dAimYaw` (rad) | `dLowerYaw` (rad) | `dFpEye` (m) | `dc` (m) |
|---:|---:|---|---|---|---|---:|---:|---:|---:|
| `174` | `19.96` | `ground` | `ground` | `[42.6290, 27.2749]` | `[42.6290, 27.2749]` | `0.000000` | `0.000000` | `0.000000` | `0.000000` |
| `175` | `20.19` | `ground` | **`zombie`** | `[42.6346, 27.4197]` | `[42.6778, 25.3305]` | `+0.009963` | `-0.007634` | `0.001409` | `0.001251` |
| `185` | `22.46` | `ground` | **`zombie`** | `[42.5562, 29.0641]` | `[42.6753, 24.1816]` | `+0.045819` | `-0.011630` | `0.006432` | `0.002140` |
| `186` | `22.68` | `ground` | **`zombie`** | `[42.5559, 29.2978]` | `[42.6838, 24.0879]` | `+0.058756` | `-0.024788` | `0.008235` | **`0.004412`** |
| `187` | `22.90` | `ground` | `ground` | `[42.5597, 29.5167]` | `[42.5640, 29.5181]` | `+0.000631` | `-0.018198` | `0.000573` | `0.002968` |

---

### 4. Candidate Fix Options for Claude (No Production Code or Test Bars Modified)

1. **`flightTakeSnap` / `flightPlaceZombies` + `flightRestoreSnap` (`index.html:62954, 63035-63039, 63066`)**:
   - In `flightTakeSnap()`, include `poiAwake: !!z.poiAwake, poiWake: z.poiWake || null, poiLungeT: z.poiLungeT || 0, mvVX: z._mvVX || 0, mvVZ: z._mvVZ || 0, tickAcc: z._tickAcc || 0, walkPhase: z.walkPhase || 0` on each snapshotted zombie, and restore them in `flightPlaceZombies()`.
   - In `flightRestoreSnap(s)`, also restore `_fpEye` (`_fpEye.set(s.cx, s.cy, s.cz)` or recompute from `headG`) so frame `0` of `updateMouseAimBody` does not raycast from the end-of-clip `_fpEye`.
2. **Or in `updateMouseAimBody` (`index.html:51359`)**:
   - When `_otsCentre && viewFirst && fpOffSet` (first person), `OTS.yaw` is the marine's look yaw; letting `AIM_AXIS_PULL` (`0.12 m`) and bullet target-lead (`pz._mvVX * tf`) on a zombie crossing the centre ray twist `aimYaw` (`player.rotation.y`) by up to `8.2°` yanks the marine's body/head sideways underneath the first-person camera even when the player hasn't moved the mouse. Keeping `aimYaw = OTS.yaw` (or computing `aimYaw` from the un-pulled ray direction in first person) makes `lateC = 0.031 mm` and `worstC = 0.100 mm`.
