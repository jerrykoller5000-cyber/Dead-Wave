# Antigravity — AG-123 The FOB overhaul with the generator moved (N18, N19), per docs/sweep/hq.md — 2026-10-24
Changed:          Overhauled FOB Threshold (`makeHouse`, `buildHQMenace`, `buildFobYard`, `terrainColorAt`, `updateHQ` in `index.html`) per `docs/sweep/hq.md` (N18, N19) under Rules 17 and 19 (`Military` family): weathered poured-concrete blockhouse with damp base courses, rain/rust streaks, roof comms (whip antenna + dish), north utility wall (junction box, conduit, 3-jerrycan rack, wooden pallet pad under the moved `hq-generator` at `(-3.0, 6.7)` + two 200L fuel drums with hand pump), 6 m packed-gravel compound apron with south-east tyre ruts, broken 12–14 m HESCO/sandbag perimeter (including a burst NE breach and toppled floodlight) with clear gaps at all 5 trails, south trail sandbag guard post (with ammo tin, 24 brass casings, fallen helmet) and leaning stencilled `"FOB THRESHOLD · PGB"` sign, burned-out east tent frame, armory crates/pallet, and warm amber sodium lamps over all four working hatches. Also verified `CL-262` (windy spell), `CL-260` (first-person run-aim & supply drop notice), and `GP-19966` (bird flock) on Jerry's RTX 5080.
Files:            index.html, docs/sweep/numbers/hq.md, review/sweep/hq/sheet.jpg, qa/2026-10-24-AG-123/
Tests:            node tools/tests/run-all.mjs --jobs 1 t21 t125 t167 t179 t215 t267 t289 t290 t291 → 9 checks: 159 pass, 0 fail (t21 16/0, t125 10/0, t167 20/0, t179 27/0, t215 4/0, t267 24/0, t289 13/0, t290 19/0, t291 12/0); new tests: none
Screenshots:      Before: qa/2026-10-24-AG-123/before-hq-{from-north,from-east,from-south,from-west,above,night}.png. After: qa/2026-10-24-AG-123/after-hq-sheet.jpg, qa/2026-10-24-AG-123/details-sheet.jpg, qa/2026-10-24-AG-123/lights-sheet.jpg (light-{noon,overcast,dusk,night}.png), qa/2026-10-24-AG-123/wind-sheet.jpg, qa/2026-10-24-AG-123/fp-run-aim-{m4,ak,pistol}.png, qa/2026-10-24-AG-123/fp-supply-drop-claim.png, qa/2026-10-24-AG-123/gp19966-flock-gpu.png
Not verified:     Full test suite (`npm test`) left to the coordinated integration gate per Rule 16.
Requests:         Replied DONE to ChatGPT ("GP-19966 GPU review: flock wings and flight") and DONE to Claude ("shots: the windy spell, first person on the run; AG-123 under the new rules").
Contract changes: none

---

## 1. Art Direction & Spatial Design Compliance (Rules 17 & 19)

- **Art Family (`docs/art-direction.md` §1):** **Military** (PGB, FOB Threshold — olive drab `#48523b`/`#3b4631`, field green, gunmetal `#2d3134`, faded institutional hazard yellow `#b5954a`, stencil white `#d8d3c2`, weathered HESCO tan geotextile `#8b7e66`, burlap sandbags `#9a8b6d`) paired with **Industrial** permanent brutalist concrete (`#969b94` walls, `#6e736c` trim, `#5a5f58` damp splash base, rain/rust streaks under the parapet) and reserved **Sodium amber** lamp pools (`#ffd894` / emissive `#ff9d24`) over the working hatches.
- **World Design Rules Served (`docs/world-design.md` & `docs/sweep/hq.md`):**
  1. **Rule 1 (Anchor) & Rule 10 (Lighting):** Weathered concrete blockhouse (`conc = 0x969b94`, `concFoot = 0x5a5f58`), vertical rain/rust streaks from parapet joints, NW roof whip antenna (`3.35 m`) + dish (`0.84 m`), north wall junction box + conduit + 3-jerrycan rack, and caged amber sodium lamps under hoods over the West (skull window + kiosk), East (CIF + Armory), and South (alarm panel) hatches with warm night light pools.
  2. **Rule 2 (Connection), Rule 6 (Edge Treatment) & Rule 9 (Ground Integration):** 6 m packed-gravel compound apron (`terrainColorAt` at `r <= 11.1 m` with gravel grit and cleared grass/flowers via `clearFoliageInSquare`) and two ground-hugging tyre ruts (`fob-tyre-ruts-1`, `fob-tyre-ruts-2`, `h = 0.038 m < 0.08 m`) curving from the south trail gap `(6.0, -12.2)` into the SE yard `(3.2, -6.3)`.
  3. **Rule 3 (Supporting Objects), Rule 7 (Scale Hierarchy), Rule 11 (Sightlines) & Rule 15 (Functional Logic):**
     - **North Utility Side (`z = +6.65..6.70`):** Slatted wooden pallet pad (`fob-gen-pad` at `(-3.0, 6.7)`) seating the relocated `hq-generator` (`GB-229`) alongside two 200L fuel drums on a pallet (`fob-fuel-drums` at `(-4.55, 6.65)`) with a rotary hand transfer pump.
     - **South Trail Entrance (`z = -12.4..-12.6`):** Sandbag guard post (`fob-guard-post` at `(0.85, -12.6)`) and leaning stencilled sign (`fob-threshold-sign` at `(3.75, -12.4)`, `"FOB THRESHOLD · PGB / PERIMETER SECTOR 01 — RESTRICTED AREA"`).
     - **Broken Perimeter (`r = 12–14 m`):** 5 intact HESCO bastions (`fob-hesco-sw1`, `fob-hesco-sw2`, `fob-hesco-w`, `fob-hesco-nw`, `fob-hesco-e`) + 1 burst NE breach (`fob-hesco-ne-breach` at `(5.6, 11.8)`) with bent mesh, spilled sand mound, and tumbled sandbags; all 5 incoming trails keep `>= 4 m` clear gaps; registered in `landmarks` with `spawnColliders` so `inTheWay` blocks building on them (`t21` 16/0).
     - **East Yard:** Crates/ammo boxes on a pallet (`fob-armory-crates` at `(6.58, 0.05)`) beside the Armory hatch, burned-out tent frame (`fob-burned-tent` at `(9.4, -1.2)`) with charred ribs and overturned cots, and toppled floodlight (`fob-toppled-floodlight` at `(3.2, 10.2)`).
  4. **Rule 4 (Micro-Details) & Rule 14 (No Floating/Clipping):** 24 spent brass casings (`0.012 m`) and a fallen olive-drab combat helmet (`0.28 m`) on the gravel behind the south guard post; `docs/sweep/numbers/hq.md` reports **0 overlaps**, **0 floating props**, and **0 buried props** across all 36 compound objects.

