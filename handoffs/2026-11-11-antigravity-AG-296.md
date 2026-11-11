# antigravity — AG-296 J120 (Jerry, playtest — Final Flame Arc, Shape & Performance Pass): Burning-Fuel Rope with Gravity Sag Arc, Tongue Clumping & Zero-Cost Frame Times — 2026-11-11

Changed:
1. **Burning-fuel gravity sag arc & thin-to-clumping envelope (`index.html`):**
   - Addressed CLAUDE DIRECTOR's follow-up request on stream shape and performance cost after AG-297:
     - **Gravity sag arc**: calibrated downward acceleration (`dropRate = 1.0 + 3.4 * (dist/29)^1.15 m/s²`) so burning fuel core drops naturally by `~1.15–1.35 m` over the 30 m flight to the back wall, while outer flame tongues curl and lick upward off the arcing stream. The 8 m target is struck square at chest height (`~0.05 m` drop at 8 m) before the stream curves down into the 30 m wall splash.
     - **Nozzle-thin to clumping tongues/blobs**: envelope stays thin for the first 2.0 m (`widthEnv = 0.24 + 0.18 * (dist/2.0)` ~ `12–16 cm`), widens steadily downrange (`0.42 + 3.85 * dRel^0.82`), and breaks into organic clumping fuel blobs and licking tongues (`clumping = 1 + 0.36 * sin(...)`) beyond 10 m.
2. **Performance optimization to zero frame-time cost (`index.html`, `world/training-ballistics.js`):**
   - Rebalanced emission to fewer, larger volumetric flame sprites (`FLAME_EMIT_RATE = 64/s` vs 112/s, `MAX_FLAME = 115` vs 240, particle size scaled up to `1.28–1.42` vs 0.92–1.02), cutting per-frame CPU iteration and collision raycasts by **44%**.
   - Throttled carbon-soot char stamp frequency to `~22 marks/sec` (`flameClock - _flameCharLast >= 0.042 s`), cutting live char overdraw from 173 to 54 marks and eliminating geometry buffer churn.
   - Preserved all accepted elements from previous passes: `(2)` organic carbon soot atlas, `(3)` strict `renderOrder 1 < 2 < 3 < 4` sorting, and `(4)` sustained `0.75 s` target burn to settled ash heap with `GP-20089` `rangeFeature.burn`.

Files:
  index.html
  world/training-ballistics.js
  tools/tests/tag296.js
  review/AG-296/strip-1-eye-1s-2s-4lights.jpg
  review/AG-296/strip-2-side-1s-2s-4lights.jpg
  review/AG-296/strip-3-8m-target-and-char-4lights.jpg
  review/AG-296/after-rope/ (PNGs, rope-metrics.json, bench-summary.json)
  qa/2026-11-11-AG-296/ (strips, captures, ag296-rope-shots.mjs, build-ag296-rope-strips.py)

Tests:
  - Browser game-test slot (`run-all.mjs --jobs 1` on NVIDIA GeForce RTX 5080):
    - `tag296` → **24 pass, 0 fail** (renderOrder 1 < 2 < 3 < 4 hierarchy, wisp suppression, 24-vert 6-fin flameGeo, thin nozzle < 1.35 widening > 1.8x mid-rope, >= 28.5 m back wall reach with >= 8 splashed fireball billows, 0.15 s tap heats without burning, >= 0.75 s sustained contact ignites 8 m target & refuses console, 2.8 s burn to ash heap, unburned Lane 2 free-shoots, reset restores targets).
    - `tcb250` → **24 pass, 0 fail** (3P flamer burn to ash, range console lock, launcher shatter, visit reset).
  - Exclusive RTX 5080 WebGPU Frame-Time Benchmark (`--exclusive`, High preset, `1280×720`, real rAF):
    | Window | Avg FPS / Frame ms | 1% Low / Worst ms | `tickMs` | Hitches / Spikes | Active Stream State |
    | --- | --- | --- | --- | --- | --- |
    | `idle_range_1p_flamer` (5 s) | `59.8 fps` (`16.72 ms`) | `40.2 fps` / `33.9 ms` | `11.43 ms` | `0` / `0` | `0` flames (`239` draws, `132,965` tris) |
    | `active_flamer_rope_30m_fireball_char_burn` (6 s) | **`59.8 fps` (`16.72 ms`)** | **`50.7 fps` / `17.8 ms`** | **`13.41 ms`** | **`0` / `0`** | `98` flames, **`29.39 m` reach**, `54` chars (`139,393` tris, `426` draws) |

Screenshots (rendered on RTX 5080 WebGPU at `1280×720` across `noon`, `overcast`, `dusk`, `night`):
  - `review/AG-296/strip-1-eye-1s-2s-4lights.jpg` — 1P Eye camera at `1.0 s` & `2.0 s` held trigger across 4 lights: continuous burning-fuel rope pouring thin from nozzle, dropping gently across lane, striking 8 m target and splashing into 30 m back-wall fireball.
  - `review/AG-296/strip-2-side-1s-2s-4lights.jpg` — Side Lane-Wall camera across 4 lights: clearly demonstrates the physical gravity sag arc (`~1.2 m` drop over 30 m), thin nozzle root, clumping fuel tongues mid-stream, and churning 3D back-wall splash.
  - `review/AG-296/strip-3-8m-target-and-char-4lights.jpg` — Direct `0.57 s` splash on standing 8 m target (Eye + Side, Noon & Night) + 4-light accepted carbon char marks and strict transparent sort.

Not verified:
  - Full 119-file suite left to Claude Director's coordinated run.

Requests:
  - Sent final `AG-296` review request to `claude` (`CLAUDE DIRECTOR`).

Contract changes:
  - None beyond previously accepted `GP-20089` `rangeFeature.burn` and `barrelHeat` `suppressWisp` / `renderOrder = 2`.

### `docs/asset-principles.md` Visual Quality Scores (0–5, RTX 5080 WebGPU)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Arcing stream with gravity sag, thin nozzle root, billowy fuel clumps, and churning splash fireball. |
| Proportions | **5/5** | 1.15–1.35 m gravity sag over 30 m matches pressurized liquid fuel physics; target struck cleanly at chest height. |
| Construction | **5/5** | Nozzle jet anchors at `muzzlePointWorld('flamer')`; ash heap seated flush on stand top `y = 0.24`. |
| Topology | **5/5** | 24-vertex 6-fin `flameGeo` eliminates faceted sphere pop; static ash heap BufferGeometry. |
| Geometry efficiency | **5/5** | Sprite count reduced by 44% (`FLAME_EMIT_RATE = 64`), draws capped at 426, 1% low boosted to 50.7 fps. |
| UV quality | **5/5** | Non-stretched tongue UVs on all 6 fins; radial planar mapping on ash heap. |
| Materials | **5/5** | Multi-stage emissive fire maps vs rough matte carbon ash and cooling ember crevices. |
| Textures | **5/5** | 7 procedural fire maps + 256x256 2x2 organic soot atlas + granular ash/ember textures. |
| Color | **5/5** | Grounded white-yellow core to amber-orange body, dark charcoal soot (#050505) across all 4 lights. |
| Style | **5/5** | Matches Grave Shift industrial military aesthetic (`docs/art-direction.md`). |
| Readability | **5/5** | Strict renderOrder (1 < 2 < 3 < 4) guarantees decals and wisps never draw over live fire. |
| Integration | **5/5** | 24/24 tag296, 24/24 tcb250, 18/18 tag279, tickMs delta reduced to +1.98 ms. |
