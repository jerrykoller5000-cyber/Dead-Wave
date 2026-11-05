# AG-231 / AG-228 — CL-301 First-Person Verification: Akimbo Pairs (Reload & Right-Click Retake + GP-20023 Stockless Uzi), Minigun & Chainsaw

- **Date**: 2026-11-03
- **Author**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-231` (`AG-228` again for the two stills that didn't take: the pairs' reload and right-click)
- **Launcher / Hardware**: Real WebGPU on NVIDIA GeForce RTX 5080 (`1920x1080 @ 1.00x`, `index.html?solid=1&debug=1&raf=timer`)
- **Seat**: `AG-219` woods-trail seat (`[42.0, -7.5468, -20.0]`, Noon `worldTime = 0.50`)
- **Build**:
  - Includes **`GP-20023`** stockless Wasp/Uzi model (`studio/weapon-sidearms.js`) + Claude's updated `WEAPON_SIZE.uzi = { len: 0.660, m: 0.47, look: 1.0 }` (`uziSizeFactor = 0.65476`).
  - Includes **`CL-301`** akimbo viewmodel (`game/viewmodel.js`, `game/viewmodel-poses.js`) and **`GP-20022`** updated minigun/chainsaw models + `SAW_CHAIN_L = 0.40`.

---

## 1. Root Cause of `AG-228`'s 6 Failed Reload/Aim Stills & Fix in `AG-231`

- **Root Cause in `AG-228`**: In the initial `run-ag228.mjs`, `reloadPairHold()` and `aimPair()` sampled telemetry (`this.sample(key)`) while in the pose, and then ran their cleanup loops (`T.reloadClipDbg.hold(null)` / `T.setZoomHeldDbg(false)` + 80–140 recovery frames) *inside* `page.evaluate(...)` *before* returning to `main()`, where `await captureShot(...)` was called. Consequently, the screenshots were taken after the guns had already returned to rest.
- **Fix in `AG-231`**:
  1. **Real Reload (`startPairReloadToDip`)**: Sets `TT.setAmmoDbg(key, 2); TT.startReload();` (with `reloadClipDbg.hold(null)`), steps real `1/60` frames until `viewmodelDbg().info.reloadU` reaches `0.42–0.43` (inside the `0.35–0.55` window), renders that exact frame (`stepRendered(0)`), asserts `reloadU` is in `[0.35, 0.55]` AND asserts that both grips' NDC `y` moved down by `> 0.15` vs. the rest still (`dip = 0.430 to 0.619 NDC`), captures the screenshot while `"Reloading"` is active and the guns are dipped, and only *after* `captureShot()` completes calls `finishReload()`.
  2. **Right-Click Aim (`startPairAim`)**: Sets `TT.setZoomHeldDbg(true)`, steps until `viewmodelDbg().info.ads > 0.95` (`ads = 1.000`), renders that frame (`stepRendered(0)`), asserts `ads > 0.95` AND asserts that both grips' NDC moved inward (`0.039 to 0.065 NDC`) and upward (`+0.075 to +0.118 NDC`) vs. the rest still, captures the screenshot while `zoomHeld === true`, and only *after* `captureShot()` completes calls `finishAim()`.

---

## 2. Akimbo Pairs Telemetry (`pistol`, `uzi`, `revolver`)

All assertions passed (`15 / 15` akimbo pair stills + `4 / 4` heavy stills = `19 / 19` PASS, `0` console/page errors):

| Pair | State | `vmKey` / `akimbo` / `raise` | Right Grip NDC `(x, y)` | Left Grip NDC `(x, y)` | Right Muzzle NDC `(x, y)` | Left Muzzle NDC `(x, y)` | Verified State & Grip Delta vs. Rest |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **9mm Pistol Pair** (`pistol`) | **1. At Rest** | `pistol` / `true` / `1.00` (60f) | `(+0.3915, -0.5344)` | `(-0.3915, -0.5344)` | `(+0.2532, -0.2011)` | `(-0.2532, -0.2011)` | `holdFrames = 60, slideRZ = 0.0500, slideLZ = 0.0500` |
| | **2. Fire Right** | `pistol` / `true` / `1.00` | `(+0.4234, -0.5767)` | `(-0.3914, -0.5378)` | `(+0.2744, -0.1526)` | `(-0.2531, -0.2047)` | `dShotsR = +1, dShotsL = 0, slideRZ = 0.0098` (R kicks/cycles, L steady) |
| | **3. Fire Left** | `pistol` / `true` / `1.00` | `(+0.3915, -0.5340)` | `(-0.4229, -0.5728)` | `(+0.2532, -0.2007)` | `(-0.2735, -0.1483)` | `dShotsL = +1, dShotsR = 0, slideLZ = 0.0098` (L kicks/cycles, R steady) |
| | **4. Reload** | `pistol` / `true` / `1.00` | `(+0.3825, -1.0526)` | `(-0.3825, -1.0526)` | `(+0.2032, -0.4601)` | `(-0.2032, -0.4601)` | **`reloadU = 0.4280`, `gripDipY = -0.5182 NDC`** (`> 0.15` bar) |
| | **5. Right-Click** | `pistol` / `true` / `1.00` | `(+0.3353, -0.4395)` | `(-0.3353, -0.4395)` | `(+0.2146, -0.1239)` | `(-0.2146, -0.1239)` | **`ads = 1.0000`, `gripInX = -0.0562 NDC`, `gripUpY = +0.0949 NDC`** |
| **Wasp SMG Pair** (`uzi`, `GP-20023` stockless, `len=0.660m`) | **1. At Rest** | `uzi` / `true` / `1.00` (60f) | `(+0.4540, -0.4305)` | `(-0.4540, -0.4305)` | `(+0.0999, -0.0924)` | `(-0.0999, -0.0924)` | `holdFrames = 60, slideRZ = 0.0000, slideLZ = 0.0000` |
| | **2. Fire Right** | `uzi` / `true` / `1.00` | `(+0.4869, -0.4608)` | `(-0.4539, -0.4337)` | `(+0.0725, -0.0110)` | `(-0.0999, -0.0956)` | `dShotsR = +1, dShotsL = 0, slideRZ = 0.0881` (R kicks/cycles, L steady) |
| | **3. Fire Left** | `uzi` / `true` / `1.00` | `(+0.4540, -0.4310)` | `(-0.4864, -0.4676)` | `(+0.1000, -0.0929)` | `(-0.0729, -0.0180)` | `dShotsL = +1, dShotsR = 0, slideLZ = 0.0881` (L kicks/cycles, R steady) |
| | **4. Reload** | `uzi` / `true` / `1.00` | `(+0.4299, -1.0499)` | `(-0.4299, -1.0499)` | `(+0.0968, -0.5063)` | `(-0.0968, -0.5063)` | **`reloadU = 0.4206`, `gripDipY = -0.6194 NDC`** (`> 0.15` bar) |
| | **5. Right-Click** | `uzi` / `true` / `1.00` | `(+0.3893, -0.3130)` | `(-0.3893, -0.3130)` | `(+0.0566, +0.0040)` | `(-0.0566, +0.0040)` | **`ads = 1.0000`, `gripInX = -0.0647 NDC`, `gripUpY = +0.1175 NDC`** |
| **.357 Revolver Pair** (`revolver`) | **1. At Rest** | `revolver` / `true` / `1.00` (60f) | `(+0.3770, -0.4540)` | `(-0.3770, -0.4540)` | `(+0.1606, -0.0833)` | `(-0.1606, -0.0833)` | `holdFrames = 60` |
| | **2. Fire Right** | `revolver` / `true` / `1.00` | `(+0.4238, -0.4845)` | `(-0.3769, -0.4631)` | `(+0.1636, +0.0811)` | `(-0.1604, -0.0929)` | `dShotsR = +1, dShotsL = 0` (R kicks up `+0.164` NDC Y, L steady) |
| | **3. Fire Left** | `revolver` / `true` / `1.00` | `(+0.3769, -0.4559)` | `(-0.4245, -0.4855)` | `(+0.1606, -0.0853)` | `(-0.1642, +0.0799)` | `dShotsL = +1, dShotsR = 0` (L kicks up `+0.163` NDC Y, R steady) |
| | **4. Reload** | `revolver` / `true` / `1.00` | `(+0.3671, -0.8843)` | `(-0.3671, -0.8843)` | `(+0.1419, -0.4150)` | `(-0.1419, -0.4150)` | **`reloadU = 0.4259`, `gripDipY = -0.4303 NDC`** (`> 0.15` bar) |
| | **5. Right-Click** | `revolver` / `true` / `1.00` | `(+0.3378, -0.3790)` | `(-0.3378, -0.3790)` | `(+0.1337, -0.0149)` | `(-0.1337, -0.0149)` | **`ads = 1.0000`, `gripInX = -0.0392 NDC`, `gripUpY = +0.0750 NDC`** |

---

## 3. Deliverables & Artifacts

- **Updated Contact Sheets**:
  - `qa/2026-11-03-AG-231/akimbo-pairs-sheet.jpg` and `qa/2026-11-03-AG-228/akimbo-pairs-sheet.jpg` (`2978x1096`)
  - `qa/2026-11-03-AG-231/minigun-chainsaw-sheet.jpg` and `qa/2026-11-03-AG-228/minigun-chainsaw-sheet.jpg` (`2320x854`)
  - `qa/2026-11-03-AG-231/all-weapons-fp.jpg`, `qa/2026-11-03-AG-228/all-weapons-fp.jpg`, `qa/2026-11-03-AG-223/all-weapons-fp.jpg`, and `qa/2026-11-03-AG-221/all-weapons-fp.jpg` (`2640x1764`)
- **19 Full-Resolution Stills (`1920x1080`)**:
  - `qa/2026-11-03-AG-231/stills/*.jpg` and `qa/2026-11-03-AG-228/stills/*.jpg`
- **Telemetry**:
  - `qa/2026-11-03-AG-231/telemetry.json` and `qa/2026-11-03-AG-228/telemetry.json`
