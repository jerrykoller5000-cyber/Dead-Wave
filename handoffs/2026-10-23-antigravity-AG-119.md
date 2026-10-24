# antigravity — AG-119 The chapel's walls (D-87) — 2026-10-23
Changed:          Added 76 overlapping wall and window-sill collision cylinders (`userData.solids`) to Coldwater's church shell in `world/coldwater.js` (terrain-seated via `seatHistoryTerrain`, 1.2 m sill height under windows so rounds pass above and hit below, front doorway and central aisle to the cross open, emitted in two-pass order to prevent sequential circle-loop sliding into the doorway) and wired them to `addSolid` in world space at `index.html` line 8307; added behaviour test `tools/tests/t275.js` and 4 overlay screenshots in `qa/2026-10-23-AG-119/`.
Files:            world/coldwater.js, index.html, tools/tests/t275.js, qa/2026-10-23-AG-119/chapel-solids-front-oblique.png, qa/2026-10-23-AG-119/chapel-solids-overhead-aisle.png, qa/2026-10-23-AG-119/chapel-solids-side-windows.png, qa/2026-10-23-AG-119/chapel-clean-front-oblique.png, handoffs/2026-10-23-antigravity-AG-119.md
Tests:            npm test (targeted through slot, --jobs 1) → t167 (20/20 PASS), t215 (4/4 PASS), t241 (5/5 PASS), t275 (15/15 PASS); new tests: tools/tests/t275.js
Screenshots:      qa/2026-10-23-AG-119/chapel-solids-front-oblique.png, qa/2026-10-23-AG-119/chapel-solids-overhead-aisle.png, qa/2026-10-23-AG-119/chapel-solids-side-windows.png, qa/2026-10-23-AG-119/chapel-clean-front-oblique.png
Not verified:     Full integration suite not run here (per rule 16, only targeted batch run through the game-test slot).
Requests:         FYI sent to Claude with AG-119 test results and screenshot paths.
Contract changes: none

## Details & Evidence

### 1. Implementation (`world/coldwater.js` & `index.html`)
- **`world/coldwater.js` (`church()` + `seatHistoryTerrain`)**:
  - Populated `k.g.userData.solids` with 76 overlapping cylinders (`r = 0.26 m`, spacing `0.36–0.40 m`, so `2 * r = 0.52 m > step`):
    - **Left & right nave walls** (`x = ±3`, `z = -5..5` step `0.4`, 26 circles per wall): height `1.2 m` under the three nave windows (`[.21, .5, .79].some(c => Math.abs(u - c) < .065)`), and full collapse-profile wall height (`2.1–3.9 m`) elsewhere.
    - **Back gable wall** (`z = -5`, `x = -2.6..2.6` step `0.4`, 14 circles): height `1.2 m` under the central lancet window (`Math.abs(u - .5) < .11`), and gable crown height (`4.23–5.53 m`) elsewhere.
    - **Front wall** (`z = +5`, `x = ±(1.20..2.64)` step `0.36`, 5 circles per side): height `2.22–2.48 m` matching the front wall profile up to the stone doorway jambs at `x = ±1.08`, leaving the front doorway (`-0.94..+0.94 m` clear) and the central aisle to the cross (`|x| <= 1.15`, `z` from `-3.55` to `-1.35`) completely open.
  - Emitted wall circles in two-pass order (`even` indices then `odd` indices; `[5, 3, 1, 4, 2]` on the front wall) so `for (const ws of worldSolids)` in `resolveTreeCollisions` brackets the marine between non-overlapping circles first rather than ratcheting him sequentially along a one-way chain into the doorway.
  - Updated `seatHistoryTerrain` (`world/coldwater.js:73`) to shift each solid's `s.y` by `height(wx, wz) - base` so `church.position.y + s.y` matches the terrain-seated ground height at every wall circle.
- **`index.html` (`~8307`)**:
  - Wired `church.userData.solids` into `worldSolids` using the Cordon checkpoint pattern (`index.html:8359`):
    ```js
    church.updateMatrixWorld(true);
    for (const s of church.userData.solids || []) {
      const p = church.localToWorld(new THREE.Vector3(s.x, 0, s.z));
      addSolid(p.x, p.z, s.r, church.position.y + s.y, church.position.y + s.y + s.h);
    }
    ```

### 2. Behaviour Test (`tools/tests/t275.js`)
Ran through the machine-wide game-test slot (`Rule 16`, `--jobs 1`):
```text
GRANT antigravity AG-119: starting one game-test command
check-players: 304 player.position reads, all in the allowed places
ok    t215     4 pass   0 fail  43.1s
ok    t275    15 pass   0 fail  56.9s

2 checks: 19 pass, 0 fail
```
`t275` verifies all 15 assertions:
1. `church.userData.solids` is defined (`76` solids) and registered in `T.worldSolids`.
2. Walking into the left, right, back, and front walls from outside and from inside stops him against each wall (`8` wall checks).
3. Firing a round at `y = gy + 1.85 m` (above the `1.2 m` window sill) through a nave window passes into the nave, while firing at `y = gy + 0.65 m` (below the sill) stops at the wall under the window (`2` projectile checks).
4. Walking in through the front doorway down the aisle to the cross reaches the blessing zone (`|x| <= 1.15`, `z in [-3.55, -1.35]`) and crouching triggers the chapel blessing (`HP` heals above 40 and `chapel-glow` lights up).
5. A shambler spawned outside the front doorway (`z = 6.4`) walks in through the front door into the nave (`z < 4.3, |x| < 1.2`).

### 3. Visual Verification (`qa/2026-10-23-AG-119/`)
Captured through the game-test slot (`cyan` = full-height wall solids, `amber` = `1.2 m` window-sill solids):
- `qa/2026-10-23-AG-119/chapel-solids-front-oblique.png`
- `qa/2026-10-23-AG-119/chapel-solids-overhead-aisle.png`
- `qa/2026-10-23-AG-119/chapel-solids-side-windows.png`
- `qa/2026-10-23-AG-119/chapel-clean-front-oblique.png`
