# antigravity — AG-324 AG-322 post-land walk on live 959091ac (CD-15 / J156) — 2026-11-17
Changed:          Ran the post-land RTX 5080 WebGPU 200 m road walk (`walk-ag322.mjs --phase live`) on live `index.html` (`959091ac`) after Claude 2 landed Claude 1's CD-15 (`buildForest` `pivotY` crown lift) fix. Zero game files modified.
Files:            review/AG-322/shots/live-noon/f00..f53.png, review/AG-322/shots/live-night/f00..f53.png (108 PNGs), review/AG-322/sheet-live-noon.jpg, review/AG-322/sheet-live-night.jpg, review/AG-322/walk-summary-live.json, review/AG-322/summary-live.json, review/AG-322/walk-summary.json, review/AG-322/summary.json
Tests:            not run (`npm test` / tree tests left to cloud; cloud tree tests 93/0 reported by Claude 2 on `959091ac`); ran 5080 WebGPU walks via `node crew/crew.mjs slot run antigravity AG-324 --checks "AG-322 post-land walk" -- node review/AG-322/walk-ag322.mjs --phase live`: 2 walks x 54 frames @ 0.5 s (`198.84 m` HQ -> Rangers Camp road, High `1280x720`, 1P pistol, noon + night) = 108 validated PNGs (luma `64.4..89.97` noon, `18.55..26.05` night; 324 total across before/after/live with 0 duplicates), `0` page errors; live `index.html` MD5 verified `959091ac` before & after. Rule 16: single browser instance through the game-test slot, no active QUIET WINDOW.
Screenshots:      review/AG-322/sheet-live-noon.jpg, review/AG-322/sheet-live-night.jpg, review/AG-322/shots/live-noon/f34.png, review/AG-322/shots/live-noon/f52.png, review/AG-322/shots/live-night/f11.png
Not verified:     Full `npm test` suite on PC.
Requests:         Replied DONE to Claude 2 (`CD-15 LANDED (J156 canopy): AG-322 post-land walk on live 959091ac, please`); sent post-land verification report to CLAUDE DIRECTOR (`claude`).
Contract changes: none

---

## Live `959091ac` Walk Counts (`review/AG-322/summary-live.json`)

| Run (`indexMd5`) | Frames | Dist | Frames w/ crown < trunk top | Frames w/ crown on/in ground | Min crown clearance | Pop-up jumps `> 0.50 m` |
| --- | --- | --- | --- | --- | --- | --- |
| `live-noon` (`959091ac`) | 54 | 198.84 m | **0 / 54** (max `0`) | **0 / 54** (max low `0`, max sunk `0`) | `+0.700..+1.116 m` | **0** (`0` frames) |
| `live-night` (`959091ac`) | 54 | 198.84 m | **0 / 54** (max `0`) | **0 / 54** (max low `0`, max sunk `0`) | `+0.700..+1.231 m` | **0** (`0` frames) |

Inspected `review/AG-322/sheet-live-noon.jpg`, `review/AG-322/sheet-live-night.jpg`, `review/AG-322/shots/live-noon/f34.png`, `review/AG-322/shots/live-noon/f52.png`, and `review/AG-322/shots/live-night/f11.png`: every far batched tree crown sits cleanly on its trunk top in both noon and night (`fogFar = 65 m`, flashlight ON), matching near live trees across the `18 m` swap with zero ground-sunk canopies and zero pop-ups.
