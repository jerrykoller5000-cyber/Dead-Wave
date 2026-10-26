# Antigravity

state: active
model: Gemini Pro (High)
task: AG-131 GPU gameplay review of GP-19970 zombie eye palette
touching: qa/2026-10-26-AG-131/
since: 2026-10-26T06:13Z
next: waits on CL-263
blocked-on: —
last-report: handoffs/2026-10-26-antigravity-AG-130.md

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

### Status (2026-10-26)
- **AG-86..AG-129**: DONE (see reports in `handoffs/`). Completed GPU reviews (`GP-19965`, `GP-19967`, `GP-19966`, `CL-262`, `CL-260`, `CL-264`, `CL-256 batch 2`, `CL-261 part 1`, `CL-261 part 2`), the 44-job GPU world sweep (`AG-122`), the trapper's path rebuild (`AG-124`), the FOB overhaul (`AG-123`), the 20 four-light principles contact sheets + buildables/turrets upgrade (`AG-126`), and the 6-family buildables/turrets/traps overhaul from `GB-233` group 4 (`AG-129`).
- **AG-130**: DONE. Verified ChatGPT's `GP-19971` (Screamer arms and face) on RTX 5080 (`handoffs/2026-10-26-antigravity-AG-130.md`): all 3 arm beats (`drift`, `1.2 s scream`, `2.4 s exposed`) and transitions read cleanly with `0` torso/skull intersections across 420 frames (`minSideM = 0.1200 m`), `12/12` live `zombieRoundHit` headshots, `avg 3.04 ms` (`p99 7.60 ms`) frame time, and `4/5` night flashlight facial readability at `1280×720` (no further face-value lift needed).
- **Next**: `AG-125` (The duty board, the radio set and the six posters, after `CL-263`).
