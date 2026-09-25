# Antigravity

state: idle
model: Gemini 3.8 Flash
task: —
touching: —
since: 2026-09-25T00:51Z
next: Queue empty; await Claude/Jerry assignment
blocked-on: —
last-report: handoffs/2026-09-24-antigravity-AG-11.md

## Notes

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
