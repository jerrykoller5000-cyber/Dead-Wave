# The marine's hand (CL-334, J101)

Jerry, 10 Nov 2026: "My biggest takeaway is that we need a much better and more detailed hand model. I don't really care
how long it takes." Six rounds with him, sheet by sheet. This is how the hand is made now, for anyone who touches it.

## The files

| File | What it is |
| --- | --- |
| `studio/marine-hand.js` | The hand: its layout, its bones and their limits, the surface, the skinning, the rig. Exports `buildHandMeshes`, `makeHandRig`, `HAND_POSES`, `JOINT_LIMITS`, `handLayout`, `DETAIL_ATLAS`. |
| `studio/marine-hand-bake.js` | The first-person surface built ahead (written by the tool below; never by hand). |
| `assets/hand/hand-{skin,glove}-{normal,colour}.png` | The detail maps (written by the tool). |
| `tools/hand-bake.mjs` | `node tools/hand-bake.mjs`: builds the surface and paints the maps. Run it after any change to the hand's shape. |
| `tools/hand-detail.mjs` | The painter: the creases, wrinkles, veins and glove seams, in each chart's own measures. |
| `tools/handshot/` | The hand on its own in a browser (`node tools/handshot/shoot.mjs <out> <shots.json>`), for sheets. |
| `studio/fp-arms.js` | The first-person arms: the hand's materials with the maps (`detailed`), the nails' material. |
| `game/viewmodel.js` | Places the hands on the guns; the wrist's limits (`WRIST_LIMITS`, CL-334 e). |
| `game/viewmodel-fit.js` | Each gun's hands fitted to its shape (generated): the hand's turn and place on the gun and its pose, read before `VM_SOCKETS`. |
| `studio/hand-contacts.js` | Where each gun's hold presses the hand, how its surface gives (generated). |
| `tools/tests/tcl334.js` | Rule 1: no part of the hand through another, every pose the game uses and the blends between them, bare and gloved. |
| `tools/tests/tcl334b.js`, `c`, `d` | Rule 2 in the game: every gun up at the hip, both hands drawn against every closed part of the gun; the wrists in the sleeves (`tools/tests/clip-check.js`). |

## How it is built

- **Layout** (`handLayout`): hand space, +y toward the elbow, the fingers along -y, the palm facing +z; side +1 right,
  -1 left (the index and thumb on the +x*side edge). The palm is about as long as the middle finger (round 5, from
  Jerry's references); the grip channel (`L.gripY`, where a bar or a gun's grip runs through the fist) is 22 mm short of
  the knuckles.
- **Bones**: 16. 0 the palm; 1 + 3i + j finger i's phalanx j; 13 the thumb's metacarpal, 14 and 15 its phalanges.
- **Joint limits** (`JOINT_LIMITS`, round 4, J101 "set realistic joint and rotation limits"): every pose is clamped. The
  fingers' knuckles to 90 degrees, middle joints to 110, end joints to 80, spread 20 either way. The thumb's root is a
  saddle on the palm's own axes (round 6, J101 "something off ... at the bottom thumb joint"): across the palm or out from
  the index in the palm's plane, out in front of the palm, and the turn of its pad toward the fingers; `t[0]` (curl) is
  opposition, all three together, as a thumb's are.
- **One surface** (round 3): a distance field (the palm's tabled sections, each digit's swept section, each digit blended
  into the palm with a fillet, never into each other), meshed by surface nets in a build pose with the fingers spread and
  the thumb out, every vertex pulled onto the surface, normals from the field. No seams where the fingers meet the palm.
- **Skinning**: two bones a vertex, from continuous fields (a digit by how much the point is on it and how far along, the
  thenar with the thumb's metacarpal, the palm what is left), so no seam opens where one rule hands over to another.
- **Detail** (round 6): the surface is cut into six charts (the palm and back as one, each digit), with a gutter either
  side; the maps carry the creases at every joint, the wrinkles over the knuckles, the palm's lines, the fingertips'
  ridges, the back's tendons and veins, the skin's grain and tint; on the glove its weave, seams and stitches and the
  palm's grip panel. Second UV channel (`uv1`); the first stays the camo's box projection.
- **Third person** (`detail: 'mid'`): the same layout and sections as light tubes (about 1,400 triangles a hand), no maps.

## The grip solver

A pose for holding something is solved, not picked (round 6, J101 "the four fingers do not make total contact with the
item he is gripping"): each finger's three joints so each bone's pad touches the object, never through it, inside the
limits, the end joint following the middle one (about two thirds), the fingertips kept out of the palm; the thumb wrapped
round it with its pad across the backs of the index and middle fingers' middle bones. `HAND_POSES.fist` is the solve on a
2.6 cm bar through the grip channel. The guns' grips are next (the same solve against each grip's surface, in the game).

## Jerry's rules for the hand (J126, J127, J128, standing)

1. No part of the hand through another part of it. `handClipReport(pose, tol, detail, inflate)` measures it on the surface the
   game draws: each vertex, posed, against the other digits (each bone's piece of a digit moved by its bone) and the palm,
   bare (`inflate` 0) or gloved (`GLOVE_INFLATE`, 1.1 mm; a quarter of that on a finger's sides, where it meets the next
   finger). `tcl334` fails at 0.5 mm.
2. No part of the hand through a gun. The grip solver fits each gun's hands to the gun's own shape: the gun exported from the
   game (every part's triangles), its distance field in the hand's space (`sdf.py`, trimesh), then the fingers, the thumb and
   a few millimetres' move and turn of the hand on the gun, gloved, against the field. What's left (a hand pressing a hard
   grip a millimetre or three) is the flesh giving: `studio/hand-contacts.js` pushes those vertices out and smooths the push
   over the skin round them; `rig.setContact` applies it in the hold's pose and fades it as the hand leaves the pose.
   `tcl334b/c/d` check it in the game.
3. Every joint inside its range (`JOINT_LIMITS`, the wrist's `WRIST_LIMITS`); the rig clamps every pose.
4. Fabric: the sleeve's end sits round the wrist (`sleeveEnd`), its hem is hollow, and it gives with the wrist's bend
   (`arm.bendSleeve`, `SLEEVE_GIVE`).

A blend between two poses (`lerpPose`) closes the fingers before the thumb wraps, and opens the thumb first, so nothing
passes through on the way.

## Rules

- Change the shape, then run `node tools/hand-bake.mjs`, or the game builds the hand at load (half a second, with a warning).
- Never weaken the limits to make a pose fit: fit the pose.
- Reference photos and models are to look at only.
