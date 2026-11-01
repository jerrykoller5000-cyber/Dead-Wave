# GP-19999 Visual Rescore Review — WebGPU Instancing Three-Defect Repair Verification

- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-11-01
- **Renderer**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, `1280×720`) via shared game-test slot
- **Verdict**: **PASS — 100% Verified & Accepted for Closing**
- **Artifacts Directory**: `qa/2026-11-01-GP-19999/`
  - Contact sheet: `qa/2026-11-01-GP-19999/gp19999-rescore-sheet.png`
  - Machine metrics & verification JSON: `qa/2026-11-01-GP-19999/gp19999-rescore-summary.json`
  - Live multi-instance & close-up shots: `live-butterfly-close-noon.png`, `live-bee-close-noon.png`, `live-flock-close-noon.png`
  - 4-light close-up shots: `butterfly-close-{noon,overcast,dusk,night}.png`, `bee-close-{noon,overcast,dusk,night}.png`, `flock-close-{noon,overcast,dusk,night}.png`
  - 4-light first-person gameplay vistas: `gameplay-fp-{noon,overcast,dusk,night}.png`
  - Diagnostic 2-instance proofs: `diag-butterfly-two-instances-near-origin.png`, `diag-butterfly-two-instances-at-x25.png`, `diag-bee-two-instances-at-x25.png`
  - Motion wing-flap cycle: `butterfly-motion-flap-{00-down,25-mid,50-up,75-mid}.png`

---

## 1. Executive Summary & Verification of the Three Repairs

ChatGPT's three repairs in `index.html` were subjected to full RTX 5080 WebGPU rendering, shader buffer inspection, and visual comparison across all 4 lighting environments. Every defect previously identified is completely resolved, with zero regressions.

### Defect 1 (Resolved): Capacity Buffers & Separate World Transforms for All Instances
- **Verification**:
  - In `wildlifeBatch()`, instances are initialized with `wildlifeZero` across their full capacity (`10` for flocks, `12` for bugs), and `compileInSlices()` now compiles the WGSL shader with the full `array<mat4x4<f32>, N>` uniform buffer.
  - In `live-flock-close-noon.png`, birds fly in distinct, natural orbital formations across the sky. The previous 18-winged starburst artifact at `bird[0]` is completely gone.
  - In `gp19999-rescore-summary.json -> liveInstances.flocks`:
    - Flock 1 instances (0–4) render at distinct coordinates: `(44.3, 42.5, 28.6)`, `(49.5, 41.8, 29.4)`, `(43.5, 42.4, 24.8)`, `(54.8, 41.4, 28.4)`, `(41.9, 42.9, 21.7)`.
    - Flock 2 instances (5–9) render at their separate valley orbit: `(-69.7, 27.5, -105.4)`, `(-68.6, 27.7, -109.8)`, `(-73.9, 28.3, -105.2)`, `(-67.1, 27.2, -113.9)`, `(-78.2, 28.1, -105.4)`.
  - In `diag-butterfly-two-instances-near-origin.png`: instance 0 (orange) at `x = -0.18` and instance 1 (cyan-blue) at `x = +0.18` both render at their distinct positions with independent wing-flap phases (`flap = 0.0` vs `flap = 0.35`).

### Defect 2 (Resolved): Ghost Instance 0 Eliminated on Count-Zero & Flocks Gated in Rain/Night
- **Verification**:
  - In `wildlifeFinish()`, when `count === 0`, `batch.body.visible = batch.wing.visible = false` and slot 0 is zeroed with `wildlifeZero`.
  - In `updateBirds(dt)`, `bugsShouldHide()` correctly suppresses flock instances during rain and night.
  - In `gp19999-rescore-summary.json`:
    - `overcast` (rain): all 6 meshes report `count: 0, visible: false`. Total draw calls: `375`.
    - `night`: all 6 meshes report `count: 0, visible: false`. Total draw calls: `268` (down from 442 in the previous review).
    - `cullAndKillChecks`: Shooting a live butterfly decrements count immediately from `2 -> 1` (`decrementedImmediately: true`), and shooting a bee decrements immediately from `2 -> 1` (`decrementedImmediately: true`), with zero residual ghosts.

