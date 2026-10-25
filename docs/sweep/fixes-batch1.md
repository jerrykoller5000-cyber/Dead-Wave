# The sweep's first fixes (CL-256, batch 1)

Claude, 2026-10-24. AG-122's findings on Jerry's GPU (handoffs/2026-10-24-antigravity-AG-122.md) and the cloud sweep's,
fixed, against `docs/world-design.md`. Cloud sweep in a hunt's prep phase, before and after: **119 findings → 87**
(hangs 34 → 11, no-collider 29 → 24, on-trail 8 → 6, water 2 → 1, reach 5 → 3).

| Where | What was wrong | Rule | The fix |
| --- | --- | --- | --- |
| The ranger and hiker camps | Tents on slopes hung 0.6-0.9 m off their downhill side | 13 (structural dependence) | On a slope (corners more than 0.15 m apart) a tent stands on a plank deck: planks across three joists, the joists on posts down to the ground (a middle post on a long deck); the ground sheet lies on the planks; guy lines tie to the deck's edge. Flat ground keeps the plain sheet (assets/world/campsites.js `tent`). |
| The trapper's camp | The fence run's end post stood 0.7 m in the river | 13, 20 | No post in water, and no rail out to one (index.html `buildFenceRun`). |
| The boundary wall | Buttresses on steep stretches hung 0.7-1.2 m on their downhill side | 13 | Seated on the lowest ground under their footing (`groundMinAround(x, z, 0.8)`). |
| Hut 2 (the lakeshore shed) | A 0.3-0.4 m gap under its downhill corner | 13 | Seated on the low point of its whole footprint (2.1 m to a corner), not its middle 1.2 m (`buildShed`). |
| Coldwater | He walked through the ruined foundations' walls and the 5 m chimney | 8, 13 | Solids along every wall higher than a step, the doorway open, its posts; three posts up the chimney (world/coldwater.js). |
| The graveyard | Its KEEP OUT sign stood on the trail's centre line | 8 | A sign that lands on a worn trail steps off to its side, up to 2.5 m (`nudgeOffTrail`). |
| The sweep itself | Planks on joists and joists on posts were reported as hanging | | The hang check looks for a support under the item first, as the float check does (tools/sweep/sweep.js). |

**Left for the next batches** (the numbers are in the sweep's per-place files): the trapper's fence where its rails
cross a 0.6 m dip (a fence over a gully, as real fences are; looked at again with AG-124's yard); the hikers' camp on
the trail's end (rule 8: the trail should end at the camp's edge, not run through it); the trapper's cellar hatch and
the cache sharing a footprint (AG-124's yard); the graveyard's open grave and one monument with no collider; the
forest's even spacing (rule 3, nine places); the 15 invisible walls; the cordon gate and the dock's long spans.
