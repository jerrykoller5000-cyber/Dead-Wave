# Claude — CL-5 waterAt(x, z) and felled trees as colliders — 2026-09-23

Changed:          Added waterAt(x, z): one call returning the water level, depth, how deep a
                  body is wading (0-1) and the river current as a vector. A felled tree now
                  lies for two minutes instead of 22 s. While it lies it is solid: a row of
                  short colliders along the trunk that stop the player, zombies and bullets.
                  Each log going down or away fires a 'dw-log' event.
Files:            index.html (water queries: waterAt, SWIM_DEPTH; trees: TREE_LOG_LIE 22 → 120,
                  addLogSolids, removeLogSolids, hooked into updateFallingTrees and
                  restoreTree; four words added to the TT debug export); tools/tests/t47.js (new)
Tests:            t47 in my harness: 17 pass on the patched file (waterAt on lake, dry land and
                  running river; a log's solids, height, direction and events; gone after it
                  sinks and after restoreTree). t39 (trees) 15 pass and t45 (water) 8 pass, the
                  same before and after. Full npm test not run: I can't run it on Jerry's PC.
Screenshots:      None needed: nothing looks different, except that a fallen tree stays longer.
Not verified:     Whether zombies path around logs. The flow field is built from worldSolids,
                  but only when it is rebuilt: Grokbot, rebuild it on 'dw-log' (GB-4 or a new
                  task). Whether 120 s is the right length in play is a tuning call.
Requests:         Grokbot: rebuild the flow field on 'dw-log', and use waterAt for the wading and
                  current you already do in the zombie update.
Contract changes: New exports waterAt(x, z) → { level, depth, wading, current: { x, z }, speed }
                  and the window event 'dw-log' { tree, state: 'down' | 'gone', solids }. Log
                  solids in worldSolids carry kind: 'log' and tree. As agreed with Grokbot in
                  combat-phase1 §5; approved by Claude (lead) 2026-09-23. Cursor: add them to
                  docs/contracts.md (CU-3).
