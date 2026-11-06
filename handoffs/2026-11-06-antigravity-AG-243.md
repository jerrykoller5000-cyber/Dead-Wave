# antigravity — AG-243 The sights his way, as they land (GB-259) — 2026-11-06 (Daylight Redo)
Changed:          Redid the first-person aim-down-sights (ADS, right mouse held) evaluation on Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`, real WebGPU renderer on RTX 5080) in full outdoor daylight (`worldTime = 0.50` High Noon) against a marked silhouette target plate 20.0 m down the sightline. Evaluated the three weapons touched by GB-259: Breacher-12 (`aa12`, J20), Revolver (`revolver`, J13, J57), and Grenade Launcher (`launcher`, J16 post GP-20033). Removed all artificial overlays from zoom crops (pure in-game pixels only; no drawn crosshairs/reticles). Evaluated Jerry's three questions strictly from visual picture evidence: (1) is dot/post on target, (2) is anything blocking it, and (3) does the gun not fill the view. Captured clean full 1080p in-game screenshots and assembled a high-resolution 3-panel daylight contact sheet (`qa/2026-11-06-AG-243/sights-20m-sheet.jpg`). No game code touched.
Files:            qa/2026-11-06-AG-243/run-ag243.mjs, qa/2026-11-06-AG-243/build-sheets.py, qa/2026-11-06-AG-243/telemetry.json, qa/2026-11-06-AG-243/sights-20m-sheet.jpg, qa/2026-11-06-AG-243/aa12-ads-20m.png, qa/2026-11-06-AG-243/revolver-ads-20m.png, qa/2026-11-06-AG-243/launcher-ads-20m.png, handoffs/2026-11-06-antigravity-AG-243.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-243 --checks "Daylight 1P ADS sights 3 guns at 20m target without overlay" -- node qa/2026-11-06-AG-243/run-ag243.mjs`): exit code 0, 0 page errors, all 3 weapons successfully evaluated down sights at 20 m marked target in noon daylight. Composite contact sheet generated via Python Pillow (`build-sheets.py`).
Screenshots:      qa/2026-11-06-AG-243/sights-20m-sheet.jpg (1890x1250 daylight composite, pure in-game zoom crops without overlay), qa/2026-11-06-AG-243/aa12-ads-20m.png (1920x1080, daylight mean brightness: [77.6, 92.8, 67.2]), qa/2026-11-06-AG-243/revolver-ads-20m.png (1920x1080, daylight mean brightness: [76.0, 88.8, 65.0]), qa/2026-11-06-AG-243/launcher-ads-20m.png (1920x1080, daylight mean brightness: [76.9, 91.3, 65.7])
Not verified:     Jerry's personal tactile feel on mouse during live combat runs.
Requests:         Claude: Daylight recapture and clean contact sheet (`qa/2026-11-06-AG-243/sights-20m-sheet.jpg`) are complete, showing clear sightlines with zero synthetic overlays.
Contract changes: none

---

## 1. Executive Summary & Review Follow-Up

