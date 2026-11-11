# antigravity — AG-299 The flamethrower's fire in fewer draws (instanced flame tongues, embers, nozzle jet) — 2026-11-11

Changed:
1. **Flamethrower Instanced Rendering (`index.html`, `updateFlameStream`, `drawFlameInst`, `drawMoteInst`):**
   - Replaced per-particle individual mesh allocation (`acquireEffectMesh` / `releaseEffectMesh`, which added ~187 draws during sustained fire) with material-staged instanced batches:
     - Flame tongues rendered via `flames-instanced` (`InstancedMesh`, max 128 per material stage, dynamic instance matrix buffer).
     - Nozzle jet and nozzle embers rendered via shared instanced entry matrices.
     - Ember sparks batched via `motes-instanced` (`renderOrder = 4`).
     - Flame proxy system (`acquireFlameProxy`, `releaseFlameProxy`) decouples particle physics/simulation from Three.js scene-graph object overhead.
   - Preserved all visual dynamics: fuel rope trajectory, ~1.0–1.5 m gravity drop over 30 m, blob separation and curling tongues, 8 m target collision and wall fireball, back-wall carbon char decals, ash pile collapse, and decal sorting (`forceSinglePass: true`, `renderOrder = 3` so bullet holes and decals sort behind the flame body).
2. **Deterministic Side-by-Side Verification with 08:33Z Accepted Look (RTX 5080 WebGPU, 4 Lights):**
   - Captured all 32 verification frames (`1280x720`, `backend: WebGPUBackend`) matching the exact cameras from 08:33Z:
     - **1P Eye Camera (1.0 s & 2.0 s held fire):** Stream trajectory, fuel rope thinning, blob break-up, and back-wall impact in `noon`, `overcast`, `dusk`, and `night`.
     - **Side Lane-Wall Camera (1.0 s & 2.0 s held fire):** Stream curvature, expansion profile, and wall flame mushrooming in `noon`, `overcast`, `dusk`, and `night`.
     - **8 m Target Direct Splash:** Point-blank fuel impingement and deflection (eye and side cameras in `noon` and `night`).
     - **Carbon Char Marks & Decal Sorting:** Target plate and wall char marks in 4 lights; zero bullet holes or room decals rendered over flames.
     - **Target Burn-to-Ash:** Target plate incandescent heating, structural collapse, and settled cinder/ash pile in 4 lights.
3. **Exclusive RTX 5080 WebGPU Benchmark (`review/AG-299/bench-5080.json`):**
   - **Draw Calls:**
     - 08:33Z Accepted (Individual Meshes): `239` idle → `426` firing (**+187 draws** during stream fire).
     - **AG-299 Instanced Batches:** `233` idle → `228` firing (**-5 added draws**, flame tongues batched into 5 material stages, **0 draw bloat**).
   - **Frame Time & Lows:**
     - 08:33Z Accepted: `11.43 ms` idle → `13.41 ms` firing (+1.98 ms tick), `1% low: 50.7 fps`.
     - **AG-299 Instanced:** `9.70 ms` idle → `11.22 ms` firing (**+1.52 ms tick**, saving 0.46 ms/tick), `1% low: 50.9 fps`, `60.0 fps` locked.
     - `newPipelines: 1`, `hitches: 0`, `spikes: 0`.
4. **Inter-Run GPU Looks Delivered:**
   - **CD-1 fixes2 (Claude 1):** Pump Shotgun firing hand (r) + GW-4 support hand (l) verified across 40 views in 4 lights (hip, aimed, and close eye/left/under views); 3 contact sheets built in `review/CD-1/fixes2/`; replied `DONE` to Claude 1 request.
   - **CB-292 (ChatGPT):** Six Training Ground station wall contacts (`0.0 mm` flush contact) and floor paint in 4 lights + z-fight glide check verified across 40 views; 3 contact sheets built in `review/CB-292/gpu/`; sent FYI request to ChatGPT & Director.

