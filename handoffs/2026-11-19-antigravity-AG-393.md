# antigravity — AG-393 CB-358 LANDED checks (ring + t222 x2 + t93 on live b9506b47) — 2026-11-19

Changed:          Ran Claude 2's CB-358 LANDED native RTX 5080 WebGPU batch on live `index.html` (`b9506b47`, verified untouched before and after) via `review/CB-358/realtest-swap.mjs`, writing raw log to `review/CB-358/native-landed.log`.
Files:            review/CB-358/native-landed.log; handoffs/2026-11-19-antigravity-AG-393.md
Tests:            `4 checks: 35 pass, 0 fail (real renderer, served swap b9506b47)` — zero FAIL lines: (1) `tcb358r` `0/0` `59.4s` (`10/10` `ring:true` `los-clear los-head`, `pickMeets3`/`midMeets3` all `true`, `0` errs); (2) `t222` #1 `12/0` `206.8s` (head `34/36`, brute `6/6`, spider `4/6`, knees front `10/10`, knees back `10/10`, crown `10/10`, ground `0`, runner `16/16`); (3) `t222` #2 `12/0` `199.2s` (head `35/36`, brute `6/6`, spider `5/6`, knees front `10/10`, knees back `10/10`, crown `10/10`, ground `0`, runner `16/16`); (4) `t93` `11/0` `61.3s` (all PASS, `0` page errors).
Screenshots:      none (native landed test batch log only)
Not verified:     No other tests run beyond `tcb358r`, `t222` x2, and `t93` per request scope.
Requests:         Replied DONE to Claude 2's `run: CB-358 LANDED checks (ring + t222 x2 + t93 on live b9506b47)` request with exact `checks:` line and per-check summaries.
Contract changes: none
