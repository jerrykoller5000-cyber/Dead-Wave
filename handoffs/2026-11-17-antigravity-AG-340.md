# Task: AG-340 — CC-357 c (whole J164 package) 5080 before/after + dark square pick

- **Owner:** antigravity
- **Date:** 2026-11-17
- **Model:** Gemini 4 Carbon
- **Status:** DONE
- **Goal:** Capture the full 32-shot `CC-357 c` (`review/CC-357/c/marine-body.js` `0d761307`, `review/CC-357/marine-face.js` `0ec0cb83`, `review/CC-357/marine-hats.js` `c2695acf`, `review/GP-20151/band-ui-v1.source.js` `55c01e28`, `review/GP-20151/band-index-v1.source.html` `813e6f4f` via CDP Fetch swap) vs LIVE (`index.html` `9311196f`, `ui/marine-kit-fit.js` `c8f55495`, `studio/marine-body.js`, `ui/marine-face.js`, `studio/marine-hats.js`) 5080 WebGPU comparison set with identical all-gear-off loadout, inspect pair sheets + 3x zoom crops, and raycast/identify the dark square on his right thigh front (`(686, 850)`).

Changed:
- Capture and inspection artifacts only (zero game code edited):
  - `qa/2026-11-17-AG-340/capture-ag-c.mjs`
  - `qa/2026-11-17-AG-340/build_ag_c_sheets.py`
  - `qa/2026-11-17-AG-340/pick-dark-square.mjs`
  - `qa/2026-11-17-AG-340/pick-result.json` + `pick-{c,live}-unarmed-{direct,hrender}.png`
  - `review/CC-357/ag-c/` (32 PNGs, `summary.json`, `pair-sheet-stand.jpg`, `pair-sheet-aims.jpg`, `crop-wrist-3x.png`, `crop-boots-3x.png`, `crop-belt-bands-3x.png`, `dark-square-pick-marked.jpg`)
  - `review/CC-357/ag-c-live/` (32 PNGs, `summary.json`)

Tests:
- `capture-ag-c.mjs` (`CC357_SET=live`, 20:30Z): `32/32` unique `1600x1600` WebGPU PNGs, all-gear-off asserted (`helmet/vest/pads/nvg/laserLight/flashlight = false`), `fillHeightPct` ~85% (stand/aim), `pageErrors=0`, `inspectorErrors=0`.
- `capture-ag-c.mjs` (`CC357_SET=c`, 20:38Z): `32/32` unique `1600x1600` WebGPU PNGs, all 5 Fetch copies verified by MD5 (`0d761307`, `0ec0cb83`, `c2695acf`, `55c01e28`, `813e6f4f`), all-gear-off asserted, `pageErrors=0`, `inspectorErrors=0`.
- `build_ag_c_sheets.py`: built `pair-sheet-stand.jpg`, `pair-sheet-aims.jpg`, `crop-wrist-3x.png`, `crop-boots-3x.png`, `crop-belt-bands-3x.png` (live vs `ag-b` `ef85ea17` / `ag-c`).
- `node crew/crew.mjs slot run antigravity AG-340 --checks "AG-340 dark square I.shot vs renderDirect c vs live" -- node qa/2026-11-17-AG-340/pick-dark-square.mjs`: exited `0`, verified LIVE `index.html` (`9311196f`) untouched, picked `(686, 850)` on both `SET=c` and `SET=live`.

Not verified:
- Full Issue kit (`vest/helmet/pads/nvg` on) was excluded per brief (`all gear off`, matching `ag-b`).

## Dark Square Identification (`CC-357 c` vs `LIVE`)

