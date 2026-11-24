# antigravity — AG-412 Cave Entrances Detail & Environmental Storytelling Overhaul — 2026-11-24

Changed:          Overhauled all six cave entrances (Root, Shale, Iron, Wet, Hill, Chalk/Marrow) with unique architectural framing, geological grounding, procedural WebGPU PBR material maps, lore-grounded storytelling vignettes, and pooled dusk/night atmosphere lights, while keeping `c.group` triangle counts, wall clearances, Colossus corridors, First People glows, and survey/mine props 100% intact.
Files:            `world/cave-entrance-textures.js` (new), `world/cave-entrances.js` (new), `world/cave-entrances.test.mjs` (new), `world/mine-props.js`, `world/history-props.js`, `index.html` (4 surgical cave hooks + Hill lintel `-0.20 m`), `qa/AG-412/capture-caves.mjs`, `qa/AG-412/make-sheets.py`
Tests:            Targeted cave browser suite (`t41 t42 t44 t153 t167 t215 t251 --jobs 1 --no-retry`) → 75 pass, 0 fail (7/7 checks); Node unit tests (`world/cave-entrances.test.mjs`, `world/history-props.test.mjs`, `world/first-people.test.mjs`) → 6 pass, 0 fail; `node tools/check-players.mjs` → PASS (316 reads); `node --check` on all 4 JS modules → exit 0. New test: `world/cave-entrances.test.mjs`.
Screenshots:      30-view native RTX 5080 WebGPU BEFORE (`qa/AG-412/before/sheet-1..4-before.jpg`), AFTER (`qa/AG-412/after/sheet-1..4-after.jpg`), and side-by-side BEFORE/AFTER (`qa/AG-412/before-after/ba-1-root-shale.jpg`, `ba-2-iron-wet.jpg`, `ba-3-hill-chalk.jpg`, `ba-4-dusk-rain.jpg`).
Not verified:     Full `npm test` suite deferred to Claude / Claude 2 cloud commit run per D-135 (this PC's slot ran the full targeted cave & UTF-8 regression suite `t41 t42 t44 t153 t167 t215 t251` plus 30-view WebGPU visual proof).
Requests:         Sent `--fyi` to `claude` noting AG-412 is ready for commit review (sibling session `AG-414` currently owns `crew/status/antigravity.md`, so status card was not overwritten).
Contract changes: none

---

## Per-Cave Personality & Lore Grounding (`docs/story.md`, `docs/specs/hollows.md`)

1. **Root Cave — "The Strangler's Throat"** (`warren 1`): Sinuous S-curved ground-hugging strangler-oak root buttresses & interwoven brow arch; muted pale-sage shelf-fungus conks; Capt. Hale's abandoned PGB recon anchor (boulder piton, taut + coiled rappel rope, root-strangled open ammo/pelican cases, rolled bedroll, mossy stump with hatchet, inward-aimed tripod lamp); right-flank acoustic geophone tripod with blinking red sensor LED.
2. **Shale Cave — "The Shattered Knife-Fissure"** (`warren 2`): Towering cantilevered blue/silver-slate metamorphic knife-blades & talus scree shingles; high engineered rock-bolt steel stabilization strut & wedged capstone (`y > 7.1 m`, clear of Colossus); Spc. Mensah's unfinished demolition rig (flush borehole rods & strapped charges, ground-draped orange firing cable, raised T-handle plunger detonator with blinking amber LED, stenciled `PGB · DEMOLITIONS · MENSAH · WARREN 2` crate, wire spool, sledgehammer, crushed tailings, blast flag, `CAUTION BLAST ZONE` A-frame, inward-aimed floodlight, Delgado's slate cairn).
3. **Iron Cave — "Coldwater Iron Works, Drift No. 3 (Est. 1891)"** (`warren 3`): Riveted cast-iron lintel plaque (`COLDWATER IRON WORKS · DRIFT NO. 3 · EST. 1891`) bolted proudly above the existing mine timbers; high overhead timber gallows hoist gantry + pulley sheave + chain; flanking log-cribbing wing walls & rusted vent pipe; nailed settler iron horseshoes (points up); curving narrow-gauge rail track to a derailed riveted iron ore cart heaped with hematite ore, miner's pickaxe & spare ties; hanging wrought-iron mine lantern + hikers' camp lantern & crate. Upgraded `world/mine-props.js` and `world/history-props.js` with procedural PBR normals/ORM maps and box UVs.
4. **Wet Cave — "The Drowned Sluice & Seepage Grotto"** (`warren 4`): Grounded wet columnar basalt buttresses with mossy foot-collars and upper arch drip stalactites; organic alpha-feathered mirror-dark seepage pool (`makeSeepPoolAlphaTexture`) with basalt stepping stones & rotted boardwalk planks; stacked mossy fieldstone culvert headwall, corrugated dewatering pipe, timber sluice trough, wrenched-outward rusted iron drainage grate, and cast-iron sluice handwheel stanchion; PGB hydrological case with blinking green LED, yellow rain tarp, and inward-aimed marine beacon tripod.
5. **Hill Cave — "The Ancient Barrow Portal"** (`warren 5`): Seated lintel (`-0.20 m` in `index.html`) resting on carved stone corbel capitals, stepped dry-stone cheek walls, mossy megalithic end-caps, and a carved First People lintel frieze wired into `firstPeople.glowMats`; sweeping moss-draped crescent kerb walls framing all 5 `firstPeople.offerings`; twin leaning sentinel menhirs with skin-tight glowing cyan runes; sunken processional flagstones, stone ash altar & cairn, bleached stag-skull & antler ward totem, and Lt. Ade's PGB intelligence kit + warm ground lantern.
6. **Chalk / Marrow Cave — "The Sealed Spine & Site 9"** (`warren 6`): Pale bone-rib karst buttresses & calcite stalagmites flanking the cracked Marrow door; twin fluted First People ward obelisks with skin-tight glowing runes; broken arc of 7 threshold bound-stones (center shattered outward); slanted ancient **Hand-Print Stone** with scratched Ring of Eight (`docs/story.md` §7); 4 desperate Coldwater iron ward stakes (one bent outward, turned-over horseshoe) with feathered organic rust-bleed decals; abandoned PGB Site 9 acoustic/seismograph station (folding table, dual-reel tape deck with glowing 5-pulse oscilloscope + blinking red LED, dropped clipboard & headset, parabolic acoustic dish, `PGB · SITE 9 · MARROW · DO NOT BREACH SEAL` barricade, inward-aimed amber work lamp).

