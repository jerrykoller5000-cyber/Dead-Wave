# antigravity — AG-346 LANDED index 668e97a3: native t164 t340 t222 t93 + J167 guardian/caveguard set — 2026-11-17

Changed:          Ran the plain native `realtest` batch (`t164 t340 t222 t93 --all`) and captured the 12-shot J167 landed guardian + caveguard gallop/fold/stand look on landed `index.html` (`668e97a3`). No game files modified.
Files:            `qa/2026-11-17-AG-346-landed/run-realtest.mjs`, `qa/2026-11-17-AG-346-landed/capture-landed-j167.mjs`, `qa/2026-11-17-AG-346-landed/build_landed_j167_sheet.py`, `review/CB-349/landed/realtest-668e97a3.log`, `review/CB-349/landed/summary.json`, `review/CB-349/landed/landed-*.png` (`12` unique PNGs), `review/CB-349/landed/CB-349-landed-sheet.jpg` (`455889` bytes)
Tests:            `node crew/crew.mjs slot run antigravity AG-346 --checks "landed 668e97a3: t164 t340 t222 t93" -- node qa/2026-11-17-AG-346-landed/run-realtest.mjs` → `4 checks: 55 pass, 1 fail (real renderer)`:
                  - `t164`: **FAIL** `13 pass 1 fail` (`66.2s`) — `FAIL no joint whips round: the biggest turn in a frame 1.01 rad over 77 frames (the world turn of a chain; each joint is capped at 0.2)`; other 13 cases pass (`lowest -0.11 m` gallop, `-0.009 m` stand, `head 2.12-3.52 of 3.62`, eyes `0.83`).
                  - `t340`: **PASS** `19 pass 0 fail` (`69.0s`).
                  - `t222`: **PASS** `12 pass 0 fail` (`228.3s`, head `35/36`, chest `body 23 / head 1`, legs `20/24`, ground/past `1`, knees front/back `10/10`, crown `10`, runner `16/16`).
                  - `t93`: **PASS** `11 pass 0 fail` (`69.9s`).
                  `node crew/crew.mjs slot run antigravity AG-346 --checks "J167 landed 668e97a3 guardian + caveguard gallop/fold/stand 5080 WebGPU" -- node qa/2026-11-17-AG-346-landed/capture-landed-j167.mjs` → exited `0` (`WebGPUBackend`, `12/12` unique `1280x720` PNGs, `pageErrors=0`, `inspectorErrors=0`). Full `npm test` not run.
Screenshots:      `review/CB-349/landed/CB-349-landed-sheet.jpg` plus 12 full-res PNGs (`landed-{guardian,caveguard}-{gallop,fold,stand}-{side,low3q}.png`).
Not verified:     Night pass omitted (noon AG-342 comparison cameras requested); `t164` whip threshold `<= 0.9 rad` failed at `1.01 rad over 77 frames` on this landed run (see `review/CB-349/landed/realtest-668e97a3.log`).
Requests:         Replied to Claude 2 (`LANDED index 668e97a3`).
Contract changes: none

## Landed J167 Metrics & Visual Notes (`index.html` `668e97a3`, `guardian-detail` `460d1acf`, `cave-guardian` `d3cd4dfc`)
- **`guardian` (`seed=349001`)**: 90-frame gallop ankle/sole min..med `13.41 / 21.24 cm` (sole `-2.48 / 0 cm`, max `+11.68 cm`). Selected frames: gallop (`idx=8`) ankle `13.41/13.93 cm`, sole `-1.03/-0.50 cm`; fold (`idx=42`, `trail=104.71 cm`) ankle `30.25/30.91 cm`, sole `-1.66/-0.87 cm`; stand sole `-0.93/-0.93 cm`.
- **`caveguard` (`seed=349002`)**: 90-frame gallop ankle/sole min..med `10.49 / 19.64 cm` (sole `-2.65 / +0.45 cm`, max `+11.36 cm`). Selected frames: gallop (`idx=76`) ankle `11.15/10.49 cm`, sole `-0.97/-1.04 cm`; fold (`idx=67`, `trail=61.86 cm`) ankle `24.68/27.34 cm`, sole `-1.88/-0.67 cm`; stand sole `-1.04/-1.04 cm`.
- Visually on all 12 frames (`CB-349-landed-sheet.jpg` and full-res side/low3q PNGs), hind soles sit flush on the studio floor with zero sunken limbs below the grid; in the fold pose the trailing shin lies along the floor cleanly as in CB-349 v5.
