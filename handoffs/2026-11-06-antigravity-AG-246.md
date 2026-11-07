# antigravity — AG-246 Two Trucks for the Hikers' Camp (D-116) — 2026-11-06
Changed:          Authored `game/story-trucks.js` providing `buildEscortTruck(THREE)` and `buildCrashedTruck(THREE)` in the kit, palette, and styling of `game/convoy-visual.js`. Implemented `buildEscortTruck` as a PGB military cargo truck tilted in the ditch behind the medical convoy's overturned ambulance with a removable front-bumper recovery winch (separate mesh with motor, wire drum, fairlead, hook, and remote handset on a coiled lead; toggles off upon recovery). Implemented `buildCrashedTruck` as a crumpled PGB cargo truck crashed nose-first into the hikers' camp tree ring square across the trail mouth (dented radiator, buckled bonnet, shattered split windshield, twisted bumper with `userData.winchMount` at (3.55, 0.45, 0) and `userData.lineAt` at (3.62, 0.62, 0)). Both vehicles have local +x as their nose and use merged BufferGeometries with shadows enabled for 1.2 frame rates. Integrated both into `index.html`: `chainPlaceLineTools()` places the escort truck in the ditch with its front-bumper winch as the recovery tool, and `storyTruckBuild()` uses `buildCrashedTruck(THREE)`. Verified with unit tests (`game/story-trucks.test.mjs`), test suite `tcl303` (44/44 pass in 50.9s), and real WebGPU hardware capture on Jerry's RTX 5080 (4 full-HD 1080p stills and composite contact sheet).
Files:            game/story-trucks.js, game/story-trucks.test.mjs, index.html, qa/2026-11-06-AG-246/run-ag246.mjs, qa/2026-11-06-AG-246/build-sheets.py, qa/2026-11-06-AG-246/telemetry.json, qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg, qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg, qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg, qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg, qa/2026-11-06-AG-246/trucks-sheet.jpg, handoffs/2026-11-06-antigravity-AG-246.md
Tests:            1. Unit tests (`node game/story-trucks.test.mjs`): 3/3 pass in 9.8ms (materials, escort truck with bumper winch, crashed truck with winchMount & lineAt, local +x nose orientation).
                  2. Headless suite (`tcl303`): 44 pass, 0 fail in 50.9s through shared game-test slot (`node tools/tests/run-all.mjs tcl303 --agent antigravity --task AG-246`).
                  3. Real WebGPU hardware verification on RTX 5080 (`qa/2026-11-06-AG-246/run-ag246.mjs`): exit code 0, 0 browser console errors, 4 full-HD 1080p stills captured at noon daylight in first person.
                  4. Python composite generator (`python qa/2026-11-06-AG-246/build-sheets.py`): exit code 0, generated `qa/2026-11-06-AG-246/trucks-sheet.jpg` (1968x1424).
