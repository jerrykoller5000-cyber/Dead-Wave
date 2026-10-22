# Antigravity

state: active
model: Gemini 4 Argon (High)
task: AG-116 The full suite before Jerry's playthrough (chunks 0, A-F on test page + real-renderer checks)
touching: qa/2026-10-22-AG-116/*, tools/tests/* (wall-clock timing fixes)
since: 2026-10-21T22:29Z
next: —
blocked-on: —
last-report: handoffs/2026-10-21-antigravity-AG-115.md

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

### Status (2026-10-21)
- **AG-86..AG-110**: DONE (see reports in `handoffs/`).
- **AG-111**: DONE. 3x Night-20 High `--prof` after `CL-236`: `57.4 / 59.1 / 59.4 fps` (median `59.1`), `1% low 36.6 / 47.7 / 45.5 fps` (median `45.5`), `tick 13.88 / 13.76 / 13.37 ms` (median `13.76`), `hitches: 1 / 0 / 0` (median `0`), `spikes: 9 / 5 / 6` (median `6`), `builds.made: 3 / 3 / 2`. `TT.marineShadowDbg()` stayed at `builds: 1, lastDiff: null` across all 3 runs and the full smoking idle cycle (`qa/2026-10-21-AG-111/01..03.png`).
- **AG-112**: DONE. 3x Night-20 High `--prof` after `CL-237`: `58.3 / 59.1 / 59.4 fps` (median `59.1`), `1% low 42.9 / 43.3 / 45.5 fps` (median `43.3`), `worst 24.0 / 22.9 / 21.9 ms`, `hitches: 0 / 0 / 0`, `tick 14.58 / 14.77 / 14.58 ms` (median `14.58`), `spikes: 13 / 9 / 5` (median `9`, `spikeCauses.sunShadow: 0`), `builds.made: 3 / 3 / 3`. `TT.sunShadowDbg()` recorded `redraws: 3, moved: 0, timed: 2, deep: true, every: 900, move: 16` across all 3 runs, and the 40 m Night-20 walk across the base and back (`moved: 2 -> 6`) showed zero shadow jumps/steps and zero dark zombie ghosts (`qa/2026-10-21-AG-112/01..07.png`).
- **AG-113**: DONE. 2x Night-20 High `--prof` with `CL-238` `renderObjects` journal (`qa/2026-10-21-AG-113/`): `59.3 / 59.7 fps`, `1% low 46.1 / 41.6 fps`, `tick 13.10 / 13.53 ms`, `hitches: 0 / 0`, `spikes: 2 / 7` (`spikeCauses.code: 0 / 6`), `renderObjects.made: 177 / 220` (`perFrame: 0.10 / 0.12`). Every ~3-second (179-180 frame) spike had `newRenderObjects: 0` (the 9-light list never changed after frame 1/8; only the single `zombie-skin` build frame had `newRenderObjects: 1`).
- **AG-114**: DONE. 2x Night-20 High `--prof --gc` + 1x `--prof --alloc` (`CL-239`, `qa/2026-10-21-AG-114/`): `gc-1` (`56.6 fps`, `1% low 38.5`, `tick 14.87 ms`, `spikesWithGc: 0/11`, `totalMs: 40.2`, `perFrameMs: 0.02`, 50 scavenges) and `gc-2` (`58.9 fps`, `1% low 42.4`, `tick 13.52 ms`, `spikesWithGc: 0/9`, `totalMs: 39.8`, `perFrameMs: 0.02`, 54 scavenges) had `gcMs: 0` on every spike; `alloc-1` (`58.8 fps`, `1% low 41.6`, `tick 13.07 ms`) allocated `769.6 kB/frame` (`45.3 MB/s`, top self: `updateZombies` `259.4 kB/frame`).
- **AG-115**: DONE. 2x `steady-probe.mjs` (30 s, 8 ms) + 1x `steady-probe.mjs --work 12` (`CL-240`, `qa/2026-10-21-AG-115/ag115-summary.json`) run directly from terminal through the slot: all 3 runs recorded `frames: 1800, slowFrames: 0` (`medianMs: 8 / 8.2 / 11.9`, `p99Ms: 9.1 / 9.8 / 12.9`, `maxMs: 9.3 / 11.4 / 13.5`) on `AMD Ryzen 9 5900X 12-Core Processor` (24 threads) under `High performance` power plan (`8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`).
