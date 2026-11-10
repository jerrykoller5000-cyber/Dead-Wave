# AG-284 Review: Buildables and Props Geometry, Seating & Four Lights (J128 / D-140)

- **Date**: 2026-11-10
- **Agent**: Antigravity (Gemini 4 Carbon)
- **Status**: Completed (101/101 test assertions pass in `tools/tests/tag284.js`)
- **Review Sheet**: `review/AG-284/sheet.jpg` / `qa/2026-11-10-AG-284/ag284-sheet.jpg`

## Summary of Fixes

1. **Standing Rule 24 (D-140) Foundations on Slopes**:
   - Every buildable across all tiers (`wall`, `floor`, `barricade`, `sandbag`, `wire`, `railing`, `platform`, `pillar`, `stairs`, `spikes`) extends foundation skirts, piles, footings, and plinths down to `<= -0.60m` (mostly `-0.65m` to `-0.71m`), eliminating any floating base mesh when placed on hillsides or rough terrain.

2. **Seating and Non-Clipping Precision**:
   - **Walls**: Separated front and rear diagonal reinforcement X-straps along Z on Tier 1 (Reinforced Wood, `z = 0.136` vs `0.156`) and Tier 3 (Reinforced Stone, `z = 0.155` vs `0.175`), eliminating intersecting geometry clash.
   - **Window Openings**: Positioned horizontal crossbar ribs on the outer and inner faces (`fz * 0.014`) of the 9 vertical round bars (`r = 0.009`), zero penetration.
   - **Door Leaves**: Opposing diagonal stiffening braces separated in Z (`sgn * 0.024`, thickness 0.028) on Tier 3 Reinforced Iron Door.
   - **Gate Leaves**: Paired horizontal rails on outer/inner faces (`fz * 0.028`) holding 9 vertical spear bars (`r = 0.020`) on Tier 1 Iron Gate with zero clash.
   - **Barricades**: Tier 1 Braced Barricade rear diagonal X-braces offset along Z (`-0.07 + sgn * 0.035`); Tier 2 Czech Hedgehog longitudinal spine segmented terminating cleanly at 3-axis gusset boxes; anchor skirt buried to -0.70m.
   - **Sandbags**: Duckboard cross-cleats seated flush underneath planks (`topY - 0.065`, height 0.065) with zero gap (< 0.5mm) and zero penetration; Tier 2 Gabions foundation curb reaches -0.70m.
   - **Wire**: Tier 2 Razor Wire added buried star-picket ground stakes down to -0.68m.
   - **Railing**: Tier 1 Mesh Railing layers vertical mesh wires (`z = -0.007`), horizontal mesh wires (`z = 0.007`), and diagonal flat bars (`z = sgn * 0.020`); Tier 2 Parapet includes anchor spigots down to -0.68m.
   - **Pillars**: Tier 1 Concrete Pier and Tier 2 Steel Column hide base mesh and include buried plinths down to -0.70m.
   - **Stairs**: Tier 1 Steel Stairs and Tier 2 Retractable Stairs include foundation sill beams down to -0.71m and pier footings down to -0.67m.
   - **Spikes Trap**: Tier 2 Murder-Grate layers longitudinal bearing bars (`y = 0.045`, height 0.020) and transverse tie-bars (`y = 0.063`, height 0.016) with tie-bars resting directly on bearing bars (bearing bar top = 0.055, tie-bar bottom = 0.055, gap = 0.000mm).
   - **Lure Trap**: Tier 2 Shock Beacon radial spokes split into 4 quadrant arms radiating cleanly from the pylon post without penetrating the central column core.
   - **Skeletal Marine**: Verified standing height (1.28m) and articulated anatomy across all 40+ skeletal components with zero joint clipping.

3. **Four Lights Review (RTX 5080 WebGPU)**:
   - `fourlights-01-noon.png`: Bright direct sunlight highlights shadow contacts and edge seams.
   - `fourlights-02-overcast-rain.png`: Diffuse ambient lighting tests specular reflections on wet metal duckboard and steel shields.
   - `fourlights-03-dusk.png`: Raking golden-hour light tests long ground shadows and vertical seam clearance.
   - `fourlights-04-night.png`: Low-key nocturnal lighting tests silhouette integrity and glowing beacon elements.
