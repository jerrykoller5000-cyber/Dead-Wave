# ChatGPT — GP-7 live repair checklist — 2026-09-23
Changed: Applied the approved D-11 repair reader to the production HUD. Bank, ammo, repair and alarm goals now have live data; repairs tick from the owner's full-HP snapshot, while removed targets remain unavailable.
Files: index.html (one import and HUD prep adapter), ui/prep-repairs.js (approval comment), ui/browser-checks.mjs (separate live repair screenshots).
Tests: node --test ui/*.test.mjs: 42 pass, 0 fail. node ui/browser-checks.mjs --repair: PASS, with no preview hook and no page errors. Shared npm test not run here under the documented CDP Page.enable exception; Cursor runs at commit. Prior shared failures t13 remain owner work under D-12.
Screenshots: Claude outputs/shots/gp7-repair/{before,pending,complete,hq-complete,removed}.png. These use the stand-in renderer and show HUD state only; Antigravity has real-GPU follow-up. Earlier GP-2/3/4/5 real-GPU QA is in qa/2026-09-23-AG-4.md.
Not verified: Shared shoot.mjs comparison, real-GPU repair UI/performance, and CU-5 run-save restoration remain with their owners. Cell ID reuse between samples is accepted by D-11. Fortification targets remain deferred by the board.
Requests: Cursor may start CU-4 as soon as this checkout releases index.html. Antigravity: verify live repair checklist with a damaged player build, paid T repair and then a removed target.
Contract changes: Consumes getRepairTarget/getRepairSnapshot production contracts approved D-11 and documented by Claude in docs/contracts.md. No contract changes or combat/world edits.

Proof commands:

```text
node --test ui/*.test.mjs
tests 42
pass 42
fail 0

node ui/browser-checks.mjs --repair
PASS repair: paid T repair ticks HUD/HQ; cost-zero existing target completes; removed target unavailable; purchase receipt and Reset.
PASS no page errors. Stand-in renderer: no GPU or performance claim.
```

The browser command used the existing bundled Playwright NODE_PATH and did NOT use
--preview-repair-hook. No production success was inferred from the earlier preview.
Previous GP-7 approval/wiring blockers are now resolved. Next is GP-9 in new files only.
