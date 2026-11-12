# AG-309b interim: 3P cold entry breakdown and first-equip (Antigravity, Claude Sonnet 5.5)

Card stays open: items 1 (blackout-lift frame) and 4 (faded-marine pictures) are not done.

## Item 2: first equip after the blackout: no work needed
Probe qa/2026-11-11-AG-309b/probe-equip.mjs (1P, RTX 5080, exclusive): revolver, launcher and chainsaw first equip all max frame 33 ms (2 vsyncs), setWeapon sync 0.5-2.4 ms, no AudioSys call over 2 ms. The AG-309 hitches (69/107/140 ms) do not reproduce. core/audio.js untouched (the loan is unused).

## Item 3: 3P cold entry breakdown (probe-entry3p.mjs, one run; wrapping adds a little)
Total click to blackout lifted: 10.1 s in this run (AG-309's all-warm figure was 8.7 s; run-to-run spread is large).

| Phase | At (ms) | Length |
|---|---|---|
| World built (enterTraining to training active) | 0 to 1035 | about 1.0 s |
| Setup before compile (blackout on to compileAsync start) | 1035 to 1496 | 0.46 s |
| renderer.compileAsync (all pipelines) | 1496 to 7903 | 6.4 s |
| After compile: staged frames, armory warm, carry rig, until the blackout lifts | 7903 to 11126 | 3.2 s (long tasks 1217, 313, 348 ms) |

The target is about 5 s. The compile is 63 percent of the total, the tail after it a further 32 percent.

## Plan (estimates not measured)
1. Compile only what the entry view shows. In 3P, skip the first-person viewmodel guns until the first switch to 1P. This is the biggest saving, since the compile is where the time is. AG-309 showed background slicing after the lift freezes frames (410 ms in 1P, 751 ms in 3P), so no slicing after the lift.
2. Overlap the 3.2 s tail. warmArmoryPics runs on its own 400x200 renderer, so start it while compileAsync is in flight instead of after it.
3. Re-measure with the same probe; success is under 5 s total and no new frame over 50 ms after the lift.

## Changed:
tools/tests/fakethree.mjs (SpotLight constructor: angle, penumbra, decay; fixes tag289). New probes in qa/2026-11-11-AG-309b/ (probe-spot, probe-equip, probe-entry3p). No game code changed in this interim.

## Tests:
tag289 30/0, t38 26/0 after the fakethree change.

## Not verified:
Blackout-lift frame under 50 ms (item 1); before/after faded-marine pictures (item 4); the plan above has not been implemented or timed.

## Item 1 (blackout-lift frame): findings so far, no fix yet (probes probe-lift*.mjs, 3P, exclusive)
- 4 runs: in 3 of them the first live render after the lift took 377, 517 and 506 ms (one frame, two nested entries), and the pipeline count rose by 3 during it (569 to 572, 567 to 570). In the 4th run no render was over 20 ms and the count was already 572 at the lift.
- So the stall is intermittent and is 3 pipelines the warm-up misses when some async piece has not finished by the lift. It is not the marine shadow proxy: with MARINE_SHADOW_PAD=[128] the rebuild after the lift costs about 13 ms and is no longer a shader compile.
- Not yet found: which 3 shaders they are (the cache keys are hashes; the vertex/fragment text was meant to classify them but the one run that could classify them had none to show).
- Next step: run the classification probe repeatedly until it catches the 3 new shaders, then add what they belong to into trainingWarmCompile (or hold the lift until the same async piece is done).
