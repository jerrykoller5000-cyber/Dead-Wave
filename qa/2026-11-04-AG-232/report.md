# AG-232 · GP-20022 Rebuilt Minigun & Chainsaw + CL-301 First-Person Hands & GB-275 Third-Person Holds Audit

- **Date**: 2026-11-04 (`01:44Z`)
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Seat**: `AG-219` woods-trail seat (`x = 42, y = -7.5468, z = -20, yaw = 0.000151`)
- **Launcher & Renderer**: Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`, `startMatch(T, 'JERRY')`), 1920×1080 real WebGPU on RTX 5080
- **Build Inspected**:
  - `GP-20022` (`studio/weapon-heavy.js`, including static `starterCord` scale `0.001`)
  - `SAW_CHAIN_L = 0.40`, `SAW_CHAIN_R = 0.055`, `WEAPON_SIZE.chainsaw = { len: 1.715, m: 0.85, look: 1.2 }` (`scale = 0.6453`, `factor = 0.54684`), `minigunScale = 0.88`
  - `CL-301` (`01:25Z` `game/viewmodel-poses.js` & `game/viewmodel.js`): `VM_SOCKETS.minigun = { grip: [0, -0.017, -0.52], support: [-0.075, 0.263, 0.16] }`, `VM_SOCKETS.chainsaw = { grip: [0, -0.014, -0.46], support: [-0.01, 0.246, -0.035] }`
  - `GB-275` (`index.html` lines 51739–51741): **Chainsaw 3P half landed** (`WEAPON_HOLD.chainsaw = { twist: 0.5, hold: [-0.24, -0.34, 0.22], grip: [0, -0.014, -0.46], trig: [0, -0.01, -0.39], fore: [-0.01, 0.246, -0.035], level: true }`); **Minigun 3P half not yet landed** (`WEAPON_HOLD.minigun` still at legacy `{ twist: 0.6, hold: [-0.3, -0.3, 0.2], grip: [0, 0.2, -0.28], fore: [0, 0.14, -0.05] }`).

---

## 1. Pre-Capture Assertion Summary (First Person)

Every first-person still asserted before capture:
1. `T.getCurrentWeapon() === key && vm.info.active === true && vm.info.key === key && vm.info.akimbo === false && vm.info.raise === 1.0000`
2. `dR = vm.wrists.r.p.distanceTo(vm.viewPoint(VM_SOCKETS[key].grip)) < 0.12 m`
3. `dL = vm.wrists.l.p.distanceTo(vm.viewPoint(VM_SOCKETS[key].support)) < 0.12 m`

| Shot File | Weapon | State / Light | `raise` | `dR` (`wrist.r` to `grip` socket) | `dL` (`wrist.l` to `support` socket) | Gun-Local Palm Grip `cR` vs `VM_SOCKETS.grip` | Gun-Local Palm Support `cL` vs `VM_SOCKETS.support` | Support Socket NDC `(x, y)` | Grip Socket NDC `(x, y)` | Muzzle NDC `(x, y)` | Action Proof |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `minigun-fp-rest.jpg` | `minigun` | Hip Rest (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.075, 0.263, 0.16]` (`err = 0.0000 m`) | `(+0.111, -0.300)` | `(+0.540, -1.825)` (below frame) | `(+0.029, -0.370)` | `holdFrames = 60` |
| `minigun-fp-fire.jpg` | `minigun` | Firing (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.075, 0.263, 0.16]` (`err = 0.0000 m`) | `(+0.113, -0.287)` | `(+0.558, -1.879)` (below frame) | `(+0.029, -0.350)` | `barrelRotDelta = 23.875 rad`, `shotsDelta = 15` |
| `minigun-fp-042.jpg` | `minigun` | Hip Rest (`0.42`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.075, 0.263, 0.16]` (`err = 0.0000 m`) | `(+0.111, -0.303)` | `(+0.540, -1.828)` | `(+0.029, -0.374)` | 4-light gate |
| `minigun-fp-dusk.jpg` | `minigun` | Hip Rest (Dusk `0.74`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.075, 0.263, 0.16]` (`err = 0.0000 m`) | `(+0.111, -0.305)` | `(+0.540, -1.830)` | `(+0.029, -0.376)` | 4-light gate |
| `minigun-fp-night.jpg` | `minigun` | Hip Rest (Night `0.02`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.075, 0.263, 0.16]` (`err = 0.0000 m`) | `(+0.111, -0.304)` | `(+0.540, -1.829)` | `(+0.029, -0.375)` | 4-light gate |
| `chainsaw-fp-idle.jpg` | `chainsaw` | Hip Idle (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `(+0.240, -0.394)` | `(+0.679, -1.430)` (below frame) | `(-0.103, +0.074)` | `chainToothIdleDelta10f = 0.0283` |
| `chainsaw-fp-cut.jpg` | `chainsaw` | Cutting (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `(+0.239, -0.401)` | `(+0.679, -1.437)` (below frame) | `(-0.103, +0.066)` | `chainToothCutDelta = 0.1960`, `heat = 0.015` |
| `chainsaw-fp-042.jpg` | `chainsaw` | Hip Idle (`0.42`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `(+0.240, -0.393)` | `(+0.679, -1.429)` | `(-0.103, +0.075)` | 4-light gate |
| `chainsaw-fp-dusk.jpg` | `chainsaw` | Hip Idle (Dusk `0.74`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `(+0.240, -0.395)` | `(+0.679, -1.430)` | `(-0.103, +0.073)` | 4-light gate |
| `chainsaw-fp-night.jpg` | `chainsaw` | Hip Idle (Night `0.02`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `(+0.240, -0.398)` | `(+0.679, -1.434)` | `(-0.103, +0.070)` | 4-light gate |

---

## 2. Comparison vs. References (`docs/jerry/2026-11-03-fp-refs/heavy-models/` & `Claude outputs/cl301/*-gp20022.png`)

### 2.1 Minigun (`minigun-fp-rest.jpg`, `minigun-fp-fire.jpg`)
- **Comparison against `Claude outputs/cl301/minigun-gp20022.png`**:
  - Our live 1080p WebGPU launcher render matches `Claude outputs/cl301/minigun-gp20022.png` 1:1 in placement, perspective, and hand grip.
  - The **left hand** wraps cleanly around `GP-20022`'s front vertical support post (`(-0.075, 0.263, 0.16)`, `ndc (+0.111, -0.300)`), with the camo left forearm entering from the lower-left (`elbowRel.l = [-0.18, -0.40, 0.30]`) and clearing the left receiver vents without clipping.
  - The **right hand** holds the rear firing grip behind the receiver (`(0, -0.017, -0.52)`, `view [-0.228, -0.433, -0.411]`, `ndc (+0.540, -1.825)`), sitting below the bottom-right edge of the 1080p frame so the old "right hand sticking through top of minigun" defect (`J61`) is completely eliminated.
  - The **J18 red-dot sight** stands upright just to the right of the left support post, with its red reticle dot clearly visible at rest and during firing.
- **Comparison against Jerry's references (`minigun-hip-two-handles.jpg`, `minigun-m134-handheld-belt.webp`, `minigun-hip-figure.jpg`)**:
  - Two distinct, functional handles (front top support post + rear trigger grip behind housing), lengthened 6-barrel cluster (`0.84 m`) with front clamp ring, and ribbed olive box feed on the lower side match the handheld M134 anatomy.

### 2.2 Chainsaw (`chainsaw-fp-idle.jpg`, `chainsaw-fp-cut.jpg`)
- **Comparison against `Claude outputs/cl301/chainsaw-gp20022.png`**:
  - Matches `Claude outputs/cl301/chainsaw-gp20022.png` 1:1.
  - The **left hand** grips the ribbed rubber top bar of the front wrap hoop (`(-0.01, 0.246, -0.035)`, `ndc (+0.240, -0.394)`) from above, with its thumb wrapped under and the camo left sleeve descending cleanly to the lower-left (`elbowRel.l = [-0.12, -0.36, 0.18]`).
  - The **right hand** holds the in-line rear throttle handle behind the orange engine housing (`(0, -0.014, -0.46)`, `ndc (+0.679, -1.430)` below the bottom-right corner).
  - The **worn industrial orange engine cowling** (`#a85225` / `#c66b2e`) with 4 top cooling vents and pull-cord T-handle sits in the lower-right; the dark front hand guard stands ahead of the left knuckles; and the **extended pale steel guide bar** (`z = 0.93`, `SAW_CHAIN_L = 0.40`) with animated chain teeth wrapping around the nose (`ndc (-0.103, +0.074)`) angles up and left across the lower-center view.
- **Comparison against Jerry's references (`chainsaw-proper-grip.jpg`, `chainsaw-held-forward.jpg`, `chainsaw-held-up.jpg`)**:
  - Matches `chainsaw-proper-grip.jpg` (left hand over the front hoop, right hand on the rear in-line throttle grip) and `chainsaw-held-up.jpg` / L4D2 (body low-right, long pale bar angled up-left).
- **One Note on First-Person Cutting Pose (`chainsaw-fp-cut.jpg`)**:
  - During `chainsaw-fp-cut.jpg` (`mouseFireHeld = true`), the chain teeth accelerate 7× (`chainToothCutDelta = 0.1960` vs `0.0283` at idle) and `sawHeat` increments, but the first-person viewmodel pose (`VM_POSES.chainsaw.hip`) does not translate/pitch forward during cutting (`muzzleSwingDispM = 0.0003 m`) because `VM_POSES.chainsaw.kick` is `{ back: 0, up: 0, side: 0, ads: 1 }` and `game/viewmodel.js` does not apply a `stream`/cutting offset for `chainsaw`. (Optional polish if desired: a slight forward/upward push or high-frequency vibration on `st.stream` when cutting.)

---

## 3. Third-Person Audit (`tp-heavy-sheet.jpg` & `GB-275` Build Status)

| Weapon | `GB-275` Status in Current Build | `WEAPON_HOLD` Entry | 3P Hand-to-Hold Anchor (`dR`, `dL`) | 3P Hand-to-`GP-20022` Handle Centers (`dR`, `dL`) | Visual Verdict |
|---|---|---|---|---|---|
| **Chainsaw** | **LANDED** (`index.html:51741`) | `grip: [0, -0.014, -0.46]`, `fore: [-0.01, 0.246, -0.035]`, `trig: [0, -0.01, -0.39]`, `hold: [-0.24, -0.34, 0.22]`, `level: true` | **`dR = 0.0003 m` (`0.3 mm`), `dL = 0.0161 m` (`1.61 cm`)** | **`dR = 0.0003 m`, `dL = 0.0161 m`** PASS | **4.80 / 5.0 PASS** — Firing hand closes directly around the rear throttle grip (`0.3 mm`) and support hand wraps over the top of the front hoop (`1.61 cm`) behind the guard in rest and cutting views (`chainsaw-3p-rest-right/left/top.jpg`, `chainsaw-3p-cut-right.jpg`). |
| **Minigun** | **NOT YET LANDED** (`index.html:51739` still pre-`GB-275`) | Legacy `grip: [0, 0.2, -0.28]`, `fore: [0, 0.14, -0.05]`, `hold: [-0.3, -0.3, 0.2]` | `dR = 0.0151 m`, `dL = 0.0161 m` (to legacy anchors) | **`dR = 0.2980 m` (`29.8 cm`), `dL = 0.2258 m` (`22.6 cm`)** (off new handles) | **Pending `GB-275` minigun half** — In 3P (`minigun-3p-rest-right/left/top.jpg`), the marine's hands still sit on the old top rail (`z = -0.28`) and mid-housing (`z = -0.05`), leaving `GP-20022`'s rear firing grip (`z = -0.52`) and front vertical post (`z = +0.16`) empty until Grokbot lands the minigun half of `GB-275`. |

---

## 4. D-89 Principles Scorecard (`GP-20022` + `CL-301` First Person & Chainsaw 3P)

| Subject | Silhouette & Proportion | Material & 4-Light Read (`noon`, `0.42`, `dusk`, `night`) | Functional Hand Contact & Mechanics | Framing & Context | Mean Score |
|---|---|---|---|---|---|
| **Minigun (1P `GP-20022` + `CL-301`)** | **4.7 / 5** (lengthened `0.84 m` barrel cluster, front clamp, top support post, rear grip, ribbed olive side box feed) | **4.6 / 5** (clean metallic/polymer separation across all 4 lights; red-dot reticle legible at noon through night) | **4.8 / 5** (`0.0 mm` palm-to-socket error; `0.0656 m` wrist-to-socket; left hand wraps top post, right hand on rear grip below frame; barrels spin `23.9 rad` on fire) | **4.7 / 5** (barrels converge toward center-left without blocking sightline; J18 red dot open) | **4.70 / 5.0 (PASS)** |
| **Chainsaw (1P `GP-20022` + `CL-301` & 3P `GB-275`)** | **4.8 / 5** (orange engine housing, rear in-line throttle handle, front wrap hoop, hand guard, `z = 0.93` pale guide bar with chain round nose) | **4.7 / 5** (worn orange cowling `#a85225`/`#c66b2e`, dark vents, and pale steel bar `#b1b9b2` read crisply in all 4 lights; `starterCord` spike eliminated) | **4.7 / 5** (`0.0 mm` 1P palm-to-socket error, `0.0656 m` wrist-to-socket; 3P `dR = 0.3 mm`, `dL = 1.61 cm` on handles; chain teeth ride nose at `SAW_CHAIN_L = 0.40`) | **4.6 / 5** (classic L4D2 low-right body, bar angled up-left; note: 1P cutting pose is static in translation) | **4.70 / 5.0 (PASS)** |
| **Minigun (3P `WEAPON_HOLD.minigun`)** | 4.7 / 5 | 4.6 / 5 | **2.5 / 5** (pre-`GB-275`: 3P hands still at `z = -0.28` / `-0.05`, `29.8 cm` / `22.6 cm` off `GP-20022` handles) | 3.8 / 5 | *Awaiting `GB-275` minigun half* |


---

Changed: `qa/2026-11-04-AG-232/` (18 stills, 3 contact sheets, `telemetry.json`, `run-ag232.mjs`, `build-sheets.py`, `report.md`), `handoffs/2026-11-04-antigravity-AG-232.md`, plus refreshed `minigun.jpg` and `chainsaw.jpg` in `qa/2026-11-03-AG-228/`, `qa/2026-11-03-AG-231/`, `qa/2026-11-03-AG-223/`, and `qa/2026-11-03-AG-221/`.
Tests: `node crew/crew.mjs slot run antigravity AG-232 --checks "AG-232 1P/3P minigun and chainsaw captures and socket assertions" -- node qa/2026-11-04-AG-232/run-ag232.mjs` (18/18 captures PASS, 1P `dR = 0.0656 m`, `dL = 0.0656 m` `< 0.12 m`, 3P chainsaw `dR = 0.3 mm`, `dL = 1.61 cm`).
Not verified: Third-person minigun `WEAPON_HOLD.minigun` update (Grokbot's `GB-275` minigun half has not yet landed in `index.html`).
