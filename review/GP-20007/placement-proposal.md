# GP-20007 — six deadfall shortcut sites for Claude's placement call

Proposed against the live 2026-11-01 W1 layout, before placing any mesh or
solid. Coordinates are world `(x,z)`; `+x` is west and `+z` north. Each line
below is a **10 m fallen-log band** across the straight woodland shortcut,
perpendicular to travel. The existing marked trail remains open. On a saw cut,
the centre 3 m opens to both player and dead, while the two ends remain.

| # | Neighbouring places and reason | Centre | Log endpoints |
| --- | --- | --- | --- |
| 1 | Landing clearing → rangers' camp: the straight westward line is 88 m, while the marked spur bows deeply; a deadfall explains why the player follows its bends. | `(67.8,-14.0)` | `(68.9,-18.9)` to `(66.7,-9.1)` |
| 2 | Hikers' camp → fire tower: the sites are only 47 m apart but their marked trails return toward the HQ network. The deadfall makes the direct ridge cut an earned route. | `(-13.3,-125.3)` | `(-13.1,-120.3)` to `(-13.4,-130.2)` |
| 3 | Fuel depot → crashed wreck north of it: the direct 36 m line crosses woods, while the two spurs meet at a junction ~106 m away by trail. The wreck's fallen timber has a cause. | `(-116.8,28.0)` | `(-111.8,28.2)` to `(-121.8,27.8)` |
| 4 | Trapper's camp → graveyard: the straight 93 m line cuts a northern grove; marked trails run ~176 m through their common junction. | `(-62.7,106.9)` | `(-65.4,111.1)` to `(-59.9,102.8)` |
| 5 | Graveyard → crashed wreck: a 51 m woodland diagonal cuts the corner of a ~162 m marked walk, offering a discoverable connection between two dangerous sites. | `(-103.8,67.6)` | `(-108.0,70.3)` to `(-99.6,64.9)` |
| 6 | Fuel depot → radio mast: the direct 40 m line reaches the hill edge, while the network routes back around the woods (~266 m). A stacked deadfall signals the closed way without hiding the mast's skyline light. | `(-129.1,5.0)` | `(-130.9,9.7)` to `(-127.3,0.4)` |

**Claude's rule-10 ruling, 2026-11-01:** approve 1, 3, 4, 5 and 6 as
proposed. Site 2 lies only 12 m from the fire tower. Claude allowed moving it
at least 30 m from every place centre or dropping it and keeping five. We are
dropping site 2; no unapproved substitute will be placed. The five approved
sites are the implementation set.

Live RTX 5080 probe: all six **full 10 m segments** were sampled every 0.5 m.
Minimum clearance beyond the nearest marked trail edge was 17.6, 5.8, 8.9,
26.3, 9.9 and 13.2 m respectively; maximum water depth was zero for each;
maximum terrain slope was 0.07, 0.24, 0.02, 0.09, 0.13 and 0.07. Before
building, also check mission props, the thicket and the hiker tower ladder;
adjust a few metres or reject a site if it clips. The forest is denser now, but
each log end still needs visible tree, rock or brush backing so walking around
does not look easier than cutting. Site 6 has the sparsest nearby trees and
may need a natural rock/brush tie-in or a different spot.

World-design rules: **2 Environmental Causality** (stormfall rooted at a grove
or slope), **8 Functional Accessibility** (official trails and mission entries
stay free), **10 Controlled Irregularity** (different fall angles and layered
trunks), **11 Directional Guidance** (marked routes stay readable), and **15
Rewarded Curiosity** (a short route is discovered and earned). These placements
are a proposal only; Claude owns the spatial decision under rule 10.

## Final rule-10 correction, 2026-11-01

After the first gameplay-scale pictures, Claude approved moving the
trapper-grave barrier a few metres southeast to clear a live tree and tying
each exposed end into thicket or trees. His added rule: no live trunk within
3 m of any cut center. The fuel-mast barrier shifted 2.2 m northwest for that
same rule while retaining its approved shortcut line.

Final moved endpoints: trapper-grave `(-61.4,109.1)` to `(-55.9,100.8)`, center
`(-58.65,104.95)`; fuel-mast `(-131.7,11.7)` to `(-128.1,2.4)`, center
`(-129.9,7.05)`. Nearest live trunks to the five final kerfs are 3.38, 11.78,
4.21, 3.81 and 3.60 m. Eight short thicket anchors tie the exposed landing,
fuel, trapper and mast ends into woods or extend the detour; grave-wreck's
ends already meet trees within 2.4 and 1.9 m. The anchors are explicit in
`index.html`, avoiding random tree-spawn movement. Their closest path-center
approach is 4.26 m (fuel-b), with zero water and maximum sampled slope 0.14.
Each log cut center remains collision-blocked before sawing and open afterward.
