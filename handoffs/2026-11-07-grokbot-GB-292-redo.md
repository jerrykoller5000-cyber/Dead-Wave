# grokbot - GB-292 redo Chainsaw FP hands (Claude 04:14Z review) - 2026-11-07

Changed:          game/viewmodel-poses.js only (LF, no BOM). Exact-line edits vs
                  qa/2026-11-07-GB-292-redo/viewmodel-poses.before.js (the first GB-292 land):
                  1) VM_POSES.chainsaw.hip (line 141):
                     before: at [0.26, -0.18, -0.52], yaw 0.40, pitch 0.18, roll 0.22
                     after:  at [0.26, -0.23, -0.62], yaw 0.25, pitch 0.45, roll 0.4
                  2) VM_SOCKETS.chainsaw gripBasis / supportBasis (lines 333-338):
                     before: gripBasis { x:[0,-1,0], y:[0,0.12,-1] },
                             supportBasis { x:[-1,0,0], y:[0,-0.28,-0.96] }
                     after:  gripBasis { x:[0,-1,0], y:[0.5,-0.1,-0.85] },
                             supportBasis { x:[-0.4,0.2,0.7], y:[-0.85,-0.3,-0.4] }
                     (grip/support contact points and supportPose fist unchanged;
                      three comment lines added above the chainsaw socket explaining the redo.)

Diagnosis:        Claude 04:14Z sent the first GB-292 back: after-fp-hip showed one huge camo
                  forearm filling the lower-right quarter, the saw small off left, no hand on
                  either handle. Root cause: elbowFollow runs each forearm along its hand y,
                  kept square to the channel x; with supportBasis x along the hoop the left
                  forearm could only run back, so it crossed down-right over the rear hand.

What fixed:       Left channel now crosses the bar on a diagonal so both forearms run out to
                  the bottom corners; gripBasis y tilted so the rear throttle hand stays in
                  view; hip lowered/pitched so the bar shows above the left forearm and the
                  saw stays <= about a quarter of the screen (J1 / docs/fps/feel.md).

Files:            game/viewmodel-poses.js
                  qa/2026-11-07-GB-292-redo/ (backup .before.js, edit.cjs, tune.mjs, round1-5,
                  after/, realtest.log, before/after 1280 + crops, before-after-fp-hip.png,
                  tp-side-3m.png / tp-side-3m-other.png)

Screenshots:      before-fp-hip-1280.png / before-fp-ads-1280.png / before-crop-hands.png
                  after-fp-hip-1280.png / after-fp-ads-1280.png / after-crop-hands.png
                  before-after-fp-hip.png
                  tp-side-3m.png / tp-side-3m-other.png (3P side profile at ~3 m)
                  Visual check this session: after hip+ADS both show gloved hands on the rear
                  throttle and the front hoop, forearms from the bottom corners, saw well under
                  a quarter of the frame; 3P side confirms both hands on the handles.

Tests:            node --check game/viewmodel-poses.js ok; LF, no BOM.
                  Real renderer through the slot (qa/2026-11-07-GB-292-redo/realtest.log):
                  t228 95/0 + tcl281 151/0; suite line: 2 checks: 246 pass, 0 fail.
                  No test bar moved.

Not verified:     Play feel by a person. Antigravity still owes a fresh chainsaw review set
                  after this redo (Claude struck the AG-252 chainsaw OK on the pre-redo frames).

Contract changes: none
Requests:         none
