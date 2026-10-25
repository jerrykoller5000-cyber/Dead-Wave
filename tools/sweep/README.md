# The world sweep's tools (CL-255)

Jerry's placement and transition sweeps (2026-10-24, D-88; `docs/world-design.md`) need two things for every place in
the world: the numbers (what stands where, what floats, what is through what) and the eyes (pictures). These tools give
both. The judging is done by hand, against the sweeps' questions and the 15 rules, in `docs/sweep/<place>.md`.

## 1. The numbers

```
node tools/game-test-slot.mjs run <you> <task> --checks "sweep" -- node tools/sweep/run.mjs tools/sweep/sweep.js --match --out review/sweep/sweep.json
node tools/sweep/report.mjs review/sweep/sweep.json
```

- `run.mjs` loads the game (real three.js; `--soft` for a headless software renderer, as on the cloud box, about 7
  minutes with `--match`), with distance culling off (`?cull=0`) so nothing far away is hidden, and a small module
  ahead of the game's that records who added every object to the scene: each thing in the report names the builder
  function and line that placed it. `--match` starts a hunt first (the match-only props, such as the HQ generator and
  the day missions' pieces, exist only then); `--prep` stops in the prep phase without waiting out the insertion flight.
- `sweep.js` (in the page) splits every placed thing into the objects it is made of (a baked campsite comes apart into
  its tents, logs and fire ring; floors and slabs don't join what stands on them), adds the trees and rocks from their
  records, and checks each one: floating (nothing under it or fixed to it), hanging off a slope, sunk, through another
  thing, branches through something tall, in water, on a trail, a collider with nothing to see, a solid-looking thing
  with no collider, the things he uses (the objective sites, the HQ's hatches, the vault's keypad, Sato's note, the boots)
  walled in, and the trees' spacing (Clark-Evans R per 80 m square).
- `report.mjs` writes `docs/sweep/README.md` (every place and its suspects), `docs/sweep/numbers/<place>.md` (the
  suspects and what stands there, with sizes against the marine) and a camera job per place in `review/sweep/jobs/`.

The checks are deliberately loose: they list suspects. A trail that ends at a camp, a sign fixed to a wall, a canopy over
a low fence are allowed for in the code; anything else listed gets looked at.

## 2. The eyes

Each place's job (`review/sweep/jobs/<place>.json`, `tools/CAMERA.md`) is the approach from four sides at his eye height
(1.7 m), the place from above, the place at night, and a close look at each strong suspect:

```
node tools/camera.mjs job review/sweep/jobs/hq.json --agent <you> --task <id>     # -> review/sweep/hq/sheet.jpg
```

On Jerry's GPU that is a few seconds a place; on the cloud box (`--soft`) 10-40 s a picture.
