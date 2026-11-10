# Antigravity — AG-281 J128 (Jerry, 10 Nov, standing, D-140): the props and buildables, no clipping, nothing floating — 2026-11-10

Changed: Addressed Jerry's feedback for J128 and Rule D-140 / AGENTS rule 24 ("each part on what holds it and none through another; each one standing on the ground or what it is built on, on a slope too"):
  1. Deep Foundation Skirts & Footings on Uneven Ground / Slopes (no floating or daylight beneath):
     - `makeBarricadeMesh`: Extended timber ground skirt to 0.90m height (center y = -0.25m, bottom reaching -0.70m) and end posts / central mullion down to -0.70m so barricades on slopes never hover.
     - `makeFloorMesh`: Extended timber perimeter skirt boards to 0.85m height (center y = -0.275m, bottom reaching -0.70m) and corner posts to 0.95m height (bottom -0.70m). Underneath, two longitudinal bearers sit at y: 0.00..0.10 with three heavy cross-joists resting on top of them at y: 0.10..0.18, carrying the subdeck (y: 0.18..0.22) and planks (y: 0.22..0.26) without intersecting.
     - `makeTierFloorMesh`: Tier 1 stone floor coursed foundation skirt extended to 0.85m height (bottom -0.70m); Tier 2 steel floor perimeter skirt extended to 0.85m height (bottom -0.70m).
     - `makeStairsMesh`: Added buried timber/steel footing sill beam (`_box(S * 0.92, 0.74, 0.36, dark, 0, -0.34, -S / 2 + 0.14)`) reaching down to -0.71m, plus foundation pier footings under the bottom stringer shoe bearings reaching -0.67m.
     - `makeWireMesh`: Added star-picket ground anchor stakes (`_box(0.045, 0.70, 0.045, dark, px, -0.33, 0)`) driven into earth down to -0.68m, guy-brace ground pin pegs (-0.10m), lowered concertina wire coil to touch the ground, and pinned each loop down with steel ground staples.
     - `makeRailingMesh`: Added buried stanchion anchor spigots (`_box(w - 0.02, 0.70, w - 0.02, dark, px, -0.33, 0)`) reaching down to -0.68m.
     - `makePlatformMesh`: Added four corner structural foundation pier legs and footing plates reaching down to -0.70m.
     - `makePillarMesh`: Added buried concrete/steel foundation plinth (`_box(0.66, 0.70, 0.66, dark, 0, -0.35, 0)`) reaching down to -0.70m.
     - `makeSpikesMesh`: Added deep pit foundation skirt (`_box(1.92, 0.65, 1.92, dirtMat, 0, -0.30, 0)`) reaching -0.625m.
     - `makeSandbagMesh`: Extended buried foundation courses with three stepped tiers reaching down to -0.69m.
     - `makeMineMesh` & `makeLureMesh`: Added ground anchor stakes (-0.38m for mine, -0.415m for lure) and tripod ground pins (-0.225m).
  2. Internal Non-Clipping Assembly Audit:
     - Barricade: Separated diagonal bay X-braces along Z (`sgn * 0.035`, thickness `0.045`, clearing each other without overlap), held by outer steel gusset plates.
     - Railing: Balusters previously cut through the toe-kick board from y=0.04 to 0.13 and through the mid safety rail. Split balusters into lower run (y = 0.130 to 0.5185) and upper run (y = 0.5735 to 0.9745), framed with top and bottom collar rings, resting flush on the toe-kick (minY >= 0.12).
     - Platform: Bearing bars run along Z at `rimTop + 0.011`, and cross tie-rods sit on top along X at `rimTop + 0.029`, eliminating all 49 grating intersection clashes.
     - Stairs: Tread depth adjusted to `run * 0.92`, bullnose cap seated flush at the step front (`zMid - run * 0.44`), and the oversized solid riser block replaced with a realistic thin vertical riser board (depth 0.03m at `zMid - run * 0.445`), clearing the stringers.
     - Spikes: Timber duckboard slats sit at y = 0.030, cross-battens rest on top at y = 0.055, and rebar spikes seat flush on top of slats without penetrating into them.
     - Sandbags: Twine center waist seam seated on sack exterior rather than buried inside; cinch-tied neck and ears adjusted to prevent inter-sack penetration.
     - Pillar: Foot gusset fins moved up to y = 0.22 (bottom 0.13), resting flush on top of upper baseplate without clipping.
  3. Training Ground Range Props:
     - Range Computer: In `ui/range-targets.js`, adjusted wall offset so the console shell and steel mounting brackets mount flush against the concrete wall (`R.minX = -8.00m`) with zero floating air gap.
     - Target Stands: In `world/training.js`, added hinge axle pillow block (`box(0.24, 0.04, 0.14, steel, 0, 0.24, 0, root)`) bridging hazard base to pivot. Replaced penetrating center uprights with backing uprights and cross ties at `z = -0.028` supporting the silhouette plate up to eye line from behind without penetration.
     - Firing Line: In `world/training-firing-line.js`, aligned steel nose trim and hazard edge strip along the front face of the rubber worktop rather than inside it.
  4. Debug Hooks & Test Coverage:
     - Exposed `makeBuildMesh(kind)` on `window.TT` in `index.html` to audit unbaked component geometry.
     - Created `tools/tests/tag281.js` with 39 assertions covering foundation depths (`<= -0.60m`), non-clipping assembly for barricade, railing, platform, pillar, stairs, spikes, and Training Ground props.
     - Registered test ownership for `tag\d+` under Antigravity in `tools/tests/run-all.mjs`.