---

## BEFORE vs AFTER Metrics (RTX 5080 WebGPU · `qa/AG-412/`)

| Metric | BEFORE (`before/metrics.json`) | AFTER (`after/metrics.json`) | Budget / Status |
| --- | --- | --- | --- |
| Backend | WebGPU | WebGPU | Native GPU |
| Console / Page Errors | `0` | `0` | PASS |
| `c.group` Total Triangles (`t41`) | `56,227 / 60,000` | `56,227 / 60,000` | Unchanged (PASS) |
| Sibling `cave-entrance-dressing` Tris | `0` | `32,676` (`117` batched meshes) | Distance-culled (`175 m` arch / `96 m` story) |
| Max Dressing Radius (`t42` `< 216 m`) | `—` | `190.79 m` | Well inside wall (PASS) |
| `iron_hero_noon` Mean Frame Time | `33.89 ms` (`29.5 fps`) | `29.69 ms` (`33.7 fps`) | No regression (PASS) |
| `root_hero_noon` Mean Frame Time | `31.83 ms` (`31.4 fps`) | `32.85 ms` (`30.4 fps`) | Median `33.3 -> 33.4 ms` (PASS) |
| Capture Load Time (`loadSec`) | `81.22 s` | `71.79 s` | Faster / no regression (PASS) |

