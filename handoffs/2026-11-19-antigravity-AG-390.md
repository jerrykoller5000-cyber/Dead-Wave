# antigravity — AG-390 CB-349 v7 native live vs v7 (tg164 t164 t340, --exclusive) — 2026-11-19

Changed:          Ran Claude 2's CB-349 v7 native RTX 5080 WebGPU `--exclusive` live-vs-v7 batch via `review/CB-358/realtest-swap.mjs` (served swap only; live `index.html` on disk verified untouched `a1cda89c` before and after), writing raw log to `review/CB-349/v6/native-live-v7.log`.
Files:            review/CB-349/v6/native-live-v7.log; handoffs/2026-11-19-antigravity-AG-390.md
Tests:            (1) LIVE (`index.html` `a1cda89c`, `tg164 t164`): `2 checks: 19 pass, 0 fail (real renderer, served swap a1cda89c)` (`tg164` `5/0` `85.4s` guardian `0.82` (`kneeL`, `gallop`), caveguard `0.511` (`elbowR`, `rear`); `t164` `14/0` `48.5s` `the biggest turn in a frame 0.44 rad over 164 frames`). (2) CB-349 v7 (`review/CB-349/v6/index.cb349v7.html` `6e888a4b`, `tg164 t164 t340 tg164`): `4 checks: 43 pass, 0 fail (real renderer, served swap 6e888a4b)` (`tg164` #1 `5/0` `67.0s` guardian `0.736` (`kneeL`, `rear>gallop`; `gallop` `0.569`), caveguard `0.343` (`elbowL`, `rear>stand`); `t164` `14/0` `58.6s` `the biggest turn in a frame 0.38 rad over 191 frames`; `t340` `19/0` `119.3s` all PASS; `tg164` #2 `5/0` `73.6s` guardian `0.772` (`kneeL`, `rear>gallop`; `gallop` `0.595`), caveguard `0.691` (`shoulderL`, `gallop`)).
Screenshots:      none (native exclusive test batch log only)
Not verified:     No other tests run beyond `tg164`, `t164`, and `t340` per request scope.
Requests:         Replied DONE to Claude 2's `run: CB-349 v7 native live vs v7` request with exact `checks:` lines and `t164`/`tg164` turn figures.
Contract changes: none
