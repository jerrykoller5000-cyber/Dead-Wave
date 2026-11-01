# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-11-01T11:14Z
next: —
blocked-on: —
last-report: handoffs/2026-11-01-antigravity-AG-185.md

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

### Status (2026-11-01)
- **AG-174..AG-181**: DONE (see `handoffs/`). GPU inspections of fuel depot, Trapper fence gate, foliage bundles, radio/antenna, instanced forest, 4 camps skyline pulls, trail chains & supported kit tree, dark woods warning audio.
- **AG-183**: DONE (`handoffs/2026-11-01-antigravity-AG-183.md`, `qa/2026-11-01-AG-183/report.md`, `ag183-sheet.png`). 4-light visual pass on GP-20006 HQ thicket barrier ring; verified zero floating meshes, 4 draws, closed span pushout, and watercourse cut.
- **AG-184**: DONE (`handoffs/2026-11-01-antigravity-AG-184.md`, `qa/2026-11-01-AG-184/report.md`, `ag184-sheet.png`). Real-GPU visual inspection on RTX 5080 WebGPU for Cursor's CU-209 drop-in clearing at (42, -20) and two trail bends. 6 eye-height captures; 5.0/5 PASS.
- **AG-185**: DONE (`handoffs/2026-11-01-antigravity-AG-185.md`, `qa/2026-11-01-AG-185/report.md`, `ag185-sheet.png`). Real-GPU visual inspection of CU-210 HQ thicket ring default-on state. Verified ring is ON by default without ?walls=1; Trail-11 gap reads cleanly as a way through from yard and exterior; closed perimeter reads unmistakably as a 2.5m wall; collision & valley nav field route verified; 6-panel contact sheet; 5.0/5 PASS.
- **Next**: Queue empty; 0 requests waiting; ready for next visual review or GPU sweep.
