# The sweep's third pass (CL-256, batch 3)

Claude, 2026-10-27. Antigravity's fresh sweep on Jerry's GPU (AG-139: 2026-10-27 18:06 UTC, 2036 things, 38 places'
camera sheets in review/sweep/), every sheet looked at against `docs/world-design.md`: the three huts, both wrecks,
both cabins, the three camps, the graveyard and the chapel, the watchtower, the dock, both bridges, Coldwater, the
cordon gate, the six cave mouths (the mine is in the Northeast Cave's), and the 13 wild squares with a suspect.

Most of it reads right by eye. Most of what the numbers flagged was the sweep's own blind spots, so this batch is
mostly the sweep: it stops flagging the same right things, so the next sweep's list is the real list. Cloud sweep
in a hunt's prep phase, before and after: **84 findings → 50, strong 16 → 5** (hangs 11 → 3, on-trail 4 → 0,
no-collider 22 → 0, water 1 → 0; the overlaps are the same things, the 3 strong ones now built in). The five strong
left are below: the trapper's fence over its dip, the Pit's two shelves, the mine's bolt cutters, and the trapper's
cache (open).

## Fixed in the game

| Where | What was wrong | Rule | The fix |
| --- | --- | --- | --- |
| The cordon gate | The trailhead board (the six missing-person posters) had no collider: he walked through the slab | 8 | Three solids along its face (index.html, the cordon gate's block): he stops 0.8 m off it and reads the posters there, inside the trailhead's 2.2 m spot. |

## Fixed in the sweep (tools/sweep/sweep.js, report.mjs)

| What it got wrong | Seen at | The fix |
| --- | --- | --- |
| The dead counted as scenery with no collider | The ranger camp's three "no-collider" groups (spawned shamblers) | Things `spawnZombie` builds are actors, not placed scenery. |
| Things past the land's edge judged as if he could reach them | The boundary wall's "hangs" (eight, in seven squares: its outer foot over the drop beyond the land), the river grate's and the cordon checkpoint's outer face "no collider" | The land's edge is read from the wall's own inner face (218.15 m); he is held inside it, so hangs and walk-throughs past it aren't flagged. |
| A post built into a pier read as two things through each other | The cordon gate's posts inside the checkpoint's concrete piers (98-100 %), the cabin's helmet, the reliquary, the trapper's hatch and cache on his path | The smaller one wholly inside the bigger (footprint and height) is listed as "sits inside ... built into it?", weak. |
| A bridge's or dock's deck "on the trail" it carries | Bridge 2, the dock | Decks and bridge and dock pieces are skipped. |
| The thing a trail leads to "on the trail" | The HQ (the trail ends at its door), the watchtower (at its ladder) | A trail that ends inside a thing leads to it. |
| A thing he walks under "on the trail" | (any arch whose solids stand clear of the line) | When all of a thing's colliders are clear of the trail by his width, it straddles the trail. |
| A use inside its own collider read as walled in | The fuel depot (0 of 12 at 0.95 m, in open ground) | The ring is tried just outside that collider; past 2.2 m it says so (weak). |
| Things under the lake "walked through" | The Pit's underwater pieces (wild -100,-100 and -150,-100) | Wholly under the surface: he swims over them. |
| Cameras outside the land and under water | The wild squares by the wall saw the world's underside, and at night the mountains' undersides from inside them; the lake and river squares saw the surface from below | The sweep gives each camera's spot, pulled inside the land and at the water's surface; the report uses it. |

## Looked at and left (with the reason)

- **The cordon gate is not two gates.** Batch 2 had it as doubled (98-100 % overlap); the code and the shots say
  otherwise. The convoy checkpoint (GP-121, world/cordon-checkpoint.js) casts concrete piers round the gate's two
  posts and a lintel over its beam, and hangs its own steel leaves on the wall's outer face: "both sides read as
  the same shut gate". The posts show 7.5 cm proud of the piers' inner faces as a steel edge; no faces are shared, so
  nothing flickers. The sweep now lists it as built in.
- **The boundary wall's hangs** are its outer foot over the land's edge. He can't stand there and can't see it
  over 5-6 m of wall; its inner foot sits on the ground in every shot.
- **The river grate** under the wall's arch (wild 200,100) and the slab in its shallows: past the land's edge, and a
  rock in a river's shallows is where rocks are.
- **The lake's Pit** (wild -150,-100 and -100,-100): its walls and shelves are under the water, as built.
- **The hikers' kit in its tree** (wild -100,0): it hangs in the branches on purpose (the story's kit tree).
- **The first standing stone** (wild 50,100): the stones round its foot overlap each other, as a cairn does.
- **The bolt cutters** in the mine (1 of 12 ways at 0.95 m): reached from the mine's mouth, the one way in.
- **The relay vault's keypad** (2 of 12): on the vault's wall, reached from the front.
- **The ranger's radio** (inside the truck's collider): read from its spot at the truck's nose, not from the bonnet.
- **The trapper camp's hang** (0.6 m, by the creek): the fence's rails over a dip between two posts, as fences
  cross gullies (batch 1's call; `buildFenceRun`).
- **The cabin's dropped helmet, the graveyard's reliquary, the ambulance's medical objective**: set where they are
  (now listed as built in, weak).
- **The East Cave's hill rings** and the rest of the 15: accepted with AG-137 (they stand on real flanks and cheeks).
- **The trees' even spacing** (nine squares): the forest's clumping is 1.2 (D-95).
- **A rabbit burrow on a trail** (the HQ's, in one cloud run): burrows are placed at random each run, 0.4 m high, and
  the rabbits' own; not a placement rule's.

## Open

- **The cave mouths' black** (cave-4 first, AG-139's "from the south"; fixed 2026-10-28): the camera's magenta test
  showed the black slab is the mouth's own tunnel, seen through the opening at a slant. Its inside was one flat black,
  so at any angle the mouth read as a black sheet stood on the hill, not a hole going in. Now the first 1.5 m in from
  the lip is rock and earth, lit like the face and darkening to black by the first ring (index.html `buildCaveFace`),
  so the walls and floor are seen going in and the black stays deep. All six caves; t41 9/0, t42 18/0 (cloud);
  before and after in review/sweep/cave-mouths/. From square to the side a dark sliver still shows: that is the
  far wall through the opening, as a real mouth shows it. Left: the sawtooth shading on the East Cave's +x cheek
  (the face's outer rings folding where the hill is low) and one leaf clump hanging in front of its opening.
- **The trapper's cache** (fixed by Antigravity, AG-140 and AG-141, then at the source 2026-10-28): the camp's curing
  frame stood 0.78 m from the cache's approach. AG-140/141 took it out with its collider (152 of the camp's 7,344
  triangles); now it isn't drawn there at all. In the trapper's story set (assets/world/landmark-details.js) it stands
  against the cabin's side wall, its hide to the fire: 5.35 m from the approach, 2.75 m off the trail, clear of the
  cabin's collider (review/sweep/trapper-frame/). Its spot out by the bench, 5.3 m from the fire, was on the cache's ring
  for this camp's turn. Their comparison also found the cellar's roof was a slab in a hole since AG-135: AG-144 made it
  the ground.
- **The watchtower's trail** (fixed 2026-10-28): it came in from the far side and ran its last 3 m under the tower,
  through its 1.75 m base collider, to the ladder (AG-148's trail 13, the end); rule 11 says a trail leads to the way
  in. Now, when the straight line to the ladder's foot passes inside the tower, the spur's wavy leg ends 4.5 m out on
  its own bearing and the trail goes round at that radius, the short way, to the ladder's side, then in to its foot
  (index.html `roundTowerLeg`). The trail's nearest point to the tower's centre: 0.74 m before, 2.25 m after (the
  ladder's foot). One wavyLeg as before, so the other 15 trails are point for point the same (their signatures
  compared in the cloud). review/sweep/tower-trail/.
- **The trails walked** (AG-148, 44 GPU shots every 35 m along the 16 trails and at each end): nothing else at fault.
  The 0 m shots inside the HQ are the trails' roots in its yard.
- **The East Cave's leaf clump and its +x cheek** (fixed 2026-10-28). The clump in the dark of the mouth was the
  wet cave's left birch: planted at the tunnel's back corner (local -4, -4.5) on 3.3 m of hill, its canopy's foot
  (5.7 m up, 1.8 m round) sat inside the tunnel's 6 m roof. It is planted 2 m further back (-4, -6.5), on 7.6 m of
  hill, its canopy over the roof. The cheek's sawtooth was the face's two-sided rock: a triangle facing into the hill
  had its normal turned to the front but not its winding, so the renderer saw its back from the front and turned the
  normal round again; where the hill's clamp twists a ring's quads every other triangle went dark. Its winding turns
  with the normal now (index.html `buildCaveFace`, all six caves; the faces' look elsewhere unchanged by eye).
  t41 9/0, t42 18/0 (cloud); review/sweep/cave-4-cheek/ (before, the birch alone, both).
