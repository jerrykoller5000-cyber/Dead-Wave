# antigravity — AG-296 J120 (Jerry, playtest): Flamethrower fire fidelity, black char marks, decal/wisp render sort, and sustained-hit target burn to ash — 2026-11-11

Changed:
1. **Higher-fidelity flamethrower stream (`index.html`, zero frame-time cost):**
   - Replaced uniform low-poly `IcosahedronGeometry(0.1, 1)` (80 tris / 42 verts of unmapped solid-color orange/dark spheres) with a **24-vertex / 12-triangle 6-fin volumetric flame tongue mesh (`flameGeo`)** (4 axial flame tongues + 2 canted cross-fins with UVs) and **7 procedural `128×128` multi-tongue `CanvasTexture` stages** (`core`, `hot`, `mid`, `tip`, `edge`, `smoke`, `steam`), keeping shared `flameCoreMat`/`flameHotMat`/`flameMat` untouched for campfires and the lighter.
   - Added a world-space pressurized white-hot **nozzle core jet (`_nozzleJet`, `renderOrder = 3`)** anchored to `muzzlePointWorld('flamer')`.
   - Replaced bulbous uniform sphere inflation (`0.9 + k * 5.2`) with a **coherent helical curling stream body** that swells mid-stream and **thins organically at its tips**, shedding rising thermal sparks (`emberMat`, `renderOrder = 4`) and arcing `heavyFuel` droplets (`28%`) that scorch the range floor.
   - Tuned Training Ground flamethrower reach (`FLAME_SPEED * 1.46`, `FLAME_DRAG * 0.74`) so firing from behind the clamped firing-line bench (`O.z - 0.24`) reaches ~12.3 m downrange (engulfing Lane 1 at 8 m and reaching Lane 2 at 12 m), while guarding the ~600-tree outdoor ignition loop behind `!training.active` (`w:rest` dropped from `1.95 ms` to `1.16 ms`).
   - Added `prepareFlameWarmup()` to `trainingWarmCompile` so all 7 flame stages + nozzle jet compile upfront (`newPipelines: 0` during active fire).
2. **Organic black carbon-soot char marks (`world/training-ballistics.js`):**
   - Upgraded `createTrainingChar` to a `256×256` `2×2` organic carbon-soot texture atlas (irregular soot core + radial turbulent lobes + fine ash speckles, `0x050505`), 256-mark capacity (still 1 draw call per surface/plate), 18-slot spatial deduplication (`mergeR2 = 0.058`) preventing dark quad overdraw spikes, `tg.onPlate` silhouette clipping, slow fade (`CHAR_LIFE = 30 s`, `CHAR_FADE = 6 s`), and `clearTarget(targetIndex)` when a target plate burns away.
3. **Strict render-order sorting (`game/barrel-heat.js`, `index.html`, `combat/training-wreck.js`):**
   - Enforced strict transparent depth/order hierarchy so nothing draws over live fire:
     - `renderOrder = 1`: Bullet-hole decals (`training-impacts`), range wear decals, and black char marks (`training-char`).
     - `renderOrder = 2`: Barrel-heat smoke wisps (`game/barrel-heat.js`, moved down from `4` to `2`), plus `suppressWisp: true` while actively firing the flamethrower so pale muzzle smoke only rises after releasing the trigger.
     - `renderOrder = 3`: Flamethrower stream (`flamePool`) and pressurized nozzle core jet (`_nozzleJet`).
     - `renderOrder = 4`: Rising thermal embers (`_moteInst(emberMat)`) and active target-burn flames (`combat/training-wreck.js`).
