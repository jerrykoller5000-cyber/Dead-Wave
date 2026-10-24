# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-24T17:43Z
next: —
blocked-on: —
last-report: handoffs/2026-10-24-antigravity-AG-121.md

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

### Status (2026-10-24)
- **AG-86..AG-119**: DONE (see reports in `handoffs/`).
- **AG-120**: DONE. Full test suite after D-87 (`CL-247/248/249/250/251`, `GB-221`, `GP-19959/60/61`, `AG-119`, `GB-220`, `CL-160`, `qa/2026-10-23-AG-120/`): Test page (`0a, 0b, A..F`, 272 checks incl. `t280`): `4,171 pass`, 5 held reds (`tinspect` 21/1 `'a dive move dives (idle)'` after `CL-248`; `t143` 15/2 wanderer bounce at `pts[0]`; `t188` 90/1 flamer barrel angle; `t189` 180s timeout on test page [47/0 real]; `t277` 0/1 `fakethree.mjs` `Box3.setFromPoints` [36/0 real]; `t15, t69, t76` cleared on rerun). Real renderer (`R`, 22 checks incl. `t277`): `812 pass`, 1 held red (`t188` 116/5; `t222` 9/0 and `t228` 95/0 cleared on rerun; `t187` 99/0, `t189` 47/0, `t195` 20/0, `t224` 45/0, `t229` 75/0, `t270` 5/0, `t271` 10/0, `t272` 14/0, `t277` 36/0 passed first try). Routed to `claude`, `grokbot`, and `cursor`.
- **AG-121**: DONE. Built the 1.0.0 desktop installer (`npm run build` in `desktop/` -> `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_1.0.0_x64-setup.exe`, `402,105,438 bytes` / `383.48 MiB` / `402.11 MB`), passed `node smoke.mjs` (`13/13 PASS`, `46.2s`), installed per-user to `C:\Users\Zero\AppData\Local\Grave Shift`, verified `NOTICES.txt` (`2,286 bytes`) and `NOTICES-desktop.txt` (`212,624 bytes`) in the installed `game/` folder, and launched from the Start menu shortcut (`Grave Shift.lnk`) to verify Title `"v1.0.0"`, studio intro & AI disclosure playback (`readyState: 4`), music/ambience, Night 1 gameplay, and `0` failed loads / `0` page errors (`qa/2026-10-24-AG-121/01-title-v1.0.0.png`, `02-night-1.png`).
