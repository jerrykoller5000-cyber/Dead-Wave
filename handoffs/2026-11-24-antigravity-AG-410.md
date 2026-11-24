# antigravity — AG-410 Jerry direct: full PBR texture overhaul for all weapons — 2026-11-24

Changed:          Built a shared WebGPU-native procedural PBR texture library (`studio/weapon-textures.js`, 18 deterministic material families with bottom-up `DataTexture` normals and channel-0 packed linear ORM so `uv1` remains free for `game/barrel-heat.js`) and a single-draw TSL `fold-static` weapon PBR shader (`getWeaponFoldPBR`), wiring PBR across all 12 carried firearms/chainsaw, 4 melee weapons, Crimson Katana + saya, Watchman M240 HMG, 81 mm mortar + M29A1 round, M67 frag grenade, Holy Hand Grenade, optics, laser/light attachments, suppressors, and shovel with zero added cold meshes (`319/319`) and zero added draw calls (`15.1/frame`, `274` equipped draws across all 12 guns). Polished micro-grain frequency/relief after visual review to eliminate coarse polymer/parkerized mottling and Holy Hand Grenade dimpling, and ensured `applyGunFurniturePBR` overwrites cloned materials to their true finish role while preserving `t146`/`t334` `map === null` factory invariants.
Files:            studio/weapon-textures.js (new), studio/weapon-textures.test.mjs (new), studio/weapon-finish.js, studio/weapon-sidearms.js, studio/weapon-longarms.js, studio/weapon-heavy.js, studio/weapon-optics.js, studio/weapon-attachments.js, studio/katana.js, studio/frag-grenade.js, world/bake.js, world/rabbit.js, game/viewmodel.js, index.html, qa/AG-410/capture-weapons.mjs (new), qa/AG-410/make-sheets.py (new)
Tests:            `node --import ./studio/node-three.mjs --test studio/weapon-textures.test.mjs studio/frag-grenade.test.mjs studio/weapon-detail.test.mjs studio/gun-detail.test.mjs studio/marine-knife.test.mjs` → 24 pass, 0 fail (new test: `studio/weapon-textures.test.mjs`, 6/6 pass). `node tools/check-players.mjs` → pass (316 `player.position` reads, all allowed). Targeted browser suite via game-test slot (`node tools/tests/run-all.mjs t38 t146 t181 t215 t334 tcb317 tcf9 tci1 tag290 --jobs 1 --no-retry --all-fails`) → 9 checks: 237 pass, 0 fail (`tag290` 47/47, `tcb317` 7/7, `tcf9` 16/16, `tci1` 34/34, `t38` 33/33 with `319` cold meshes & `274` equipped draws, `t146` 43/43, `t181` 24/24, `t215` 4/4, `t334` 29/29).
Screenshots:      review/AG-410/ba-1.jpg (sidearms & longarms), review/AG-410/ba-2.jpg (shotguns, sniper & heavy), review/AG-410/ba-3.jpg (chainsaw & melee/katana), review/AG-410/ba-4.jpg (M240, mortar, mortar round, M67 frag & Holy Hand Grenade), review/AG-410/ba-5.jpg (1P gameplay across Noon, Overcast, Dusk, Night+Light & Multicam), plus review/AG-410/metrics-before.json and review/AG-410/metrics-after.json (28 matched 1600×900 native RTX 5080 WebGPU pairs in `qa/AG-410/before/` and `qa/AG-410/after/`).
Not verified:     Full `npm test` integration suite (deferred to coordinated cloud integration per AGENTS.md Rule 16 / D-135). Note: `studio/weapon-optics.test.mjs` has a pre-existing unrelated failure at line 25 (`assert.throws(() => makeOptic('prism'), RangeError)`).
Requests:         None.
Contract changes: None (optional `{ weaponPBR, uvScale }` added to `world/bake.js` `foldStatic` with backwards-compatible defaults; existing weapon/Armory/barrel-heat contracts unchanged).

## Before vs After Audit (RTX 5080 WebGPU, 1600×900)

