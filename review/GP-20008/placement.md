# GP-20008 quarter-band placement survey — 2026-11-01

Coordinates are world `(x,z)`, with `+x` west and `+z` north. A queued,
one-instance title-screen survey sampled each straight 70–200 m diagonal at
1 m intervals using live `TT.POI`, `PATHS`, `waterDepthAt` and `terrainSlope`.
The first survey used mathematical quadrant labels. On this map `+x` is west,
so Claude corrected the compass names on 2026-11-01 before placement. The
names below are the game's compass names.

| Bearing | Straight-line obstruction | Live-checked bend / next decision |
| --- | --- | --- |
| NW | Within 2.6 m of bridge 0's edge at r91; wet r100–110. | Claude approved `(66,23) → (83,50) → (96,80) → (118,118) → (141,141)` with wet span omitted. The authored gap is at `(91.5,69.7)`, r115.1 on that line: dry across the 5 m strip, slope 0.13, 23.8 m clear of the nearest clearing edge after band half-width. |
| SW | Within 3.4 m of cabin 1's edge at r112. | Claude approved `(50,-49) → (59,-70) → (68,-105) → (103,-130) → (140,-143)` and the gap at `(68,-105)`. Dry, slope <=0.30, at least 15.6 m from a clearing edge after band half-width; gap slope 0.03, 28.3 m clear. |
| SE | Dock edge only 6 m away at r107; lake from r98 through r200 along the straight diagonal. | Claude approved a lake-shore stub. At 230° in math bearings, the dry, 15 m-clear route starts `(-45.0,-53.6)` at r70 and ends `(-57.2,-68.2)` at r89; the first water in the 5 m strip is at r96. The 7 m centreline setback leaves at least 4.5 m between the last 2.5 m circle's edge and water, satisfying his 6 m approximate setback and 4 m walking gap. Nothing is placed on water; the lake completes the quarter barrier. |
| NE | Runs through the graveyard at r127; wet near the inner 70 m start and crosses five trails. | Claude approved `(-10,69) → (-30,95) → (-50,115) → (-75,130) → (-140,143)` and gap `(-50,115)`. Dry, slope <=0.30, at least 26.2 m from a clearing edge; gap slope 0.08, 29 m clear. |

The 5 m band centreline must remain at least 17.5 m beyond each clearing's
edge to leave the required 15 m with its own 2.5 m half-width. The planned
4 m personal gap near r125 must sit on dry, walkable ground except Claude's
approved SE shore gap and NW's moved dry gap. Every actual trail
crossing receives a corridor cut; wet river spans are omitted without moving
bridges. The HQ 60 m ring and five approved deadfalls are already registered
and should keep their own solids and four visual draws.

World-design rules served: 2 (a thicket/rock line follows the foothills), 4
(clearings remain negative space), 8 (trails, bridges and mission spaces remain
accessible), 10 (controlled bends and irregular material distribution), and
11 (the authored gap guides a route between quarters). Family: settler/civil
and natural woods, with moss-dark brush, fieldstone and fallen wood.

Claude's placement call is in `handoffs/requests.md` under "GP-20008 placement
call (rule 10)". Default enable still waits for navigation, sightline, top-down
and four-light proof, plus the night-20 before/after benchmark.
