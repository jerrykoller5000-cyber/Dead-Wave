# antigravity — AG-129 The builds' look, from Grokbot's GB-233 group 4 (D-89) — 2026-10-25
Changed:          Rebuilt the six buildable model families that scored below 4 in GB-233 group 4 (`heavy` turret Mk I–III, `light` turret Mk I–III, `flame` turret Mk I–III, `spikes` Tiers 0–2, `wire` Tiers 0–2, and `barrel` Tiers 0–1) in `index.html` following `docs/art-direction.md` and `docs/asset-principles.md`, and verified all 51 buildable variants on RTX 5080 across the four lights (`noon`, `overcast`, `dusk`, `night`), at 12 m gameplay scale, and in the Marine Inspector.
Files:            index.html, qa/2026-10-25-AG-129/run-ag129.mjs, qa/2026-10-25-AG-129/reshoot-buildables.mjs, qa/2026-10-25-AG-129/before-turrets-noon.jpg, qa/2026-10-25-AG-129/after-turrets-noon.jpg, qa/2026-10-25-AG-129/after-turrets-overcast.jpg, qa/2026-10-25-AG-129/after-turrets-dusk.jpg, qa/2026-10-25-AG-129/after-turrets-night.jpg, qa/2026-10-25-AG-129/before-buildables-noon.jpg, qa/2026-10-25-AG-129/after-buildables-noon.jpg, qa/2026-10-25-AG-129/after-buildables-overcast.jpg, qa/2026-10-25-AG-129/after-buildables-dusk.jpg, qa/2026-10-25-AG-129/after-buildables-night.jpg, qa/2026-10-25-AG-129/turrets-closeup/sheet.jpg, qa/2026-10-25-AG-129/traps-barrel-closeup/sheet.jpg, qa/2026-10-25-AG-129/gameplay-12m/sheet.jpg, qa/2026-10-25-AG-129/inspector-check/sheet.jpg, review/principles/turrets-noon/sheet.jpg, review/principles/turrets-overcast/sheet.jpg, review/principles/turrets-dusk/sheet.jpg, review/principles/turrets-night/sheet.jpg, review/principles/buildables-noon/sheet.jpg, review/principles/buildables-overcast/sheet.jpg, review/principles/buildables-dusk/sheet.jpg, review/principles/buildables-night/sheet.jpg
Tests:            node tools/tests/run-all.mjs t25 t31 t215 --agent antigravity --task AG-129 --jobs 1 → 3 checks: 59 pass, 0 fail (t25: 29 pass, t31: 26 pass, t215: 4 pass); node tools/camera.mjs check build. → 51 subjects, 0 broken
Screenshots:      qa/2026-10-25-AG-129/before-turrets-noon.jpg, qa/2026-10-25-AG-129/after-turrets-noon.jpg, qa/2026-10-25-AG-129/after-turrets-overcast.jpg, qa/2026-10-25-AG-129/after-turrets-dusk.jpg, qa/2026-10-25-AG-129/after-turrets-night.jpg, qa/2026-10-25-AG-129/before-buildables-noon.jpg, qa/2026-10-25-AG-129/after-buildables-noon.jpg, qa/2026-10-25-AG-129/after-buildables-overcast.jpg, qa/2026-10-25-AG-129/after-buildables-dusk.jpg, qa/2026-10-25-AG-129/after-buildables-night.jpg, qa/2026-10-25-AG-129/turrets-closeup/sheet.jpg, qa/2026-10-25-AG-129/traps-barrel-closeup/sheet.jpg, qa/2026-10-25-AG-129/gameplay-12m/sheet.jpg, qa/2026-10-25-AG-129/inspector-check/sheet.jpg
Not verified:     None (all 17 rebuilt models across 6 families verified in 4 lights, at 12 m gameplay scale, in the Marine Inspector, and through t25/t31/t215 on RTX 5080).
Requests:         Replied DONE to Claude's request "AG-129: the builds' look, from Grokbot's GB-233 group 4 (D-89)".
Contract changes: none

