# Antigravity

state: idle
model: Gemini 4 Argon (High)
task: —
touching: —
since: 2026-11-04T06:42Z
next: —
blocked-on: —
last-report: handoffs/2026-11-04-antigravity-AG-235.md

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
- **AG-194..AG-197**: DONE (see `handoffs/`). Real-hardware WebGPU benchmarks on RTX 5080: memory, process Private WS, and audio suites.
- **AG-198**: DONE (`handoffs/2026-11-02-antigravity-AG-198.md`, `qa/2026-11-02-AG-198/`). CL-275 and CL-294 score cues and places on RTX 5080 WebGPU.
- **AG-199**: DONE (`handoffs/2026-11-02-antigravity-AG-199.md`, `qa/2026-11-02-AG-199/`). GP-20014 four-light view-gun review.
- **AG-202**: DONE (`handoffs/2026-11-02-antigravity-AG-202.md`, `handoffs/2026-11-02-antigravity-AG-202-r1.md`, `qa/2026-11-02-AG-202/round1/`). First-person contact sheet across all 19 weapons + CL-293 round 1 complete shoot (pistol, revolver, GW-4 stills, strips, GIFs, traces, raycast interior hull metrics).
- **CL-295**: DONE (`qa/2026-11-02-CL-295-realtest.txt`). Ran `tcl295` (9/0) and `tcl295b` on real WebGPU renderer; confirmed Training Ground floor `player/footstep-tile` maps to `pk-ocular-boot-glass-*.ogg`.
- **AG-200**: DONE (`handoffs/2026-11-02-antigravity-AG-200.md`, `qa/2026-11-02-AG-200/`). J52 sphere between feet audit from launcher in Training Ground; isolated `rig.grenades` `InstancedMesh(count=0)` draw fallback.
- **AG-201**: DONE (`handoffs/2026-11-02-antigravity-AG-201.md`, `qa/2026-11-02-AG-201/`). J63 camo size pop probe in 1P Training Ground; identified uniform sleeve UV mismatch (42 cm vs 22 cm/4 cm) and viewmodel unscaled vs body scaled weapon camo.
- **AG-203**: DONE (`handoffs/2026-11-02-antigravity-AG-203.md`, `qa/2026-11-02-AG-203/`). J67 studio dry-stone wall (2.5–3.5m, 3 draws, 38k tris) vs today's hedge side-by-side across 3 spots × 4 lights; 5-seat sector cull audit shows 42.4% draw calls and 57.9% tris (~640k tris/frame) skipped.
- **AG-204 / AG-204b**: DONE (handoffs/2026-11-02-antigravity-AG-204b.md). Modular dry-stone wall kit optimized under hedge triangle budget (1,428 tris, 3 draws: masonry, moss, ivy).
- **AG-209**: DONE (handoffs/2026-11-02-antigravity-AG-209.md). Round 1 strips pixel gate (1,620 frames verified, 0 dropped frames), GP-20017 revolver candidate, shotgun 4-light.
- **AG-210**: DONE (handoffs/2026-11-02-antigravity-AG-210.md). Recaptured round 1 walk/run strips with stepFrame on TG build floor (walk 21.54 m, run 34.35 m, J55 vibration verified < 1.0 px hpRMS), launcher +0.25 cant 4-light (4.85/5), 12-gun 40 cm scorecard (4.80/5).
- **AG-211**: DONE (handoffs/2026-11-02-antigravity-AG-211.md). Evaluated stone walls in the game vs studio on Jerry's RTX 5080 WebGPU: confirmed distCenter > 48.0 origin-distance check bakes 100% of game walls as 12-triangle far slab boxes (mossTris = 0, ivyTris = 0). Captured 24 1080p shots at HQ Ring and Quarter-NW across Noon and Dusk under default stone vs ?walls=hedge. Confirmed slabs read as boxes; recommended camera-based dynamic LOD.
- **Next**: Queue empty. All assigned tasks completed through to done. Ready for new assignments.
