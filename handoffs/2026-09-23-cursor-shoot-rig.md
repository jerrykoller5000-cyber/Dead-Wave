# Cursor — tools/shoot.mjs (Phase 0, step 2) — 2026-09-23

Changed:          Added a screenshot rig: `node tools/shoot.mjs` serves the folder, opens the
                  game headless, parks the camera on each named view and writes 1280x720
                  PNGs. 25 views, all of Claude's list. Built on a dependency-free CDP
                  driver, so it works on a clean clone with nothing to install.
Files:            `tools/shoot.mjs`, `tools/cdp.mjs`, `tools/serve.mjs`,
                  `index.html` (shot-view hook + three debug exports)
Tests:            npm test → not wired yet (step 3).
Screenshots:      `Claude outputs/shots/pre-split/*.png` — all 25 views, the baseline for
                  comparing the module split against. (That folder is gitignored, so the
                  baseline is on Jerry's disk, not in the repo.)
Not verified:     `pit` comes out as open water: the hole is not legible from above any more.
                  See the request to Claude below. Everything else reads correctly.
Requests:         Claude — what view shows the Underwater Pit now? From 26 m up and 21 m out
                  over `TT.LAKE_HOLE` the surface reads as plain lake; the lip, the dark
                  mouth and the rune ring are all invisible. Is it meant to be visible from
                  above after the water rework, or should this view be from under the
                  surface?
Contract changes: none. Three new debug-only exports on `window.TT` (`setShotView`,
                  `setWorldTime`, `shotHQ`), which only exist under `?debug=1`.

## How it works

- `tools/cdp.mjs` drives Chrome over the DevTools Protocol using Node's built-in WebSocket:
  launch, navigate, evaluate, screenshot, and collecting page errors and console lines. That
  is the whole surface the two tools need. Playwright would have meant a package plus a
  browser download for about eight calls; every dev box here already has Chrome. Set
  `CHROME=<path>` to use a different binary.
- `tools/serve.mjs` is a static server on a random port. The game is native ES modules, so it
  has to be served, not opened from disk.
- Shots are taken **from the title screen**, not from a match. The whole world is built before
  the title appears, so every view is reachable, and it keeps a run deterministic and quick —
  no insertion cine, no wave timers, no drifting clock.
- The camera is parked through `TT.setShotView()`. Every camera in the game writes the same
  object (play rig, menu orbit, death cines, scripted kills) and the last writer before the
  draw wins, so `applyShotView()` runs immediately before `renderFrame()` and overrides them
  all. It is null unless a tool sets it.
- The UI is hidden for each shot by walking up from the largest canvas and hiding every other
  child of `<body>`. Nothing here reaches into anyone's element ids or `ui/*`.
- Headless Chrome has no WebGPU adapter, so the rig runs the WebGL2 fallback
  (`?renderer=webgl`) with SwiftShader, and `?raf=timer` so the loop keeps running unfocused.

## Gotchas worth keeping

- `?debug=1` is required: `window.TT` only exists when the perf overlay is on.
- The opening sequence covers the canvas. The rig clicks `#openingSkip` twice and then waits
  for `window.DWOpening.active === false`, which is the only honest "the canvas is visible"
  signal. Matching on the word PLAY in the page text does not work — the opening's own button
  says "PLAY INTRO WITH SOUND", and the first version of this tool photographed that.
- A view that looks straight down is degenerate: `lookAt()` along the up vector points the
  camera at the sky. Keep some horizontal offset.

## Not fast

A full 25-view run takes about 15 minutes on Jerry's PC: ~60-85 s to build the world, then
~30 s a shot. The per-shot cost is SwiftShader drawing the whole world for the grab. It is
fine for a before-and-after pass but too slow to sit in a tight loop; pass view names to shoot
only what changed. Worth revisiting if it gets in the way.
