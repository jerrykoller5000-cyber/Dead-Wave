# GP-20006 wall-band checks, 2026-11-01

Both game runs used the machine-wide test slot, one browser each, RTX 5080,
`--night 20 --gfx high --fp pistol --level --seconds 12 --prof`. The only
query difference was `--query walls=1` on the second run. Each ended with 48
zombies out. These short sequential samples show no measured speed loss; the
on run was faster, so the change in fps is best treated as run-to-run variance.

| Measure | Off | On |
| --- | ---: | ---: |
| Ready | 9.530 s | 9.645 s |
| Mean fps, last 10 s | 45.9 | 53.1 |
| 1% low fps | 30.2 | 37.1 |
| Frame | 21.79 ms | 18.83 ms |
| Render section | 11.29 ms | 9.76 ms |
| Zombies section | 2.45 ms | 2.29 ms |
| Draws | 500 | 503 |
| Triangles | 693,292 | 767,818 |

MU-22 estimated 300-600 circle solids and negligible local lookup cost. At
the time of this pair the ring generated 373 solids, 5 trail crossings and one
river opening. The four visual meshes added about 74,526 triangles to the
level view. The 0.115 s ready difference and frame timings do not establish a
regression in this pair. CU-209 changed the live trails after these runs, and
Claude changed the opening rule to path-following corridors. The latest preview
registers 355 solids and 4 trail corridors. Repeat the paired measurement
after the W1 trail layout settles.

The current corridor rule received a second queued 12 s pair with the same
night-20 high FP-level profile setup (48 zombies in both). Off: ready 10.749 s,
54.4 fps, 38.3 1% low, 18.38 ms frame, 8.96 ms render, 1.82 ms zombies,
407 draws and 651,487 triangles. On: ready 10.196 s, 58.2 fps, 41.3 1% low,
17.18 ms frame, 7.82 ms render, 2.21 ms zombies, 415 draws and 704,489
triangles. The on run again had better whole-frame and low-percentile timing;
the zombie section was 0.39 ms higher. These sequential samples establish no
whole-frame slowdown, but the section difference and W1's still-moving paths
should be rechecked with the full integration suite. MU-22's predicted count
range still holds (355 circle solids in the tested layout).

Real game collision probes from `window.TT.wallBandsDbg` with `?walls=1`:
the earlier first trail crossing at (59.56, 7.27) was unblocked and
`resolveStaticProps` left it unchanged. With Claude's corridor rule and the
current paths, all four ring crossings were unblocked and produced zero
resolver movement. A closed span at (-60, 0) was blocked; the resolver moved
the body radially to (-62.35, 0). Before the nearest-band
movement fix, the same probe slid about 7.5 m sideways through an ordered
chain of circle solids. The circles remain registered for building and the
flow field; movement handles the band's continuous polyline once.

Screenshots from the queued real-GPU camera:
`ring-before-noon.png`, `ring-closed-noon-v2.png`,
`ring-closed-dusk.png`, `ring-closed-night.png`,
`ring-outside-noon.png`, `trail-gap-noon.png`, `trail-gap-dusk.png`,
`ring-closed-noon-final.png`, `river-gap-noon.png`,
`ring-corridor-before-noon.png`, `ring-corridor-noon.png`,
`trail11-corridor-before-noon.png`, `trail11-corridor-noon.png`,
`trail11-corridor-dusk.png`.
