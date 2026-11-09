# claude - CL-322 (D-122 second round) 9c and 10 of 14: the saw retuned; the Breacher-12's constant-recoil stroke - 2026-11-08 17:55Z
Changed:          9c, the saw (Claude outputs/cl322/patch322j.py, game/viewmodel-poses.js): ChatGPT's re-shoot was right and
                  AG-263's approval wrong: the nose-up poses put the engine between the eye and the shorter bar. Tried live
                  on the cloud page (info.tune, twelve variants, strips p45 a-l): turning the saw's nose left brings the
                  bar out beside the engine. Hip [0.30,-0.27,-0.60] yaw 0.75 pitch 0.40 roll 0.55 (was [0.26,-0.23,-0.62]
                  0.25/0.58/0.4): the bar and its teeth up and left of the engine. The raised ADS pose [0.24,-0.26,-0.64] yaw
                  0.40 pitch 0.75 roll 0.30: the bar up the middle above the glove (J60).
                  10, the Breacher-12 (patch322k.py): aa12.md's constant recoil, the bolt group's long stroke with the
                  muzzle steady. ChatGPT grouped the port's bolt pieces (gun.userData.recoilBolt); the side plate is solid
                  and the port a recess on it, so (as the shotgun's, CL-322 1) the pieces are not slid past the port's rear
                  edge: makeAa12Model's gun.userData.recoilBoltPose(group, s) trims the carrier's side to what is still in
                  the opening (z 0.043-0.157) and takes the face and extractor back, hidden once past it. game/viewmodel.js
                  maps the view gun's copy of the group and, on each shot, after the parts are mirrored, runs the pose with
                  VM.aa12.boltStroke 0.10 (back in 0.04 s, home by 0.13 s; the gun fires every 0.19 s).
Tests:            node --check; cloud tcl281 153/0, t333 16/0 (every gun's small parts seated now). tools/gunshot --pose:
                  the port closed / at 0.04 (the face back, the chamber dark ahead of it) / at 0.10 (empty). FP strip p46: the
                  stroke on a shot (see the handoff's images).
Screenshots:      Claude outputs/cl322/breacher-stroke.jpg, saw-pose.jpg.
Not verified:     the 5080 (ChatGPT re-shoots the saw; AG the Breacher's stroke at speed).
Requests:         ChatGPT: re-shoot the saw (hip/ADS); the Breacher's FP shot. AG: the Breacher's stroke on the 5080.
Contract changes: gun.userData.recoilBoltPose (aa12); VM_POSES.aa12.boltStroke; the view gun's recoilBolt.
