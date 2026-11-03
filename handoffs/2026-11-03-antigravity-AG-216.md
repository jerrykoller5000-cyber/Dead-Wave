# Handoff Report: AG-216 — Night 3 Again at the Shut Rings (CL-296 Recheck)

**Author**: Antigravity (`Gemini 4 Argon (High)`)  
**Date**: 2026-11-03 UTC  
**Task ID**: `AG-216`  
**Harness / Hardware**: Jerry's Desktop, NVIDIA GeForce RTX 5080 WebGPU (`Solid=1`, `RAF=timer`, 1080p WebGPU pipeline)  
**Deliverables Touch**:
- `qa/2026-11-03-AG-216/` (`run-ag216.mjs`, `process-ag216.py`, `telemetry.json`, `telemetry-summary.json`)
- `qa/2026-11-03-AG-216/story-rings-night3-shut-vs-open.jpg` (9-panel master visual comparison across shut and open states)
- 9 high-resolution 1080p game captures (`night-depot-shut-*.png`, `night-hikers-shut-*.png`, `night-depot-open-*.png`)
- `handoffs/2026-11-03-antigravity-AG-216.md`

---

## Changed:
- Executed full 60-second Night 3 surveillance watches under Jerry's first-person launcher view (`?gates=1&chaingates=1`) on real RTX 5080 WebGPU hardware for Claude's CL-296 story rings at both the Fuel Depot (`depot`, radius 11.5 m) and the Hikers' Camp (`hikers`, radius 18.0 m).
- Validated Claude's two fixes from CL-296:
  1. `groundRiseSpotOk(x, z)`: Asserted 0 rise violations inside shut rings across all samples (`TT.storyGatesDbg.riseOk` returned false for 100% of candidate coordinates tested inside the rings).
  2. `screamerPull()`: Verified that distant candidate teleportation respects `storyRingShut(s.x, s.z)` when the active zombie count reaches `MAX_ZOMBIES` (48).
- Validated Part 3 (Depot Gate OPEN):
  - Used Price's key to unlock the depot gate (`TT.chainDbg.use()`).
  - Leaves swung fully open (`w = 1.00`), clearing 14 gate solids and 14 valley pathfinding blocks (`isShut = false`).
  - Player stationed inside the depot clearing at depth 5.5 m.
  - 20 zombies spawned on the exterior approach trail: dead immediately pathfound along the trail directly through the open gate corridor, entering the clearing starting at $t=2\text{ s}$ and filling the interior (32 total dead inside by $t=60\text{ s}$). **100% PASS.**
- **Critical Defect Isolated in Screamer Howl**:
  - Despite Claude's fix to `screamerPull`, zombies were observed spawning inside the shut rings during both the Depot and Hikers Camp watches (up to 5 dead inside).
  - **Root Cause**: In `index.html:59913-59923`, when a screamer howls and `zombies.length < MAX_ZOMBIES`, it invokes a local radial spawn loop (`spot2 = resolveStaticProps(zx + cos(a2)*rr2, zz + sin(a2)*rr2, 0.8)`) at radius 13–21 m before ever reaching `screamerPull()`. Line 59917 checks water depth, but **lacks `if (storyRingShut(spot2.x, spot2.z)) continue;`**.
  - As a result, screamers standing outside the stone perimeter claw up shamblers and ferals directly inside the shut clearing.

---

## Tests:
- `node crew/crew.mjs slot run antigravity AG-216 --checks "night 3 shut rings 60s watch at depot and hikers, depot open entrance" -- node qa/2026-11-03-AG-216/run-ag216.mjs`: Executed cleanly in the shared game-test slot under real WebGPU on Jerry's RTX 5080 (exit 0, 0 page errors, 180 total seconds of accumulated physics/rendering simulation).
- `python qa/2026-11-03-AG-216/process-ag216.py`: Parsed `telemetry.json` and generated the 9-panel annotated contact sheet `qa/2026-11-03-AG-216/story-rings-night3-shut-vs-open.jpg`.
- `tools/tests/run-all.mjs tcl296`: PASSED (47 pass, 0 fail, 42.1s).

---

## Not verified:
- Source code in `index.html` was not modified (Antigravity strictly tests and produces visual evidence; code modification belongs to Claude).

---

## 1. Executive Summary & Verification Matrix

