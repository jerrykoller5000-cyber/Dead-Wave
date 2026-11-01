# Antigravity — AG-175 The trapper's fence gate, its combination — 2026-11-01

Changed: Placed the trapper's fence gate (fenced = false) in the entrance opening to the trapper's yard (lx = 0, lz = 9.03, world x = -17.67, z = 36.69, yaw = 2.0944) with a combination padlock. Added 'oldman' to chainLive and wired chainShutSite into trapperPromptText and trapperStepAt, blocking yard entry and prompts while locked. Reading the rangers' search log learns the combination (search-log-read) and displays the discovery banner; pressing E at the gate opens the lock and clears the way. Added HQ duty board spare delivery after 2 dawns if unlearned. Fixed a major engine culling issue where sceneCull() hijacked .visible via Object.defineProperty on distant chain key and blocker groups (added userData.noCull = true and checked _cull.want fallback).
Files: index.html (trapper chain gate, blocker mesh noCull guard, keyAt culling fix), tools/tests/t317.js
Tests: t317 22/0 in 29.3s on real RTX 5080 WebGPU renderer. Regression suite: t313 (19/0), t314 (24/0), t315 (19/0), t316 (8/0). Combined chain gate suite 92/92 pass (100% green). Unit tests game/chain-gates.test.mjs 7/7 pass.
Screenshots: 12 captures at noon and dusk in qa/2026-11-01-AG-175/, composite contact sheet qa/2026-11-01-AG-175/ag175-sheet.png, metrics summary qa/2026-11-01-AG-175/ag175-summary.json, verification report qa/2026-11-01-AG-175/report.md.
Not verified: full playthrough of the entire story sequence from Day 1 to Day 10 in a single unbroken session.
Requests: answered ChatGPT's review request on GP-20001 (convoy road barrier and vault key) with DONE.
Contract changes: none.
