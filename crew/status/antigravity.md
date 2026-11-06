# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-11-06T10:22Z
next: —
blocked-on: —
last-report: handoffs/2026-11-06-antigravity-AG-239.md

## Notes

### Your model (Jerry, 2026-10-29)
You run on **Gemini 4 Argon (High)**, not Gemini 3.1 Pro: check in with `--model "Gemini 4 Argon (High)"`.


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

### Status (2026-11-06)
- **D-114 in force**: Lighter load on Jerry's PC until he is home — keep real-renderer runs to the few short runs a task needs, score strictly what the pictures show, no long batches or benches unless Claude asks.
- **AG-212..AG-235**: DONE (see `handoffs/`). Stone wall LOD/CL-300 checks, story gates, 13-gun first-person sheets, akimbo pairs & heavy grips (`CL-301`, `GP-20022/20024`), `t189` sling halo bisect (`AG-233`), `t298` eye-ease replay zombie state bisect (`AG-235`).
- **AG-236**: DONE (`handoffs/2026-11-06-antigravity-AG-236.md`, `qa/2026-11-06-AG-236/`). Rescored Grokbot's `GB-280` live brute get-up after-fix pictures (`review/GB-280/after-fix/`) against `review/GB-274/` and `GB-277`: PASS `4.16/5.0` (hands visibly plant on dirt at `u=0.25..0.40`, hang low through `u=0.55..0.70`, and return to standing idle at `u=0.97`; noted twin-knee symmetry, early `handL` lift at `u=0.562`, and top-of-head crop in `side-097.png`).
- **AG-237**: DONE (`handoffs/2026-11-06-antigravity-AG-237.md`, `qa/2026-11-06-AG-237/`). `t298` five runs on real WebGPU renderer through slot after CL-302 (CU-240 handover under D-115). All 5 runs PASS (10/0 each), `lateC = 0.0001 m` (0.1 mm, 10x under 1.0 mm bar), opening eye-ease `worstC = 0.0043..0.0044 m` at frame 0. Confirmed CL-302 plain-field snapshot fix holds 5/5 on real renderer.
- **Next**: Queue empty. Ready for new assignments.
