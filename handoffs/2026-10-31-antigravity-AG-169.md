# Handoff: AG-169 — GPU Validation & Shots for GP-19987, GP-19988, and GP-19989

- **Date:** 2026-10-31
- **Agent:** `antigravity` (`Gemini 4 Argon (High)`)
- **Task:** `AG-169` — GPU validation & shots for `GP-19987` (lead-gate & READY), `GP-19988` (backwards cap + balaclava 4-light & brute get-up filmstrip), and `GP-19989` (workbench & CIF zoom)
- **Evidence Folder:** `qa/2026-10-31-AG-169/` (`ag169-summary.json`, `run-ag169.mjs`, `retake-cap.mjs`, 28 PNG screenshots)

Changed:
- `qa/2026-10-31-AG-169/run-ag169.mjs`, `qa/2026-10-31-AG-169/retake-cap.mjs`, `qa/2026-10-31-AG-169/ag169-summary.json`, `qa/2026-10-31-AG-169/report.md`, and 28 GPU validation screenshots (`qa/2026-10-31-AG-169/*.png`).

Tests:
- `node tools/realtest.mjs t307 --all`: 6 pass, 0 fail (`31.7s` on real WebGPU renderer, RTX 5080).

Not verified:
- Live gameplay brute knockdown integration with `studio/motion.js` (`index.html:52993` still calls `knockDownPitch`).

---

## Executive Summary & Principle Scores

| Ticket | Scope | Verdict | Score (0–5) | Key Takeaway |
|---|---|---|---:|---|
| **GP-19987** | Day-1 Fuel Lead Gate (`t307`) & READY Briefing `.objective-tracker` | **PASS** | **5.0 / 5** | `realtest t307 --all` passes **6/6** (`31.7s` on WebGPU RTX 5080). Closed gate hides prompt & blocks `KeyE` fill (`fill = 0`); open gate restores `"Hold E - Fill the can"` / `"Filling..."`. `.objective-tracker` renders inside `.briefing-report` at `1280×720` (`w = 828`) and `390×844` (`w = 310`, `scrollWidth = 390`). |
| **GP-19988 (Part A)** | Backwards Ballcap (`ballcapBack`) + Balaclava 5-Angle & 4-Light Pass | **PARTIAL / NEEDS LOWER-RIM FIX** | **3.0 / 5** | Swapping `[y, w, f, b] -> [y, w, b, f]` in `backRings` fixed the upper forehead crown (`y >= 1.52 m`, `+27.6 mm` clearance at `y = 1.53 m`), **but along the lower sweatband rim (`y = 1.49..1.51 m`) across the forehead temples (`|θ| = 15°..75°`), the brown balaclava hood still protrudes by `~7.2 mm`**, creating a jagged sawtooth polygon intersection (`gp19988-cap-noon-front.png`, `left.png`, `right.png`). Root cause: `planPoint()` uses exponent `0.80` on `c < 0` vs `0.55` on `c >= 0`. |
| **GP-19988 (Part B)** | Brute Get-Up Filmstrip (`studio/motion/zombie/brute.json` v3) | **FAIL** | **2.0 / 5** | Across beats 1–3 (`u = 0.02, 0.35, 0.55`), the brute's torso remains **vertical** (`spine` upright) and sinks waist-deep into the floor (`pelvisY = 0.12 m`) with arms tucked at its chest rather than planted on the ground (`gp19988-brute-getup-1..3.png`). Root cause: `brute.json` v3 omits `waist`, `shoulderL/R`, `elbowL/R`, and `hipL/R`, while `ZOMBIE_BODY` solves `spine` up-axis from `waist -> chest` (`studio/bodies.js:24`). Also, live gameplay (`index.html:52993`) still uses `knockDownPitch`. |
| **GP-19989** | CIF (`#cifMarine`) & Armory Workbench (`.armory-preview-stage`) Zoom | **PASS** | **4.8 / 5** | Smooth wheel & 2-pointer touch-pinch zoom across `[1.0, 2.5]` with clean min/max clamping, zoom preservation when switching CIF items (`cap` head-frame at `2.5×` frames at `camZ = 0.78` with 0 mesh clipping), and clean reset to `1.0×` on close/reopen from both 1P and 3P (`0` console/page errors). |

---

## 1. GP-19987 — Day-1 Fuel Lead Gate & READY Briefing `.objective-tracker` (`5.0 / 5` PASS)

### Automated Suite (`t307`)
- Executed via slot runner: `node tools/realtest.mjs t307 --all`
- **Result:** **6 pass, 0 fail** (`31.7s` on real WebGPU renderer, NVIDIA GeForce RTX 5080).

