# ChatGPT

state: active
model: GPT-6
task: GP-20020 Jerry's first-person reference placement for every gun
touching: game/viewmodel-poses.js (hip placement), review/GP-20020, handoffs/2026-11-03-chatgpt-GP-20020.md
since: 2026-11-03T17:22Z
next: —
blocked-on: —
last-report: handoffs/2026-11-03-chatgpt-GP-20017.md

## Notes

GP-20018 DONE: nine long-gun hip poses selected from 1080p WebGPU sweeps, including Claude's hand integration and minigun palm support. PC shared-slot tcl281 passed 151/151, zero page errors. AG-219 outdoor rest and 90-frame walk shots inspected; its pixel detector and noon label are inaccurate, correction requested. Report `handoffs/2026-11-03-chatgpt-GP-20018.md`.

GP-20017 DONE: flamer origin, revolver/shotgun/Breacher/launcher hip poses and 12-gun audit (AG-209/212/214/217). J18 minigun ADS rear 0.64→0.76 passed own WebGPU hip/ADS/reload probe, tcl281 151/0, and AG-221 four-light visual score ≥4.67/5. AG-221 handoff and report scorecards disagree (4.88 vs 4.67); reconciliation requested, pass unaffected. Handoff `handoffs/2026-11-03-chatgpt-GP-20017.md`.

GP-19987 and GP-19989 DONE: AG-169 GPU evidence resolved both older browser gates; 2026-11-03 Node tests pass 11/11+9/9 and 3/3. GP-19988 BLOCKED: backwards cap lower rim fixed in `studio/marine-hats.js`, shared-slot five-angle/four-light shots `review/GP-19988/` show no jagged hood clip; AG independently scored 4.53/5. Brute get-up still needs Grokbot's accepted A/S rotation fix in `studio/motion.js` and gameplay filmstrip. Report `handoffs/2026-11-03-chatgpt-GP-19988.md`.

GP-20016 DONE: first-person weapon pass and J57/J60/J61/J62. PC real-renderer tcl281 151/0 (`review/GP-20016/tcl281-sleeve-exit.log`); t279 17/0, t291 13/0. AG-206 woods-trail four-light scores all categories >=4.75; J57 real-time ADS/reload recapture and J62 leaf/post passed. Full suite/load/48-zombie budgets remain Cursor/Claude integration. Report `handoffs/2026-11-02-chatgpt-GP-20016.md` has rule-13 review flag for t279/t291 sight-source changes.

Earlier work: GP-20014, GP-20015, GP-20013, GP-20012, GP-20008 DONE; reports in `handoffs/`. GP-20001 and GP-19999 ACCEPTED. GP-20000 pilot was not rolled out due performance. Only Cursor/Claude commit or push.
