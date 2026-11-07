# antigravity — AG-246 Two Trucks for the Hikers' Camp (D-116) — 2026-11-06 (Re-shot 2026-11-07)
Changed:          Authored `game/story-trucks.js` providing `buildEscortTruck(THREE)` and `buildCrashedTruck(THREE)` in the kit, palette, and styling of `game/convoy-visual.js`. Fixed `chainPlaceLineTools()` in `index.html` to resolve true road tangent approaching the medical convoy wreck (walking back duplicate endpoints) and place the escort truck 5.2 m behind the overturned ambulance in the roadside ditch (previously 0.0 m overlap), cleanly exposing the front bumper winch while preserving `tcl303` check 29 (`< 9 m`). Re-shot panels 1 and 2 per Claude's request: panel 1 captures the entire escort truck whole from 7.0 m in the 3/4 front view with its front-bumper winch prominently displayed; panel 2 captures the exact same framing after player recovery (`took = true`), showing the winch cleanly removed from the bumper mounting bracket plate with "WINCH RECOVERED" on HUD. Retained verified panel 3 (crashed truck across hikers' trail mouth) and panel 4 (crashed truck winched clear beside trail). Re-generated composite contact sheet (`qa/2026-11-06-AG-246/trucks-sheet.jpg`). Verified with unit tests (`game/story-trucks.test.mjs`: 3/3 pass), test suite `tcl303` (44/44 pass in 51.4s), and real WebGPU hardware capture on Jerry's RTX 5080.
Files:            game/story-trucks.js, game/story-trucks.test.mjs, index.html, qa/2026-11-06-AG-246/run-ag246.mjs, qa/2026-11-06-AG-246/build-sheets.py, qa/2026-11-06-AG-246/telemetry.json, qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg, qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg, qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg, qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg, qa/2026-11-06-AG-246/trucks-sheet.jpg, handoffs/2026-11-06-antigravity-AG-246.md
Tests:            1. Unit tests (`node game/story-trucks.test.mjs`): 3/3 pass in 9.8ms.
                  2. Headless suite (`tcl303`): 44 pass, 0 fail in 51.4s through shared game-test slot (`node tools/tests/run-all.mjs tcl303 --agent antigravity --task AG-246`).
                  3. Real WebGPU hardware verification on RTX 5080 (`qa/2026-11-06-AG-246/run-ag246.mjs`): exit code 0, 0 browser console errors, 4 full-HD 1080p stills captured at noon daylight in first person.
                  4. Python composite generator (`python qa/2026-11-06-AG-246/build-sheets.py`): exit code 0, generated `qa/2026-11-06-AG-246/trucks-sheet.jpg` (1968x1424).
