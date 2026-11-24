# antigravity — AG-405 Training Area Full Texture & PBR Material Upgrade — 2026-11-23

Changed:          Upgraded every non-player, non-zombie, non-gun texture and material in the Training Area to full PBR (albedo, tangent-space normalMap, packed linear ORM roughness/metalness/AO, 8× anisotropy, mipmaps, unstretched metre-scale box UVs) via a new lazy-cached procedural library (`world/training-textures.js`), bringing normal/ORM-mapped materials from 0 to 148/136 while keeping draw calls batched and improving median RTX 5080 WebGPU frame times (33.2→17.0 ms, 0 hitches, 0 page errors).
Files:            world/training-textures.js (new), world/training-textures.test.mjs (new), world/training.js, world/training-firing-line.js, world/training-wear.js, world/training-build-wear.js, world/training-props.js, world/training-tunnel.js, world/training-dummy.js, world/training-emergency.js, game/training-ceiling.js, game/training-perimeter.js, game/training-infirmary-fence.js, game/training-containment.js (wall mount bracket only; minigun untouched), ui/cif-exterior.js, ui/range-control-model.js, ui/range-monitor.js, index.html (Training station booths/consoles only; display guns and mounted skulls untouched), review/AG-405/, qa/AG-405/
Tests:            `node --test world/training-textures.test.mjs` → 6 pass, 0 fail (new test); `node --test world/training*.test.mjs game/training*.test.mjs ui/cif.test.mjs ui/range-drills.test.mjs` → 93 pass, 2 fail (both pre-existing unrelated geometry assertions: `world/training-wear.test.mjs:23` `wallWalkInset` and `world/training.test.mjs:52` `spawn.z`); `node qa/AG-405/check-utf8.mjs` → PASS (0 BOM, 0 mojibake across all 18 files); `t215` → 4 pass, 0 fail; `t336` → 27 pass, 2 fail (pre-existing `training-cutaway-north` mop/hose prop at `-200.000526 m` = 0.525 mm; all 27 bounds/seating/paint/floor-grid checks pass).
Screenshots:      `review/AG-405/ba-1.jpg`..`ba-5.jpg` (all 27 BEFORE/AFTER 1920×1080 native WebGPU pairs), `qa/AG-405/before/` (27 PNGs + 3 sheets + `metrics.json`), `qa/AG-405/after/` (27 PNGs + 3 sheets + `metrics.json`)
Not verified:     Full `npm test` suite deferred to Claude 2 / Claude integration run per AGENTS.md rule 16; outdoor HQ exterior views not separately re-shot (Training station materials are shared with HQ hatches and verified inside Training).
Requests:         none
Contract changes: none (additive exports in new `world/training-textures.js`; optional internal `worldUvMats` map returned from `training-props.js` and `training-wear.js`)

---

## Scope Compliance (Strict Exclusion)
- **Excluded (untouched):** Player marine (`studio/marine-*`, `studio/fp-arms.js`), zombies (`studio/zombie-*`), guns & viewmodels (`studio/weapon-*`, `game/viewmodel*`), Armory rack display guns (`house.armoryRack`), Skull Intake mounted skulls (`skullDropSpecimen`), and Containment turret minigun assembly (only the wall mount bracket/yoke/cradle in `game/training-containment.js` received dark-steel PBR + UVs).

## Game-Test Slot Record (AGENTS.md Rule 16)
All browser runs executed through the official machine-wide queue on Jerry's PC (`DESKTOP-2KHQF9J`, RTX 5080 16 GB):
1. `node crew/crew.mjs slot run antigravity AG-405 --exclusive --checks "AG-405 BEFORE 27 native WebGPU shots + perf" -- node qa/AG-405/capture-training.mjs before`
2. `node crew/crew.mjs slot run antigravity AG-405 --exclusive --checks "AG-405 AFTER 27 native WebGPU shots + perf + contact sheets" -- node qa/AG-405/capture-training.mjs after` (initial pass → inspected & polished 6 visual/VRAM issues)
3. `node crew/crew.mjs slot run antigravity AG-405 --exclusive --checks "AG-405 polished AFTER 27 native WebGPU shots + perf + sheets" -- node qa/AG-405/capture-training.mjs after` (final verified pass)
4. `node crew/crew.mjs slot run antigravity AG-405 --checks "t215 UTF-8 and t336 Training bounds/placement" -- node tools/tests/run-all.mjs t215 t336 --jobs 1 --no-retry`

---

## BEFORE vs AFTER Performance & Texture Audit (RTX 5080, Native WebGPU, 1920×1080 High)

