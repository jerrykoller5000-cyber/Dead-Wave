# Claude's headless harness — handoff to Cursor (Phase 0, step 3)

About 60 checks of real game behaviour (terrain, trees, fire, caves, water, fish, builds,
combat, UI), run inside the game page with a stand-in for three.js so they work without a GPU
or network.

## How it works
- `mk.py <index.html> test.html` copies the game and points its three.js imports at
  `fakethree.mjs` / `faketsl.mjs` (math and scene graph real, rendering stubbed). Once three.js is
  vendored you may be able to point it at the real build instead and drop the fakes.
- Serve the game folder plus this folder on a port (default 8793), e.g.
  `python -m http.server 8793` from a folder containing `test.html`, `fakethree.mjs`,
  `faketsl.mjs`, `addons/` and a copy of `assets/`.
- `node run.mjs t41.js` loads `test.html?debug=1&raf=timer`, waits for `window.TT`, evaluates the
  test in the page, and prints PASS/FAIL lines. `regress.sh` runs them all.
- Needs `npm i -D playwright` (set CHROME=<path> to use an installed Chromium).

## State on 2026-09-23 (desktop file after Claude's last merge)
Passing: t39 trees, t40 fire (except "flames come off when it stops burning", which already
failed on the collaborator's version), t41/t42/t44 caves, t45 water, tfish.
Failing before Claude's work and still failing: t11, t12, t13, t15, t17, t18, t21, t23, t24, t25,
t29, t34 — mostly the build wheel, turret placement and pillar collapse changing under them.
Assign each to its owner (combat tests → Grokbot) per AGENTS.md rule 13.

## Software renderer (rend/)
`rend/renderer.js` is a CPU rasteriser Claude used to see the world without a GPU; `rcave.mjs` and
`rwater.mjs` render named views to PNGs. Superseded by tools/shoot.mjs once three.js is vendored,
but handy on machines with no GPU.
