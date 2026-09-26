# Handoff from Claude (Cowork) — water + caves, overnight 2026-09-23

Claude finished its work on `index.html` at about 05:05 (desktop file mtime 1790157614744) and has merged every save made by the other agents up to that point.

**Claude could not commit or push.** This machine's Linux workspace would not start, so Claude has no local git. The cloud sandbox has no credentials for the private GitHub repo. Whoever finishes last (Cursor, or Jerry in the morning): please commit and push `feature/Phis-changes` with the message below.

## Suggested commit message

```
Water rework, cave fixes, and one surface where the river meets the lake

Water
- River bed re-solved so the river reaches lake level where it enters the
  lake; the lake no longer cuts the river corridor out of itself. This is
  what removes the rectangular box and dry notch at the river mouth.
- The river carve no longer builds levees inside the lake.
- A single water mesh covers lake and river. It carries depth and flow per
  vertex; the shader handles depth colour, see-through shallows, a flowing
  river pattern, gentle lake swell and shore/rapids foam. This fixes the
  white, mirror-like water.
- Beds get sand, silt, weed patches and river cobble. A damp margin runs
  above the waterline, and beaches only appear in stretches.
- Added reeds, cattails, submerged weed, bed stones and lily-pad patches.
  Added ferns, long grass and flowers along the banks. Anything left
  standing in water is removed.
- Fish swim in schools. They hold station against the river current, keep
  out of the shallows, bolt from the player, rise to the surface and
  occasionally leap.
- Lily pads (wildlife) now spawn in still lake water; frogs spawn at any
  water's edge.

Caves
- The cave fallback no longer drops a hill on the river mouth; the wet cave
  now sits in the west. Themes are fixed per compass sixth, so finished
  caves stay put.
- The corridor cut no longer runs out of the mouth as a trench, which had
  also cleared a line of trees across the map.
- The dooryard follows the lie of the land. Hills are smoothed, and the
  hill holds the face and brow.
- Hills are fenced by colliders so they can't be climbed; boulders are
  solid.
- Hills are grassed, with shrubs and trees. Turf is seeded over the lip,
  roots on the root cave run over the hill, and the wet cave has no
  floating moss specks.
- The dark stays black in fog.
```

## Files changed by Claude
- `index.html` (merged with the other agents' changes through mtime 1790157614744)
- `Claude outputs/water_after.jpg`, `Claude outputs/caves_all_six.jpg`, `Claude outputs/north_cave_before_after.jpg` (screenshots; OK to leave out of the commit)