Raycast at pixel `(686, 850)` in `unarmed noon front` (both layer 0 and all layers) hits the **identical** object in **BOTH `SET=c` and `SET=live`**, right in front of `live-trouser-leg`:
- **Object / Export:** `marine.userData.carry.mags` (`rig.mags`), built in [`index.html:25302-25304`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/index.html#L25302-L25304) (`carryInstanced(new THREE.BoxGeometry(0.045, 0.05, 0.024), carryMats.mag, CARRY_SLOTS.mags, (o, i) => o.position.copy(T(...MAG_AT[i])))`).
- **Hit telemetry (`pick-result.json`):**
  - `dist`: `2.8869 m` (`point`: `[-26.1303, -199.2914, -631.8446]`), ahead of `live-trouser-leg` (`dist`: `2.9241 m` in `c`, `2.9216 m` in `live`) and behind `chapel-glow` (`2.7987 m`).
  - `meshName`: `"(unnamed)"` (`THREE.InstancedMesh`, `count: 1` of 5, `instanceId: 0`, `layersMask: 1`).
  - `material`: `carryMats.mag` ([`index.html:24948`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/index.html#L24948), unnamed `MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, metalness: 0.5 })`, inspector `color#24272b`).
  - `parent chain` up to `T.player`: `Mesh[inst:1] (rig.mags)` -> `Group` (carry `torso` group, `T(x, y, z) = (x, y - torsoPivotY, z)`) -> `Group (torsoG)` -> `Group (T.marine)` -> `Group (T.player)`.
  - `userData.rigSkin`: **`false`** ([`studio/marine-skin.js:38`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/marine-skin.js#L38) skips `InstancedMesh`).
- **Root cause (`index.html:25302`):**
  - `MAG_AT = [[-0.125, 0.705, 0.142], [0.125, 0.705, 0.142], ...]` still uses the pre-CC-340 belt height (`y = 0.705`). In CC-340 ([`studio/marine-body.js:181-204`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/studio/marine-body.js#L181-L204)), `HIP_Y = 0.785` (`LB = +0.165`) and `TORSO_Y = 0.865`, moving the belt (`y = 0.886`) and front pouches (`y = 0.862`) up `+16.5 cm`. Because `T(x, y, z)` subtracts `torsoPivotY = 0.865` inside `torsoG` at `y = 0.865`, `rig.mags[0]` lands back in marine space at `[-0.125, 0.705, 0.142]` (world `[-26.130, -199.293, -631.857]` -> `px [687, 850]`), `~15.7 cm` below the belt pouch on his right thigh front.
  - It is NOT introduced by `CC-357 c` or `GP-20151`. Visually, `ag-b` (`14:21Z`, `I.shot()`) and the `20:20Z` `ag-c` capture (`cc357c-dark-square-q.jpg`) drew `rig.mags`, whereas `ag-c-live` (`20:30Z`), the `20:38Z` `ag-c` re-run, and `pick-*.png` (`renderDirect` / `compileAsync`) did not draw that `InstancedMesh` instance onto the canvas despite `visible: true, count: 1`. (Note: `I.shot()` returned black `centerRgb: [0,0,0]` under the `pick-dark-square.mjs` DOM/canvas CSS setup.)

## Pair Comparison Summary (`LIVE` vs `CC-357 c`)
- `pair-sheet-stand.jpg` & `pair-sheet-aims.jpg`: identical all-gear-off loadout and cameras across both rows; poses (`pistol`, `unarmed`, `pistolaim`, `rifleaim`) and noon/night lighting render cleanly.
- `crop-wrist-3x.png` (`ag-b` vs `ag-c`): left and right forearm cords that stood `~2–3 cm` off the sleeves in `ag-b` now lie flush along both sleeves.
- `crop-boots-3x.png` (`live` vs `ag-b` vs `ag-c`): boot tongue sliver lowered below the tapered cuff edge; upper laces sit cleanly.
- `crop-belt-bands-3x.png` (`live` vs `ag-c`): front pouches shifted `13 mm` inward on the belt, dump pouch shifted `25 mm` toward center, and `GP-20151` thigh bands replace the thick floating drop-leg thigh rings flush against the tapered trousers.

## Outputs
- [`review/CC-357/ag-c/dark-square-pick-marked.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/dark-square-pick-marked.jpg)
- [`review/CC-357/ag-c/pair-sheet-stand.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/pair-sheet-stand.jpg)
- [`review/CC-357/ag-c/pair-sheet-aims.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/pair-sheet-aims.jpg)
- [`review/CC-357/ag-c/crop-wrist-3x.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/crop-wrist-3x.png)
- [`review/CC-357/ag-c/crop-boots-3x.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/crop-boots-3x.png)
- [`review/CC-357/ag-c/crop-belt-bands-3x.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c/crop-belt-bands-3x.png)
- [`qa/2026-11-17-AG-340/pick-result.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-340/pick-result.json)
