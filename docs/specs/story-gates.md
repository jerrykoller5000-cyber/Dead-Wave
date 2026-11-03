# The story gates (?gates=1) — CL-296, D-111 order 3

Jerry, 1.2 notes: "we are going to have to work on gating certain locations and making the player do something before
accessing them. If you run around sprinting right off the bat you discover every location very quickly." The plan he
reads: https://claude.ai/artifact/HSZFj3KEm6L5gnMeFVyrde ("a gate a day"). This is the build behind the switch, for his
Monday try. Off by default; the default in 1.3 only if he likes it.

## What it is

The story chain's blockers (game/chain-gates.js, CL-285 part C) are point blockers today: a chain or a padlock on the
approach that he can walk round through the trees. Under `?gates=1` each story place whose woods leave a way round gets
a **ring of the same stone wall the bands use**, at its clearing's edge, with **one gate** where its main trail comes in.
The ring gate is the chain gate: it opens with that gate's key (`chainGates.canOpen(id)`, then `chainTryOpen(id)`), the
banner and the words are the chain's own (`chain.<lead>.open`, `.locked`), and once open it stays open for the run.

| Place | Chain gate (key) | Ring | Why |
|---|---|---|---|
| The depot's shed yard | depot-shed (Price's key, HQ generator) | yes | a spur; the woods go round the pump-path padlock |
| The mast yard | mast-yard (Sato's key, HQ radio drawer) | yes, the yard only | the vault stays outside: its keypad is its own lock (MU-32 §8.3) |
| The medical convoy | road-barrier (the barrier key, the vault's first lift) | yes, on the wreck at the spur's end | the spur ends at the ambulance (chainPlaceMedical) |
| The hikers' camp | trail-chain (the chain key, the ambulance glovebox) | yes, the land side | the river side keeps its water gap (bandWaterGaps) |
| The rangers' camp | ranger-gate (Clarke's key, his toolbox) | yes | the padlock's trail point is walked round today |
| Clarke's truck | toolbox-chain (the bolt cutters) | no | the padlock is on the toolbox itself: a ring would fence a fence (MU-32 §5) |
| The trapper's camp | trapper-fence (the combination) | no | already a fenced yard with its gate (MU-32 §7) |

The supply sites, the graveyard, the tower, the cabins and the warrens stay open from day 1.

## Rules

- **Layout is rule 10 (Claude).** The rings are computed, not hand-placed: circle of radius R round the place's centre,
  R from 18 m down to 13 m, the first that keeps 3 m off every other band (the HQ ring, the quarter lines, the shortcut
  cuts), every other place and every bridge, and still holds the place's site and approach inside with 3 m to spare. No
  R that fits → no ring for that place (logged in `TT.storyGatesDbg`).
- **Gaps:** the main trail (the path whose end is nearest the centre) gets the gate. Any other trail that crosses the
  ring also gets a gate (all of a ring's gates open together), so no trail is cut off and no gap stands open. Water keeps
  its gap.
- **Collision:** width 1.8 m (the stone is 1.28 m at the base), pushed by `resolveWallBand` like every band; the gate
  is a row of solids across the gap (worldSolids, kind 'story-gate') and blocks in the valley field (`valleyBlocks`)
  while shut. Opening takes them out; the field rebuilds on its signature.
- **Nothing lives inside a shut ring.** A camp's guards (`poiGuardsDue`, day 3+) wait until its gate is open.
- **Trees:** none within 2 m of a ring (the same predicate the scatter uses for the HQ ring).
- **Looks:** the band's stone kit draws the ring (one more set of lines in its three draws); the gate is a pair of iron
  leaves between the kit's piers; open, they stand swung back.
- **Off:** `?gates=1` only, and only while the chain gates are on (`?chaingates=0` turns both off).

## Checks

tcl296 (the test page, `?gates=1&chaingates=1`): five rings, each closed but for its gates; the place's site inside;
no other place inside; no tree trunk within 2 m; walking in from outside along the trail stops at the gate while it's
shut and goes through once the chain opens it; the dead's field blocks the gate while shut and clears it after; no
guards inside a shut ring. Then AG's drive of each ring from Jerry's launcher (the his-way rule) and Cursor's A/B (D-99).
