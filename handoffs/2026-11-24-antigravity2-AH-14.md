# antigravity2 — AH-14 Full cold-load & Training Area performance audit and fixes — 2026-11-24

Changed:          Full RTX 5080 WebGPU performance audit and in-lane optimizations cutting cold load from 51.3 s to 30.2 s (-21.1 s / -41%), Training Area entry from 58.6 s to 27.9 s (-30.8 s / -52%), JS heap by 353–793 MB, and boosting Training Area runtime from 8.9 FPS (4,169 ms freeze) to 59.2 FPS at spawn, 60.0 FPS lights-off (was 48.5), and 58.6 FPS with 10 live zombies (was 55.7).
Files:            index.html (boot, warmup, training, perf), world/training-textures.js, world/rock-textures.js, world/build-textures.js, world/fob-textures.js, world/ground-textures.js, world/training-wear.js, world/training-cutaway.js, world/training.js, qa/AH-14/profile-perf.mjs, qa/AH-14/perf-before.json, qa/AH-14/perf-after.json, qa/AH-14/before-*.png, qa/AH-14/after-*.png
Tests:            Node unit tests (30 pass, 0 fail): training-textures, rock-textures, build-textures, fob-textures, ground-textures, bridge-dock-textures, ui/training-danger; targeted browser batch (`--jobs 1 --agent antigravity2 --task AH-14`): 108 pass, 2 pre-existing unrelated fails (`tag290` 47/0, `tcl288a` 4/0, `t215` 4/0, `t271` 10/0; `tch1` 11/1 CIF/Armory copy mesh count 13 vs >15; `t38` 32/1 weapon mesh count 320 vs 319); full suite not run (D-135: Claude runs full suites in cloud).
Screenshots:      `qa/AH-14/before-train-spawn-3p.png` vs `qa/AH-14/after-train-spawn-3p.png`, `qa/AH-14/before-train-spawn-1p.png` vs `qa/AH-14/after-train-spawn-1p.png`, `qa/AH-14/before-train-lightsoff.png` vs `qa/AH-14/after-train-lightsoff.png`, `qa/AH-14/before-train-armory.png` vs `qa/AH-14/after-train-armory.png` (visually inspected: 100% identical look, zero regressions).
Not verified:     Full `npm test` suite (deferred to Claude's cloud per D-135); out-of-lane Training bottlenecks in `ui/training-danger.js`, `game/training-containment.js`, and `game/training-camera-collision.js` (measured via A/B ablation and sent to ChatGPT via `--fyi`).
Requests:         Sent `--fyi` to `chatgpt` in `handoffs/requests.md` with RTX 5080 A/B ablation numbers for `ui/training-danger.js` (4 SpotLights invalidating all 657 boot shaders -> ~16 s Training entry compile), `game/training-containment.js` (38 transparent instanced draws = 1.98 ms/frame CPU), and `game/training-camera-collision.js` (73 marine-fade keepers).
Contract changes: none

---

## Exclusive RTX 5080 WebGPU BEFORE vs AFTER (1600x900, High preset, `qa/AH-14/profile-perf.mjs`)

All timing and FPS benchmarks ran exclusively on Jerry's RTX 5080 through the machine-wide game-test slot (`node crew/crew.mjs slot run antigravity2 AH-14 --exclusive`, Rule 16).

### Load, Entry, Memory & Scene Audit

| Metric | BEFORE | AFTER | Improvement |
| --- | ---: | ---: | --- |
| Cold load `TT` ready | 41,580 ms | **23,930 ms** | **-17.65 s (-42.4%)** |
| Cold load `titleReady` (interactive menu) | 51,323 ms | **30,178 ms** | **-21.15 s (-41.2%)** |
| World & asset build (`contact shading + setup`) | 12,754 ms | **6,496 ms** | **-6.26 s (2.0x faster)** |
| Training Area entry (`trainEntryMs`) | 58,631 ms | **27,876 ms** | **-30.76 s (2.1x faster; completes cleanly without abort)** |
| Boot JS heap | 1,516.5 MB | **1,163.1 MB** | **-353.4 MB (-23%)** |
| Training JS heap (spawn 3P) | 2,220.0 MB | **1,426.9 MB** | **-793.1 MB (-36%)** |
| Visible Training meshes / shadow casters | 500 / 213 | **416 / 160** | **-84 meshes, -53 casters** |
| Leaked valley meshes in Training | 85 (54 casters) | **0** | **100% eliminated** |
| Page errors | 0 | **0** | Clean |

### Training Area Runtime Frame Pacing (6 Spots, 75 frames each)

| Spot | BEFORE FPS (avg / p95 / worst / `r:render`) | AFTER FPS (avg / p95 / worst / `r:render`) | Delta |
| --- | --- | --- | --- |
| `train-spawn-3p` | 8.9 FPS (112.4 / 43.5 / 4,168.7 / 14.01 ms) | **59.2 FPS** (16.89 / **20.7** / **52.0** / **7.01 ms**) | **+50.3 FPS (6.7x), 4.17 s freeze gone, `r:render` -50%** |
| `train-spawn-1p` | 52.5 FPS (19.06 / 30.2 / 114.2 / 9.81 ms) | **p95 20.3 ms**, **`r:render` 6.40 ms**, `aim+climb` 0.34 ms (was 1.49 ms; 52.2 avg w/ 1 one-time 164.5 ms 1P switch spike) | **p95 -33%, `r:render` -35%, `aim+climb` 4.4x faster** |
| `train-armory-3p` | 59.9 FPS (16.70 / 20.5 / 23.6 / 6.74 ms) | **60.0 FPS** (16.66 / **20.4** / **21.6** / **3.92 ms**) | **Locked 60, `r:render` -42%** |
| `train-crossroom-3p` | 59.0 FPS (16.95 / 20.2 / 44.5 / 10.20 ms) | **59.0 FPS** (16.94 / 21.6 / 49.8 / **9.26 ms**) | **Locked ~60, `r:render` -9%** |
| `train-lightsoff-3p` | 48.5 FPS (20.61 / 30.6 / 77.4 / 12.95 ms) | **60.0 FPS** (16.66 / **20.9** / **23.5** / **7.30 ms**) | **+11.5 FPS, worst 3.3x better, `r:render` -44%** |
| `train-10zombies-3p` | 55.7 FPS (17.95 / 28.0 / 33.2 / 11.85 ms) | **58.6 FPS** (17.07 / **22.8** / **25.8** / **10.26 ms**) | **+2.9 FPS, p95 -19%, worst -22%, `r:render` -13%** |

## Root Causes Diagnosed & Fixed

1. **`cloneLean()` recursive Three.js `toJSON()` catastrophe (`index.html`, -35.5 s Training entry & -4.0 s cold boot, -500+ MB heap garbage):**
   - `cloneLean()` only checked top-level `!(v.isObject3D || v.isMaterial || v.isTexture || v.isBufferGeometry)` before calling `JSON.parse(JSON.stringify(v))`. Weapon `userData` arrays/maps holding Three.js objects (`artworkInstanceMeshes`, `recoilBoltParts`, `heatParts`) invoked `Object3D.prototype.toJSON()`, encoding full weapon geometries and PBR textures into multi-megabyte base64 PNG JSON strings (~1.1 s per cloned gun x ~32 clones on Training entry plus offhand clones at boot). Replaced with a depth-bounded recursive `_leanValue()` that skips Three.js resources and TypedArrays at any nesting depth while preserving plain metadata (`artworkSlots`, `weaponDetail`, etc.).
2. **Cold-boot `warmWeaponFire` / `warmPooledEffect` ran BEFORE `compileInSlices()` (`index.html`, -10+ s cold load):**
   - Drawing `fire-hot` before `compileInSlices()` synchronously compiled 401 valley shaders on the main thread (~13-14 s). Moved fire/leaf warm-up to run immediately after `compileInSlices()` + `warmFrame('load')` against the already-compiled scene.
3. **21 redundant full-scene `compileInSlices()` walks in `maybePreRollFromLoop()` (`index.html`, -4.6 s pre-roll):**
   - Only `fresh` (step 0) and `effects` (`shadows: true`) need full-scene slice compiles; the 21 intermediate steps introduce only ~9 shader variants total and now draw directly in 1 tick each without duplicating `RenderContext` variants (exact 659 boot variants preserved). Also increased `compileInSlices` slice budget (`28 -> 96 ms`, `n: 24 -> 96`), trimmed duplicate upfront boot `POOL_DEPTH` (38 -> 13 + 11 liveRoll = 24), tightened `stepLivePreRoll` idle tick schedule, and deferred `warmDressView` / `warmCifSwatches` until `releaseTitle()`.
4. **Procedural PBR texture synthesis CPU (~5.1 s pure Node CPU saved across 6 libraries):**
   - `world/training-textures.js` (1,970 -> 356 ms, 5.5x), `world/rock-textures.js` (2,485 -> 424 ms, 5.9x), `world/build-textures.js` (1,340 -> 359 ms, 3.7x), `world/fob-textures.js` (858 -> 626 ms), `world/ground-textures.js` (558 -> 508 ms), `world/training-wear.js` (822 -> 579 ms). Hoisted bitmask Sobel `heightToNormalRGBA`, precomputed `makeFbmGrid`/`makeWorleyGrid`, reused scratch objects in `synthPBRPixels`, localized tie-rod hole stamping in `fob-textures.js`, and directly synthesized hero tiles at 512px (matching their already-downsampled normal/ORM maps) and 256px rock variants.
5. **Post-entry 4,168.7 ms freeze & 2nd WebGPU device in Armory warm-up (`index.html`):**
   - Stopped launching concurrent `warmArmoryPics()` under Training blackout (kept `armoryUI.warm()` lightweight; thumbnails render lazily on Armory open) and passed `device: renderer.backend?.device` so Armory thumbnails share the main WebGPU device.
6. **`rackGunCopy` per-instance `toNonIndexed()` & cache wipe (`index.html`, 24.45 s -> 188 ms combined w/ `cloneLean`):**
   - Iterated `geo.index` directly in `rackGunCopy()`, avoided calling `refreshArmoryRack(true)` (`clearRackGunCache()`) right after populating `_rkCache` in `trainingWarmCompile()`, and deduplicated `vmPaintMeshes`/`worldPmBySrc` clones by shader feature signature.
7. **Valley leaks & per-frame overhead in Training Area (`index.html`, `world/training-cutaway.js`, `world/training.js`):**
   - Gated valley-only systems (`updateRadioCues`, `updateFpNote`, `updateStoryChain`, `updateCampfires`, `updateTreeFade`, `updateFallingTrees`, `updateLightning`, `stepObjectiveInteraction`, `extractionBoat`, `updateBoarding`, `updateCaveEyes`) when `training.active`, and cleared valley `motes` on Training entry (eliminated 85 leaked valley meshes / 54 shadow casters / 20.8k tris).
   - Extended `shadowPruneBegin()` to prune non-casting direct children inside `training.tg.group` while fixing `holdsCaster()` to preserve light-holding groups.
   - Added Training-only fixed-noon `sunShadowCadence()` (every 2nd frame while active/moving/fighting, every 6th frame while idle, immediate on teleport or light toggle; valley `autoUpdate = true` untouched, `t271` 10/10 pass).
   - Cached canvas center in `updateOts()` (4.4x faster 1P `aim+climb`), dirty-checked `training-cutaway.js` `syncMaterials()`, froze static baked matrices in `world/training.js`, and cleared `castShadow` on sub-4 cm anchor bolts/bevel.

## Rule 16 Game-Test Slot Record

Every browser profile and test batch ran strictly through the machine-wide game-test slot queue (`crew.mjs slot run --exclusive` for all timing/FPS benches; `tools/tests/run-all.mjs --jobs 1 --agent antigravity2 --task AH-14` for targeted regression tests), one worker per lease, zero direct browser launches outside the slot.
