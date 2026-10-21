# antigravity — AG-100 The full suite's far end, after AG-99 — 2026-10-20
Changed:          Ran Chunks F (`t240..t268`, 29 checks: `402 pass, 15 fail`), E (`t196..t229`, 34 checks: `637 pass, 8 fail`), and D (`t164..t195`, 32 checks: `747 pass, 1 fail`) sequentially through the game-test slot with `--all-fails`, saved full logs to `qa/2026-10-20-AG-100/chunk-{F,E,D}.log`, and logged every summary and verbatim `FAIL` line to the crew board after each chunk (`95 checks total: 1,786 pass, 24 fail`).
Files:            qa/2026-10-20-AG-100/run-chunk.mjs, qa/2026-10-20-AG-100/chunk-F.log, qa/2026-10-20-AG-100/chunk-E.log, qa/2026-10-20-AG-100/chunk-D.log
Tests:            Chunk F (`t240..t268`) → 29 checks: 402 pass, 15 fail; Chunk E (`t196..t229`) → 34 checks: 637 pass, 8 fail; Chunk D (`t164..t195`) → 32 checks: 747 pass, 1 fail (Total across `t164..t268`: 95 checks, 1,786 pass, 24 fail); new tests: none
Screenshots:      none (headless suite chunks; saved full logs in `qa/2026-10-20-AG-100/chunk-{F,E,D}.log`)
Not verified:     None
Requests:         FYI to claude (`t193` 17 pass 1 fail in Chunk D); FYI to cursor (`tools/tests/run-all.mjs:292` transient Windows `UNKNOWN` file lock on `crew/tests.json`); Claude already triaged Chunks F & E (`CL-220` fixed `t253`, `t266`, `t209`, `t223` and routed `t244`, `t206`, `t222` to Grokbot, `t259` to Cursor, and `t268` to Antigravity)
Contract changes: none

## Rule 16 (Game-test slot)
Every chunk (`F`, `E`, `D`) was queued and run one at a time (`--jobs 1`) through the machine-wide game-test slot via `tools/tests/run-all.mjs --agent antigravity --task AG-100 --all-fails`, yielding the slot between chunks to `GB-202` and `GP-19940`.

## Summary by Chunk

| Chunk | Range | Checks | Pass | Fail | Red Tests | Log File |
| --- | --- | --- | --- | --- | --- | --- |
| **F** | `t240..t268` | 29 | 402 | 15 | `t244` (6), `t253` (3), `t259` (1), `t266` (4), `t268` (1) | `qa/2026-10-20-AG-100/chunk-F.log` |
| **E** | `t196..t229` | 34 | 637 | 8 | `t206` (2), `t209` (1), `t222` (4), `t223` (1) | `qa/2026-10-20-AG-100/chunk-E.log` |
| **D** | `t164..t195` | 32 | 747 | 1 | `t193` (1) | `qa/2026-10-20-AG-100/chunk-D.log` |
| **Total** | `t164..t268` | **95** | **1,786** | **24** | **10 red test files** | — |

## All Reds Across `t164..t268` (Verbatim `FAIL` Lines & Owners)

| Test | Pass / Fail | Owner | Verbatim `FAIL` Lines |
| --- | --- | --- | --- |
| **`t244`** | `3 pass / 6 fail` | Grokbot (`GB-178`, mortar mount) | `FAIL mortar mount: no jump - worst frame hips@1 132.0 cm (2200% of its limit)`<br>`FAIL mortar mount: the body does not teleport to the crew spot (132.0 cm on the first frame)`<br>`FAIL he walks in and crouches beside the tube (hips moved 132.0 cm, down 0.0 cm)`<br>`FAIL a round is in his hand, ready (rest)`<br>`FAIL the round is let go into the tube on the shot`<br>`FAIL threw: TypeError: Cannot read properties of null (reading 'visible')` |
| **`t253`** | `21 pass / 3 fail` | Claude (`CL-189`, fixed in `CL-220`) | `FAIL and he is back on his feet`<br>`FAIL a short cooldown before the next one`<br>`FAIL with an empty meter he still dives` |
| **`t259`** | `7 pass / 1 fail` | Cursor (`CU-150`, quit writes run) | `FAIL ending it writes the run and returns to the menu (12)` |
| **`t266`** | `28 pass / 4 fail` | Claude (`CL-216`, fixed in `CL-220`) | `FAIL radio: E shows it big (mode look, look radio, panel on, .look true, img /data:image/png;base64, canvas true, html 35574)`<br>`FAIL board: E shows it big (mode look, look board, panel on, .look true, img /data:image/png;base64, canvas true, html 70494)`<br>`FAIL truck: E shows it big (mode look, look truck, panel on, .look true, img /data:image/png;base64, canvas true, html 12554)`<br>`FAIL the keypad shuts by itself after` |
| **`t268`** | `19 pass / 1 fail` | Antigravity (`AG-93`, trapper path) | `FAIL stepping off the stones into the leaves snaps a trap (undefined)` |
| **`t206`** | `17 pass / 2 fail` | Grokbot (`GB-134`, grenade hold/arc) | `FAIL G down holds, G up throws (held 0.00 s)`<br>`FAIL none left: G does not start a hold` |
| **`t209`** | `12 pass / 1 fail` | Claude (`CL-136`, fixed in `CL-220`) | `FAIL it hauls itself on its arms: each reaches out and drags back (0.96, 1.94 rad)` |
| **`t222`** | `5 pass / 4 fail` | Grokbot (`CU-96` / weapons aim) | `FAIL pointing at the legs lands low: 20/24`<br>`FAIL no round aimed at a body goes into the ground or past it (5)`<br>`FAIL the reticle rings a head lined up, and not a chest (false, los-clear)`<br>`FAIL a runner crossing in front of him at 3-6 m/s, the cursor on it, is hit: hit 3, miss 1, ground 12 (was 7/36)` |
| **`t223`** | `14 pass / 1 fail` | Claude (`CL-147`, fixed in `CL-220`) | `FAIL and no bank rings like one (the most, selectorSemi, at 0.56): selectorSemi 0.56, selectorAuto 0.53` |
| **`t193`** | `17 pass / 1 fail` | Claude (`CL-120`, hillside boot soles) | `FAIL walking on the hill (one way, 9 deg where he ended): no sole sinks into it, nor floats (lowest 0.051 m over 4 looks; -0.022 on the flat)` |
