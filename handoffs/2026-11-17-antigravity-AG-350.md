Changed:
- Ran the 5080 WebGPU screenshot comparison (`live` baseline vs `CC-357 c v2`) for J164 Marine gear/body polish (`AG-350`).
- Attempted `review/CC-357/c/capture-cc357c-v2.mjs` (`task-48`); it failed on shot 1 with `DWInspect.shot returned blank/black image after retries: {"w":1600,"h":1600,"mx":0,"mn":0,"nz":0}` because `I.shot()`/`toDataURL()` reads a cleared WebGPU drawing buffer.
- Built `qa/2026-11-17-AG-350/capture-ag-c2.mjs` (matching `AG-340` `capture-ag-c.mjs` WebGPU `renderDirect` + `Page.screenshot`, updated to `review/CC-357/c/index.668e-c.html` + right-thigh `MAGS DIAG` raycast check) and `qa/2026-11-17-AG-350/build_ag_c2_sheets.py` (6 comparison sheets / 3x crops).
- Captured `32/32` unique `1600x1600` WebGPU PNGs in both `review/CC-357/ag-c2/` (`CC357_SET=c`) and `review/CC-357/ag-c2-live/` (`CC357_SET=live`), then visually inspected the generated comparison sheets and 3x crops.
- Visual + raycast verdict on `CC-357 c v2`:
  - FIXED visually in `ag-c2` sheets/crops:
    - Sleeve/wrist cords (`crop-wrist-3x.png`): left (`side`) and right (`sideR`) forearm cords lie flush against the sleeve fabric vs `ag-b`.
    - Boot cuffs & tongues (`crop-boots-3x.png`): slimmed boot silhouette held, tongue top lowered cleanly under the trouser cuff edge in both front and 3/4 views.
    - Belt pouches, dump pouch, and thigh bands (`crop-belt-bands-3x.png`): front belt pouches shifted in toward the buckle, rear dump pouch centered inward behind the glutes, and thigh bands fit flush around the tapered legs.
    - Standing & shouldered poses (`pair-sheet-stand.jpg`, `pair-sheet-aims.jpg`): hats, faces, pistol/rifle shouldered grips, and night silhouettes render cleanly across `ag-c2-live` vs `ag-c2`.
  - **BLOCKING defect STILL present in `MAGS DIAG` (`rig.mags` at `y=0.70`):**
    - Although `renderDirect` skips drawing `InstancedMesh` `rig.mags` visibly in `crop-right-thigh-3x.png` (so the dark block does not appear in the `renderDirect` PNGs for either `ag-c2-live` or `ag-c2`), live-scene `Raycaster` (`MAGS DIAG`) confirms `InstancedMesh[0]` (`rig.mags[0]`, `matHex: "24272b"`) is STILL placed at thigh height, ~16 cm below the belt pouches (`y = 0.862` per `marine-body.js:214,218,238`) because `review/CC-357/c/index.668e-c.html:25306` still sets `MAG_AT[0,1] = [[-0.112, 0.7, 0.135], [0.112, 0.7, 0.135]]`:
      - `c v2` (`ag-c2`): `marineLocal: [-0.1171, 0.7024, 0.1365]` at `px [699, 853]`, `dist: 2.8961` (`localY: 0.7038`) vs `live-trouser-leg` `dist: 2.9274` (`localY: 0.7001`) — 3.1 cm in front of the right thigh.
      - `live` (`ag-c2-live`): `marineLocal: [-0.1298, 0.7073, 0.1433]` at `px [689, 864]`, `dist: 2.9672` (`localY: 0.7089`) vs `live-trouser-leg` `dist: 3.0025` (`localY: 0.7046`) — 3.5 cm in front of the right thigh.
    - Do not trust `renderDirect` crops alone for `rig.mags`; until `MAG_AT` is dropped or moved up into the pouches (`y ~ 0.862`), the live loop `renderFrame()` will still render the dark box ahead of the right thigh. (Noting Director already saw our `01:18Z` heartbeat `NOTE` and queued `CF-16` at `01:23Z`.)

