# The sweep's second fixes (CL-256, batch 2)

Claude, 2026-10-25. The rest of batch 1's list, against `docs/world-design.md`. Cloud sweep in a hunt's prep phase,
before and after: **87 findings → 82** (on-trail 6 → 4, no-collider 25 → 22; the 15 "invisible walls" are
now 15 "hill-ring", named for what they are; the hikers' camp has no finding left). One run in three also shows a
collider on the spot he stands on to open the trapper's cache: it comes and goes between runs (something placed at
random), so it is on the next batch's list.

| Where | What was wrong | Rule | The fix |
| --- | --- | --- | --- |
| The hikers' camp | One of its tents stood on the trail into the camp, which came through it to the fire | 8 | A camp keeps its own turn unless something tall of it stands on its trail away from the fire (the trail ends at the fire); then it turns, in 15-degree steps, to where its tents, chairs, packs and crates are off the trail and clear of its day mission's cache, so the trail comes in through its open ground (index.html `campYawOffTrail`; `assets/world/campsites.js` takes the turn and still takes its draw, so the rest of the layout is the same). Only the hikers' camp turns; the ranger's and the trapper's keep their layouts. |
| The graveyard | The open grave had no collider: he walked across the hole and through its splintered boards | 8, 13 | Two solids down its length, the boards' height; he walks round it (`world/coldwater.js` grave, index.html's history props). |
| The graveyard | The iron railing either side of the gate had no collider | 8 | A solid at each railing post; the gate between the pillars stays open (`assets/world/landmark-details.js`). |

**Looked at and left** (with the reason):

- **The 15 "invisible walls" at the cave hills** are the ring of solids round each hill's foot (index.html, `c.hillSolids`:
  "the hill is not for climbing"), where the hill rises less than the sweep's 1.2 m test within 2.3 m. They stop him on
  a visible slope, not on flat ground. Whether that ring should sit higher up the slope is a design call for the caves'
  owner with a GPU look; the sweep now names them for what they are ('hill-ring').
- **The dock's "hanging" planks** span between its posts, as a dock's planks do; not a fault.
- **The cordon gate**: two gates drawn in the same place (the cordon gate and the convoy checkpoint's frame, 98-100 %
  overlap). Left for its owner (the checkpoint, GP-19965) with the shots in review/sweep/h-cordon-gate/.
- **The trapper's yard** (AG-124's): the cellar hatch, the cache and the trapper's path share footprints (the sweep's
  overlaps at camp-trapper). Antigravity's to look at with the yard.
- **The forest's even spacing** (rule 3, nine places, Clark-Evans R 1.46-1.87): the scatter is a Poisson disc; making
  it clump moves every tree in the valley, and tests, missions and clearings lean on where trees stand. A batch of its
  own, planned with the tests that pin trees (the hikers' kit tree, the holy grenade's tree, the cave trees).
