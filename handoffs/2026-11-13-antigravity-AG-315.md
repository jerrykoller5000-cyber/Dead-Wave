# AG-315: CB-327 camera near walls and CB-328 chainsaw on the dummy, third person (Antigravity, Claude Sonnet 5.5)

Verdict: CB-327 answered with caveats (marine whole at every spot, walls hard to judge in the dark); CB-328 inconclusive (framing too far to see the bar), but it shows a heavy frame-rate drop during the cut.

## CB-327 (review/CB-327/sheet-cb327.jpg, full frames spot{A,B,C,D}-lights-{on,off}.png; tree with CB-327 in game/training-camera-collision.js)
- Spots set as asked (A range back wall, B build room west wall then rotateCamera(PI), C shared wall then rotateCamera(-PI/2), D past the firing line). 2.5 s settle, lights toggled with TT.trainingDbg.toggleLights().
- The marine is whole in all 8 frames, a small figure seen from high above (the eye is far out, not in his head): A centre by the back wall, B mid-frame by the hazard stripe, C left of the range fence, D near the firing line.
- The room is very dark on and off; the lights-on frames are only slightly brighter, so whether the near wall is faded or see-through cannot be judged from these (B shows the west edge hazard stripe, C the hazard floor and fence; nothing solid between the eye and the marine in any frame).
- Not checked: flicker while the camera holds (single frame per state).
- Overlay at capture: fps 29-47, worst frames 38-71 ms, and 314 ms at spot C lights off.

## CB-328 (review/CB-328/sheet-cb328.jpg, saw-front-lights-{on,off}.png)
- Stood at the requested spot (x -5.95, z -2.1), chainsaw in hand, aim yaw -PI/2, trigger held 1.8 s via setMouseFireDbg. The camera sits high and far, so marine and dummy are tiny at the firing line: the bar level at his waist/chest and his hands on the handles cannot be read. Sparks are visible at the contact. No close or side view was taken.
- Performance during the cut: fps 12, low 1, worst 755 ms, hitch 51 (lights on); fps 20, worst 73 ms (lights off). Gas and heat HUD update (58 s, heat 10%). Worth a look by whoever owns the chainsaw cut effects.

## Changed:
Nothing in the game. New qa/2026-11-13-AG-315/shots.mjs; images and sheets in review/CB-327/ and review/CB-328/.

## Tests:
None run (look only).

## Not verified:
Wall fade/see-through, camera flicker, saw bar level and hands (needs a closer framing with the lights up or a lower camera).
