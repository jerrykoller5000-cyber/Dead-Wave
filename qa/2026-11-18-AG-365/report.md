# AG-365 QA Report — J164 Landed Supplementary Anatomical RIGHT (`-X`) Thigh Closeups (`72e543b4`)

- **Date:** 2026-11-18
- **Author:** Antigravity (`AG-365`, supplementary unmatched `-X` follow-up to `AG-364` / `GT-20124`)
- **Historical evidence preserved untouched:** `review/GT-20124/native-mag-short-ag-v1-668e/`, `review/GT-20124/native-mag-landed-ag-v1/` (`AG-362`), `review/GT-20124/native-mag-landed-ag-v2/` (`AG-364`), `qa/2026-11-18-AG-364/`

---

## 1. Execution, Provenance & Orientation Verification

- **Command run (shared game-test slot, `Rule 16`):**
  `node crew/crew.mjs slot run antigravity AG-365 --checks "J164 landed anatomical right-thigh (-X) supplementary unarmed+pistol closeups" -- node qa/2026-11-18-AG-365/native-mag-landed-anatomical-right-thigh.mjs`
- **Exit code:** `0` (`ANATOMICAL RIGHT THIGH CONTAINMENT {"failures":[]}`)
- **Source integrity (`qa/2026-11-18-AG-365/captures/receipt.json`):**
  - `sourceStable: true`, `noPackageURLOverrides: true`, `publicHeldPresentation: true`, `actualNormalNativeRender: true`, `frames: 2`
  - All 6 J164 landed production targets exact (`index.html` MD5 `72e543b44476bf4187896db03d2811b3`).
  - Narrowly copied QA scripts (`qa/2026-11-18-AG-365/native-mag-landed-anatomical-right-stage.js` and `qa/2026-11-18-AG-365/native-mag-landed-anatomical-right-thigh.mjs`) changed ONLY camera azimuth (`+X -> -X`), view label (`anatomical-right-thigh`), and QA output directory.
- **Unmatched camera labeling & Marine orientation verification:**
  - `matchedHistoricalPrelandCameras: false`, `supplementaryUnmatchedSideViews: true`, `mirroredAzimuthFromHistoricalRightThigh: true`
  - Historical `AG-358`/`AG-364` `right-thigh` used `x = C.cx + 0.88`, `tx = C.cx + 0.112` (which framed Marine's anatomical **LEFT**, `+X`).
  - These NEW unmatched supplementary views mirror X across `C.cx`: `x = C.cx - 0.88`, `y = C.baseY + 1.6`, `z = C.cz + 1.0` looking at `tx = C.cx - 0.112`, `ty = C.baseY + 0.70`, `tz = C.cz + 0.10`, `fov = 34`.
  - Runtime orientation check (`orientationTelemetry` in `receipt.json`): `marineForwardWorld: [0, 0, 1]`, `marineAnatomicalRightWorld: [-1, 0, 0]`, `cameraRelativeToCommon: [-0.88, +1.60, +1.0]`, `anatomicalRightDot: 0.6606`, `anatomicalSideVerified: true`. Visual confirmation: belt buckle/toes face `+Z`, and the right forearm carries the outer cuff wrist-watch/device (`side < 0` / `-X`).
- **180s Look Barrier:** Inspected `qa/2026-11-18-AG-365/captures/landed/unarmed-anatomical-right-thigh.png` immediately and wrote `qa/2026-11-18-AG-365/captures/landed/FIRST-CELL-LOOKED.txt` (`LOOKED landed GT20124 anatomical-right-thigh`).

---

## 2. Containment & Invariants

| Pose | View | Renderer | `all16Inside` | `vestSlotsExact` | `instanceCapacity` | Whole-`InstancedMesh` Delta (Info Only) |
|---|---|---|---:|---:|---:|---:|
| `unarmed` | `anatomical-right-thigh` (`-X`, new unmatched) | `WebGPU` | `true` | `true` | `5` | `differentPixels = 0` |
| `pistol` | `anatomical-right-thigh` (`-X`, new unmatched) | `WebGPU` | `true` | `true` | `5` | `differentPixels = 0` |

- Both belt magazine instances (`instance 0` and `instance 1`) have all 8 corners inside the closed 48-triangle native belt pouch shells (`maxBindErrorMetres: 0`, `toleranceMetres: 0.000002`, `failures: []`).

---

## 3. Honest Visual Findings (`unarmed` & `pistol` Actual Anatomical RIGHT Thigh)

Inspected `qa/2026-11-18-AG-365/captures/landed/{unarmed,pistol}-anatomical-right-thigh.png`, their `-mag-hidden.png` pairs, and `qa/2026-11-18-AG-365/sheet-anatomical-right-thigh.jpg`:

1. **Front-right belt magazine pouch (`unarmed` & `pistol`):** Cleanly closed dark pouch shell with **no exposed magazine tip** and **no floating `rig.mags` dark block on the front of the right thigh** (the pre-fix `AG-340` `y = 0.705` block is completely gone).
2. **Flat dark vertical thigh holster plate (`holsterW`) & `holster-thigh-band` (`-X` outer right thigh):** Clearly visible in `pistol-anatomical-right-thigh.png` (and in its 2x zoom crop) sitting vertically along the upper outer front edge of the tan cargo pocket (`side = -1`), encircled cleanly by the black `holster-thigh-band` retention strap around the tapered thigh. Its flat dark rectangular slab silhouette stands slightly sharp/proud on the outer right thigh, symmetric to its twin seen on the anatomical left thigh in `AG-364`.
3. **Upper-outer right hip drop-leg hanger strap/buckle & two olive grenades (`pistol`):** Raising the arms in `pistol` exposes two small dark-grey boxy protrusions just below the belt on the upper outer `-X` hip crease (the drop-leg hanger strap/buckle from `studio/marine-body.js:248-249` emerging near the tapered hip curve), sitting directly above the two round olive-green grenades on the rear-outer right hip.
4. **Nearby right forearm & gloved hand (`unarmed` vs `pistol`):**
   - In `unarmed-anatomical-right-thigh.png`, the right forearm (with the small black cuff wrist-watch/device on the outer sleeve) hangs straight down over the outer right hip/thigh: the cuff and gloved hand sit cleanly outside/in front of the `holster-thigh-band` and cargo pocket without clipping into the trouser mesh, while visually occluding most of the dark `holsterW` plate and the `-X` hip strap/buckle blocks (with the two olive grenades visible behind the upper forearm/elbow).
   - In `pistol-anatomical-right-thigh.png`, both arms are raised forward toward the upper-right of the frame holding the pistol, leaving the anatomical right thigh and hip gear fully unobstructed.

---

## 4. Scope & Unwaived Items

- Extra visual evidence ONLY on exact `72e543b4` landed production; zero source, pose, threshold, or historical-matched-evidence edits.
- Does **NOT** waive the open `t184` `0.15 rad` gun-direction red, or accept full motion, other stances/lighting, FPS, or unrelated thigh-gear aesthetics.
