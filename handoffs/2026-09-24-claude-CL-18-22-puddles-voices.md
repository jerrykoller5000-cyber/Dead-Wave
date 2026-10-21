# Claude · CL-18 puddles, CL-22 the world's voices · 2026-09-24

## CL-18: puddles lie on the ground
- **The cause.** A puddle was a flat disc placed at its centre's height. The slope test let ground through with a 20% gradient, so over a 3 m puddle the downhill half sank under the terrain: Jerry's half circles.
  - Even on ground that passes the new, stricter test, the height across one puddle still varies by up to 7 cm (t66).
- **The fix, in `index.html`:**
  - Each puddle is now its own small disc: a centre and three rings of 24 vertices.
  - It is draped over the ground, every vertex 3.5 cm above the ground under it, with polygon offset against z-fighting.
  - It is re-draped only when its radius has grown more than 4%.
  - The blob shape still turns at random, now in UV.
- **Water only gathers on nearly flat ground now:** slope 0.05, down from 0.09.
- For tests: `TT.getPuddles()`, `TT.drapePuddle` and `TT.weather`.
- Test: **t66** (new), 4/0. It starts rain, then checks that puddles gather, that every vertex sits 2 to 6 cm over the ground, that each is draped at its current size, and that all are on flat ground.

## CL-22: the world's voices
Three new sounds in `core/audio.js`, all synthesized:
- `caveScreech(v, pan)`: a torn, rising shriek over a snarl.
- `caveGroan(v, pan)`: a long, low moan.
- `pitRumble(v, pan)`: sub-bass with bubbles breaking in it.

How they are hooked up in `index.html`:
- **A poke's `cave-guardian` `aggro` (D-25)** screeches from the mouth's direction, at no less than 45% loudness. It is bound through a `dw-game` listener, so Grokbot's poke code is unchanged.
- **Near a cave** (within 38 m), it breathes every 10 to 18 s.
- **Near the pit** (within 75 m), it rumbles softly every 9 to 15 s.
- **When the tentacle grab starts,** the pit rumbles at full strength. This is one line after `makeTentacleRing()` in `beginScriptedKill`.
- Test: **t67** (new), 9/0. It checks the screech on aggro only, the groan near a cave, the soft pit rumble, the full rumble on the grab, and that nothing throws.
- **Not verified:** how it sounds. It's synthesized and tuned by numbers only, so Jerry's ears decide. The finisher's solo still silences all of it.

## Tests
- t34, t36, t59, t60, t61, t64, t65, t66 and t67 pass on my copy.
- t60's proximity and day-fight checks and t34's "thrown in" flake under `--jobs 2`, and pass alone. Timing-sensitive tests are noted for a later clean-up.
