# antigravity2 — AH-9 Main world ground PBR texture and contextual surface overhaul — 2026-11-23
Changed:          Upgraded all main-world ground surfaces to a deterministic 512x512 procedural PBR library (`world/ground-textures.js`) driving a height-blended TSL terrain shader (grass, forest duff, dirt, crushed stone/rock) with world-to-view micro-normal perturbation, micro-AO, roughness, shoreline dampness, and dynamic rain wetness/puddles, plus contextual ground painting across forests, camps, Coldwater ruins, graveyard, fuel depot, radio mast, Cordon checkpoint, FOB utility/truck yard, cave mouths, and upgraded PBR overlays/floors for FOB tyre ruts, Cordon convoy road, drag marks, cave rock faces, and Hollows caverns. All world seeds, terrain heights, and POI placements remain unchanged (Rule 10).
Files:            world/ground-textures.js (new), world/ground-textures.test.mjs (new), index.html (main world ground), world/cordon-checkpoint.js, world/history-props.js (drag marks), world/hollows.js (floor/rock materials), qa/AH-9/
Tests:            `npm test -- t66 t167 t215 t290 t302 t321 --jobs 1 --agent antigravity2 --task AH-9` -> 6 checks: 71 pass, 0 fail (all run through Rule 16 game-test slot); Node unit tests `node --import ./qa/AH-9/node-three-hook.mjs --test world/ground-textures.test.mjs world/history-props.test.mjs world/hollows.test.mjs` -> 23 pass, 0 fail; 512px procedural ground PBR synthesis = 554 ms.
Screenshots:      25-view 1920x1080 native RTX 5080 WebGPU BEFORE vs AFTER capture (0 page errors, via Rule 16 `--exclusive` game-test slot):
                  - Before/After side-by-side sheets: `qa/AH-9/before-after/ba-1.jpg`, `qa/AH-9/before-after/ba-2.jpg`, `qa/AH-9/before-after/ba-3.jpg`, `qa/AH-9/before-after/ba-4.jpg`, `qa/AH-9/before-after/ba-5.jpg`
                  - Full-res individual shots & contact sheets: `qa/AH-9/before/` and `qa/AH-9/after/` (`sheet-1-hq-trails-forest-*.jpg`, `sheet-2-water-hills-pois-*.jpg`, `sheet-3-cordon-caves-lights-*.jpg`)
Not verified:     Full `npm test` suite (deferred to Claude/Claude 2 cloud commit run per D-135) and standalone WebGL-forced GPU screenshot pass (shader compiles through shared TSL + `toGroundViewNormal` guard and passed headless `faketsl.mjs` checks).
Requests:         None (FOB/Cordon/Hollows/drag-mark changes are in `AH-9` scope; `AG-406` build-mesh work in `index.html` left untouched).
Contract changes: None.

## Visual & Art Direction Audit (Rule 19 — Family: Natural Valley & Weathered Human Surfaces)
- **Four lights verified**: Noon (`01`-`21`), Overcast/Rainstorm wetness=1.0 (`24-hq-overcast-rain.png`), Dusk raking light (`22-valley-dusk.png`), Night with FOB sodium lamps & marine flashlight (`23-hq-trail-night.png`), plus Hollows subterranean (`25-hollow-iron-floor.png`).
- **Natural saturation & biome coherence**: Lowered meadow greens into natural alpine olive-sage (<45% saturation) and harmonized 3D grass tuft materials; eliminated bright green grass island between FOB truck tyre ruts; replaced suburban lawn under conifer groves, autumn woods, campsites, Coldwater church/foundations/graves, fuel depot, radio mast, Cordon checkpoint, and cave aprons with context-accurate pine needles, russet leaf litter, mossy humus, weathered stone dust, oil-stained/crushed military gravel, and geological tailings.
- **Polish pass**: Eliminated periodic horizontal contour striping on distant mountain slopes (replaced with irregular geological crag noise), added plateau falloffs to architectural/camp/ruin/forest discs, fixed `'cellar-hatch'` lookup name, and added Fresnel sky reflection in standing rain puddles.
- **Asset Principle Scores (0-5)**:
  - Silhouette & readability across biomes/POIs: **5/5**
  - Material response (roughness, normals, wet/puddle darkening & Fresnel sheen): **5/5**
  - Anti-tiling & scale fidelity (1P close-up to distant valley horizon): **4.5/5**
  - Contextual world storytelling (forests, camps, ruins, military pads, shorelines, caves): **5/5**
  - Four-light & night readability: **5/5**

## RTX 5080 WebGPU Performance (1920x1080, 120 frames, Rule 16 `--exclusive` slot)
| View | BEFORE mean (fps) | BEFORE median / p99 | AFTER mean (fps) | AFTER median / p99 | Page Errors |
| --- | --- | --- | --- | --- | --- |
| `hq_yard_overview` | 24.86 ms (40.2 fps) | 16.9 / 33.7 ms | **24.58 ms (40.7 fps)** | **16.7 / 50.2 ms** | 0 |
| `meadow_open_1p` | 19.58 ms (51.1 fps) | 16.7 / 33.4 ms | **17.92 ms (55.8 fps)** | **16.7 / 33.4 ms** | 0 |
| `forest_floor_pine` | 30.14 ms (33.2 fps) | 33.3 / 50.0 ms | **25.42 ms (39.3 fps)** | **16.8 / 50.0 ms** | 0 |

- Rule 16 compliance: all browser captures (`--exclusive`) and targeted `npm test` checks (`--jobs 1`) ran exclusively through `tools/game-test-slot.mjs` / `crew/crew.mjs slot run`.
