# antigravity — AG-103 After Grokbot's GB-202 lands: the night-20 bench and the fixed reds — 2026-10-20
Changed:          Ran `node tools/bench.mjs --night 20 --gfx high --prof --cpu --alloc` three times after `GB-202` and `GP-19941` landed (`qa/2026-10-20-AG-103/bench-3x-summary.json`: median `52.3 fps` / best `56.0 fps`, `1% low 21.3 fps` / best `24.3 fps`, `tick 15.42 ms` / best `14.50 ms`, `892.7 kB/frame` / best `858.8 kB/frame`, `264` draws) and ran the targeted fixed-reds batch (`qa/2026-10-20-AG-103/fixed-reds.log`), confirming all 19 fixed tests (`t37 t50 t59 t74 t75 t76 t91 t96 t99 t116 t124 t126 t193 t206 t209 t223 t253 t266 t268`) pass 100% green (`330 pass, 0 fail`).
Files:            qa/2026-10-20-AG-103/run-bench3x.mjs, qa/2026-10-20-AG-103/bench-run1.log, qa/2026-10-20-AG-103/bench-run2.log, qa/2026-10-20-AG-103/bench-run3.log, qa/2026-10-20-AG-103/bench-3x-summary.json, qa/2026-10-20-AG-103/run-fixed-reds.mjs, qa/2026-10-20-AG-103/fixed-reds.log
Tests:            Targeted fixed-reds run (`21 checks`) → all 19 fixed tests (`t37 t50 t59 t74 t75 t76 t91 t96 t99 t116 t124 t126 t193 t206 t209 t223 t253 t266 t268`) passed `330 pass, 0 fail`; only open reds in the 21-test batch are `t222` (`3 pass, 6 fail`, Grokbot `GB-206`) and `t244` (`3 pass, 6 fail`, real-renderer mortar test); new tests: none
Screenshots:      none (benchmark logs and test logs in `qa/2026-10-20-AG-103/`)
Not verified:     None
Requests:         FYI to grokbot (`tools/tests/t269.js` temporary probe file)
Contract changes: none

## Rule 16 (Game-test slot)
Both the 3x Night-20 `--prof --cpu --alloc` benchmark and the 21-test targeted fixed-reds batch were queued and run strictly one at a time (`--jobs 1`) through the machine-wide game-test slot.

## 1. Night 20 High (`--prof --cpu --alloc`) — 3x Benchmark (`qa/2026-10-20-AG-103/bench-3x-summary.json`)

| Metric | `AG-97` (pre-alloc cuts, no `--alloc` sampler) | `GP-19940` (post-waist/acid cuts, `--alloc`) | `AG-103` Run 1 | `AG-103` Run 2 | `AG-103` Run 3 | `AG-103` Median (Best) |
| --- | --- | --- | --- | --- | --- | --- |
| **FPS** | `55.9 fps` | `54.1 fps` | `52.3 fps` | `56.0 fps` | `49.7 fps` | **`52.3 fps` (`56.0 fps`)** |
| **1% Low FPS** | `29.7 fps` | — | `21.3 fps` | `24.3 fps` | `20.5 fps` | **`21.3 fps` (`24.3 fps`)** |
| **Frame (`frameMs`)** | `17.90 ms` | — | `19.12 ms` | `17.86 ms` | `20.12 ms` | **`19.12 ms` (`17.86 ms`)** |
| **Tick (`tickMs`)** | `14.31 ms` | — | `15.42 ms` | `14.50 ms` | `16.85 ms` | **`15.42 ms` (`14.50 ms`)** |
| **Outside (`outsideMs`)** | `3.59 ms` | — | `3.70 ms` | `3.36 ms` | `3.27 ms` | **`3.36 ms` (`3.27 ms`)** |
| **GPU (`gpuMs`)** | `0.26 ms` | — | `0.31 ms` | `0.31 ms` | `0.30 ms` | **`0.31 ms` (`0.30 ms`)** |
| **Alloc (`kB/frame`)** | *(1,558.1 kB)* | `953.6 kB` | `892.7 kB` (`50.1 MB/s`) | `858.8 kB` (`49.7 MB/s`) | `925.3 kB` (`49.6 MB/s`) | **`892.7 kB` (`858.8 kB`)** |
| **Draws / Tris** | `265` / `728k` | — | `269` / `711,284` | `259` / `700,900` | `264` / `708,588` | **`264` / `708,588`** |

