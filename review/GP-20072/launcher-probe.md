# GP-20072 launcher contact probe — 2026-11-09

Shared-slot `tools/camera.mjs start --training` on NVIDIA RTX 5080, ANGLE D3D11. Range feature state was `IDLE` (no active drill); Training Ground had 155 solids. With the launcher loaded, a shot from just beyond the firing line at plate 0 traveled at `47.999999999999986` units/s. The shell was removed at age `0.169` s, well before its `1.2916666666666667` s fuse, at `(6.0136, -198.2188, -632)`, and plate 0 changed from `up` to `down`. The trajectory's `traceTraining` first contact was plate 0 at `(6.0447, -198.1890, -632)`. A separate shot from behind the firing line detonated on its low metal barrier. `review/GP-20072/launcher-range-hit.png` shows the resulting target score, although that static frame was taken after the blast.

A second shared-slot shot at the Training Ground side wall traveled at 48 units/s and disappeared at age `0.1668` s, before its `1.2917` s fuse, at x=`7.7` (the wall's inner face), y=`-198.198`, z=`-635.082`. This verifies the wall contact path as well as the plate path.

The camera was closed with `tools/camera.mjs stop` after each probe, releasing the shared game-test slot. No full suite was run.
