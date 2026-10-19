# Antigravity

state: active
model: Gemini 3.1 Pro
task: AG-95 CL-217 ranger cache t266 + t52 + live visual look
touching: qa/2026-10-19-AG-95/*
since: 2026-10-19T23:34Z
next: AG-95 CL-217's look, after AG-92 (the ranger cache, 23:15Z). Throu
blocked-on: —
last-report: handoffs/2026-10-19-antigravity-AG-92.md

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

### Status (2026-10-19)
- **AG-80**: DONE. All 8 buildables & 24 tier variants verified in inspector via slot (`qa/2026-10-15-AG-80/shots-after/sheet.jpg`).
- **AG-79**: DONE. Skeletal Marine, Bone Raft, Wood wall, Wood floor, Barricade, and Sandbag Wall verified in inspector via slot (`qa/2026-10-15-AG-79/shots-after/sheet.jpg`).
- **AG-81**: DONE. Marine fabric (crouch, run, reload, aim, grenade, dive in `issue`, `hot`, `full` kit + 4 hats) captured in inspector (`qa/2026-10-18-AG-81/shots/sheet.jpg`); reported boonie side grommets and ballcap seam curve to Claude.
- **AG-82**: DONE. `tools/bench.mjs` run on Jerry's RTX 5080 across Nights 5, 10, 14, 18, 20 and megaswarm (48) at default (`high`) and `max` (`qa/2026-10-18-AG-82/report.md`).
- **AG-84**: DONE. Trimmed `build.sandbag` variant 2 from 6,216 tris / 248 parts to 1,428 tris / 2 meshes (`qa/2026-10-18-AG-84/report.md`).
- **AG-83**: DONE. Built NSIS installer (`Grave Shift_0.1.0_x64-setup.exe`), installed to `%LOCALAPPDATA%\Grave Shift`, verified clean-profile first run, Night 1, F5 reload (CU-149), Quit confirm (CU-150), and Reopen settings/best-run persistence (`qa/2026-10-18-AG-83/report.md`).
- **AG-85**: DONE. Re-ran `tools/bench.mjs` on Jerry's RTX 5080 after CL-210 + GP-19925 (`qa/2026-10-18-AG-85/report.md`).
- **AG-86**: DONE. Part 1: verified GP-19929 walking feet (5 rigs PASS) and GP-19930 live budget models + post-budget Night 20 High (`32.4 fps`). Part 2: ran `bench.mjs --prof` & `--cpu` (`CL-213`/`CL-211`) on Night 10 High (`34.8 fps`, `r:render 20.63 ms`, `gpuMs 0.26 ms`), Night 20 High (`29.3`/`32.5 fps`, `r:render 21.85 ms`, `r:rigSkin 0.11 ms`, `LightsNode.updateBefore 20.60 ms/f`, `ShadowNode.updateShadow 8.53 ms/f`, `updateMatrixWorld 7.13 ms/f`, `gpuMs 0.27 ms`), and Megaswarm 48 (`59.0 fps`, `r:render 14.48 ms`, `gpuMs 0.19 ms`) (`qa/2026-10-19-AG-86/report.md`, `prof-lines.jsonl`).
- **AG-87**: DONE. Verified `GP-19932` live recheck on Jerry's RTX 5080 (`qa/2026-10-19-AG-87/shots/gp19932-sheet.jpg`): Screamer (`5,768` tris / `4` meshes) has dark obsidian upper head & glowing pink eyes; Spitter (`5,228` tris / `4` meshes) has glowing yellow-green ooze chin drips.
