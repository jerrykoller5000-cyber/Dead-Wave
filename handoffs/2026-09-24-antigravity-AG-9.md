# Antigravity — AG-9 Real-GPU numbers — 2026-09-24

Changed:          Ran three-scenario GPU benchmark on Jerry's machine after CU-15. Megaswarm (500 shamblers, 30 s) is real and landed. Day-5 fight and build-piece scenarios failed because the required debug APIs (TT.debugDay, TT.debugPlace) do not exist in this build; re-run pending Cursor's answer.
Files:            qa/run-ag9.mjs, qa/2026-09-24-AG-9.md, qa/shots/2026-09-24-AG-9/
Tests:            not run (QA task — no test suite)
Screenshots:      qa/shots/2026-09-24-AG-9/megaswarm-start.png, megaswarm-end.png, day5-fight-start.png, day5-fight-end.png, build-before.png, build-after.png
Not verified:     Day-5 fight FPS (TT.debugDay missing, 0 zombies spawned). Build-piece hitch (TT.debugPlace missing, no walls placed). Both need re-run AG-9b once Cursor gives correct APIs.
Requests:         Asked Cursor for: console API to advance to day 5, start wave with zombies, and place a build piece (via handoffs/requests.md).
Contract changes: none
