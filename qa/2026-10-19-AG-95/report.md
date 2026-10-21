# AG-95 — CL-217 Ranger Cache Visual Verification + `t266` & `t52` Report (2026-10-19)

## 1. Automated Checks (`t266` & `t52`)

### A. `t266` (`tools/tests/t266.js`)
- **On real Three.js (`index.html?debug=1&raf=timer`, evaluated in `finish-ranger.mjs`)**: **`28 PASS, 0 FAIL`** (all 28 assertions pass).
- **Under `run-all.mjs` (`test.html` / `fakethree.mjs`)**: **`2 PASS, 14 FAIL`**.
  - **Root cause**: `buildRangerMission` (`index.html:27756`) and `t266.js:24` locate the radio's LCD mesh via:
    ```js
    const lcd = radio && radio.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry');
    ```
    In `tools/tests/fakethree.mjs` (`line 475–480`, `geoClass`), geometry subclasses (`PlaneGeometry`, `BoxGeometry`, etc.) never set `this.type = name`, so `o.geometry.type` is `undefined` under `fakethree.mjs`. `buildRangerMission` therefore hits `if (!camp || camp.style !== 'ranger' || !lm || !lcd) { ranger.off = true; return; }` (`index.html:27757`) and disables the ranger mission in `test.html`.
  - **1-line fix**: either set `this.type = name;` inside `geoClass` in `tools/tests/fakethree.mjs` or accept `o.geometry.type === 'PlaneGeometry' || o.geometry.constructor?.name === 'PlaneGeometry'` in `index.html:27756` and `t266.js:24`.

### B. `t52` (`tools/tests/t52.js`)
- **`GP-19937` medical row check**: **`PASS`** (`PASS sites match the CL-6 centres and approaches and GP-8 facings` and `PASS every approach point has 0.75 m clear`).
- **Remaining 2 `FAIL` lines in `t52`** (`15 pass, 2 fail`):
  1. `FAIL two draws a prop (three for the radio): 3,2,6,2,2,2,3` (or `3,2,2,2,2,2,3` under `fakethree.mjs`):
     - `objective:ranger-cache` (`props[2]`) has `6` visible meshes on real Three.js instead of `2` because `CL-217`'s `buildRangerMission` (`index.html:27792–27804`) attaches `ranger-keypad` (`3` meshes: body box + keypad plane + LED cylinder) and `ranger-lid-pictures` (`1` mesh) to `prop.group`.
     - `objective:wreck-salvage` (`props[6]`) has `3` visible meshes instead of `2` because `CL-216`'s `buildTruckMission` (`index.html:27613`) attaches `truck-chain` (`1` mesh) to `prop.group`.
  2. `FAIL every state within GP-8's footprint: salvage/closed 0.69x0.58x0.34`:
     - Because `truck-chain` (`name: 'truck-chain'`) is a direct `Mesh` child of `objective:wreck-salvage`'s `prop.group`, `t52.js:64` (`for (const m of p.group.children) if (m.isMesh && m.visible && m !== p.light) box.union(...)`) unions `truck-chain` into `salvage/closed`'s bounding box (`0.69 x 0.58 x 0.34` vs `MAX.salvage` `0.65 x 0.50 x 0.30`).

---

## 2. Live GPU Visual Inspection (`qa/2026-10-19-AG-95/`)

| Check | Result | Screenshot(s) | Notes |
| --- | --- | --- | --- |
| **Lockbox closed lid (3 order pictures) & front keypad + LED** | **PASS (with 1 terrain slope note)** | `01-lockbox-closed-lid-and-keypad.png` | The 3 order icons (`truck → radio → board` with 1/2/3 dots) sit flat on the closed lid (`y = 0.244`, zero float, zero z-fighting). On the front face (`z = 0.214`), the keypad and red LED (`0xff3b30`) sit flush on the box front; note that because `objective:ranger-cache` sits at the lowest corner ground height on a sloping bank, the grass slope clips across the lower two button rows of the 3D keypad on the front face (the top row and red/green LED remain above the grass). |
| **Radio (`site ranger radio`) up close & `E — Look`** | **PASS** | `02-radio-3d-closeup.png`, `03-radio-look-modal.png` | `"CH 5"` with signal bars is crisp and readable on the 3D radio display (`z = 0.142`, sits flat, no float or z-fight) and in the `E — Look` modal. |
| **Search board (`site ranger board`) up close & `E — Look`** | **PASS** | `04-board-3d-closeup.png`, `05-board-look-modal.png` | `"SEARCH LOG"` (`DAY 1`..`DAY 9` with `DAY 9` ringed in red crayon) sits flat against the noticeboard (`z = -1.219`, red pin at top, no float, no z-fight) and is crystal clear both in 3D and in `E — Look`. |
| **Truck doors (`site ranger door`) both doors up close & `E — Look`** | **PASS** | `06-door-left-3d-closeup.png`, `07-door-right-3d-closeup.png`, `08-door-look-modal.png` | `"UNIT 1"` stencilled decal sits flat on both the left door (`x = -0.35, z = -1.166, ry = π`) and right door (`x = -0.35, z = 1.166, ry = 0`) beside the pine-tree crest — zero float, zero z-fighting on either door — and opens cleanly in `E — Look`. |
| **Keypad wrong code (`WRONG`)** | **PASS** | `09-keypad-wrong-code.png` | `E` at the lockbox opens the keypad with the 3 order icons above the LCD and no `"code"` or `"clue"` text; entering wrong digits flashes `W R O N G` in red with no HP penalty and clears the entry. |
| **Keypad right code (`OPEN`) → green LED → `E` cache search** | **PASS** | `10-keypad-right-code-open.png`, `11-lockbox-unlocked-green-led.png`, `12-lockbox-searched-modal.png` | Entering the right code flashes `O P E N` in green, auto-closes the keypad, turns the 3D lockbox LED green (`0x3dff6a`), unlocks the objective (`Search the ranger cache — E — Take supplies`), and pressing `E` awards the supplies, opens the lockbox lid (hiding `ranger-lid-pictures`), and shows the Ranger Camp field note. |