---

## 2. Rule 19 Four-Light Inspection & 0–5 Visual Quality Control Score Table

### Four-Light Renders (`qa/2026-10-24-AG-123/lights-sheet.jpg`, camera at `(10.5, 2.2, -16.2)` looking at `(0, -0.8, 0)`, gameplay scale with 1.8 m marine)
1. **Noon Sun (`t = 0.50`, `light-noon.png`):** Crisp value separation between weathered poured concrete (`#969b94`), dark structural steel pilasters (`#24272a`), damp base plinth (`#5a5f58`), gravel apron, olive-drab crates, and tan HESCO bastions.
2. **Overcast / Rain (`t = 0.44`, `weather.intensity = 0.88`, `light-overcast.png`):** Soft ambient contrast holds form without blowing out; parapet drip streaks and darker wet base courses ground the blockhouse into the wet gravel apron.
3. **Dusk Golden Hour (`t = 0.71`, `light-dusk.png`):** Silhouette of the roof watchtower, whip antenna, parabolic dish, and perimeter HESCO bastions reads clearly against the warm dusk sky while the sodium hatch lamps begin to take over local focal hierarchy.
4. **Night with Sodium Lamps & Flashlight (`t = 0.00`, `light-night.png`):** Warm amber sodium pools (`#ffd894`/`#ff9d24`) under the East, South, and West hatch hoods establish immediate focal hierarchy and guide the player to the working stations without washing out the compound.

### 0–5 Asset Quality Score Table (`docs/asset-principles.md` §VII — Before vs. After `AG-123`)

