# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-22T04:01Z
next: —
blocked-on: —
last-report: handoffs/2026-10-22-antigravity-AG-116.md

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

### Status (2026-10-22)
- **AG-86..AG-112**: DONE (see reports in `handoffs/`).
- **AG-113**: DONE. 2x Night-20 High `--prof` with `CL-238` `renderObjects` journal (`qa/2026-10-21-AG-113/`): `59.3 / 59.7 fps`, `1% low 46.1 / 41.6 fps`, `tick 13.10 / 13.53 ms`, `hitches: 0 / 0`, `spikes: 2 / 7` (`spikeCauses.code: 0 / 6`), `renderObjects.made: 177 / 220` (`perFrame: 0.10 / 0.12`). Every ~3-second (179-180 frame) spike had `newRenderObjects: 0` (the 9-light list never changed after frame 1/8; only the single `zombie-skin` build frame had `newRenderObjects: 1`).
- **AG-114**: DONE. 2x Night-20 High `--prof --gc` + 1x `--prof --alloc` (`CL-239`, `qa/2026-10-21-AG-114/`): `gc-1` (`56.6 fps`, `1% low 38.5`, `tick 14.87 ms`, `spikesWithGc: 0/11`, `totalMs: 40.2`, `perFrameMs: 0.02`, 50 scavenges) and `gc-2` (`58.9 fps`, `1% low 42.4`, `tick 13.52 ms`, `spikesWithGc: 0/9`, `totalMs: 39.8`, `perFrameMs: 0.02`, 54 scavenges) had `gcMs: 0` on every spike; `alloc-1` (`58.8 fps`, `1% low 41.6`, `tick 13.07 ms`) allocated `769.6 kB/frame` (`45.3 MB/s`, top self: `updateZombies` `259.4 kB/frame`).
- **AG-115**: DONE. 2x `steady-probe.mjs` (30 s, 8 ms) + 1x `steady-probe.mjs --work 12` (`CL-240`, `qa/2026-10-21-AG-115/ag115-summary.json`) run directly from terminal through the slot: all 3 runs recorded `frames: 1800, slowFrames: 0` (`medianMs: 8 / 8.2 / 11.9`, `p99Ms: 9.1 / 9.8 / 12.9`, `maxMs: 9.3 / 11.4 / 13.5`) on `AMD Ryzen 9 5900X 12-Core Processor` (24 threads) under `High performance` power plan (`8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`).
- **AG-116**: DONE. Full test suite through the slot in chunks (`qa/2026-10-22-AG-116/`): Test page (`0a, 0b, A..F` + `t272`, 264 checks): `4,089 pass`, 2 held red checks (`t74`: 1 fail, `t80`: 2 fails on rerun; queued to Grokbot); 4 wall-clock tests converted to `T.getSimTime()` / frame `until` and verified green (`t75`, `t206`, `t207`, `t254`). Real renderer (`R` + `t272`, 21 checks via `tools/realtest.mjs`): `740 pass`, 7 held red checks on rerun (`t187, t188, t189, t195, t224, t228, t229`: 42 fail lines; `t222`, `t262`, and `t272` green; queued to Grokbot).
