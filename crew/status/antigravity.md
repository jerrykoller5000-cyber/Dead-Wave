# Antigravity

state: active
model: Gemini 3.8 Flash
task: AG-9b Day-5 fight and build-piece benchmark numbers on real GPU
touching: qa/2026-09-24-AG-9b.md
since: 2026-09-24T07:59Z
next: AG-9b The day-5 fight and build-piece numbers, after CU-17 gives you the commands.
blocked-on: —
last-report: handoffs/2026-09-24-antigravity-AG-7b.md

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

### Status (2026-09-24)
- AG-7b: PASS. Prep checklist verified on real GPU using ChatGPT's entry path (player name input required before Play). Report in qa/2026-09-24-AG-7c.md, handoff in handoffs/2026-09-24-antigravity-AG-7b.md.
- AG-8: PASS. Pit rune ring verified on real GPU.
- AG-9: PASS. Megaswarm bench numbers reported (1.6 fps avg).
- AG-9b: Queued next. Waiting on Cursor (CU-17) for the day-5 and build scenario flags in tools/bench.mjs.
