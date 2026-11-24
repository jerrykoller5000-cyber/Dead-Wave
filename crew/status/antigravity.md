# Antigravity

state: active
model: Gemini 4 Neon
task: AG-419 Jerry direct: performance profiling & zero-downgrade optimization
touching: qa/AG-419/ (new), game/training-infirmary.js, game/training-containment.js, world/outer-world.js, world/light-pool.js, studio/marine-skin.js, studio/clip.js, ui/minimap-kit.js, index.html (perf: holdFrameMatrices, walkShown, holdsCaster, fastskel, tick alloc/DOM)
since: 2026-11-24T09:26Z
next: —
blocked-on: —
last-report: handoffs/2026-11-24-antigravity-AG-414.md

## Notes

### Your model (Jerry, 2026-11-16, D-188)
You run on **Gemini 4 Carbon** (Jerry, 16 Nov 2026, D-188): check in with `--model "Gemini 4 Carbon"`. Keep the git rule: ONLY `Claude Commit.bat` when `Claude outputs/commit/files.txt` is present, never retry on failure, never run any other git command, never push.


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

### Status (2026-11-18)
- **D-114 in force**: Lighter load on Jerry's PC until he is home — keep real-renderer runs to the few short runs a task needs, score strictly what the pictures show, no long batches or benches unless Claude asks.
- **Recent DONE**: AG-364/365 (J164 landed 72e543b4 closeups PASS), AG-368..374 (AG-357 Shambler Pass 7 `18-shambler-final-jerry.jpg` + CB-358 probes + humanoid kit plan), AG-375 (GP-20155 v12). Reports in `handoffs/2026-11-18-antigravity-*.md`.
- **AG-376**: DONE (`handoffs/2026-11-18-antigravity-AG-376.md`, `qa/2026-11-18-AG-376/report.md`): GP-20155 v14 (supersedes v13) CaveGuard look; chin fangs & brown gum bar/balls resolved (`15/15` lower teeth seated, `+18.79 mm` chin clearance, `13/13` Hunt clear); open jaw underside w/ small tan tips in `head-back-noon.png`, flat tray jaw, mild round eyes/rear side sliver, zigzag moss & step-3 body items remain.
- **AG-377**: DONE (`handoffs/2026-11-18-antigravity-AG-377.md`, `qa/2026-11-18-AG-377/report.md`): Spider `naturalleg15` `death2` filmstrips (`0` contacts, `+0.117 mm` floor across `61` frames); flagged `f30..60` upright "coat-hook" tibias & pre-socket open neck/femur seams.
- **AG-378**: DONE (`handoffs/2026-11-18-antigravity-AG-378.md`, `qa/2026-11-18-AG-378/report.md`): `Spider17` joint seats look (`58/58` rooted at `2 um`, `0` contacts across `90` poses, `+0.421 mm` corpse floor, `4,712` tris); flagged protruding ventral brown triangular shards under femur root cuffs (`close-side/3q-noon`) & abrupt rear cervical collar edge.
- **Next**: Idle; waiting on next board/request assignment.
ventral brown triangular shards under femur root cuffs (`close-side/3q-noon`) & abrupt rear cervical collar edge.
- **Next**: Idle; waiting on next board/request assignment.
