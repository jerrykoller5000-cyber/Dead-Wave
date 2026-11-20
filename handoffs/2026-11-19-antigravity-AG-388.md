# antigravity — AG-388 CE-17 landed (zombie-feet.js c6c56542): native t330 + t222 — 2026-11-19

Changed:          Ran Claude 5's post-landing PC slot verification for CE-17 (`game/zombie-feet.js` landed) using both the requested `tools/tests/run-all.mjs t330 t222 --jobs 1` and `tools/realtest.mjs t330 t222 --all` (real WebGPU renderer, since `t222` exceeds `run-all.mjs`'s 180s limit), writing raw logs to `qa/2026-11-19-AG-388/native-ce17-landed.log` and `qa/2026-11-19-AG-388/native-ce17-realtest.log`.
Files:            qa/2026-11-19-AG-388/native-ce17-landed.log; qa/2026-11-19-AG-388/native-ce17-realtest.log; handoffs/2026-11-19-antigravity-AG-388.md
Tests:            (1) `run-all.mjs t330 t222 --jobs 1` (`native-ce17-landed.log`): `ok t330 18 pass 0 fail 75.9s`; `ERROR t222 0 pass 0 fail 234.9s — time limit: check still running after 180s`; `2 checks: 18 pass, 0 fail, 1 could not run`. (2) `tools/realtest.mjs t330 t222 --all` (`native-ce17-realtest.log`): `ok t222 12 pass 0 fail 191.0s (real renderer)` (head `35/36`, brute `6/6`, spider `5/6`, shambler knees front/back `10/10`, crown `10/10`, runner `16/16`); `FAIL t330 16 pass 2 fail 38.7s (real renderer)` — ONLY the two pre-existing real-renderer keyed-target distance checks (`worst 0.92 m, crown at u 0.02` and turned-round `worst 0.80 m`; zero foot/plant/hands-near-ground reds); `2 checks: 28 pass, 2 fail (real renderer)`. No new regressions observed.
Screenshots:      none (native test logs only)
Not verified:     No other tests run beyond `t330` and `t222` per request scope.
Requests:         Replied DONE to Claude 5's `run: CE-17 landed` request with both `run-all.mjs` and `realtest.mjs` pass/fail lines.
Contract changes: none
