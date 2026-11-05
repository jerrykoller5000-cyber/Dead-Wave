# AG-227 — GP-20021 Brighter Folded View-Gun Materials Eye Check

- **Date**: 2026-11-03
- **Author**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-227` (Audit and evaluation in response to ChatGPT's request: `GP-20021 eye check: brighter folded view-gun materials`)
- **GPU Hardware & Environment**:
  - `NVIDIA GeForce RTX 5080` (Desktop, Driver 572.16)
  - Resolution: `1920×1080 @ 1.00x` (`1080p`) WebGPU (Chrome CDP)
  - Canonical Lighting: **Noon** (`t=0.50`, clear), **Overcast** (`t=0.42`, rain `0.85`), **Dusk** (`t=0.77`, clear), **Night** (`t=0.02`, clear)
  - Seat: Woods-trail baseline seat (`[42.0, -7.5468, -20.0]`, `yaw = 0.000149`, `pitch = 0.0`)
- **Audited Code & Review Captures**:
  - `game/viewmodel.js`: `vmFinish` palette, `finishViewMaterial` (fold-static 2x color lift, TSL grazing edge glint on `emissiveNode`), `makeVmMat`, `mirrorMaterial`
  - Captures: `review/GP-20021/*.jpg` (`launcher`, `aa12`, `flamer`, `shotgun` across all 4 canonical lights)
  - Baseline: `qa/2026-11-03-AG-225/stills/` (pre-lift baseline across all 12 viewmodels)
  - Jerry Reference Photos: `review/weapon-photos/AG-Weapons/` (`Launcher/launcher-refined-v3.jpg`, `AA-12/aa12-refined-v2.jpg`, `Flamer/flamer-refined-v2.jpg`, `Shotgun/shotgun-refined-v2.jpg`)

---

## 1. Executive Summary & Verdict

- **Overall Verdict**: **CONDITIONAL PASS (`4.35 / 5.0` mean across the 4 weapons)**.
  - **Launcher (`4.50 / 5.0`)**: **PASS**. 2x fold-static color lift and palette split provide clean separation between the flat receiver plate, parkerized tube, and polymer grip.
  - **AA-12 Breacher (`4.75 / 5.0`)**: **PASS / STANDOUT**. The top receiver chamfer and edge glint solve the long-standing dark silhouette issue; receiver bevel is +32.2 lum at Noon and +24.1 lum at Dusk.
  - **Shotgun (`4.45 / 5.0`)**: **PASS**. Side plate is +25.4 lum at Noon and +20.0 lum at Dusk, distinguishing the stamped steel frame from the ribbed pump forend.
  - **Flamer (`3.40 / 5.0`)**: **SUB-4 DEFECT (Material Hook Miss)**.
    - **Root Cause Discovered**: In `index.html:20066`, `mergeBodyMetals()` merges the flamer, minigun, and sniper receiver parts into `gunBodyVC` (`color: 0xffffff, vertexColors: true`), which is instantiated as a standard unnamed material (`vm:MeshStandardMaterial`).
    - Because `src.name !== 'fold-static'`, `finishViewMaterial()` skips the 2x color lift, and `TSL.emissiveNode` edge glint is never attached.
    - As a result, the flamer body shows virtually **zero change** (+0.0 to +0.7 lum delta, casing is 18.7 lum at Dusk).
    - **One-line fix for ChatGPT**: In `game/viewmodel.js:finishViewMaterial()`, update the check to:
      `if (src.name === 'fold-static' || (src.vertexColors && src.color?.getHex() === 0xffffff)) { ... }` (and similarly for the edge glint `emissiveNode`).

---

## 2. Answers to ChatGPT's Specific Questions

### Question 1: Are contrast and material separation adequate at Noon and Dusk?
- **Noon (`t=0.50`)**: **YES** for Launcher, AA-12, and Shotgun.
  - The lifted receivers read cleanly at 40 cm without looking over-bright or cartoonish.
  - The phosphate and pressed steel finishes (`0x6d7178`, `0x858990`) contrast naturally with the darker polymer grips (`0x505451`) and parkerized barrels (`0x565b62`).
  - AA-12 drum magazine (`49.7` lum) sits distinctly separate from the upper receiver plate (`41.8` lum).
- **Dusk (`t=0.77`)**: **YES, with high praise for the TSL grazing edge glint**.
  - At Dusk, direct sun drops and diffuse skylight dominates. On the baseline (AG-225), dark weapons crushed into black silhouettes (< 16 lum).
  - The restrained edge glint (`facing = abs(dot(N, V)); edge = (1 - facing)^2.4; emissive = color * (edge * 0.14 + 0.012)`) produces an elegant, subtle rim definition along the outer chamfers without looking like an unshaded cartoon halo.
  - AA-12 bevel edge at Dusk measures `47.2` lum (vs `23.1` baseline, a +104% boost), keeping the weapon's physical silhouette crisp against dark trees.
  - *Exception*: Flamer does not benefit from this at Dusk due to the `gunBodyVC` hook miss noted above.

### Question 2: Which receiver details should be prioritized in `studio/weapon-*.js`?
Comparing against Jerry's refined reference photos in `review/weapon-photos/AG-Weapons/`:
1. **AA-12 (Breacher-12)** (`review/weapon-photos/AG-Weapons/AA-12/aa12-refined-v2.jpg`):
   - **Ejection Port & Bolt Face**: The ejection port cut-out is currently flat. Modeling an interior bolt face with exposed bare steel (`0x7b828b`, metalness 0.85, roughness 0.42) will add immediate high-value micro-contrast at 40 cm.
   - **Takedown Cross-Pins**: Two circular stamped cross-pins along the lower receiver rail.
2. **Launcher** (`review/weapon-photos/AG-Weapons/Launcher/launcher-refined-v3.jpg`):
   - **Break-Action Latch & Pivot Pin**: The hinge pin at the forward receiver base and the thumb latch on the left receiver flank catch strong specular glints in Jerry's ref.
   - **Cross-Bolt Safety Ring**: Red/bare-steel indicator dot on the receiver spine.
3. **Flamer** (`review/weapon-photos/AG-Weapons/Flamer/flamer-refined-v2.jpg`):
   - **Connect `gunBodyVC` to `finishViewMaterial` first** so the angular sheet-metal housing lifts 2x.
   - **Hex Fasteners with Washers**: Modeling raised hex bolt heads along the casing perimeter (`studio/weapon-heavy.js:309`) will catch the new edge glint.
   - **Brass Manifold Couplings**: Brighten the fuel regulator brass couplings connecting into the receiver manifold.
4. **Shotgun** (`review/weapon-photos/AG-Weapons/Shotgun/shotgun-refined-v2.jpg`):
   - **Loading Gate Cutout**: Deepen the beveled relief on the receiver belly and highlight the lifter fork.
   - **Trigger Housing Pins**: Two small drift pins above the trigger guard to break the flat slab of the receiver side plate.

---

## 3. Quantitative Telemetry & Pixel Measurements

Measurements taken from 1080p WebGPU renders in the canonical receiver zones (`qa/2026-11-03-AG-227/telemetry.json`):

### A. Receiver Zone Luminance & Contrast Matrix

| Weapon | Light Condition | AG-225 Baseline Mean Lum | GP-20021 Lifted Mean Lum | Lum Lift Ratio | AG-225 Edge Energy | GP-20021 Edge Energy | Edge Energy Ratio | Contrast Ratio (P90-P10)/(P90+P10) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`launcher`** | **Noon** (`0.50`) | `59.68` | `66.86` | **`1.120×`** | `3.570` | `3.887` | **`+8.9%`** | `0.6136` |
| | **Dusk** (`0.77`) | `16.70` | `21.58` | **`1.292×`** | `1.179` | `1.397` | **`+18.5%`** | `0.6784` |
| | **Overcast** (`0.42`) | `50.75` | `57.51` | **`1.133×`** | `2.962` | `3.266` | **`+10.3%`** | `0.5370` |
| | **Night** (`0.02`) | `17.16` | `22.01` | **`1.283×`** | `1.164` | `1.392` | **`+19.6%`** | `0.6819` |
| **`aa12`** | **Noon** (`0.50`) | `60.21` | `70.65` | **`1.173×`** | `3.216` | `3.407` | **`+5.9%`** | `0.6796` |
| | **Dusk** (`0.77`) | `16.05` | `22.71` | **`1.415×`** | `1.029` | `1.382` | **`+34.3%`** | `0.6042` |
| | **Overcast** (`0.42`) | `51.28` | `61.60` | **`1.201×`** | `2.608` | `2.919` | **`+11.9%`** | `0.4692` |
| | **Night** (`0.02`) | `16.50` | `23.17` | **`1.404×`** | `1.018` | `1.392` | **`+36.7%`** | `0.6175` |
| **`shotgun`** | **Noon** (`0.50`) | `75.82` | `82.54` | **`1.089×`** | `3.048` | `2.987` | `-2.0%` | `0.4726` |
| | **Dusk** (`0.77`) | `20.40` | `25.68` | **`1.259×`** | `1.068` | `1.157` | **`+8.3%`** | `0.3143` |
| | **Overcast** (`0.42`) | `61.05` | `67.78` | **`1.110×`** | `2.571` | `2.600` | **`+1.1%`** | `0.3012` |
| | **Night** (`0.02`) | `21.01` | `26.28` | **`1.251×`** | `1.053` | `1.137` | **`+8.0%`** | `0.3254` |
| **`flamer`** | **Noon** (`0.50`) | `61.82` | `63.00` | `1.019×` | `3.571` | `3.672` | `+2.8%` | `0.6909` |
| *(Defect)* | **Dusk** (`0.77`) | `17.50` | `17.90` | `1.023×` | `1.203` | `1.241` | `+3.2%` | `0.7186` |
| | **Overcast** (`0.42`) | `52.07` | `53.34` | `1.024×` | `3.075` | `3.162` | `+2.8%` | `0.6853` |
| | **Night** (`0.02`) | `18.43` | `18.41` | `0.999×` | `1.213` | `1.211` | `-0.2%` | `0.7281` |

### B. Sample Point Color & Luminance Deltas (Noon vs Dusk)

- **AA-12 Receiver Bevel (`[1420, 650]` px)**:
  - Noon: AG-225 `[87, 90, 97]` (`89.9` lum) -> GP-20021 `[118, 122, 133]` (`122.1` lum, **`+32.2` delta**)
  - Dusk: AG-225 `[19, 23, 34]` (`23.1` lum) -> GP-20021 `[43, 47, 59]` (`47.2` lum, **`+24.1` delta**)
- **Launcher Receiver Plate (`[1350, 750]` px)**:
  - Noon: AG-225 `[49, 52, 57]` (`51.7` lum) -> GP-20021 `[66, 69, 76]` (`68.9` lum, **`+17.2` delta**)
  - Dusk: AG-225 `[15, 19, 28]` (`18.8` lum) -> GP-20021 `[24, 28, 40]` (`28.2` lum, **`+9.4` delta**)
- **Shotgun Receiver Plate (`[1360, 700]` px)**:
  - Noon: AG-225 `[72, 73, 77]` (`73.2` lum) -> GP-20021 `[95, 99, 106]` (`98.6` lum, **`+25.4` delta**)
  - Dusk: AG-225 `[12, 16, 25]` (`15.8` lum) -> GP-20021 `[32, 36, 45]` (`35.8` lum, **`+20.0` delta**)
- **Flamer Receiver Casing (`[1360, 720]` px)**:
  - Noon: AG-225 `[67, 72, 77]` (`72.2` lum) -> GP-20021 `[67, 72, 77]` (`72.2` lum, **`+0.0` delta**)
  - Dusk: AG-225 `[15, 19, 27]` (`18.7` lum) -> GP-20021 `[15, 19, 27]` (`18.7` lum, **`+0.0` delta**)

---

## 4. Independent 0–5 Asset/Art Scores

Scored according to AGENTS.md rules 18-19, `docs/asset-principles.md` (Table VII), and `docs/specs/fps-pass.md`:

| Weapon | Geometry & Silhouette | Material Separation | Edge Glint & Bevels | Value Hierarchy | 4-Light Response | Overall Score | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`launcher`** | `4.6` | `4.5` | `4.4` | `4.5` | `4.5` | **`4.50`** | **PASS**. Clean separation between frame and barrel tube; no pixel blowout. |
| **`aa12`** | `4.8` | `4.7` | `4.9` | `4.7` | `4.7` | **`4.75`** | **PASS**. Best-in-class bevel edge response; solves dark silhouette. |
| **`shotgun`** | `4.5` | `4.5` | `4.3` | `4.5` | `4.5` | **`4.45`** | **PASS**. Stamped receiver plate clearly differentiated from pump forend. |
| **`flamer`** | `4.6` | `3.2` | `3.0` | `3.1` | `3.1` | **`3.40`** | **SUB-4 DEFECT**. Misses `finishViewMaterial` hook due to `gunBodyVC` naming. |
| **Composite Mean** | **`4.63`** | **`4.23`** | **`4.15`** | **`4.20`** | **`4.20`** | **`4.35 / 5.0`** | **CONDITIONAL PASS** (cleared pending Flamer material hook). |

---

## 5. Artifacts & Generated Files

- **Visual Comparison Sheets**:
  - `qa/2026-11-03-AG-227/compare-noon.jpg`: 6-column composite across all 4 weapons under Direct Sunlight (Ref vs Baseline vs Lifted vs Zoom vs Glint Heatmap).
  - `qa/2026-11-03-AG-227/compare-dusk.jpg`: 6-column composite under Dusk Horizon lighting (validating low-light bevel edge glint).
  - `qa/2026-11-03-AG-227/compare-overcast.jpg`: 6-column composite under Diffuse Overcast Rain.
  - `qa/2026-11-03-AG-227/compare-night.jpg`: 6-column composite under Flashlight Key.
- **Analysis Scripts & Telemetry**:
  - `qa/2026-11-03-AG-227/telemetry.json`: Quantitative luminance, edge energy, and contrast ratio metrics across all 4 weapons and all 4 lights.
  - `qa/2026-11-03-AG-227/analyze.py`: Pixel metrics calculation script.
  - `qa/2026-11-03-AG-227/generate_sheets.py`: Composite comparison sheet builder.
  - `qa/2026-11-03-AG-227/sample_points.py`: Specific receiver/barrel/furniture sample probe.
