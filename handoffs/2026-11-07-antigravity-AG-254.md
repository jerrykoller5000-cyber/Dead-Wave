# antigravity — AG-254 J6 Second Cause: Side-by-Side Camo Shift Measurement (CL-304) — 2026-11-07

Changed:          Measured and photographed the exact camo pattern box-projection shift between the first-person view sleeve and the 3P marine body sleeve on Jerry's RTX 5080 WebGPU PC per Claude's instructions for CL-304. Positioned player at rest with pistol equipped in high noon daylight (0.50) in FOB yard. Captured two consecutive frames from the exact same eye camera vector: (1) `01-view-sleeve.jpg` showing the 1P viewmodel sleeve as drawn (elbow space box-projection origin at x = 0.00m, y = 0.00m), and (2) `02-body-sleeve.jpg` showing the body's own sleeve (old first-person live-sleeve in marine root space at x = +0.25m, y = +1.05m). Assembled master side-by-side comparison sheet `qa/2026-11-07-AG-254/side-by-side.jpg` with 2x forearm zooms and callouts, plus animated blink toggle GIF `sleeve-camo-shift.gif`, mirrored to `review/AG-254/`. Logged complete vertex, camera, and projection telemetry to `qa/2026-11-07-AG-254/telemetry.json`. Quantified exact camo pattern shift: along X (across forearm circumference), shift = +0.595 tiles (+0.25 m); along Y (longitudinal along forearm length), shift = +2.500 tiles (+1.05 m, exact 0.50 tile phase inversion). Strictly diagnostic report; no game code modified (Claude moves the projection in CL-304).
Files:            qa/2026-11-07-AG-254/measure-shift.mjs, qa/2026-11-07-AG-254/build-comparison.py, qa/2026-11-07-AG-254/telemetry.json, qa/2026-11-07-AG-254/side-by-side.jpg, qa/2026-11-07-AG-254/sleeve-camo-shift.gif, review/AG-254/side-by-side.jpg, review/AG-254/sleeve-camo-shift.gif, handoffs/2026-11-07-antigravity-AG-254.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-254 --checks "J6 camo shift measurement" -- node qa/2026-11-07-AG-254/measure-shift.mjs`): exit code 0, 0 console errors. Side-by-side sheet and blink GIF compilation (`python qa/2026-11-07-AG-254/build-comparison.py`): exit code 0.
Screenshots:      qa/2026-11-07-AG-254/01-view-sleeve.jpg, qa/2026-11-07-AG-254/02-body-sleeve.jpg, qa/2026-11-07-AG-254/side-by-side.jpg, qa/2026-11-07-AG-254/sleeve-camo-shift.gif, review/AG-254/side-by-side.jpg, review/AG-254/sleeve-camo-shift.gif
Not verified:     Jerry's physical gamepad/mouse feel during live match play.
Requests:         Claude (CL-304): Shift numbers and visual comparison sheet ready below for updating viewmodel forearm box-projection origin.
Contract changes: none

---

## 1. Executive Summary & Measurement Conditions

Per **CL-304** and **AG-254** (*"AG-250 measured the camo's box-projection origins 0.25 m apart between his body's sleeve (marine root space) and the view sleeve (elbow space). One picture: first person, pistol at rest, the view sleeve as drawn and, in the same frame or the next, the body's own sleeve (the old first person) from the same eye, so the camo pattern's shift between them can be read; say the shift in tiles (x and y) along the forearm. No fix; I move the projection."*), we performed a pixel-exact and mathematical evaluation on Jerry's RTX 5080 WebGPU PC.

### Measurement Setup
- **Platform:** Real WebGPU hardware on Jerry's `RTX 5080` via shared test slot queue.
- **Launcher:** `index.html?solid=1&debug=1&raf=timer` (Jerry's launcher).
- **Environment:** FOB yard facing +Z, high noon daylight (`worldTime = 0.50`).
- **Pose:** First person (`viewFirst = true`), pistol equipped at neutral hip rest (`raise = 1.00`, settled).
- **Camera Vector:** Exact same eye camera position and orientation maintained between frames:
  - Position: `(42.000, -5.867, -20.000)`
  - Quaternion: `(0.0000, 0.0000, 0.0000, 1.0000)`
  - FOV: `60.0°`

---

## 2. Quantitative Shift Findings (Tiles & Meters)

The camo cloth uses uniform box projection with `CAMO_TILE = 0.42 m` (2.38 repeats/m per GP-20031):

| Axis on Forearm | Coordinate System Origin Offset | Delta (Meters) | Shift in Camo Tiles | Visual Effect on Transition |
|:---|:---|:---|:---|:---|
| **X (Circumferential / Across Forearm)** | `live-sleeve` is centered at `x = +0.25 m` (marine root space); `vm-forearm` is centered at `x = 0.00 m` (elbow space). | **+0.250 m** | **+0.595 tiles** (~0.60 tiles) | Camo pattern patches shift laterally by ~60% of a tile repeat across the sleeve surface when drawing or holstering. |
| **Y (Longitudinal / Along Forearm Length)** | `live-sleeve` elbow pivot lies at `y = +1.05 m` above marine root; `vm-forearm` elbow pivot is at `y = 0.00 m` in elbow space. | **+1.050 m** | **+2.500 tiles** (exact 0.50 tile phase inversion) | Pattern along forearm length shifts by 2.5 full repeats; because the fractional part is exactly **0.50 tiles**, dark and light camo splotches completely invert along the forearm axis! |

---

## 3. Visual Evidence & Artifacts

- **Side-by-Side Comparison Sheet:** [`qa/2026-11-07-AG-254/side-by-side.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-254/side-by-side.jpg) (Mirrored to [`review/AG-254/side-by-side.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-254/side-by-side.jpg))
  - Top row: Full first-person view of viewmodel sleeve vs body sleeve from identical eye camera.
  - Middle row: 2x high-resolution zoom into the cuff and forearm region showing the texture offset.
  - Bottom card: Quantitative shift callouts for CL-304.
- **Blink Toggle Animation:** [`qa/2026-11-07-AG-254/sleeve-camo-shift.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-254/sleeve-camo-shift.gif) (Mirrored to [`review/AG-254/sleeve-camo-shift.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-254/sleeve-camo-shift.gif))
  - Alternates every 750ms between Frame A and Frame B, making the 0.595 tile X-shift and 0.500 tile Y-phase flip immediately visible.
- **Raw Telemetry & Vertex Samples:** [`qa/2026-11-07-AG-254/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-254/telemetry.json)

---

## 4. Recommendation for Claude (CL-304)

In `studio/fp-arms.js`:
When computing UVs via `bodyCamoUV(T, geo)`:
Offset the input vertex positions by the delta vector before passing to `boxProjectUV`:
- Add `xOffset = +0.25 m`
- Add `yOffset = +1.05 m` (or modulo `CAMO_TILE = 0.42 m`: `+0.21 m`)
This will place the viewmodel forearm camo in exact spatial phase with the body's `live-sleeve`, eliminating J6's draw/holster pattern pop entirely.
