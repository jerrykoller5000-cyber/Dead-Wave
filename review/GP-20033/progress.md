# GP-20033 launcher leaf notch

Active check-in: 2026-11-06 18:52 UTC; touched `studio/weapon-heavy.js (launcher)`.

The previous `t277` solo run (`review/GP-20032/t277-solo.log`) reported “launcher: notch and tip are on the gun (notch found, blocked, tip y 0.137)”. In the builder, each upper half-rung came 2.5 mm from centre and the solid top bridge spanned centre. Both stood above the first notch's 0.137 m sight line. The first notch, front tip, datum and rest of the launcher stayed in place. The half-rung inner edges now start 3.5 mm off centre and the bridge is open; the side rails remain.

`node --check studio/weapon-heavy.js` passed. Shared-slot focused run at about 18:54 UTC, `review/GP-20033/focused.log`: `tcl281 140 pass 0 fail`, `t277 38 pass 1 fail`; the launcher line is now green. The one red is the chainsaw eye line that was already red before this task and is outside launcher scope. The shared slot was released. Antigravity was sent an FYI that AG-243 can check the current launcher sight.

Next: D-114 allows at most two short game batches an hour with a pause; the recent batches were t280 at 18:19 UTC and this focused run at about 18:54 UTC. At or after 19:19 UTC run `review/GP-20033/launcher-ads.mjs` through `crew.mjs slot run` for one post-change 1P ADS picture. Inspect the picture. Then run `node tools/camera.mjs check launcher --out review/GP-20033/inspector` through the shared queue after pacing allows (roughly 19:49 UTC). Inspect the sheet, score the model (military family, four-light limitations clearly stated), write the handoff, check out with `--done`, then resume GP-20032 at batch 17 with revised t280.

At 19:19 UTC the ADS job was submitted to the shared slot (request `8daf77ed-b218-4b3d-9e84-2eef4ad38f7a`, shell session 96733) and queued at position 2 behind Antigravity AG-243; Jerry holds the slot for his manual game. The command writes `review/GP-20033/launcher-ads.log` and `launcher-ads-after.png/json` when granted. Do not submit a duplicate while this request is queued. Once it exits, inspect the image and run the inspector check after D-114 pacing allows.