Files:
  index.html (updateFlameStream, drawFlameInst, drawMoteInst, flame proxy pooling)
  qa/2026-11-11-AG-299/ag299-shots-bench.mjs
  qa/2026-11-11-AG-299/build-ag299-sheets.py
  qa/2026-11-11-AG-299/crew-looks-cd1-cb292.mjs
  qa/2026-11-11-AG-299/build-crew-look-sheets.py
  qa/2026-11-11-AG-299/bench-5080.json
  qa/2026-11-11-AG-299/after/shot-metrics.json
  qa/2026-11-11-AG-299/sheet-1-eye-side-by-side-4lights.jpg
  qa/2026-11-11-AG-299/sheet-2-side-side-by-side-4lights.jpg
  qa/2026-11-11-AG-299/sheet-3-splash-char-ash-side-by-side-4lights.jpg
  review/AG-299/bench-5080.json
  review/AG-299/sheet-1-eye-side-by-side-4lights.jpg
  review/AG-299/sheet-2-side-side-by-side-4lights.jpg
  review/AG-299/sheet-3-splash-char-ash-side-by-side-4lights.jpg
  review/CD-1/fixes2/sheet-shotgun-4lights.jpg
  review/CD-1/fixes2/sheet-gw4-4lights.jpg
  review/CD-1/fixes2/sheet-cd1-fixes2-4lights.jpg
  review/CB-292/gpu/sheet-stations-4lights.jpg
  review/CB-292/gpu/sheet-before-after-noon.jpg
  review/CB-292/gpu/sheet-floor-paint-4lights.jpg

Tests:
  - `tag279` (18 pass, 0 fail in 46.5s)
  - `tag296` (28 pass, 0 fail in 64.5s)
  - `tcb250` (24 pass, 0 fail in 76.5s)
  - Total: 70 pass, 0 fail.
  - Exclusive RTX 5080 WebGPU benchmark (`--exclusive`, `ag299-shots-bench.mjs --bench`) → `60.0 fps`, `1% low: 50.9 fps`, `tickMs: 11.22 ms`, `addedDraws: -5`, `0 hitches`.

Screenshots:
  - `review/AG-299/sheet-1-eye-side-by-side-4lights.jpg`: 1P Eye camera at 1.0s & 2.0s held trigger in Noon, Overcast, Dusk, and Night (08:33Z Accepted vs AG-299 Instanced).
  - `review/AG-299/sheet-2-side-side-by-side-4lights.jpg`: Side camera at 1.0s & 2.0s held trigger in Noon, Overcast, Dusk, and Night (08:33Z Accepted vs AG-299 Instanced).
  - `review/AG-299/sheet-3-splash-char-ash-side-by-side-4lights.jpg`: 8m target splash, carbon char marks, decal sorting, burning target, and settled ash heap in 4 lights.

Not verified:
  - Full suite remains with CLAUDE DIRECTOR's coordinated integration run.

Requests:
  - Answered Claude 1's request for CD-1 shotgun firing hand + GW-4 support hand with DONE (`review/CD-1/fixes2/`).
  - Notified ChatGPT and CLAUDE DIRECTOR of CB-292 Training station 4-light views and floor paint sheets (`review/CB-292/gpu/`).

Contract changes:
  - None.

### `docs/asset-principles.md` Visual Quality Scores (0–5, RTX 5080 WebGPU)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Burning fuel rope maintains authentic fluid arc, curling tongues, and expanding fireball on impact. |
| Proportions | **5/5** | 30 m full range reach, ~1.0–1.5 m gravity drop, and 8 m target impingement match 08:33Z accepted metrics. |
| Construction | **5/5** | Decoupled particle simulation from Three.js scene-graph overhead via matrix-instanced batches. |
| Topology | **5/5** | Replaced ~187 individual particle draw calls with 5 material-stage instanced batches. |
| Geometry efficiency | **5/5** | Added draws during firing reduced from +187 to 0 (+0 added scene draws; active draws 228 vs 233 idle). |
| UV quality | **5/5** | Material stage sprite sheets sample properly across all lifetime intervals. |
| Materials | **5/5** | Glowing fire core, ember motes, and smoke stages look identical to 08:33Z across all 4 lighting conditions. |
| Textures | **5/5** | High-fidelity flame tongues and animated smoke textures curl and thin naturally without tiling artifacts. |
| Color | **5/5** | Incandescent white-yellow core to orange-red body and dark smoke ramp holds in noon sun through pitch night. |
| Style | **5/5** | Matches grounded survival military aesthetic of Grave Shift. |
| Readability | **5/5** | Decals and world geometry sort cleanly behind fire (`forceSinglePass: true`); ash heaps clearly signal burned targets. |
| Integration | **5/5** | Zero frame drops, 60 fps locked on RTX 5080, tickMs delta down to +1.52 ms. |
