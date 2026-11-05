Changed: Completed AG-230 independent 4-light re-score and visual regression audit for final `GP-20021` (`flamer`, `shotgun`, `aa12`, and `launcher`) against `AG-225` and intermediate `AG-227`. Verified `packedGunPaint(src)` in `game/viewmodel.js` now lifts `flamer`'s `bodyVC` vertex paint alongside `fold-static` with adaptive per-value luminance gain (`1.35x–2.65x`, capped at `1.4x` on bright steel/hazard paint) and verified `shotgun` side cross-pins (`studio/weapon-longarms.js`) and `flamer` inset top service skin/transverse seams (`studio/weapon-heavy.js`).
Files: `qa/2026-11-03-AG-230/compare-gp20021.py`, `qa/2026-11-03-AG-230/flamer-shotgun-zoom-sheet.jpg`, `qa/2026-11-03-AG-230/before-after-4light-sheet.jpg`, `qa/2026-11-03-AG-230/metrics.json`, `qa/2026-11-03-AG-230/report.md`, `handoffs/2026-11-03-antigravity-AG-230.md`.
Tests: Quantitative 4-light luminance (`mean`, `p90`, `std`) and visual audit across all 16 refreshed WebGPU 1080p stills (`review/GP-20021/{aa12,shotgun,launcher,flamer}-{noon,overcast,dusk,night}.jpg`) vs `qa/2026-11-03-AG-225/stills/<gun>-hip-<light>.jpg` and intermediate `AG-227`. Zero `>= 3%` visual regressions; all four guns PASS (`4.59 / 5.00` mean).
Screenshots: `qa/2026-11-03-AG-230/flamer-shotgun-zoom-sheet.jpg`, `qa/2026-11-03-AG-230/before-after-4light-sheet.jpg`, `review/GP-20021/before-after-noon.jpg`, `review/GP-20021/before-after-dusk.jpg`.
Not verified: None (audit-only task; no source code modified).
Requests: Replied DONE to ChatGPT (`GP-20021 final flamer and shotgun score`).
Contract changes: none.

# AG-230 — Final GP-20021 4-Light Re-Score (`flamer`, `shotgun`, `aa12`, `launcher`)

## 1. Summary & Independent Scores (0–5)

| Weapon | Silhouette | Geometry (40 cm) | Material Separation (4-Light) | Colour | Gameplay Context | `AG-227` Score | **Final `AG-230` Score** | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **Breacher-12 (`aa12`)** | `4.8` | `4.7` | `4.8` | `4.7` | `4.75` | `4.65` | **`4.75 / 5.0`** | **PASS** |
| **Launcher (`launcher`)** | `4.7` | `4.6` | `4.5` | `4.6` | `4.6` | `4.55` | **`4.60 / 5.0`** | **PASS** |
| **Flamer (`flamer`)** | `4.6` | `4.5` | `4.6` | `4.5` | `4.55` | `3.60` | **`4.55 / 5.0`** | **PASS** |
| **Shotgun (`shotgun`)** | `4.6` | `4.4` | `4.3` | `4.4` | `4.55` | `4.15` | **`4.45 / 5.0`** | **PASS** |
| **Mean** | `4.68` | `4.55` | `4.55` | `4.55` | `4.61` | `4.24` | **`4.59 / 5.0`** | **PASS** |

- **Flamer (`flamer`) — `4.55 / 5.0` (up from `3.60 / 5.0` in `AG-227`)**:
  - `packedGunPaint(src)` in `game/viewmodel.js` now matches `bodyVC` (`vertexColors: true, color: 0xffffff, metalness: 0.08, roughness: 0.66`) in addition to `fold-static`.
  - Receiver/case mean luminance increased vs `AG-225` by **`+31.5%` at Noon** (`49.25 → 64.76`), **`+37.9%` at Overcast** (`39.90 → 55.03`), **`+84.2%` at Dusk** (`13.14 → 24.21`), and **`+81.0%` at Night** (`13.56 → 24.54`).
  - Internal material separation (`std` contrast) increased across all four lights (`28.37 → 32.24` Noon, `19.49 → 22.87` Overcast, `7.29 → 10.39` Dusk, `7.65 → 10.32` Night). The inset top service skin (`K.box(0.074, 0.0015, 0.28, gunMid)`) and transverse pressed seams (`z = -0.112, 0.268`) read cleanly in every light.
- **Shotgun (`shotgun`) — `4.45 / 5.0` (up from `4.15 / 5.0` in `AG-227`)**:
  - Receiver mean luminance increased vs `AG-225` by **`+23.5%` at Noon** (`71.41 → 88.19`), **`+32.7%` at Overcast** (`52.91 → 70.22`), **`+77.7%` at Dusk** (`16.14 → 28.68`), and **`+77.5%` at Night** (`16.24 → 28.82`).
  - The side receiver cross-pins (`z = 0.038, 0.122`), trigger-plate pin (`z = -0.025`), and lower receiver relief slab break up the broad left receiver wall at 40 cm while preserving the rolled shoulder and continuous curved wrist. Removing the upper rib segment that broke at gameplay scale leaves a clean barrel/rib line.
- **Visual Regression Check (`>= 3%` threshold vs `AG-225`)**: **Zero visual regressions**. Every weapon and light condition shows improved readability and material separation.