### `prof.spikes` (Frames > 50 ms with `heapMB` / `freedMB`)
- **Run 1 (`8` spikes listed)**:
  - `frame 212`: `73.8 ms` (`r:render 67.2`, `r:matrices 1.6`, `zombies 1.5`, `m:hold 0.8`), `heapMB: 858.6`, `freedMB: -19.2`
  - `frame 544`: `50.6 ms` (`zombies 34.4`, `r:render 6.2`, `m:reticle+ghost 3.3`, `r:matrices 1.7`), `heapMB: 821.2`, `freedMB: 33.2`
  - `frame 1038`: `52.4 ms` (`r:render 43.6`, `zombies 3.6`, `r:matrices 1.7`, `m:hold 0.7`), `heapMB: 829.8`, `freedMB: 22.6`
  - `frame 1315`: `52.5 ms` (`r:render 42.9`, `zombies 3.6`, `r:matrices 2.0`, `r:cull 0.8`), `heapMB: 846.1`, `freedMB: -9.9`
  - `frame 1503`: `58.6 ms` (`r:render 49.1`, `zombies 4.2`, `r:matrices 2.0`, `m:idle 0.7`), `heapMB: 891.2`, `freedMB: -10.0`
  - `frame 1570`: `54.4 ms` (`r:render 42.3`, `zombies 6.9`, `r:matrices 1.8`, `m:hold 0.7`), `heapMB: 894.7`, `freedMB: -10.3`
  - `frame 1645`: `50.2 ms` (`r:render 40.9`, `zombies 4.2`, `r:matrices 1.8`, `r:cull 0.8`), `heapMB: 898.8`, `freedMB: -9.9`
  - `frame 1714`: `66.0 ms` (`r:render 41.4`, `zombies 14.1`, `r:matrices 2.4`, `m:hold 1.7`), `heapMB: 840.0`, `freedMB: 6.2`
- **Run 2 (`3` spikes listed)**:
  - `frame 33`: `55.2 ms` (`r:render 47.5`, `zombies 1.9`, `r:matrices 1.7`, `m:hold 0.6`), `heapMB: 833.4`, `freedMB: -9.8`
  - `frame 1536`: `57.0 ms` (`r:render 44.9`, `zombies 4.4`, `r:matrices 2.6`, `r:cull 1.2`), `heapMB: 899.5`, `freedMB: -9.8`
  - `frame 1543`: `55.4 ms` (`r:render 47.6`, `zombies 2.9`, `r:matrices 1.7`, `w:minimap 0.6`), `heapMB: 882.1`, `freedMB: 22.6`
- **Run 3 (`8` spikes listed)**:
  - `frame 332`: `55.4 ms` (`r:render 48.0`, `zombies 2.0`, `r:matrices 2.0`, `m:hold 0.8`), `heapMB: 939.8`, `freedMB: -9.7`
  - `frame 427`: `53.1 ms` (`r:render 45.8`, `zombies 2.0`, `r:matrices 1.8`, `r:cull 0.6`), `heapMB: 942.2`, `freedMB: -9.8`
  - `frame 599`: `54.2 ms` (`r:render 45.3`, `zombies 3.2`, `r:matrices 2.0`, `m:pose 0.6`), `heapMB: 963.8`, `freedMB: -9.8`
  - `frame 696`: `52.1 ms` (`r:render 43.7`, `r:matrices 2.4`, `zombies 2.4`, `m:hold 1.0`), `heapMB: 957.6`, `freedMB: -9.8`
  - `frame 832`: `51.2 ms` (`r:render 42.9`, `zombies 2.5`, `r:matrices 2.4`, `r:cull 0.7`), `heapMB: 959.1`, `freedMB: -9.8`
  - `frame 1201`: `54.9 ms` (`r:render 46.7`, `zombies 2.5`, `r:matrices 2.1`, `m:hold 0.7`), `heapMB: 984.4`, `freedMB: -8.9`
  - `frame 1277`: `50.9 ms` (`r:render 42.1`, `zombies 3.6`, `r:matrices 1.9`, `m:hold 0.7`), `heapMB: 978.7`, `freedMB: -9.9`
  - `frame 1282`: `52.1 ms` (`r:render 44.1`, `zombies 3.4`, `r:matrices 1.9`, `m:hold 0.4`), `heapMB: 960.5`, `freedMB: 22.5`

---

## 2. Targeted Fixed-Reds Run (`qa/2026-10-20-AG-103/fixed-reds.log`)

Verbatim output:
```text
check-players: 303 player.position reads, all in the allowed places
ok    t37     17 pass   0 fail  164.5s
ok    t50     18 pass   0 fail  26.0s
ok    t59     48 pass   0 fail  71.9s
ok    t74     18 pass   0 fail  55.4s
ok    t75     16 pass   0 fail  50.8s
ok    t76     16 pass   0 fail  57.4s
ok    t91      7 pass   0 fail  51.1s
ok    t96     19 pass   0 fail  53.3s
           INFO 120 spawned, 120 alive after 105.8 s and 26 legs (650 ticks)
ok    t99      6 pass   0 fail  149.6s
ok    t116     7 pass   0 fail  52.2s
ok    t124     5 pass   0 fail  52.8s
ok    t126    12 pass   0 fail  53.2s
           INFO on the flat, walking, the lowest sole is -0.029 m
ok    t193    18 pass   0 fail  73.3s
ok    t206    19 pass   0 fail  66.6s
ok    t209    13 pass   0 fail  56.1s
FAIL  t222     3 pass   6 fail  195.7s
ok    t223    15 pass   0 fail  76.0s
FAIL  t244     3 pass   6 fail  48.3s
ok    t253    24 pass   0 fail  77.7s
ok    t266    32 pass   0 fail  58.9s
ok    t268    20 pass   0 fail  50.4s

21 checks: 336 pass, 12 fail
```
All **19** fixed tests (`t37 t50 t59 t74 t75 t76 t91 t96 t99 t116 t124 t126 t193 t206 t209 t223 t253 t266 t268`) passed with **330 pass, 0 fail**.