| Metric | BEFORE (`metrics-before.json`) | AFTER (`metrics-after.json`) | Delta |
| --- | ---: | ---: | ---: |
| Cold meshes (12 carried guns, `t38` limit `<= 319`) | 319 | 319 | 0 |
| Total audited weapon meshes | 571 | 571 | 0 |
| Unique weapon materials | 233 | 233 | 0 |
| Materials with `map` | 16 | 48 | +32 |
| Materials with `normalMap` | 0 | 196 | +196 |
| Materials with `roughnessMap` / `aoMap` (ch 0) | 1 / 0 | 196 / 196 | +195 / +196 |
| Materials with `metalnessMap` | 0 | 43 | +43 |
| WebGPU TSL `weaponFoldPBR` node materials | 0 | 5 | +5 |
| Unique weapon textures / estimated VRAM | 10 (1.13 MB) | 50 (39.25 MB) | +40 (+38.12 MB) |
| Capture load time | 75.50 s | 71.62 s | -3.88 s |
| 1P steady-state draw calls / late compiles | 15.1 / 0 | 15.1 / 0 | 0 / 0 |
| 1P steady-state frame time (150 frames) | 56.11 ms (p99 83.4 ms) | 60.89 ms (p99 83.6 ms; pass-1: 51.89 ms) | within PC variance |
| Console / page errors | 0 | 0 | 0 |

## Rule 19 — Art Direction & Asset Principles Audit

- **Art Family:** Military / Tactical Ordnance (`docs/art-direction.md`: matte dielectrics for coated receivers/enamels/polymers, brushed bare steel only on working edges/slides/bolts/blades, oiled walnut & lacquered Russian birch wood, and Uncanny/Relic gilded finish on Crimson Katana fittings and Holy Hand Grenade).
- **4-Light Gameplay Verification (`review/AG-410/ba-5.jpg`):**
  - **Noon (`23-fp-m4-noon`, `24-fp-ak-noon`):** Crisp hardcoat anodized/parkerized value separation, warm amber-russet lacquered birch wood grain and carved grip stippling, metallic bolt sheen, zero noisy granite mottling.
  - **Overcast (`25-fp-revolver-overcast`):** Smooth blued steel cylinder/barrel reflection and warm oiled walnut grip contrast cleanly against diffuse sky light.
  - **Dusk (`26-fp-flamer-dusk`, `28-fp-m4-camo-dusk`):** Baked enamel housing, red fuel tanks, glowing tritium gauge dial, and Multicam + normal/roughness relief read cleanly at grazing dusk angles.
  - **Night + Light (`27-fp-pistol-night`):** Sleek longitudinal brushed steel slide, crisp white three-dot sights, fine micro-stippled frame, and multi-coated optical glass lenses with zero foreshortening ripple artifacts.
- **Asset Principles Scores (0–5, all >= 4):**
  - Silhouette & Readability: **5/5** (all weapon geometry/silhouettes preserved cleanly; 3-dot pistol sights and optics reticles crisp)
  - Material Separation (Metal / Polymer / Enamel / Wood / Glass): **5/5** (clear dielectric vs bare-steel roughness/metalness split across all 18 families)
  - Micro-Scale & Surface Craft: **5/5** (0.42 m physical tile scale aligned 1:1 with Armory camo UVs; fine EDM polymer stipple, brushed steel, folded Damascus katana hamon, burnished antique gold)
  - Four-Light & Context Cohesion: **4.5/5** (verified across Noon, Overcast, Dusk, Night+Light and studio close-ups; Armory Multicam layers cleanly over PBR)
  - Budget & Performance Discipline: **5/5** (`319/319` cold meshes, `274/279` equipped draws, `15.1` 1P draws/frame, `0` late compiles)

## Rule 16 — Game-Test Slot Record

All browser and real-GPU runs on Jerry's PC were executed sequentially through the official `node crew/crew.mjs slot run antigravity AG-410 ...` queue (`--exclusive` for BEFORE and AFTER GPU capture/perf benchmarks; `--jobs 1 --no-retry` for the targeted 9-test weapon regression suite).
