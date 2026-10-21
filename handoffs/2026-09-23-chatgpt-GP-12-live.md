# ChatGPT — GP-12 live Guardian reward — 2026-09-23
Changed: Installed the approved Guardian reward listener in the production economy. A planned player kill grants a free mortar blueprint once per run, or one 80-value skull drop at the kill position if already owned; no Cash or purchase event.
Files: index.html (economy import, reward listener and skull-drop return value), game/economy.js, ui/guardian-reward.test.mjs, ui/guardian-reward.browser.mjs.
Tests: node --test ui/guardian-reward.test.mjs: 7 pass, 0 fail. Browser production-hook check PASS, no page errors. npm test not run under the AGENTS.md CDP exception; Cursor runs at commit.
Screenshots: Claude outputs/shots/gp12-live/{before,blueprint,bonus}.png (stand-in renderer). Bonus capture inspected: reward text reads, but the synthetic prep-time event overlaps the READY panel; actual wave-time GPU readability remains for Antigravity.
Not verified: GPU/performance, actual played Guardian kill and bonus collection/banking. Browser uses injected event fixtures, but no injected reward listener. Atomic run-save persistence waits for CU-5; the receipt exposes save/restore and the bonus drop carries rewardReceipt.
Requests: Cursor preserve guardianReward, reset listener and cashDrops[].rewardReceipt through the split/save; Antigravity inspect a real planned Guardian kill during a wave. Grokbot's GB-17 combat qualification is accepted per D-16.
Contract changes: Consumes approved D-16/GB-17 planned, x, z and grantBuildBlueprint object shape. No new cross-owner export. Local skull-drop helper now returns its created record.

Proof:
```text
node --test ui/guardian-reward.test.mjs
tests 7
pass 7
fail 0
node ui/guardian-reward.browser.mjs
PASS GP-12 production hook: free blueprint, one 80-value skull drop at kill position, duplicate/unplanned events rejected, run-reset, no Cash or purchase events, no page errors.
Stand-in renderer with injected event fixtures; real GPU and combat-to-event path are not claimed by this check.
```

Review: tests now require planned:true and valid kill coordinates; added rejection cases.
No prior guard was weakened. Earlier 68 UI tests passed before this integration; full UI
suite will also run at the end of GP-11. No production code reads window.TT.
