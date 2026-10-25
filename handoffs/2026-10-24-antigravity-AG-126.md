# antigravity — AG-126 The principles pass: the contact sheets, and Antigravity's areas (D-89) — 2026-10-24
Changed:          Generated all 20 four-light (`noon`, `overcast`, `dusk`, `night`) principles contact sheets across all 5 `tools/camera.mjs` model groups (`buildables`, `turrets`, `weapons`, `zombies`, `people`) in `review/principles/<group>-<light>/sheet.jpg`. Audited all 36 buildable & turret models against `docs/art-direction.md` and `docs/asset-principles.md` (Rule 19) and upgraded every sub-4/5 piece (`build:barrel`, `build:barrel:1`, `build:lure:1`, `build:lure:2`, `build:mortar:1`, `build:mortar:2`, `build:light` Mk I–III, `build:flame` Mk I–III, `build:heavy` Mk I–III) so all 36 pieces score >= 4/5 across all 6 categories.
Files:            index.html, review/principles/*, qa/2026-10-24-AG-126/*, handoffs/2026-10-24-antigravity-AG-126.md
Tests:            node tools/test.js --grep "t25|t31|t215" → 3 checks: 59 pass, 0 fail (t25: 29/0, t31: 26/0, t215: 4/0); new tests: none
Screenshots:      Before: qa/2026-10-24-AG-126/before/buildables-noon-sheet.jpg, qa/2026-10-24-AG-126/before/build-*.png; After: review/principles/{buildables,turrets,weapons,zombies,people}-{noon,overcast,dusk,night}/sheet.jpg and qa/2026-10-24-AG-126/after/*
Not verified:     Full npm test suite not run (per Rule 16, only targeted buildable/turret & encoding checks t25, t31, t215 run in the slot).
Requests:         FYI sent to claude, chatgpt, and grokbot with paths to review/principles/{people,zombies,weapons,turrets}-{noon,overcast,dusk,night}/sheet.jpg
Contract changes: none

---

## 1. All 20 Four-Light Principles Contact Sheets (`review/principles/`)

Generated via `tools/camera.mjs` in a single batched game-test slot session across all 4 lighting conditions (`noon`, `overcast`, `dusk`, `night`) at gameplay scale:

| Group | Owner | Noon | Overcast | Dusk | Night |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`buildables`** (36 models) | Antigravity | `review/principles/buildables-noon/sheet.jpg` | `review/principles/buildables-overcast/sheet.jpg` | `review/principles/buildables-dusk/sheet.jpg` | `review/principles/buildables-night/sheet.jpg` |
| **`turrets`** (12 models) | Antigravity / Grokbot | `review/principles/turrets-noon/sheet.jpg` | `review/principles/turrets-overcast/sheet.jpg` | `review/principles/turrets-dusk/sheet.jpg` | `review/principles/turrets-night/sheet.jpg` |
| **`weapons`** (18 models) | Grokbot (`GB-125`) | `review/principles/weapons-noon/sheet.jpg` | `review/principles/weapons-overcast/sheet.jpg` | `review/principles/weapons-dusk/sheet.jpg` | `review/principles/weapons-night/sheet.jpg` |
| **`zombies`** (14 models) | ChatGPT (`GP-153`) | `review/principles/zombies-noon/sheet.jpg` | `review/principles/zombies-overcast/sheet.jpg` | `review/principles/zombies-dusk/sheet.jpg` | `review/principles/zombies-night/sheet.jpg` |
| **`people`** (4 models) | Claude (`CL-265`) | `review/principles/people-noon/sheet.jpg` | `review/principles/people-overcast/sheet.jpg` | `review/principles/people-dusk/sheet.jpg` | `review/principles/people-night/sheet.jpg` |

Copies of all 20 sheets and close-up before/after PNGs are also archived in `qa/2026-10-24-AG-126/before/` and `qa/2026-10-24-AG-126/after/`.

---

## 2. Antigravity's Buildables & Turrets Pass (Worst First, Rule 19)

### Upgrades Made in `index.html (build meshes)`

1. **`build:barrel` (Red drum) & `build:barrel:1` (Napalm drum) — `makeBarrelBuildMesh` & `applyBarrelNapalm`:**
   - **Before defect (2.7/5):** `applyBarrelNapalm` placed 3 square `BoxGeometry` slabs (`0.96 × 0.08 × 0.96`) on a round `r=0.45` cylinder, leaving square corners sticking out into mid-air around the drum (`Construction = 2`, `Silhouette = 3`).
   - **Fix:** Added a painted hazard band, top steel bung plug, and front stencil plaque to `makeBarrelBuildMesh`. Replaced the square boxes in `applyBarrelNapalm` with cylindrical olive-drab armour jacket bands (`CylinderGeometry`), 4 black steel chime rings, 4 vertical steel clamping ribs with brass tension bolts, a top brass pressure-igniter manifold with handwheel and glowing red armed thermal fuze cap, and angled diamond napalm hazard placards.
2. **`build:mortar:1` (Mortar Mk II) & `build:mortar:2` (Mortar Mk III) — `decoratePiece` (`piece.type === 'mortar'`):**
   - **Before defect (2.8/5):** `mortar:1` placed 6 raw un-bevelled tan `BoxGeometry` cubes in a circle and 1 raw green box beside the baseplate; `mortar:2` only added a tiny cylinder on the tube (`Silhouette = 3`, `Detail hierarchy = 2`, `Construction = 3`).
   - **Fix:** Replaced the raw cubes with a 2-course staggered multi-tone burlap sandbag parapet (`_rbox` with `tierMats.burlap` tones and `tierMats.burlapDark` waist twine seams) and an olive-drab 60mm mortar ammunition crate (timber lid, corner cleats, brass latches, and 2 standing 60mm mortar bomb canisters with brass fuzes). On `mortar:2` (Mortar Mk III), added a stepped armoured turntable baseplate with locking lugs, a parallel secondary mortar barrel with breach cooling fins, brass muzzle collar, and figure-8 twin-barrel steel yoke clamp, plus a bevelled optical ballistic fire-control rangefinder with brass elevation drum and hooded red lens.
3. **`build:light`, `build:light:1`, `build:light:2` (Light turret Mk I–III) — `makeLightTurretMesh` & `decorateTurret`:**
   - **Before defect (3.2/5):** The barrel was painted bright glowing cyan-blue (`0x38bdf8` / emissive `0x0284c7`), violating `docs/art-direction.md` §4 (which reserves cyan/ice-blue for electric/uncanny effects like the Shock fence and Shock beacon), and the head was a plain capsule with a single stub (`Material & color = 2`, `Construction = 3`).
   - **Fix:** Grounded the Light turret in **The military** palette: gunmetal barrel (`0x1e2530`), perforated dark-steel barrel cooling shroud with vent rings and slotted muzzle brake, bevelled receiver housing with top cooling fins, side-mounted olive-drab ammunition box (`0x3d4a30`) with lid latches and brass feed chute, hooded red optical target lens (`0xff3b30`), and (on Mk III) an angled V-profile ballistic gun shield with brass sighting bar and twin-barrel shroud collars.
4. **`build:flame`, `build:flame:1`, `build:flame:2` (Flame turret Mk I–III) — `makeFlameTurretMesh` & `decorateTurret`:**
   - **Before defect (3.2/5):** Plain cylinder on a flat disc with 4 floating square blocks around the base (`Silhouette = 3`, `Detail hierarchy = 3`, `Construction = 3`).
   - **Fix:** Added a stepped 12-sided turntable base with 4 ground anchor shoes and bolts, lower/upper steel tank clamping bands with side weld seams, top brass pressure-relief manifold and gauge, gimballed trunnion mount, perforated heat shroud, under-slung igniter wand (`pilot`), domed auxiliary twin tanks with brass valve caps and clamp straps on Mk II/III, and a flanged nozzle heat shield + flared brass venturi cone on Mk III.
5. **`build:heavy`, `build:heavy:1`, `build:heavy:2` (Heavy turret Mk I–III) — `makeHeavyTurretMesh` & `decorateTurret`:**
   - **Before defect (3.3/5):** Un-bevelled stacked dark boxes with low material separation (`Detail hierarchy = 3`, `Material & color = 3`).
   - **Fix:** Built a bevelled bunker plinth with 4 corner anchor shoes & bolts, geared traverse ring, bevelled lower pedestal with side access hatches, sloped armour turret cheeks with steel rivets, side olive-drab ammo cassette drum, gunmetal autocannon barrel with perforated jacket, muzzle brake, and brass recoil recuperator sleeve, sloped side armour skirts on Mk II/III, and a bevelled carapace hood + rimmed parabolic radar dish with brass feed horn (`u.dish`) on Mk III.
6. **`build:lure:1` (Siren beacon) & `build:lure:2` (Shock beacon) — `decoratePiece` (`piece.type === 'lure'`):**
   - **Before defect (3.7/5):** Base `baseHorn` and `baseStrobe` were only hidden via `.visible = false`, so `CamRig`'s `bare()` visibility reset turned the base horn and red strobe back on inside the Tier 1 Siren cluster and Tier 2 Tesla coil rings.
   - **Fix:** Removed `u.baseHorn` and `u.baseStrobe` from their parent when upgrading to Tier 1+ so the Siren and Shock beacons have clean silhouettes in both gameplay and inspection.

---

## 3. Rule 19 Asset Principles Score Table (0–5) — All 36 Buildables & Turrets

Every model was evaluated across the four lighting conditions (`noon`, `overcast`, `dusk`, `night`) at gameplay scale against `docs/art-direction.md` and `docs/asset-principles.md` (§5):

| ID | Name | Family | Silh. (B→A) | Prop. (B→A) | Mat/Col (B→A) | Detail (B→A) | Constr. (B→A) | Context (B→A) | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `build:wall` | Wood barricade | The valley / military | 4→4 | 5→5 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:wall:1` | Sandbag wall | The military | 5→5 | 5→5 | 5→5 | 4→4 | 5→5 | 5→5 | Pass |
| `build:wall:2` | Hesco bastion | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:gate` | Gate | The valley / military | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | 5→5 | Pass |
| `build:gate:1` | Reinforced gate | The military | 5→5 | 4→4 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:gate:2` | Electric gate | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:spike` | Cheval de frise | The valley / military | 5→5 | 5→5 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:spike:1` | Razor wire | The military | 5→5 | 5→5 | 4→4 | 5→5 | 5→5 | 5→5 | Pass |
| `build:spike:2` | Tank trap | The military | 5→5 | 5→5 | 5→5 | 4→4 | 5→5 | 5→5 | Pass |
| `build:shock` | Shock fence | The military | 4→4 | 5→5 | 5→5 | 4→4 | 5→5 | 5→5 | Pass |
| `build:shock:1` | Arc fence | The military | 5→5 | 5→5 | 5→5 | 4→4 | 5→5 | 5→5 | Pass |
| `build:shock:2` | Tesla barrier | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:mud` | Tar pit | The valley / military | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | Pass |
| `build:mud:1` | Tangle pit | The military | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | Pass |
| `build:mud:2` | Caustic pit | The military | 4→4 | 4→4 | 5→5 | 4→4 | 4→4 | 4→4 | Pass |
| `build:tower` | Watchtower | The valley / military | 5→5 | 5→5 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:tower:1` | Fortified tower | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:tower:2` | Bunker tower | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:flood` | Floodlight | The military | 4→4 | 5→5 | 4→4 | 4→4 | 4→4 | 5→5 | Pass |
| `build:flood:1` | Twin floodlight | The military | 5→5 | 5→5 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:flood:2` | UV arc lamp | The military | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | 5→5 | Pass |
| `build:lure` | Thumper beacon | The military | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | 4→4 | Pass |
| `build:lure:1` | Siren beacon | The military | 4→5 | 4→5 | 4→4 | 4→4 | 3→5 | 4→5 | **Upgraded** |
| `build:lure:2` | Shock beacon | The military | 4→5 | 4→5 | 5→5 | 4→5 | 3→5 | 4→5 | **Upgraded** |
| `build:barrel` | Red drum | The military | 4→4 | 5→5 | 4→5 | 3→4 | 4→5 | 5→5 | **Upgraded** |
| `build:barrel:1` | Napalm drum | The military | 3→5 | 3→5 | 3→5 | 3→5 | 2→5 | 4→5 | **Upgraded** |
| `build:light` | Light turret | The military | 4→5 | 4→5 | 2→5 | 3→4 | 3→5 | 4→5 | **Upgraded** |
| `build:light:1` | Light turret Mk II | The military | 4→5 | 4→5 | 2→5 | 3→5 | 3→5 | 4→5 | **Upgraded** |
| `build:light:2` | Light turret Mk III | The military | 4→5 | 4→5 | 3→5 | 3→5 | 3→5 | 4→5 | **Upgraded** |
| `build:flame` | Flame turret | The military | 3→4 | 4→4 | 3→5 | 3→4 | 3→5 | 4→5 | **Upgraded** |
| `build:flame:1` | Flame turret Mk II | The military | 4→5 | 4→5 | 3→5 | 3→5 | 3→5 | 4→5 | **Upgraded** |
| `build:flame:2` | Flame turret Mk III | The military | 4→5 | 4→5 | 4→5 | 3→5 | 3→5 | 4→5 | **Upgraded** |
| `build:heavy` | Heavy turret | The military | 4→5 | 4→5 | 3→5 | 3→4 | 3→5 | 4→5 | **Upgraded** |
| `build:heavy:1` | Heavy turret Mk II | The military | 4→5 | 4→5 | 3→5 | 3→5 | 4→5 | 4→5 | **Upgraded** |
| `build:heavy:2` | Heavy turret Mk III | The military | 4→5 | 4→5 | 4→5 | 4→5 | 4→5 | 4→5 | **Upgraded** |
| `build:mortar` | Mortar pit | The military | 5→5 | 5→5 | 4→4 | 4→4 | 5→5 | 5→5 | Pass |
| `build:mortar:1` | Mortar Mk II | The military | 3→5 | 3→5 | 3→5 | 2→5 | 3→5 | 3→5 | **Upgraded** |
| `build:mortar:2` | Mortar Mk III | The military | 3→5 | 3→5 | 3→5 | 2→5 | 3→5 | 3→5 | **Upgraded** |

---

## 4. Verification & Rule 16 Slot Record

- **Rule 16 Game-Test Slot:** All camera sheets and verification tests (`t25`, `t31`, `t215`) were queued and executed in a single slot run (`node crew/crew.mjs slot run antigravity AG-126 --checks "principles-4-light-sheets-and-tests" -- node .../run-principles-sheets.mjs`), which closed its browser cleanly and released the slot on completion.
- **Test Output:**
  - `PASS t25 — T25 — Turret targeting & emplaced mortar (29/0, 4.9s)`
  - `PASS t31 — T31 — Build-tier visual upgrades (GP-15 / D-20) (26/0, 6.2s)`
  - `PASS t215 — T215 — No mojibake in source files (CL-132) (4/0, 0.3s)`
  - **`3 checks: 59 pass, 0 fail (11.4s)`**
