# Antigravity — AG-133 The blades from his eyes on the GPU (CL-269) — 2026-10-26
Changed:          Verified CL-269 first-person and third-person blade swings (knife, machete, and katana) with both pistol and long gun (M4) drawn on Jerry's RTX 5080 WebGPU renderer (89–140 fps at 1280×720). From his eyes, the knife stab (0.22 s) and machete/katana chop (0.40 s / 0.30 s) cross the lower middle of the view cleanly toward the crosshair, the drawn gun dips out of the way (FP_BLADE_DIP: 13 cm down, 7 cm left), near-plane clearance holds (20.3–47.8 cm from eye), and the 3P swings remain identical to AG-128.
Files:            qa/2026-10-26-AG-133/cl269-fp-held-sheet.jpg, qa/2026-10-26-AG-133/cl269-fp-playspeed-sheet.jpg, qa/2026-10-26-AG-133/cl269-3p-verify-sheet.jpg, qa/2026-10-26-AG-133/report.json, qa/2026-10-26-AG-133/capture-ag133.mjs
Tests:            Single-session slot run on RTX 5080 WebGPU → t299: 13/0 PASS; t296: 9/0 PASS; t297: 4/0 PASS; t195: 19/1 (all 3 knife slash checks PASS; pre-existing Uzi reticle 6.94 deg fail).
Screenshots:      qa/2026-10-26-AG-133/cl269-fp-held-sheet.jpg (22 1P held poses across knife/machete/katana × pistol/m4), qa/2026-10-26-AG-133/cl269-fp-playspeed-sheet.jpg (24 1P play-speed frames), qa/2026-10-26-AG-133/cl269-3p-verify-sheet.jpg (16 3P Front & Right verification shots), plus 64 individual PNGs in qa/2026-10-26-AG-133/.
Not verified:     Nothing in scope (diving 1P melee was not changed by CL-269).
Requests:         None (CL-269 passes Rule 18 with 4–5/5 across all categories; minor optional observation on katana + pistol at u=0.58 noted below).
Contract changes: none

