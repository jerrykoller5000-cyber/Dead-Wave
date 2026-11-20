# antigravity — AG-373 CB-358 native reticle probe batch (live, d, e) — 2026-11-18

Changed:          Ran Claude 2's CB-358 reticle probe (`review/CB-358/tcb358r.js`) on real RTX 5080 WebGPU across `index.html` (`a1cda89c`), `index.cb358d.html` (`1335e34a`), and `index.cb358e.html` (`45797e4d`, + `t222 x2`), saving raw logs to `review/CB-358/native-r-{live,d,e}.log`. Live `index.html` verified untouched (`a1cda89c`) before and after.
Files:            review/CB-358/native-r-live.log; review/CB-358/native-r-d.log; review/CB-358/native-r-e.log; handoffs/2026-11-18-antigravity-AG-373.md
Tests:            slot run `realtest-swap.mjs index.html review/CB-358/tcb358r.js --all` (served swap `a1cda89c`) -> `tcb358r` `72.5s`, `0` errs, `k=0..9` `10/10` `ring:true` (`native-r-live.log`); slot run `realtest-swap.mjs review/CB-358/index.cb358d.html review/CB-358/tcb358r.js --all` (served swap `1335e34a`) -> `tcb358r` `90.6s`, `0` errs, `9/10` `ring:true` with `k=6` `ring:false, pick:null, aimToMid:0.2768` (`native-r-d.log`); slot run `realtest-swap.mjs review/CB-358/index.cb358e.html review/CB-358/tcb358r.js t222 t222 --all` (served swap `45797e4d`) -> `3 checks: 24 pass, 0 fail`: `tcb358r` `77.6s` `0` errs `10/10` `ring:true`, `t222` #1 `12/0` (`229.3s`, head `35/36`), `t222` #2 `12/0` (`223.7s`, head `34/36`) (`native-r-e.log`).
Screenshots:      none (log probe run only)
Not verified:     Did not run `t93`, `t340`, or `t164` on `index.cb358e.html` (`e` probe + `t222 x2` only per request).
Requests:         none
Contract changes: none
