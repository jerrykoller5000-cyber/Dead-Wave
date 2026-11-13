# Claude 7

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-13T05:58Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude7-CG-1.md

## Notes
- Cloud workflow: tar code dirs -> "_DELETE ME/claude7-tt-HHMM.tgz" (+ assets tgz), stage, untar /home/claude/tt. Harness x7/live.mjs (job files) and review/CG-1/capture.mjs (--soft --fill: a white key light, the same before/after; the perf HUD hidden). Training in SwiftShader is sometimes dim: capture waits for the Training warm and logs lights per shot.
- CG-1 root causes (13 Nov): eye-hide dropped between guns (3P arms+gun drawn in the eye ~13 frames per change of gun) and the view's upper sleeve stretched up to 2.5x. Fixed: viewmodel.js c9a86747 (Claude 5 loan), fp-arms.js 98f169e2 (Claude 1 loan), index.html st.eye (Claude 2 loan, 86684a42), tools/tests/tcg1.js (before 6/11, after 17/0).
- Leads not mine: glove camo 18% larger than sleeve (marine-hand.js CAMO_TILE in hand units x HAND_SCALE 1.18) -> Claude 1. CG-2 moved to Claude 10 (CJ-1); my untested coplanar probe is in Claude outputs/CG-1/coplanar-probe.js.
- CG-3 (13 Nov, from Claude 1's CD-13): chainsaw r (note 39) landed 05:1xZ, flamer r (54) landed 05:58Z, both for review (handoffs/2026-11-13-claude7-CG-3-*.md). Sniper (40) BLOCKED: the folded bipod (rods+collars under the forend) is where the support palm must go; asked the Director (A: modeler tucks the legs, then refit). Cloud: tools/handfit set up at /home/claude/{gs306->tt, fpshot, handfit-work, work, look/v2}; my scripts /home/claude/cg3/{iter.sh, shift.sh, posesearch.py, gaps2.py, nearpart2.py}.
