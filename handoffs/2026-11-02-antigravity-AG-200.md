Changed:
- Audited every mesh within `0.80 m` of the marine's feet (`feetCenter = [0, -199.95, -640.61]`) in the Training Ground across 8 poses (1P & 3P, standing, walking, aiming, unarmed & armed) on Jerry's RTX 5080 WebGPU PC, hooking `onBeforeRender` (`drawnInMainPass`) and inspecting all transformed vertices, `InstancedMesh` counts, and 1P downward camera views (`qa/2026-11-02-AG-200/report.md`, `qa/2026-11-02-AG-200/sheet.jpg`, `qa/2026-11-02-AG-200/probe-summary.json`).
- Identified the three exact causes (`qa/2026-11-02-AG-200/report.md`):
  1. **1P Downward View (`fp-pistol-standing-feet.jpg`, `fp-pistol-walking-feet.jpg`, `fp-pistol-aiming-feet.jpg` — Owner: Claude / ChatGPT)**:
     - In first person (`Digit5`), `syncFirstPersonHead()` (`index.html:50930-50934`) hides `headG`, leaving the closed 32-segment circular top cap of `fitted-uniform` (`studio/marine-body.js:307`, `form(..., 'fitted-uniform', 32)` with default `caps = 'both'`, radius `0.092 m × 0.079 m` at `y = 1.21 m`) surrounded by the 40-segment `blouse-collar` ring (`studio/marine-body.js:318-335`, `rx = 0.166..0.092 m` at `y = 1.15..1.25 m`) only `17–21 cm` directly below `FP_EYE` (`y = 1.425 m`).
     - Looking down toward his feet (`pitch = -1.45 rad`) projects this round camo neck-cap + collar ring straight into the center of the screen (`~550 px` wide, `ndc ≈ [0, 0]`) right between his feet, reading as a giant round camo sphere/bowl.
     - In addition, when `viewmodel` is active (`vmActive = true`), `setEyeHide()` (`game/viewmodel.js:128-137`) hides `armLG` and `armRG` but does **not** hide `live-sleeve-live` (`live-sleeve > live-sleeve-live > marine`), `torsoG`, or `marine-flexible-shirt` (`marine-waist-live > marine`).
  2. **WebGPU `InstancedMesh` `count = 0` Ghost Sphere (`rig.grenades`, `SphereGeometry(0.034, 10, 8)` — Owner: Claude)**:
     - In `vendor/three/three.webgpu.js:25579` (`RenderObject.getDrawParameters`), `const instanceCount = geometry.isInstancedBufferGeometry ? geometry.instanceCount : ( object.count > 1 ? object.count : 1 );` evaluates `object.count > 1 ? object.count : 1` to **`1`** when `object.count === 0`!
     - Because `applyCarryPlan` (`index.html:24067-24069`) sets `rig.grenades.count = 0` (`G×0` in Training Ground), `rig.boxes.count = 0`, and `rig.tanks.count = 0` while leaving `.visible = true`, WebGPU draws **1 ghost grenade sphere (`SphereGeometry(0.034, 10, 8)`, `MeshStandardMaterial#4b5434`, `drawnInMainPass = true`, mesh origin `[0, -199.997, -640.61]` between his feet, instance 0 at `[0.157, -199.307, -640.379]`, `dVert = 0.676 m`)**, 1 ammo box, and 1 flamer tank every frame. Setting `mesh.visible = count > 0` in `applyCarryPlan` fixes all 6 `carryInstanced` meshes.
  3. **`chapel-glow` Sphere (`SphereGeometry(0.62, 14, 10)`, `dVert = 0.258 m`) & `marine-idle-props` Spark Sphere (`SphereGeometry(0.016, 5, 4)`, `dVert = 0.0182 m`)**:
     - `chapel-glow` (`index.html:21262-21295`) stays `visible: true` at `opacity: 0` and is drawn every frame (`drawnInMainPass = true`).
     - `marine-idle-props` (`studio/marine-idle.js:35-56`) keeps `visible = false` in our clean 8-pose audit (`GP-19991`), but its 8 meshes (`spark` sphere at `dVert = 0.0182 m`, `lighter`, `cig`, `pack`) still sit at local `[0, 0, 0]` (`[0, -199.997, -640.61]`, `1.8 cm` from his feet) when hidden.

Files:
- `qa/2026-11-02-AG-200/report.md`
- `qa/2026-11-02-AG-200/sheet.jpg`
- `qa/2026-11-02-AG-200/probe-summary.json`
- `qa/2026-11-02-AG-200/audit-dump-utf8.txt`
- `qa/2026-11-02-AG-200/fp-unarmed-standing-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-standing-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-walking-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-aiming-feet.jpg`
- `qa/2026-11-02-AG-200/tp-standing-feet-closeup.jpg`
- `qa/2026-11-02-AG-200/tp-standing-live.jpg`
- `qa/2026-11-02-AG-200/tp-walking-feet-closeup.jpg`
- `qa/2026-11-02-AG-200/tp-aiming-feet-closeup.jpg`
- `handoffs/2026-11-02-antigravity-AG-200.md`

Tests:
- Ran live WebGPU scene-graph + `onBeforeRender` draw-call audit across 8 poses in the Training Ground (`qa/2026-11-02-AG-200/probe-summary.json`).
- Visually inspected `qa/2026-11-02-AG-200/sheet.jpg` and all 8 individual screenshots.

Screenshots:
- `qa/2026-11-02-AG-200/sheet.jpg`
- `qa/2026-11-02-AG-200/fp-unarmed-standing-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-standing-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-walking-feet.jpg`
- `qa/2026-11-02-AG-200/fp-pistol-aiming-feet.jpg`
- `qa/2026-11-02-AG-200/tp-standing-feet-closeup.jpg`
- `qa/2026-11-02-AG-200/tp-standing-live.jpg`
- `qa/2026-11-02-AG-200/tp-walking-feet-closeup.jpg`
- `qa/2026-11-02-AG-200/tp-aiming-feet-closeup.jpg`

Not verified:
- Diagnostic and visual QA task only; awaiting owner fix to re-verify from the same 8 poses.

Requests:
- Sent `AG-200` findings to `claude` and `chatgpt` for the fix, after which Antigravity will re-verify from the same 8 poses.

Contract changes:
- None.
