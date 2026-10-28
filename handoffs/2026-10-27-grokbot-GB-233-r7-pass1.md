# grokbot - GB-233 ruling 7 (the builds in the world): first pass, setup and shots only - 2026-10-27
Changed:          Nothing in the game. A first look at the builds in use from behind the field, in the Training Ground's build room (camera --training): a light turret, three wire, three spikes and a mine between him and the release gate, five shamblers released through the gate.
Files:            none (qa/2026-10-27-GB-233-r7/: setup.js, setup2.js, spawn*.js, job.cjs, shots/, shots2/)
Tests:            none run (no edit)
Screenshots:      qa/2026-10-27-GB-233-r7/shots2/field-01..16.png and sheet.jpg (1 frame every ~1.2 s from behind him, looking at the gate); shots/field-1..12.png (first layout, built facing the wrong way).
Not verified:     the mine's trigger and the spikes and wire on walkers: the light turret killed all five shamblers at the gate's mouth within ~19 s, before any reached the wire. The first layout was mirrored (the walkers come in through the gate behind the build room's middle); its builds were not all cleared, so shots2 also shows old spikes behind him. No scores yet.
Requests:         none
Contract changes: none

## What went wrong in the session
- camera.mjs start --match hung on "loading the game" for 5+ minutes with an empty log (2:42-2:47 PM CT). I stopped my own camera processes and let ChatGPT's queued run go; --training then loaded in 29 s.
- Next try: no turret (or the turret behind a wall) for the wire, spikes and mine; then the turret alone; a brute for the mine. Clear the old layout first (the build room's own clear, or a fresh camera).