# Claude · CL-28 · freeze the static world (D-23), part 1 · 2026-09-24

## Changed
All in `index.html`.

- **The scene no longer auto-updates its own matrix.** It never moves. Left on auto, it re-marked itself every frame, and that forced every object in the game to recompute its world matrix, moving or not.
- **Batched trees are frozen.** A batched tree is drawn from its cell mesh, but its own group, canopy and meshes were still in the scene. Worse, the breeze kept rotating every canopy, so about 900 hidden objects recomputed their matrices every frame for nothing.
  - `tbFreeze(t, on)` freezes a tree's objects when it goes into a batch and hands them back when it goes live.
  - `updateTreeSway` skips batched trees. A hit changes the tree's snapshot, so it goes live within 3 frames and then sways as before.
- **Foliage chunk meshes** (world-space geometry at the origin) are frozen at creation.

## Measured
`tools/matbench.mjs` (in my copy): `scene.updateMatrixWorld()` on the title screen, best of 5×200, headless CPU.

| | objects | still auto-updating | ms per frame |
|---|---|---|---|
| before | 4807 | 4705 | 0.945 |
| after | 4848 | 2770 | 0.737 |

That is 22% off the matrix pass. It is modest because the pass still walks every object; what's saved is the per-object work.

## Part 2 (not done; for the morning)
- Freeze rocks, landmarks, objective props and the HQ shell with the same helper, unfreezing on `reseatAllProps`.
- Most of the remaining 2770 objects move for real: zombies, wildlife and the player. GB-28 already cheapens far zombies.
- The bigger costs in CU-18's profile, render-list building and draw calls, belong to CU-20's audit.

## Tests
- Full suite in my copy, `--jobs 3`, then every failure re-run alone. All pass except **t35 "jab lands"**: the MedPen is still in hand at 1.1 s. It fails the same way without this change, so it is pre-existing (GP-21 / GB-30 area): → Grokbot.
- t55x and t56x are stale local files only.
- Real GPU: AG-11.
