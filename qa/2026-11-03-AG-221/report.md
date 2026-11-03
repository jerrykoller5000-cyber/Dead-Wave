# AG-221 — GP-20017 J18 Minigun Reflex Sight Four-Light Hip & ADS Audit (`rear = 0.76`)

## 1. Executive Summary & Four-Light Gate Verdict
- **Verdict**: **PASS (`4.67 / 5.0` overall; all categories & lighting conditions `>= 4.6 / 5.0`, zero sub-4 defects)**.
- **Hardware & Environment**: Real WebGPU (`NVIDIA GeForce RTX 5080`, `1920×1080 @ 1.00x`) on the woods-trail seat (`[42.0, -7.5468, -20.0]`) across **Noon** (`t = 0.50`), **Overcast** (`t = 0.42`, rain `0.85`), **Dusk** (`t = 0.77`), and **Night** (`t = 0.02`), plus close-up **Left Side**, **Front Oblique**, **Rear-Left 3/4**, and **Sight-Axis (`y = 0.330`)** inspection shots.

## 2. Geometry & Housing Clearance Audit (`studio/weapon-heavy.js` & `game/sight-points.js`)
- **J18 Reflex Sight Construction (`makeMinigunModel`, lines 138–144)**:
  - **Base**: `40 × 12 × 70 mm` (`gunDark`) centered at `[0, 0.2835, 0.01]` (`y = 0.2775 .. 0.2895`), seated flush on the rubber carry-handle top (`y = 0.2775`).
  - **Hood**: `5 mm` side walls at `x = ±0.024` (`y = 0.289 .. 0.361`) + `8 mm` top bar at `y = 0.365` (outer top `y = 0.369`), inner aperture `43 mm × 71.5 mm`.
  - **Lens Glass**: `43 × 64 × 3 mm` (`reflexGlass`, `transparent: true, opacity: 0.18, depthWrite: false`) at `[0, 0.325, 0.035]`.
  - **Reticle (`sightDotMat`)**: `3.5 mm` center square + `7.5 mm` radius (`0.6 mm` tube) torus ring at `[0, 0.330, 0.0355]`.
- **Housing & Rear-Grip Clearance**:
  - **Sight Datum (`SIGHT.minigun`)**: `{ kind: 'iron', pos: [0, 0.330, -0.30], fwd: [0, 0, 1] }`.
  - **Rear Top Grip Crown**: Tops out at `y = 0.3200` near `z = -0.30`.
  - **Measured Vertical Clearances**:
    - Sight line (`y = 0.330`) above rear top grip apex (`y = 0.320`): **`+10.00 mm` (`+1.0 cm`)** — completely clears the rear top grip and trigger guard.
    - Sight line (`y = 0.330`) below hood top bar inner face (`y = 0.361`): **`+31.00 mm` (`+3.1 cm`)**.

## 3. Four-Light Telemetry & Pixel Table (`1920×1080`)

| Light | Mode | `vmAds` | `dotPx [x, y]` | `dotNdc [x, y]` | Hood Window (`W × H` px) | Red Reticle Pixels (`dotRedPx`) | Gun Pixels (`gunPx`) | Gun + Hands (`totalPx`) |
|---|---|---:|---|---|---|---:|---:|---:|
| **Noon (`0.50`)** | Hip | `0.00` | `[1205.8, 643.5]` | `[+0.2560, -0.1917]` | `35.3 × 72.6` | — | `173,044` (`8.35%`) | `214,732` (`10.36%`) |
| **Noon (`0.50`)** | **ADS (`0.76`)** | `1.00` | **`[960.0, 540.0]`** | **`[0.0000, 0.0000]`** | **`38.8 × 71.8`** | **`42`** | `143,680` (`6.93%`) | `204,850` (`9.88%`) |
| **Overcast (`0.42`)** | Hip | `0.00` | `[1205.8, 643.0]` | `[+0.2560, -0.1908]` | `35.3 × 72.6` | — | `170,878` (`8.24%`) | `211,220` (`10.19%`) |
| **Overcast (`0.42`)** | **ADS (`0.76`)** | `1.00` | **`[960.0, 540.0]`** | **`[0.0000, 0.0000]`** | **`38.8 × 71.8`** | **`45`** | `142,831` (`6.89%`) | `204,697` (`9.87%`) |
| **Dusk (`0.77`)** | Hip | `0.00` | `[1205.8, 642.6]` | `[+0.2561, -0.1900]` | `35.3 × 72.6` | — | `121,464` (`5.86%`) | `154,891` (`7.47%`) |
| **Dusk (`0.77`)** | **ADS (`0.76`)** | `1.00` | **`[960.0, 540.0]`** | **`[0.0000, 0.0000]`** | **`38.8 × 71.8`** | **`35`** | `114,992` (`5.55%`) | `197,298` (`9.51%`) |
| **Night (`0.02`)** | Hip | `0.00` | `[1205.8, 642.2]` | `[+0.2561, -0.1892]` | `35.3 × 72.6` | — | `126,249` (`6.09%`) | `161,944` (`7.81%`) |
| **Night (`0.02`)** | **ADS (`0.76`)** | `1.00` | **`[960.0, 540.0]`** | **`[0.0000, 0.0000]`** | **`38.8 × 71.8`** | **`32`** | `114,861` (`5.54%`) | `198,191` (`9.56%`) |

## 4. Comparison: `rear = 0.64` vs `rear = 0.76` (`review/GP-20017/minigun-ads-sweep/`)
- **`rear = 0.64` (`rear-64.png`)**: Places the camera `12 cm` closer to the rear top grip; while the reflex window is slightly wider (`~45 px`), the black rear grip column and wide drive housing dominate the lower-center screen and crowd the lower edge of the `7.5 mm` red ring.
- **`rear = 0.76` (`rear-76.png`, selected)**: Gives a clean `38.8 × 71.8 px` sight window with the `3.5 mm` dot and `7.5 mm` ring centered at `(960.0, 540.0)` well clear of the rear grip (`+10 mm` physical clearance), while keeping a substantial rotary-gun housing + olive drum silhouette (`6.93%` gun / `9.88%` total screen area) and showing both the strong hand on the top grip and the J61 support hand/sleeve under the left housing edge.

## 5. Four-Light 0–5 Asset/Art Scores

| Category | Noon | Overcast | Dusk | Night | Mean | Notes |
|---|---:|---:|---:|---:|---:|---|
| **Geometry & Joinery** | `4.6` | `4.6` | `4.6` | `4.6` | **`4.60`** | Reflex base flush on rubber handle (`y=0.2775`); `+10.0 mm` clearance over rear grip (`y=0.320`). |
| **Material & Reticle Readability** | `4.7` | `4.7` | `4.6` | `4.7` | **`4.68`** | Emissive `sightDotMat` (`32–45` red px) crisp across bright daylight and dark night; glass (`depthWrite: false`) clean. |
| **Gameplay Context & ADS Framing (`0.76`)** | `4.7` | `4.7` | `4.7` | `4.7` | **`4.70`** | Exact `(960.0, 540.0)` center aim, balanced `9.88%` total silhouette, J61 support palm/sleeve visible in both hip & ADS. |
| **Overall** | **`4.67`** | **`4.67`** | **`4.63`** | **`4.67`** | **`4.67 / 5.0`** | **PASS** — zero defects, zero sub-4 categories. |
