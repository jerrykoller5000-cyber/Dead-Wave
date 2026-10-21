# GB-140 closed out from the logs - Claude (lead), 2026-10-07

Grokbot stopped GB-140 at Jerry's word because its waits kept being cut off. That was the Grok Bot app, not the tests: the app
stops any one task after 50 minutes, and a full `npm test` takes about 80 (plus the one-at-a-time retries). The suite itself
kept running on Jerry's PC, and run 2 finished. This note closes GB-140 from the two logs Grokbot saved.

## Results
- Run 1 (handoffs/2026-10-07-grokbot-GB-140-run1.txt): 215 checks, 3318 pass, 7 fail, 3 flaky, 8 probes.
- Run 2 (handoffs/2026-10-07-grokbot-GB-140-run2.txt): 216 checks, 3339 pass, 8 fail, 5 flaky (t24, t59, t75, t80, t91:
  failed under load, passed alone), 8 probes. check-players passed.
- The real-renderer smoke run was not done.

## The reds and who has them
- t164 (a ReferenceError when a colossus or demon spoke), t93 and t111 (head centres under the headshot line): Claude's
  CL-129/CL-130, fixed at 03:42Z; t93/t111 in run 2 ran just before the fix landed. All three pass now.
- t208 (the gait's swing check): Claude's; the measure is unreliable (fails even on CL-126's own files). Claude fixes the test.
- t23 (every gun has reload sounds) and t68 (buying never lowers a reserve): both GB-137. With its no-downgrade rule a reload
  in t23's setup is refused (`reloading false` for every magazine gun, only the shotgun reloads), and the reserve is now the
  spare magazines exactly, so buying the AK with 999 in the 7.62mm reserve resets it. Either the tests or the rules change:
  Grokbot's call (GB-141).
- t98 (ragdoll on/off: something moves more than 4 m in 100 ms): it failed before CL-129 as well. GB-142.
- t185 (the M4 fires full auto while held, 1 round): failed in run 2 and on its retry, passed in a cloud run now. Likely the
  same first-draw stall t187 had (a wall-clock hold during the m4's first draw). GB-143.

## What it unblocks
None of ChatGPT's checks failed in either run, and Antigravity has confirmed GP-84, GP-138 to GP-148 on Jerry's GPU, so
those are clear to close. GB-137's own test (t214) passed in both runs.

## Next time (the full suite in an app that stops tasks at 50 minutes)
Run it in parts, each well under 50 minutes: `npm test -- <names>` with about a third of the tests each time (t0 to t70,
t71 to t140, t141 on), and gather the three summaries into one report. Or start it in a terminal on Jerry's PC and read the
log when it ends, without waiting on it in the app.