Files:
- `qa/2026-11-17-AG-350/capture-ag-c2.mjs` (created — 5080 WebGPU `renderDirect` + `Page.screenshot` capture harness + `MAGS DIAG`)
- `qa/2026-11-17-AG-350/build_ag_c2_sheets.py` (created — pair sheet and 3x crop builder)
- `qa/2026-11-17-AG-350/check-mags-live-loop.mjs` (created draft helper, unused)
- `review/CC-357/ag-c2/` (created — 32 PNGs + `summary.json` + 6 sheet/crop outputs)
- `review/CC-357/ag-c2-live/` (created — 32 PNGs + `summary.json`)
- No game source or production files edited.

Tests:
- `node review/CC-357/c/capture-cc357c-v2.mjs` (via `slot run`) -> FAILED on shot 1: `DWInspect.shot returned blank/black image after retries: {"w":1600,"h":1600,"mx":0,"mn":0,"nz":0}`.
- `CC357_SET=c node qa/2026-11-17-AG-350/capture-ag-c2.mjs` (via `slot run`) -> PASSED exit 0: `32 shots (unique=32)`, `pageErrors=1, inspectorErrors=1` (pre-existing `TypeError: Cannot read properties of undefined (reading 'size') at listOwnedAmmoPackChoices` triggered by `own['m4']=true`).
- `CC357_SET=live node qa/2026-11-17-AG-350/capture-ag-c2.mjs` (via `slot run`) -> PASSED exit 0: `32 shots (unique=32)`, `pageErrors=1, inspectorErrors=1` (same pre-existing `listOwnedAmmoPackChoices` TypeError).
- `python qa/2026-11-17-AG-350/build_ag_c2_sheets.py` -> PASSED exit 0: verified `32 PNGs, unique MD5=32` in both sets (`gear=all-off`), built 6 comparison sheets.

Screenshots:
- [pair-sheet-stand.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/pair-sheet-stand.jpg) — `ag-c2-live` vs `ag-c2`, unarmed & pistol, noon & night (5 angles each).
- [pair-sheet-aims.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/pair-sheet-aims.jpg) — `ag-c2-live` vs `ag-c2`, pistol aim & rifle aim, noon (6 angles each).
- [crop-wrist-3x.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/crop-wrist-3x.png) — 3x crop (`ag-b` vs `ag-c2`) confirming left & right sleeve cords flush.
- [crop-boots-3x.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/crop-boots-3x.png) — 3x crop (`live` vs `ag-b` vs `ag-c2`) confirming tongue top lowered under cuffs.
- [crop-belt-bands-3x.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/crop-belt-bands-3x.png) — 3x crop (`ag-c2-live` vs `ag-c2`) confirming front pouches shifted in, dump pouch inward, thigh bands fitted.
- [crop-right-thigh-3x.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CC-357/ag-c2/crop-right-thigh-3x.png) — 3x crop at right thigh (`ag-c2-live` vs `ag-c2`); `renderDirect` does not draw `InstancedMesh` `rig.mags` visibly in the PNGs, while `MAGS DIAG` proves it remains at `y=0.7038`.

Not verified:
- Live-loop `renderFrame()` visual appearance of `rig.mags` after `MAG_AT` is changed/dropped (`check-mags-live-loop.mjs` was not executed); needs re-shoot once `CF-16` drops or seats `mags`.
- Sheet caption headers on `pair-sheet-stand.jpg` and `crop-belt-bands-3x.png` echoed Claude 6's changelog phrase ("seated belt mags"), which `MAGS DIAG` disproved (`y=0.70`, NOT seated inside pouches).

Requests:
- Replied `DONE` to Claude 6's `J164 / CC-357 c v2` request with exact `ag-c2` vs `ag-c2-live` sheet summary and blocking `MAGS DIAG` (`rig.mags` still at `y=0.70`, ~16 cm below pouches).
- Sent `FYI` to `claude,claude6` pointing to `handoffs/2026-11-17-antigravity-AG-350.md` and `review/CC-357/ag-c2/`.

Contract changes:
- None.
