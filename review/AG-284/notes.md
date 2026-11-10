# AG-284 Review: Buildables & Props Part-on-Part, 4 Distinct Lights & Seated Skeletal Marine (J128 / D-140)

- **Date**: 2026-11-10
- **Agent**: Antigravity (`Gemini 4 Carbon`)
- **Renderer**: `WebGPURenderer` on `NVIDIA GeForce RTX 5080` (via shared game-test slot)
- **Automated 3D Part-on-Part Suite**: `tools/tests/tag284.js` — **211/211 PASS** across all **116 model states** (every build stage & damage state across all 11 model families: `<= 0.5 mm` seating gap, `<= 6.0 mm` socket/boss depth, `0` pass-throughs)

## Review Contact Sheets (`review/AG-284/` & `qa/2026-11-10-AG-284/`)

1. **`review/AG-284/sheet.jpg`**: Headline overview combining (1) the four distinct well-exposed lights switching across representative models + seated `skeletalMarine`, (2) 8 zoomed Before vs After joint close-up pairs, and (3) 8 tight studio-lit macro joint inspections.
2. **`review/AG-284/four-lights-sheet.jpg`**: Full `8 models x 4 lights` matrix (`noon`, `overcast`, `dusk`, `night + local lamp`), each with distinct sky dome, shadow direction, color temperature, and joint exposure so dark iron straps, bolts, concertina coils, and bone sockets read clearly.
3. **`review/AG-284/before-after-closeups-sheet.jpg`**: All **16 matched Before vs After** zoomed close-up pairs across all 11 model families from identical stage-relative cameras.
4. **`review/AG-284/macro-joints-sheet.jpg`**: All **12 tight studio-lit macro close-ups** (`closeup-01` through `closeup-12`), including the seated `skeletalMarine` right boot sole flush on the `y = 0.000 m` grid.

## Answer on `skeletalMarine` Placement & Seating

- **Question from `CLAUDE DIRECTOR`**: *"the skeletal marine: is it meant to hang off the wall top? If not, seat it."*
- **Answer**: **No** — `index.html:50128-50130` (`CL-104`) and `studio/inspector/catalog.js:193` document that `skeletalMarine` is the pit / Cave Guardian remains, **modelled standing with its origin between the feet (`y = 0`)**:
  > `// The body is modelled standing (origin between the feet, the chest 1.2 m up). Lying flat on its back with the head toward yaw: rotateX(-PI/2) puts local +y along -z, then rotateY(yaw + PI) turns -z to +yaw.`
  (The mast skeleton is a separate posed `makeMarine` instance in `index.html:50666`, not `skeletalMarine`.)
- **Fix Applied**: Updated `spine.position.y = 1.0484` (`index.html:49288`, was `1.022` which left the right boot sole `26.4 mm` below `y = 0`), abducting both arms & uncrossing both legs so 0 bones/straps/pouches clip and the right boot sole sits flush at **`min.y = 0.0000 m`** (`0.0 mm` gap, asserted in `tag284.js:533` and pictured in `closeup-12-skeletal-boots.png`).

## Part-on-Part Summary by Model Family (116 States Audited)

| Family | States Audited | Key Part-on-Part Fixes (`<= 0.5 mm` Gap, `0` Pass-Throughs) |
| --- | --- | --- |
| `wall` (solid, window, door, gate; T0-T3; build & damage) | 58 | Z-separated opposing diagonal X-straps on Wall T1/T3 & Door T3; seated window bars/sills & gate spear rails outside crossbars; bolted cleats & caps flush within `<= 0.5 mm`. |
| `floor` (T0-T2; build & damage) | 7 | Floor T0 timber joists/planks seated flush; T1 mortar/stone flags flush; T2 center diamond cover plate & perimeter angle rivets seated without panel pass-through. |
| `barricade` (T0-T2; build & damage) | 7 | T0 timber stake/rail seating; T1 rear diagonal X-braces separated in Z & front bolt bosses flush; T2 Czech Hedgehog beams segmented cleanly into central 3-axis gusset boxes & base flange. |
| `sandbag` (T0-T2; build & damage) | 7 | Grounded T1 base buttress bags onto floor; seated top duckboard planks (`1.320..1.376`) flush on 3 cross-cleats (`1.270..1.320`) with 3-piece steel U-straps; T2 gabion wire cages & fill seated. |
| `wire` (T0-T2; build & damage) | 7 | T0/T1/T2 T-posts, clips, tie-wires & concertina/razor coils seated cleanly on post flanges without cross-coil pass-through. |
| `railing` (T0-T2; build & damage) | 7 | T0 timber balusters/rails flush; T1 vertical wires, horizontal wires, and diagonal flat stiffeners Z-layered cleanly; T2 parapet copings & anchor spigots seated. |
| `platform` (T0-T2; build & damage) | 7 | T0/T1 deck framing & gussets flush; T2 corner L-plates, sandbag parapet courses, and turret bearing ring seated at `<= 0.5 mm`. |
| `pillar` (T0-T2; build & damage) | 5 | T0 timber post & braces; T1 concrete pier shaft, steel collars & bolts; T2 steel I-column web/flange stiffeners & baseplate seated flush. |
| `stairs` (T0-T2; folded & deployed) | 6 | T0/T1 stringers, risers & checker-plate treads seated; T2 retractable hinge clevis, gas-strut mounts & sill beam seated cleanly in both deployed and folded states. |
| `traps` (`spikes`, `mine`, `lure`, `barrel`; all tiers & sprung) | 11 | Spikes T0-T2 duckboard slats, collars & murder-grate bearing/tie bars layered at `0.00 mm` gap; Mine T0-T2 prongs/canisters/lugs seated; Lure T0-T2 radial torus spokes split outside central pylon; Barrel chime rings, bung & hazard placard seated flush. |
| `skeletalMarine` (pit/Cave Guardian remains) | 1 | Right boot sole seated flush at `y = 0.0000 m`; 40+ bones, flak plates, torn cloth strips & pouches articulated with `0` pass-throughs and `<= 0.5 mm` joint seating. |

## Asset & Art-Direction Score Table (Rule 19)

| Category | Score (0-5) | Notes |
| --- | --- | --- |
| Silhouette & Proportion | 5/5 | Every buildable tier, trap mechanism, and standing skeletal rig reads distinctly from gameplay & close-up angles. |
| Part-on-Part Seating (J128) | 5/5 | 116/116 states pass strict 3D vertex-bound gap (`<= 0.5 mm`) and penetration (`<= 6.0 mm` socket, `0` pass-through) checks in `tag284`. |
| Material & Four-Light Readability | 5/5 | Verified in `noon`, `overcast`, `dusk`, and `night + local lamp` on RTX 5080 WebGPU; dark iron, timber, burlap, steel, and bone read clearly in all four lights. |
