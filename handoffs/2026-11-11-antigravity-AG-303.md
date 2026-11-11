# AG-303 — CE-6 (J136) 4-Light RTX 5080 GPU Verification: Revolver Cylinder (Single & Pair) and Launcher Drum Turning Per Pull

## Changed:
- `qa/2026-11-11-CE-6/ce6-gpu-look.mjs`: Headed offscreen RTX 5080 WebGPU 4-light (`noon`, `overcast`, `dusk`, `night`) capture & chamber-indexing telemetry harness in the Training Ground (`(-3800, -3800)`).
- `qa/2026-11-11-CE-6/build-ce6-sheets.py`: Contact sheet builder generating `sheet-1-ce6-revolver-1p-3p-4lights.jpg` and `sheet-2-ce6-pair-and-launcher-4lights.jpg`.
- `review/CE-6/gpu/`: Saved `ce6-metrics.json`, 4-light full-resolution stills (`stills/*.jpg`), `sheet-1-ce6-revolver-1p-3p-4lights.jpg`, and `sheet-2-ce6-pair-and-launcher-4lights.jpg`.

## Tests:
- Ran `node crew/crew.mjs slot run antigravity AG-303 -- node qa/2026-11-11-CE-6/ce6-gpu-look.mjs` on RTX 5080 WebGPU (`pageErrors: []`):
  1. **Revolver Single (1P Eye & 3P Close, 6 Pulls + 1 Reload):**
     - Pulls `1..6` in both 1P and 3P indexed `deltaChambers = [1, 1, 1, 1, 1, 1]` (+60° clockwise from behind per pull).
     - Mid-pull (`t = 0.10s`, before the `0.12s` DA break): next live chamber (`5, 4, 3, 2, 1, 0`, `midTopLive = true` on all 6) rotated cleanly to the top bore, hammer cocked (`midHammerRotX = -0.382`), trigger pulled (`midTriggerRotX = +0.22`), and 1P view cylinder matched 3P world cylinder to `0.00°` (`vmAngleDeg = 0` mid-pull and at rest).
     - Zero rest flicker between shots (`restFlickerChambers = 0` across all 6 pulls).
     - Reload continuity (`revolverReload`): `worstSingleFrameDeltaChambers = 0.1612` (`< 0.5`), `liveAfter = 6`, `topAfter = 0` — zero cylinder snap/jump at reload start or end.
  2. **Revolver Akimbo Pair (1P Eye, 6 Alternating Pulls):**
     - `(mainDelta, offhandDelta) = [(1, 0), (0, 1), (1, 0), (0, 1), (1, 0), (0, 1)]` with `(mainLive, offhandLive)` stepping `(5,6) -> (5,5) -> (4,5) -> (4,4) -> (3,4) -> (3,3)` — each revolver indexes strictly on its own pull while the other stays motionless.
  3. **Grenade Launcher (1P Eye & 3P Front-Drum Close, 6 Shots + 1 Reload):**
     - Shots `1..6` in both 1P and 3P indexed `deltaChambers = [-1, -1, -1, -1, -1, -1]` (-60° consistent M32 spring turn ~70 ms after each shot, `topAfter = 4, 3, 2, 1, 0, 5`), `vmDrumAngleDeg = 0°`, `restFlickerChambers = 0`.
     - Reload continuity (`launcherReload`): `worstSingleFrameDeltaChambers = 0.2051` (`< 0.5`), `liveAfter = 6`, `topAfter = 5` — zero drum snap/jump at reload start or end.
     - Note for follow-up: `ChatGPT 2`'s `GT-20080` (`98f31b9d1`) just added `lud.drumNoses[0..5]` (separate projectile nose cones from `drumRounds` brass cases); currently all 6 `drumNoses` stay `visible = true` across shots `1..6` until `indexChambers` / `updateAmmoHud` wires `drumNoses[i].visible = i < L`.

## Not verified:
- Field (valley) lighting outside the Training Ground; all 4 standard light presets (`noon`, `overcast`, `dusk`, `night`) were verified inside the Training Ground on the real WebGPU renderer.
