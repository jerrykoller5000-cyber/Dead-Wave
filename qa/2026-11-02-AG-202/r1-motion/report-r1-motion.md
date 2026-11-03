# AG-202 Short Re-Shoot — Motion After `CL-293 part 1` (`J55`)

- **Date**: `2026-11-02`
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Hardware**: NVIDIA GeForce RTX 5080, WebGPU (`1920×1080 @1.00x`, deterministic `stepFrame(60, 1/60)` + `renderFrame()`)
- **Contact Sheet**: `qa/2026-11-02-AG-202/r1-motion/sheet-r1-motion.jpg`
- **Metrics JSON**: `qa/2026-11-02-AG-202/r1-motion/metrics-r1-vs-r0.json`
- **Raw Traces JSON**: `qa/2026-11-02-AG-202/r1-motion/traces-r1.json`
- **12 Animated GIFs (`pistol`, `revolver`, `m4` × `walk`, `run`, `strafe`, `flick90`)**:
  - `qa/2026-11-02-AG-202/r1-motion/pistol-walk-r1.gif`, `pistol-run-r1.gif`, `pistol-strafe-r1.gif`, `pistol-flick90-r1.gif`
  - `qa/2026-11-02-AG-202/r1-motion/revolver-walk-r1.gif`, `revolver-run-r1.gif`, `revolver-strafe-r1.gif`, `revolver-flick90-r1.gif`
  - `qa/2026-11-02-AG-202/r1-motion/m4-walk-r1.gif`, `m4-run-r1.gif`, `m4-strafe-r1.gif`, `m4-flick90-r1.gif`
- **Stills (`hip`, `sprint`, `ads`, `reload_mid`)**: `qa/2026-11-02-AG-202/r1-motion/stills/*.jpg`

---

## 1. Round 0 vs Round 1 (`CL-293 part 1`) Motion Comparison (`J55`)

### 1.1 `walk` (90 frames @ 60 Hz, steady window `f20..f89`)

| Weapon | Metric | Round 0 (Before) | Round 1 (`CL-293 part 1`) | Delta / Verdict |
|---|---|---:|---:|---|
| **Pistol** | `bobHzX / bobHzY` | `6.84 Hz / 13.70 Hz` | **`1.52 Hz / 3.02 Hz`** | **PASS** — 7–14 Hz buzz replaced by real 1.52 / 3.02 Hz stride cadence |
| **Pistol** | `hpRmsPx` (`> 4 Hz`) | `8.26 px` | **`3.47 px`** | **`-58.0%`** high-pass jitter reduction |
| **Pistol** | `stepDeltaRmsPx` | `11.28 px` | **`4.95 px`** | **`-56.1%`** frame-to-frame step delta |
| **Pistol** | `ampX% / ampY%` | `0.84% / 1.61%` | **`2.06% / 1.38%`** | Clear figure-8 horizontal sweep (`39.6 px × 14.9 px`) |
| **Revolver** | `bobHzX / bobHzY` | `6.84 Hz / 13.70 Hz` | **`1.52 Hz / 3.02 Hz`** | **PASS** — locked to 1.52 / 3.02 Hz stride cadence |
| **Revolver** | `hpRmsPx` (`> 4 Hz`) | `6.50 px` | **`3.10 px`** | **`-52.3%`** high-pass jitter reduction |
| **Revolver** | `stepDeltaRmsPx` | `9.22 px` | **`4.52 px`** | **`-51.0%`** frame-to-frame step delta |
| **Revolver** | `ampX% / ampY%` | `0.64% / 1.39%` | **`1.88% / 1.26%`** | Smooth figure-8 (`36.0 px × 13.7 px`) |
| **GW-4 (`m4`)** | `bobHzX / bobHzY` | `6.84 Hz / 13.70 Hz` | **`1.52 Hz / 3.02 Hz`** | **PASS** — locked to 1.52 / 3.02 Hz stride cadence |
| **GW-4 (`m4`)** | `hpRmsPx` (`> 4 Hz`) | `3.74 px` | **`1.89 px`** | **`-49.5%`** high-pass jitter reduction |
| **GW-4 (`m4`)** | `stepDeltaRmsPx` | `5.16 px` | **`2.84 px`** | **`-45.0%`** frame-to-frame step delta |
| **GW-4 (`m4`)** | `ampX% / ampY%` | `0.37% / 0.95%` | **`1.20% / 0.85%`** | Smooth rifle figure-8 (`23.0 px × 9.2 px`) |

---

### 1.2 `run` (90 frames @ 60 Hz, steady window `f20..f89`)

