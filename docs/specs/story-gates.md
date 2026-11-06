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

## CL-303 (D-116, Jerry 6 Nov): each place its own lock, and the line

Jerry: the depot and the rangers keep stone; "Radio mast yard should be chain link fence with wire on top of it like the
one in the training area. The gate needs to be chain link", grown over with vines cut by the machete ("we will take the
machete out of the buy menu and keep it as something that you have to find"); "Hikers' camp should be a ring of
impenetrable trees", the path blocked by a crashed truck: "It needs a winch that you can take off of another truck. You tie
it to a tree and yank the truck out." And "make sure that our locations unlock in a linear fashion. You cannot complete the
one until you finish the other", with a reason for the days: the Grave Shift orders (his pick).

| Place | Ring (`kind`) | Lock | Opens with | Where it lies |
|---|---|---|---|---|
| The depot | stone | the iron gate | Price's key | by the HQ generator (as before) |
| The mast yard | fence (chain link, wire on top) | a chain-link gate grown over with vines | the machete (or the katana): three chops | the depot shed, by the pump (inside the depot's ring) |
| The hikers' camp | trees (two rows grown, one young; the band's solids hold the line) | a crashed truck across the mouth | the winch: bolt it to the truck, tie its line to the big tree, hold E at the remote for 7 s | the convoy, by the escort truck behind the ambulance |
| The rangers' camp | stone | the iron gate | Clarke's key | his truck's toolbox (as before) |

- **The line** (`story-chain.js` LINE_RULES, `chain-gates.js` `line`): one lead open at a time, each the one before it in
  LEADS' order (the rangers' search now after Clarke's truck), no two-dawn fallback, no spare keys on the HQ board, a lead
  can't be done while closed, and no gate opens before its own lead is open (a tool got early, like the bolt cutters at the
  mine from day 1, waits its turn).
- **The Grave Shift orders**: Captain Hale set the HQ teleprinter on a dead-man's timer; it prints the next sealed order
  at a dawn only once the last is stamped done at the duty board. A finished place says "Stamp it at the HQ duty board";
  E there stamps it (`storyChain.stamp`), before the board's briefing. AG-247 builds the teleprinter and the stamp;
  GP-20034 writes the eight orders in Hale's voice and the line's words (`chain.<lead>.line.*`, `order.*`).
- **The winch's spots** (`winchSpots(ring, g)`): the truck lies across the mouth along the ring; the anchor tree stands
  outside, 7.5 m out and past the truck's nose; the remote on its lead on the other side, 3.2 m out, clear of the swing;
  the truck ends turned along the trail beside it, outside the ring (three solids there). The noise calls the dead.
- **Looks are placeholders** until AG-245 (the fence and the vines), AG-246 (the trucks), AG-247 (the teleprinter), and
  GB-288 (the machete's real chop at the vines). The fence and the trees are not the stone kit's and are not occluders.
- **Hooks**: `TT.storyGatesDbg.line` { rules, due, stamp, stamped, gate(place), use(place, at), hold(place, on),
  spots(place), prompt(place, at), why(place) }; `rings()` carries `kind`.
- **Checks**: tcl303 (44: the kinds, the tools, the vines, the truck and winch, no way through the trees, the line and the
  stamp); tcl296 (47; its key-at-the-ring check now on the rangers' stone ring); game/chain-line.test.mjs (7).
