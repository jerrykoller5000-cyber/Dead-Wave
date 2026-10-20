# Antigravity

state: idle
model: Gemini 3.1 Pro
task: —
touching: —
since: 2026-10-20T10:36Z
next: —
blocked-on: —
last-report: handoffs/2026-10-20-antigravity-AG-102.md

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
- **AG-86**: DONE. Baseline Night 20 High `33.7 fps` (`917` draws, `r:render 21.22 ms`, `22,551` nodes).
- **AG-91**: DONE. Post-`CL-215` Night 20 High `38.6 fps` (`596` draws, `r:render 15.79 ms`, `14,705` nodes).
- **AG-92**: DONE. Verified `CL-216`/`GP-19937` radio relay day mission (`t266` 25/25 pass, `qa/2026-10-19-AG-92/01..06.png`).
- **AG-94**: DONE. Verified `CL-216` crashed convoy & bridge ambush (`t266` 25/25, `t267` 26/26, `qa/2026-10-19-AG-94/01..08.png`).
- **AG-95**: DONE. Merged static world site props (`index.html`, `t269.js` 18/18 pass, `-301` scene meshes, `qa/2026-10-19-AG-95/01..10.png`).
- **AG-96**: DONE. Post-`CL-217` Night 20 High `47.7 fps` (`334` draws, `r:render 9.24 ms`, `9,595` nodes).
- **AG-93**: DONE. Built trapper's safe path day mission (`game/trapper-path.js`, `game/trapper-path.test.mjs` 4/4, `ui/strings.js`, `index.html`, `t268.js` 20/20, `t52` 17/17, `t215` 4/4, `qa/2026-10-19-AG-93/01..04.png`).
- **AG-97**: DONE. Verified `CL-218` second cuts, `CL-219` night shadows, `GP-19938` ambulance, `GP-19939` merged zombie eyes, `GB-199` props + 3x Night 20 High `--prof --cpu`: median `55.9 fps` (peak `57.6 fps`), `265` draws (`-69` vs `AG-96`), `r:render 7.00 ms`, `computeBoundingSphere` gone (`qa/2026-10-19-AG-97/report.md`).
- **AG-98**: DONE. Road stage 5 desktop build end-to-end (`dist/dead-wave` -> `%LOCALAPPDATA%\Grave Shift\game`, `dead-wave.exe` on `http://dw.localhost/index.html`, Title, Day 1 prep, 6 day mission sites, Hollows warren + cave mouth, Night 1 combat with `elevenlabs/night-01` music & sound, `81/81` valid textures, `0` failed decodes, only 2 silent 404 probes in `core/takes.js:197-199`; `qa/2026-10-19-AG-98/`).
- **AG-99**: DONE. Verified `~ site hikers` (`t264` 22/22) and `~ site fuel` (`t267` 24/24) on headless and real WebGPU (`qa/2026-10-20-AG-99/01..14.png`), `59.7 fps` mean (`59.5 fps` 1% low) carrying the leaking fuel can; sent polish notes to `grokbot` and `chatgpt`.
- **AG-100**: DONE. Ran suite Chunks F (`t240..t268`: 402 pass, 15 fail), E (`t196..t229`: 637 pass, 8 fail), and D (`t164..t195`: 747 pass, 1 fail) (`95` checks: `1,786 pass, 24 fail`; `qa/2026-10-20-AG-100/chunk-{F,E,D}.log`).
- **AG-101**: DONE. Fixed `game/trapper-path.js` (`escapeRow` clear on `safe-stone` + `hypot2`), verified `t268` `20/20 pass` through the slot, and verified `GP-19940` marine waist seam/normals in the Marine Inspector (`qa/2026-10-20-AG-101/01..06.png`).
- **AG-102**: DONE. Ran suite Chunks C (`t132..t163`: 465 pass, 0 fail), B (`t100..t131`: 381 pass, 4 fail), and A (`t68..t99`: 432 pass, 9 fail) (`95` checks: `1,278 pass, 13 fail`; combined `t68..t268` across `AG-100..102`: `190` checks, `3,065 pass, 36 fail`; `qa/2026-10-20-AG-102/chunk-{C,B,A}.log`).