## Rule 16 (Game-Test Queue) & Rule 19 (D-89 Asset Principles) Record
- All browser test suites (`t25`, `t31`, `t215`), four-light contact sheets, close-up sheets, 12 m gameplay-scale sheets, and Marine Inspector checks were executed sequentially with `--jobs 1` through `node crew/crew.mjs slot run antigravity AG-129`.
- Renderer: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`.

---

## 1. Material Families (`docs/art-direction.md` §1)

All six rebuilt buildable families belong to **Family 2 — The Military & Fortifications** (`docs/art-direction.md` §1), using matte dielectric painted metal for structural housings/drums and high-metalness bare steel/gunmetal only where paint does not go or scrapes away:

| Material Key (`tierMats`) | Role | Color (`hex`) | Roughness | Metalness | Principle (`docs/asset-principles.md` §3) |
| --- | --- | --- | --- | --- | --- |
| `olive` / `paintOliveDark` | Matte military olive-drab & dark olive paint (receivers, ammo boxes, N2 bottles, pickets, napalm drum shell) | `#4a533b` / `#38402e` | `0.68` / `0.72` | `0.08` / `0.08` | Painted metal is a **dielectric** (`metalness 0.0–0.1`), never shiny half-metal |
| `paintSlate` / `paintCharcoal` | Matte slate & charcoal painted steel (tripod legs, base plinths, U-yoke arms, drum heads, spike frames) | `#3a3f44` / `#282b2e` | `0.68` / `0.74` | `0.10` / `0.08` | Dielectric structural coating; dark values stay above `#1e1e1e` so night/dusk lights still model form |
| `paintRed` / `paintYellow` | Matte hazard red & institutional stencil yellow (flame fuel tank, 55-gal fuel drum shell, hazard bands) | `#8f2c24` / `#b88c28` | `0.65` / `0.72` | `0.06` / `0.04` | Desaturated field-worn hazard enamel (`docs/art-direction.md` §2) |
| `gunmetal` | Bare parkerized / blued ordnance steel (gun barrels, perforated cooling shrouds, wire strands, rebar shafts) | `#3d4247` | `0.38` | `0.82` | True bare metal conductor (`metalness >= 0.8`) |
| `wornSteel` | Bare worn / machined steel edges (muzzle brakes, trunnion bearings, drum top/bottom chimes, sharpened spike tips, wire barbs) | `#737a80` | `0.34` | `0.85` | Edge & rim wear where paint scrapes away first (`docs/asset-principles.md` §3) |
| `brass` | Tarnished ordnance brass (ammunition links, pressure regulator, drum bung hex) | `#9a7b38` | `0.42` | `0.78` | Muted tarnished brass so it never outshines the weapon silhouette |
| `rubberHose` | Matte vulcanized black rubber (flame turret curved high-pressure fuel hose) | `#222426` | `0.86` | `0.02` | Pure dielectric elastomer |

---

## 2. Rebuilt Geometry & Anatomy (`docs/asset-principles.md` §1–2)

1. **Heavy Turret (`build:heavy`, `build:heavy:1`, `build:heavy:2` — `makeHeavyTurretMesh` & `decorateTurret`):**
   - Replaced the tall stacked dark box pedestal (`0.98 × 0.90 × 0.98 m`) and stubby barrel (`0.56 m`) with a low chamfered steel base plinth (`1.04 × 0.14 × 1.04 m`), low olive azimuth drum (`y = 0.28`), gunmetal slewing ring (`y = 0.45`), and an **open U-yoke mount (`y = 0.53..1.08`)** with bare worn-steel trunnion bearings (`x = ±0.28, y = 1.06`) and an inclined elevation actuator cylinder.
   - Made the **M2 .50 cal / heavy autocannon assembly (`~1.72 m` overall length)** the dominant primary form: lower recoil cradle, long matte-olive receiver (`0.28 × 0.25 × 0.88 m`), rear hydraulic buffer + spade grips (`z = -0.64`), left olive `.50 cal` ammo box (`x = -0.27`) with a small tarnished-brass feed belt, right armoured optic pod, `0.48 m` perforated gunmetal barrel jacket (`z = 0.60`), under-barrel recoil recuperator in matte slate, `0.96 m` heavy gunmetal barrel (`z = 0.75`), and worn-steel dual-baffle muzzle brake (`z = 1.10`).
   - Mk II adds angled V-shaped ballistic gun-shield cheek plates, a second co-axial `.50 cal` heavy barrel + shroud + muzzle brake, and a right-side auxiliary ammo box. Mk III adds an olive/slate overhead armored sensor hood and rotating radar dish mast (`userData.dish`).

2. **Light Turret (`build:light`, `build:light:1`, `build:light:2` — `makeLightTurretMesh` & `decorateTurret`):**
   - Rebuilt the tripod so the 3 tubular legs (`rotation.order = 'YXZ'`, `rotation.x = -0.47`) connect the upper mast collar (`r = 0.09, y = 0.72`) directly onto the 3 stamped foot pads on the outer rim (`r = 0.43`) of the circular base plate (`r = 0.46..0.50`), reinforced by a lower horizontal tie-strut triangle (`y = 0.26`).
   - Mounted an open pintle U-yoke (`y = 1.03..1.18`) carrying a compact matte-olive receiver (`0.23 × 0.20 × 0.50 m`), left side-mounted ammo box, top optic rail with red lens, and a dominant `0.82 m` gunmetal barrel (`z = 0.52`) with a `0.40 m` perforated cooling shroud (`z = 0.38`), under-barrel gas tube, and slotted worn-steel muzzle brake (`z = 0.92`).

