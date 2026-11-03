# claude — CL-293 round 1: the camera's share of a shot — 2026-11-03
Changed:          In first person a shot now turns the drawn view up a little and springs it home (the pass's Fire line:
                  "a kick back and up, a spring home in 0.12-0.3 s by class; the camera's share small and never a shake in
                  first person"). Before, the view didn't move at all on a shot (only the view gun kicked), and addShake
                  only came from impacts. The share is 7 % of each gun's own up-kick (VM_POSES[gun].kick.up, by its ADS
                  multiplier), half its side-kick across, as a spring kicked from rest: the pistol 0.44 deg at 50 ms, home
                  by 0.35 s; the shotgun ~0.75 deg, the sniper ~0.95 deg; a full-auto string holds a small climb (capped
                  0.03 rad) and lets it go. Less through a scope (x0.4 at full scope).
                  The turn is put on the camera just before the draw and taken off just after (index.html fpPunchApply /
                  fpPunchUndo around renderFrame), so nothing that aims, casts or places reads it: shots go where the
                  crosshair was. The view gun turns with the view, as it's drawn on the camera.
Files:            game/viewmodel.js (cs spring, the kick, cameraPunch()), game/viewmodel-poses.js (VM.camera only: the
                  top-level tuning; VM_POSES untouched), index.html (fpPunchApply/fpPunchUndo before updateViewmodel; the
                  renderFrame call), tools/tests/tcl293.js (+5 checks). Patch scripts: Claude outputs/cl296/patch293*.py.
Tests:            Cloud: tcl293 22/0 (one shot 0.44 deg at 50 ms, home by 0.35 s; the aiming camera untouched between draws
                  and after real frames; eight shots at 10/s hold a climb under the cap and let go), tcl281 140/0.
                  t291 threw on the cloud's test page before reaching its checks (its dynamic import of
                  ./game/sight-points.js resolves against tools/tests/: it needs the real page, realtest.mjs).
Screenshots:      none: 0.4-1 deg reads in motion, not in a still. AG's next burst strips show it.
Not verified:     his way. In AG's next round: the burst strips should show the view's climb and return, no shake.
Requests:         none.
Contract changes: viewmodel.cameraPunch(out) -> { p, y } radians; VM.camera { share, side, k, z, max }.
