# ChatGPT 2

state: idle
model: GPT-6.1 Sol (Medium effort)
task: —
touching: —
since: 2026-11-13T06:10Z
next: GT-20079 (17:15Z, UN-PARKED (J149): each modeler does camo-per-part o
blocked-on: —
last-report: handoffs/2026-11-13-chatgpt2-GT-20105.md

## Notes

### Where things stand

GT-20104 waits only on Claude 5: live pistol barrel/slide coupling (CE-11 ETA ~06:15Z), then the revolver index rest. Claude 1's refit is landed: native tcl334b 4/1, hand overlap 0, remaining index contact 2.6 mm. Run review/GT-20104/live-integration.mjs through the slot after landing; syntax passes, game run pending. Final pistol stroke .07, not .045; no candidate pose overrides in this check. GT-20101 is DONE: native tce10 29/0, round and closed-gun contact 0.00 mm; 13 Nov closure report. GT-20105 is DONE: final handoff handoffs/2026-11-13-chatgpt2-GT-20105.md. Impacts, scorch and muzzle flash are all accepted by the Director; next commit pending. Original flash gates 43/0, clone lit/rest/warm and paint-band four lights pass. Matched runtime repeat: old59.99/new60.03 fps, both90draws and GPU~.162ms, no >50ms hitches; first unprofiled run's358.6ms hitch retained/unattributed. Receipts runtime-pair/ and runtime-profile/ under review/GT-20105. All production loans OUT; no git. Director confirmed no new gun before freeze, GT-20101 closed, integration receipts then standby. He closes fleet umbrellas GT-20079/77. Keep running standby2.5 minutes and heartbeat at least every15 minutes.

Earlier exterior, camo, casing, detail and CE-2 acceptances are in the 11 Nov GT-20076/77/79/80 handoffs. The KR-7 laminate and D-152 budget were accepted on GT-20082 and GT-20081. Keep previous test expectations and the crew slot.

### Working rules
Read AGENTS.md every session. Claude leads; ask through crew.mjs request chatgpt2 claude with choices and a pick, then continue. Hands are Claude 1's (claude4), motion Claude 5's (claude5); other gun modelers' named jobs stay theirs.
No git. All game launches through crew slot run, one browser per lease; speed checks --exclusive. No tests weakened. UTF-8/no BOM, preserve line endings and fresh hashes; stay inside Tiny Trek.
Native looks: four lights, eye/hip/rack as needed, before/after same camera; docs/art-direction.md, docs/asset-principles.md and docs/fps/manual-pass.md govern models. References look-only, no logos or copied assets.
Keep running: next named card, otherwise crew standby chatgpt2 --minutes 2.5 repeatedly. Heartbeat note at least every15minutes and read/reply to WAITING/NEW. Update this brief before context fills; history belongs in the named handoffs.
