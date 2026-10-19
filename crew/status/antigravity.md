# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-18T19:52Z
next: —
blocked-on: —
last-report: handoffs/2026-10-18-antigravity-AG-85.md

## Notes

### STANDING RULE (Jerry, 2026-10-15, effective immediately): ONE active game-testing session per computer
1. Do NOT launch the game without owning the shared testing slot (includes Marine Inspector, screenshots, `tools/camera.mjs`, `tools/shoot.mjs`, automated browser tests, and hidden/headless game instances).
2. Until an enforced queue exists and is verified, request the slot through Crew Board and wait for Claude's explicit grant. An apparently idle computer is NOT permission. Do not claim the automated queue exists until verified.
3. Jerry's personal game or Marine Inspector session takes priority. Never close his windows or processes.
4. While holding the slot, use ONE game instance and ONE test worker (`--jobs 1`). Do not launch overlapping helpers or additional game tabs.
5. Prepare and batch checks before claiming the slot. Record results, close your own test processes (`node tools/camera.mjs stop`), and release the slot promptly.
6. While waiting, continue coding, reading, reviewing, or lightweight non-browser checks. Do not run heavy parallel jobs or repeatedly retry failed launches.
7. Full-suite testing is one coordinated integration job; do not independently run the entire suite after small changes.

Written by Claude when you joined; this card is yours from now on.

Your role: the crew's eyes. You run the real game in a real browser on Jerry's PC, look at
it, and report what you see, with screenshots. None of the other five can see the game on
a real GPU the way you can.
- You don't edit game code (index.html, assets, tools, ui). You write reports and images
  in qa/, and send each finding to the agent who owns the code.
- Every finding needs a screenshot path, and every "it works" needs one too. Say exactly
  what you did, what you expected and what you saw.
- Serve the game with `npm run serve` and open http://127.0.0.1:8971/index.html?debug=1.
  With ?debug=1, window.TT is available in the DevTools console.

### Status (2026-10-18)
- **AG-80**: DONE. All 8 buildables & 24 tier variants verified in inspector via slot (`qa/2026-10-15-AG-80/shots-after/sheet.jpg`).
- **AG-79**: DONE. Skeletal Marine, Bone Raft, Wood wall, Wood floor, Barricade, and Sandbag Wall verified in inspector via slot (`qa/2026-10-15-AG-79/shots-after/sheet.jpg`).
- **AG-81**: DONE. Marine fabric (crouch, run, reload, aim, grenade, dive in `issue`, `hot`, `full` kit + 4 hats) captured in inspector (`qa/2026-10-18-AG-81/shots/sheet.jpg`); reported boonie side grommets and ballcap seam curve to Claude.
- **AG-82**: DONE. `tools/bench.mjs` run on Jerry's RTX 5080 across Nights 5, 10, 14, 18, 20 and megaswarm (48) at default (`high`) and `max` (`qa/2026-10-18-AG-82/report.md`).
- **AG-84**: DONE. Trimmed `build.sandbag` variant 2 from 6,216 tris / 248 parts to 1,428 tris / 2 meshes (`qa/2026-10-18-AG-84/report.md`).
- **AG-83**: DONE. Built NSIS installer (`Grave Shift_0.1.0_x64-setup.exe`), installed to `%LOCALAPPDATA%\Grave Shift`, verified clean-profile first run, Night 1, F5 reload (CU-149), Quit confirm (CU-150), and Reopen settings/best-run persistence (`qa/2026-10-18-AG-83/report.md`).
