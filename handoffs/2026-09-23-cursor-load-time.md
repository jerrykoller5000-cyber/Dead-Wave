# Cursor — load time, measured (Phase 0, step 4) — 2026-09-23

Changed:          Added `tools/loadtime.mjs` and measured the load, stage by stage, with the
                  tab in front and in the background. **The headline: the world is built in
                  4.7 s. The title screen appears 42-55 s later, and the gap is shader
                  pre-compilation, not world generation.**
Files:            `tools/loadtime.mjs` (new), `index.html` (`TT.loadMarks()` debug export)
Tests:            npm test → unchanged by this (215 pass, 58 fail, 9 cannot run).
Screenshots:      n/a.
Not verified:     Cold cache (`--cold`) and multi-run variance were not measured; both runs
                  here were warm and single. Numbers are Jerry's PC, Chrome, real GPU.
Requests:         See the note to Claude and Jerry below — this changes what the fix for
                  item 2 should be.
Contract changes: none. One debug-only export, `TT.loadMarks()`.

## Foreground, real GPU, warm cache

```
terrain+water+sky built                  0 ms
rocks                                   58 ms  (+   58)
trees                                  611 ms  (+  553)
player+weapons+zombie types            694 ms  (+   83)
foliage scattered                     1116 ms  (+  422)
POIs+minimap+foliage chunks           2233 ms  (+ 1117)
contact shading + rest of setup       2267 ms  (+   34)
post + pools + compile + warm frame   4655 ms  (+ 2388)
ready                                 4659 ms  (+    4)

window.TT published                   6500 ms
TITLE SCREEN                         42200 ms  (first run)  /  54700 ms (second run)
```

Everything the world generator does — terrain, water, sky, 150 rocks, the trees, foliage,
POIs, the minimap — is finished in **4.7 seconds**. What happens next is the shader warm-up
and then the live pre-roll, which the game logs itself:

```
Dead-Wave warm-up:  68 shader variants compiled, 37 bodies pooled, 1 warm frames
Dead-Wave pre-roll: 78 shader variants compiled after 20 warm frames
```

Those 146 variants, compiled a few per frame, are the 37-50 seconds. Load time is a shader
problem, not a world problem.

## Background tab: it never finishes

```
visibility=hidden
world build completes (the load log prints)
warm-up completes (68 variants)
window.TT             never published
TITLE SCREEN          never — "Still loading" at 90 s, still nothing at 420 s
```

The cause is structural: both the live pre-roll and the line that publishes `window.TT` run
inside the frame loop, and a hidden tab gets no animation frames. Everything after the warm-up
therefore stops dead. `?raf=timer` works around it for tooling by driving the loop from a
timer, which is why `shoot.mjs` and `npm test` can run headless at all, but real play still
parks if a player switches tabs while it loads.

## What this means for the roadmap (Claude, Jerry)

Item 2 says "stop the loader stalling in a background tab, then bake the world to a file". The
first half is right and I own it. The second half would buy **at most 4.7 seconds** of the
42-55 second load, and rocks, trees and foliage are only 2.2 s of that. The bake is still worth
having for determinism, but it is not the load-time fix.

Three things would actually move the number, in the order I would do them:

1. **Stop compiling every variant up front.** 146 variants are pre-compiled so nothing hitches
   mid-fight. Most are for things a player will not see for several minutes (kill types,
   demons, a colossus). Compiling the first-minute set before the title and the rest during the
   prep phase would cut the wait by most of itself.
2. **Do not gate the title on the pre-roll.** The world is ready at 4.7 s; the menu could be
   interactive there, with the warm-up continuing behind it and the Play button waiting on the
   small first-minute set only.
3. **Drive the loader off a timer, not animation frames**, so a hidden tab finishes. That is
   the background fix and it is mine.

I have not touched any of this yet — it is Phase 1 and item 1 and 2 work, and 1 and 2 above sit
in `combat/*` and `core/*` respectively once the split lands. Flagging it now because the plan's
stated fix would not have moved the number much.

## Using the tool

```
node tools/loadtime.mjs              foreground, real GPU, warm
node tools/loadtime.mjs --bg         with the tab pushed to the background
node tools/loadtime.mjs --cold       clear the HTTP cache first
node tools/loadtime.mjs --headless   headless with SwiftShader (what CI would see)
node tools/loadtime.mjs --runs 3     repeat
```

It prints each `loadMark()` stage with deltas, the progress labels with timestamps, the game's
own warm-up log lines, and exits non-zero if a run never reached the title screen.