| Weapon | Metric | Round 0 (Before) | Round 1 (`CL-293 part 1`) | Delta / Verdict |
|---|---|---:|---:|---|
| **Pistol** | `bobHzX / bobHzY` | `10.92 Hz / 8.16 Hz` | **`2.22 Hz / 4.46 Hz`** | **PASS** — 8–11 Hz buzz replaced by 2.22 / 4.46 Hz run cadence |
| **Pistol** | `ampX% / ampY%` | `0.83% / 1.54%` | **`3.51% / 2.28%`** | Run amplitude (`67.3 px × 24.6 px`) now clearly distinct from walk |
| **Pistol** | `hpRmsPx` / `stepDeltaRmsPx` | `8.59 px / 11.49 px` | `11.27 px / 12.16 px` | *(Note: `bobHzY = 4.46 Hz` sits just above the 4 Hz 7-frame moving-average cutoff, so `hpRmsPx` captures the `24.6 px` 4.46 Hz vertical step bounce; zero >6 Hz buzz remains)* |
| **Revolver** | `bobHzX / bobHzY` | `10.92 Hz / 8.16 Hz` | **`2.22 Hz / 4.46 Hz`** | **PASS** — 2.22 / 4.46 Hz run cadence |
| **Revolver** | `ampX% / ampY%` | `0.63% / 1.44%` | **`3.27% / 2.10%`** | Run amplitude (`62.8 px × 22.6 px`) |
| **Revolver** | `hpRmsPx` / `stepDeltaRmsPx` | `6.82 px / 9.22 px` | `10.17 px / 11.06 px` | 4.46 Hz vertical step component (`zero >6 Hz buzz`) |
| **GW-4 (`m4`)** | `bobHzX / bobHzY` | `10.92 Hz / 8.16 Hz` | **`2.22 Hz / 4.46 Hz`** | **PASS** — 2.22 / 4.46 Hz run cadence |
| **GW-4 (`m4`)** | `ampX% / ampY%` | `0.36% / 0.93%` | **`2.16% / 1.13%`** | Run amplitude (`41.4 px × 12.2 px`) |
| **GW-4 (`m4`)** | `hpRmsPx` / `stepDeltaRmsPx` | `3.92 px / 5.27 px` | `6.37 px / 6.91 px` | 4.46 Hz vertical step component (`zero >6 Hz buzz`) |

---

### 1.3 `strafe` & `flick90` (Round 0 vs Round 1)

| Weapon | Clip | Round 0 (Before) | Round 1 (`CL-293 part 1`) | Delta / Verdict |
|---|---|---|---|---|
| **Pistol** | `strafe` | `tilt: 4.00°`, `shiftX: -68.0 px`, `bobHzY: 13.98 Hz`, `hpRmsPx: 7.73 px` | **`tilt: 5.10°`, `shiftX: -93.3 px`, `bobHzY: 3.00 Hz`, `hpRmsPx: 5.54 px`** | **`-28.3%` `hpRmsPx`**, 14 Hz buzz gone, stronger roll tilt |
| **Revolver** | `strafe` | `tilt: 4.00°`, `shiftX: -50.5 px`, `bobHzY: 13.98 Hz`, `hpRmsPx: 6.34 px` | **`tilt: 5.10°`, `shiftX: -69.6 px`, `bobHzY: 3.00 Hz`, `hpRmsPx: 5.08 px`** | **`-19.9%` `hpRmsPx`**, 14 Hz buzz gone |
| **GW-4 (`m4`)** | `strafe` | `tilt: 4.00°`, `shiftX: -29.5 px`, `bobHzY: 13.98 Hz`, `hpRmsPx: 3.52 px` | **`tilt: 5.10°`, `shiftX: -41.6 px`, `bobHzY: 3.00 Hz`, `hpRmsPx: 3.91 px`** | 14 Hz buzz gone (`bobHzY = 3.00 Hz`) |
| **Pistol** | `flick90` | `peak: 5.3 px`, `lag: 50 ms`, `settle: 0.25 s`, `overshoot: 2.09%`, `hpRmsPx: 0.72 px` | **`peak: 62.6 px`, `lag: 50 ms`, `settle: 0.27 s`, `overshoot: 0.53%`, `hpRmsPx: 1.35 px`** | **PASS** — smoothed sway input gives clear 63 px flick lag with `0.53%` overshoot (`≤ 15%`) |
| **Revolver** | `flick90` | `peak: 5.6 px`, `lag: 50 ms`, `settle: 0.25 s`, `overshoot: 2.40%`, `hpRmsPx: 0.67 px` | **`peak: 54.4 px`, `lag: 50 ms`, `settle: 0.27 s`, `overshoot: 0.50%`, `hpRmsPx: 1.15 px`** | **PASS** — clear 54 px flick lag with `0.50%` overshoot |
| **GW-4 (`m4`)** | `flick90` | `peak: 11.2 px`, `lag: 50 ms`, `settle: 0.25 s`, `overshoot: 4.21%`, `hpRmsPx: 0.52 px` | **`peak: 55.6 px`, `lag: 50 ms`, `settle: 0.27 s`, `overshoot: 0.26%`, `hpRmsPx: 0.76 px`** | **PASS** — clear 56 px flick lag with `0.26%` overshoot |

---

### 1.4 `sprint` Still Pose (`hip` vs `sprint`, Round 0 vs Round 1)

| Weapon | Round 0 `hip` Muzzle | Round 0 `sprint` Muzzle | Round 1 `hip` Muzzle | Round 1 `sprint` Muzzle (`CL-293 part 1`) | Sprint Displacement (`R1 sprint - R1 hip`) |
|---|---|---|---|---|---|
| **Pistol** | `[1181.4, 612.5]` | `[1181.4, 612.5]` *(no pose)* | `[1181.4, 612.5]` | **`[1016.8, 757.2]`** (`vmRot: [0.219, 2.805, 0.345]`) | **`[-164.6 px, +144.7 px]`** (tucked low & across chest) |
| **Revolver** | `[1164.2, 554.9]` | `[1164.2, 554.9]` *(no pose)* | `[1164.2, 554.9]` | **`[965.5, 705.5]`** (`vmRot: [0.216, 2.805, 0.332]`) | **`[-198.7 px, +150.6 px]`** (tucked low & across chest) |
| **GW-4 (`m4`)** | `[1115.5, 607.8]` | `[1115.5, 607.8]` *(no pose)* | `[1115.5, 607.8]` | **`[926.6, 751.7]`** (`vmRot: [0.192, 2.878, 0.126]`) | **`[-188.9 px, +143.9 px]`** (low-ready across chest) |
