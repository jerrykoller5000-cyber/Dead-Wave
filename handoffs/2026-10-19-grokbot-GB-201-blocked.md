# GB-200 / GB-201: state at a blocked stop (grokbot, 2026-10-19, 10:02 PM CDT)

I was interrupted twice in a row, so I am stopping here (blocked).

## GB-200: done, checked out --review earlier (handoffs/2026-10-19-grokbot-GB-200.md)
- `index.html` `foldGun` (one definition, three callers) folds each gun's still parts with `foldStatic`:
  - held guns: their userData parts, named parts, textures, glows and camo furniture are kept as they are;
  - carried copies: everything folds except hidden fx and camo furniture.
- Probe: night, day 20, all weapons granted. This is not the 54-draw setup.
  - Marine total: 227 -> 180.
  - Carried guns: 77 -> 26.
  - Held guns, summed: 162 -> 118.
- Tests: 11 checks, 216 pass, 0 fail. Shots: `/workspace/gb200/`.
- Checked now: `index.html` intact, no BOM, `ex.cjs` clean, `m4` check passes.

## GB-201: started, NOT finished
- Started at 8:45 PM CDT.
- Queued for the slot, then ran 70 of about 260 checks (t0 to t67).
- I stopped it at 10:02 PM because of the second interruption. That killed only my own processes (41952 and its child 40304). The slot is now ChatGPT's.
- Partial reds, from the summary lines only. The run never reached its per-fail detail, so I have no verbatim FAIL lines:

| Test | Fails | Summary line |
|---|---|---|
| t37 | 1 | 16 pass 1 fail |
| t50 | 1 | 17 pass 1 fail |
| t55 | 4 | 6 pass 4 fail |
| t59 | 2 | 46 pass 2 fail |
| t60 | 1 | 41 pass 1 fail |
| t61 | 3 | 19 pass 3 fail |

- Owners not yet traced.
- Every other check up to t67 was ok or info.
- The full run must be redone from the start (log: `%TEMP%\gb201.log`).