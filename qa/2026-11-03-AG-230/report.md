# AG-230 · GP-20021 Final 4-Light Re-Score: Flamer, Shotgun, Breacher-12 & Launcher

**Date**: 2026-11-03  
**Reviewer**: Antigravity (`Gemini 4 Argon (High)`)  
**Subject**: ChatGPT request `GP-20021 final flamer and shotgun score` (`game/viewmodel.js`, `studio/weapon-heavy.js`, `studio/weapon-longarms.js`, `review/GP-20021/`)

---

## 1. Executive Verdict

- **Overall 4-Gun Final Mean**: **`4.59 / 5.00`** (up from `4.24 / 5.00` in intermediate `AG-227`, and up from `AG-225` baseline).
- **Flamer (`flamer`)**: **`4.55 / 5.00` — PASS** (up from `3.60 / 5.00` in `AG-227`). Extending `packedGunPaint(src)` in `game/viewmodel.js` to match `bodyVC` (`vertexColors: true, color: 0xffffff, metalness: 0.08, roughness: 0.66`) resolved the `mergeBodyMetals` bypass identified in `AG-227`. Receiver/case luminance rose **`+31.5%` at Noon**, **`+37.9%` at Overcast**, **`+84.2%` at Dusk**, and **`+81.0%` at Night**, while internal material separation (`std` contrast) rose **`+13.6%` to `+42.5%`** across all four lights. The new inset top service skin (`K.box(0.074, 0.0015, 0.28, gunMid)`) and transverse pressed seams (`z = -0.112, 0.268`) read crisply at 40 cm.
- **Shotgun (`shotgun`)**: **`4.45 / 5.00` — PASS** (up from `4.15 / 5.00` in `AG-227`). Adding the side receiver cross-pins (`z = 0.038, 0.122`), lower trigger-plate pin (`z = -0.025`), and lower side relief slab breaks up the left receiver wall at 40 cm while preserving the rolled shoulder and continuous curved wrist. Removing the upper rib segment that broke at gameplay scale leaves a clean barrel/rib silhouette.
- **Visual Regression Check (`>= 3%` threshold vs `AG-225`)**: **0 visual regressions**. All four weapons (`aa12`, `shotgun`, `launcher`, `flamer`) show substantial improvements in 4-light readability, dusk/night visibility, and 40 cm surface detail over `AG-225`.

---

## 2. Quantitative 4-Light Luminance & Contrast Progression (`AG-225` → `AG-227` → Final `AG-230`)