| Category | Before (`1.0`) | After (`AG-123`) | Notes / Evidence |
| --- | :---: | :---: | --- |
| **Silhouette** | 2 | **5** | Before: bare dark cube in an empty green meadow. After: unmistakable fortified military compound silhouette from roof comms (`3.35 m` whip + dish) down to stepped HESCO bastions, guard post, and leaning perimeter sign (`after-hq-sheet.jpg`). |
| **Proportions** | 3 | **5** | Checked against the 1.8 m marine in `lights-sheet.jpg` and `detail-north-generator-drums.png`: HESCO bastions `1.36 m` (`0.76×` marine), sign `1.88 m` (`1.04×`), guard post `1.06 m` (`0.59×`), fuel drums `1.46 m` (`0.81×`), crates `0.80 m` (`0.44×`). |
| **Construction** | 2 | **5** | Every prop shows physical construction: HESCO wire-mesh frames around geotextile liners with sand fill, sandbag courses tied with timber stakes and duckboard step, sign bolted to front of twin posts, generator seated on slatted timber pallet under conduit box (`details-sheet.jpg`). |
| **Topology** | 4 | **5** | Clean box/cylinder/extrude primitives with bevels/hoods where silhouette demands it; zero degenerate faces or z-fighting; static HQ meshes remain folded via `bakeStaticGroup`. |
| **Geometry efficiency** | 4 | **4** | All new compound landmarks use shared materials and low-poly modular primitives; compound holds `51.3–60.4 fps` even during a full 88-leaf windy spell on RTX 5080. |
| **UV quality** | 3 | **4** | Canvas signs (`FOB THRESHOLD · PGB`), hazard stripes (`makeHazardTexture`), and stencil plates map cleanly without stretching or post clipping (`detail-south-guardpost-sign.png`). |
| **Materials** | 2 | **5** | Distinct PBR responses (`docs/art-direction.md` §1): matte poured concrete (`roughness 0.88–0.95`), brushed/painted structural steel (`metalness 0.45–0.75, roughness 0.42–0.58`), geotextile/burlap (`roughness 0.92–0.96`), charred wood (`roughness 0.95`), and emissive sodium glass (`emissiveIntensity 1.85`). |
| **Textures** | 2 | **4** | Scuffed hazard band texture, directional rain/rust streaks below parapet joints, high-frequency gravel apron grit in `terrainColorAt`, and legible stencilled signage. |
| **Color** | 2 | **5** | Follows 60/30/10 distribution and saturation cap (`< 45%` on concrete, gravel, HESCO tan, olive drab), reserving saturated hues strictly for functional cues (warm sodium amber at hatches, green/red status LEDs). |
| **Style** | 2 | **5** | Fully aligned with `docs/art-direction.md` Military + Industrial families; tells the story of a fortified PGB outpost that held until the NE perimeter breached. |
| **Readability** | 2 | **5** | Tested across all 4 lights (`lights-sheet.jpg`), 6 cardinal/aerial sweep angles (`after-hq-sheet.jpg`), and eye-level close-ups (`details-sheet.jpg`). Working hatches, trails, and buildable yard boundaries read immediately day and night. |
| **Integration** | 3 | **5** | All 5 incoming trails have `>= 4 m` clear openings; `inTheWay` and `spawnColliders` integrate with the 2 m build grid (`t21` 16/0); `hq-generator` spawns directly onto `fob-gen-pad` (`t267` 24/0); `docs/sweep/numbers/hq.md` has 0 overlap/float/buried flags. |

---

## 3. GPU Verification of `CL-262`, `CL-260`, and `GP-19966` (`qa/2026-10-24-AG-123/gpu-review-metrics.json`)

1. **`CL-262` Windy Spell (`wind-sheet.jpg`, `wind-{fob,forest}-{day,night}.png`, `t290` 19/0):**
   - Triggered `TT.windDbg.spell.timer = 0` and stepped to peak gale (`spell.w = 0.92–0.96`, `wind.gale = 0.92–0.96`).
   - `85–88` leaves blow past in a single `InstancedMesh` draw (`instancedDraw: true`), with trees, grass, and reeds leaning into the gust.
   - **RTX 5080 FPS:** FOB Day `51.3 fps` (`low 37.0`), FOB Night `60.4 fps` (`low 50.8`), Forest Day `49.3 fps` (`low 34.2`), Forest Night `54.5 fps` (`low 39.5`).
   - **Visual note for Claude:** Each leaf quad is `2–4 px` wide from the standard third-person camera (`7–9 m` back); scaling the leaf geometry ~1.6–2× would make the blowing leaves read even better in third person.
2. **`CL-260` First Person on the Run & Supply Drop Notice (`fp-run-aim-{m4,ak,pistol}.png`, `fp-supply-drop-claim.png`, `t289` 13/0, `t291` 12/0):**
   - **Supply drop claim (`fp-supply-drop-claim.png`):** `"SUPPLY DROP · Ammo restocked · +1 MedPen"` renders centered under the crosshair (`cx = 800, top = 578, 297×29 px, opacity = 1`), matching `#supplyNotice`.
   - **Run with right-click held (`m4`, `ak`, `pistol`):** Camera pitch bounce is eliminated (`0.00°–0.01°`) and camera vertical wobble is damped (`0.62 cm` AK, `1.09 cm` Pistol, `2.14 cm` M4 vs `2.21–2.36 cm` sight wobble) at `50.8–56.6 fps`.
   - **Visual note for Claude:** Because `firstPersonSightSteady` steadies the camera eye while the held gun still swings laterally/vertically with the sprint stride (`2.2–2.4 cm`), during sprint-ADS the gun shifts off the steadied camera axis (`fp-run-aim-ak.png` shows the AK dust cover/rear block swung right across the eye; `fp-run-aim-pistol.png` shows the pistol sights swung down-left while the iron-sight crosshair is hidden). Damping the gun/arm stride sway by `fpAdsW` in first person (in `CL-260` part 2 / `GB-228`) will keep the sights aligned with the steadied eye while running.
3. **`GP-19966` Bird Flock GPU Review (`gp19966-flock-gpu.png`):**
   - Verified in live flight on RTX 5080 (`53.3 fps`): all 6 birds have 1 continuous swept mesh per wing (`piecesPerWing: [1, 1]`, no box-panel seam), 6 distinct flap rates (`4.92–6.98`) and phases (`0.89–5.36`), independent positions, and smooth banking roll (`-0.040..+0.029 rad`).

*(Rule 16 compliance: All browser tests, sweep runs, and camera sessions were executed exclusively through `node crew/crew.mjs slot run`, one browser instance at a time.)*
