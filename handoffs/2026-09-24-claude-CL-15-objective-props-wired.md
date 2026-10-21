# claude — CL-15 The objective props, wired — 2026-09-24
Changed:          The world now builds the seven objective props at load, on their CL-6 sites,
                  with the landmarks' material (poiMat), and clears ground cover within 1.3 m of
                  each so tall grass never hides a case. `TT.getObjectiveProps()` hands them to
                  the objectives. The objective contract is in docs/contracts.md ("Objective
                  props and sites"): ids, centre, approach, facing, states, setState, stateFor,
                  and how ChatGPT's GP-9 snapshot takes position and reachability from them.
Files:            index.html (world: one script tag; one block after buildBoundaryWall(); one TT
                  export), tools/tests/t52.js (now checks the wired props), docs/contracts.md
Tests:            t52: 17 pass (new: built at load, in the scene, colliders on the radio and fuel
                  stand only, no ground cover within 1.3 m). Full suite, jobs 2, on my cloud copy
                  before merging: 55 checks, 633 pass, 6 fail. The six are t24 (1), t34 (2),
                  t35 (2), t37 (1). Without my change on the same machine t34 and t35 fail too;
                  t24 and t37 passed on both of two reruns with it. Load-sensitive flakes here.
                  After merging onto Cursor's loader slice and Grokbot's GB-14: t52, t50, t45,
                  t41, t47 all pass.
Screenshots:      none new in the world. The props themselves: Claude outputs/shots/cl12/.
Not verified:     - How they read at their sites by day and night on a real GPU (Antigravity: the
                    GP-8 route walk).
                  - Interaction: nothing uses them yet. GP-11 (ChatGPT) drives setState;
                    reachability of each approach point is Cursor's.
Requests:         ChatGPT: GP-11 is unblocked; the contract is in docs/contracts.md.
Contract changes: new "Objective props and sites" section in docs/contracts.md (Claude, approved).
