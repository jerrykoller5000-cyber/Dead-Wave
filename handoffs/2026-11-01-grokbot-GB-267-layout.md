# grokbot · GB-267 the warrens, again: the layout before I build (rule 10) · 2026-11-01
Changed:          Proposal only, no code. For CL-286 / Jerry's J47 ("rough inside, hard to move through, visually uninspired, no real transition going down, tight and claustrophobic to the point of frustration"). Read from Muse's MU-25 and the code itself: world/hollows.js (HOLLOW, tryLayout, planSolids, planGround, buildWarren dressing) and index.html (warrenKeepIn ~57837, enterHollow ~57856, leaveHollow ~57878).
Files:            handoffs/2026-11-01-grokbot-GB-267-layout.md (this file; no game files touched)
Tests:            none run (no change yet)
Not verified:     the feel of any number here; that is the build's tests plus Jerry's play.
Requests:         Claude: approve or change sections 2-5 before I build; the one real call is section 4 (which descent).
Contract changes: none yet; if approved, HOLLOW's constants and the plan's cell kinds grow (listed below).

## 1. What makes it tight today (measured from the code, not walked)

- A cell is 6 m. A closed side is a 1 m wall, so a tunnel's run is 4 m between walls.
- Every tunnel and pocket cell has a 1.5 x 1.5 m pillar in each corner (planSolids). The pillars stick 0.5 m past the walls and the doorway shoulders, so every 6 m the run narrows from 4 m to 3 m and back. Those 0.5 m notches are the snags: hug a wall round a turn and you catch on one.
- Doorways (GAP) are 3 m. warrenKeepIn keeps a 0.3 m margin off the rock, so the walkable width at every doorway is 2.4 m.
- warrenKeepIn's slide: when a step lands in rock it tries the x-only step, then the z-only step, then snaps him back. At a doorway taken at an angle, both single-axis steps often fail and he stops dead. That is the "hard to move through".
- Tunnels have a 3.4 m roof; the third-person camera runs into it on turns.
- A ramp drops 4 m in one 6 m cell, about 34 degrees.
- Props are visual only: roots (hanging to as low as 0.6 m off the floor), slate blades (up to 1.8 m tall), the iron warren's timber posts (standing 1.4 m in from the wall, in the run) and hill slabs are not in solids or the nav. He and the dead walk through them, which reads as rough and broken.

## 2. The runs: wider, no notches

| | today | proposed |
|---|---|---|
| CELL | 6 m | 7.5 m |
| GAP (doorway) | 3 m | 5 m |
| WALL | 1 m | 1 m |
| corner pillars | 1.5 m, 0.5 m proud | 1 m, flush with the walls (no notch) |
| tunnel run between walls | 4 m | 5.5 m |
| narrowest walkable (doorway less the 0.3 m margins) | 2.4 m | 4.4 m |
| TUNNEL_ROOF | 3.4 m | 4.6 m |
| CHAMBER_ROOF | 6.5 m | 7.5 m |
| the Deep's 2 x 2 chamber | 12 m square | 15 m square |
| GRID | 16 | 16 (the plan is 120 m across; nav at 1.5 m goes 64 to 80 squares a side, about 1.6x the cells) |

The layout's dice, SIZES and depths stay, so each warren keeps its shape and its number of cells; only the scale grows. Sleeper corners, crates, tags, the strongbox, the rune door and the passage are all placed from CELL, so they move with it; I re-check the door and strongbox offsets (C - 0.7, 3.2, 2.2) still sit right in a 15 m chamber.

## 3. The snags

- Collision: warrenKeepIn changes from "try x, try z, else snap back" to pushing him out of the box he entered along its shallowest side, so a corner or a doorway edge turns him along the wall instead of stopping him. Same 0.3 m margin.
- Props: nothing stands in the run any more. Slate blades, hill slabs and the iron warren's timber go against the walls (within 1.2 m of a closed side) and become solids and nav blocks; the timber posts move flush to the walls, a real mine set. Roots hang to no lower than 2.4 m off the floor, so they stay pass-through overhead. The wet warren's knee water and its slow stay as they are (that is a theme rule, not a snag).
- Ramps: two cells long instead of one: 4 m over 15 m, about 15 degrees (rampFrom then needs three free cells in a line; the layout already retries 64 times).
- The iron wall's walk-through cut (the bolt-cutter gap, world/hollows.js ~484-497) widens to 1.6 m clear. It is meant to be a pinch, so it stays the one narrow place, and it gets a solid frame so it doesn't snag.

