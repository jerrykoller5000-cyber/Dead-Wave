# AG-202: First-Person Contact Sheet & Motion/Placement Audit from Jerry's Seat (`D-111` / `docs/specs/fps-pass.md`)

- **Date:** 2026-11-02
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Seat:** `index.html?solid=1` (`&debug=1&raf=timer`), First Person (`TT.setViewFirstDbg(true)`), `fpFov = 60°`, `aimFov = 38°`, WebGPU (`RTX 5080`)
- **Resolutions & Environments:** `1920×1080` (`1080p`) and `2560×1440` (`1440p`), **Training Ground** (`tg`) and **Woods Trail at Noon** (`woods`)
- **Artifacts in `qa/2026-11-02-AG-202/`:**
  - Master Overview Contact Sheets: `Sheet-Overview-tg-1080p.jpg`, `Sheet-Overview-tg-1440p.jpg`, `Sheet-Overview-woods-1080p.jpg`, `Sheet-Overview-woods-1440p.jpg`
  - Per-weapon Stills Sheets (7 poses × 3 seat/res rows): `sheets/<weapon>-stills.jpg` (19 sheets)
  - Per-weapon 3 s @ 30 fps Motion Strips + Screen-Pixel Trace Plots (`muzzle`, `wristR`, `wristL`, 2D trajectory, hull intersections): `strips/<weapon>-strips.jpg` (19 sheets)
  - Animated 3 s @ 30 fps GIFs: `gifs/<weapon>-<strip>.gif` (114 GIFs across `walk`, `run`, `strafe`, `flick90`, `burst`, `jump`)
  - Raw Stills: `stills/{tg-1080p,tg-1440p,woods-1080p,woods-1440p}/<weapon>-<pose>.jpg` (532 stills)
  - Raw Trace & Metric Data: `traces.json`, `metrics-summary.json`

---

## 1. Per-Weapon Checklist Scores (1–5 Scale per `docs/specs/fps-pass.md`)

> **Target Bar (`docs/specs/fps-pass.md`):** Nothing ships at **1** or **2**; every category on every weapon must reach **4** before the pass closes.
> **Current Status:** **0 of 19 weapons** meet the ≥ 4 bar across all 6 categories. All 8 `VM_POSES` guns score **1–2** on **Hands** (`J56`, `J61`, `J62`) and **2** on **Motion** (`J55`); the 4 heavy weapons, 2 akimbo pairs, medpen, 3 blades, and grenade have **no viewmodel rig (`vmActive: false`)** and score **1–2** across the board (`J54`, `J59`, `J60`).

