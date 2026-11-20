# tools/handfit/ce12: the support hand's wraps round a magazine (CE-12 part 2 (a), Claude 5)

Cloud tools, written for one box; nothing here runs on Jerry's PC or ships in the game. Read a script before using it.

- `fit.mjs` (offline, node): fits an open wrap round a box (a magazine, a drum, the slide) on the canonical RIGHT gloved
  hand (studio/marine-hand.js handPosed with GLOVE_INFLATE). The box is pushed onto the palm along the palm's normal, then
  each finger and the thumb close (from an open pose toward HAND_POSES.fist / a thumb target) until it touches (<= 0.3 mm in).
  Prints the best placements, scored by the worst gap at the palm, the webbing, the thumb and the n-th finger.
  How-to: `node tools/handfit/ce12/fit.mjs '{"w":22,"d":32,"len":120,"th":[0,30,60],"y0":-0.27,"y1":-0.22,"dy":0.01}'`
  (game mm: w across, d front-back, len its length; th turns about the hand's x; y0..y1 the box's middle down the palm).
  `"under":1` fits with the palm under the box's end instead (the seat). `"thumbs":[[...6 thumb values...]]` sets the
  thumb's closed targets (the first one that touches wins); `"fingers":n` how many fingers must touch.
- `pfit.mjs` (on a live game page): the same fit on the game's own third-person left glove (its mesh, its layout space).
  `install(ev)` (ev = page evaluate) puts `window.__pfit(spec)` on the page; spec as above plus `c/up/fwd` (a canonical
  start), `dx/dy/dz` offsets and `th` extra turns about the box's up.
- `pen2.mjs` (on a live page): penetration by hand part (palm, f0..f3, thumb, web) against a gun part's own box
  (mag, slide, frame, pump, ...): `window.__pen2('l')` -> mm, + inside, - clearance.

D-181's bar: a hand passes only with visible contact at the palm, the webbing and the thumb; these give the numbers, the
picture at the game camera decides.
