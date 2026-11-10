# ChatGPT

state: active
model: GPT-6.1 Sol
task: GP-20079 J128 zombie motion intersection audit and fixes
touching: studio/zombie-concepts.js, studio/zombie-guardian-detail.js, combat/demon-visual.js, combat/zombie-joins.js, combat/zombie-fidelity.js, game/spider-motion.js, studio/zombie-seating.test.mjs, index.html (zombie animation)
since: 2026-11-10T20:57Z
next: GP-20079 J128 (standing, D-140): the zombies in motion, nothing throu
blocked-on: —
last-report: handoffs/2026-11-10-chatgpt-GP-20078.md

## Notes

GP-20069 DONE: CIF wearables and repair live; kiosk wearables removed. Shared-slot Hunt 17/0, Training 5/0, legacy t101/t103/t285 36/0; AG-268 RTX 5080 visual 51/51 and six UI scores 5/5. Handoff handoffs/2026-11-09-chatgpt-GP-20069.md; full suite belongs to Grokbot GB-324. Playwright unavailable locally; CDP proof recorded.

GP-20067 DONE: ACOG/RMR switch and power copy in `ui/strings.js`; Node strings suite 16/0. Claude has requests to wire per-kind help and once-per-save first-aim hint in CL-323. Report `handoffs/2026-11-08-chatgpt-GP-20067.md`.

GP-20065 DONE: four fitted optics, kiosk purchase/Armory single slot, issued sniper NX8 and M240 ACOG. Shared-slot behavior 15/0, inspector 26/0, final 31 mount shots and four-light model captures. Claude has all sight datums for CL-323; full suite belongs to the committer. Report `handoffs/2026-11-08-chatgpt-GP-20065.md`.

GP-20035 DONE: all 17 CL-303 string keys and the Hold E winch prompt; tcl303 44/0, AG-249 RTX 5080 prompt shots without clipping. Report `handoffs/2026-11-06-chatgpt-GP-20035.md`. Queue empty at 01:20Z; continue from `me chatgpt` next check-in.

GP-20032 DONE: paced unreached release-suite batches 15–21, 65 checks/945 pass/6 known batch-16 reds (t277/t280); batches 17–21 green. Logs `review/GP-20032/`; report `handoffs/2026-11-06-chatgpt-GP-20032.md`. Full integration suite stays with Claude/Cursor.

GP-20034 DONE: gated machete absent from kiosk and vault, direct buy blocked; t332 4/0, vault unit 5/0, AG-248 real GPU comparison. Captain Hale's eight orders and gate strings in docs/story.md/ui/strings.js. Report `handoffs/2026-11-06-chatgpt-GP-20034.md`; Claude review requested for the existing vault callback approach.

GP-20031 DONE: gun furniture Multicam now tiles at 2.38095 repeats/m on AK/M4/shotgun held, first-person and rack copies, matching the 0.42 m uniform target; the slung minigun is corrected too. Real-renderer t146 passed 43/0. Before metrics, after shots and the honest rainy-noon lighting caveat are in `review/GP-20031/`; handoff `handoffs/2026-11-06-chatgpt-GP-20031.md`. Claude review requested. No git by me.

GP-20030: added the three-volume-slider line and GP-20029/AG-238 sources to the 1.2 patch notes; aligned nine settings tracks/values. Before/after menu shots at `review/GP-20029/settings-menu.png` and `review/GP-20030/settings-aligned.png`, with 390 px after shot, passed visual inspection. Report `handoffs/2026-11-06-chatgpt-GP-20030.md`; Claude reread requested.

GP-20029: three 0–100% volume sliders and separate live gain buses in `index.html`/`core/audio.js`, report `handoffs/2026-11-06-chatgpt-GP-20029.md`. Real-renderer t331 passed 11/0 twice; menu screenshots at 1600 and 390 px in `review/GP-20029/`. Claude was asked to review the mix and new AudioSys contract fields. Full suite and listening remain with integration.

GP-20028: Claude accepted the second 1.2 patch-notes draft in `docs/release/patch-notes-1.2.md`; report `handoffs/2026-11-06-chatgpt-GP-20028.md`. The “faster dead” checkpoint meant night-horde performance (GB-253), not zombie speed; Claude may add one player-facing Fixes line. Final default-build and commit-range check is Claude's at release time.

GP-20025 and GP-20026 DONE: mini-reflex/reflex/holo optic studies in `studio/weapon-optics.js`, 254/520/342 triangles; GP-20026 opened the holo hood with unchanged sight/mount datums. Shared-slot preview sheets `review/GP-20025/index.html` and `review/GP-20026/index.html` include 32 original and ten before/after views. Node test 1/1; Claude received GP-20026 pictures before later 1.3 integration. Handoffs in `handoffs/2026-11-05-chatgpt-GP-2002*.md`.

GP-20027 DONE: player-facing 1.2 patch notes draft in `docs/release/patch-notes-1.2.md`, built from Jerry's notes, D-95 and handoffs since 31 October. Claude was asked to compare the commit range and final default build before Jerry reads it; crew rule 6 kept me off git. Report `handoffs/2026-11-05-chatgpt-GP-20027.md`. Earlier GP-20020 hip placements passed tcl281 151/151 and AG-225 4.80/5; its report is in `handoffs/`.

GP-20018 DONE: nine long-gun hip poses selected from 1080p WebGPU sweeps, including Claude's hand integration and minigun palm support. PC shared-slot tcl281 passed 151/151, zero page errors. AG-219 outdoor rest and 90-frame walk shots inspected; its pixel detector and noon label are inaccurate, correction requested. Report `handoffs/2026-11-03-chatgpt-GP-20018.md`.

GP-20017 DONE: flamer origin, revolver/shotgun/Breacher/launcher hip poses and 12-gun audit (AG-209/212/214/217). J18 minigun ADS rear 0.64→0.76 passed own WebGPU hip/ADS/reload probe, tcl281 151/0, and AG-221 four-light visual score ≥4.67/5. AG-221 handoff and report scorecards disagree (4.88 vs 4.67); reconciliation requested, pass unaffected. Handoff `handoffs/2026-11-03-chatgpt-GP-20017.md`.

GP-19987, GP-19989 and GP-19988 DONE: AG-169 resolved the older browser gates; GP-19988 backwards cap four-light audit scored 4.53/5, Grokbot's brute get-up adapter and gameplay filmstrip scored at least 4.10/5 across all principles, and real-renderer t330 passed 17/17 twice. Reports in `handoffs/`.

GP-20016 DONE: first-person weapon pass and J57/J60/J61/J62. PC real-renderer tcl281 151/0 (`review/GP-20016/tcl281-sleeve-exit.log`); t279 17/0, t291 13/0. AG-206 woods-trail four-light scores all categories >=4.75; J57 real-time ADS/reload recapture and J62 leaf/post passed. Full suite/load/48-zombie budgets remain Cursor/Claude integration. Report `handoffs/2026-11-02-chatgpt-GP-20016.md` has rule-13 review flag for t279/t291 sight-source changes.

Earlier work: GP-20014, GP-20015, GP-20013, GP-20012, GP-20008 DONE; reports in `handoffs/`. GP-20001 and GP-19999 ACCEPTED. GP-20000 pilot was not rolled out due performance. Only Cursor/Claude commit or push.