Files:
  - `index.html` (buildable mesh functions, skirts, non-clipping geometry, and `makeBuildMesh` hook)
  - `ui/range-targets.js` (range computer wall placement)
  - `world/training.js` (target stand hinge axle block and backing frame)
  - `world/training-firing-line.js` (firing bench nose trim alignment)
  - `tools/tests/tag281.js` (39 assertions verifying foundation depths and non-clipping geometry)
  - `tools/tests/run-all.mjs` (registered Antigravity test ownership)
  - `qa/2026-11-10-AG-281/` (before and after screenshots, camera job specs, contact sheet)
  - `review/AG-281/` (review before/after screenshot batch)
  - `handoffs/2026-11-10-antigravity-AG-281.md`

Tests:
  - `node tools/tests/run-all.mjs tag281 --agent antigravity --task AG-281 --jobs 1`: 39 pass, 0 fail (34.4s).
  - `node tools/tests/run-all.mjs t1 t10 --agent antigravity --task AG-281 --jobs 1`: 34 pass, 0 fail (t1: 4 pass, t10: 30 pass).

Screenshots:
  - Before: `qa/2026-11-10-AG-281/*-before.png`
  - After: `qa/2026-11-10-AG-281/*-after.png`
  - Contact sheet: `qa/2026-11-10-AG-281/sheet.jpg`
  - Review batch: `review/AG-281/`

Worst 5 Before / After Review:
  1. Barricade (`qa/2026-11-10-AG-281/barricade-before.png` vs `barricade-after.png`):
     - Before: X-braces intersecting each other at center Z, skirt only reached -0.23m leaving large gap on slopes.
     - After: X-braces offset in Z and sandwiched by outer gusset plates; ground skirt and posts reach -0.70m.
  2. Railing (`qa/2026-11-10-AG-281/railing-before.png` vs `railing-after.png`):
     - Before: Balusters cut through bottom toe-kick board and mid safety rail; 0 depth foundation floating on slopes.
     - After: Balusters cleanly split into lower and upper runs seated flush on toe-kick and mid rail; foundation anchor spigots reach -0.68m.
  3. Platform (`qa/2026-11-10-AG-281/platform-after.png` vs `platform-before.png`):
     - Before: All 49 grating longitudinal and transverse intersections clipping into each other; no foundation legs.
     - After: Cross tie-rods seated on top of bearing bars without clipping; four corner foundation pier legs reach -0.70m.
  4. Stairs (`qa/2026-11-10-AG-281/stairs-before.png` vs `stairs-after.png`):
     - Before: Tread bullnose embedded in plank, riser was a massive 23cm solid block; base floated above ground on slopes.
     - After: Bullnose seated at tread front, realistic thin vertical riser board (0.03m), foundation footing sill beam reaches -0.71m.
  5. Training Ground Targets & Computer (`world/training.js` & `ui/range-targets.js`):
     - Before: Target uprights pierced through center of silhouette plate; range computer floated 7cm away from wall.
     - After: Target plate backed by rear support uprights and crossbar at z = -0.028 with hinge axle block; range computer sits flush against concrete wall.

Not verified:
  - Claude 2's comprehensive sweep (CB-292) across all procedural terrain seeds.
  - Subsequent queued task AG-280 (chainsaw effects: sparks on metal, splinters on wood, blood).

Requests: None.

Contract changes: none.
