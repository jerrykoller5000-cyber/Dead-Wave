# Handoff: AG-235 — `GP-20024` Minigun 4-Light Gate & `t298` Eye-Ease Red Bisection

- **Agent**: Antigravity (`--model "Gemini 4 Argon (High)"`)
- **Date**: 2026-11-04
- **Task**: `AG-235`

Changed:
- Completed ChatGPT's `GP-20024` minigun left-side peg 4-light visual gate in 1P and 3P across Noon, Dusk, Night+Headlamp, and Campfire (`qa/2026-11-04-AG-235/minigun-3p-4light-sheet.jpg`, `qa/2026-11-04-AG-235/minigun-gp20024-gate-sheet.jpg`) and replied `DONE` to ChatGPT's request.
- Bisected `t298`'s `after the eye ease the camera position matches within 1 mm` red (`lateC`, bar `< 0.001 m`) in an isolated detached worktree across `WORKING_TREE`, `5adede46`, `5adede46` + changed files (`index.html`'s `CL-301`/`CL-293`/`GB-272`/`GB-255` lines, `game/viewmodel.js`), `f645ba77`, `5abd7576`, `2d9ab0b2`, and `e10ed377`, plus counterfactual checks (`qa/2026-11-04-AG-235/report.md`, `qa/2026-11-04-AG-235/bisect-verify.json`).
- Confirmed that **none of the post-`5adede46` changes** (`CL-301`, `CL-293`, `game/viewmodel.js`, `GB-272`, `GB-255`) caused the `t298` `lateC` red: `5adede46` (`lateC = 1.77 mm` test / `6.50 mm` real), `f645ba77` (`1.95 mm` test / `5.13 mm` real), and `5abd7576` (`15.04 mm` test) all fail in the same mid-clip frame window (`frames 147..186`, `pz = +14..+23 m`).
- Pinpointed the exact commit and mechanism:
  1. **`CU-209`** (landed in `5abd7576`, 2026-11-01 afternoon) moved `SPAWN_X, SPAWN_Z` from `(1.2, 13.8)` to `LANDING_X = 42, LANDING_Z = -20`. Before `5abd7576` (`e10ed377` and `2d9ab0b2`), `t298` walked North along `x = 1.2` and passed every time (`lateC = 0.267 mm`). From `(42, -20)`, `t298`'s 200-frame `KeyW` walk (`yaw = 0`, North along `x = 42` to `z = +26`) walks straight through `nearestHqPoi()` (`campsite[0]` at `(42.5, 25.5)`), where `spawnPoiGuards()` (`index.html:45114-45123`) places 2–3 sleeping POI guards (`'shambler'`).
  2. During recording (`rec`), those POI guards start **asleep** (`z.poiAwake = false`) until frame ~75 (`pz ≈ +7.5`), when the marine walks within `POI_GUARD_WAKE = 18 m` and wakes them (`wakePoiGuards('near', post)`, `z.poiAwake = true`, `z.poiLungeT = 1.0`).
  3. During `flightRestore(clip)` (`rep`), `flightTakeSnap()` (`index.html:62954`) and `flightPlaceZombies()` (`index.html:63024-63040`) restore only `{ x, y, z, yaw, hp }` and **do not save or restore `z.poiAwake`, `z.poiWake`, `z.poiLungeT`, `z._mvVX`, `z._mvVZ`, `z._tickAcc`, or `z.walkPhase`**. Thus at replay frame `0`, the POI guards are placed back at `(42.5, 25.5)` **already awake (`z.poiAwake === true`)** and walk South from frame `0` instead of sleeping until frame `75`.
  4. At frames `147..186` (`pz = +14..+23`), a replay guard crosses the first-person centre aim ray (`recAimKind: "ground"` vs `repAimKind: "zombie"`), causing `updateMouseAimBody` (`index.html:51305-51359`, with `AIM_AXIS_PULL = 0.12` and bullet target-lead `pz._mvVX * tf`) to snap `aimYaw = Math.atan2(dx, dz)` (`player.rotation.y = aimYaw`) by up to `0.143 rad` (`8.17°`). While first-person player movement and camera quaternion use `OTS.yaw` (`dp = 1.4e-12 m`, `da = 0.000002°`), `player.rotation.y = aimYaw` and `POSE.lowerYaw` (`+0.094 rad`) rotate the marine's body and `headG` beneath the camera, swinging `_fpEye` (`FP_EYE = (0, 0.205, 0.12)` in `headG`) sideways by up to `20.68 mm` and pulling `camera.position` off by `4.2–22.6 mm` (`lateC`).
  5. Additionally, at frame `0` of `flightRestoreSnap(s)` (`index.html:63064-63066`), `_fpEye` (`index.html:51025`) is not restored from the snapshot (it retains the end-of-clip position `(15.1, y, 66.5)`), so on frame `0` `updateMouseAimBody` (`index.html:51278`) fires the aim ray from the stale end-of-clip `_fpEye` and snaps `aimYaw` by `-0.103 rad` (`-5.9°`), causing the `4.3–4.7 mm` opening `worstC` that decays over frames `0..16`.
- Counterfactual verification in the temporary worktree (removed after run; no production code or test bars modified):
  - `WORKING_TREE` + `T.clearZombies()` before `flightReset()`: `lateC = 0.000131 m` (`0.131 mm`, PASS on both test page and real renderer, 7.6x under the `1 mm` bar).
  - `WORKING_TREE` + `aimYaw = OTS.yaw` when `_otsCentre && viewFirst && fpOffSet`: `lateC = 0.000031 m` (`0.031 mm`, PASS on both test page and real renderer, 32x under the `1 mm` bar) and `worstC = 0.000100 m` (`0.100 mm`).

Tests:
- `qa/2026-11-04-AG-235/capture-minigun-3p.mjs` via `crew.mjs slot run` (1P + 3P 4-light `GP-20024` minigun gate: PASS).
- `qa/2026-11-04-AG-235/run-bisect.mjs` via `crew.mjs slot run` (`t298` across `WORKING_TREE`, `5adede46`, `5adede46` + `WT index.html`, `5adede46` with `CL-293` reverted, `f645ba77`, `5abd7576`, `2d9ab0b2`, `e10ed377`, and Counterfactuals A & B on both test page and real WebGPU renderer).

Not verified:
- No production files or test bars (`tools/tests/t298.js`) were modified (`report; no bar moves`).
