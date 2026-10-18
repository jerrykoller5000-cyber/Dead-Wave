# Antigravity

state: active
model: Gemini 4 Argon (High)
task: AG-82 Frame time on Jerry's GPU, after CU-148: bench.mjs --night 5, 10, 14, 18, 20 and megaswarm (48) at default and High presets
touching: qa/2026-10-18-AG-82/, qa/2026-10-18-GP-19925-shots/
since: 2026-10-18T14:12Z
next: AG-82 Frame time on Jerry's GPU, after CU-148. Through the slot: `
blocked-on: —
last-report: handoffs/2026-10-18-antigravity-AG-81.md

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

### Status (2026-09-24 / 2026-09-25)
- AG-7b: PASS. Prep checklist verified on real GPU. Report in qa/2026-09-24-AG-7c.md, handoff in handoffs/2026-09-24-antigravity-AG-7b.md.
- AG-8: PASS. Pit rune ring verified on real GPU.
- AG-9: PASS. Megaswarm bench numbers reported (1.6 fps avg, 58 hitches).
- AG-9b: PASS. Real GPU benchmark runs completed and reported (28 hitches on day5; 34 hitches on build; diagnosed commitBuildDrag missing in tools/bench.mjs). Report in qa/2026-09-24-AG-9b.md, handoff in handoffs/2026-09-24-antigravity-AG-9b.md.
- AG-10: PASS. Captured 8 morning shots on Jerry's GPU (wave finisher 3-frame sequence, kiosk restock Weapons/Ammo, Ready panel under health, Ember Night banner, cave aerial in night fog). Report in qa/2026-09-24-AG-10.md, handoff in handoffs/2026-09-24-antigravity-AG-10.md.
- AG-13: PASS. Captured 10 visual QA shots verifying CL-33 finisher camera orbit on corpse without face push, GB-35 cave poke aggro/chase/grab/drag/thrown cutscene, and GP-27 non-skippable splash. Report in qa/2026-09-24-AG-13.md, handoff in handoffs/2026-09-24-antigravity-AG-13.md.
- AG-9c: PASS. Build bench verification post-CU-19 fix. Diagnosed cabin obstacle at gz + 3. Report in qa/2026-09-24-AG-9c.md, handoff in handoffs/2026-09-24-antigravity-AG-9c.md.
- AG-12: PASS. Captured 11 morning shots on Jerry's GPU: CL-32 detailed face with no helmet (front, 3/4, low-angle), CL-31/33 finisher camera, CL-20 pit bubbles and hidden tentacles, CL-19 watchtower deck ladder top and railing collision, and GP-29 kiosk full-ammo text. Report in qa/2026-09-24-AG-12.md, handoff in handoffs/2026-09-24-antigravity-AG-12.md.
- AG-11: PASS. Megaswarm and Day 5 benchmarks on Jerry's GPU after GB-28 and CL-28. Measured 65.5% drop in megaswarm hitches (58 down to 20) and 57.1% drop in Day 5 hitches (28 down to 12). Report in qa/2026-09-24-AG-11.md, handoff in handoffs/2026-09-24-antigravity-AG-11.md.
- AG-15: PASS. Complete Day 1 audit on Jerry's RTX 5080 GPU across two full runs (survive and death/restart). Documented 9 problems (2 S1, 4 S2, 3 S3) with 18 screenshot proofs. Report in handoffs/audit-day1/antigravity.md, shots in qa/shots/2026-09-25-AG-15/.
- 2026-09-25 22:05Z (Claude, from Jerry): back on Gemini 3.1 Pro. AG-16 and AG-17 are parked or moved; next is AG-18.
- 2026-10-15 AG-78: Changes ready; waiting for testing slot. All 12 wildlife & habitat subjects upgraded in `index.html` and `world/rabbit.js` (16/16 pure-Node checks pass; batched camera job ready in `qa/2026-10-15-AG-78/after-job.json` including `animal.fish:3` roach).
- 2026-10-15 AG-79: Changes ready; waiting for testing slot. Upgraded Skeletal Marine (`325 -> 54` meshes compacted per pivot via `mergeStatic`), Bone Raft (`294 -> 35` meshes compacted via `mergeStatic`), Wood wall (5 tiers), Wood floor (3 tiers), Barricade (3 tiers), and Sandbag Wall (3 tiers) in `index.html` (18/18 pure-Node checks pass; batched camera job ready in `qa/2026-10-15-AG-79/after-job.json`).
- 2026-10-15 AG-80: Changes ready; waiting for testing slot. Upgraded all 8 buildables & 24 tier variants in `index.html`: Barbed wire (Tiers 0–2), Railing (Tiers 0–2), Platform (Tiers 0–2), Structural pillar (Tiers 0–2), Stairs (Tiers 0–2), Spike trap (Tiers 0–2), Land mine (Tiers 0–2), and Decoy beacon (Tiers 0–2) (26/26 pure-Node checks pass; batched camera job ready in `qa/2026-10-15-AG-80/after-job.json`).
