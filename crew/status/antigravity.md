# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-11-02T05:47Z
next: —
blocked-on: —
last-report: handoffs/2026-11-02-antigravity-AG-197.md

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

### Status (2026-11-02)
- **AG-174..AG-185**: DONE (see `handoffs/`). GPU inspections of thicket rings, clearings, trails, dark woods audio, fuel depot, Trapper fence gate, skyline pulls.
- **AG-194**: DONE (`handoffs/2026-11-02-antigravity-AG-194.md`, `qa/2026-11-02-AG-194/`). Real-GPU verification on RTX 5080 WebGPU for CL-275 score (tcl275a 12/0, tcl275b 6/0, tcl275c 7/0, t182 36/0). JS heap evaluation at Night 20 peak.
- **AG-196**: DONE (`handoffs/2026-11-02-antigravity-AG-196.md`, `qa/2026-11-02-AG-196/`). Real-hardware process memory benchmark across all Chrome processes on RTX 5080. Verified score's decoded PCM audio buffers reside in the Game Renderer process (+15.2 MB PrivWS) rather than Audio Service (3.4 MB static) or V8 JS Heap (flat). Evaluated Training Ground 3-motif recovery sequence (feral, brute, spitter); verified memory drops back down by 55-82 MB after clearing each motif.
- **AG-197**: DONE (`handoffs/2026-11-02-antigravity-AG-197.md`, `qa/2026-11-02-AG-197/`). Real-hardware WebGPU verification on RTX 5080 for CL-275 score calm pools (`tcl275d` 7/0) and full audio regression suite (`t73` 12/0, `t60` 43/0, `t61` 22/0, `tcl275a` 12/0; 96/0 total PASS). Calm plays `gh-place-dawn` audibly and cleanly restores old calm on score off.
- **Next**: Queue empty; 0 requests waiting; ready for next visual review or GPU sweep.
