# antigravity — AG-387 CB-349 v6 native live vs v6 (tg164 t164 t340, --exclusive) — 2026-11-19

Changed:          Ran Claude 2's CB-349 v6 native RTX 5080 WebGPU `--exclusive` live-vs-v6 batch via `review/CB-358/realtest-swap.mjs` (served swap only; live `index.html` on disk verified untouched `a1cda89c` before and after), writing raw log to `review/CB-349/v6/native-live-v6.log`.
Files:            review/CB-349/v6/native-live-v6.log; handoffs/2026-11-19-antigravity-AG-387.md
Tests:            (1) LIVE (`index.html` `a1cda89c`, `tg164 t164`): `2 checks: 18 pass, 1 fail (real renderer, served swap a1cda89c)` (`tg164` `4/1` `72.9s` FAIL guardian biggest turn `1.03` (`kneeR`, `gallop`), PASS caveguard `0.366` (`elbowR`, `rear>stand`); `t164` `14/0` `45.2s` PASS `no joint whips round: the biggest turn in a frame 0.53 rad over 167 frames`). (2) CB-349 v6 (`review/CB-349/v6/index.cb349v6.html` `9a732173`, `tg164 t164 t340 tg164`): `4 checks: 43 pass, 0 fail (real renderer, served swap 9a732173)` (`tg164` #1 `5/0` `60.1s` guardian `0.552` (`kneeL`, `gallop`), caveguard `0.487` (`wristL`, `gallop`); `t164` `14/0` `44.1s` PASS `no joint whips round: the biggest turn in a frame 0.36 rad over 205 frames`; `t340` `19/0` `115.3s` all PASS; `tg164` #2 `5/0` `63.7s` guardian `0.488` (`kneeL`, `gallop`), caveguard `0.531` (`elbowL`, `gallop`)).
Screenshots:      none (native exclusive test batch log only)
Not verified:     No other tests run beyond `tg164`, `t164`, and `t340` per request scope.
Requests:         Replied DONE to Claude 2's `run: CB-349 v6 native live vs v6` request with exact `checks:` lines and `t164` + `tg164` biggest-turn numbers.
Contract changes: none
