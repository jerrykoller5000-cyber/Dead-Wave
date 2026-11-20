# antigravity — AG-322 J156 tree-canopy 200 m road walk on 5080 (noon + night, before & CD-15 review copy) — 2026-11-17
Changed:          Look-only RTX 5080 WebGPU verification of J156 (tree canopies sitting on ground / popping up at 18 m swap) along a deterministic 200.14 m road from HQ to Rangers Camp (`path[10] -> path[12]`) in noon and night, comparing live `index.html` (`215aa643`, BEFORE) vs Claude 1's CD-15 fix served in-memory (`51ec69da`, AFTER). Zero game edits on disk; reusable walk script saved for post-land checks.
Files:            review/AG-322/route.json, review/AG-322/route-probe.json, review/AG-322/probe-route.mjs, review/AG-322/walk-ag322.mjs, review/AG-322/build-sheets.py, review/AG-322/walk-summary.json, review/AG-322/summary.json, review/AG-322/shots/{before-noon,before-night,after-noon,after-night}/f00..f53.png (216 PNGs)
Tests:            not run (`npm test` / tree tests left to cloud/owner); ran 5080 WebGPU walks via `node crew/crew.mjs slot run antigravity AG-322`: 4 walks x 54 frames @ 0.5 s = 216 validated 1280x720 PNGs, 0 duplicates, 0 page errors; Rule 16 observed (no active QUIET WINDOW, 1 browser instance per slot run, `index.html` MD5 verified `215aa643` before & after).
Screenshots:      review/AG-322/sheet-compare-noon.jpg, review/AG-322/sheet-compare-night.jpg, review/AG-322/sheet-before-noon.jpg, review/AG-322/sheet-after-noon.jpg, review/AG-322/sheet-before-night.jpg, review/AG-322/sheet-after-night.jpg (plus 216 full frames under review/AG-322/shots/)
Not verified:     Full `npm test` and tree tests (`canopy`/`igniteTree`/`fallTree`); live landing of CD-15 into `index.html` (awaiting Claude 1 / Claude 2).
Requests:         Sent `AG-322 5080 walk complete: J156 confirmed before (215aa643) and fixed on CD-15 review copy (51ec69da)` to `claude4` and `claude`.
Contract changes: none

---

## Route & Method (Reusable Script)
- **Route (`review/AG-322/route.json`):** `HQ to Rangers Camp road (path[10] -> path[12])`, 49 waypoints (`200.14 m` total), starting just outside HQ yard `(0, -8.5)` through the `50–70 m` thicket opening `(40.05, -29.94) -> (57.67, -43.11)` and curving through dense forest on both sides (`52+` left / `64+` right trees in `route-probe.json`) to `(135, 0)` at Rangers Camp (`0` water, `0` wall blocks, max slope `0.25`).
- **Walk & View:** Fresh `#modeHunt` run at `High` (`1280x720` WebGPU), 1P `pistol` view (`OTS.pitch = +0.02`, flashlight OFF in `noon`, flashlight ON in `night` so `18..26 m` trees across the `liveIn = 18 m` boundary are directly lit alongside `65 m` night fog). Deterministic `stepFrame(1/60)` x `30` substeps per `0.5 s` interval (`54` frames, `t = 0.0..26.5 s`, `198.84 m` traversed identically in all 4 walks).
- **Re-run command after landing CD-15:**
  `node crew/crew.mjs slot run <agent> <task> --checks "AG-322 post-land walk" -- node review/AG-322/walk-ag322.mjs --phase live`

---

## Before (`215aa643`) vs After (`51ec69da`, CD-15 in-memory)

| Run | Frames | Dist | Frames w/ crown < trunk top | Max crowns < trunk top | Frames w/ crown on/in ground | Max sunk `<= 0.05 m` | Min crown clearance | Pop-up jumps `> 0.50 m` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `before-noon` (`215aa643`) | 54 | 198.84 m | **54 / 54** | **265** | **54 / 54** | **207** | `-1.063..-0.981 m` | **77** across 39 frames (`+0.95..+4.92 m`) |
| `after-noon` (`51ec69da`) | 54 | 198.84 m | **0 / 54** | **0** | **0 / 54** | **0** | `+0.700..+1.116 m` | **0** (`0` frames) |
| `before-night` (`215aa643`) | 54 | 198.84 m | **54 / 54** | **44** | **54 / 54** | **41** | `-1.035..-0.858 m` | **78** across 39 frames (`+0.95..+4.92 m`) |
| `after-night` (`51ec69da`) | 54 | 198.84 m | **0 / 54** | **0** | **0 / 54** | **0** | `+0.700..+1.231 m` | **0** (`0` frames) |

---

## Visual Inspection Summary
- **BEFORE (`sheet-before-noon.jpg`, `sheet-before-night.jpg`, `shots/before-noon/f34.png`, `shots/before-night/f11.png`):**
  Every `FOREST_DEFER` instanced tree beyond `18 m` renders its canopy `pivotY` too low: pine cones and birch foliage sink straight into the terrain (`-0.46..-0.98 m` template leaf minY; `forest:birch:1.85` wood top `7.172` vs leaf `[ -0.976, 5.867 ]`), leaving bare dead-looking upper trunks and branches poking into the sky (`f34.png`, `f52` Rangers Camp), and oak/autumn crowns resting right on the grass (`f11.png` night flashlight cone lights a birch crown sitting on the dirt beside the road). As the player walks past `18 m`, batched trees swap to live and snap upward `+0.95..+4.92 m` (`77` noon / `78` night pop-ups in view).
- **AFTER (`sheet-after-noon.jpg`, `sheet-after-night.jpg`, `shots/after-noon/f34.png`, `shots/after-night/f11.png`, `sheet-compare-{noon,night}.jpg`):**
  With `Claude outputs/CD-15/cd15-land-canopy.py` applied in memory (`51ec69da`), every far instanced tree canopy sits properly at its trunk top (`0` below trunk top, `0` sunk into ground, min clearance `+0.70..+1.23 m` across all 108 `after` frames), matching the near live trees across the `18 m` boundary with `0` canopy pop-ups in both `noon` and `night` (`nightScan` active at `fogFar = 65 m`). Minor per-seed crown-shape variation (`~[-0.29, +0.36] m`) between the 8 quantized forest templates and each tree's `(x, z)` live seed remains natural and unobtrusive.
- **Side note (out of J156 scope):** During initial `unarmed` 1P testing (`TT.setUnarmedDbg(true)`), `viewmodel`'s `st.eye` stayed `false` so carried gear/body overlapped the camera with a dark diagonal bar; switching to standard 1P `pistol` framing resolved it cleanly across all 216 final frames.
