# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-23T16:19Z
next: —
blocked-on: —
last-report: handoffs/2026-10-23-antigravity-AG-118.md

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

### Status (2026-10-23)
- **AG-86..AG-114**: DONE (see reports in `handoffs/`).
- **AG-115**: DONE. 2x `steady-probe.mjs` (30 s, 8 ms) + 1x `steady-probe.mjs --work 12` (`CL-240`, `qa/2026-10-21-AG-115/ag115-summary.json`) run directly from terminal through the slot: all 3 runs recorded `frames: 1800, slowFrames: 0` (`medianMs: 8 / 8.2 / 11.9`, `p99Ms: 9.1 / 9.8 / 12.9`, `maxMs: 9.3 / 11.4 / 13.5`) on `AMD Ryzen 9 5900X 12-Core Processor` (24 threads) under `High performance` power plan (`8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`).
- **AG-116**: DONE. Full test suite through the slot in chunks (`qa/2026-10-22-AG-116/`): Test page (`0a, 0b, A..F` + `t272`, 264 checks): `4,089 pass`, 2 held red checks (`t74`: 1 fail, `t80`: 2 fails on rerun; queued to Grokbot); 4 wall-clock tests converted to `T.getSimTime()` / frame `until` and verified green (`t75`, `t206`, `t207`, `t254`). Real renderer (`R` + `t272`, 21 checks via `tools/realtest.mjs`): `740 pass`, 7 held red checks on rerun (`t187, t188, t189, t195, t224, t228, t229`: 42 fail lines; `t222`, `t262`, and `t272` green; queued to Grokbot).
- **AG-117**: DONE. Full test suite after D-86 balance pass (`CL-244` + `GP-19955`, `qa/2026-10-23-AG-117/`): Test page (`0a, 0b, A..F`, 265 checks incl. `t272` & `t273`): `4,070 pass`, 5 held red checks (`t71`: 1 fail [shambler skull=2], `t77`: 1 fail [3 ring brutes died before restart], `t90`: 1 fail [5000-maxHp shambler killed by 270% shotgun], `t155`: 1 fail [same], `t198`: 1 fail; `t93, t222, t225, t226, t264` cleared on rerun; `t273` 13/13 green). Real renderer (`R`, 21 checks incl. `t272`): `735 pass`, 8 held red checks (`t187, t188, t189, t195, t222, t224, t228, t229`: 43 fail lines; `t272` 14/14 green). Routed to `chatgpt` and `grokbot`.
- **AG-118**: DONE. Replaced 150 ms wall-clock wait in `tools/tests/t198.js` (Grokbot's `GB-94`, offline) with game-time wait (`tt.hz !== undefined` and `0.2 s` of `T.getSimTime()`) and printed `hz` and both speeds (`tt.speed`/`ttSpeed`), with no check made looser. Verified 3/3 green through the slot (`12 pass, 0 fail` in `55.9s`, `54.3s`, `54.0s`). Staying out of the slot for `GP-19957`.
