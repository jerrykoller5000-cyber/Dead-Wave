# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-20T20:40Z
next: —
blocked-on: —
last-report: handoffs/2026-10-20-antigravity-AG-106.md

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

### Status (2026-10-20)
- **AG-86..AG-98**: DONE (see earlier reports).
- **AG-99**: DONE. Verified `~ site hikers` (`t264` 22/22) and `~ site fuel` (`t267` 24/24) on headless and real WebGPU (`qa/2026-10-20-AG-99/01..14.png`), `59.7 fps` mean (`59.5 fps` 1% low) carrying the leaking fuel can; sent polish notes to `grokbot` and `chatgpt`.
- **AG-100**: DONE. Ran suite Chunks F (`t240..t268`: 402 pass, 15 fail), E (`t196..t229`: 637 pass, 8 fail), and D (`t164..t195`: 747 pass, 1 fail) (`95` checks: `1,786 pass, 24 fail`; `qa/2026-10-20-AG-100/chunk-{F,E,D}.log`).
- **AG-101**: DONE. Fixed `game/trapper-path.js` (`escapeRow` clear on `safe-stone` + `hypot2`), verified `t268` `20/20 pass` through the slot, and verified `GP-19940` marine waist seam/normals in the Marine Inspector (`qa/2026-10-20-AG-101/01..06.png`).
- **AG-102**: DONE. Ran suite Chunks C (`t132..t163`: 465 pass, 0 fail), B (`t100..t131`: 381 pass, 4 fail), and A (`t68..t99`: 432 pass, 9 fail) (`95` checks: `1,278 pass, 13 fail`; combined `t68..t268` across `AG-100..102`: `190` checks, `3,065 pass, 36 fail`; `qa/2026-10-20-AG-102/chunk-{C,B,A}.log`).
- **AG-103**: DONE. 3x Night-20 High `--prof --cpu --alloc` bench (`52.3` median / `56.0` best fps, `1% low 21.3` / `24.3` fps, `tick 15.42` / `14.50` ms, `892.7` / `858.8` kB/f) and verified all 19 fixed reds (`330 pass, 0 fail`; `qa/2026-10-20-AG-103/`).
- **AG-104**: DONE. Captured `docs/release/itch/cover.png` (`630x500`) and `01..05.png` (`1920x1080`) on High graphics (`WebGPU`), built & smoke-tested NSIS installer (`desktop/src-tauri/target/release/bundle/nsis/Grave Shift_0.1.0_x64-setup.exe`, `402,095,174 bytes` / `383.47 MiB` / `402.10 MB`), verified `NOTICES.txt` + `NOTICES-desktop.txt` in installed `game/`, removed `Dead-Wave.lnk` shortcut, and passed `13/13` `desktop/smoke.mjs` checks + opening/music/0-failed-loads (`qa/2026-10-20-AG-104/`).
- **AG-105**: DONE. Night-20 High spike census (`CL-223`): 3x `--prof` median `53.5 fps` (best `55.1`), `1% low 25.7` (best `27.1`), `tick 14.65 ms` (best `13.96 ms`); 1x `--prof --cpu --alloc` `54.7 fps`, `1% low 28.4`, `tick 14.40 ms`, `903.7 kB/f`; `spikeCauses` proved `21..26` of `28..37` spikes (`70%..93%`) are `pipelines` (`newPipelines: 1`, each costing `22..48 ms` in `r:render` and `-9.7 MB` heap growth), while `gc` is only `1..2` spikes per run (`qa/2026-10-20-AG-105/`).
- **AG-106**: DONE. Night-20 High `--prof` pipelines journal (`CL-226`, 2 runs): Run 1 (`53.5 fps`, `1% low 25.7`, `tick 13.82 ms`, `spikeCauses={spikes:32,pipelines:24,uploads:0,gc:1,code:7}`, `pipelines={made:43,released:0,withNewShaders:42}`); Run 2 (`55.9 fps`, `1% low 30.0`, `tick 13.87 ms`, `spikeCauses={spikes:31,pipelines:22,uploads:0,gc:1,code:8}`, `pipelines={made:40,released:0,withNewShaders:40}`). Top pipeline builders: `zombie-skin` (`n=22`/`20`, `newShaders: "v"`), `demon-fire-fists` shadow `side1`+`side0` (`n=9+9` in both runs), `marine-shadow` (`n=1`), `feral-motion-echo` (`n=1`) (`qa/2026-10-20-AG-106/`).
