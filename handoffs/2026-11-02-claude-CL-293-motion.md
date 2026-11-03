# claude — CL-293 round 1, part 1: the motion (J55) — 2026-11-02
Changed:          The view gun's bob rides his stride; a sprint pose; the turn's sway on a low-passed turn rate; springs nearer critical; a third more sway.
Files:            game/viewmodel.js (gunFrame's motion block), game/viewmodel-poses.js (VM's globals: spring, sway, bob, sprint), index.html (updateViewmodel: st.phase, st.run, st.sprint), tools/tests/tcl293.js (new)
Tests:            tcl293 15/0 on the cloud (the view gun stepped by hand at 60 fps, so the cloud's frame rate doesn't matter); stage 1's motion on the same test: 10/5 (the five are the vibration and the missing sprint). tcl281 134/0 on the cloud after the change.
Screenshots:      none of mine; AG-202 is the round-0 sheet, the round-1 sheet follows
Not verified:     On Jerry's seat. AG-202 shoots walk, run and the flick again after this lands (fps-pass.md: round 1's sheet). The hands (J54) are part 2.
Requests:         AG-202 again for round 1 (Antigravity); ChatGPT knows the files are shared by section.
Contract changes: viewmodel.update's state takes phase (his walkPhase), run (POSE.gaitRun) and sprint; all optional (it keeps its own cycle at his legs' cadence without them).

## What Jerry saw: the vibration
The bob ran on its own clock at speed x 1.85 a metre. tcl293's numbers, stage 1 against now:

| | before: across | before: up/down | now: across | now: up/down |
|---|---|---|---|---|
| walk (7.4 m/s) | 1.2 cm at 6.83 Hz, 99.9 % above 6 Hz | 1.1 cm at 13.67 Hz | 2.3 cm at 1.50 Hz, 0.0 % above 6 Hz | 0.95 cm at 3.00 Hz |
| sprint (11.8 m/s) | 1.2 cm at 10.83 Hz | 1.1 cm at 21.83 Hz | 3.9 cm at 2.17 Hz | 1.5 cm at 4.50 Hz |

Now it is on his stride (index.html's walkPhase, the cycle his legs and his eye ride): across and a roll once a stride, down once a step, a little yaw for the figure eight, walk to run by POSE.gaitRun. AG-202 saw the same thing on his RTX: an 11-17 Hz buzz, 8-10 px high-pass on the pistol.

## The rest of the motion
- **Sprint pose (new):** down 4.5 cm, 3 cm toward the middle, 2 cm back, turned in 0.32 rad, muzzle down 0.24, rolled in 0.22; in over 0.18 s, out over 0.14; not down the sights; 40 % during a reload.
- **Sway:** the turn rate low-passed (tau 45 ms; MU-31's second suspect) before it moves the gun; look 0.022 to 0.03 per rad/s (max 0.07 to 0.09), strafe 0.012 to 0.018 (max 0.03 to 0.04). A 4 rad/s turn for 0.25 s: the gun lags 4.9 degrees and is home 0.30 s after the stop, no overshoot.
- **Springs:** z 0.78/0.74 to 0.86/0.84 (MU-31's first suspect: the ring after each shot stacked at automatic rates).

## Next (part 2, the hands)
AG-202's sheet: the pistol's support hand under the trigger guard instead of on the grip's side, the wrists meeting as one dark blob, elbow stumps in the walk, and on the long guns a left forearm too short (0.26 m) that ends in mid-air. studio/fp-arms.js and the support poses are mine; the flamer, minigun, chainsaw and launcher have no view gun yet (stage 4, ChatGPT's GP-20016), and the flamer's 12.5 Hz camera shake (5.2 cm RMS) is the world camera's: J59 with stage 4.
