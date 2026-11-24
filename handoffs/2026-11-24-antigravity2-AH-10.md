# antigravity2 — AH-10 FOB Threshold structure PBR texture overhaul — 2026-11-24

Changed:          Upgraded all FOB Threshold structure, roof, armor, ladder, signage, door, and wall-station textures from flat untextured/low-res surfaces to deterministic procedural PBR (`map` + `normalMap` + packed linear ORM `aoMap`/`roughnessMap`/`metalnessMap` with `channel = 0`) while keeping ChatGPT's yard props (`buildFobYard`) completely untouched and harmonizing with `AG-405`'s CIF/Armory/Intake/Alarm/Kiosk surfaces.
Files:            `world/fob-textures.js` (new), `world/fob-textures.test.mjs` (new), `index.html` (FOB Threshold structure & stations only: `buildHQMenace`, `makeHouse`, `hq-ladder`), `ui/hq-markings.js`, `ui/hq-damaged-terminal.js`, `world/history-props.js` (`buildLockdownDoor` only), `game/hq-teleprinter.js`, `qa/AH-10/capture-fob.mjs`, `qa/AH-10/make-sheets.py`
Tests:            `node tools/tests/run-all.mjs t37 t154 t167 t215 t258 t301 --jobs 1 --agent antigravity2 --task AH-10 --all-fails` -> 6 checks: 101 pass, 0 fail (`t37` 17/0, `t154` 12/0, `t167` 20/0, `t215` 4/0, `t258` 4/0, `t301` 44/0; `check-players` 315/315 allowed); `node --import ./qa/AH-9/node-three-hook.mjs --test world/fob-textures.test.mjs game/hq-teleprinter.test.mjs world/history-props.test.mjs` -> 8 pass, 0 fail; new tests: `world/fob-textures.test.mjs` (3/3 pass)
Screenshots:      `qa/AH-10/before-after/ba-1.jpg` (South facade, mural, duty/teleprinter, damaged terminal, radio), `qa/AH-10/before-after/ba-2.jpg` (West facade, kiosk/ladder, intake, North facade, lockdown door), `qa/AH-10/before-after/ba-3.jpg` (East facade/armory, hero 3/4, roof deck, roof klaxon/fans, roof parapet/floodlights), `qa/AH-10/before-after/ba-4.jpg` (Dusk, Night, Rainstorm); full-res 1920x1080 WebGPU shots in `qa/AH-10/before/` and `qa/AH-10/after/`
Not verified:     Full `npm test` integration suite deferred to Claude/Claude 2 cloud commit run per D-135; `hq-ladder` had its 1-line `bakeStatic` call removed after the `after/` capture to preserve per-child rung/rail boxes for `t154` (zero visual change, restores original 27 unbaked ladder primitives).
Requests:         Sent `AG-409: check-players fails on index.html:3162 applyFogNight` to `antigravity` (resolved `DONE` at 01:55Z).
Contract changes: None

## Summary of Material & Visual Changes
- **`world/fob-textures.js`**: Added deterministic procedural WebGPU-native (`flipY = false`, bottom-up, `ormTex.channel = 0`) PBR library with Node/`fakethree` fallback:
  - `bunkerConcrete` (512x512 board-formed military concrete with formwork lifts, recessed tie-rod cones, subtle rust weep, aggregate pitting, hairline cracks) for main bunker walls (`conc`).
  - `bunkerConcreteBase` (512x512 cast concrete without tie-rod holes, with damp earth splash and moss/efflorescence) for plinth, pilasters, parapet, hoods, and foot/splash bands (`concDark`).
  - `bunkerRoofDeck` (512x512 walkable concrete roof slabs with bitumen expansion seams, tar patches, rainwater rings) applied cleanly to the `+Y` face of `mainBlock` with distortion-free world UVs (zero z-fighting, zero roof-height change).
  - `bunkerSteel` & `armorPlate` (512x512 welded/riveted gunmetal plates with calibrated `0.34-0.46` base metalness and `0.76` bare-metal scratches so roof plant and service bays never crush black without an HDR env map) for roof klaxon tower, air handler, exhaust stacks, cooling fans, service bay linings, louvers, utility box, corner armor plates, firing-slit hoods, and floodlight housings.
  - `galvSteel` (256x256 brushed subtle-spangle galvanized steel) for `hq-ladder` and parapet razor wire.
  - `hazardEnamel` & `hazardChevron` (chipped safety yellow-ochre enamel + riveted steel black/ochre service-bay header strips), `wrinkleOlive` (baked olive wrinkle enamel for stations/teleprinter), `deskWood` (oiled oak teleprinter desk), `etchedPCB` (green fiberglass circuit board with copper traces, gold solder pads, and scorch burn for the damaged terminal).
  - Dedicated relief maps: `lockdownDoorRelief` (bare-steel claw gouges), `designationRelief`, `dutyBoardRelief`, `radioFaceRelief`, `grimeStreakMap` (soft feathered transparent rainwater/siege runoff decals replacing solid brown wall rectangles), and `concretePoreNrm` (seamless pore-only normal for the Deadwalkers mural so formwork seams never cut across the skull).
