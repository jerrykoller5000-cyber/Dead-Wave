# antigravity — AG-135 The trapper's cellar (story-chain.md §4, day 8; from CL-263) — 2026-10-26
Changed:          Modeled the trapper's hinged bulkhead cellar doors (shut with an iron locking bar until `trapperPath.unlocked()`, folding open to `±1.92 rad` with riveted dark-iron underside liners once unlocked, and re-closing on run reset) and built the underground iron-lined cellar room beneath them at `campsites[2]` with an 8-step stairwell, riveted iron walls with rust streaks and upward-pointing horseshoes, a `1.20m × 1.20m` overhead iron bar grate skylight where the dead walk straight past overhead, Okafor's bunk/lantern/shelves, 3P roof cutaway, and `trapper.cellarSpot` for `GB-232`.
Files:            game/trapper-path.js, game/trapper-path.test.mjs, index.html, tools/tests/t268.js, qa/2026-10-26-AG-135/capture-ag135.mjs, qa/2026-10-26-AG-135/report.json
Tests:            node --test game/trapper-path.test.mjs → 5 pass, 0 fail; targeted browser suite (t52, t55, t167, t215, t268, t292) → 91 pass, 0 fail
Screenshots:      qa/2026-10-26-AG-135/cellar-doors-4lights-sheet.jpg, qa/2026-10-26-AG-135/cellar-interior-sheet.jpg, qa/2026-10-26-AG-135/cellar-shut-noon.png, qa/2026-10-26-AG-135/cellar-shut-overcast.png, qa/2026-10-26-AG-135/cellar-shut-dusk.png, qa/2026-10-26-AG-135/cellar-shut-night.png, qa/2026-10-26-AG-135/cellar-open-noon.png, qa/2026-10-26-AG-135/cellar-open-overcast.png, qa/2026-10-26-AG-135/cellar-open-dusk.png, qa/2026-10-26-AG-135/cellar-open-night.png, qa/2026-10-26-AG-135/cellar-stairs-descent-noon.png, qa/2026-10-26-AG-135/cellar-interior-3p-noon.png, qa/2026-10-26-AG-135/cellar-interior-3p-overcast.png, qa/2026-10-26-AG-135/cellar-interior-3p-dusk.png, qa/2026-10-26-AG-135/cellar-interior-3p-night.png, qa/2026-10-26-AG-135/cellar-interior-1p-walls-noon.png, qa/2026-10-26-AG-135/cellar-interior-1p-grate-zombies-noon.png, qa/2026-10-26-AG-135/cellar-interior-3p-zombies-overhead-dusk.png
Not verified:     Full-suite integration run (deferred to Cursor's coordinated integration job per Rule 16).
Requests:         FYI sent to Grokbot (`GB-232`: `trapper.cellarSpot`, `trapper.inCellar`, `trapper.doorsOpen`) and Claude (`AG-135` complete).
Contract changes: none

---

## 1. Art Direction, World Design & Asset Score Table (Rules 17 & 19)

- **Art Family (`docs/art-direction.md` §1 & §2):** **Settler and civil** (weathered pine planks `#6d553c`/`#5b4632`/`#4b3a28`, fieldstone bulkhead cheeks `#747066`/`#646158`, olive wool blanket `#4a5239`, stoneware crocks `#8c7a64`, warm oil lantern `#ffb84d`) + **The Iron Rule (`docs/art-direction.md` §2)**: heavy riveted dark-iron wall plates (`#363b37`, `#2d322e`, `#404540`), forged-iron batten straps (`#262a27`), raised rivet heads (`#5c615b`), weeping rust streaks (`#795438`), iron-lined underside of both cellar door leaves, and upward-pointing forged-iron horseshoes nailed to the lintel and cellar stanchions.
- **Spatial World Rules (`docs/world-design.md`):**
  - **Rule 1 (Approach & Framing):** Seated at the head of the `AG-124` 8-row fenced yard (`lz = -0.34 .. -5.06`); `objective:trapper-cache` sits on the right stone threshold plinth (`(+0.62, +0.10)`) so the stair entrance (`lx = 0`) is visually and physically clear once the doors fold open.
  - **Rule 8 (Grounded Transitions):** Wide forest-floor turf and stone threshold aprons (`lx ∈ [-4.80, +4.80], lz ∈ [-8.00, +1.25]`) seal the terrain transition around the excavated stairwell and root-cellar mound with zero floating edges or terrain bleed.
  - **Rule 12 (Story & Lived-In Detail):** Inside the `3.24m × 2.78m` iron-lined cellar (`y = cy0 - 2.15 .. cy0 - 0.14`), Okafor's survival refuge features a timber bunk with olive wool blanket and canvas bedroll, a crate side-table with a warm `PointLight` oil lantern and enamel mug, a two-tier storage rack with preserve crocks, ration tins, spare leghold traps, and a water pail, and a central `1.20m × 1.20m` open forged-iron bar grate skylight overhead through which the dead are seen walking straight past overhead (`story-chain.md` §4 Day 8).

| Category (`docs/asset-principles.md`) | Score (0–5) | Notes & Evidence |
| --- | :---: | --- |
| **1. Silhouette & Proportions** | **5 / 5** | Sloped fieldstone bulkhead cheeks (`-0.162 rad`), heavy double cellar doors folding open to `±1.92 rad` (`~110°`), 8-step timber-and-iron stairwell (`1.24m` wide), and `3.24m × 2.78m × 2.01m` underground cellar room read unmistakably at gameplay scale in both 1P and 3P. |
| **2. Material & Value Separation** | **5 / 5** | Clear value/roughness contrast between weathered timber planks (`roughness: 0.86`), forged dark-iron liner plates and batten straps (`#2d322e` / `#363b37` / `#262a27`), raised rivet studs (`#5c615b`), warm rust streaks (`#795438`), and warm amber lantern glow (`#ffb84d`). |
| **3. Asymmetry & Wear (Rule 4)** | **5 / 5** | Left door leaf carries a pale-pine repair patch board (`#8a7054`); right leaf carries a dark charred split patch (`#3e2f20`); asymmetric rust streaks weep down from upper iron wall seams; refuge props (bunk + lantern on left, crocks/tins/traps/barrel on right) frame `trapper.cellarSpot`. |
| **4. Four-Light Readability** | **5 / 5** | Verified in `noon`, `overcast`, `dusk`, and `night` (`cellar-doors-4lights-sheet.jpg` & `cellar-interior-sheet.jpg`). The interior `THREE.PointLight(0xffa84a, 1.35, 6.5, 1.5)` keeps the riveted iron walls, horseshoes, and bunk readable at dusk and night while daylight/moonlight filters through the overhead iron grate. |
| **5. Gameplay & Collision Integration** | **5 / 5** | Shut doors block entry via `trapper.doorCollider` and `trapper.shutDoorDeck`; unlocking removes both so the marine walks smoothly down `cellarStairRamp` (`startRelY: -0.07 → midStairRelY: -0.88 → bottomRelY: -2.15`) onto `cellarFloorDeck`. Underground wall colliders (`y1 = cy0 - 0.05`) contain the marine inside the cellar while allowing zombies on `cellarRoofDeck` (`y = cy0 + 0.06`) to stride straight past overhead across the iron skylight grate. |

---

## 2. Verification & Proof (Rules 15 & 16)

- **Machine-wide Game-Test Queue (Rule 16):** All browser captures and checks were executed one instance at a time (`--jobs 1`) through `node crew/crew.mjs slot run antigravity AG-135 ...`.
- **Node Unit Tests:**
  - `node --test game/trapper-path.test.mjs` → **5 pass, 0 fail** (`78.2 ms`).
- **Targeted Browser Suite:**
  - `node tools/tests/run-all.mjs --jobs 1 --agent antigravity --task AG-135 t268 t52 t55 t167 t292 t215` → **6 checks: 91 pass, 0 fail** (`t52`: 17/0, `t55`: 10/0, `t167`: 20/0, `t215`: 4/0, `t268`: 25/0, `t292`: 15/0; `check-players`: 308 reads, all allowed).
- **Physical Stair Walk & Cellar State Telemetry (`qa/2026-10-26-AG-135/report.json`):**
  - `shutState`: `{ doorsOpen: false, doorLRotZ: 0, doorRRotZ: 0, doorBarVisible: true, hasDoorCollider: true }`
  - `openState`: `{ doorsOpen: true, doorLRotZ: 1.92, doorRRotZ: -1.92, doorBarVisible: false, hasDoorCollider: false }`
  - `stairWalk`: `{ startRelY: -0.07, midStairRelY: -0.88, bottomRelY: -2.15, bottomActualLz: -3.85, bottomInCellar: true, expectedFloorRelY: -2.15 }`
  - `cellarSpot`: `{ x: -28.42, y: -2.05, z: 43.42, yaw: 2.44 }` (`cellarSpotInCellar: true`)
  - `overheadZombies`: `{ zombieCount: 3, zombieYs: [0.06, 0.06, 0.06], playerRelY: -2.13, roofCapVisibleIn1P: true }`
  - `groupDraws`: `11` total draws for the entire trapper yard + cellar + 8 horseshoes; `189 fps` inside the cellar on RTX 5080 WebGPU.
