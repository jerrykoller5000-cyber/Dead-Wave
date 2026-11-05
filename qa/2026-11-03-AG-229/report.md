# AG-229 · Our Ten Guns Against Jerry's Reference Models (`tools/refview` Report)

**Date**: 2026-11-03  
**Author**: Antigravity (`Gemini 4 Argon (High)`)  
**Task**: `AG-229` (after `CU-238`, feeds ChatGPT's `GP-20021`)  
**Scope**: Report only (no game or weapon edits). All 10 reference GLBs in `Claude outputs/refs/models/` are licence-bound reference files and were only measured and rendered side-by-side in `tools/refview/index.html`.

---

## 1. Scaling & Methodology Note

In `tools/refview/index.html` (`CU-238`):
- **Our gun (`ours`)** is scaled using the in-game `CL-90` formula:
  $$\text{oursScale} = \text{hand} \times \frac{\text{WEAPON\_SIZE.m} \times \text{WEAPON\_SIZE.look} \times \text{MARINE\_UPM}}{\text{WEAPON\_SIZE.len}}$$
  where $\text{MARINE\_UPM} = 1.655 / 1.80 = 0.9194$. Because `WEAPON_SIZE.look` is `1.20–1.40` on most guns (and `minigun` is not in `WEAPON_SIZE`, using only `hand = 0.88`), our in-game world-space meshes are intentionally **`+8.5%` to `+28.5%` longer** (`+59.5%` on `minigun`) than raw real-world metre length (`WEAPON_SIZE.m`) so they read on the third-person marine.
- **Jerry's reference model (`ref`)** is scaled so its longest bounding-box axis equals `realLength = WEAPON_SIZE.m` (`0.80 m` for `minigun`), without the `look` multiplier.
- Both ` pistol` (`low_poly_glock-19.glb` / `beretta_m9_w_supressor.glb`) and `flamer` (no reference GLB) are outside the 10-gun `tools/refview` table.

---

## 2. Master 10-Gun Dimensional & Ergonomic Comparison Table

| Gun (`id`) | Reference GLB (`triCount`) | Target `m` | Ours $L \times H \times W$ (m) | Ref $L \times H \times W$ (m) | $\Delta L$ / $\Delta H$ / $\Delta W$ | Bore Over Grip (Ours vs Ref) | Grip Rake (Ours vs Ref) | Sight Height (Ours vs Ref) | Biggest Structural & 40 cm Detail Differences (`D-111`) |
|---|---|---:|---|---|---|---:|---:|---:|---|
| **GW-4 (`m4`)** | `m4_sopmod.glb` (`44,672` tris) | `0.840` | `1.043 × 0.301 × 0.088` | `0.840 × 0.214 × 0.079` | `+24.2%` / `+40.7%` / `+11.4%` | `0.059` vs `0.060 m` (`-1 mm`) | `83.6°` vs `79.0°` (`+4.5°`) | `0.092` vs `0.040 m` (`+52 mm`) | **Stock**: Ref has sloped Crane SOPMOD cheekweld + lower web; ours is a stepped rectangular block. **Sights/Forend**: Ref has tubular ACOG scope, A2 triangle front post, vertical foregrip, top PEQ box & suppressor; ours has boxy reflex housing + M-LOK shroud. **40 cm**: Ref upper has prominent T-charging handle, forward assist & brass deflector. |
| **KR-7 (`ak`)** | `ak-47.glb` (`17,392` tris) | `0.880` | `1.092 × 0.299 × 0.098` | `0.880 × 0.252 × 0.062` | `+24.1%` / `+18.7%` / `+58.1%` | `0.090` vs `0.080 m` (`+10 mm`) | `89.1°` vs `88.9°` (`+0.1°`) | `0.055` vs `0.046 m` (`+9 mm`) | **Stock & Mag**: Ref has steeper downward comb drop on wooden buttstock and deeper curve + horizontal ribs on 30-rd steel mag. **Receiver**: Ours is `+58%` wider (`98 mm` vs `62 mm`). **40 cm**: Ref stamped dust cover has stamped ribs, stepped rear tangent sight block, and distinct handguard retainer ferrule. |
| **Wasp (`uzi`)** | `uzi.glb` (`3,525` tris) | `0.470` | `0.432 × 0.257 × 0.070` | `0.470 × 0.259 × 0.060` | `-8.1%` / `-0.8%` / `+16.7%` | `0.085` vs `0.037 m` (`+48 mm`) | `~84°` vs `86.9°` (visual) | `0.068` vs `0.054 m` (`+14 mm`) | **Envelope**: Height matches within `2 mm` (`0.257` vs `0.259 m`). **Stock**: Ref has folded steel-strut stock tucked under rear receiver; ours has no folded stock. **40 cm**: Ref has deep horizontal stamped receiver ribs, large rounded front/rear sight ears, and top cocking-knob slot cutout. |
| **Shotgun (`shotgun`)** | `shotgun.glb` (`9,300` tris) | `1.000` | `1.149 × 0.215 × 0.088` | `1.000 × 0.321 × 0.147` | `+14.9%` / `-33.0%` / `-40.1%` | `0.047` vs `0.101 m` (`-54 mm`) | `86.8°` vs `73.6°` (`+13.2°`) | `0.072` vs `0.000 m` (`+72 mm`) | **Stock Architecture**: Ref is a classic field 870 with a sweeping drop-comb semi-pistol stock (no separate pistol grip, hence `0.321 m` vertical span); ours is a tactical pistol-grip + horizontal buttstock configuration with ventilated barrel rib. **Forend**: Ref has a longer, slimmer rounded corncob pump (`~55%` of barrel); ours has a shorter, deeper boxy grooved pump. |
| **Breacher-12 (`aa12`)** | `aa12.glb` (`25,296` tris) | `0.960` | `1.064 × 0.407 × 0.212` | `0.960 × 0.383 × 0.225` | `+10.8%` / `+6.3%` / `-5.8%` | `0.148` vs `0.148 m` (`0 mm`) | `62.2°` vs `57.8°` (`+4.4°`) | `0.113` vs `0.145 m` (`-32 mm`) | **Closest Match in Roster**: `boreOverGrip` is identical (`0.148 m`), height and drum width within `6%`. **Stock & Handle**: Ref is a smooth continuous monoblock polymer shell (stock flows into receiver and trigger-guard foregrip strap) with a full-length top carry-handle sight tunnel (`0.145 m`); ours has a shorter top carry handle (`0.113 m`) and separate stepped rear stock. |
| **Sniper (`sniper`)** | `sniper.glb` (`13,087` tris) | `1.150` | `1.335 × 0.298 × 0.156` | `1.150 × 0.221 × 0.077` | `+16.1%` / `+34.8%` / `+102.6%` | `0.084` vs `0.022 m` (`+62 mm`) | `85.3°` vs `84.2°` (`+1.1°`) | `0.122` vs `0.088 m` (`+34 mm`) | **Stock & Forend**: Ref (`AWM/L96`) has the signature **thumbhole chassis cutout** behind the grip, slimmer forend exposing `~55%` of the free-float barrel, and high dual-ring scope mount with daylight under the tube; ours has a solid stepped stock (no thumbhole), longer forend, and wider bipod/bolt footprint (`0.156 m`). |
| **Revolver (`revolver`)** | `38_special_revolver.glb` (`10,700` tris) | `0.270` | `0.347 × 0.224 × 0.078` | `0.270 × 0.156 × 0.042` | `+28.5%` / `+43.6%` / `+85.7%` | `0.104` vs `0.072 m` (`+32 mm`) | `31.4°` vs `49.5°` (`-18.1°`) | `0.028` vs `0.025 m` (`+3 mm`) | **Class Difference**: Ref is a compact `.38 Special` service revolver with unshrouded barrel, exposed ejector rod, slim fluted cylinder (`42 mm`), and curved bird's-head grip; ours is a heavy full-underlug magnum (`78 mm` wide, `+28.5%` longer via `look=1.4, hand=1.08`) with a tall ventilated rib. |
| **Launcher (`launcher`)** | `naders_grenade_launcher.glb` (`15,516` tris, *tail truncated*) | `0.750` | `0.828 × 0.238 × 0.200` | `0.750 × 0.291 × 0.157` | `+10.4%` / `-18.2%` / `+27.4%` | `0.052` vs `-0.016 m` (`+68 mm`) | `87.6°` vs `80.0°` (`+7.5°`) | `0.082` vs `0.139 m` (`-57 mm`) | **Drum, Sights & Stock**: Ref (`M32`) has a narrower 6-shot cylinder (`157 mm` vs `200 mm`), taller top quadrant sight assembly (`0.139 m`), quad-railed barrel shroud with thicker foregrip closer to drum, and downward-angled telescoping M4 stock; ours has a wider drum, lower ladder leaf sight (`0.082 m`), and horizontal olive slab stock. |
| **Minigun (`minigun`)** | `m134_handheld_minigun.glb` (`15,834` tris) | `0.800` | `1.276 × 0.555 × 0.396` | `0.800 × 0.211 × 0.205` | `+59.5%` / `+163.0%` / `+93.2%` | `0.073` vs `0.015 m` (`+58 mm`) | `68.6°` vs `87.2°` (`-18.6°`) | `0.324` vs `0.135 m` (`+189 mm`) | **Scale & Drum**: `minigun` is not in `WEAPON_SIZE` (`oursScale = 0.88`), making ours `1.276 m` long vs `0.800 m` ref, and ours includes a large underslung olive ammo drum (`0.555 m` tall) + high red-dot housing (`0.324 m`), whereas ref is a bare barrel-cluster + motor housing (`0.211 m` tall) with an angled forward crossbar handle and vertical rear joystick grip. |
| **Chainsaw (`chainsaw`)** | `chainsaw.glb` (`2,647` tris) | `0.850` | `0.922 × 0.325 × 0.303` | `0.850 × 0.360 × 0.297` | `+8.5%` / `-9.7%` / `+2.0%` | `0.045` vs `0.019 m` (`+26 mm`) | `76.7°` vs `77.6°` (`-0.9°`) | `0.144` vs `0.205 m` (`-61 mm`) | **Body-to-Bar Ratio**: Overall envelope is very close (`+8.5%` L, `-9.7%` H, `+2.0%` W; note `refview` auto-oriented ref 180° in Z). Ref has a bulkier, rounder motor housing (`~48%` of length, `0.360 m` tall) with a tall chain-brake hand guard (`0.205 m`) and deep rear D-handle loop (`~52%` bar); ours has a smaller, boxier motor block (`~36%` of length) and longer, narrower bar (`~64%` of length). |

---

## 3. Top Actionable Takeaways for 40 cm Close-View Fidelity (`GP-20021` / `D-111`)

1. **Rifles (`m4`, `ak`, `sniper`) — Upper-Receiver & Rear-of-Action Landmarks**:
   - On `m4_sopmod.glb`, the **T-shaped charging handle**, **forward assist**, and **brass deflector** sit right in front of the player's eye at 40 cm; our `m4` upper receiver rear face is relatively flat behind the red dot.
   - On `ak-47.glb`, the **stamped horizontal dust-cover ribs** and **stepped rear tangent sight block** give immediate AK recognition from behind/above.
   - On `sniper.glb`, the **thumbhole stock bridge** and **bolt-shroud collar/safety** at the back of the receiver are the primary close-up silhouettes.
2. **SMG (`uzi`) — Stamped Ribs & Folded Strut Stock**:
   - `uzi.glb` matches our `uzi` height within `2 mm` (`0.259 m` vs `0.257 m`), but gains much stronger 3D relief from its **stamped horizontal side ribs**, **folded under-receiver stock struts**, and **top cocking-slot cutout** between the sight ears.
3. **Shotguns (`shotgun`, `aa12`)**:
   - `aa12` is already our closest match to Jerry's reference in the entire 10-gun roster (`0 mm` bore-over-grip delta, within `6%` on height and width).
   - `shotgun` differs structurally because `shotgun.glb` is a hunting/field 870 with a **sweeping drop-comb stock** (no pistol grip) and **rounded corncob forend**, whereas our `shotgun` is a pistol-grip tactical pump (`GP-20021`'s new cross-pins and receiver relief slab now give our receiver clean 40 cm side detail).
4. **Heavies (`launcher`, `minigun`, `chainsaw`)**:
   - `minigun` is the biggest scale outlier (`1.276 m` vs `0.800 m`, `+59.5%`) because it is omitted from `WEAPON_SIZE` in `index.html`.
   - `chainsaw.glb` has a **larger, more rounded motor housing (`~48%` of total length)** and **taller chain-brake guard (`0.205 m`)** compared to our smaller, boxier motor casing (`~36%` of length).

---

## 4. Visual Evidence & Artifacts
- Master 10-Gun Side & Top Sheet: `qa/2026-11-03-AG-229/all-10-side-top-sheet.jpg`
- Rifles, SMG & Shotguns (`m4`, `ak`, `uzi`, `shotgun`, `aa12` — Side, Top, Orbit): `qa/2026-11-03-AG-229/sheet-1-rifles-smg-shotguns.jpg`
- Sniper, Revolver & Heavies (`sniper`, `revolver`, `launcher`, `minigun`, `chainsaw` — Side, Top, Orbit): `qa/2026-11-03-AG-229/sheet-2-sniper-sidearm-heavies.jpg`
- Single Stills (30 files, `*-side.jpg`, `*-top.jpg`, `*-orbit.jpg`): `qa/2026-11-03-AG-229/stills/`
- Quantitative Readout & GLB Metrics: `qa/2026-11-03-AG-229/metrics.json`