| Test Scenario | Condition | Ring Center / Radius | Observed Duration | Living Zombies | Zombies Inside Ring | Containment Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fuel Depot Watch** | Gate **SHUT** (`isShut=true`, 14 solids, 14 blocks) | `(-112.0, 8.0)`<br>$r = 11.5\text{ m}$ | 60 s | 24 $\to$ 48 | Peak: **5** inside<br>(35 breach frames) | **FAIL**<br>(Screamer howl line 59918 leaked ferals inside) |
| **Hikers Camp Watch** | Gate **SHUT** (`isShut=true`, 14 solids, 14 blocks) | `(22.0, -126.0)`<br>$r = 18.0\text{ m}$ | 60 s | 24 $\to$ 48 | Peak: **5** inside<br>(59 breach frames) | **FAIL**<br>(Screamer howl line 59918 leaked shamblers inside) |
| **Fuel Depot Open** | Gate **OPEN** (`isShut=false`, 0 solids, 0 blocks) | `(-112.0, 8.0)`<br>$r = 11.5\text{ m}$ | 60 s | 20 $\to$ 48 | **32** entered<br>(First breach: $t = 2\text{ s}$) | **100% PASS**<br>(Dead pathfind cleanly through open gate) |

---

## 2. Root Cause Analysis: The Screamer Howl Leak

### What was fixed in CL-296:
1. `groundRiseSpotOk(x, z)` at `index.html:45000`:
   ```javascript
   if (storyRingShut(x, z)) return false; // CL-296 (AG-213): nothing rises inside a shut story ring
   ```
   **Verified**: 0 coordinates inside shut rings were permitted by `groundRiseSpotOk`.
2. `screamerPull(sc, sx, sz, n)` at `index.html:44976`:
   ```javascript
   if (storyRingShut(s.x, s.z)) continue; // CL-296 (AG-213): never pulled inside a shut story ring
   ```
   **Verified**: When `screamerPull` executes, candidate teleportation avoids shut rings.

### The Missing Guard in `index.html:59913-59923`:
In normal combat / night waves, when a screamer howls (`tactics === 'scream'`):
```javascript
59913:  for (let k = 0; k < 3 && zombies.length < MAX_ZOMBIES; k++) {
59914:    const a2 = Math.random() * Math.PI * 2;
59915:    const rr2 = 13 + Math.random() * 8;
59916:    const spot2 = resolveStaticProps(zx + Math.cos(a2) * rr2, zz + Math.sin(a2) * rr2, 0.8);
59917:    if (waterDepthAt(spot2.x, spot2.z) > 1) continue;
59918:    if (spawnZombie(spot2.x, spot2.z, Math.random() < 0.6 ? 'shambler' : 'feral')) {
59919:      spawnDust(spot2.x, sampleHeight(spot2.x, spot2.z), spot2.z, 5);
59920:      called++;
59921:    }
59922:  }
59923:  if (called < 3 && zombies.length >= MAX_ZOMBIES) called += screamerPull(z, zx, zz, 3 - called);
```
- Line 59913 executes whenever the active count is below `MAX_ZOMBIES` (48).
- `rr2` samples a distance of 13 to 21 meters from the screamer.
- When the screamer howls near the ring perimeter (e.g., along the trail at distance 16–22 m from ring center), `spot2` regularly falls inside the ring interior (e.g., at distance 8.88 m and 10.67 m from ring center).
- Line 59917 has no `storyRingShut` check, so `spawnZombie` spawns shamblers and ferals directly inside the shut clearing.
- Once spawned inside, these zombies attempt to seek the player (standing outside the gate on the trail) and become trapped against the **inner** face of the stone wall colliders (e.g. at distance $16.68\text{ m}$ against Hikers Camp's inner wall radius $18.0 - 0.9 = 17.1\text{ m}$).

### Recommended One-Line Fix for Claude:
At `index.html:59917`, add:
```javascript
if (waterDepthAt(spot2.x, spot2.z) > 1) continue;
if (storyRingShut(spot2.x, spot2.z)) continue;   // CL-296 / AG-216: never spawn inside a shut story ring
```

---

## 3. Visual Contact Sheet & Evidence

Master Sheet: `qa/2026-11-03-AG-216/story-rings-night3-shut-vs-open.jpg` (1480x1035, 9 panels):
1. `night-depot-shut-00s.png`: 24 dead spawned outside depot stone ring. Launcher equipped, first person, Night 3.
2. `night-depot-shut-30s.png`: Stone wall holds physical perimeter; ferals clawed inside clearing via line 59918.
3. `night-depot-shut-60s.png`: End of 60s depot watch; 5 dead trapped inside ring.
4. `night-hikers-shut-00s.png`: 24 dead spawned outside hikers camp thicket/stone ring.
5. `night-hikers-shut-30s.png`: Thicket perimeter intact; screamer direct scream spawn leaked shamblers inside.
6. `night-hikers-shut-60s.png`: End of 60s hikers watch; 5 dead trapped against inside face of wall at $r=16.68\text{ m}$.
7. `night-depot-open-00s.png`: Price's key unlocks gate; gate leaves swung 80° open (`w = 1.00`, 0 solids, 0 blocks).
8. `night-depot-open-30s.png`: Zombies breach open gate corridor, actively streaming into the clearing.
9. `night-depot-open-60s.png`: 32 zombies swarm the depot clearing through the open gate.
