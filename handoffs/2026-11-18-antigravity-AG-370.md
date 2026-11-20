# antigravity — AG-370 shambler Pass 6 + profile addendum — 2026-11-18

Changed:          Expanded Pass 6 Shambler cranium width/height/depth (`28.4cm` closed H, `28.9cm` depth, `20.4cm` cranium W vs Tripo `29.5/29.2/21.2cm`) while keeping slim `8.8cm x 9.1cm` neck entering under `40.7%` of skull middle with `7.9cm` occiput overhang, visible recessed eyes/teeth in `HEAD SIDE`, and updated `18-shambler-final-jerry.jpg`.
Files:            review/AG-357/shambler-head-skull.mjs; review/AG-357/shambler-step1.mjs; review/AG-357/index.html; qa/2026-11-18-AG-370/capture-pass6.mjs; qa/2026-11-18-AG-370/build_pass6_sheets.py; review/AG-357/18-shambler-final-jerry.jpg; review/AG-357/14-shambler-step4b-head-closeups.jpg; review/AG-357/13-shambler-step4b-noon-compare.jpg; review/AG-357/16-shambler-step4b-seam-closeups.jpg
Tests:            node --check on edited `.mjs` + python -m py_compile on `build_pass6_sheets.py` (exit 0); slot run capture-pass6.mjs -> WebGPUBackend, 36,496 tris LOD0 / 7,820 tris LOD1, 2 draws, 3 tex (3.0 MB @ 512), Errors: 0.
Screenshots:      review/AG-357/18-shambler-final-jerry.jpg; review/AG-357/14-shambler-step4b-head-closeups.jpg; review/AG-357/13-shambler-step4b-noon-compare.jpg; review/AG-357/16-shambler-step4b-seam-closeups.jpg; qa/2026-11-18-AG-370/frames-pass6/samescale-step3_512-head.png.
Not verified:     In-game spawned Shambler frame (review-only assets; live game files untouched); night row re-shot separately at game night settings in AG-371.
Requests:         none
Contract changes: none

# Handoff: AG-370 — AG-357 Shambler Pass 6 + Profile Addendum (Review-Only)

- **Agent:** Antigravity (`Gemini 4 Carbon`)
- **Date:** 2026-11-18
- **Status:** DONE (review-only in `review/AG-357/`, `qa/2026-11-18-AG-370/`)
- **Live game files touched:** none (`index.html`, `studio/`, `combat/`, `game/`, `tools/` untouched)

## 1. What changed (review-only)

1. **`review/AG-357/shambler-head-skull.mjs` (Pass 6 + Addendum):**
   - Expanded cranium width, height, and brow-to-occiput depth to match Jerry's `1.800 m`-normalized Tripo Shambler reference while keeping a slim upper neck (`8.78 cm` wide, `9.14 cm` chin-to-collar).
   - Repositioned upper neck under the skull's middle (`40.7%` from back vs Tripo `38.7%`) with a smooth diagonal suboccipital bun and **`7.92 cm`** occiput overhang behind the neck, avoiding a flat shelf crease.
   - Adjusted orbital cavity depth, lateral orbital pillar, glowing eyeballs (`z = 0.118`), softened laryngeal/throat ridges, and shifted upper/lower dental arches `+4 mm` forward so teeth and recessed cyan eyes silhouette clearly in `HEAD SIDE`.
2. **`review/AG-357/shambler-step1.mjs`:**
   - Updated head attachment pivot `(0, 0.486, 0.022)`, matching AO bake joint, and eye/nose/mouth AO occluder centers to track the Pass 6 skull geometry.
3. **`review/AG-357/index.html`:**
   - Added `aPoseNormScale`, `headComparison` (`ours_pass6`, `tripo`, `ours_live` all normalized to `H = 1.800 m`), and `snapSameScaleSide` camera captures at identical distance and FOV across `step3_512_shamble`, `step3_512`, `tripo`, and `ours`.
   - Fixed `measureSubjectHeadMetrics` (`openChinY` on named `jawObj` checks `v.z > 0.075` so the anterior neck cannot masquerade as the chin, while `!hasNamedParts` keeps `p[2] > 0.03` for `tripo` and `ours_live`).