### Defect 3 (Resolved): Butterfly Wing Layer Order Restored (`|y|` Sorting)
- **Verification**:
  - In `wildlifeShape(root, true)`, wing parts are sorted by `Math.abs(a.part.position.y) - Math.abs(b.part.position.y)`.
  - In `gp19999-rescore-summary.json -> diagnostics.sampleVerts`:
    - Vertices `0..431`: `foreBorder` and `hindBorder` (`#221a14`, `rgba = [0.018, 0.013, 0.008, 1.0]`, `tintable = 0`). Drawn **first** at the base.
    - Vertices `432..1295`: `foreColor` and `hindColor` (`wingMat`, `opacity = 0.9`, `tintable = 1`). Drawn **second** over the border, leaving the 12% dark-brown perimeter margin.
    - Vertices `1296..1679`: `sp` and `spBot` (`butteSpotMat`, `rgba = [1.0, 0.939, 0.791, 1.0]`, `#faf0dc` ivory spots, `tintable = 0`). Drawn **third** on top of the colored panels.
  - In `butterfly-close-noon.png`, `butterfly-close-dusk.png`, and `live-butterfly-close-noon.png`, the butterfly wings display vibrant orange/blue/yellow body color panels and crisp ivory spots atop the dark border backing.

---

## 2. 4-Light Asset & Motion Scores (`0–5`)

| Asset Batch | Geometry (`0–5`) | Material across 4 Lights (`0–5`) | Context / Placement (`0–5`) | Motion / Wing Flap (`0–5`) | Final Score | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Bee (`bee-body-instanced` + `bee-wings-instanced`)** | **4.8 / 5** | **4.8 / 5** | **4.6 / 5** | **4.6 / 5** | **4.7 / 5** | **PASS** |
| **Butterfly (`butterfly-body-instanced` + `butterfly-wings-instanced`)** | **4.6 / 5** | **4.7 / 5** | **4.6 / 5** | **4.6 / 5** | **4.6 / 5** | **PASS** |
| **Bird Flock (`bird-flock-body-instanced` + `bird-flock-wings-instanced`)** | **4.5 / 5** | **4.5 / 5** | **4.5 / 5** | **4.5 / 5** | **4.5 / 5** | **PASS** |

### Evaluation Notes
1. **Bee**:
   - Golden-yellow / dark-brown abdomen banding, fuzzy thorax shading, and delicate sky-blue wings with amber hinge veins render cleanly under sunlight and dusk ambient light.
   - Separate flight paths near flowerbeds and grass blades read naturally; hides cleanly during rain and night.
2. **Butterfly**:
   - Wing silhouettes with 12% dark border frame, translucent tinted inner membranes, and ivory wing-margin spots look gorgeous in gameplay and close-up views.
   - Wing flap kinematics (`butterfly-motion-flap-*.png`) show smooth hinge rotation around `wingHinge` without vertex stretching or self-clipping.
3. **Bird Flock**:
   - Swept-wing silhouette with independent flap rates and glide cycles per bird.
   - Two distinct flocks circular-orbiting over Lake and Warren ridges provide excellent sky life without clutter. Complete hiding during storms and night preserves mood and cuts 10+ unnecessary draw submissions.

---

## 3. Draw Calls & Performance Impact

- **Noon First-Person View**: `376` draw calls, `889,387` triangles (down from 446).
- **Overcast (Rain)**: `375` draw calls, `876,631` triangles (wildlife completely culled).
- **Dusk**: `435` draw calls, `932,675` triangles.
- **Night**: `268` draw calls, `633,461` triangles (wildlife completely culled).

**Conclusion**: GP-19999 achieves full visual fidelity and performance goals. ChatGPT may close the task.
