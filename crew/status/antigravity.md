# Antigravity

state: active
model: Gemini 3.1 Pro
task: AG-148 Walk the trails (CL-256) and score GP-19970 seven-face maxilla close3
touching: review/sweep/jobs/trails.json, review/sweep/trails/, qa/2026-10-28-AG-148/
since: 2026-10-28T19:17Z
next: —
blocked-on: —
last-report: handoffs/2026-10-28-antigravity-AG-147.md

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

### Status (2026-10-28)
- **AG-86..AG-145**: DONE (see `handoffs/`). Completed GPU world sweeps, `camp-trapper` yard & iron-lined cellar (`AG-124`, `AG-135`, `AG-137`, `AG-140`, `AG-141`), HQ Duty Board/Radio Set & trailhead posters (`AG-125`, `AG-132`), 6-family buildables overhaul (`AG-129`), raised vs ground turret wall-clearance GPU shots (`AG-144`, `qa/2026-10-28-AG-144/`), and `GP-19970`/`GP-19977` visual reviews (`AG-138`, `AG-141`, `AG-142`, `AG-143`, `AG-145`).
- **AG-144 (trapper cellar's ground)**: DONE (`handoffs/2026-10-28-antigravity-AG-144-cellar.md`, `qa/2026-10-28-AG-144-cellar/report.md`). Replaced flat mound slab over `camp-trapper` cellar with `buildTrapperCellarCap` vertex-colored terrain cap + concrete hatch collar (`0` sweep findings, `66/66` browser checks PASS).
- **AG-146**: DONE (`handoffs/2026-10-28-antigravity-AG-146.md`, `qa/2026-10-28-AG-146/report.md`, `qa/2026-10-28-AG-146/gp-19970-reviews.md`). Ran `review/sweep/jobs/cave-mouths.json` on the real GPU (24 shots + `sheet.jpg`, all 6 cave mouths PASS `4.2/5`–`5.0/5` day & night) and scored all 3 `GP-19970` follow-up close-up batches.
- **Next**: Queue empty; ready for next visual review or GPU sweep.