4. **`qa/2026-11-18-AG-370/capture-pass6.mjs` & `build_pass6_sheets.py`:**
   - Captures Noon/Night/Same-Scale/White-Clay/Close-up views on `WebGPUBackend` and builds updated sheets `18-shambler-final-jerry.jpg` (with same-scale Shamble vs A-pose vs Tripo row, caliper markers, and comparison table), `14-shambler-step4b-head-closeups.jpg`, `13-shambler-step4b-noon-compare.jpg`, and `16-shambler-step4b-seam-closeups.jpg`.

## 2. Measured Head & Skull Comparison (`H = 1.800 m` normalized)

| Measure | Ours Pass 6 | Tripo Shambler | Ours Live GLB |
| --- | --- | --- | --- |
| Head H (closed mouth) | `28.4 cm` (`15.8%`) | `29.5 cm` (`16.4%`) | `26.0 cm` (`14.4%`) |
| Head H (open scream) | `33.4 cm` (`18.6%`) | `36.5 cm` (`20.3%`) | `31.0 cm` (`17.2%`) |
| Head Depth (brow to occiput) | `28.9 cm` (`16.1%`) | `29.2 cm` (`16.2%`) | `22.0 cm` (`12.2%`) |
| Head Depth (max) | `28.9 cm` (`16.1%`) | `29.9 cm` (`16.6%`) | `22.0 cm` (`12.2%`) |
| Cranium Width | `20.4 cm` (`11.4%`) | `21.2 cm` (`11.8%`) | `23.7 cm` (`13.2%`) |
| Jaw Width | `20.0 cm` | — | — |
| Neck Width (top) | `8.8 cm` (`2.33x` ratio) | `13.3 cm` (`1.60x`) | `22.8 cm` (`1.04x`) |
| Chin-to-Collar Neck Length | `9.1 cm` | `3.0 cm` (hunched) | `8.5 cm` |
| Occiput Overhang Behind Neck | `7.9 cm` | `4.5 cm` | `-6.3 cm` |
| Neck Center % From Back | `40.7%` | `38.7%` | `29.1%` |

## 3. Verification (slot-run WebGPUBackend + visual inspection)

- Syntax checks passed (`node --check` on `.mjs`, `python -m py_compile` on `build_pass6_sheets.py`).
- Capture command:
  `node crew/crew.mjs slot run antigravity AG-370 --checks "AG-357 Pass 6 final WebGPU capture" -- node qa/2026-11-18-AG-370/capture-pass6.mjs`
  (`WebGPUBackend`, `36,496` tris LOD0 / `7,820` tris LOD1, `2 draws`, `3 tex (3.0 MB @ 512)`, `0` page errors).
- Visual inspection completed after final rebuild across:
  - [`review/AG-357/18-shambler-final-jerry.jpg`](../review/AG-357/18-shambler-final-jerry.jpg)
  - [`review/AG-357/14-shambler-step4b-head-closeups.jpg`](../review/AG-357/14-shambler-step4b-head-closeups.jpg)
  - [`review/AG-357/13-shambler-step4b-noon-compare.jpg`](../review/AG-357/13-shambler-step4b-noon-compare.jpg)
  - [`review/AG-357/16-shambler-step4b-seam-closeups.jpg`](../review/AG-357/16-shambler-step4b-seam-closeups.jpg)
  - [`qa/2026-11-18-AG-370/frames-pass6/samescale-step3_512-head.png`](../qa/2026-11-18-AG-370/frames-pass6/samescale-step3_512-head.png)
- Observed minor seam transition: a crisp anatomical suboccipital crease remains where the upper neck meets the cranial base (`y = 0.140`), with zero floating/clipping gaps.
- Next queued task: `AG-371` night row at real `index.html` night/flashlight settings (`review/AG-357/19-shambler-final-night.jpg`).
