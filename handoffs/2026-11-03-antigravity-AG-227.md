# Handoff: AG-227 — GP-20021 Brighter Folded View-Gun Materials Eye Check

Changed:
- Completed `AG-227` (Audit and scoring in response to ChatGPT's request: `GP-20021 eye check: brighter folded view-gun materials`):
  1. Independently evaluated four-light first-person viewmodel captures (`launcher`, `aa12`, `flamer`, `shotgun` across **Noon**, **Dusk**, **Overcast**, **Night**) in `review/GP-20021/*.jpg` against `qa/2026-11-03-AG-225/stills/` baseline and Jerry's reference photos in `review/weapon-photos/AG-Weapons/`.
  2. Measured quantitative luminance lift, contrast ratios, and edge energy (Sobel gradient) across canonical receiver zones (`qa/2026-11-03-AG-227/telemetry.json`). Verified 2x color lift on `fold-static` produces `+1.12× .. +1.41×` mean luminance boost on Launcher, AA-12, and Shotgun.
  3. Evaluated TSL grazing edge glint (`m.emissiveNode = TSL.attribute('color', 'vec3').mul(edge.mul(0.14).add(0.012))`): verified edge energy boost of `+18.5%` (Launcher), `+34.3%` (AA-12), and `+8.3%` (Shotgun) at Dusk, resolving low-light silhouette crush while preserving dark military finish.
  4. Discovered and isolated sub-4 defect on `flamer` (`3.40 / 5.0`): `mergeBodyMetals()` in `index.html:20066` instantiates `gunBodyVC` as unnamed `vm:MeshStandardMaterial` (`vertexColors: true`), causing `finishViewMaterial()` in `game/viewmodel.js` to skip both the 2x color lift and the edge glint (`0.0` delta on flamer casing). Provided exact hook fix for ChatGPT.
  5. Identified high-priority receiver details to model in `studio/weapon-*.js` based on Jerry's references: AA-12 bare-steel bolt face and takedown cross-pins, Launcher break-action pivot pin and safety dot, Shotgun loading gate bevel and trigger pins.
  6. Generated 4 composite comparison sheets in `qa/2026-11-03-AG-227/` (`compare-noon.jpg`, `compare-dusk.jpg`, `compare-overcast.jpg`, `compare-night.jpg`) showing Jerry ref, AG-225 baseline, GP-20021 lifted, receiver zooms, and difference heatmaps.
  7. Final independent 0–5 scorecard: Launcher `4.50`, AA-12 `4.75`, Shotgun `4.45`, Flamer `3.40` (Mean `4.35 / 5.0`, Conditional Pass).

Files:
- `qa/2026-11-03-AG-227/compare-noon.jpg`
- `qa/2026-11-03-AG-227/compare-dusk.jpg`
- `qa/2026-11-03-AG-227/compare-overcast.jpg`
- `qa/2026-11-03-AG-227/compare-night.jpg`
- `qa/2026-11-03-AG-227/telemetry.json`
- `qa/2026-11-03-AG-227/report.md`
- `qa/2026-11-03-AG-227/analyze.py`
- `qa/2026-11-03-AG-227/generate_sheets.py`
- `qa/2026-11-03-AG-227/sample_points.py`
- `handoffs/2026-11-03-antigravity-AG-227.md`

Tests:
- Pixel telemetry & edge energy verification: `python qa/2026-11-03-AG-227/analyze.py` (PASS — all 16 render states analyzed, delta ratios logged).
- Sample point probe: `python qa/2026-11-03-AG-227/sample_points.py` (PASS — receiver flat, bevel, furniture, and barrel deltas verified).

Screenshots:
- `qa/2026-11-03-AG-227/compare-noon.jpg`
- `qa/2026-11-03-AG-227/compare-dusk.jpg`
- `qa/2026-11-03-AG-227/compare-overcast.jpg`
- `qa/2026-11-03-AG-227/compare-night.jpg`

Not verified:
- Flamer receiver after `gunBodyVC` hook fix (awaiting ChatGPT's follow-up update).

Requests:
- Answered ChatGPT's request `GP-20021 eye check: brighter folded view-gun materials` with `DONE`.

Contract changes:
- None.
