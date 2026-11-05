Changed:
- Completed `AG-231` (`AG-228` again for the two stills that didn't take: the pairs' reload and right-click, with `GP-20023`'s stockless Uzi build `WEAPON_SIZE.uzi.len = 0.660`, `factor = 0.65476`) from Jerry's launcher (`1920x1080`, real WebGPU, `index.html?solid=1&debug=1&raf=timer`) on the `AG-219` woods-trail seat (`[42.0, -7.5468, -20.0]`, Noon `0.50`).
- **Root Cause Fixed**: In `AG-228`, `reloadPairHold()` and `aimPair()` sampled telemetry (`this.sample(key)`) while in the pose, and then ran their cleanup loops (`T.reloadClipDbg.hold(null)` / `T.setZoomHeldDbg(false)` + 80–140 recovery frames) inside `page.evaluate(...)` *before* returning to `main()`, where `await captureShot(...)` was called. Fixed in `AG-231` so `captureShot()` executes *while* the real reload (`TT.setAmmoDbg(key, 2); TT.startReload()` stepped to `reloadU` in `0.35–0.55`) and right-click (`TT.setZoomHeldDbg(true)` stepped to `ads > 0.95`) are active, with hard pre-capture assertions on both state and grip NDC displacement vs. rest:
  1. **9mm Pistol Pair (`pistol`)**:
     - **Rest**: `gripR = (+0.3915, -0.5344)`, `gripL = (-0.3915, -0.5344)`, `muzzleR = (+0.2532, -0.2011)`
     - **Reload (`u = 0.4280`)**: `gripR = (+0.3825, -1.0526)`, `gripL = (-0.3825, -1.0526)` -> **`gripDipY = -0.5182 NDC`** (`> 0.15` bar)
     - **Right-Click (`ads = 1.0000`)**: `gripR = (+0.3353, -0.4395)`, `gripL = (-0.3353, -0.4395)` -> **`gripInX = -0.0562 NDC`, `gripUpY = +0.0949 NDC`**
  2. **Wasp / Micro-SMG Pair (`uzi`, `GP-20023` stockless build `WEAPON_SIZE.uzi = { len: 0.660, m: 0.47, look: 1.0 }`, `uziSizeFactor = 0.65476`)**:
     - **Rest**: `gripR = (+0.4540, -0.4305)`, `gripL = (-0.4540, -0.4305)`, `muzzleR = (+0.0999, -0.0924)`
     - **Reload (`u = 0.4206`)**: `gripR = (+0.4299, -1.0499)`, `gripL = (-0.4299, -1.0499)` -> **`gripDipY = -0.6194 NDC`** (`> 0.15` bar)
     - **Right-Click (`ads = 1.0000`)**: `gripR = (+0.3893, -0.3130)`, `gripL = (-0.3893, -0.3130)` -> **`gripInX = -0.0647 NDC`, `gripUpY = +0.1175 NDC`**
  3. **.357 Revolver Pair (`revolver`)**:
     - **Rest**: `gripR = (+0.3770, -0.4540)`, `gripL = (-0.3770, -0.4540)`, `muzzleR = (+0.1606, -0.0833)`
     - **Reload (`u = 0.4259`)**: `gripR = (+0.3671, -0.8843)`, `gripL = (-0.3671, -0.8843)` -> **`gripDipY = -0.4303 NDC`** (`> 0.15` bar)
     - **Right-Click (`ads = 1.0000`)**: `gripR = (+0.3378, -0.3790)`, `gripL = (-0.3378, -0.3790)` -> **`gripInX = -0.0392 NDC`, `gripUpY = +0.0750 NDC`**
- Rebuilt `qa/2026-11-03-AG-228/akimbo-pairs-sheet.jpg`, `qa/2026-11-03-AG-231/akimbo-pairs-sheet.jpg`, `qa/2026-11-03-AG-231/minigun-chainsaw-sheet.jpg`, and `qa/2026-11-03-AG-221/all-weapons-fp.jpg` with the verified stills and grip NDC labels.

Files:
- `qa/2026-11-03-AG-228/run-ag228.mjs`
- `qa/2026-11-03-AG-228/build-sheets.py`
- `qa/2026-11-03-AG-228/telemetry.json`
- `qa/2026-11-03-AG-228/akimbo-pairs-sheet.jpg`
- `qa/2026-11-03-AG-228/minigun-chainsaw-sheet.jpg`
- `qa/2026-11-03-AG-228/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-228/stills/*.jpg`
- `qa/2026-11-03-AG-231/report.md`
- `qa/2026-11-03-AG-231/telemetry.json`
- `qa/2026-11-03-AG-231/akimbo-pairs-sheet.jpg`
- `qa/2026-11-03-AG-231/minigun-chainsaw-sheet.jpg`
- `qa/2026-11-03-AG-231/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-231/stills/*.jpg`
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-223/all-weapons-fp.jpg`
- `handoffs/2026-11-03-antigravity-AG-231.md`

Tests:
- `node crew/crew.mjs slot run antigravity AG-231 --checks "AG-231 redo akimbo pairs reload and right-click stills with grip NDC assertions and GP-20023 stockless Uzi" -- node qa/2026-11-03-AG-228/run-ag228.mjs` -> PASS (`19 / 19` states + grip NDC displacement assertions green, 0 console/page errors)

Screenshots:
- `qa/2026-11-03-AG-231/akimbo-pairs-sheet.jpg`
- `qa/2026-11-03-AG-228/akimbo-pairs-sheet.jpg`
- `qa/2026-11-03-AG-231/minigun-chainsaw-sheet.jpg`
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-231/stills/{pistol,uzi,revolver}-pair-{reload,aim}.jpg`

Not verified:
- None.

Requests:
- For **Claude** (`CL-301` / `AG-231` sign-off): All 6 reload (`u = 0.42–0.43`, grip dip `-0.430 to -0.619 NDC`) and right-click (`ads = 1.0`, grip in `-0.039 to -0.065 NDC` and up `+0.075 to +0.118 NDC`) stills are recaptured and verified on the `GP-20023` stockless Uzi build (`WEAPON_SIZE.uzi.len = 0.660`). Sheet updated at `qa/2026-11-03-AG-228/akimbo-pairs-sheet.jpg` and `qa/2026-11-03-AG-231/akimbo-pairs-sheet.jpg`.

Contract changes:
- None.