Screenshots:      qa/2026-11-06-AG-246/trucks-sheet.jpg (1968x1424 4-panel composite contact sheet), qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg (1920x1080 convoy escort truck in ditch with front-bumper winch), qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg (1920x1080 close-up at front bumper with winch taken off plate), qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg (1920x1080 crashed truck across hikers' trail mouth), qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg (1920x1080 truck winched clear beside trail with line tied to anchor tree)
Not verified:     Jerry's physical driving or pushing feel when winching the truck clear on Monday (9 November).
Requests:         Claude: `game/story-trucks.js` is live in `index.html` and verified on Jerry's RTX 5080. All requirements of AG-246 are met. Ready for AG-247 (teleprinter and stamp) or AG-244.
Contract changes: none. Conforms strictly to `buildEscortTruck(THREE) -> THREE.Group` and `buildCrashedTruck(THREE) -> THREE.Group` with local `+x` nose, `userData.winchMount` at (3.55, 0.45, 0), and `userData.lineAt` at (3.62, 0.62, 0).

---

## 1. Executive Summary & Verification Overview

Under task **AG-246** (fulfilling lead task **CL-303** and Jerry's order **D-116**), we authored the production module [`game/story-trucks.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/game/story-trucks.js) and verified both trucks on Jerry's `RTX 5080` (WebGPU hardware renderer, 1920x1080, noon daylight `worldTime = 0.50`, Jerry's launcher in First Person).

All four required visual states (`D-114`: short pictures) were captured, audited, and compiled into the composite contact sheet [`qa/2026-11-06-AG-246/trucks-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/trucks-sheet.jpg):
1. **Convoy Escort Truck in Ditch ([`truck-01-convoy-escort.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg))**: Sitting tilted in the roadside ditch behind the overturned ambulance at the medical convoy (`POI.wrecks[0]`). Shows heavy chassis rails, olive military cab, 6 all-terrain wheels with tandem rear axle, open cargo stake bed with canopy bows, and the complete recovery winch mounted on the heavy front bumper.
2. **Escort Truck with Winch Taken ([`truck-02-convoy-winch-taken.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg))**: Close-up at the front bumper after the player presses `E` to recover the winch. The winch cleanly detaches from the bumper bracket plate, remaining in the player's possession as a held story tool.
3. **Crashed Truck Across Hikers' Trail Mouth ([`truck-03-hikers-crashed.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg))**: At the entrance to the hikers' camp tree ring (`ring.place === 'hikers'`). The truck is crumpled nose-first into the trees, pitched down into the dirt (`rotation.z = -0.07`), completely blocking passage. Features crumpled hood, dented radiator grille, spiderweb-shattered military windshield, shattered driver window, buckled front bumper, and the frame mounting point for the winch.
4. **Crashed Truck Winched Clear ([`truck-04-hikers-winched.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg))**: Following winch attachment and tying off the cable to the designated anchor tree outside the ring, holding `E` at the remote dragged the truck clear (`w = 1.00`). The truck is turned 90° along the trail off to the side, the cable runs taut from the bumper drum to the tree, and the trail into the hikers' camp is 100% open.

---

## 2. Technical Architecture & Coordinate Alignment

Per Jerry's specifications and the 1.2 speed rule:
- **Geometry & Draw Optimization**: All parts of each truck (body panels, chassis channels, bumpers, wheels, windshields, headlights) are assembled via high-performance vertex accumulators and merged into 6 draw calls per truck (`olive`, `steel`, `dark`, `rubber`, `glass`, `lamp`), each with cast and receive shadows enabled.
- **Coordinate Conventions**: Both trucks have local `+x` as their nose:
  - Front bumper: `x ≈ +3.50` to `+3.60`
  - Cab / Engine hood: `x ≈ +1.50` to `+3.40`
  - Rear cargo bed: `x ≈ -2.88` to `+0.90`
- **CL-303 Contract Hooks**:
  - `userData.inner`: Holds the tilted vehicle body (`rotation.z = -0.07` on crashed truck for nose-down crash posture).
  - `userData.winchMount`: Positioned at `(3.55, 0.45, 0)` on `inner` for mounting `chainToolMesh('winch')`.
  - `userData.lineAt`: Positioned at `(3.62, 0.62, 0)` on `inner` for cable connection in `storyWinchLineUpdate(e)`.
  - `userData.winch`: Separate removable mesh on the escort truck front bumper that toggles visibility based on `chainGates.keyState('winch') === 'ready'`.

---

## 3. Telemetry & State Audit

| Shot | Subject | Telemetry & Observables | Verified State |
|:---|:---|:---|:---:|
| **1. Convoy Escort** | Escort truck behind ambulance | `playerPos: [-113.4, -0.47, 42.6]`, `winchPos: [-117.6, 0.20, 46.0]`, `winchVisible: true` | Winch mounted on bumper; truck tilted in ditch; ambulance visible ahead. |
| **2. Winch Taken** | Escort truck bumper | `took: true`, `winchState: "held"`, `winchVisible: false`, `meshVisible: false` | Winch cleanly detached from bumper plate; player holds winch. |
| **3. Crashed Truck** | Hikers' trail mouth | `playerPos: [-1.32, 6.95, -117.5]`, `truck: { x: 0, z: 0, yaw: 0.12 }`, `open: false`, `why: "Bolt the winch..."` | Truck nose-down in tree ring; entrance blocked; prompt: `"E — Bolt on the winch"`. |
| **4. Winched Clear** | Hikers' trail mouth | `truck: { x: 3.7, z: -5.4, yaw: 1.57 }`, `open: true`, `winch: { stage: 2, t: 1, called: true }`, `rest: 3` | Truck rotated 90° beside trail; cable tied to tree; trail 100% open. |

---

## 4. Test Verification Summary

1. [`game/story-trucks.test.mjs`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/game/story-trucks.test.mjs):
   - `getStoryTruckMaterials returns vehicle materials` — PASS
   - `buildEscortTruck constructs cargo truck with removable front-bumper winch` — PASS
   - `buildCrashedTruck constructs crashed truck with winchMount and lineAt matching story expectations` — PASS
2. [`tools/tests/tcl303.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/tcl303.js):
   - 44 checks passed in 50.9s, 0 failures. Fully satisfies all CL-303 gate requirements, chain tools, winch pickup, winch bolting, line tie-off, drag movement, rest solids, and trail clear verification.
3. Real Hardware RTX 5080 Run:
   - 0 page errors, all 4 1080p stills captured cleanly at 60 fps, composite contact sheet generated in [`qa/2026-11-06-AG-246/trucks-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/trucks-sheet.jpg).
