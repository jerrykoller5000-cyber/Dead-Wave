# The radio mast: the sweep

CL-256, 2026-10-24. Against `docs/world-design.md`. The numbers: `numbers/mast.md`. The shots: `review/sweep/mast/`
(cloud, software renderer, in a match). This is where Jerry's N3 is: "Some weird collision going on around the place
where you find the breaker note. Hard to reach the note. That area needs a little more attention to detail and design."

**The place.** A lattice mast with a dish, the relay cabinet at its foot, and the supply vault: a corrugated store with a
"07" door, on a dock with a ramp, 9.5-27 m out. A cave mouth stands on the hill to the north. A trail runs past.

## Sato's note (N3)

The note isn't a place. Each run it moves to a random tree 9-26 m from the cabinet (`placeSatoNote`), at the trunk's
edge plus 0.85 m, with the stool between it and the trunk and the hat a step aside. In this run's shots
(`note-N/E/S/W.png`, `note-down.png`):

- **The paper and the hat can't be seen.** Both are laid flat, 1.2 cm over the ground's height function. The drawn
  ground runs straight between its vertices and the grass grows over it, so on uneven ground both disappear: in this
  run's shots neither shows, even from straight above. From where he stands, the footprints lead to a bare patch by a
  tree. Hard to reach really means hard to find: he hunts for an E prompt with nothing to see.
- **The stool reads as a floating wedge.** Knocked over, it shows its triangular seat on edge, held 17 cm up, with its
  legs in the air.
- **The claw marks** are cut on the trunk at 1.05 m on the paper's side. From most approaches they face away.
- **The collision.** In a second load (another tree), the only thing in his way round the note was the trunk (a 0.25 m
  grid of the game's own resolver: `#` blocked, `N` the note):

  ```
  ...............###.......
  ............N.#####......
  ..............#####......
  ..............#####......
  ...............###.......
  ```

  The spot changes every run, though. Some candidates sit by a rock, a stump or the vault's ramp rails (r 0.2 posts
  every 0.4 m), with only 0.7 m checked round the paper. A random spot can't be designed, and it can't be checked
  before Jerry finds it.

**The fix (CL-257).** Three designed spots round the mast, one picked each run, each a small scene of what happened to
Sato (rules 2, 8, 12):

- His stool lies properly on its side on the ground; his hat is in the grass.
- The note lies under a stone on a flat root, laid on the ground's highest corner and tilted to the slope, so it's always
  in sight.
- The claw marks are at shoulder height, facing the way he comes.
- The footprints from the cabinet end there and don't go back. Drag marks lead off toward the cave.

Each spot is checked in the sweep: the E prompt's reach, the collision map clear in a 2 m ring, and the shots.

## The rest

- **Placement.** Nothing blocks the cabinet (12 of 12 ways in, its standing spot clear). The vault's keypad, on the
  dock beside the door, has 2 of 12 ways in at ground level: the dock and its ramp rails. It is reached up the ramp, as
  intended. The insulated boots sit on the perch at 12 m (the climb).
- **The trail** runs past the vault's ramp foot. That is right: the path out to the store.
- **The look.** The vault reads well: corrugated steel, the "07" stencil, a red LED, wire on top, yellow rails. A barrel
  stands at the ramp's foot. The cabinet is small beside the mast. On approach it is the mast that draws the eye, which
  is right (rule 5).
- **Shots to redo.** The south approach and the night view were taken from inside the hill and inside a tree. The
  report's cameras now stand on the real ground (the next sweep).