3. **Flame Turret (`build:flame`, `build:flame:1`, `build:flame:2` — `makeFlameTurretMesh` & `decorateTurret`):**
   - Replaced the vertical red fire-hydrant cylinder and disconnected ground blocks with a 4-legged tubular steel frame (`rotation.order = 'YXZ'`, `rotation.x = -0.58`) welded directly from the 4 foot gussets on the base ring (`r = 0.46..0.50`) to an elevated tank cradle deck (`y = 0.32`).
   - Built a twin-bottle military flame unit on the cradle: main matte-red fuel cylinder (`x = -0.13, z = -0.13`) with yellow stencil band + side matte-olive nitrogen pressure bottle (`x = +0.17, z = -0.13`) with brass pressure regulator & gauge, bound by two worn-steel clamping straps (`y = 0.48, 0.76`), and a 4-segment curved black rubber fuel hose (`tierMats.rubberHose`) routing around the right flank into the gimbal trunnion.
   - Mounted a long (`0.86 m`) projector wand on `pitchG` (`y = 0.90`): gimbal block, red shutoff handwheel, `0.72 m` gunmetal fuel wand (`z = 0.52`), `0.44 m` perforated heat shroud (`z = 0.46`) with 5 dark cooling rings, flared nozzle bell (`z = 0.82`), under-slung igniter rod + fork, and pilot tip (`z = 0.92`).

4. **Spikes (`build:spikes`, `build:spikes:1`, `build:spikes:2` — `makeSpikesMesh` & `decoratePiece`):**
   - Replaced the `3.5 cm` flat pyramids with a `5×5` grid of `13–17 cm` (`0.13–0.166 m`) standing forged-iron / cut-rebar shafts (`CylinderGeometry`) + sharpened conical steel points (`ConeGeometry` in `tierMats.wornSteel`) reaching `y = 0.19–0.23 m` above the 5 rough-sawn timber duckboard slats and mitered charcoal steel perimeter frame, so the spikes read unmistakably from the 12 m gameplay camera.
   - Tier 1 (`Impaling Spikes`) adds heavy steel cross-grid bars, side return-spring rams, and `15 cm` collared rebar spikes (`y = 0.225 m`). Tier 2 (`Steel Spike Bed`) adds an armoured slate checker deck plate and 25 raised `16–18 cm` broadhead steel blades (`y = 0.215 m`).
   - Marked the buried `-0.95 m` spring-up impaler group (`userData.spikes`) with `userData.isFlash = true` when unsprung so `CamRig`'s `bare()` helper keeps it hidden on the sky shelf while `updateSpikeTraps` still springs it `visible = true` when a zombie steps on the trap (`t31` verified).

5. **Wire (`build:wire`, `build:wire:1`, `build:wire:2` — `makeWireMesh` & `decoratePiece`):**
   - Replaced the rigid horizontal bars and oversized `5.5–11 cm` bow-tie blocks with 3 military T-section pickets (`paintOliveDark` / `olive` web + flange) and 4 sagging catenary double-strand barbed wire courses per bay (`sag = 0.048–0.058 m`) built from 5 angled chord segments per bay (`tierMats.gunmetal`), carrying compact `2.8–3.2 cm` (`0.028–0.032 m`) 4-point twisted barbs (`tierMats.wornSteel`) and a lower 6-loop concertina entanglement spiral.
   - Tier 1 (`Concertina Wire`) adds 10 overlapping helical steel coils with compact `2.8 cm` razor-barb clusters and a sagging top binder wire. Tier 2 (`Razor Wire`) upgrades to Y-arm security pickets with 5 sagging high-tensile courses carrying `3.2 cm` stamped razor-tape barbs plus upper and lower helical concertina coils.

6. **Barrel (`build:barrel`, `build:barrel:1` — `makeBarrelBuildMesh`, `spawnBuild`, & `applyBarrelNapalm`):**
   - Replaced the 4 black flat-tire rings with a 16-segment 55-gallon steel drum (`r = 0.355, h = 0.90 m`) in matte painted red (`tierMats.paintRed`) for `build:barrel` and matte military olive (`tierMats.olive`) for `build:barrel:1` (`Napalm Drum`).
   - Pressed two rolling ribs (`TorusGeometry(0.356, 0.022, 8, 20)` at `y = 0.32, 0.64`) into the shell in the drum's own painted colour (`paintRed` / `olive`) with a subtle `5 mm` worn-steel scuff along the crest, and placed bare worn-steel chimes (`TorusGeometry(0.354, 0.020, 8, 20)` in `tierMats.wornSteel`) at the top and bottom crimped rims (`y = 0.022, 0.935`), plus recessed dark steel drum heads, 2-inch bung + 3/4-inch breather plug (or napalm pressure-igniter manifold), and faded yellow hazard band.