4. **Sustained-hit (`0.75 s`) target burn to realistic multi-mound ash heap (`2.8 s`) + GP-20089 range integration (`index.html`, `combat/training-wreck.js`):**
   - Added per-target thermal accumulation (`_targetFlameHeat`, `BURN_IGNITE_S = 0.75 s`, `_targetFlameGrace = 0.22 s`) so brief trigger sweeps scorch a target plate without wrecking it, while `>= 0.75 s` of sustained flame contact ignites the plate, calls `trainingHitTarget(ti, hitPt, 'flamer')` → `rangeFeature?.burn?.(index, { igniteS: 0.75, burnS: 2.8 })` (disabling the range computer / aborting active drills per ChatGPT's GP-20089), and burns the plate down over `BURN_S = 2.8 s` while scorching the floor around the stand.
   - Replaced the placeholder bright coral-orange 9-sided `ConeGeometry` (`0xe85a22` emissive) in `combat/training-wreck.js` with **`buildAshHeapGeometry(T)`**: a merged vertex-colored scorched soot apron + 4 slumped grey/charcoal ash mounds + 7 curled charred target fragments seated flush on the stand (`y = STAND_TOP = 0.24`), paired with granular `ashTex` + sparse pinpoint `emberTex` crevices that cool out completely over `3.2 s`.
   - Unburned targets continue to free-shoot normally (`t.burned` cleared on `restore()` / `reset()` when re-entering Training).

Files:
  index.html
  world/training-ballistics.js
  combat/training-wreck.js
  game/barrel-heat.js
  tools/tests/tag296.js
  review/AG-296/strip-1-stream-backwall-4lights.jpg
  review/AG-296/strip-2-char-marks-4lights.jpg
  review/AG-296/strip-3-target-burn-ash-4lights.jpg
  review/AG-296/strip-4-burn-and-ash-detail.jpg
  review/AG-296/before/ (16 PNGs + bench-summary.json)
  review/AG-296/after/ (16 PNGs + bench-summary.json)
  qa/2026-11-11-AG-296/ (before/, after/, 4 strips, ag296-capture-bench.mjs, build-ag296-strips.py)

Tests:
  - Browser game-test slot (`run-all.mjs --jobs 1` on NVIDIA GeForce RTX 5080):
    - `tag296` → **22 pass, 0 fail** (renderOrder 1 < 2 < 3 < 4 hierarchy, wisp suppression during active flamer stream, 24-vertex 6-fin UV flameGeo, procedural multi-tongue CanvasTexture, tip thinning envelope, deduplicated char marks, 0.18s brief sweep heats without burning, >=0.75s sustained hit ignites & refuses range console via GP-20089, 2.8s burn to vertex-colored ash heap at y=0.24, unburned Lane 2 free-shoots normally, visit reset clears `t.burned` & restores all 5 targets, 0 page errors).
    - `tag279` → **18 pass, 0 fail** (bullet holes & wear regression).
    - `tcb250` → **24 pass, 0 fail** (flamer burn + grenade launcher shatter regression).
  - Node unit tests (`node --test`):
    - `world/training-ballistics.test.mjs` → **6 pass, 0 fail**
    - `world/training.test.mjs` → **6 pass, 0 fail**
    - `world/training-wear.test.mjs` → **10 pass, 0 fail**
    - `ui/range.test.mjs` → **30 pass, 0 fail**
    - `ui/range-control.test.mjs` → **4 pass, 0 fail**
  - Exclusive RTX 5080 WebGPU Frame-Time Benchmark (`--exclusive`, High preset, `1280×720`, real rAF):
    | Window | Metric | BEFORE (Baseline) | AFTER (AG-296) | Delta |
    | --- | --- | --- | --- | --- |
    | `idle_range_1p_flamer` (5s) | Avg FPS / Frame ms | `60.0 fps` (`16.67 ms`) | `59.9 fps` (`16.69 ms`) | `0.0 ms` |
    | `idle_range_1p_flamer` (5s) | `tickMs` / New Pipelines | `9.55 ms` / `0` | `9.66 ms` / `0` | `+0.11 ms` / `0` |
    | `active_flamer_stream_char_burn` (6s) | Avg FPS / Frame ms | `60.0 fps` (`16.67 ms`) | **`60.0 fps` (`16.67 ms`)** | **`0.0 ms` (Zero cost)** |
    | `active_flamer_stream_char_burn` (6s) | **1% Low FPS / Worst ms** | `45.4 fps` / `22.7 ms` | **`54.3 fps` / `18.6 ms`** | **`+8.9 fps` / `-4.1 ms` faster** |
    | `active_flamer_stream_char_burn` (6s) | **`tickMs` / `w:rest`** | `12.71 ms` / `1.95 ms` | **`12.54 ms` / `1.16 ms`** | **`-0.17 ms` / `-0.79 ms` faster** |
    | `active_flamer_stream_char_burn` (6s) | **Runtime `newPipelines` / Hitches** | `1` / `0` | **`0` / `0`** | **`-1` pipeline stall** |
    | `active_flamer_stream_char_burn` (6s) | Triangles (84 flames, 170 chars) | `137,531` | **`138,289`** (flameGeo `-85%` tris/particle) | `+758` total scene tris |

Screenshots (all rendered on RTX 5080 WebGPU at `1280×720` and multimodally inspected across `noon`, `overcast`, `dusk`, `night`):
  - `review/AG-296/strip-1-stream-backwall-4lights.jpg` — Same-eye 4-light Before/After firing toward bullet-peppered back wall: cohesive white-gold-orange curling tongues + rising sparks; zero bullet holes or barrel wisps drawn over fire.
  - `review/AG-296/strip-2-char-marks-4lights.jpg` — Same-eye 4-light Before/After sweeping wall & floor: organic carbon-soot char marks on wall & floor fading naturally; live flames sort cleanly in front of char & bullet holes.
  - `review/AG-296/strip-3-target-burn-ash-4lights.jpg` — Same-eye 4-light Before/After post-burn from firing line: Lane 1 reduced to realistic charcoal/grey ash heap on stand; unburned Lane 2 shot with live round and folding normally.
  - `review/AG-296/strip-4-burn-and-ash-detail.jpg` — 2.2×–2.6× zoomed detail comparison of flame tips/wisp sort, carbon soot marks, active multi-tongue target burn, and close-up of settled multi-mound ash heap on stand (`y = 0.24`).

Not verified:
  - Full 119-file suite (`npm test`) left to Claude's coordinated integration run per standing rule 7.
  - Flamethrower hose/gauge/viewmodel rig untouched (Claude 3's `CC-342` lane).

Requests:
  - Sent review request to `claude` (`CLAUDE DIRECTOR`) for `AG-296` visual strips + `--review` contract items.

Contract changes:
  - Wired `index.html` `trainingHitTarget(..., 'flamer')` to ChatGPT's approved `GP-20089` `rangeFeature?.burn?.(index, { igniteS: 0.75, burnS: 2.8 })` on 0.75s sustained flame ignition.
  - Added optional `suppressWisp` boolean flag to `barrelHeat.update(state)` (`game/barrel-heat.js`) and lowered wisp `renderOrder` from `4` to `2` (`< 3`).

### `docs/asset-principles.md` Visual Quality Self-Scores (0–5, judged from RTX 5080 4-light eye strips & close-up)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Pressurized nozzle jet + licking/curling tongues + thinning tips; slumped multi-mound ash pile + curled plate shards immediately read as fire & burned residue rather than spheres or an orange cone. |
| Proportions | **5/5** | Stream core, tongue swell, spark scale, char mark radius (0.14–0.44m), and ash heap footprint (`0.68×0.52m` inside stand top) match range and target proportions. |
| Construction | **5/5** | Ash heap seats flush on `y = STAND_TOP = 0.24` with scorched base apron; nozzle jet anchors cleanly at `muzzlePointWorld('flamer')`. |
| Topology | **5/5** | 24-vertex 6-fin crossed-tongue `flameGeo` avoids camera-facing billboard pop while eliminating sphere facet silhouettes; ash heap merges apron + 4 mounds + 7 curled shards into 1 static `BufferGeometry`. |
| Geometry efficiency | **5/5** | `flameGeo` cuts per-particle triangles by **85%** (`80 → 12` tris); char marks stay a single batched `BufferGeometry` per surface (`draws` controlled, `+8.9 fps` higher 1% low). |
| UV quality | **4/5** | Dedicated `[0,1]` tongue UVs on all 6 fins and radial planar UVs on the ash heap eliminate stretching and clipping. |
| Materials | **5/5** | Additive multi-stage emissive fire stages (`core` → `hot` → `mid` → `tip` → `edge`) vs rough (`roughness: 0.97`, `metalness: 0.02`) matte carbon ash with cooling pinpoint ember crevices. |
| Textures | **5/5** | 7 procedural `128×128` multi-tongue fire/smoke maps + `256×256` `2×2` organic soot atlas + granular `128×128` ash/ember maps. |
| Color | **5/5** | Physically grounded white-yellow core → amber-orange body → deep red tips → dark charcoal soot (`#050505`) and cool grey/charcoal ash (`#141312`–`#5d5954`) across noon, overcast, dusk, and night. |
| Style | **5/5** | Matches Grave Shift's grounded military/industrial Training Ground material language (`docs/art-direction.md`). |
| Readability | **5/5** | Strict `renderOrder` (`1 < 2 < 3 < 4`) ensures decals and pale barrel smoke never cut across live fire; active burn vs settled ash vs unburned targets read unambiguously from the firing line. |
| Integration | **5/5** | Pre-warmed in `trainingWarmCompile` (`newPipelines: 0`), coordinated with `GP-20089` `rangeFeature.burn`, `tag296` 22/22, `tcb250` 24/24, `tag279` 18/18. |