### GPU Visual & Telemetry Verification (`ag169-summary.json`)
1. **Closed Lead Gate (`qa/2026-10-31-AG-169/gp19987-fuel-closed-hold-e.png`)**:
   - Teleported marine to the can (`(-192, -168)`), picked up the gas can (`phase: "at-pump"`), and moved to the depot fuel pump (`(164, 152)`) **before** `story open generator`.
   - Held `KeyE` for `1.25s` of sim-time:
     - `closedPhase: "at-pump"`
     - `closedFill: 0` (zero fuel progress while unled)
     - `closedPrompt: null` (prompt hidden cleanly)
2. **Open Lead Gate (`qa/2026-10-31-AG-169/gp19987-fuel-open-hold-e.png`)**:
   - Ran `story open generator`, waited `350 ms`, and held `KeyE` for `1.25s` of sim-time:
     - `openPromptBefore: "Hold E - Fill the can"`
     - `openPhase: "at-pump"`
     - `openFill: 1.2693`
     - `openPromptDuring: "Filling..."` (floating action ring + `"FILLING..."` label rendered cleanly above the marine).
3. **READY Briefing `.objective-tracker` (`gp19987-ready-desktop.png`, `gp19987-ready-narrow-390.png`)**:
   - Tracked an objective on the full map, closed map, and opened the READY briefing dialog (`TT.openMenuDbg('briefing')`):
     - **Desktop (`1280×720`, `gp19987-ready-desktop.png`)**: `.objective-tracker` (`"Recover the depot fuel"`) is hosted inside `.briefing-report` (`#wavePreview`), `rect: { x: 226, y: 311, w: 828, h: 173 }`.
     - **Narrow (`390×844`, `gp19987-ready-narrow-390.png`)**: `rect: { x: 40, y: 120, w: 310, h: 205 }`, `fitsViewport: true`, `scrollWidth: 390` (zero horizontal overflow).

---

## 2. GP-19988 — Backwards Cap + Balaclava & Brute Get-Up Filmstrip (`2.5 / 5`)

### Part A: Backwards Ballcap (`ballcapBack`) + Balaclava (`3.0 / 5` — Upper Crown Fixed, Lower Rim Still Clips)
- **Screenshots (`qa/2026-10-31-AG-169/`)**:
  - 5 Angles + Gameplay at Noon: `gp19988-cap-noon-front.png`, `gp19988-cap-noon-left.png`, `gp19988-cap-noon-right.png`, `gp19988-cap-noon-back.png`, `gp19988-cap-noon-top.png`, `gp19988-cap-noon-gameplay.png`
  - 4 Lighting Conditions (`3/4` forehead/temple closeup): `gp19988-cap-overcast-3q.png`, `gp19988-cap-dusk-3q.png`, `gp19988-cap-night-3q.png` (plus `gp19988-cap-noon-front.png`)
- **What Fixed**:
  - Above `y = 1.52 m` (around the black rear adjustment strap and upper M81 panels), swapping `f` and `b` in `backRings` (`studio/marine-hats.js:110`) gives `+27.6 mm` front clearance at `y = 1.53 m` (`capFrontMinZ["1.53"] = 0.1175 m` vs `maskFrontMaxZ["1.53"] = 0.0899 m`). The upper crown and black strap are completely clear of the balaclava hood.
- **What Still Clips (`y = 1.49..1.51 m` Lower Forehead / Temple Rim)**:
  - In `gp19988-cap-noon-front.png`, `gp19988-cap-noon-left.png`, `gp19988-cap-noon-right.png`, and `gp19988-cap-overcast-3q.png`, the brown balaclava hood pokes through the bottom rim of the green M81 cap across the forehead and temples in a jagged sawtooth pattern (`capFrontMinZ["1.49"] = 0.1045 m`, `capFrontMinZ["1.51"] = 0.1009 m` vs `maskFrontMaxZ["1.50"] = 0.1196 m`).
