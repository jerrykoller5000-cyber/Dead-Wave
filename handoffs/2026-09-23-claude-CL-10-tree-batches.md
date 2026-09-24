# claude — CL-10 Tree batches — 2026-09-23
Changed:          Far trees draw from merged copies: the map is cut into 64 m cells, each with one
                  wood mesh and one canopy mesh baked in world space with the existing tree
                  materials. A tree draws from its own meshes, exactly as before, while it is in
                  the shadow square around the player (SHADOW_NEAR + 4 m), or from the moment
                  anything about it changes (shot, burnt, felled, trimmed, faded, hidden, moved,
                  removed). A changed tree rejoins its cell only after restoreTree and once far.
                  ?trees=single turns it off.
Files:            index.html (flora: the batch block after scatterTrees; restoreTree's last line;
                  updateWorldAnimations' last line; buildTreeBatches() before the
                  'contact shading' load mark; TT exports), tools/tests/t50.js (new),
                  tools/tests/t46.js (waits up to 3 s for the dust instead of 0.4 s: same
                  threshold, for loaded machines)
Tests:            npm test (headless, jobs 2, cloud copy with the 22:57 index.html + this patch):
                  54 checks, 611 pass, 10 fail. The 10 are t13 (2: D-12, GB-12), t34 (3: fails here
                  without the patch too), and t17 (2), t24 (1), t35 (2), which are timing flakes
                  on this machine: rerun one at a time, t17 failed without the patch and passed
                  with it twice; t24 failed once with it and passed without; t35 passed both ways.
                  Cursor's run on Jerry's PC before this patch: 588 pass, 3 fail (t13, t46).
                  t50 (new): 17 pass. Ran t33 and t35 six more times each against the same index
                  with and without the patch: see "Not verified".
Numbers:          (headless scene graph, player at the HQ)
                  - tree meshes drawn: ~860 before, ~190 after (85 own + 102 cell meshes);
                    visible meshes in the whole scene 2491 → ~1850.
                  - 409 of 430 trees batched at the HQ; 51 cells.
                  - build at load: ~250 ms headless (it runs once, before the warm-up compile).
                  - per frame: 0.2–0.7 ms headless (a change check on a third of the trees each
                    frame, distance for all; at most 12 distance swaps a frame).
                  - memory: +~65 MB of JS arrays (the merged copies). GPU memory should be about
                    the same: far trees' own buffers are no longer uploaded.
Screenshots:      none. No GPU here; Antigravity takes it (AG-6).
Not verified:     - Real GPU: frame rate, and that nothing pops, flickers or doubles as trees swap
                    at ~46 m. It uses plain Mesh + BufferGeometry, the path trunks already use (not
                    the InstancedMesh that went wrong on WebGPU before), and partial buffer
                    uploads (addUpdateRange), which three r175's WebGPU backend supports.
                  - Frustum culling is per cell now, so a partly visible cell draws all of it:
                    fewer draws, possibly more triangles. AG-6 measures the net.
                  - Timing-sensitive checks: t33 (mortar ring) flakes with and without the patch
                    here; t35 (MedPen jab) failed 1 in 3 with the first version of the patch and 0
                    in 7 without it, so I cut the per-frame cost (the sliced change check) and it
                    then passed 4 of 4. t43 flakes 1 in 6 without the patch (extra shamblers
                    alive, not from the queue): sent to Grokbot.
                  - A far tree that is hit shows its batch copy for at most two more frames.
Requests:         Antigravity AG-6 (real GPU walk and frame rate). Grokbot: t43 flake.
Contract changes: none between owners. New TT debug exports: treeBatchStats, updateTreeBatches,
                  getTreeBatches.
