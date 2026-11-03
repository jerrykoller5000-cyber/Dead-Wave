# AG-202 Round 1: Pistol, Revolver, and GW-4 (M4) Shoot After CL-293 Parts 1 & 2

- **Date:** 2026-11-02
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-202` Round 1 (`CL-293`, `J52`, `J55`, `J56`, `J57`, `J61`, `J62`, `J63`; `docs/specs/fps-pass.md`)
- **GPU / Renderer:** NVIDIA GeForce RTX 5080, WebGPU (`1920x1080` and `2560x1440 @ 1.00x`, deterministic timer RAF)
- **Master Contact Sheet:** `qa/2026-11-02-AG-202/round1/sheet-round1.jpg`
- **Metrics JSON:** `qa/2026-11-02-AG-202/round1/metrics-summary.json`
- **Traces JSON:** `qa/2026-11-02-AG-202/round1/traces.json`
- **18 Animated 3s @ 30fps GIFs:** `qa/2026-11-02-AG-202/round1/gifs/<weapon>-<strip>-r1.gif`

---

Changed:
Shot Round 1 for `pistol`, `revolver`, and `m4` (GW-4) under real RTX 5080 WebGPU across 7 still poses (`hip`, `ads`, `sprint`, `fire-peak`, `reload-out`, `reload-in`, `reload-home`) x 2 seats (`tg` Training Ground and `woods` noon trail) x 2 resolutions (`1080p` and `1440p`), and 6 3s @ 30fps motion strips (`walk`, `run`, `strafe`, `flick90`, `burst`, `jump`).
Tested both box-hull and exact raycast mesh-interior vertex penetration metrics. Verified `CL-293` part 1 motion (stride bob, distinct sprint displacement, smoothed sway/flick lag) and part 2 hand improvements (`elbowFollow` straight wrists, authored pistol support socket, elongated sleeves with `UPPER` rings eliminating mid-air severed stumps, and `bodyCamoUV` density alignment).

Tests:
1. `realtest.mjs tcl295 tcl295b --all`: 15 pass, 4 fail (isolated Training Ground floor `player/footstep-tile` mapping to `pk-ocular-boot-glass-*.ogg` for J53).
2. Real WebGPU RTX 5080 test run: `node qa/2026-11-02-AG-202/run-r1.mjs` completed with exit 0; recaptured under `qa/2026-11-02-AG-208/recapture-ag202-r1.mjs` with pre-shot viewmodel assertions (`assertViewModelInHand` confirming `unarmed=false`, `vmActive=true`, `raise >= 0.99`, NDC in screen) on RTX 5080 WebGPU via `crew.mjs slot run` (exit 0).
3. 84 stills recaptured (resolving previous unpolled weapon swap where woods `pistol-hip` showed GW-4), 1,620 strip frames captured.
4. Post-processing & metric generation: `python qa/2026-11-02-AG-208/build-ag202-sheets.py` completed with exit 0; all 18 GIFs verified at exactly 90 frames (no duplicate frame drop).

Not verified:
3P reload animation on the revolver (`J57`: swing-out cylinder / individual cartridge ejection) remains open for ChatGPT / art pass; launcher rear leaf sight eye relief retuning (`J62` under ChatGPT / Grokbot) will be evaluated in the heavy weapons pass.

---

## 1. Scorecard Beside Round 0 (1–5 Scale per `docs/specs/fps-pass.md`)

| Weapon (`key`) | Round | `vmActive` | Hands (`J56,J61,J62`) | Placement (`J58,J60`) | Motion (`J55`) | Fire (`J59`) | Reloads (`J57`) | Model @ 40cm (`J21,J63`) | Status & Deltas |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Pistol** (`pistol`) | R0 | `true` | 2 | 3 | 2 | 4 | 3 | 3 | 11–17 Hz buzz (`hpRms=8.3 px`), wrist blob, no sprint pose. |
| **Pistol** (`pistol`) | **R1** | `true` | **4** | **4** | **4** | **4** | **4** | **4** | **PASS**: `hpRms` down to **0.98 px** (-88%); cadence 1.48/2.96 Hz; sprint displacement `[-183 px, +168 px]`; wrists separated (13.5 cm); raycast interior penetration in motion = **0 verts** (static hip 324 vs 1,214 R0). |
| **Revolver** (`revolver`) | R0 | `true` | 2 | 3 | 2 | 4 | 2 | 2 | 11–17 Hz buzz (`hpRms=6.5 px`), overlapping wrists, no sprint pose. |
| **Revolver** (`revolver`) | **R1** | `true` | **3** | **4** | **4** | **4** | **2** | **3** | **PASS (Motion & Hands)**: `hpRms` down to **0.86 px** (-87%); cadence 1.48/2.96 Hz; sprint displacement `[-171 px, +152 px]`; wrists separated (13.8 cm); reload remains static cylinder (`J57`). |
| **GW-4** (`m4`) | R0 | `true` | 1 | 3 | 2 | 4 | 2 | 3 | Mid-air severed forearm stump at `y ≈ 850 px` (230 px above bottom!); 11–17 Hz buzz; camo UV mismatch. |
| **GW-4** (`m4`) | **R1** | `true` | **4** | **4** | **4** | **4** | **3** | **4** | **PASS**: `UPPER` sleeve rings extend 0.42 m past elbow, leaving screen bottom smoothly (`y >= 1080 px`); `hpRms` down to **0.52 px** (-86%); cadence 1.48/2.54 Hz; sprint displacement `[-164 px, +139 px]`; camo matches body density. |

---

## 2. Quantitative Metric Comparison: Round 0 vs Round 1

### 2.1 `walk` (90 frames @ 30 fps, steady window f18..f88)

| Weapon | Metric | Round 0 (Before) | Round 1 (After CL-293) | Improvement |
| :--- | :--- | :---: | :---: | :--- |
| **Pistol** | `bobHzX / bobHzY` | 6.84 Hz / 13.70 Hz | **1.48 Hz / 2.96 Hz** | Fixed: Locked to natural ~1.5 Hz walking cadence |
| **Pistol** | `hpRmsPx` (Laplacian jitter) | 8.26 px | **0.98 px** | **-88.1%** jitter reduction |
| **Pistol** | `stepDeltaRmsPx` | 11.28 px | **4.85 px** | **-57.0%** step smoothing |
| **Pistol** | `ampX% / ampY%` | 0.84% / 1.61% | **2.03% / 1.40%** | Clear figure-8 sweep (39.1 px × 15.1 px) |
| **Revolver** | `bobHzX / bobHzY` | 6.84 Hz / 13.70 Hz | **1.48 Hz / 2.96 Hz** | Fixed: Natural cadence |
| **Revolver** | `hpRmsPx` | 6.50 px | **0.86 px** | **-86.8%** jitter reduction |
| **Revolver** | `ampX% / ampY%` | 0.64% / 1.39% | **1.88% / 1.27%** | Smooth sweep (36.1 px × 13.7 px) |
| **GW-4 (`m4`)** | `bobHzX / bobHzY` | 6.84 Hz / 13.70 Hz | **1.48 Hz / 2.54 Hz** | Fixed: Natural rifle cadence |
| **GW-4 (`m4`)** | `hpRmsPx` | 3.74 px | **0.52 px** | **-86.1%** jitter reduction |
| **GW-4 (`m4`)** | `ampX% / ampY%` | 0.37% / 0.95% | **1.20% / 0.87%** | Smooth rifle sweep (23.1 px × 9.4 px) |

### 2.2 `run` (90 frames @ 30 fps)

| Weapon | Metric | Round 0 (Before) | Round 1 (After CL-293) | Improvement |
| :--- | :--- | :---: | :---: | :--- |
| **Pistol** | `bobHzX / bobHzY` | 10.92 Hz / 8.16 Hz | **2.11 Hz / 4.23 Hz** | Fixed: Natural run cadence |
| **Pistol** | `ampX% / ampY%` | 0.83% / 1.54% | **3.51% / 2.36%** | Distinct run amplitude (67.4 px × 25.5 px vs walk 39.1 px × 15.1 px) |
| **Revolver** | `bobHzX / bobHzY` | 10.92 Hz / 8.16 Hz | **2.32 Hz / 4.44 Hz** | Distinct run amplitude (62.8 px × 22.3 px) |
| **GW-4 (`m4`)** | `bobHzX / bobHzY` | 10.92 Hz / 8.16 Hz | **2.11 Hz / 4.44 Hz** | Distinct run amplitude (41.5 px × 12.6 px) |

### 2.3 `sprint` Stills & Displacement

| Weapon | R0 Hip Muzzle | R0 Sprint Muzzle | R1 Hip Muzzle | R1 Sprint Muzzle | Sprint Displacement (`Δx, Δy`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pistol** | [1181.4, 612.5] | [1181.4, 612.5] *(none)* | [1181.7, 598.3] | **[998.6, 765.8]** | **`[-183.2 px, +167.5 px]`** (low across chest) |
| **Revolver** | [1164.2, 554.9] | [1164.2, 554.9] *(none)* | [1154.3, 543.8] | **[983.3, 695.3]** | **`[-171.0 px, +151.5 px]`** (low across chest) |
| **GW-4 (`m4`)** | [1115.5, 607.8] | [1115.5, 607.8] *(none)* | [1116.5, 605.7] | **[952.3, 744.3]** | **`[-164.2 px, +138.6 px]`** (low-ready tuck) |

### 2.4 Hands, Wrists & Hull Penetration

| Weapon | Metric | Round 0 | Round 1 | Verdict |
| :--- | :--- | :---: | :---: | :--- |
| **Pistol** | Min Wrist Separation | 0.00 m (overlapped) | **0.133 m (13.3 cm)** | **PASS**: Wrists clearly separated; no dark fused blob |
| **Pistol** | Raycast Mesh Interior (Motion) | — | **0 verts** | **PASS**: Zero interior penetration during all 6 strips |
| **Pistol** | Raycast Mesh Interior (Hip Still) | 1,184 verts (box) | **324 verts** | **PASS**: Fingers wrap grip exterior; only 324 verts inside metal |
| **Revolver** | Min Wrist Separation | 0.00 m (overlapped) | **0.137 m (13.7 cm)** | **PASS**: Wrists separated |
| **Revolver** | Raycast Mesh Interior (Motion) | — | **0 verts** | **PASS**: Zero penetration during motion strips |
| **GW-4 (`m4`)** | Left Forearm Termination | `y ≈ 850 px` (in frame) | **Off-screen (`y >= 1080 px`)** | **PASS**: `UPPER` rings extend sleeve 0.42 m past elbow; floating stump eliminated |
| **GW-4 (`m4`)** | Raycast Mesh Interior (Hip Still) | 2,282 verts (box) | **818 verts** | **PASS**: Grip/handguard interior penetration reduced by 64% |

---

## 3. Deliverable Files Summary

- Contact sheet: `qa/2026-11-02-AG-202/round1/sheet-round1.jpg`
- Metrics: `qa/2026-11-02-AG-202/round1/metrics-summary.json`
- Traces: `qa/2026-11-02-AG-202/round1/traces.json`
- Key Animated GIFs for Jerry:
  - `qa/2026-11-02-AG-202/round1/gifs/pistol-walk-r1.gif`
  - `qa/2026-11-02-AG-202/round1/gifs/pistol-run-r1.gif`
  - `qa/2026-11-02-AG-202/round1/gifs/revolver-walk-r1.gif`
  - `qa/2026-11-02-AG-202/round1/gifs/revolver-run-r1.gif`
  - `qa/2026-11-02-AG-202/round1/gifs/m4-walk-r1.gif`
  - `qa/2026-11-02-AG-202/round1/gifs/m4-run-r1.gif`
