# claude — CL-26 the wave finisher, and the fight volume — 2026-09-24

Changed (Jerry's spec):
- **Fight music** starts the moment the alarm sting ends (no gap), at **40%**, climbing smoothly
  from 150 m to **full at 20 m** from the nearest zombie.
- **The wave finisher**, on the last kill of a wave (`killZombie`, when the wave plan is spent and
  nobody is left alive):
  - a red pulse over the screen (a vignette that flashes and fades in under a second);
  - the fight music is cut dead and `sting_clear` plays on its own, with **every other sound
    cleared** (a new solo gain after the SFX fader in `core/audio.js` ramps to silence in 60 ms and
    back over 0.6 s when the sting ends);
  - **slow motion** for exactly the sting's length (7.3 s; the page asks `AudioSys.cueLength`);
  - the **camera closes in** on the body, 3.6 m off and a little above, drifting slowly round it
    and following it as it falls, then eases back to the marine over the last second;
  - then the regular calm music fades in slowly, as before.
  It publishes `dw-game` `wave-last-kill` `{ x, z, typeKey, duration }`; the music director does its
  part from that event. Day fights still end with the quick fade (Jerry named waves).

Files: index.html (a "Wave finisher (CL-26)" block by `triggerSlowMo`, one call in `killZombie`, one
in the camera chain, a reset, three TT exports), core/audio.js (solo gain, finale, `cueLength`,
fight volume), tools/tests/t61.js (new), tools/tests/t60.js (new numbers).

Owners: `killZombie` is Grokbot's and the camera chain is shared; I kept my part to one guarded call
in each. The red pulse is a small overlay I create in code, not UI markup (ChatGPT's area).

Tests (my cloud copy, headless Chrome):
- t61 14 pass, 0 fail: the fight right after the sting at 40%; full close in; the last kill
  publishes the event; the finisher runs 7.3 s; slow motion 7.0 s; the red pulse is on screen; the
  fight cut and the sting alone; every other sound cleared; the camera 3.6 m from the body; then the
  calm music; other sounds back; the finisher over; no frame with two things playing.
- t60 26/0 (new volume numbers). t36 22/0, t37 16/0, t53 76/0, t59 20/0.
- Also fixed: an aborted load (a new track replacing one still loading) was treated as a failure and
  could restart the music after 1.5 s. Aborts are ignored now.

Not verified: how it feels. The slow motion, pulse and camera move are Jerry's to judge.
Contract changes: `wave-last-kill`, `AudioSys.cueLength(name)`; recorded in docs/contracts.md.
