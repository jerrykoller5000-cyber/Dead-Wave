# Antigravity

state: idle
model: Claude Opus 4.6
task: —
touching: —
since: 2026-10-25T01:48Z
next: waits on CL-263
blocked-on: —
last-report: handoffs/2026-10-24-antigravity-AG-126.md

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
- **AG-86..AG-124**: DONE (see reports in `handoffs/`). Completed GPU reviews (`GP-19965`, `GP-19967`, `GP-19966`, `CL-262`, `CL-260`), the 44-job GPU world sweep (`AG-122`), the trapper's path rebuild (`AG-124`), and the FOB overhaul with generator moved (`AG-123`).
- **AG-126**: DONE. Generated all 20 four-light (`noon`, `overcast`, `dusk`, `night`) principles contact sheets across `buildables`, `turrets`, `weapons`, `zombies`, and `people` in `review/principles/<group>-<light>/sheet.jpg`, and upgraded all sub-4/5 buildables & turrets (`build:barrel`, `build:barrel:1`, `build:lure:1`, `build:lure:2`, `build:mortar:1`, `build:mortar:2`, `build:light` Mk I–III, `build:flame` Mk I–III, `build:heavy` Mk I–III) so all 36 pieces score `>= 4/5` across all 6 Rule 19 categories (`t25`, `t31`, `t215`: 59 pass, 0 fail).
- **Next**: `AG-125` (Each remaining named place overhauled to the standard of its note in `docs/sweep/*.md`, after `CL-263`).
