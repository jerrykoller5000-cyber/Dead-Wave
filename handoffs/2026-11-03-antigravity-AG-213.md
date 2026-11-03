# Handoff Report: AG-213 — Drive the Story Rings His Way (CL-296, ?gates=1)

**Author**: Antigravity (`Gemini 4 Argon (High)`)  
**Date**: 2026-11-03 UTC  
**Task ID**: `AG-213`  
**Hardware Harness**: Jerry's Desktop, NVIDIA GeForce RTX 5080, WebGPU Device (`Solid=1`, `RAF=timer`, 1080p WebGPU pipeline)  
**Deliverables Touch**:
- `qa/2026-11-03-AG-213/` (`run-ag213.mjs`, `process-ag213.py`, `telemetry.json`, `telemetry-summary.json`)
- `qa/2026-11-03-AG-213/story-gates-shut-vs-open.jpg` (Master 8-panel comparison of all 4 rings shut vs open)
- `qa/2026-11-03-AG-213/story-gates-night-containment.jpg` (Night 3 Dead Containment surveillance sheet)
- `handoffs/2026-11-03-antigravity-AG-213.md`

## Changed:
- Executed comprehensive real-hardware visual, physical, and gameplay QA on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware for Claude's CL-296 story rings (`?gates=1&chaingates=1`) from Jerry's first-person launcher view with the Launcher equipped.
- Walked up the approach trail to each of the four planned story rings:
  1. **Fuel Depot Shed Ring** (`cx: -112.0, cz: 8.0, r: 11.5 m`, gate: `depot-shed`, lead: `generator`, key: `price-key`)
  2. **Radio Mast Yard Ring** (`cx: -153.4, cz: -4.2, r: 18.0 m`, gate: `mast-yard`, lead: `relay`, key: `sato-key`)
  3. **Hikers Camp Trail Ring** (`cx: 22.0, cz: -126.0, r: 18.0 m`, gate: `trail-chain`, lead: `missing`, key: `chain-key`)
  4. **Rangers Cache Ring** (`cx: 128.0, cz: 0.0, r: 18.0 m`, gate: `ranger-gate`, lead: `search`, key: `ranger-gate-key`)
- Read HUD interaction prompts before acquiring the key, confirmed locked feedback on pressing E (`chainUseE()`), and captured 1080p stills of all four gates shut (`gate-<place>-01-shut.png`).
- Executed high-density 48-bearing radial circumvention probes around each ring perimeter (192 total test vectors across both flanks into the woods) to determine if the player could squeeze past through tree gaps, rocks, water, or terrain irregularities.
- Supplied each ring's specific story key, verified prompt transition to `E — Open the gate`, triggered opening, observed gate leaf swing animation (`w: 0.0 -> 1.0`, 14 solids and 14 valley blocks cleared), walked cleanly through the open threshold onto the site interior, and captured 1080p stills of all four gates open (`gate-<place>-02-open.png`).
- Executed a 60-second Night 3 surveillance watch at the Fuel Depot and Hikers Camp rings to verify dead containment and check for zombies stuck on wall colliders.
- Isolated a critical night infiltration defect where zombies appear inside shut rings due to unconstrained `screamerPull` and `groundRiseSpotOk` spawns.

## Tests:
- `node crew/crew.mjs slot run antigravity AG-213 --checks "story rings gates=1 his way verification" -- node qa/2026-11-03-AG-213/run-ag213.mjs`: PASSED in shared game-test slot under WebGPU on Jerry's RTX 5080 (exit 0, 0 page errors).
- `python qa/2026-11-03-AG-213/process-ag213.py`: Processed telemetry, evaluated 192 perimeter bearings, and composed 8-panel shut-vs-open and night surveillance contact sheets.

## Not verified:
- Source code in `index.html` and `game/story-gates.js` was not modified (Antigravity strictly tests and produces visual evidence; source edits belong to Claude, ChatGPT, and Grokbot).

---

## 1. Executive Summary & Verification Findings

