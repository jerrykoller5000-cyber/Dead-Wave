# Cursor — npm test (Phase 0, step 3) — 2026-09-23

Changed:          Claude's headless harness is wired in behind one command. `npm test` runs
                  all 47 checks against a copy of the real game in about 4.5 minutes, four
                  pages at a time, with nothing to install.
Files:            `package.json` (new), `tools/tests/run-all.mjs` (new),
                  `tools/tests/*` (Claude's harness, as handed over)
Tests:            npm test → 47 checks: **215 pass, 58 fail** across 12 files, 9 could not
                  run, 15 are probes that report no assertions. Nothing deleted or weakened.
Screenshots:      n/a.
Not verified:     The 9 that cannot run: I have not worked out whether each is a stale test
                  or a real bug, which is their owners' call (AGENTS.md rule 13). `t19` hangs
                  long enough to hit a two-minute evaluate timeout rather than failing.
Requests:         Assignments added to `handoffs/requests.md`: the 12 failing files and the 5
                  combat errors to Grokbot, t40's one failure to Claude, and t19/t35/t36/t37
                  for triage.
Contract changes: none.

## How to run it

```
npm test                  every check
npm test -- t39 t45       just those
npm test -- --jobs 1      one at a time, easier to read when something breaks
npm test -- --keep        leaves tools/tests/test.html on disk to open in a browser
```

## How it works

Each `tNN.js` is an async expression evaluated inside a loaded copy of the game, asserting
against `window.TT`. `run-all.mjs` generates that copy (`test.html`) by rewriting only the
**import map** to Claude's `fakethree.mjs` / `faketsl.mjs` — real maths and scene graph,
stubbed rendering — so a check costs a couple of seconds instead of the minute a real world
build takes, and needs no GPU. That generation replaces `mk.py`, so the suite needs only node;
`mk.py` and `regress.sh` are left in place.

Every check gets a fresh page. They fell trees, spawn waves and kill the player, so sharing one
page would poison later checks.

Three outcomes are distinguished, which matters for reading the report honestly:

- **fail** — the check ran and asserted FAIL. A real signal.
- **could not run** — it threw, timed out, or `window.TT` never appeared.
- **no assertions** — it returned a state dump rather than PASS/FAIL lines. Fifteen of the 47
  are diagnostics of this kind (`t0` returns `{"tt":true,"keys":365}`, `t27` prints
  "EMPTY WORLD visible meshes: 2899"). My first version called these broken, which made the
  suite look far worse than it is; they now print what they returned.

`npm test` exits non-zero only when a check *could not run*. Known failures are assigned to
owners and would otherwise make the suite useless as a signal for the other three agents. When
Grokbot clears its twelve, this should tighten to "fail also exits non-zero".

## Current state, by owner

| Owner | Files | Note |
| --- | --- | --- |
| Grokbot | t11 t12 t13 t15 t17 t18 t21 t23 t24 t25 t29 t34 | 58 failures. Exactly the set Claude listed: placement, the build wheel, pillars, turrets, mines, blueprints, prep. |
| Grokbot | t5 t6 t7 t9 t10 | Throw on a null zombie/mesh — they start a match with `#modeHunt` and then assume something is spawned. |
| Claude | t40 | 4 pass, 1 fail: "flames come off when it stops burning". Claude notes this already failed before its work. |
| triage | t19 t35 t36 t37 | t19 hangs; the other three throw on an undefined object. |
| passing | t31 t33 t38 t39 t41 t42 t44 t45 tfish | 95 passes between them: caves, water, fish, trees, fire. |
