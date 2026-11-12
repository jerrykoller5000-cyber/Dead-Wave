# Antigravity

state: idle
model: Claude Sonnet 5.5 (medium)
task: —
touching: —
since: 2026-11-12T03:10Z
next: AG-309b (00:59Z, CLAUDE DIRECTOR: add tag289: the flashlight reads p
blocked-on: —
last-report: handoffs/2026-11-12-antigravity-AG-313.md

## Notes

### Your model (Jerry, 2026-11-11, D-164)
You run on **Claude Opus 5.5 (high)** (Jerry, 11 Nov 2026, D-164; Gemini 4 Carbon before): check in with `--model "Claude Opus 5.5 (high)"`. Keep the git rule: ONLY `Claude Commit.bat` when `Claude outputs/commit/files.txt` is present.


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
- **AG-236**: DONE (`handoffs/2026-11-06-antigravity-AG-236.md`, `qa/2026-11-06-AG-236/`). Rescored Grokbot's `GB-280` live brute get-up after-fix pictures.
- **AG-237**: DONE (`handoffs/2026-11-06-antigravity-AG-237.md`, `qa/2026-11-06-AG-237/`). `t298` five runs on real WebGPU renderer after CL-302.
- **AG-239**: DONE (`handoffs/2026-11-06-antigravity-AG-239.md`, `qa/2026-11-06-AG-239/`). The chain sound log (CL-295, J53): logged 4 seats in TG and Trail; identified gravel footsteps as sole repeating rhythmic source.
- **AG-240**: DONE (`handoffs/2026-11-06-antigravity-AG-240.md`, `qa/2026-11-06-AG-240/`, `review/AG-240/`). Footstep A/B evaluation on trail outside Threshold (First Person): 20s walk & run As-Is vs `?steps=grass`. As-Is fired 61 gravel walk steps and 89 gravel run stomps; `?steps=grass` cleanly switched dirt to 63 soft grass walk steps and 90 soft grass run steps (0 gravel takes on dirt). Verified 100% surface invariance on stone, metal, water, and leaves. Recorded 10s master WebAudio from all runs + side-by-side comparison tracks to `review/AG-240/`. Composite sheet: `qa/2026-11-06-AG-240/footstep-ab-sheet.jpg`.
- **AG-295**: DONE (`handoffs/2026-11-11-antigravity-AG-295.md`, `qa/2026-11-11-CD-1-pass2/`, `review/CD-1/pass2/`). CD-1 pass 2 hand fits in 4 lights across 8 guns on RTX 5080 WebGPU (48 screenshots, `sheet.jpg`, `hands-detail.jpg`, `focus-checks.jpg`). Verified launcher firing hand on grip (palm out of receiver), pistol/revolver two-hand holds clean (0.1/1.1 mm overlap), chainsaw rear hand out of rubber block with no visible dent from glove give, pump shotgun aimed bead sight (y=362) completely clear of support glove (y=366).
- **Next**: Check board queue.