### Summary Checklist:
1. **Four Story Rings Built**: Confirmed online under `?gates=1&chaingates=1`. The convoy is correctly skipped (`why: "trail x45"`), and trapper/truck remain point blockers.
2. **First-Person Approach on Trail**: All four gates are easily visible and approach cleanly along established official trails.
3. **Locked Interaction & Clue Prompts**: When the player approaches without the required key, the prompt HUD clearly informs the player that the gate is locked and provides an authentic story clue indicating where the key can be found. Pressing E cleanly rejects opening without error.
4. **Perimeter Woods Containment**: **100% PASS (192 / 192 bearings held outside).** In every ring, attempting to slip around through the dense thickets or rocks on either flank is completely impassable. The stone wall colliders (`resolveWallBand`) seamlessly form an airtight circle.
5. **Key Unlocking & Gate Leaf Swing**: When the held key is present, pressing E triggers `storyGatesUpdate`. Both iron leaf leaves swing inward 80° (`w = 1.00`), the 14 gate solids and 14 valley pathfinding blocks are removed, and the player can walk freely through the open archway onto the site.
6. **Night Zombie Containment Defect Identified**:
   - While the physical stone colliders completely block zombies from walking through the walls or gates, zombies were observed appearing inside shut rings during Night 3.
   - **Root Cause**: `screamerPull()` in `index.html:44971-44980` and `groundRiseSpotOk()` in `index.html:44994-45003` choose zombie rise/teleport coordinates based on tree distance and player proximity, but **neither function checks `!storyRingShut(spot.x, spot.z)`**. When a screamer howls near a ring, it claws up zombies directly inside the ring.

---

## 2. Gate Verification Details by Location

### 2.1 Fuel Depot Shed Ring (`depot`)
- **Center**: `(-112.0, 8.0)`, **Radius**: `11.5 m`
- **Gate**: `depot-shed`, **Key**: `price-key` (Source: `hq-generator`, available day 1)
- **Shut Prompt**: *"The depot shed is locked. Price's fuel log is by the dead HQ generator."*
- **Locked E Press**: Rejection confirmed (`acted = true`, `open = false`, `solids = 14`, `blocks = 14`).
- **Circumvention**: 48 bearings tested; 0 breaches. Minimum distance reached from center: `11.50 m` (wall radius `11.5 m`).
- **Open Gate**: With `price-key`, prompt offered interaction, gate swung open (`w: 1.00`, `solids: 0`, `blocks: 0`), player walked to interior distance `7.42 m` (deep inside clearing).

### 2.2 Radio Mast Yard Ring (`mast`)
- **Center**: `(-153.4, -4.2)`, **Radius**: `18.0 m`
- **Gate**: `mast-yard`, **Key**: `sato-key` (Source: `hq-radio-drawer`, ready on HQ power)
- **Shut Prompt**: *"The mast yard gate needs Sato's key. Once HQ has power, check the radio drawer."*
- **Locked E Press**: Rejection confirmed (`acted = true`, `open = false`).
- **Circumvention**: 48 bearings tested; 0 breaches. Minimum distance reached: `18.00 m`.
- **Open Gate**: With `sato-key`, gate swung open cleanly (`w: 1.00`), player walked to interior distance `13.88 m`.

### 2.3 Hikers Camp Trail Ring (`hikers`)
- **Center**: `(22.0, -126.0)`, **Radius**: `18.0 m`
- **Gate**: `trail-chain`, **Key**: `chain-key` (Source: `ambulance-glovebox`, ready on ambulance reached)
- **Shut Prompt**: *"The camp chain is locked. A key was left in the ambulance glovebox."*
- **Locked E Press**: Rejection confirmed (`acted = true`, `open = false`).
- **Circumvention**: 48 bearings tested; 0 breaches. Minimum distance reached: `18.00 m`.
- **Open Gate**: With `chain-key`, gate swung open (`w: 1.00`), player walked to interior distance `13.91 m`.

### 2.4 Rangers Cache Ring (`rangers`)
- **Center**: `(128.0, 0.0)`, **Radius**: `18.0 m`
- **Gate**: `ranger-gate`, **Key**: `ranger-gate-key` (Source: `clarke-toolbox`, ready on toolbox open)
- **Shut Prompt**: *"The rangers' gate is locked. Clarke put its key in his toolbox."*
- **Locked E Press**: Rejection confirmed (`acted = true`, `open = false`).
- **Circumvention**: 48 bearings tested; 0 breaches. Minimum distance reached: `18.00 m`.
- **Open Gate**: With `ranger-gate-key`, gate swung open (`w: 1.00`), player walked to interior distance `13.90 m`.

