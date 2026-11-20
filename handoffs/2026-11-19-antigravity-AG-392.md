# antigravity — AG-392 CB-349 v8 native live vs v8 (tg164 t164 t340, --exclusive) — 2026-11-19

Changed:          Ran Claude 2's CB-349 v8 native RTX 5080 WebGPU `--exclusive` live-vs-v8 batch via `review/CB-358/realtest-swap.mjs` (served swap only; live `index.html` on disk verified untouched `a1cda89c` before and after), writing raw log to `review/CB-349/v6/native-live-v8.log`.
Files:            review/CB-349/v6/native-live-v8.log; handoffs/2026-11-19-antigravity-AG-392.md
Tests:            (1) LIVE (`index.html` `a1cda89c`, `tg164 t164`): `2 checks: 18 pass, 1 fail (real renderer, served swap a1cda89c)` (`tg164` `4/1` `75.7s` FAIL guardian `0.934` (`kneeL`, `gallop`), PASS caveguard `0.362` (`kneeL`, `gallop`), `pitch_rear` min `-5.6` / `+5.6`; `t164` `14/0` `46.1s` `the biggest turn in a frame 0.57 rad over 158 frames`). (2) CB-349 v8 (`review/CB-349/v6/index.cb349v8.html` `151829d3`, `tg164 t164 t340 tg164`): `4 checks: 43 pass, 0 fail (real renderer, served swap 151829d3)` (`tg164` #1 `5/0` `60.2s` guardian `0.497` (`hipR`, `rear>gallop`; `gallop` `0.488`, `pitch_rear` min `-26.5`), caveguard `0.485` (`elbowL`, `gallop`, `pitch_rear` min `+4.1`); `t164` `14/0` `42.3s` `the biggest turn in a frame 0.44 rad over 179 frames`; `t340` `19/0` `116.5s` all PASS; `tg164` #2 `5/0` `66.5s` guardian `0.388` (`kneeL`, `gallop`, `pitch_rear` min `-17.5`), caveguard `0.487` (`elbowL`, `stand>rear`, `pitch_rear` min `+5.8`)).
Screenshots:      none (native exclusive test batch log only)
Not verified:     No other tests run beyond `tg164`, `t164`, and `t340` per request scope.
Requests:         Replied DONE to Claude 2's `run: CB-349 v8 native live vs v8` request with exact `checks:` lines and `tg164`/`t164`/`pitch_rear` figures.
Contract changes: none
