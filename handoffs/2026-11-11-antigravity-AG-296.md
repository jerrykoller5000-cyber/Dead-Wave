# antigravity — AG-296 J120 (Jerry, playtest — Return Item 1): Pressurized burning-fuel rope to 8 m target & 30 m back-wall fireball — 2026-11-11

Changed:
1. **Pressurized burning-fuel rope reaching the 8 m target & 30 m back wall (`index.html` lines `~55220–55880`):**
   - Addressed CLAUDE DIRECTOR's `06:21Z` return on `(1)` while keeping accepted `(2)` organic carbon char (`world/training-ballistics.js`), `(3)` strict `renderOrder 1 < 2 < 3 < 4` decal/wisp sorting (`game/barrel-heat.js`), and `(4)` `0.75 s` sustained-hit target burn to vertex-colored multi-mound ash heap (`combat/training-wreck.js` + `GP-20089` `rangeFeature.burn`) untouched.
   - Tuned pressurized liquid-fuel stream (`FLAME_EMIT_RATE = 112/s`, `FLAME_SPEED = 37.0`, `FLAME_DRAG = 0.46`, `MAX_FLAME = 240`) with high-frequency golden-angle nozzle jetting + coherent helical rope curl (`stepFlameBlob`) and gentle liquid-fuel gravity sag (`~0.35–0.45 m` drop across the lane before wall splash), reaching the `8 m` target (`~0.20 s`) and the `30 m` back wall (`maxRelZ = 29.35–29.54 m` across all 4 lights).
   - Shaped the rope envelope (`widthEnv = 0.60 + 3.55 * distFrac^0.78`) and nozzle root (`_nozzleJet` stepped `+0.34 m` along `dir` to clear 1P `VM.depth`, saturated crimson-amber rim on `core`/`hot` palettes so bright Noon/Overcast tiles never wash out the nozzle tongue, plus diagonally canted `flameGeo` cross-rosette fins) so fuel visibly leaves the 1P & 3P nozzle thin (`~12 cm`), widens & curls downrange, and splashes into a compact, churning 3D fireball (`38–48` tumbling billows + dynamic pool light) on both the `8 m` target and the `30 m` back wall.
   - Fixed two engine bugs exposed by 1P + Side camera verification and `tcb250`:
     - Guarded `viewFlame` with `viewFirst && !shotView` so detached `shotView` cameras never emit viewmodel flame blobs at the detached camera lens.
     - Aligned 3P ground-cursor flamethrower aim (`!viewFlame && aimKind !== 'body'`) to `+1.05 m` chest height above `weaponAimPoint()` (matching `AIM_CHEST` for direct-fire weapons) so hosing forward in 3P sends a level rope through `0.66 m`-high range target stands instead of diving toward `y = 0` floor coordinates.
2. **Accepted items `(2)–(4)` preserved intact:**
   - `(2)` `world/training-ballistics.js` `createTrainingChar` (`256×256` `2×2` organic soot atlas, deduplicated batches).
   - `(3)` `game/barrel-heat.js` (`renderOrder = 2`, `suppressWisp` while firing flamer) < flames (`renderOrder = 3`) < instanced embers & target burn (`renderOrder = 4`).
   - `(4)` `combat/training-wreck.js` `buildAshHeapGeometry` (multi-mound charcoal/grey ash heap on stand at `y = 0.24`, unburned lanes free-shoot normally, `GP-20089` `rangeFeature.burn` wired).

Files:
  index.html
  world/training-ballistics.js
  combat/training-wreck.js
  game/barrel-heat.js
  tools/tests/tag296.js
  review/AG-296/strip-1-eye-1s-2s-4lights.jpg
  review/AG-296/strip-2-side-1s-2s-4lights.jpg
  review/AG-296/strip-3-8m-target-and-char-4lights.jpg
  review/AG-296/before-rope/ (20 PNGs + rope-metrics.json)
  review/AG-296/after-rope/ (20 PNGs + rope-metrics.json + bench-summary.json)
  qa/2026-11-11-AG-296/ (before-rope/, after-rope/, strips, ag296-rope-shots.mjs, build-ag296-rope-strips.py)