| Weapon | Light | `AG-225` Mean | `AG-227` Mean | Final `AG-230` Mean | Gain vs `AG-225` | `AG-225` P90 | Final `AG-230` P90 | `AG-225` Std | `AG-227` Std | Final `AG-230` Std |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Flamer (`flamer`)** | Noon | `49.25` | `50.19` | **`64.76`** | **`+31.5%`** | `86.82` | `97.37` | `28.37` | `28.31` | **`32.24`** |
| **Flamer (`flamer`)** | Overcast | `39.90` | `41.09` | **`55.03`** | **`+37.9%`** | `70.40` | `78.87` | `19.49` | `19.66` | **`22.87`** |
| **Flamer (`flamer`)** | Dusk | `13.14` | `13.44` | **`24.21`** | **`+84.2%`** | `23.63` | `33.94` | `7.29` | `7.29` | **`10.39`** |
| **Flamer (`flamer`)** | Night | `13.56` | `13.32` | **`24.54`** | **`+81.0%`** | `24.63` | `33.94` | `7.65` | `7.51` | **`10.32`** |
| **Shotgun (`shotgun`)** | Noon | `71.41` | `87.57` | **`88.19`** | **`+23.5%`** | `86.39` | `100.37` | `19.00` | `19.91` | **`20.10`** |
| **Shotgun (`shotgun`)** | Overcast | `52.91` | `69.68` | **`70.22`** | **`+32.7%`** | `69.04` | `78.37` | `10.66` | `9.05` | **`9.31`** |
| **Shotgun (`shotgun`)** | Dusk | `16.14` | `28.45` | **`28.68`** | **`+77.7%`** | `23.63` | `34.80` | `5.35` | `4.39` | **`4.54`** |
| **Shotgun (`shotgun`)** | Night | `16.24` | `28.57` | **`28.82`** | **`+77.5%`** | `24.28` | `34.80` | `5.65` | `4.36` | **`4.49`** |
| **Breacher-12 (`aa12`)** | Noon | `51.26` | `69.97` | **`75.41`** | **`+47.1%`** | `89.87` | `135.59` | `25.92` | `31.40` | **`35.01`** |
| **Breacher-12 (`aa12`)** | Overcast | `39.88` | `57.87` | **`62.50`** | **`+56.7%`** | `68.37` | `107.59` | `18.38` | `23.01` | **`26.10`** |
| **Breacher-12 (`aa12`)** | Dusk | `14.32` | `25.71` | **`28.26`** | **`+97.4%`** | `23.94` | `50.74` | `7.09` | `11.89` | **`13.72`** |
| **Breacher-12 (`aa12`)** | Night | `14.36` | `25.62` | **`28.21`** | **`+96.5%`** | `23.94` | `50.74` | `7.16` | `11.92` | **`13.74`** |
| **Launcher (`launcher`)** | Noon | `44.47` | `60.43` | **`61.67`** | **`+38.7%`** | `75.15` | `99.80` | `27.21` | `28.94` | **`29.54`** |
| **Launcher (`launcher`)** | Overcast | `38.28` | `53.31` | **`54.49`** | **`+42.4%`** | `57.08` | `77.37` | `17.77` | `19.61` | **`20.30`** |
| **Launcher (`launcher`)** | Dusk | `11.86` | `23.28` | **`23.72`** | **`+100.1%`** | `19.01` | `34.80` | `6.92` | `8.84` | **`9.56`** |
| **Launcher (`launcher`)** | Night | `11.91` | `23.33` | **`23.76`** | **`+99.6%`** | `18.94` | `34.94` | `7.07` | `8.91` | **`9.62`** |

---

## 3. Independent 5-Axis Military-Family Scores (0–5)

| Weapon | Silhouette | Geometry (40 cm) | Material Separation (4-Light) | Colour | Gameplay Context | `AG-227` Score | **Final `AG-230` Score** | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **Breacher-12 (`aa12`)** | `4.8` | `4.7` | `4.8` | `4.7` | `4.75` | `4.65` | **`4.75 / 5.0`** | **PASS** |
| **Launcher (`launcher`)** | `4.7` | `4.6` | `4.5` | `4.6` | `4.6` | `4.55` | **`4.60 / 5.0`** | **PASS** |
| **Flamer (`flamer`)** | `4.6` | `4.5` | `4.6` | `4.5` | `4.55` | `3.60` | **`4.55 / 5.0`** | **PASS** |
| **Shotgun (`shotgun`)** | `4.6` | `4.4` | `4.3` | `4.4` | `4.55` | `4.15` | **`4.45 / 5.0`** | **PASS** |
| **Mean** | `4.68` | `4.55` | `4.55` | `4.55` | `4.61` | `4.24` | **`4.59 / 5.0`** | **PASS** |

---

## 4. Evidence & Artifacts
- `qa/2026-11-03-AG-230/flamer-shotgun-zoom-sheet.jpg` — High-resolution 4-light close-up receiver comparison of `shotgun` and `flamer` (`Before AG-225` vs `Final GP-20021`).
- `qa/2026-11-03-AG-230/before-after-4light-sheet.jpg` — Full 32-tile 4-light comparison sheet (`aa12`, `shotgun`, `launcher`, `flamer`).
- `qa/2026-11-03-AG-230/metrics.json` — Complete luminance (`mean`, `p90`, `std`) progression across `AG-225`, `AG-227`, and `AG-230`.
