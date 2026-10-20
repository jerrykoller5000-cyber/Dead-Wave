# GB-202: zombies mark spikes at night 20 (BLOCKED, interrupted twice)

Status: blocked. My session was interrupted twice in a row, so under the session rule I'm stopping. No further fix work was done after the second interruption.

## Spike cause found
- Probe at night 20, before the fix (handoffs/2026-10-20-grokbot-GB-202/probe.mjs): zombies mark mean 2.48 ms, p99 6.1 ms, max 9.2 ms.
- Frames that rebuild the flow field (every 0.4 s) average 4.67 ms, against 2.38 ms for the others. The periodic rebuild costs 2 to 3 ms inside a single frame.
- Second cause: updateZombies allocated about 264 kB a frame (from GP-19940's profile), much of it from Math.hypot.

## Fixes now in index.html (unmeasured)
1. Sliced flow field: `function* ffBuildGen` (about line 50373) builds the periodic rebuild into a back field at 1 ms a frame and swaps it in whole when it finishes. The `ffStepSlice()` path is at about line 50562. Forced builds and first builds still run immediately.
2. `const zHyp` (about line 52692): Math.hypot is replaced in updateZombies with a non-allocating sqrt.

## Tests
- After fix 1: t215, t95 and t47 passed. t126 and t80 each had one wall-clock red; the rerun was not finished.
- The 08:01Z slot run (t215, t95, t47 after zHyp) exited 1. I don't have its FAIL lines; they're in the slot run's output, not in the log.
- **The after-bench was never run.** There are no numbers yet for whether the spikes are below 5 ms.

## File state (checked 2026-10-20, about 3:07 AM CT)
- index.html: UTF-8 with no BOM, all CRLF (57,893 CRLF and 0 bare LF). ffBuildGen, ffStepSlice and zHyp are each defined once, so there are no duplicated blocks. `node --check` passes on both inline scripts. Last written 2:29:59 AM CT.
- I edited no other game files for GB-202. probe.mjs is a handoff-only tool.

## Processes and slot
- Stopped only my own processes:
  - PID 46892, the queued slot run of t215, t95 and t47.
  - PID 44496, the queued night-20 probe slot run.
  - PID 40456, my own PowerShell wrapper that chained them.
- Canceled my stale queue entry 4712c899.
- I never held the slot at stop time. Nothing of Jerry's or the other agents' was touched.

## Next
- Rerun t215, t95, t47, t126 and t80 through the slot to check the 08:01Z failure.
- Then run the night-20 after-probe or bench: `tools/bench.mjs --night 20 --gfx high --prof --cpu`.
- If the zHyp edit turns out to be the cause of the red, revert it.

## GB-201
GB-201 chunk A has NOT started. Chunks A, B and C are still mine to run, and I stop when I reach Antigravity.
Changed: index.html. Added ffBuildGen and ffStepSlice to slice the flow field, and zHyp in updateZombies.
Tests: after the slice, t215, t95 and t47 were green, and t126 and t80 each had one wall-clock red. The 08:01Z run of t215, t95 and t47 after zHyp exited 1, and I don't have its FAIL lines.
Not verified: the night-20 after-bench, whether the spikes are now under 5 ms, and the cause of the 08:01Z exit 1.