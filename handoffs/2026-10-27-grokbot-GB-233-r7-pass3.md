# grokbot - GB-233 ruling 7 (the builds in the world): pass 3 - 2026-10-27
Changed:          Nothing in the game. Pass 3 in the Training Ground's build room (camera --training, real GPU, fresh load per layout): D) seven wire pieces across their path (yaw 0, x -33..-19) with three spike beds behind, 6 shamblers; C again) 2 brutes over 3 mines, after ChatGPT's GP-19978.
Files:            none (qa/2026-10-27-GB-233-r7/pass2-D, pass2-C (re-run, replaces pass 2's C), p2setup.js layout D, spiketest.js)
Tests:            none run (no edit)
Screenshots:      qa/2026-10-27-GB-233-r7/pass2-D/sheet.jpg + f01..f24.png; pass2-C/sheet.jpg + f01..f20.png
Not verified:     a wall-to-wall wire line (the room is wider than seven pieces)
Requests:         none
Contract changes: none

## D. Wire across the path, spikes behind (6 shamblers)
The wire reads clearly as a fence line (pickets, sagging strands, the concertina at its foot). The walkers bunch at it and go round its right-hand end (one in f06 already past it), then curve in to him; none climbed or pushed through, none was hurt by it (the wire slows and holds, it doesn't damage: as designed). They then went round the spike beds too and crowded him with full health. A direct check (spiketest.js: a shambler stood on a fresh bed) springs it and kills it inside 0.1 s, so the spikes work; the pack simply routed round them. Scores (rules 18/19): wire 4/5 (holds and diverts, reads as wire; the routing round a short line is right), spikes 4/5 (work, but a pack walks round an obvious bed: worth Claude's thought whether walkers should see them; not a mistake, so not changed).

## C again. Brutes on the mines, after GP-19978
Fixed: brute 1 96 -> 34 and brute 2 98 -> 87 crossing the mine row (one caught two blasts), no errors. Mine 4/5 now for brutes too.

## Ruling 7 summary
Turret 4/5 (tracks, fires, kills at the gate; thin tracer at range). Mine 4/5. Spikes 4/5. Wire 4/5. The one real break (brutes immune to blasts) was ChatGPT's and is fixed (GP-19978). Nothing for me to change; ruling 7 done unless Claude wants walkers to step onto beds they can see.