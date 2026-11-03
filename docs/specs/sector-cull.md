# The walls' cull (CL-296 / D-112; for order 2, performance): what a stone wall hides isn't sent to draw

Claude, 2026-11-02. AG-203 measured five first-person seats facing the HQ ring and the quarter walls: 30-54 % of the
draws in view sit behind a band, and a 3-3.5 m wall would hide 90-98 % of them from the eye. The game is CPU-bound by
what it sends to draw (AG-170), so those are frame time we can have back, once the bands are stone (CU-232) and tall
enough to see over only from far. The hedge bands are 1.1-1.7 m, under the eye: this needs the stone.

## How
1. **Occluders.** Each band's polyline (game/wall-bands.js) as straight segments of at most 6 m, gaps left out, each
   with its top: the ground there plus the wall's height (the stone kit's, 2.8-3.5 m). A segment hash on a 16 m grid.
2. **Occludees.** The static draws only: props, history props, buildings, mine props, camps (not the instanced forest,
   not zombies, nothing that moves). Each is put in an 8 m cell when it's placed; a cell keeps the box of its meshes.
3. **The test.** A cell is hidden when every top corner of its box is under the sightline over some wall between
   it and the eye: the 2D line from the eye to the corner crosses a segment, and at the crossing the line's height is
   below that segment's top. Round-robin, about 64 cells a frame, the near ones first; a moving eye (over 0.5 m since a
   cell's last test) re-tests it.
4. **No popping.** A cell is hidden only after two tests in a row say so; it shows the first time one corner is seen.
   Walking toward a gap, things appear before you can see them, never after.
5. **What hiding is.** visible = false for the eye's pass and the shadow pass both (a prop under 3 m behind a 3 m wall
   throws nothing over it at the sun's heights we use; check at dawn and dusk).
6. **Budget.** The test's own cost under 0.15 ms a frame at night 20 (PROF section `cull:walls`), zero garbage a frame
   (CL-220's rule), measured with tools/bench.mjs --prof.

## Done when
- t-test: a prop behind a wall from a seat is hidden, the same prop through a gap is shown, and a prop at the wall's
  foot on the near side is never hidden; hysteresis holds (two hidden reads to hide, one seen read to show).
- AG-203's five seats again: draws behind the bands drop by at least two thirds; no visible pop walking along the
  ring and through each gap (AG's frames, his launcher's page).
- D-99: night 20 and the noon woods seat, against the hedge and against stone without the cull (Cursor's A/B).

## Who
Grokbot (GB-273), after GB-253 lands: it's the same kind of work (what the frame costs, measured before and after).
Cursor's A/B. Claude reviews; world layout stays Claude's (rule 10).
