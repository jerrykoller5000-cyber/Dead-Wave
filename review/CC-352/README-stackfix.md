# CC-352 follow-up (claude3): the gun stacks rest on triangles; thigh revolvers 4 mm out. NOT LANDED (for the Director's review)

Patches (exact text, CRLF kept; on top of the landed CC-352: index cb847a2e, marine-carry ca2e9012):
`python3 review/CC-352/apply.py index.html review/CC-352/cc352s-index.json` (5 hunks, carry part) and
`python3 review/CC-352/apply.py studio/marine-carry.js review/CC-352/cc352s-carry.json` (5 hunks).

- marine-carry.js: gunTris (a gun's triangles in the torso frame, instanced parts placed), rasterTris (triangles into the
  1.5 cm depth map: cell centres + corners + edge points half a cell apart, 'min' = back face, 'max' = near face), mapPoints.
  seatOnBack: (a) the slide search's best 6 re-ranked with both guns' triangles, (b) the final seat lifted so its near face
  (rasterised) is clear of the gun under it (rasterised), (c) returns `under` = its back face rasterised, for the next gun;
  `off` now includes that lift.
- index.html carry part: fitCarriedGuns passes seat.under to the next gun; rig.seatStation (pack guns) lifts the second
  pack gun the same way and adds its rasterised back face to rig.packPts; the thigh stations x .118 -> .122.
- stack-before.txt / stack-after.txt: 13 loadouts (cf.js), standing, every gun on his back vs every other (lib2.js triangle
  depth, capped 30 mm) + seat z per gun. Before: C3 29.8, C5 29.9, C1 19.6, C8 14.8, C9 8.1, C12 2.3 mm. After: none.
- Sheets: sheet-cc352s-{c5,c3,c1}-{noon-dusk,overcast-night}.jpg (BEFORE/AFTER in one game, same camera, four lights),
  sheet-cc352t-thigh-run.jpg (running, x .118 vs .122).
- FINDING: the live cloth (trousers, liveCloth) re-bends in onBeforeRender only. A probe that steps the sim with
  T.stepFrame and measures without a render reads the trouser leg from the last drawn frame (in the cloud ~1 fps: up to
  10 cm stale at the knee). Re-bent before measuring (armsw.js/thighsw.js call onBeforeRender on liveShape meshes), the
  thigh revolver's 10-14 mm into the trouser leg is 2.8 mm (running, top front of the shell): the 4 mm move clears it.