## 4. The descent: the one call (Claude's)

Recommended, option A (inside today's warren, at -400): the mouth cell becomes a descent of three cells, an entry shaft that switches back once and drops 6 m at about 12 degrees, from a new entry landing down to depth 1. Daylight comes in behind him at the top (a cone of white light from the mouth crack, the bolt-holes' look), and over the descent's length the ambient and fog blend from the valley's daylight values to the warren's own (a lerp on how far down he is), so the light goes as he walks. The Hush lights the way from the first switchback. On the surface, the second E at the mouth (the Hush's rule unchanged) becomes a short walk into the mouth's dark with the screen fading to black, and he comes in on the landing, facing down, daylight behind him. Leaving by the mouth is walking back up to the landing (it replaces today's exit point in the mouth cell). Bolt-holes and the CU-72 passage are as they are. Cost: layoutWarren (a 'descent' cell kind and a third floor level above depth 1), planGround, the light blend in the runtime, enterHollow's arrival point; nothing on the surface moves.

Option B (seamless): put each warren under its own cave mouth (ORIGIN per cave instead of the one -400 point), so a real shaft runs from the mouth down. No cut at all, but it re-seats caveHillHeight's dome, the guardian mouths and the Marrow door (caveSealSolids), the CU-72 passages and every test that assumes -400. I'd hold that for 1.2 if A's fade still reads as a cut to Jerry.

## 5. Things worth looking at, by warren

What the twelve left (the nine tags stay exactly where the plan puts them, and the count stays as now) and what the dead made, one or two set dressings a depth, each a small mesh group with no collision unless it stands in the run:
- Every warren, on the descent: the Gravewalkers' way in, a rope run down the shaft wall on pitons, a chalked FOB Threshold arrow, a dropped glow stick still faintly green.
- root: the twelve's climbing kit tangled in the roots (a harness, a helmet with a lamp), roots grown through a pack; the climbers' knot set piece as now.
- shale: tally marks scratched in the slate by a doorway (days held), a shelter of stacked slate with a sleeping bag in it.
- iron: the mine itself: timbered runs flush to the walls, a second ore cart off its rails, lanterns on the timbers (the existing lamp points, more of them), the settlers' iron wall as now.
- wet: a line of empty ammo cans as stepping stones to a ledge, a waterproof bag hung high, the drowned's pool as now.
- hill: older graves in the walls (the barrow court, more of them), a Gravewalker's body laid out on a slab by the others, the bier as now.
- What the dead made: husks on chamber roofs as now; along the runs, drag marks on the floor (a darker decal strip) leading to the nests, and bone piles at alcove mouths.
Lights: each chamber gets one theme-coloured accent light (the glow colour) besides the lantern points, so a chamber reads as a place from the doorway; tunnels stay dark (the Hush's job).

Kept as they are: the Hush's rule and charge, the heart fight (game/heart-fight.js, not touched), the loot (strongbox, crates, tags), the sleepers and nests (positions scale, counts don't).

## 6. Tests I'd add (and re-run t152, t157, t167, t168, t170, t171, t174, t178, t190, t191, t215, t95)

- Walk the descent: from the landing, held forward, he reaches depth 1 with no stop, the light blend goes from day to the warren's values, and walking back up leaves by the mouth.
- The narrowest run: across every plan for all five themes, no walkable cross-section along a path from the mouth to the Deep is under 4.4 m (except the iron cut, 1.6 m).
- No snag: a scripted walk along each warren's mouth-to-Deep path at full speed never loses more than 20% of its speed for more than 0.2 s, and never stops.
- Props: no prop box stands within the run lane (the doorway width through each cell).
- AG's look after, with before/after shots per theme.