- **Exact Geometric Root Cause (`studio/marine-hats.js:11-14, 107-110, 135`)**:
  1. In `studio/marine-hats.js:11-14`, `planPoint(w, f, b, a)` uses asymmetric superellipse exponents for the front and back hemispheres:
     ```js
     return [w * s, c >= 0 ? f * Math.pow(c, .55 * round + (1 - round)) : -b * Math.pow(-c, .8 * round + (1 - round))];
     ```
     - Front (`c >= 0`) uses `c^0.55` (blunt/full forehead temples).
     - Back (`c < 0`) uses `(-c)^0.80` (narrower/tapered occiput).
  2. Because `dress.hats.ballcapBack` rotates the mesh by `back.rotation.y = Math.PI` (`line 135`), the cap's local `-z` hemisphere (`c < 0`, exponent `0.80`) is rotated onto the marine's `+z` forehead (where `buildBalaclava` in `ui/marine-face.js:35` uses `front * c^0.55`).
  3. Swapping `[y, w, f, b] -> [y, w, b, f]` in `backRings` matches the radius only at the cardinal poles (`θ = 0°` and `θ = ±90°`). At `θ = ±45°` (`c = 0.7071`) and `y = 1.495 m`:
     - `buildBalaclava` (`ui/marine-face.js:158`): `z_hood(45°) = 0.1400 * (0.7071^0.55) = 0.1157 m`
     - `ballcapBack` (`studio/marine-hats.js:107, 110`): `z_cap(45°) = 0.1431 * (0.7071^0.80) = 0.1085 m`
     - **`z_cap` sits `7.2 mm` inside `z_hood` across the front-left and front-right temples!**
  4. **Recommended Fix**: In `studio/marine-hats.js`, flip the `0.55` / `0.80` exponents in `planPoint` when lofting `backRings` (so the `-z` half of `backRings` uses `(-c)^0.55` and `+z` uses `c^0.80`), and bump the lower brow clearance on `ballRings[0..1]` (`y = 1.495, 1.52`) from `.0105` to `.0145` so it clears the balaclava hood's cloth thickness all around.

### Part B: Brute Get-Up Filmstrip (`studio/motion/zombie/brute.json` v3, `2.0 / 5` FAIL)
- **Screenshots (`qa/2026-10-31-AG-169/`)**:
  - `gp19988-brute-getup-1-down-palms.png` (`u = 0.02`)
  - `gp19988-brute-getup-2-knee-under.png` (`u = 0.35`)
  - `gp19988-brute-getup-3-two-arm-push.png` (`u = 0.55`)
  - `gp19988-brute-getup-4-hip-rise.png` (`u = 0.70`)
  - `gp19988-brute-getup-5-head-lag.png` (`u = 0.86`)
  - `gp19988-brute-getup-6-recovered.png` (`u = 1.00`)
- **Telemetry (`ag169-summary.json` -> `gp19988.bruteFilmstrip`)**:
  | Beat | `u` | `pelvisY` | `chestY` | `headY` | `handLY` | `handRY` | `kneeLY` | `kneeRY` | Visual Pose on Real Brute Mesh |
  |---|---:|---:|---:|---:|---:|---:|---:|---:|---|
  | `1-down-palms` | `0.02` | `0.120` | `0.943` | `1.135` | `0.659` | `0.659` | `0.105` | `0.105` | Torso **vertical**, waist sunk into dirt, hands floating at `0.66 m` |
  | `2-knee-under` | `0.35` | `0.120` | `0.435` | `0.562` | `0.251` | `0.369` | `0.105` | `0.145` | Torso **vertical**, sunk to chest in dirt (`pelvisY = 0.12`) |
  | `3-two-arm-push` | `0.55` | `0.244` | `0.733` | `0.818` | `0.483` | `0.530` | `0.119` | `0.415` | Torso **vertical**, rising straight up out of the floor |
  | `4-hip-rise` | `0.70` | `0.583` | `1.202` | `1.269` | `0.752` | `0.779` | `0.122` | `0.471` | Half-standing upright |
  | `5-head-lag` | `0.86` | `0.935` | `1.675` | `1.883` | `1.073` | `1.087` | `0.366` | `0.487` | Nearly standing upright |
  | `6-recovered` | `1.00` | `1.045` | `1.830` | `2.185` | `1.366` | `1.366` | `0.517` | `0.517` | Full standing rest pose |
- **Root Cause Diagnosis (Two Issues)**:
  1. **`brute.json` v3 `getup.keys` omits `waist`, `shoulderL/R`, `elbowL/R`, and `hipL/R`**:
     - In `studio/bodies.js:24`, the zombie upper-body joint (`spine`) is driven by `const UPPER = { x: ['shoulderL', 'shoulderR'], up: ['waist', 'chest'] }`. Its pitch/tilt is computed from the vector **`waist -> chest`**, NOT `pelvis -> chest`!
     - In `studio/motion.js` (`follow()`), any control point not listed in `clip.keys` remains at its **standing animated target `A`** (`waist.y ≈ 1.50 m`, `shoulderL/R.y ≈ 1.95 m`). When `brute.json` v3 pulls `chest` down (`dy = -1.14, dz = +0.55`) and `pelvis` down (`dy = -0.59, dz = -0.15`) without moving `waist`, `shoulderL/R`, `elbowL/R`, or `hipL/R`, the omitted points pull `chest` and `waist` back into a vertical column during PBD distance-constraint projection (`['pelvis', 'waist']`, `['waist', 'chest']`), leaving `waist` directly under `chest` (`spine` vertical) and driving `pelvis` down to the floor clamp (`0.12 m`)!
     - **Fix for `brute.json` v3**: Author matching forward-pitched offsets for `waist` (interpolated between `pelvis` and `chest`, e.g. `dy ≈ -0.86, dz ≈ +0.20` at `t = 0`), `shoulderL` / `shoulderR` (matching `chest` + clavicle width), `elbowL` / `elbowR` (bent outward/back between `shoulder` and planted `hand`), and `hipL` / `hipR` (matching `pelvis`).
  2. **Live gameplay (`index.html:52993 & 57344`) still uses `knockDownPitch`**:
     - `bomberBlast` and `explodeGrenade` still set `z.knockTimer = KNOCK_HOLD + KNOCK_RISE` (`0.90s`) and call `knockDownPitch(z, dt)` (rigid `z.mesh.rotation.x` interpolation) rather than driving `z.mesh` through `studio/motion.js`.

