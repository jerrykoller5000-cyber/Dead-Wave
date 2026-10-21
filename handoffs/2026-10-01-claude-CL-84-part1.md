# claude — CL-84 The marine's own animation (part 1: walk and run) — 2026-10-01
Changed:          The marine has a walk and a run as studio clips, made from the reference library's walk and jog at his size (his legs are much shorter than the mannequin's): legs, hips, chest and head. His arms are left to the gun, as in the game. They're in review folders for Jerry and are not in the game yet: they go in once he says "good". The reload is still to come (it needs his rifle in the studio, which the stand-in doesn't have yet), so CL-84 stays open.
Files:            studio/retarget-ual.mjs (new: bakes them; per-clip chest swing and lean), studio/clips/marine/walk.json, run.json (new), docs/studio.md (§4: the marine's walk and run), review/marine-walk/, review/marine-run/ (v1, the reference beside him).
Tests:            studio unit tests 59/0 (every clip on disk loads and plays). Worst one-frame joint turn: walk 0.10 rad, run 0.33 rad (kneeL at 0.52 s: just over the 0.3 snap line; a jog's knee moves fast). No foot slide.
Screenshots:      review/marine-walk/v1, review/marine-run/v1 (strip and video).
Not verified:     In the game (not wired); on Jerry's GPU.
Requests:         none.
Contract changes: none.