| Weapon (`key`) | `vmActive` | Hands (`J56,J61,J62`) | Placement (`J58,J60`) | Motion (`J55`) | Fire (`J59`) | Reloads (`J57`) | Model @ 40 cm (`J21,J57,J63`) | Blocking Issues Summary |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Pistol** (`pistol`) | `true` | **2** | **3** | **2** | **4** | **3** | **3** | `1,184–1,214` hand verts inside gun hull; `wristL` overlaps `wristR` as a dark blob; elbow stumps visible in `walk`/`reload`; no sprint pose; `walk`/`run` bob is an 11–17 Hz buzz (`hpRms=8.1–10.6 px`) with identical `0.83%` amplitude (`bw` clamps at `4 m/s`). |
| **Revolver** (`revolver`) | `true` | **2** | **3** | **2** | **4** | **2** | **2** | `1,242–1,358` hand verts inside hull; `wristL` overlaps `wristR`; no swing-out cylinder or chambers/rounds during reload (`J57`); no sprint pose; 11–17 Hz walk/run buzz (`hpRms=6.7–8.8 px`). |
| **Wasp** (`uzi`) | `true` | **2** | **3** | **2** | **4** | **3** | **3** | `1,850–1,967` hand verts inside hull; parallel forearm cylinders expose capped elbow stumps at bottom; no sprint pose; 11–17 Hz walk/run buzz (`hpRms=6.6–8.7 px`, `amp=0.69%`). |
| **GW-4** (`m4`) | `true` | **1** | **3** | **2** | **4** | **2** | **3** | **Severed left forearm stump floats in mid-air** at `y ≈ 850 px` (`230 px` above bottom of 1080p frame!) because `vm-forearm` is only `0.26 m` long; `2,221–2,409` hand verts inside hull; camo UV density mismatch between `vm-forearm` (`3.0–4.5 rep/m`) and `gb152-hand` (`2.38 rep/m`, `J63`); 11–17 Hz walk/run buzz (`amp=0.36%`). |
| **AK** (`ak`) | `true` | **1** | **3** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 849 px`); `2,040–2,139` hand verts inside hull; wood furniture camo/grain scale pop (`J63`); no sprint pose; 11–17 Hz walk/run buzz (`amp=0.40%`). |
| **Shotgun** (`shotgun`) | `true` | **1** | **3** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 853 px`); `2,013–2,341` hand verts inside hull; reload moves whole magazine box instead of single-shell lifter insertion (`J57`); wood furniture UV scale (`J63`). |
| **Breacher-12** (`aa12`) | `true` | **1** | **3** | **2** | **4** | **2** | **3** | **Severed left forearm stump in mid-air** (`wristL y = 857 px`); `3,441–3,517` hand verts inside drum/receiver hull; no sprint pose; 11–17 Hz walk/run buzz (`amp=0.44%`). |
| **Sniper** (`sniper`) | `true` | **1** | **2** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 830 px`); `2,847–2,908` hand verts inside hull; at `ads >= 0.82` when scope overlay activates (`viewmodel.js:599`), `vmEyeHide` un-hides the 3P marine arms inside the scope view (`Sheet-Overview-tg-1080p.jpg`); no bolt-handle lift/pull reload (`J57`). |
| **Launcher** (`launcher`) | `false` | **1** | **2** | **2** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; uses 3P-in-1P (`J54, J60`). Tube sits far bottom-left (`muzzle=[628, 645]`); both wrists off-screen (`wristR y = 1302 px`, `wristL y = 948 px`); no ADS sight picture; no 1P tube-break/round reload. |
| **Minigun** (`minigun`) | `false` | **1** | **1** | **1** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; sits at bottom edge (`muzzle=[800, 752]`), and during `walk` only the top few pixels of the barrel cluster peek above `y = 1080 px` (`strips/minigun-strips.jpg`); both wrists completely off-screen (`wristR y = 1379 px`, `wristL y = 1138 px`). |
| **Flamer** (`flamer`) | `false` | **1** | **1** | **1** | **1** | **1** | **2** | **No viewmodel (`vmActive: false`)**; both wrists off-screen (`wristR y = 1396 px`, `wristL y = 1126 px`); **`J59` severe 12.5 Hz camera shake (`camShakeRms = 5.191 cm`, 100× M4; `hpRms = 42.79 px`, `102.7 × 73.6 px` starburst)** during 3 s flame stream. |
| **Chainsaw** (`chainsaw`) | `false` | **1** | **1** | **1** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; barely peeks above bottom-left edge (`muzzle=[780, 852]`), dipping almost entirely off-screen during `walk`/`run`; both wrists off-screen (`wristR=[40089, 1944]`, `wristL=[329, 1276]`). |
| **Akimbo Pistols** (`akimbo-pistol`) | `false` | **1** | **1** | **1** | **2** | **1** | **3** | `viewmodel` disables itself when `akimboOn()` is true (`index.html:50952`); falls back to 3P-in-1P where guns sit at bottom corners and swing wildly off-screen (`run ampX = 3,870 px`, `burst hpRms = 64.2 px`). |
| **Akimbo Wasps** (`akimbo-uzi`) | `false` | **1** | **1** | **1** | **2** | **1** | **3** | `viewmodel` disabled under `akimboOn()`; falls back to 3P-in-1P barely visible at `y = 1003 px` (`run ampX = 6,195 px`, `burst hpRms = 191.4 px`). |
| **MedPen** (`medpen`) | `false`* | **1** | **1** | **1** | **1** | **1** | **2** | **Critical bug (`J54`)**: `_vmState.want` (`index.html:50952`) does **not** check `!(medPenT > 0)`. While holding any `VM_POSES` gun, `viewmodel` stays active and keeps `armLG` (where `medPenHand` is parented) hidden via `vmEyeHide = true`, so the MedPen injection is completely invisible in 1P! |
| **Knife** (`knife`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | No standalone 1P inspect/ready pose (shows equipped gun until `triggerKnife` sets `knifeAnimT > 0`, which abruptly drops `viewmodel` for 0.25 s and causes a `907 px` screen-space jump). |
| **Machete** (`machete`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | Same as `knife`: no standalone 1P viewmodel; `triggerKnife` drops `viewmodel` for 3P swing (`1,722 px` transition spike). |
| **Katana** (`katana`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | Same as `knife`: no standalone 1P viewmodel; `triggerKnife` drops `viewmodel` for 3P swing (`3,523 px` transition spike). |
| **Grenade** (`grenade`) | `false`* | **1** | **1** | **1** | **1** | **1** | **2** | **Critical bug (`J54`)**: `_vmState.want` (`index.html:50952`) does **not** check `!(grenadeAnim.phase)`. While holding any `VM_POSES` gun, `viewmodel` stays active and hides `armLG` (`grenadeHand`) via `vmEyeHide = true`, so grenade pin-pull/windup/throw is completely invisible in 1P! |

---

## 2. Quantitative Trace Metrics Across All 19 Weapons (`1080p` & `1440p`)

### 2.1 Placement (`hip`, `ads`, `sprint`) & Hand-in-Hull Intersections (`1080p`)

| Weapon | `vmActive` | `hip` Muzzle `(x, y)` | `ads` Muzzle `(x, y)` | `sprint` Muzzle `(x, y)` | `hip` WristR `(x, y)` | `hip` WristL `(x, y)` | Max Hull Verts Inside Gun |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `pistol` | `true` | `(1181.7, 597.9)` | `(960.0, 567.7)` | `(1181.4, 612.5)` | `(1246.2, 838.6)` | `(1243.4, 868.6)` | **1,214** |
| `revolver` | `true` | `(1186.1, 614.2)` | `(962.0, 592.7)` | `(1186.1, 614.2)` | `(1263.4, 837.3)` | `(1260.4, 867.2)` | **1,358** |
| `uzi` | `true` | `(1170.0, 610.6)` | `(965.7, 581.2)` | `(1170.0, 610.6)` | `(1246.2, 853.6)` | `(1178.4, 867.9)` | **1,967** |
| `m4` | `true` | `(1116.5, 603.5)` | `(970.4, 578.0)` | `(1115.5, 607.8)` | `(1371.1, 956.9)` | `(1173.4, 845.1)` | **2,409** |
| `ak` | `true` | `(1124.2, 604.2)` | `(970.5, 579.2)` | `(1124.2, 604.2)` | `(1376.2, 958.8)` | `(1183.1, 849.4)` | **2,139** |
| `shotgun` | `true` | `(1107.6, 595.4)` | `(967.5, 564.3)` | `(1107.6, 595.4)` | `(1405.5, 987.3)` | `(1172.0, 853.0)` | **2,341** |
| `aa12` | `true` | `(1121.0, 593.0)` | `(970.0, 567.7)` | `(1121.0, 593.0)` | `(1382.2, 974.6)` | `(1181.3, 857.1)` | **3,517** |
| `sniper` | `true` | `(1096.2, 579.9)` | `(976.7, 563.4)` | `(1096.2, 579.9)` | `(1454.9, 1022.6)` | `(1169.3, 829.8)` | **2,908** |
| `launcher` | `false` | `(628.5, 645.1)` | `(604.1, 725.4)` | `(628.5, 645.1)` | `(1173.9, 1302.0)` off | `(534.7, 947.7)` | 0 (no VM) |
| `minigun` | `false` | `(799.6, 751.6)` | `(789.8, 761.0)` | `(799.6, 751.6)` | `(-502.3, 1378.8)` off | `(527.1, 1138.0)` off | 0 (no VM) |
| `flamer` | `false` | `(696.5, 672.3)` | `(677.6, 721.7)` | `(696.5, 672.3)` | `(694.4, 1395.9)` off | `(546.9, 1126.1)` off | 0 (no VM) |
| `chainsaw` | `false` | `(779.6, 851.8)` | `(779.6, 851.8)` | `(779.6, 851.8)` | `(40088.8, 1943.7)` off | `(329.3, 1276.4)` off | 0 (no VM) |
| `akimbo-pistol` | `false` | `(551.4, 797.2)` | `(551.4, 797.2)` | `(551.4, 797.2)` | `(-281.0, 1295.0)` off | `(425.7, 1363.2)` off | 0 (no VM) |
| `akimbo-uzi` | `false` | `(448.6, 1003.1)` | `(448.6, 1003.1)` | `(448.6, 1003.1)` | `(339.9, 1656.6)` off | `(377.7, 1397.7)` off | 0 (no VM) |

### 2.2 Motion & Fire Strips (`1080p` — 90 Frames / 3.0 s @ 30 fps)

| Weapon | `walk` `hpRms` (px) | `walk` `ampX × ampY` (%) | `run` `hpRms` (px) | `run` `ampX × ampY` (%) | `strafe` Tilt / Shift | `flick90` Peak / Settle | `jump` Land Dip (px) | `burst` Peak Kick (px) | `burst` `hpRms` (px) | `burst` Cam Shake RMS (cm) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Target (`fps-pass.md`)** | **Smooth (< 2.5)** | **1.2–2.0% W** | **Smooth (< 3.5)** | **2.5–4.0% W** | **1.5–3.0°** | **10–25 px / 0.18–0.28 s** | **Single dip** | **Up + back** | **Smooth** | **Low (< 0.2 cm)** |
| `pistol` | `8.09` | `0.84% × 1.61%` | `10.56` | `0.83% × 1.54%` | `3.98° / -68.4 px` | `12.06 px / 2.60 s` | `26.58` | `33.54` | `3.79` | `0.029` |
| `revolver` | `6.66` | `0.69% × 1.32%` | `8.80` | `0.69% × 1.25%` | `3.99° / -56.2 px` | `9.82 px / 2.57 s` | `22.02` | `72.42` | `6.70` | `0.137` |
| `uzi` | `6.64` | `0.69% × 1.31%` | `8.72` | `0.68% × 1.24%` | `3.98° / -56.4 px` | `9.96 px / 2.60 s` | `21.97` | `19.63` | `5.04` | `0.019` |
| `m4` | `4.07` | `0.37% × 0.95%` | `4.23` | `0.36% × 0.86%` | `4.02° / -28.0 px` | `7.11 px / 2.40 s` | `17.10` | `38.79` | `3.63` | `0.019` |
| `ak` | `4.19` | `0.40% × 0.97%` | `4.70` | `0.40% × 0.89%` | `4.02° / -31.1 px` | `7.34 px / 2.47 s` | `17.50` | `61.78` | `4.81` | `0.068` |
| `shotgun` | `3.99` | `0.35% × 0.94%` | `4.02` | `0.34% × 0.84%` | `4.03° / -26.2 px` | `7.11 px / 2.33 s` | `16.92` | `87.21` | `5.26` | `0.097` |
| `aa12` | `4.46` | `0.45% × 1.02%` | `5.29` | `0.44% × 0.94%` | `4.01° / -35.2 px` | `7.93 px / 2.47 s` | `18.43` | `31.11` | `4.81` | `0.049` |
| `sniper` | `4.07` | `0.32% × 0.97%` | `3.79` | `0.31% × 0.86%` | `4.04° / -23.1 px` | `5.51 px / 1.87 s` | `12.50` | `113.83` | `7.64` | `0.137` |
| `launcher` | `1.34` | `5.20% × 6.72%` | `1.70` | `8.59% × 11.46%` | `0.0° / -118.4 px` | `40.42 px / 0.27 s` | `56.71` | `93.36` | `9.87` | `0.025` |
| `minigun` | `1.07` | `3.64% × 8.70%` | `1.59` | `6.14% × 14.37%` | `0.0° / -51.1 px` | `34.10 px / 0.27 s` | `62.77` | `17.87` | `1.54` | `0.029` |
| **`flamer`** | `1.20` | `4.38% × 8.43%` | `1.72` | `7.34% × 14.07%` | `0.0° / -85.1 px` | `37.45 px / 0.27 s` | `61.36` | `66.16` | **`42.79`** | **`5.191`** |
| `chainsaw` | `1.45` | `3.73% × 12.16%` | `2.65` | `6.57% × 19.72%` | `0.0° / -65.7 px` | `38.12 px / 0.27 s` | `84.42` | `36.34` | `2.62` | `0.019` |
| `akimbo-pistol` | `1.88` | `6.96% × 9.61%` | `135.72` | `201% × 353%` | `0.0° / -168.8 px` | `54.15 px / 0.27 s` | `61.18` | `102.98` | `64.17` | `0.036` |
| `akimbo-uzi` | `61.99` | `160% × 63%` | `258.50` | `322% × 106%` | `0.0° / -151.3 px` | `58.95 px / 0.27 s` | `61.48` | `714.92` | `191.37` | `0.029` |

### 2.3 Resolution Invariance Check (`1440p` — `2560×1440` vs `1080p`)

Normalized amplitudes (`ampXPct`, `ampYPct`) and hull intersections at `1440p` match `1080p` to `0.001%`, while pixel-space `hpRmsPx` scales by exact `1440 / 1080 = 1.333×`:
- **`pistol` @ 1440p:** `walk` `hpRms = 10.78 px`, `amp = 0.838% × 1.606%`; `run` `hpRms = 14.08 px`, `amp = 0.831% × 1.542%`; `burst` `kick = 44.71 px`, `camShake = 0.029 cm`.
- **`m4` @ 1440p:** `walk` `hpRms = 5.42 px`, `amp = 0.367% × 0.953%`; `run` `hpRms = 5.65 px`, `amp = 0.363% × 0.861%`; `burst` `kick = 51.72 px`, `camShake = 0.019 cm`.
- **`flamer` @ 1440p:** `burst` `hpRms = 57.05 px` (`136.9 × 98.1 px` starburst), `camShake = 5.191 cm`.

---

## 3. Root-Cause Diagnosis & Owner Routing (`CL-293` & `GP-20016`)

### 3.1 For ChatGPT (`GP-20016` — `game/viewmodel.js`, `game/viewmodel-poses.js`, `index.html`)

1. **`J55` Walk/Run High-Frequency Buzz (`11–17 Hz`) & Identical Walk/Run Amplitude (`game/viewmodel.js:539-545`, `game/viewmodel-poses.js:20`)**:
   - In `game/viewmodel.js:539-545`:
     ```js
     const bw = Math.min(1, speed / 4) * (1 - st.ads * 0.72) * ground;
     S.bobPhase += dt * speed * VM.bob.rate * Math.PI;
     const bx = Math.sin(S.bobPhase) * VM.bob.x * bw;
     const by = -Math.abs(Math.sin(S.bobPhase)) * VM.bob.y * bw;
     ```
   - **Bug 1 (Frequency):** `S.bobPhase` advances by `speed * 1.85 * π rad/s` (`0.925 * speed Hz`), and `by = -Math.abs(Math.sin(S.bobPhase))` doubles the frequency (`1.85 * speed Hz`). At walk speed (`6 m/s`) and run speed (`8.6 m/s`), the vertical bob oscillates at **`11.1 Hz` to `15.9 Hz`**! At 30 fps (`15 Hz` Nyquist), a `15.9 Hz` rectified sine aliases into a frame-to-frame sawtooth buzz (`hpRmsPx = 8.1–10.6 px` on pistols, `4.1–4.7 px` on rifles). Stride cadence should be **`1.8–2.2 Hz` walk** and **`2.6–3.0 Hz` run** (one step every `0.33–0.55 s`), not `1.85 × speed`!
   - **Bug 2 (Amplitude):** `bw = Math.min(1, speed / 4)` clamps at `4 m/s`, so `walk` (`6 m/s`) and `run` (`8.6 m/s`) have the **exact same amplitude**, and `VM.bob = { x: 0.0065, y: 0.0085 }` produces only `0.36–0.84%` width (`7–16 px`), well below the spec's `1.2–2.0%` walk and `2.5–4.0%` run.
2. **Missing Sprint Pose (`index.html:50942-50958`, `game/viewmodel.js`)**:
   - `_vmState` (`index.html:50942`) does not pass `sprint: moveRunning` to `viewmodel.update()`, and `game/viewmodel.js` has no low-ready / across-chest sprint pose.
3. **`readSockets` Freezing Twisted 3P Gait Sockets When Moving (`game/viewmodel.js:491`, `index.html:50957`)**:
   - `st.settled` is `Math.hypot(velX, velZ) < 0.3 && Math.abs(velY) < 0.2`. If a weapon is equipped or `readSockets` runs while the player is moving (`walk`/`sprint`), `const first = sockets.key !== key || !sockets.r` (`game/viewmodel.js:491`) captures the 3P gait's mid-swing arm transforms on the first frame and locks them until the player stops moving (`Sheet-Overview-tg-1080p.jpg` `SPRINT` column and `strips/pistol-strips.jpg` `walk` row).
4. **`J59` Flamethrower 12.5 Hz Camera Shake & Recoil Step (`index.html:52693`, `index.html:22745`)**:
   - `flamerTick()` (`index.html:52693`) calls `addShake(0.02)` every `0.08 s` (`12.5 Hz`). In `index.html:63941`, `screenShake` translates `camera.position` each frame by a random vector, producing `camShakeRmsCm = 5.191 cm` (`100×` M4) and `hpRmsPx = 42.79 px`. Meanwhile `index.html:22745` applies `torsoLean -= 0.065` without a damped spring. Replace with a smooth low-frequency pressure push on the viewmodel (`0.6–1.2 Hz` wandering drift, `< 2 px/frame` jitter) and remove the per-tick `addShake(0.02)` in `flamerTick`.
5. **`J54` / `J60` Missing Viewmodels for Heavies, Akimbo, MedPen, Blades, and Grenade (`game/viewmodel-poses.js`, `index.html:50952`)**:
   - `launcher`, `minigun`, `flamer`, `chainsaw`, `akimbo-pistol`, and `akimbo-uzi` are absent from `VM_POSES` (`vmActive: false`), leaving their wrists off-screen at `y = 948–1944 px` and their barrels barely peeking above the bottom-left edge.
   - `_vmState.want` (`index.html:50952`) checks `!(knifeAnimT > 0)` but **forgets `!(medPenT > 0)` and `!(grenadeAnim.phase)`**, keeping `armLG` hidden via `vmEyeHide = true` so MedPen injections and Grenade throws are completely invisible in 1P when holding a `VM_POSES` weapon!
   - In `sniper` ADS (`st.ads >= 0.82`, `game/viewmodel.js:599`), setting `vm.root.visible = false` / `setEyeHide` leaves the 3P marine arms visible inside the sniper scope (`Sheet-Overview-tg-1080p.jpg` `sniper ADS`).
   - In `index.html:50947`, `stowed()` only hides `carryRig.slings` and `carryRig.holsters`, omitting `carryRig.pairs`, `hip`, `hipPair`, `slingVest`, `bandolier`, `belt40`, `mags`, `shells`, `grenades`, `tanks`, `medPens`, and `blades`.

### 3.2 For Claude (`CL-293` — `studio/fp-arms.js`, `index.html` Hand/Grip/Model/Reloads)

1. **`J56` / `J61` / `J62` Severed Left Forearm Stumps in Mid-Air on All 5 Long Guns (`studio/fp-arms.js:18-24`)**:
   - `forearmGeo()` (`studio/fp-arms.js:18-24`) builds a tube only **`0.22 m` long** (`y = 0` at elbow to `y = -0.22 m` at wrist, plus a `0.04 m` cuff = `0.26 m` total).
   - On `m4`, `ak`, `shotgun`, `aa12`, and `sniper`, the left support wrist is `0.95–1.15 m` in front of the eye, so a `0.26 m` forearm ends in mid-air inside the screen at `y ≈ 830–857 px` (`220–250 px` above the bottom of the 1080p viewport!), exposing the flat capped elbow stump in `hip`, `ads`, `reload-out`, and `reload-in` (`stills/tg-1080p/m4-reload-in.jpg`, `Sheet-Overview-woods-1080p.jpg`).
   - **Fix:** Extend `forearmGeo()` in `studio/fp-arms.js` so the sleeve/upper-arm runs at least `0.55–0.65 m` behind the wrist (or links cleanly past the bottom/outer edge of the camera frustum at `60°` FOV across all poses).
2. **`J56` Hand-in-Hull Intersections (`1,184–3,517` Vertices Inside Gun Hulls) & Pistol/Revolver Support-Hand Overlap**:
   - Every `VM_POSES` weapon has `1,184–3,517` hand vertices inside the weapon's bounding boxes (`aa12`: `3,517`, `sniper`: `2,908`, `m4`: `2,409`, `shotgun`: `2,341`, `ak`: `2,139`, `uzi`: `1,967`, `revolver`: `1,358`, `pistol`: `1,214`).
   - On `pistol` and `revolver`, `wristL` (`[1243, 868]`) is placed nearly on top of `wristR` (`[1246, 838]`), causing the support hand to interpenetrate the firing hand as a dark overlapping lump (`Sheet-Overview-woods-1080p.jpg`).
3. **`J57` Reload Mechanics & `J21`/`J63` Model at 40 cm**:
   - `revolver`: reload tilts the whole gun down/up (`game/viewmodel.js:338`) without swinging out the cylinder, ejecting brass, or showing chambers (`J57`).
   - `shotgun`: reload pulls a detachable box (`pickMag`) down and up instead of pushing shells into the bottom loading port (`J57`).
   - `sniper`: reload does not lift/pull the bolt handle (`J57`).
   - `J63` UV density mismatch at 40 cm: `studio/fp-arms.js:62-63` (`vm-forearm` and `vm-cuff`) uses raw `loftRings` cylindrical UVs (`3.0–4.5 repeats/m`) while `gb152-hand` and the 3P `live-sleeve` use `boxProjectUV` (`2.38 repeats/m`), and `registerGunFurniture` (`index.html:20681`) projects wood/camo UVs in unscaled local mesh space before weapon scaling (detailed in `AG-201`).