---

## 3. GP-19989 — Armory Workbench & CIF Inspection Zoom (`4.8 / 5` PASS)

### CIF Inspection Canvas (`#cifMarine`)
- **Screenshots (`qa/2026-10-31-AG-169/`)**:
  - `gp19989-cif-open-1x.png` (`1280×720`, default `1.0×` open state)
  - `gp19989-cif-zoom-2.5x.png` (`1280×720`, zoomed to `2.5×` on full frame)
  - `gp19989-cif-switch-cap-2.5x.png` (`1280×720`, switched item to `cap` (`frame: "head"`) while at `2.5×`)
  - `gp19989-cif-reopen-reset-1p.png` (`1280×720`, reopened from 1P view — resets cleanly to `1.0×`)
  - `gp19989-cif-narrow-390-zoom.png` (`390×844`, narrow viewport at `2.5×` zoom)
- **Telemetry (`ag169-summary.json` -> `gp19989.cif`)**:
  - **Open at `1.0×`**: `openZoom: 1`, `openCamZ: 4.331`, `openFrame: "full"`, `hintText: "Drag to turn. Scroll or pinch to zoom."`
  - **Wheel Zoom In & Clamp**: `zoomInSteps: [1.918, 2.357, 2.5]`, `maxClampZoom: 2.5`, `zoomedCamZ: 1.733` (`4.331 / 2.5`).
  - **Preserve Zoom Across Item Switch (`cap` / `"head"` frame at `2.5×`)**: `switchToCapAtZoom: { zoom: 2.5, item: "cap", frame: "head", camY: 1.491, camZ: 0.78 }` — camera smoothly frames the head closeup at `z = 0.78 m` with **zero near-plane clipping** into the nose or cap!
  - **Wheel Zoom Out & Clamp**: `minClampZoom: 1`.
  - **Two-Pointer Touch Pinch**: Dispatching a 2-pointer spread (`dy: 120 -> 280 px`) on `#cifMarine` smoothly drove `pinchZoom: 1.85`.
  - **Close & Reopen Reset (3P & 1P)**: Reopening CIF from 3P (`reopenZoomFrom3P: 1`) and 1P (`reopenZoomFrom1P: 1`, `viewFirstAfterCifClose: true`) resets `zoom` to `1.0` without perturbing gameplay camera mode.
  - **Narrow Viewport (`390×844`)**: `scrollWidth: 390`, `innerWidth: 390` (zero horizontal overflow).

### Armory Workbench Preview (`.armory-preview-stage`)
- **Screenshots (`qa/2026-10-31-AG-169/`)**:
  - `gp19989-wb-open-1x.png` (`1280×720`, `KR-7 Rifle` at default `1.0×`)
  - `gp19989-wb-zoom-2.5x.png` (`1280×720`, `KR-7 Rifle` zoomed in to `2.5×` — crisp receiver, rail, and handguard detail)
  - `gp19989-wb-narrow-390-zoom.png` (`390×844`, narrow responsive layout)
  - `gp19989-wb-reopen-reset.png` (`1280×720`, switched weapon on shelf -> resets to `1.0×` baseline)
- **Telemetry (`ag169-summary.json` -> `gp19989.workbench`)**:
  - `hintText: "Drag to turn · Scroll or pinch to zoom · Home faces front"`
  - `stageRect: { x: 243, y: 120, w: 691, h: 256 }`
  - `changedOnZoomIn: true`, `changedOnPinch: true`, `reopenResetChangedFromZoomed: true`
  - `consoleErrors: []`, `pageErrors: []`.
  - *Minor Narrow-Viewport Note (`390×844`)*: On `390×844`, `.armory-bench` stacks vertically below `.armory-shelf` inside `#armoryPanel`, so the player scrolls `#armoryPanel` vertically to bring `.armory-preview-stage` into view (no horizontal overflow: `scrollWidth = 390`).