Screenshots:      qa/2026-11-06-AG-246/trucks-sheet.jpg (1968x1424 4-panel composite contact sheet), qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg (1920x1080 escort truck whole from 7 m in ditch with front-bumper winch), qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg (1920x1080 exact same framing with winch removed from bumper plate), qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg (1920x1080 crashed truck across hikers' trail mouth), qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg (1920x1080 truck winched clear beside trail with line tied to anchor tree)
Not verified:     Jerry's physical driving or pushing feel when winching the truck clear on Monday (9 November).
Requests:         Claude: Panels 1-2 re-shot per your request. The escort truck is whole from 7 m with its front bumper winch clearly visible, and panel 2 proves removal from the bumper plate. `tcl303` 44/0.
Contract changes: none. Conforms strictly to `buildEscortTruck(THREE) -> THREE.Group` and `buildCrashedTruck(THREE) -> THREE.Group` with local `+x` nose, `userData.winchMount` at (3.55, 0.45, 0), and `userData.lineAt` at (3.62, 0.62, 0).

---

## 1. Executive Summary & Verification Overview

Under task **AG-246** (fulfilling lead task **CL-303** and Jerry's order **D-116**), we re-shot panels 1 and 2 per Claude's review on Jerry's `RTX 5080` (WebGPU hardware renderer, 1920x1080, noon daylight `worldTime = 0.50`, First Person):

1. **Convoy Escort Truck in Ditch ([`truck-01-convoy-escort.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-01-convoy-escort.jpg))**: Camera positioned at `px = -121.5, pz = 50.0` (7.0 m distance from truck center). Captures the entire escort truck whole, sitting tilted in the ditch 5.2 m behind the overturned ambulance. The heavy steel front bumper, recovery winch (drum, wire, hook, and remote handset lead), radiator grille, headlights, split military windshield, olive cab, sideboards, canopy ribs, and tandem rear axle wheels are 100% visible with zero clipping or obstructions.
2. **Escort Truck with Winch Taken ([`truck-02-convoy-winch-taken.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-02-convoy-winch-taken.jpg))**: Exact same camera perspective (7.0 m distance) after player takes the winch (`E`). The winch cleanly detaches from the bumper bracket plate, leaving the bare bumper plate and D-rings, while the HUD indicates `"WINCH RECOVERED"`.
3. **Crashed Truck Across Hikers' Trail Mouth ([`truck-03-hikers-crashed.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-03-hikers-crashed.jpg))**: At the entrance to the hikers' camp tree ring (`ring.place === 'hikers'`). The truck is crumpled nose-first into the trees, pitched down into the dirt, completely blocking passage. Features crumpled hood, dented radiator grille, shattered windshield, buckled bumper, and frame winch mount.
4. **Crashed Truck Winched Clear ([`truck-04-hikers-winched.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/truck-04-hikers-winched.jpg))**: Following winch attachment and tying cable to anchor tree, winched clear (`w = 1.00`). Turned 90° along trail off to the side, cable taut to tree, entrance 100% open.

---

## 2. Technical Architecture & Placement Fix

- **Placement Tangent Fix**:
  - In `index.html` line 34226, the road polyline endpoint adjacent to the medical wreck had a duplicated endpoint (`line[13] == line[12]`), causing `dx` and `dz` to collapse to 0, which placed the escort truck overlapping directly on top of the ambulance.
  - Fixed by searching backward for a distinct path point (`hypot > 0.5 m`) to compute the true road direction vector.
  - Placed the escort truck 5.2 m behind the wreck along the road and 2.2 m into the ditch. This cleanly separates the escort truck from the ambulance while remaining well within `tcl303`'s 9 m requirement (`Math.hypot(winch, wreck) = 5.65 m < 9.0 m`).
- **Draw Call Efficiency**:
  - Maintained 6 merged BufferGeometries per vehicle (`olive`, `steel`, `dark`, `rubber`, `glass`, `lamp`), each with cast and receive shadows enabled.

---

## 3. Telemetry & State Audit

| Shot | Subject | Telemetry & Observables | Verified State |
|:---|:---|:---|:---:|
| **1. Convoy Escort** | Escort truck whole in ditch | `playerPos: [-121.5, 0.07, 50.0]`, `distToTruck: 7.04 m`, `winchPos: [-117.15, 0.42, 51.60]`, `winchVisible: true` | Winch mounted on front bumper; entire truck visible in ditch behind ambulance. |
| **2. Winch Taken** | Escort truck (same view) | `took: true`, `winchState: "held"`, `winchVisible: false`, `meshVisible: false` | Winch cleanly detached from bumper plate; HUD "WINCH RECOVERED"; identical framing. |
| **3. Crashed Truck** | Hikers' trail mouth | `playerPos: [-1.32, 6.95, -117.5]`, `truck: { x: 0, z: 0, yaw: 0.12 }`, `open: false`, `why: "Bolt the winch..."` | Truck nose-down in tree ring; entrance blocked; prompt: `"E — Bolt on the winch"`. |
| **4. Winched Clear** | Hikers' trail mouth | `truck: { x: 3.7, z: -5.4, yaw: 1.57 }`, `open: true`, `winch: { stage: 2, t: 1, called: true }`, `rest: 3` | Truck rotated 90° beside trail; cable tied to tree; trail 100% open. |

---

## 4. Test Verification Summary

1. [`game/story-trucks.test.mjs`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/game/story-trucks.test.mjs):
   - 3/3 pass in 9.8ms.
2. [`tools/tests/tcl303.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/tcl303.js):
   - 44 checks passed in 51.4s, 0 failures.
3. Real Hardware RTX 5080 WebGPU Run:
   - 0 errors, 4 1080p stills captured cleanly at 60 fps, composite contact sheet regenerated in [`qa/2026-11-06-AG-246/trucks-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-06-AG-246/trucks-sheet.jpg).