Tests:
  - Browser game-test slot (`run-all.mjs --jobs 1` on NVIDIA GeForce RTX 5080):
    - `tag296` → **24 pass, 0 fail** (renderOrder 1 < 2 < 3 < 4 hierarchy, wisp suppression while firing, 24-vertex 6-fin UV `flameGeo`, procedural multi-tongue `CanvasTexture`, thin nozzle width `< 1.35` widening `> 1.8x` mid-rope, `>= 28.5 m` back-wall reach with `>= 8` splashed fireball billows, `0.15 s` brief tap heats without burning, `>= 0.75 s` sustained rope contact ignites `8 m` target & refuses range console, `2.8 s` burn to ash heap at `y = 0.24`, unburned Lane 2 free-shoots, visit reset restores all 5 targets, `0` page errors).
    - `tcb250` → **24 pass, 0 fail** (3P flamer burn to ash, range console lock, launcher shatter, visit reset).
    - `tag279` → **18 pass, 0 fail** (bullet holes & wear regression).
  - Exclusive RTX 5080 WebGPU Frame-Time Benchmark (`--exclusive`, High preset, `1280×720`, real rAF):
    | Window | Avg FPS / Frame ms | 1% Low / Worst ms | `tickMs` | Hitches / Spikes | Active Stream State |
    | --- | --- | --- | --- | --- | --- |
    | `idle_range_1p_flamer` (5 s) | `59.6 fps` (`16.78 ms`) | `43.6 fps` / `18.5 ms` | `11.41 ms` | `0` / `0` | `0` flames (`239` draws, `132,965` tris) |
    | `active_flamer_rope_30m_fireball_char_burn` (6 s) | **`57.7 fps` (`17.33 ms`)** | **`41.2 fps` / `21.0 ms`** | **`15.84 ms`** | **`0` / `0`** | `175` flames, **`29.44 m` reach**, `173` chars (`141,629` tris) |

Screenshots (all rendered on RTX 5080 WebGPU at `1280×720` and multimodally inspected across `noon`, `overcast`, `dusk`, `night`, exact same Eye & Side lane-wall cameras Before vs After):
  - `review/AG-296/strip-1-eye-1s-2s-4lights.jpg` — 1P Eye camera at `1.0 s` & `2.0 s` held trigger across Noon / Overcast / Dusk / Night (`BEFORE 7.2–9.05 m` burst vs `AFTER 29.35–29.54 m` continuous burning-fuel rope pouring thin from the nozzle, engulfing the `8 m` target, and splashing into the `30 m` back-wall fireball).
  - `review/AG-296/strip-2-side-1s-2s-4lights.jpg` — Side Lane-Wall camera (`x = O.x - 7.25` looking straight across the lane) at `1.0 s` & `2.0 s` held trigger across Noon / Overcast / Dusk / Night: clearly shows the unbroken rope leaving the nozzle thin, widening, curling, dropping slightly across the lane, igniting the `8 m` target, and splashing into a rising 3D fireball on the `30 m` back wall.
  - `review/AG-296/strip-3-8m-target-and-char-4lights.jpg` — Direct `0.57 s` splash on the standing `8 m` target (Eye + Side, Noon & Night, Before vs After) + 4-light accepted carbon char & `renderOrder` sorting row.

Not verified:
  - Full 119-file suite (`npm test`) left to Claude's coordinated integration run per standing rule 7.

Requests:
  - Sent `AG-296 (1)` re-review request to `claude` (`CLAUDE DIRECTOR`).

Contract changes:
  - None beyond previously accepted `GP-20089` `rangeFeature?.burn` wiring and `barrelHeat` `suppressWisp` / `renderOrder = 2`.
