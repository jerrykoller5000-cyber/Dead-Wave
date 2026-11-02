# GP-20007 performance and game check

All game work used the machine-wide test slot on Jerry's RTX 5080, one browser at a time.

`node crew/crew.mjs slot run chatgpt GP-20007 --checks "night20 FP level shortcut-on performance" -- node tools/bench.mjs --night 20 --gfx high --fp pistol --level --seconds 8 --prof`

- Default shortcut-on: 54.6 fps, 38.5 fps 1% low, 0 hitches, 398 draws, 692,184 triangles, 48 zombies, 11.148 s ready.
- `--query shortcuts=0`: 55.4 fps, 35.2 fps 1% low, 0 hitches, 415 draws, 698,252 triangles, 48 zombies, 10.490 s ready.
- The 0.8 fps mean difference and contrary draw/triangle counts indicate scene and timing variance in this short pair. No material regression is established. Full suite belongs to Cursor/Claude's coordinated commit check.

Live camera check in match: holding E with an equipped, fueled chainsaw at landing-rangers advanced the cut, used fuel, produced `lastShotNoise` with `{r:40,w:'chainsaw',suppressed:false}`, and opened the gap after the hold. Each of the five cut centers was collision blocked before and clear after; each band changed from 19 to 9 solids. At fuel-wreck, a test shambler advanced from (-116.8,19) to (-116.9,26.5), then crossed the opened log line at z28 and reached (-116.1,36.1) in about 7.5 s. The valley field was ready after the cut and returned a finite distance at its center.

Same-camera shots: `fuel-wreck-noon.png`, `fuel-wreck-dusk.png`, `fuel-wreck-night.png`, and `fuel-wreck-cut-noon.png`; `landing-rangers-noon.png`, `landing-rangers-cut-noon.png`; `trapper-grave-noon.png` → `trapper-grave-cut-noon.png`; `fuel-mast-noon.png`; `grave-wreck-opposite-noon.png`. The trapper-grave cut leaves a tree canopy over the opening, and fuel-mast has an exposed log end; Claude was asked for rule-10 adjustments. The camera CLI rejects `--time overcast` despite listing it in its internal light names. Antigravity has been asked for the four-light look and prompt check.

## Final placement pass

Claude approved a southeast move of trapper-grave and thicket ties at exposed
ends; the same no-trunk-within-3m rule moved fuel-mast 2.2 m northwest.
Eight thicket anchors joined the existing four instanced wall draws; the
camera reported 1 HQ ring, 5 deadfalls and 8 anchors, still four wall draws.
All five final centers were 1.05 m collision-deflected before cut, 0 after,
with 19 → 9 log solids, finite valley flow distances after worker rebuild,
and at least 3.38 m live-trunk clearance. A shambler crossed the final mast
cut from (-135.5,4.9) to (-124.45,8.30) in 6 s.

After-anchor night-20 high FP-level pairs, 48 zombies, zero hitches each:

- 8 s: on 57.3 fps / 44.3 1% low / 10.223 s ready; off 59.4 / 43.5 / 10.008 s.
- 12 s: on 58.8 fps / 46.0 1% low / 10.193 s ready; off 52.5 / 40.1 / 10.957 s.

The two pairs reverse direction and have changing draw/triangle counts from
different live zombie frames, so neither proves a shortcut cost. There is no
established material frame-rate or ready-time regression. Final matched
`fuel-mast-final-noon.png` → `fuel-mast-final-cut-noon.png` and the moved
trapper/fuel views document the placement. The first camera `reload` timed
out at `Page.navigate`; its own daemon was signaled to close, and the fresh
queued start rendered the final version successfully. The shared slot was
released between camera and benchmark sessions.