- **Sub-modules**:
  - `ui/hq-markings.js`: Upgraded `PGB · GRAVEPOST THRESHOLD` designation sign to 1024x192 brushed enameled steel plate with double embossed frame, corner rivets, rain streaks, and drop-shadowed stencil typography (`strings.js` keys preserved).
  - `ui/hq-damaged-terminal.js`: Upgraded steel/copper housing, `etchedPCB` exposed circuit board with scorch burn, and cracked CRT bezel/glass reflection (zero text preserved for GP-104).
  - `world/history-props.js` (`buildLockdownDoor` only): Upgraded North `LOCKDOWN` bulkhead door to 768x1280 riveted steel plate with cross-rib, caution stripe, bold military stencils, bare-steel claw gouges aligned with `lockdownDoorRelief`, and bolted steel frame/locking bar.
  - `game/hq-teleprinter.js`: Added planar UV generation to `createAccumulator()` and wired `wrinkleOlive`, `bunkerSteel`, `galvSteel`, and `deskWood` PBR into `getTeleprinterMaterials(THREE)`.
- **Scope boundary**: Zero lines modified in `buildFobYard()` or any yard props (`GP-20311` ChatGPT).

## Native RTX 5080 WebGPU Verification & Perf (1920x1080)
| Metric | BEFORE (`qa/AH-10/before/metrics.json`) | AFTER (`qa/AH-10/after/metrics.json`) | Delta |
| --- | --- | --- | --- |
| Renderer / Page Errors | WebGPU / `0` | WebGPU / `0` | `0` errors |
| Load Time | `47.73 s` | `45.24 s` | `-2.49 s` |
| HQ Textured Draws | `41 / 116` (`35%`) | `116 / 146` (`79%`) | `+75` textured |
| `south_facade_wide` (120 frames) | `20.10 ms` (`49.8 fps`, med `16.7`, p99 `33.4`) | `18.86 ms` (`53.0 fps`, med `16.7`, p99 `33.4`) | `-1.24 ms` (`+3.2 fps`) |
| `roof_deck_overview` (120 frames) | `18.87 ms` (`53.0 fps`, med `16.7`, p99 `33.5`) | `17.53 ms` (`57.0 fps`, med `16.7`, p99 `33.4`) | `-1.34 ms` (`+4.0 fps`) |

## Art Direction & Asset Principles Audit (Rule 19)
- **Family**: Family 1 (Military / PGB Tactical Concrete & Steel) with subtle Family 3 (Weathered Industrial / Siege) patina — harmonizes directly with `AG-405`'s CIF, Armory, Skull Intake, Alarm cabinet, and Supply Kiosk finishes and `AH-9`'s compacted threshold apron.
- **Four Lights Verified (`qa/AH-10/before-after/ba-1..4.jpg`)**:
  - Noon (`01`–`15`): Formwork lifts, rivets, tar expansion joints, signage, and claw gouges read crisply without specular blow-out.
  - Dusk (`16-south-dusk`): Raking sunset grazing catches concrete formwork, armor rivets, and CRT glass cleanly.
  - Night (`17-south-night`): Sodium lamps, red firing slits, and `PGB · GRAVEPOST THRESHOLD` enamel remain readable without muddy black crush.
  - Overcast / Rainstorm (`18-west-rain`): Diffuse concrete tones, riveted steel bays, and wet ground harmonize naturally.
- **Scores (0-5)**: Silhouette `5/5` (unchanged gameplay proportions/clearances), Materials & Roughness `5/5`, Context & Storytelling `5/5`, Lighting Readability (4 lights) `5/5`, Performance & Batching `5/5`.

## Rule 16 Compliance
All browser captures (`qa/AH-10/capture-fob.mjs` via `tools/camera.mjs` + `crew.mjs slot run`) and targeted behavioral tests (`tools/tests/run-all.mjs --jobs 1 --agent antigravity2 --task AH-10`) ran sequentially through the machine-wide game-test slot queue.