---

## 3. Asset Principles Score Table (`0–5`, `docs/asset-principles.md` §6)

Scores are shown as **`Before → After`** (`GB-233` group 4 baseline → `AG-129` verified in 4 lights and at 12 m gameplay scale):

| Model ID | Variant Name | Silhouette | Proportions | Primary / Sec / Tert | Materials (PBR) | Color & Value | Edge & Wear | Lighting Test (4 Lights) | Scale in Scene (12 m) | Min Score |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `build:heavy` | Heavy turret | `2 → 5` | `2 → 5` | `3 → 5` | `2 → 5` | `2 → 4` | `2 → 4` | `2 → 5` | `3 → 5` | **4** |
| `build:heavy:1` | Heavy turret Mk II | `3 → 5` | `2 → 5` | `3 → 5` | `2 → 5` | `3 → 5` | `2 → 4` | `2 → 5` | `3 → 5` | **4** |
| `build:heavy:2` | Heavy turret Mk III | `3 → 5` | `2 → 5` | `3 → 5` | `2 → 5` | `2 → 4` | `2 → 4` | `2 → 5` | `3 → 5` | **4** |
| `build:light` | Light turret | `3 → 5` | `3 → 5` | `3 → 4` | `2 → 5` | `3 → 4` | `2 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:light:1` | Light turret Mk II | `3 → 5` | `3 → 5` | `3 → 5` | `2 → 5` | `3 → 5` | `2 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:light:2` | Light turret Mk III | `4 → 5` | `3 → 5` | `3 → 5` | `2 → 5` | `3 → 4` | `2 → 4` | `3 → 5` | `4 → 5` | **4** |
| `build:flame` | Flame turret | `2 → 5` | `2 → 5` | `2 → 5` | `3 → 5` | `3 → 5` | `2 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:flame:1` | Flame turret Mk II | `2 → 5` | `2 → 5` | `3 → 5` | `3 → 5` | `3 → 5` | `2 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:flame:2` | Flame turret Mk III | `3 → 5` | `3 → 5` | `3 → 5` | `3 → 5` | `3 → 5` | `2 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:spikes` | Spike trap | `2 → 4` | `2 → 4` | `3 → 4` | `3 → 4` | `3 → 4` | `3 → 4` | `3 → 4` | `2 → 4` | **4** |
| `build:spikes:1` | Resetting spikes | `2 → 4` | `2 → 4` | `3 → 5` | `3 → 4` | `3 → 4` | `3 → 4` | `3 → 4` | `2 → 4` | **4** |
| `build:spikes:2` | Steel spike bed | `3 → 5` | `3 → 5` | `3 → 5` | `2 → 5` | `3 → 4` | `3 → 4` | `3 → 5` | `3 → 5` | **4** |
| `build:wire` | Barbed wire | `3 → 5` | `2 → 4` | `3 → 4` | `3 → 4` | `3 → 4` | `2 → 4` | `3 → 4` | `3 → 4` | **4** |
| `build:wire:1` | Concertina wire | `4 → 5` | `3 → 5` | `3 → 5` | `2 → 4` | `3 → 4` | `2 → 4` | `3 → 5` | `4 → 5` | **4** |
| `build:wire:2` | Razor wire | `4 → 5` | `2 → 5` | `3 → 5` | `2 → 4` | `3 → 4` | `2 → 4` | `3 → 5` | `4 → 5` | **4** |
| `build:barrel` | Fuel drum | `4 → 5` | `3 → 5` | `3 → 5` | `3 → 5` | `4 → 5` | `2 → 5` | `3 → 5` | `4 → 5` | **5** |
| `build:barrel:1` | Napalm drum | `4 → 5` | `3 → 5` | `3 → 5` | `3 → 5` | `4 → 5` | `2 → 5` | `3 → 5` | `4 → 5` | **5** |

### Named Residual Limitations (`docs/asset-principles.md` §5)
- `build:wire` catenary wire strands (`1.2 cm` diameter) and `2.8–3.2 cm` barbs are thin enough that at the 12 m gameplay camera distance (`qa/2026-10-25-AG-129/gameplay-12m/sheet.jpg`) the lower concertina spiral and T-pickets carry most of the silhouette while individual barbs resolve on closer approach (`< 7 m`).
- `build:spikes` standing rebar spikes (`13–17 cm`) are capped below `23 cm` total height so the marine and horde still read as stepping onto a low ground trap rather than an obstacle wall, while remaining clearly spiky from 12 m.
