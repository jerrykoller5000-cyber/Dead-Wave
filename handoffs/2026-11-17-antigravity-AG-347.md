# antigravity — AG-347 Leaper re-shoot in LIVE mode (applyLeaperMotion paw solve) — 2026-11-17

Changed:          Re-captured `leaper` in `DWInspect` `mode='live'` (3 animation ticks so `applyLeaperMotion` paw solve runs, unlike `statue` mode), saving 9 unique `1200x1200` WebGPU PNGs (`review/AG-341/leaper-live/`) and contact sheet (`review/AG-341/sheet-leaper-live.jpg`). No game files modified.
Files:            `qa/2026-11-17-AG-341-roster/capture-leaper-live.mjs`, `qa/2026-11-17-AG-341-roster/build_leaper_live_sheet.py`, `review/AG-341/leaper-live/summary.json`, `review/AG-341/leaper-live/*.png` (`9` PNGs), `review/AG-341/sheet-leaper-live.jpg` (`338062` bytes)
Tests:            `node crew/crew.mjs slot run antigravity AG-347 --checks "AG-347 LIVE mode leaper (applyLeaperMotion paw solve) 9 shots" -- node qa/2026-11-17-AG-341-roster/capture-leaper-live.mjs` → exited `0` (`task-744`, `WebGPUBackend`, `9/9` unique `1200x1200` PNGs, `pageErrors=0`, `inspectorErrors=0`); `python qa/2026-11-17-AG-341-roster/build_leaper_live_sheet.py` → `338062` bytes, `9/9` unique.
Screenshots:      `review/AG-341/sheet-leaper-live.jpg` (`91606804`, `73bef9c7`, `8afcefae`, `96c6d23f`, `dffdcd0c`, `36f7d2fa`, `cad8d216`, `aafb9a41`, `d40f419b`) plus inspected full-res `leaper-live-noon-{side,front,3q}.png`.
Not verified:     Interrupted reaction states (`hitReact` / `sleep` / `knock`); grid overlay was off (`overlay('grid', false)`, matching `AG-341` sheets) and `floorGapCm` measured `-9.97 cm` below `stage.center.y = -200` (`boxMinY = -200.0997`).
Requests:         Replied DONE to CLAUDE DIRECTOR (`Leaper re-shoot in LIVE mode`).
Contract changes: none

## Visual Inspection (`index.html` `668e97a3`, `game/leaper-motion.js` `f6252825`)
- **`applyLeaperMotion` pose (`mode='live'`, `boundsH = 1.215 m` vs `1.3393 m` in statue)**: Hind legs now tuck cleanly forward under the hips with flexed knees/ankles and planted hind feet, while both forelimbs flex forward onto the clawed paws — eliminating the straight-back mid-leap plank seen in statue mode (`sheet-leaper.jpg`).
- **Floor & shadow reading (`leaper-live-noon-{side,front,3q}.png`)**: Skinned vertex bounds sit `floorGapCm = -9.97 cm` (`boxMinY = -200.0997` below `floorY = -200`, driven by the downward-curled long fore-claws/hind toes below `frontY = 0.075*scale`, `rearY = 0.065*scale` and the step pose after 3 ticks), and no ground shadow appears on the `overlay('grid', false)` studio floor despite `castShadow = 1/1`. At `night`, emissive cyan eyes and dorsal silhouettes remain clearly readable.