Under task **AG-243** (following Claude's 20:35Z review feedback on the first unlit capture), we redid the full hardware first-person aim-down-sights (ADS) audit on Jerry's PC (`RTX 5080`, WebGPU, 1920x1080, `worldTime = 0.50` High Noon Daylight) in the live outdoor match environment.

Key corrections implemented:
1. **Full Outdoor Daylight Lighting**: Switched from the dark Training Ground box to open outdoor terrain illuminated by direct overhead sun (`worldTime = 0.50`). Frame mean brightness increased from ~12 RGB to ~76–93 RGB, rendering terrain, trees, sky, sight metal, and the marked silhouette target plate with sharp visual contrast.
2. **Zero Drawn Overlays**: All artificial crosshairs, red circles, and bounding lines were eliminated from the 3x sightline zoom crops. The crops present pure in-game pixels, allowing direct visual inspection of front sight posts, aperture rings, rear notches, and hammer positions.
3. **Rigorous Visual Scoring**: Scoring is based strictly on visual clarity from the captured screenshots rather than constructed mathematical coordinates.

Each weapon was tested in first person ADS looking directly downrange at a marked silhouette target plate placed at **20.0 m**:
1. **Breacher-12 (`aa12`) · J20**: Circular aperture ring on the carry handle aligns cleanly with the hooded front post tip onto the 20 m target plate bullseye.
2. **Revolver (`revolver`) · J13, J57**: Rear top-strap notch aligns with the blade front post on target. The idle hammer rests visibly below the notch floor, leaving the front post completely unobscured.
3. **Grenade Launcher (`launcher`) · J16 post GP-20033**: Lowest notch of the leaf sight frames the front post tip directly onto the 20 m target. The sight channel is open through GP-20033's removal of obstructive upper rungs and top bridge.

---

## 2. Jerry's Evaluation Questions & Visual Verdicts

> *"is the dot/post on the target, nothing blocking it, the gun not filling the view? Label what each picture shows; score only that."*

| Weapon | Visual Sightline Picture | 1. Dot / Post on Target? | 2. Nothing Blocking It? | 3. Gun Not Filling View? | Verdict |
|:---|:---|:---|:---|:---|:---:|
| **Breacher-12**<br>`aa12`<br>(J20) | Carry-handle aperture ring cleanly frames the hooded front post tip onto the marked 20 m silhouette target bullseye in bright daylight. | **YES.** Front post tip sits squarely on the target plate bullseye at 20 m. | **YES.** Sightline through the circular carry-handle aperture is clear; front post hood and tip clearly resolved; zero occlusion. | **YES.** Gun sits low-right; upper target area, horizon, and peripheral field unobstructed (screen coverage: 20.7%). | **PASS** |
| **Revolver**<br>`revolver`<br>(J13, J57) | Rear top-strap notch cleanly frames the blade front post on target. Lowered idle hammer sits visibly below the notch floor. | **YES.** Blade front post centered horizontally and vertically in rear top-strap notch onto target. | **YES.** Idle hammer rests visibly below the notch floor (GP-20014); front sight blade completely visible; cylinder/frame clear. | **YES.** Compact handgun frame sits low-center; wide open peripheral vision across the daylight landscape (screen coverage: 35.7%). | **PASS** |
| **Launcher**<br>`launcher`<br>(J16 post GP-20033) | Lowest notch of leaf ladder sight frames the front post tip directly onto the 20 m target. Upper ladder rungs and bridge are completely open. | **YES.** Front post tip aligned precisely through leaf lowest notch onto the 20 m target bullseye. | **YES.** Sight channel is completely open; GP-20033 unblocked the upper rungs and top bridge; zero occlusion between eye and front post. | **YES.** Low receiver hold; open ladder frame lets sunlight and landscape through without masking downrange (screen coverage: 26.0%). | **PASS** |

---

## 3. Physical Parameters & Hardware Telemetry

- **Target Location**: Outdoor FOB field, Distance: `20.0 m` along sightline (`z = pz + 20.0 m`).
- **Target Specification**: High-visibility shooting silhouette target board (0.70 m x 1.05 m) with 10-ring bullseye at eye level (`y = playerPos.y + 1.68 m`), illuminated by noon sun.
- **Lighting**: `worldTime = 0.50` (High Noon Sunlight).
- **Renderer**: WebGPU Hardware Renderer on RTX 5080, 1920x1080.

| Weapon | Distance | Lighting | First-Person ADS | Screen Coverage % | Mean Image Brightness [R, G, B] | Primary Sight Elements |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Breacher-12** (`aa12`) | 20.0 m | Noon Sun (0.50) | 1.000 | 20.7% | [77.6, 92.8, 67.2] | Carry-handle aperture ring + hooded front post |
| **Revolver** (`revolver`) | 20.0 m | Noon Sun (0.50) | 1.000 | 35.7% | [76.0, 88.8, 65.0] | Rear top-strap notch + blade post over idle hammer |
| **Launcher** (`launcher`) | 20.0 m | Noon Sun (0.50) | 1.000 | 26.0% | [76.9, 91.3, 65.7] | Lowest leaf notch + front post (GP-20033 open ladder) |

Composite contact sheet without overlays: `qa/2026-11-06-AG-243/sights-20m-sheet.jpg`.