---

## 3. Detailed Telemetry Summary

| Ring Site | Radius | Gate Solids (Shut) | Gate Solids (Open) | Circumvention Bearings | Breaches Around Flanks | Locked Prompt Clue | Walk-Through Interior |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **Depot** | 11.5 m | 14 solids / 14 blocks | 0 solids / 0 blocks | 48 / 48 checked | **0 breaches** | Price's fuel log at HQ gen | **PASS** |
| **Mast** | 18.0 m | 14 solids / 14 blocks | 0 solids / 0 blocks | 48 / 48 checked | **0 breaches** | Sato's key in radio drawer | **PASS** |
| **Hikers** | 18.0 m | 14 solids / 14 blocks | 0 solids / 0 blocks | 48 / 48 checked | **0 breaches** | Ambulance glovebox key | **PASS** |
| **Rangers** | 18.0 m | 14 solids / 14 blocks | 0 solids / 0 blocks | 48 / 48 checked | **0 breaches** | Clarke's toolbox key | **PASS** |

---

## 4. Night 3 Dead Surveillance & Defect Analysis

### 4.1 Observations During 60-Second Watch:
- **Depot Watch**: 20 zombies spawned outside ring radius 11.5 m. Over 60 seconds, a maximum of **6 zombies** were recorded inside the shut ring (52 sample incidents).
- **Hikers Watch**: 20 zombies spawned outside ring radius 18.0 m. Over 60 seconds, a maximum of **6 zombies** were recorded inside the shut ring (41 sample incidents).
- **Stuck Dead**: 0 zombies were permanently glitched or vibrating inside wall colliders (`stuckCount = 0`). The stone wall colliders correctly push pathfinding zombies back when they walk into them.

### 4.2 Why Zombies Appeared Inside Shut Rings:
1. `poiPostList()` in `index.html:45035` correctly includes `!storyRingShut(p.x, p.z)` to skip placing static ambient guards at shut rings.
2. However, dynamic zombie spawn mechanisms do not check `storyRingShut`:
   - **`screamerPull(sc, sx, sz, n)`** (`index.html:44971-44980`): Screamer scream chooses rise spots at `SCREAM_PULL_R = [13, 21]` meters away. When a screamer screams near the exterior wall of a ring, this radius easily encompasses the interior clearing. Because `screamerPull` only validates player clearance and water depth, it spawns zombies directly onto the objective site inside the locked ring!
   - **`groundRiseSpotOk(x, z)`** (`index.html:44994-45003`): Ground rise selects random trees between `GROUND_RISE_MIN` and `GROUND_RISE_MAX` without checking `!storyRingShut(x, z)`. Any trees within the ring radius are eligible ground rise spawn points.

### 4.3 Recommended Fix for Claude:
In `index.html`:
1. In `groundRiseSpotOk(x, z)`:
   ```javascript
   if (typeof storyRingShut === 'function' && storyRingShut(x, z)) return false;
   ```
2. In `screamerPull(sc, sx, sz, n)`:
   ```javascript
   if (typeof storyRingShut === 'function' && storyRingShut(s.x, s.z)) continue;
   ```

---

## 5. Visual Deliverables Index (`qa/2026-11-03-AG-213/`)

1. **`story-gates-shut-vs-open.jpg`**:
   - Master 8-panel comparative sheet displaying all four story places from the approach trail. Left column displays the locked iron gate with padlock; right column displays the swung-open gateway with cleared trail.
2. **`story-gates-night-containment.jpg`**:
   - 2-panel night surveillance sheet capturing Night 3 dead behavior at the Depot and Hikers Camp from elevated surveillance perches.
3. **Full 1080p Stills**:
   - `gate-depot-01-shut.png` & `gate-depot-02-open.png`
   - `gate-mast-01-shut.png` & `gate-mast-02-open.png`
   - `gate-hikers-01-shut.png` & `gate-hikers-02-open.png`
   - `gate-rangers-01-shut.png` & `gate-rangers-02-open.png`
   - `night-depot-containment.png` & `night-hikers-containment.png`
4. **Data**:
   - `qa/2026-11-03-AG-213/telemetry.json`: Raw per-bearing circumvention distances and gate metrics.
   - `qa/2026-11-03-AG-213/telemetry-summary.json`: High-level aggregated statistics.
