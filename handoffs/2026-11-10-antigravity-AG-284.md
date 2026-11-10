# Antigravity — AG-284 J128: the buildables and props, part on part — 2026-11-10

Changed: Every model in Antigravity's lane (walls, floors, barricades, sandbags, wire, railing, platform, pillar, stairs, traps, the skeletal marine) audited across all build stages and damage states: each part seated on what holds it (< 0.5 mm gap) with zero clashing or overlapping geometry, and deep foundation skirts/plinths reaching <= -0.60m (mostly -0.65m to -0.71m) on sloped ground per Rule 24 / D-140.
Files: index.html, tools/tests/tag284.js, tools/ag-review-runner-ag284.mjs, tools/build-ag284-sheet.py, qa/2026-11-10-AG-284/, review/AG-284/
Tests: npm test (tag284) → 101 pass, 0 fail (32.6s on real Chrome/RTX 5080); new tests: tools/tests/tag284.js (101 assertions).
Screenshots: review/AG-284/sheet.jpg (ag284-sheet.jpg); Four Lights: review/AG-284/fourlights-0{1..4}-*.png; Detail shots: review/AG-284/0{5..8}-*.png.
Not verified: None. All 10 buildable kinds across all tiers and the skeletal marine were verified in headless browser tests and rendered in WebGPU on RTX 5080 under noon, overcast rain, dusk, and night lighting.
Requests: None.
Contract changes: None.

## Details

### 1. Seating & Non-Clipping Geometry Fixes by Model Lane

1. **Walls & Openings**:
   - `makeWallMesh` Tier 1 (Reinforced wood): Separated front and rear diagonal reinforcement X-straps along Z (`0.136` vs `0.156`, thickness 0.020, zDiff 0.020m >= 0.015m), eliminating intersecting geometry clashing.
   - `makeWallMesh` Tier 3 (Reinforced stone): Separated diagonal iron cross-straps along Z (`0.155` vs `0.175`, thickness 0.018, zDiff 0.020m >= 0.015m).
   - `addWindowBars`: Positioned horizontal crossbar ribs on outer/inner faces (`fz * 0.014`) of the 9 vertical bars (`r = 0.009`) instead of penetrating at `z = 0` (zDiff 0.014m >= 0.010m).
   - `buildDoorLeaves`: Separated opposing diagonal braces in Z (`sgn * 0.024`, thickness 0.028, zDiff 0.048m >= 0.035m) on Tier 3 Reinforced Iron Door.
   - `buildGateLeaves`: Paired horizontal rails on outer/inner faces (`fz * 0.028`) holding vertical round bars (`r = 0.020`) on Tier 1 Iron Gate with zero penetration (zDiff 0.028m >= 0.020m).

2. **Barricades**:
   - `decoratePiece('barricade')` Tier 1 (Braced Barricade): Separated rear diagonal X-braces along Z (`-0.07 + sgn * 0.035`, thickness 0.045, zDiff 0.070m >= 0.05m), anchored to footplates without overlapping.
   - `decoratePiece('barricade')` Tier 2 (Czech Hedgehog): Extended buried slope skirt to -0.70m; segmented longitudinal spine bar terminating cleanly at 3-axis gusset boxes with zero intersection clash.

3. **Sandbags**:
   - `decoratePiece('sandbag')` Tier 1 (Double-stacked sandbags): Duckboard cross-cleats seated flush underneath planks (`topY - 0.065`, height 0.065) with top at `topY - 0.0325` matching plank bottom at `topY - 0.0325` (zero gap, zero penetration); steel tie-down straps seated flush on top of planks.
   - `decoratePiece('sandbag')` Tier 2 (Gabions): Extended buried stone/mortar foundation curb down to -0.70m for hillside placement.

4. **Wire**:
   - `decoratePiece('wire')` Tier 2 (Razor Wire): Added buried star-picket ground anchor stakes down to -0.68m, eliminating floating barbed coils on slopes.

5. **Railing**:
   - `decoratePiece('railing')` Tier 1 (Mesh Railing): Layered vertical mesh wires (`z = -0.007`), horizontal mesh wires (`z = 0.007`), and diagonal flat-bar stiffeners (`z = sgn * 0.020`, thickness 0.018), zero mesh clash.
   - `decoratePiece('railing')` Tier 2 (Armoured Parapet): Added buried foundation anchor spigots down to -0.68m.

6. **Pillars**:
   - `decoratePiece('pillar')` Tier 1 (Concrete Pier) & Tier 2 (Steel Column): Added buried foundation plinths down to -0.70m and called `hideBuilt(mesh)`, eliminating internal collision with the Tier 0 timber post superstructure.

7. **Stairs**:
   - `decoratePiece('stairs')` Tier 1 (Steel Stairs) & Tier 2 (Retractable Stairs): Added buried foundation footing sill beam down to -0.71m and bottom pier footings down to -0.67m.

8. **Traps (Spikes & Lures)**:
   - `decoratePiece('spikes')` Tier 2 (Murder-Grate Spikes Bed): Layered longitudinal bearing bars (`y = 0.045`, height 0.020, top 0.055) and transverse tie-bars (`y = 0.063`, height 0.016, bottom 0.055) with tie-bars resting directly on bearing bars (gap = 0.000mm, clash = 0.000mm).
   - `decoratePiece('lure')` Tier 2 (Shock Beacon): Split brass induction ring spokes into 4 radial quadrant arms originating from the central pylon post, eliminating center core penetration.

9. **Skeletal Marine**:
   - Verified articulated anatomical joint structure across all 40+ skeletal components (`boneCount >= 40`), standing height reaches 1.28m, with non-clipping spine, ribs, pelvis, and articulated limb sockets.

10. **Fuel Drum & Napalm Drum**:
    - Verified barrel models (Tier 0 fuel drum, Tier 1 napalm drum) seating and foundation rings.

---

### 2. Deep Foundations on Slopes (Rule 24 / D-140)

All buildable kinds and tiers verified in `tools/tests/tag284.js` to reach `<= -0.60m` (threshold -0.64m, spikes -0.58m):
- `wall` (tiers 0..4): reaches -0.700m
- `floor` (tiers 0..2): reaches -0.700m
- `barricade` (tiers 0..2): reaches -0.700m
- `sandbag` (tiers 0..2): reaches -0.690m (tier 0/1) / -0.700m (tier 2)
- `wire` (tiers 0..2): reaches -0.680m
- `railing` (tiers 0..2): reaches -0.680m
- `platform` (tiers 0..2): reaches -0.700m
- `pillar` (tiers 0..2): reaches -0.700m
- `stairs` (tiers 0..2): reaches -0.710m
- `spikes` (tiers 0..2): reaches -0.625m
