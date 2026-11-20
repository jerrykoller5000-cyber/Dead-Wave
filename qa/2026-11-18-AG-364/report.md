# AG-364 QA Report — GT-20124 J164 LANDED V2 Six-View Closeups (`72e543b4`)

- **Date:** 2026-11-18
- **Author:** Antigravity (`AG-364`, V2 re-run after `AG-362` V1 look-barrier failure)
- **Prior V1 record preserved:** `review/GT-20124/native-mag-landed-ag-v1/failure.json` (`AG-362`, Firing Line frozen swapchain frame; diagnostic `qa/2026-11-18-AG-362/diag-barrier-fail.jpg`).

---

## 1. Execution & Proof

- **Command run (shared game-test slot):**
  `node crew/crew.mjs slot run antigravity AG-364 --checks "J164 LANDED V2 actual72e six closeups, publicstill held presentation" -- node review/GT-20124/native-mag-landed-ag-v2.mjs`
- **Exit code:** `0` (`LANDED MAG CONTAINMENT {"failures":[]}`)
- **Source integrity (`receipt.json`):** `sourceStable: true`, `noPackageURLOverrides: true`, `publicHeldPresentation: true`, `actualNormalNativeRender: true`, `matchedHistoricalPrelandCameras: true`, `frames: 6`, `index.html` MD5 `72e543b44476bf4187896db03d2811b3` (all 6 landed files exact).
- **180s Look Barrier:** Inspected `review/GT-20124/native-mag-landed-ag-v2/landed/unarmed-front.png` directly (`studio` Marine front view cleanly presented via `DWInspect.still(true)`), verified `all16Inside: true`, and wrote `FIRST-CELL-LOOKED.txt` (`LOOKED landed GT20124 native mags`).

---

## 2. Metrics & Diagnostics

| Pose | View | Renderer | `all16Inside` | `vestSlotsExact` | `instanceCapacity` | Right-thigh Whole-InstancedMesh Delta |
|---|---|---|---:|---:|---:|---:|
| `unarmed` | `front` | `WebGPU` | `true` | `true` | `5` | — |
| `unarmed` | `3q` | `WebGPU` | `true` | `true` | `5` | — |
| `unarmed` | `right-thigh` | `WebGPU` | `true` | `true` | `5` | `differentPixels = 0` (info only) |
| `pistol` | `front` | `WebGPU` | `true` | `true` | `5` | — |
| `pistol` | `3q` | `WebGPU` | `true` | `true` | `5` | — |
| `pistol` | `right-thigh` | `WebGPU` | `true` | `true` | `5` | `differentPixels = 0` (info only) |

- All 16 belt-magazine box corners in all 6 landed frames lie inside the actual native closed 48-triangle belt pouch shells (`maxBindErrorMetres: 0`, `toleranceMetres: 0.000002` at each pose).

---

## 3. Honest Visual Inspection (All 6 Landed PNGs + Comparison Sheet)

- **Delivered Artifacts Inspected:**
  - `review/GT-20124/native-mag-landed-ag-v2/LANDED-COMPARISON-SHEET.jpg`
  - `qa/2026-11-18-AG-364/sheet-gt20124-landed-v2.jpg`
  - `review/GT-20124/native-mag-landed-ag-v2/landed/{unarmed-front,unarmed-3q,unarmed-right-thigh,pistol-front,pistol-3q,pistol-right-thigh}.png`
- **Belt Magazines:** In both `unarmed` and `pistol` across `front` and `3q`, the two front belt magazine pouches are closed dark shells with **no protruding/exposed magazine tips** sticking above or outside the front belt pouches (vs the historical `668e97a3` pre-land images, which retain identical visual appearance outside the closed-pouch geometry).
- **Remaining Other Gear / Thigh Objects / Camera Framing (Reported Honestly):**
  1. **Flat dark rectangular thigh plate & round olive grenades on anatomical LEFT thigh:** Clearly visible in `unarmed-3q`, `unarmed-right-thigh`, `pistol-3q`, and `pistol-right-thigh` (viewer's right side of the waist/thigh) — a flat dark-grey rectangular slab/box sits sharply angled along the outer upper-left thigh directly beside two round green grenades, with a large brown drop/HIP pouch hanging below the rear-left belt.
  2. **Anatomical RIGHT thigh silhouette / historical camera angle:** Note that the matched historical AG-358 `right-thigh` camera azimuth sits at `(+X, +Z)` (viewer's right = character's anatomical **left** thigh). Therefore `right-thigh` focuses on the anatomical left thigh/hips, while the anatomical **right** thigh holster/box edge (`AG-340`) is seen mainly in silhouette on the viewer's left hip in `pistol-front` / `unarmed-front` and needs a `-X` camera view if direct anatomical-right-thigh inspection is desired.
  3. **Unarmed left cuff/hand proximity & chest bar:** In `unarmed-3q` and `unarmed-right-thigh`, the left gloved hand hangs right against the lower-left thigh strap / grenade cluster; in `unarmed-front` and `pistol-front`, the thin horizontal metallic/grey chest badge bar extends slightly proud at the left chest seam.
  4. **Out-of-scope / unwaived items:** Originals remain `310 PASS / 1 FAIL` (`t184` gun direction `0.15 rad`, Director disposition pending); full-motion, self-clipping, FPS/load, and unrelated thigh-gear acceptance are **NOT** verified or waived here.
