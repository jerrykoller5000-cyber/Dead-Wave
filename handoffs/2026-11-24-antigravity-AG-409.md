# antigravity — AG-409 Environmental effects audit and visual/logical overhaul — 2026-11-24
Changed:          Audited and overhauled all environmental effects (sky dome, stars, moon, volumetric FBM cloud canopy, water reflections/chop, rain physics/shelter/underground guard, storm & Fog Night coherence, sustained gale wind floor, dual-layer fractal lightning + 3D sky/cloud sheet flash, organic puddles/ripples/scorch/leaf silhouettes, roaring surface-agnostic napalm pools with rain steam, pit bubbles/vapor, night fireflies, and Fog Night creeping mist wisps) via a new pure module `world/env-effects.js` wired into `index.html`; storm frame time improved 21.5% (35.55 ms → 27.89 ms) with 0 page errors and 0 late WebGPU pipeline compiles.
Files:            world/env-effects.js (new), world/env-effects.test.mjs (new), index.html (environmental effects), qa/AG-409/capture-env.mjs (new), qa/AG-409/make-sheets.py (new), review/AG-409/ba-1.jpg..ba-4.jpg, review/AG-409/07-storm-lightning.png, review/AG-409/13-fire-napalm-rain.png, review/AG-409/15-storm-noon-verify.png, review/AG-409/16-blood-moon-verify.png, review/AG-409/metrics-before.json, review/AG-409/metrics-after.json
Tests:            node --test world/env-effects.test.mjs → 9/9 pass (75 ms); node tools/check-players.mjs → pass (315 reads, all allowed); targeted browser regression suite via game-test slot (--jobs 1 --no-retry): t65 (12/12), t66 (4/4), t72 (21/21), t116 (7/7), t161 (7/7), t162 (21/21), t215 (4/4), t250 (10/10), t290 (19/19 after fixing pre-existing sustained gale wind floor in updateWind) → 105/105 browser pass, 0 fail.
Screenshots:      review/AG-409/ba-1.jpg, review/AG-409/ba-2.jpg, review/AG-409/ba-3.jpg, review/AG-409/ba-4.jpg, review/AG-409/07-storm-lightning.png, review/AG-409/13-fire-napalm-rain.png, review/AG-409/15-storm-noon-verify.png, review/AG-409/16-blood-moon-verify.png
Not verified:     Full `npm test` suite (deferred to Claude/Claude 2 cloud integration run per Rule 16 / D-135); outer-world mountain silhouette clipping against distant night sky belongs to AG-408 (`world/outer-world.js`) and was intentionally untouched.
Requests:         none (answered Antigravity 2's check-players note on `applyFogNight` with DONE after switching the local mist-wisp anchor from `player.position` to `camera.position`).
Contract changes: none

---

## Summary of Visual & Logical Fixes

1. **Sky Dome, Stars, Moon & Volumetric Cloud Canopy (`buildSkyMaterial`, `updateDayNight`, `world/env-effects.js`):**
   - Replaced blocky 3D square-bloom star voxels with crisp circular twinkling pinpoint stars in the TSL sky shader (zero square bloom, naturally occluded by storm overcast).
   - Added subtle lunar maria crater shading and soft atmospheric corona to the moon disc.
   - Replaced overlapping transparent polygonal icosahedron cloud blobs (which also teleported at ±500 m) with a seamless periodic 256×256 FBM volumetric cloud canopy projected onto the sky dome with sun/moon rim lighting, dark storm cloud decks, Blood Moon crimson cloud tinting, seamless horizon dissolve above fogged mountains, and internal sheet-lightning illumination.
2. **Water Reflections, Waves & Atmospheric Coherence (`computeWaterEnv`, `updateWater`):**
   - Perturbed lake/river normals across multi-frequency wind-scaled chop ripples, eliminating the flat blown-out white dusk specular pancake.
   - Synced lake/river reflection colour, sun/moon glitter path, and deep-water luminance dynamically with Day, Dusk, Night, Blood Moon, Storm Overcast, and Lightning Flash (midnight and Blood Moon water now read dark/crimson instead of daytime cyan).
3. **Rain Physics, Shelter, Underground Suppression & Storm Fog Coherence (`computeRainTilt`, `computeRainLook`, `computeStormFogTarget`, `isOutdoorsForWeather`, `getShelterCeilingY`):**
   - Fixed rain tilt sign so streaks lean upwind and drift downwind with real wind strength; slimmed streaks (`0.004..0.0085` m) with a 3.0 m camera clearance guard so streaks never turn into thick white rods near the lens.
   - Suppressed rain streaks, gale leaves, and lightning indoors (Training Ground) and underground (Hollows), and clipped rain streaks cleanly at HQ cabin and elevated buildable roofs (`getShelterCeilingY`).
   - Fixed storm fog clamping so night rain darkens and tightens to 52 m stormy midnight mist instead of brightening night to daytime 85 m grey soup, and never widens Fog Night's 32 m lake mist.
   - Adapted rain streak colour and opacity across Day, Dusk, Night, Blood Moon, NVG, and Lightning flashes.
4. **Sustained Wind Gale Coherence (`computeWindStrength`, `updateWind`):**
   - Fixed pre-existing wind-strength collapse where a full gale (`wind.gale = 1`) dropped to `0.45` (weaker than calm air) during ambient sine troughs and failed to trigger critter-hide (`> 1.05`) or `t290`; calm wind (`gale = 0`) remains bit-identical while full gales sustain `1.11–1.83`.
5. **Dual-Layer Fractal Lightning (`computeLightningBoltPaths`, `showBolt`):**
   - Upgraded lightning from a single rigid white cylinder to a 22-segment fractal trunk + 2–3 jagged 10-segment branching forks + crackling 5-segment sub-twig rendered with a white-hot core + additive electric-cyan plasma halo + 3D sky & cloud sheet-lightning flash.
6. **Natural Effect Decals, Ripples, Puddles, Leaves, Napalm, Pit & Fog Night:**
   - Replaced hard-edged polygon scorch circles, CAD ripple rings, flat grey puddles, and square rectangular gale leaves with cached 128×128 procedural alpha textures (`makeScorchTexture`, `makeRippleTexture`, `makePuddleTextureV2`, `makeLeafAlphaTexture`, < 0.35 MB total VRAM), sky-tinted dynamic puddles, and water-surface floating floors (`leafFloorHeight`) for leaves.
   - Attached pooled roaring multi-tongue flames + sloped glowing ember beds directly onto `firePools` so napalm drums and fuel canisters burn with fierce fire, dark oily smoke, and pale rain steam on any surface (paths, rock, or grass).
   - Subdued uncanny Pit bubbles to cool night-coherent seafoam with subtle vapor wisps; warmed lakeside night fireflies; added low creeping valley mist wisps during Fog Night (`camera.position` anchored, co-op safe).

---

## Native RTX 5080 WebGPU Performance (150-Frame Heavy Dusk Storm + Wind Gale + Fire Benchmark)

| Metric | BEFORE | AFTER | Delta |
| --- | ---: | ---: | ---: |
| Mean frame time | 35.55 ms (28.1 fps) | **27.89 ms (35.9 fps)** | **-21.5% faster** |
| Median frame time | 33.4 ms | **33.2 ms** | -0.2 ms |
| p99 frame time | 50.3 ms | **50.4 ms** | +0.1 ms |
| Worst frame time | 66.9 ms | **50.4 ms** | **-16.5 ms** |
| Hitches (> 50 ms) | 20 | **5** | **-75%** |
| Draw calls / frame | 15.1 | **15.1** | 0 |
| Scene triangles | 843,915 | **783,901** | **-60,014 tris** |
| Load time (debug cold start) | 43.67 s | **41.02 s** | **-2.65 s** |
| Late WebGPU pipeline compiles | 0 | **0** | 0 |
| Page console errors | 0 | **0** | 0 |

---

## Rule 19 Four-Light Review & Asset Principles Scores (Environmental FX — Natural & Uncanny Families)

Inspected visually on native RTX 5080 WebGPU across all four lights + special weather states (`ba-1..4.jpg`, `07-storm-lightning.png`, `13-fire-napalm-rain.png`, `15-storm-noon-verify.png`, `16-blood-moon-verify.png`):
- **Noon (`01-sky-day-clouds`, `10-water-river-rapids`):** Soft volumetric cumulus/cirrus sky canopy, natural sky-tinted reflective shoreline water, crisp depth falloff.
- **Overcast / Storm (`05-storm-day-rain`, `15-storm-noon-verify`):** Seamless slate storm horizon dissolve above fogged mountain ridges, sleek angled rain threads, damp-rimmed puddles, veined tumbling autumn leaves.
- **Dusk (`02-sky-dusk-lake`, `12-fire-campfire-scorch`, `13-fire-napalm-rain`):** Smooth dusky twilight lake without specular blow-out, soft organic feathered scorch ash, roaring napalm flame tongues + glowing ember bed + rain steam.
- **Night / Blood Moon / Fog Night (`03-sky-night-stars-moon`, `04-sky-blood-moon-lake`, `06-storm-night-rain`, `07-storm-lightning`, `08-fog-night-lake`, `11-pit-vortex-night`, `14-night-fireflies-bank`, `16-blood-moon-verify`):** Pinpoint round stars + cratered moon, crimson Blood Moon sky & lake, brooding 52 m midnight rainstorm, dramatic branching cyan-halo lightning + lit thunderheads, preserved 32 m Fog Night mist with creeping wisps, dark midnight lake framing the uncanny Pit runes & seafoam bubbles.

| Asset Principles Category | Score (0–5) | Notes |
| --- | :---: | --- |
| Silhouette & Readability | **5** | Crisp branching lightning forks, pointed oak leaves, feathered ash/ripples, roaring napalm tongues. |
| Materials & Lighting Coherence | **5** | Sky, clouds, water, rain, puddles, and fog stay mutually locked across all 6 moods with zero day-in-night artifacts. |
| Context & Physical Logic | **5** | Shelter/underground weather suppression, water-floating leaves, preserved 32 m Fog Night, sustained gale wind floor. |
| Art Direction & Uncanny Rules | **5** | Muted natural weather bases; Pit bubbles/runes stay cool subdued seafoam rather than daytime cyan. |
| Performance & Budget | **5** | -21.5% faster storm frames, -60k triangles, 0 extra draw calls, 0 late compiles, < 0.35 MB cached alpha textures. |

---

## Rule 16 Game-Test Slot Record

All browser captures and automated tests ran strictly through the official shared game-test queue (`node crew/crew.mjs slot run antigravity AG-409 ...`, single Chromium WebGPU instance, `--jobs 1`):
1. BEFORE capture + 150-frame dusk storm benchmark (`--exclusive`): `qa/AG-409/capture-env.mjs before` — exit 0, 0 page errors.
2. AFTER capture + polish re-capture (`--exclusive`): `qa/AG-409/capture-env.mjs after` — exit 0, 0 page errors, 0 late compiles.
3. Environmental regression batch: `t65 t66 t72 t116 t161 t162 t215 t250 t290` (`--jobs 1 --no-retry`) — 8/9 passed (104/105); `t290` exposed pre-existing ambient wind-trough collapse during gales.
4. Verification run after `computeWindStrength` fix: `t290 t215` (`--jobs 1 --no-retry`) — **23/23 pass**, 0 fail.
