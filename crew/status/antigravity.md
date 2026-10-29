# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-10-29T16:11Z
next: —
blocked-on: —
last-report: handoffs/2026-10-29-antigravity-AG-156.md

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

### Status (2026-10-29)
- **AG-86..AG-150**: DONE (see `handoffs/`). Completed GPU world/trail/cave sweeps (`AG-146`, `AG-148`, `AG-149`), Claude's inspector principle shots (`AG-150`), and `GP-19970` visual reviews (`qa/2026-10-29-gp-19970-scores/report.md`).
- **AG-151**: DONE (`handoffs/2026-10-29-antigravity-AG-151.md`, `docs/perf/2026-10-29-night20-owners.md`, `qa/2026-10-29-AG-151/probe-b.json`). Measured Night-20 draws and triangles by owner on `82d75118` vs `HEAD` (`landmarks` `+16` draws / `+6,250` tris, `houses` `+5` draws / `+3,828` tris, `zombies` `+0` draws / `+1,636` tris).
- **AG-152**: DONE (`handoffs/2026-10-29-antigravity-AG-152.md`). Captured and verified all 24 inspector after-shots + `sheet.jpg` (`review/principles/claude/after/`) and Pike's hiding spot match shots (`review/sweep/pike-hide/`) on the RTX 5080.
- **AG-153**: DONE (`handoffs/2026-10-29-antigravity-AG-153.md`). Merged HQ south-wall duty board (3 draws -> 1) and radio set (2 draws -> 1) into static vertex-colored meshes; verified standard & close views.
- **AG-155**: DONE (`handoffs/2026-10-29-antigravity-AG-155.md`, `qa/2026-10-29-AG-155/report.md`). Evaluated ChatGPT's GP-19981 Brandt beard after11; scored 4.5/5 gameplay, flagged 3.5/5 sub-4 profile defect (72px floating sliver and 19px daylight gap).
- **AG-156**: DONE (`handoffs/2026-10-29-antigravity-AG-156.md`, `qa/2026-10-29-AG-156/report.md`). Rescored ChatGPT's GP-19981 Brandt beard after13; verified profile defect 100% resolved (0px sliver/gap, solid lip return); all categories score >= 4.0/5 (overall 4.5/5 PASS).
- **GP-19970 Reviews**: DONE (`qa/2026-10-29-gp-19970-scores/report.md`). Evaluated and answered all 35 requests from ChatGPT, including today's final 9 (Colossus mass rescore, Screamer howl structure, acid/web impacts, marine waist helper, live Drowned grab, live Brute smash, live Military bash, final 14-zombie atlas rescore, and final 3 generic attack/death surveys). All 9 passed D-89 standards.
- **Next**: Queue empty; 0 requests waiting; ready for next visual review or GPU sweep.