Dynamic lights use the existing pooled `requestEffectLight()` API (zero extra GPU lights, zero shader recompiles).

---

## Rule 19 Visual Review & Asset Principles Scores (0–5)

- **Art Families:** Natural valley geology (Root, Shale, Wet), Coldwater 1891 Settler Ironworks (Iron, Marrow stakes), PGB Field Research Equipment (Root, Shale, Wet, Hill, Marrow), and First People Megalithic / Uncanny Cyan Rune Carvings (Hill, Marrow — synchronized with `firstPeople.glowMats`).
- **Four-Light Verification (`ba-1..4`):**
  - **Noon** (`01..23`): Crisp silhouettes, clear readability at 1P close-up and 3/4 hero distance, grounded foundations with zero floating rocks or perched moss hats, clear Colossus central corridors and walk-in trigger zone.
  - **Dusk** (`25-iron-dusk`, `26-hill-dusk`, `27-chalk-dusk`): Warm amber mine/camp lanterns and glowing cyan First People lintel/obelisk runes come alive cleanly against raking sunset light.
  - **Night** (`04`, `08`, `12`, `16`, `20`, `24`): Inward-aimed work lamps illuminate each cave face without glaring into the camera; PGB LEDs (red/amber/green) and oscilloscope screen read clearly; First People carvings glow at full night intensity.
  - **Storm / Overcast** (`28-wet-rain`, `29-root-rain`, `30-shale-rain`): Wet specular basalt and damp seepage pool read naturally under rain; high-contrast silhouettes remain unmistakable in fog.
- **Asset Principles Score Table (all >= 4):**
  - Silhouette & readability at gameplay scale: **5/5**
  - Grounding & zero clipping/floating (Rule 24): **5/5**
  - Material response & PBR surface variation (Rule 19): **4.5/5**
  - Environmental storytelling & lore authenticity (Rule 17): **5/5**
  - Four-light & atmospheric cohesion (Noon/Overcast/Dusk/Night): **5/5**
  - Performance & budget discipline (`t41`/`t42`/distance culling/pooled lights): **5/5**

---

## Exact Test Output Proof

```text
node --import ./qa/AH-9/node-three-hook.mjs --test world/cave-entrances.test.mjs world/history-props.test.mjs world/first-people.test.mjs
✔ all procedural PBR pixel generators stay in valid ranges and keep natural saturation <= 45%
✔ all six cave entrances build cleanly, stay clear of wall (<214m), and keep Colossus central lane clear
✔ the stones take the highest clear ground, spaced apart
✔ the door's crack opens into a hole at its foot, wide enough for the dead and no more
✔ the carvings glow at night, barely by day, and go dark when the tone is silenced
✔ every builder makes its piece
ℹ tests 6 · pass 6 · fail 0

node tools/tests/run-all.mjs t41 t42 t44 t153 t167 t215 t251 --jobs 1 --no-retry --all-fails --agent antigravity --task AG-412 --checks "AG-412 cave regression suite"
check-players: 316 player.position reads, all in the allowed places
ok    t41      9 pass   0 fail  77.1s
ok    t42     18 pass   0 fail  60.4s
ok    t44      6 pass   0 fail  51.8s
ok    t153    15 pass   0 fail  48.1s
ok    t167    20 pass   0 fail  74.0s
ok    t215     4 pass   0 fail  107.7s
ok    t251     3 pass   0 fail  80.1s
7 checks: 75 pass, 0 fail
```

## Rule 16 Game-Test Slot Record

All browser captures (`qa/AG-412/capture-caves.mjs before`, `after` Pass 1/2/final) and the targeted browser test run (`t41 t42 t44 t153 t167 t215 t251 --jobs 1`) ran strictly through the official shared game-test slot queue (`node crew/crew.mjs slot run antigravity AG-412 ...` and `tools/tests/run-all.mjs --agent antigravity --task AG-412`), one worker per lease, promptly releasing the slot after each batch.