## 1. Rule 16 (Single Game-Test Slot) Compliance
- Queued and executed a single-browser batch via `node crew/crew.mjs slot run antigravity AG-133 --checks "AG-133 CL-269 FP/3P held & play-speed blade shots + t299, t195, t296, t297" -- node qa/2026-10-26-AG-133/capture-ag133.mjs` (request `20f2509c-8ff5-4fbb-9591-d69165a22ef4`).
- Renderer confirmed: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)` with WebGPU active at `89–140 fps` (`1280×720`).

## 2. Rule 18 Animation Score Table (`docs/animation-principles.md`, 0–5)

| Action / View | Intention | Timing | Balance | Contact | Continuity | Structure | Env. fit | Character | Gameplay | Style |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **1P Knife Stab (`0.22 s`, Pistol & M4, before `CL-269` / `AG-128`)** | 2 | 4 | 3 | 2 | 2 | 2 | 4 | 3 | 2 | 2 |
| **1P Knife Stab (`0.22 s`, Pistol & M4, after `CL-269`)** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** |
| **1P Machete Chop (`0.40 s`, Pistol & M4, before `CL-269` / `AG-128`)** | 2 | 4 | 3 | 2 | 2 | 2 | 4 | 3 | 2 | 2 |
| **1P Machete Chop (`0.40 s`, Pistol & M4, after `CL-269`)** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** |
| **1P Katana Cut (`0.30 s`, Pistol & M4, after `CL-269`)** | **5** | **5** | **4** | **5** | **4** | **4** | **5** | **5** | **5** | **5** |
| **3P Knife Thrust (`0.22 s`, `CL-261` part 2 verification)** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** |
| **3P Machete Chop (`0.40 s`, `CL-261` verification)** | **5** | **5** | **4** | **5** | **5** | **5** | **5** | **5** | **5** | **5** |

## 3. First-Person GPU Findings (`cl269-fp-held-sheet.jpg` & `report.json`)

### A. Knife Stab (`0.22 s`, `FP_BLADE_PATH.knife` & `FP_BLADE_AIM.knife`)
| Drawn Gun | Moment `u` | `fistScreen (x, y, dist)` | `tipScreen (x, y, dist)` | `armNearEyeM` | `gunBounds.topY` | `fpBladeDip` | Visual Read on RTX 5080 |
|---|---:|---|---|---|---|---:|---|
| **Pistol** | `rest` | `(-0.203, -1.166, 0.36m)` | — | `0.339 m` | `-0.124` | `0.00` | Pistol centered-left at hip/chest level (`topY = -0.124`). |
| **Pistol** | `0.14` (Cock) | `(0.452, -1.506, 0.62m)` | `(0.299, -0.409, 0.78m)` | `0.478 m` | `-0.607` | `1.00` | Blade chambered point-up in lower-right; arm `47.8 cm` from eye (was `13.7 cm` in `AG-128`); pistol dipped cleanly (`topY = -0.607`). |
| **Pistol** | `0.30` (Drive) | `(0.243, -0.903, 0.46m)` | `(0.136, -0.062, 0.71m)` | `0.431 m` | `-0.747` | `1.00` | Fist and blade drive up and inward toward the center reticle. |
| **Pistol** | `0.40` (Stab) | `(0.098, -0.583, 0.34m)` | `(-0.087, +0.187, 0.63m)` | `0.335 m` | `-0.754` | `1.00` | Articulated gloved fist in lower-middle (`y = -0.583`), full blade length (`63 cm` out) thrusting through the crosshair (`tip y = +0.187`). |
| **Pistol** | `0.58` (Cut) | `(-0.298, -0.890, 0.28m)` | `(-0.707, -0.317, 0.59m)` | `0.273 m` | `-0.638` | `1.00` | Clean slash across to lower-left (`tip x = -0.707, y = -0.317`); zero near-plane clipping (`27.3 cm` clearance). |
| **M4** | `rest` | `(-0.589, -0.495, 0.53m)` | — | `0.400 m` | `+0.018` | `0.00` | M4 receiver and optic sit up to `topY = +0.018` on the left. |
| **M4** | `0.14` (Cock) | `(0.451, -1.503, 0.89m)` | `(0.330, -0.635, 1.03m)` | `0.413 m` | `-0.312` | `1.00` | M4 optic drops below bottom edge (`topY = -0.312`); knife chambered cleanly in lower-right. |
| **M4** | `0.30` (Drive) | `(0.222, -0.865, 0.79m)` | `(0.154, -0.286, 1.03m)` | `0.414 m` | `-0.424` | `1.00` | Smooth forward drive; M4 barrel tucked low-left (`topY = -0.424`). |
| **M4** | `0.40` (Stab) | `(0.137, -0.335, 0.65m)` | `(0.001, +0.100, 0.93m)` | `0.412 m` | `-0.430` | `1.00` | Dead-center stab (`tip x = 0.001, y = +0.100`), full sleeve, glove, and gleaming blade visible in the middle of the screen. |
| **M4** | `0.58` (Cut) | `(-0.338, -0.825, 0.68m)` | `(-0.561, -0.515, 0.97m)` | `0.406 m` | `-0.320` | `1.00` | Clean cross-cut to the lower-left above the dipped M4 handguard. |

### B. Machete Chop (`0.40 s`, `FP_BLADE_PATH.chop` & `FP_BLADE_AIM.chop`)
| Drawn Gun | Moment `u` | `fistScreen (x, y, dist)` | `tipScreen (x, y, dist)` | `armNearEyeM` | `gunBounds.topY` | `fpBladeDip` | Visual Read on RTX 5080 |
|---|---:|---|---|---|---|---:|---|
| **Pistol** | `0.16` (Wind-up) | `(0.677, -0.479, 0.49m)` | `(0.906, +1.740, 0.81m)` | `0.425 m` | `-0.705` | `1.00` | Machete rises up the right third (`x = 0.677`), edge forward and teeth visible. |
| **Pistol** | `0.36` (Raised) | `(0.626, +0.093, 0.31m)` | `(-1.357, -12.78, 0.55m)` | `0.265 m` | `-0.828` | `1.00` | Fist and guard cocked high on the right (`y = +0.093`), blade tipped up and back ready to strike; `26.5 cm` from eye (no clipping). |
| **Pistol** | `0.47` (Mid-chop) | `(0.409, -0.141, 0.27m)` | `(-0.501, +0.837, 0.73m)` | `0.231 m` | `-0.822` | `1.00` | Diagonal power chop right across the center of the viewport (`fist (0.41, -0.14)` to `tip (-0.50, +0.84)`), showing full blade fuller and edge teeth (`D-91`). |
| **Pistol** | `0.58` (Cut end) | `(-0.446, -0.839, 0.22m)` | `(-0.592, -0.919, 0.84m)` | `0.203 m` | `-0.807` | `1.00` | Follow-through carries fist and blade to bottom-left (`y = -0.84 to -0.92`). |
| **M4** | `0.16` (Wind-up) | `(0.681, -0.480, 0.70m)` | `(0.849, +1.155, 0.96m)` | `0.410 m` | `-0.426` | `1.00` | Clean right-side lift; M4 dipped to bottom-left (`topY = -0.426`). |
| **M4** | `0.36` (Raised) | `(0.623, +0.105, 0.52m)` | `(1.987, +9.074, 0.59m)` | `0.359 m` | `-0.609` | `1.00` | High right chamber (`fist (0.62, +0.11)`), `35.9 cm` eye clearance. |
| **M4** | `0.47` (Mid-chop) | `(0.108, -0.333, 0.57m)` | `(-0.374, +0.382, 0.99m)` | `0.386 m` | `-0.581` | `1.00` | Diagonal slash directly through the center crosshair (`fist (0.11, -0.33)` to `tip (-0.37, +0.38)`). |
| **M4** | `0.58` (Cut end) | `(-0.449, -0.850, 0.57m)` | `(-0.549, -0.900, 1.19m)` | `0.410 m` | `-0.444` | `1.00` | Exits cleanly at bottom-left. |

### C. Katana Cut (`0.30 s`, verified from `CL-269`'s `Not verified` list)
- **Raised (`u=0.36`, `fp-held-katana-pistol-1-cock.png` & `fp-held-katana-m4-1-cock.png`):** Red-wrapped tsuka and brass tsuba cocked at `(0.628, +0.091)` (pistol) and `(0.622, +0.104)` (M4), `26.7–36.0 cm` from the eye, with crisp sun specular on the brass guard.
- **Mid-cut (`u=0.47`, `fp-held-katana-pistol-2-chop.png` & `fp-held-katana-m4-2-chop.png`):** Sweeps the crimson blade diagonally across the center of the view (`tipScreen = (-0.630, +1.088)` with pistol, `(-0.489, +0.626)` with M4).
- **Cut end (`u=0.58`, `fp-held-katana-pistol-3-cut.png` & `fp-held-katana-m4-3-cut.png`):**
  - *Minor observation (non-blocking):* With the **pistol** drawn (`torsoYawDeg = 13.3°`, shoulder closer to the eye than in the 45°-turned M4 stance), at `u=0.58` (`fistScreen = (-0.445, -0.839)`, `dist = 0.219 m`), the katana's longer rear tsuka/pommel extends behind the fist toward the lower-left camera (`~18 cm` from the eye), making the red pommel facets look slightly large in the bottom-left corner for 1–2 frames (`fp-held-katana-pistol-3-cut.png`). It does not clip the 10 cm near plane (`armNearEyeM = 0.204 m`), and with the M4 drawn (`dist = 0.563 m`, `fp-held-katana-m4-3-cut.png`) it stays small and tidy.

## 4. Third-Person Verification (`cl269-3p-verify-sheet.jpg`)
- Confirmed `fpW = 0` in third person (`u >= 0.16`) and all 3P poses match `AG-128` (`CL-261` part 2):
  - **Knife (`tp-knife-*`):** Cock (`u=0.14`) chest turn `-11.9°`, lean `+1.8°`; Drive (`u=0.30`) chest turn `+13.5°`, lean `+11.9°`, fist `0.442 m` ahead; Stab (`u=0.40`) chest turn `+26.0°`, lean `+11.8°`, fist `0.711 m` ahead, arm `90.9%` straight; Cut (`u=0.58`) chest turn `+29.8°`, fist `0.404 m` ahead.
  - **Machete (`tp-machete-*`):** Wind-up (`u=0.16`) chest turn `-10.7°`; Raised (`u=0.36`) chest turn `-25.8°`, lean `+8.0°`, fist `1.545 m` high, arm `96.1%` straight; Mid-chop (`u=0.48`) chest turn `+3.5°`, lean `+6.9°`, fist `0.558 m` ahead, arm `99.1%` straight; Cut end (`u=0.58`) chest turn `+25.7°`, lean `+4.7°`.
