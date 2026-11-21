# tools/placement-audit — Training Ground placement audit (CF-19, Claude 6)

Finds placement defects in the Training Ground **as the game builds it**, with no GPU:

1. intersections: two different things cutting into each other (lamps into posts, rails through ducts, props through walls)
2. floating / sunk: a thing touching nothing (gap > 1 cm); a base under the floor (> 1 cm)
3. barrier gaps: stretches of a fence or wall run (the game's own collision runs in `tg.solids`) with no geometry in them
4. lights inside geometry: a light inside a closed mesh, or within 1 cm of a surface
5. scale: named things (dummy, stretcher, lockers, doors, terminals ...) against real sizes and the 1.80 m player

Every finding names the **source line that built each part** (file:line, from the call stack when the mesh was added),
its owner, its place (metres from the room origin) and a picture. The same defect repeated is one finding with a count.
Review only: it changes no game file.

## Run

Two steps. The first runs the game page, so it goes through the game-test slot:

```
node crew/crew.mjs slot run <you> <task> --checks placement-audit -- node tools/placement-audit/run.mjs review/CF-19/run
python3 -E tools/placement-audit/audit.py review/CF-19/run review/CF-19
```

(Cloud: `node tools/game-test-slot.mjs run <you> <task> -- node tools/placement-audit/run.mjs review/CF-19/run`,
with `CHROME=/usr/bin/google-chrome CHROME_ARGS='--no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader'`.)

Python needs `numpy scipy trimesh rtree matplotlib` (`pip install --user ...`). `CF19_CROPS=60` makes more pictures.
`run.mjs --bake` keeps the game's static baking (parts then lose their own source lines; only for comparing).

## Files

- `run.mjs` — builds a copy of the test page (`tools/tests/fakethree.mjs`, like `npm test`), maps `/world/bake.js` to
  `no-bake.js` through the import map (every part keeps its own mesh), adds a hook that stores the call stack of the first
  `Object3D.add` of each object, opens the page, runs `dump.js`, writes `scene.json` + `tris.f32`. The page file is
  deleted at the end. Line numbers are kept equal to `index.html`'s.
- `dump.js` — inside the page: enters Training (`TT.trainingDbg.start()`), waits for the late props, lights on, first
  person (ceiling shown), then stores every visible mesh near the room (world triangles), every light, the plan
  (`TRAINING`, walk rects, stations, the solids with their flags) and the player.
- `no-bake.js` — `bakeStatic` / `foldStatic` that do nothing (audit only).
- `audit.py` — the checks, `placement-audit.json`, `REPORT.md`, `crops/NN-*.png` and `crops/00-map.png`.

## How it decides

- A **thing**: in the room builders (any builder function that also makes walls or floors: `buildTrainingGround`,
  `dressTrainingProps`, `dressTrainingWear` ...) each source line is its own thing. Any other builder function (the dummy,
  the console, the containment guns, the fence) is one model, split into copies by where they stand. Joins inside one
  model are not reported.
- **Intersection depth**: points sampled on one mesh that are inside the other closed mesh; depth = the deepest point's
  distance to the surface; "long inside" = the size of the inside part. Listed at >= 5 mm deep, or >= 2 mm over >= 5 cm.
  Lower rank: a flat wall plane hidden inside a solid trim, a flat decal or an open wire mesh through a post, inner
  panels of one model (same comment block). Higher rank: anything that glows (lamp strips, lenses), different builders.
- **Barrier gaps**: along each fence/wall collision run, at 0.5–2.0 m up, the parts of the run that no geometry covers
  (a closed post or column covers its inside). The zombie gate and the doorway are recognised as meant openings.
- **Floating**: things (touching meshes from one file) that come no closer than 1 cm to anything else.

## Limits

- The test three.js builds the game's own shapes and places, but the pictures are 3D plots, not renders. Ask the GPU
  agents for native shots at the listed places when the look matters.
- Moving parts are measured where they stand when the room opens.
- Two open planes crossing each other are not measured (no inside).

## Scale sheet (CF-20)

`python3 -E tools/placement-audit/scale.py <run-dir> <out-dir>` (e.g. `review/CF-19/run review/CF-20`): every Training prop measured against real sizes and a 1.80 m man; writes `REPORT.md`, `scale-audit.json` and `crops/00-lineup.png` + one picture per finding. Uses audit.py's loader; the findings and real sizes are listed in the script.

## Re-runs after lines move (CG-1)

`scale.py` picks its parts by the CF-20 files' line numbers. After a Training file has changed, make a line map and pass it:
`python3 -E tools/placement-audit/linemap.py <base-tree> <new-tree> > map.json`, then
`SCALE_LINEMAP=map.json python3 -E tools/placement-audit/scale.py <run-dir> <out-dir>`. `audit.py` needs no map.
Compare two audits by place and line-moved source, not by rank: ranks shift when anything changes (review/CF-19-cg1/).