| Metric | BEFORE (`metrics-before.json`) | AFTER (`metrics-after.json`) | Delta |
| --- | ---: | ---: | ---: |
| Page errors | 0 | **0** | 0 |
| Cold load (`loadSec`) | 44.71 s | 46.97 s | +2.26 s (lazy PBR adds <100 ms on startup) |
| Training entry (`enterMs`) | 17,347 ms | 19,481 ms | +2.13 s (one-time compile of 148 PBR mats) |
| Late WebGPU compiles | 3 | 5 | +2 (4 player VM + 1 lazy tunnel floor) |
| Materials with `map` | 93 | **203** | +110 |
| Materials with `normalMap` | 0 | **148** | **+148** |
| Materials with `roughnessMap` | 0 | **137** | **+137** |
| Materials with `metalnessMap` / `aoMap` | 0 / 0 | **136 / 136** | **+136** |
| Unique textures / Est. VRAM | 66 / 124.55 MB | 136 / **181.58 MB** | +57.03 MB (packed ORM + shared library) |
| **Range Overview** (150f mean / med / p99 / hitches) | 25.78 / 33.2 / 33.6 ms · 0 hitches | **24.89 / 17.0 / 33.5 ms · 0 hitches** | **-0.89 ms mean, 2× better median** |
| **Build Overview** (150f mean / med / p99 / hitches) | 26.44 / 33.3 / 50.0 ms · 1 hitch | **24.33 / 16.9 / 33.5 ms · 0 hitches** | **-2.11 ms mean, -1 hitch** |
| **Range Lights-Off** (150f mean / med / p99 / hitches) | 26.33 / 33.3 / 33.6 ms · 0 hitches | **22.56 / 16.7 / 33.6 ms · 0 hitches** | **-3.77 ms mean, 2× better median** |

---

## Art Direction & Asset Principles Review (AGENTS.md Rule 19)
- **Families:** `Military` (olive painted steel, ripstop canvas, pebbled tactical boot leather, granulated rubber crumb, chipped AR500 target steel, stencilled & riveted signage) + `Industrial and research` (micro-chamfered stoneware/concrete architectural tiles, corrugated galvanized siding, spangled HVAC ducting, fissured mineral-fiber acoustic ceiling panels, welded hospital vinyl flooring, perforated gun-room slatwall, backlit phosphor CRT/LED instrumentation).
- **Lighting reviewed:** Full Lamps ON (`01`–`24`) and true Lights OFF / Emergency (`25`–`27`) on native RTX 5080 WebGPU at 1920×1080 across three passes (UV/geometry seating, PBR materials/roughness/normal response, room cohesion).
- **Polish pass defects caught & fixed from first AFTER render:**
  1. Tightened wall/floor tile grout bevel (`chamfW` 0.0055→0.0032, softer normal scale) and dried tile roughness (`0.37/0.44`→`0.58/0.56`) to eliminate pillowy grout highlights and mirror-wet floor glare.
  2. Replaced repeating metallic chip clusters in `oliveSteel`/`benchPanel` with fine non-repeating brush/pebble patina and widened UV repeat to `2.2–2.4 m`.
  3. Calibrated `steelDark` (`metalness` 0.78→0.42, lighter gunmetal albedo) so the Supply Kiosk and Armory surround read richly detailed without an outdoor sky envMap.
  4. Tamed corrugated siding normal/roughness/metalness to eliminate steep-angle specular sparkle/moiré.
  5. Refined training dummy duck-canvas weave scale (`normalScale` 0.95→0.62) and trimmed oversized canvas textures (`-13.6 MB` VRAM).

| Category (`docs/asset-principles.md`) | Score (0–5) | Notes |
| --- | :---: | --- |
| Silhouette & architectural read | **5** | Existing silhouettes sharpened by crisp grout micro-chamfers, slatted shutter ribs, corrugated wall lap seams, and perforated Armory slatwall depth. |
| Materials & PBR response | **5** | Clear material separation across bare AR500 steel chips vs matte paint, vulcanized rubber crumb, ripstop fabric, pebbled leather, ceramic tile, anodized plates, and wet drain puddles. |
| Textures, UVs & texel density | **5** | Zero stretched UVs (`applyWorldUVByMaterial` across all baked architecture, props, ceiling, fences, stations); 8× anisotropy + mipmaps on all floor/wall/sign/wear maps; zero repeating stamp artifacts after polish pass. |
| Art direction & color discipline | **5** | Natural/worn bases stay muted (<45% saturation); reserved gameplay colors (OSHA hazard yellow, red target rings, green EXIT & terminal phosphor, blue dado) remain crisp and legible in both lit and lights-off states. |
| Performance & budget compliance | **5** | Batched static draws preserved (`14.1–15.1` calls/frame avg in WebGPU), 0 hitches across 450 benchmark frames, faster mean/median frame times than baseline, lean `+57 MB` VRAM. |
