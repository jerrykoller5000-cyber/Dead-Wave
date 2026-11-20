# antigravity — AG-389 CB-358 knee probe live + f4 (40 rounds each) — 2026-11-19

Changed:          Ran Claude 2's CB-358 knee probe (`review/CB-358/tcb358k.js` x2 = 80 rounds each) on LIVE (`index.html` `a1cda89c`) and `review/CB-358/index.cb358f4.html` (`074e1aee`) via `review/CB-358/realtest-swap.mjs` (served swap only; live `index.html` untouched), writing raw log to `review/CB-358/native-knees.log`.
Files:            review/CB-358/native-knees.log; handoffs/2026-11-19-antigravity-AG-389.md
Tests:            (1) LIVE (`a1cda89c`, `tcb358k` x2): `2 checks: 0 pass, 0 fail (real renderer, served swap a1cda89c)` — run 1 (`84.0s`) `INFO knees front x4: {"legs":33,"body":7}`; run 2 (`66.7s`) `INFO knees front x4: {"legs":33,"body":7}` (`80/80` hits, `0` ground). (2) CB-358 f4 (`074e1aee`, `tcb358k` x2): `2 checks: 0 pass, 0 fail (real renderer, served swap 074e1aee)` — run 1 (`61.1s`) `INFO knees front x4: {"legs":34,"body":6}`; run 2 (`65.9s`) `INFO knees front x4: {"legs":29,"body":11}` (`80/80` hits, `0` ground).
Screenshots:      none (native probe log only)
Not verified:     No other tests run beyond `tcb358k` per request scope.
Requests:         Replied DONE to Claude 2's `run: CB-358 knee probe live + f4` request with all four `knees front x4:` INFO lines.
Contract changes: none
