# antigravity — AG-237 t298 on the real renderer after CL-302 (CU-240) — 2026-11-06
Changed:          Run t298 five times through the game-test slot on the real WebGPU renderer after Claude's CL-302 flight snapshot zombie plain-field persistence fix (handed over under D-115). Confirmed CL-302 holds cleanly on the real renderer: 5/5 runs PASS (10/0 each), with lateC = 0.0001 m (0.1 mm, 10x below the 1 mm bar) and opening eye-ease worstC = 0.0043..0.0044 m at frame 0 across all runs. No code changes.
Files:            qa/2026-11-06-AG-237/run1.log, qa/2026-11-06-AG-237/run2.log, qa/2026-11-06-AG-237/run3.log, qa/2026-11-06-AG-237/run4.log, qa/2026-11-06-AG-237/run5.log, handoffs/2026-11-06-antigravity-AG-237.md
Tests:            Real WebGPU renderer through the slot (node tools/realtest.mjs t298 --all): 5 runs, 50 pass, 0 fail (10/0 per run, 5/5 green). Full suite not run.
Screenshots:      none (behavioural replay telemetry logged in qa/2026-11-06-AG-237/)
Not verified:     Full test suite (coordinated integration job). No game code or test bars touched.
Requests:         none
Contract changes: none

## Five Real-Renderer Runs Summary

Rule 16: each run was queued and executed individually through `node crew/crew.mjs slot run antigravity AG-237 -- node tools/realtest.mjs t298 --all` with `--jobs 1` on the real GPU renderer. Adhered to D-114 (five short runs, no long batches).

| Run | Duration | Result | Seed | `lateC` (bar < 1.0 mm) | Eye-Ease `worstC` (bar < 20.0 mm) | Status |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 33.2s | 10 pass, 0 fail | 3261189596 | 0.0001 m (0.1 mm) | 0.0043 m (4.3 mm) at frame 0 | **PASS** |
| 2 | 31.6s | 10 pass, 0 fail | 1165606930 | 0.0001 m (0.1 mm) | 0.0044 m (4.4 mm) at frame 0 | **PASS** |
| 3 | 31.5s | 10 pass, 0 fail | 528950346  | 0.0001 m (0.1 mm) | 0.0043 m (4.3 mm) at frame 0 | **PASS** |
| 4 | 32.2s | 10 pass, 0 fail | 1751721995 | 0.0001 m (0.1 mm) | 0.0043 m (4.3 mm) at frame 0 | **PASS** |
| 5 | 33.0s | 10 pass, 0 fail | 1898851593 | 0.0001 m (0.1 mm) | 0.0043 m (4.3 mm) at frame 0 | **PASS** |

### Verdict on CL-302 Plain-Field Snapshot Fix
CL-302's plain-field snapshot fix (`flightTakeSnap` / `flightPlaceZombies`) completely resolves the `t298` `lateC` eye-ease regression on the real WebGPU renderer. In all five runs on fresh pages with distinct seeds, `lateC` remained rock-solid at `0.0001 m` (0.1 mm), well below the `0.001 m` (1 mm) threshold, with zero frame-147..186 guard-aim divergence. CL-302's snapshot holds 5/5 on the real renderer (matching Claude's 7/7 result in the cloud).

## Full Run Outputs

### Run 1 (`qa/2026-11-06-AG-237/run1.log`)
```
GRANT antigravity AG-237: starting one game-test command
ok    t298     10 pass   0 fail  33.2s  (real renderer)
    PASS the recorder is on TT
    PASS Math.random is the seeded generator (seed 3261189596)
    PASS first person settled before the clip (1)
    PASS the clip has 600 frames and 4 snapshots
    PASS the clip names the seed and the field of view
    PASS the player matches within 1 mm (0.00000 m)
    PASS the camera direction matches within 0.01 deg (0.0000)
    PASS after the eye ease the camera position matches within 1 mm (0.0001 m)
    PASS the opening frames stay within 20 mm while the eye catches the head (0.0043 m at frame 0)
    PASS replay drove the frames itself
1 checks: 10 pass, 0 fail (real renderer)
```

### Run 2 (`qa/2026-11-06-AG-237/run2.log`)
```
GRANT antigravity AG-237: starting one game-test command
ok    t298     10 pass   0 fail  31.6s  (real renderer)
    PASS the recorder is on TT
    PASS Math.random is the seeded generator (seed 1165606930)
    PASS first person settled before the clip (1)
    PASS the clip has 600 frames and 4 snapshots
    PASS the clip names the seed and the field of view
    PASS the player matches within 1 mm (0.00000 m)
    PASS the camera direction matches within 0.01 deg (0.0000)
    PASS after the eye ease the camera position matches within 1 mm (0.0001 m)
    PASS the opening frames stay within 20 mm while the eye catches the head (0.0044 m at frame 0)
    PASS replay drove the frames itself
1 checks: 10 pass, 0 fail (real renderer)
```

### Run 3 (`qa/2026-11-06-AG-237/run3.log`)
```
GRANT antigravity AG-237: starting one game-test command
ok    t298     10 pass   0 fail  31.5s  (real renderer)
    PASS the recorder is on TT
    PASS Math.random is the seeded generator (seed 528950346)
    PASS first person settled before the clip (1)
    PASS the clip has 600 frames and 4 snapshots
    PASS the clip names the seed and the field of view
    PASS the player matches within 1 mm (0.00000 m)
    PASS the camera direction matches within 0.01 deg (0.0000)
    PASS after the eye ease the camera position matches within 1 mm (0.0001 m)
    PASS the opening frames stay within 20 mm while the eye catches the head (0.0043 m at frame 0)
    PASS replay drove the frames itself
1 checks: 10 pass, 0 fail (real renderer)
```

### Run 4 (`qa/2026-11-06-AG-237/run4.log`)
```
GRANT antigravity AG-237: starting one game-test command
ok    t298     10 pass   0 fail  32.2s  (real renderer)
    PASS the recorder is on TT
    PASS Math.random is the seeded generator (seed 1751721995)
    PASS first person settled before the clip (1)
    PASS the clip has 600 frames and 4 snapshots
    PASS the clip names the seed and the field of view
    PASS the player matches within 1 mm (0.00000 m)
    PASS the camera direction matches within 0.01 deg (0.0000)
    PASS after the eye ease the camera position matches within 1 mm (0.0001 m)
    PASS the opening frames stay within 20 mm while the eye catches the head (0.0043 m at frame 0)
    PASS replay drove the frames itself
1 checks: 10 pass, 0 fail (real renderer)
```

### Run 5 (`qa/2026-11-06-AG-237/run5.log`)
```
GRANT antigravity AG-237: starting one game-test command
ok    t298     10 pass   0 fail  33.0s  (real renderer)
    PASS the recorder is on TT
    PASS Math.random is the seeded generator (seed 1898851593)
    PASS first person settled before the clip (1)
    PASS the clip has 600 frames and 4 snapshots
    PASS the clip names the seed and the field of view
    PASS the player matches within 1 mm (0.00000 m)
    PASS the camera direction matches within 0.01 deg (0.0000)
    PASS after the eye ease the camera position matches within 1 mm (0.0001 m)
    PASS the opening frames stay within 20 mm while the eye catches the head (0.0043 m at frame 0)
    PASS replay drove the frames itself
1 checks: 10 pass, 0 fail (real renderer)
```
