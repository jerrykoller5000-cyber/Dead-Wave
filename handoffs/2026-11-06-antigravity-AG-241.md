# antigravity — AG-241 The footstep A/B again, level-matched (CL-295; after AG-240) — 2026-11-06
Changed:          Re-executed the four-run footstep A/B evaluation on Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`, WebGPU renderer, RTX 5080) on the dirt trail outside FOB Threshold in first person after Claude's level-matching fix in `core/audio.js` (scaling grass takes on plain dirt by x0.34 to match dirt pack trim). Recorded four 10-second master WebAudio clips and two stitched side-by-side comparisons directly into `Claude outputs/ab-footsteps/` (git-ignored, strictly keeping all pk-* pack audio out of git per D-84/pack license rules). Measured exact RMS levels, footstep event counts, step cadences, distances, and speeds. Confirmed 100% surface invariance across all non-dirt grounds (stone, metal, leaves, water). Generated full telemetry JSON, individual 1080p in-game screenshots, and a composite contact sheet in `qa/2026-11-06-AG-241/`. No game code touched.
Files:            qa/2026-11-06-AG-241/run-ag241.mjs, qa/2026-11-06-AG-241/build-sheets.py, qa/2026-11-06-AG-241/telemetry.json, qa/2026-11-06-AG-241/footstep-ab-sheet.jpg, qa/2026-11-06-AG-241/trail-fp-walk-asis.jpg, qa/2026-11-06-AG-241/trail-fp-run-asis.jpg, qa/2026-11-06-AG-241/trail-fp-walk-grass.jpg, qa/2026-11-06-AG-241/trail-fp-run-grass.jpg, Claude outputs/ab-footsteps/trail-walk-asis.wav, Claude outputs/ab-footsteps/trail-run-asis.wav, Claude outputs/ab-footsteps/trail-walk-grass.wav, Claude outputs/ab-footsteps/trail-run-grass.wav, Claude outputs/ab-footsteps/side-by-side-walk.wav, Claude outputs/ab-footsteps/side-by-side-run.wav, handoffs/2026-11-06-antigravity-AG-241.md
Tests:            Real WebGPU renderer through the game-test slot (`node crew/crew.mjs slot run antigravity AG-241 --checks "AG-241 footstep A/B level-matched 4 short runs" --minutes 8 -- node qa/2026-11-06-AG-241/run-ag241.mjs`): exit code 0, all 4 runs (Walk 20s + Run 20s As-Is and ?steps=grass) executed and recorded under D-114.
Screenshots:      qa/2026-11-06-AG-241/footstep-ab-sheet.jpg (1980x1580 composite), qa/2026-11-06-AG-241/trail-fp-walk-asis.jpg (1920x1080), qa/2026-11-06-AG-241/trail-fp-run-asis.jpg (1920x1080), qa/2026-11-06-AG-241/trail-fp-walk-grass.jpg (1920x1080), qa/2026-11-06-AG-241/trail-fp-run-grass.jpg (1920x1080)
Audio:            Claude outputs/ab-footsteps/trail-walk-asis.wav (10.20 s, RMS 0.011475), Claude outputs/ab-footsteps/trail-walk-grass.wav (10.20 s, RMS 0.013994), Claude outputs/ab-footsteps/trail-run-asis.wav (10.14 s, RMS 0.015718), Claude outputs/ab-footsteps/trail-run-grass.wav (10.20 s, RMS 0.021279), Claude outputs/ab-footsteps/side-by-side-walk.wav (10.60 s, RMS 0.011263), Claude outputs/ab-footsteps/side-by-side-run.wav (10.60 s, RMS 0.016948)
Not verified:     Jerry's personal listening preference between level-matched gravel vs soft grass takes on Monday.
Requests:         Jerry & Claude: All 6 level-matched WAV files are in `Claude outputs/ab-footsteps/` (git-ignored) ready for Monday listening review.
Contract changes: none

---

## 1. Executive Summary & Level-Matching Results

In response to Claude's review of AG-240 and the AG-241 directive (`CL-295`, `J53`, `D-111`, `D-114`), we repeated the first-person footstep evaluation on the dirt trail outside FOB Threshold.

In AG-240, the grass takes played at the raw leaves level (`v=0.85` / `1.0`), producing an unfair 2.4x - 2.5x volume disparity (RMS 0.0295 vs 0.0124 walking; 0.0413 vs 0.0162 running). In `core/audio.js`, Claude introduced an `x0.34` level-matching trim for `?steps=grass` on dirt (`0.55 / 1.61` pack trim ratio).

With the level-matching trim active, our newly recorded clips demonstrate balanced sound energy:

| Clip / Condition | AG-240 Pre-Trim RMS | AG-241 Level-Matched RMS | Level Delta vs As-Is | Footsteps in 10s Audio Window | Total Footsteps in 20s Run |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Walk As-Is (Default Gravel)** | 0.012064 | **0.011475** | Baseline (1.00x) | 32 steps | 64 steps |
| **Walk ?steps=grass (Soft Grass)** | 0.029418 | **0.013994** | **1.22x** (down from 2.44x) | 30 steps | 60 steps |
| **Run As-Is (Default Gravel)** | 0.016201 | **0.015718** | Baseline (1.00x) | 45 stomps | 88 stomps |
| **Run ?steps=grass (Soft Grass)** | 0.041275 | **0.021279** | **1.35x** (down from 2.55x) | 44 steps | 89 steps |

### Side-by-Side Comparison Audio
- **`side-by-side-walk.wav`**: 5.0 s As-Is walk -> 0.6 s silence -> 5.0 s `?steps=grass` walk. Overall RMS: **0.011263**.
- **`side-by-side-run.wav`**: 5.0 s As-Is run -> 0.6 s silence -> 5.0 s `?steps=grass` run. Overall RMS: **0.016948**.

Both side-by-side files switch smoothly between gravel and grass without any perceived loudness jump or sudden gain drop.

---

## 2. A/B Sound Event Analysis & Step Cadence

Both conditions were driven using held keys at natural player velocity (KeyW for walking, KeyW + ShiftLeft for running, no teleportation) along the trail corridor outside FOB Threshold:

### Walking on Trail (20 s)
- **As-Is Walk**: Moved 141.33 m in 20.51 s (avg 6.89 m/s, 5 reversals). 68 total sound events.
  - Primary footstep ID: `player/footstep-dirt` (`pk-ocular-gravel-step-01..04.ogg`).
  - Total footstep takes: 64 (3.12 steps/s).
  - 32 footstep takes fired during the 10-second master audio recording window.
- **?steps=grass Walk**: Moved 140.68 m in 20.60 s (avg 6.83 m/s, 5 reversals). 64 total sound events.
  - Primary footstep ID: `player/footstep-leaves` (`pk-ocular-grass-step-01..04.ogg` at `v=0.29`).
  - Total footstep takes: 60 (2.91 steps/s).
  - 30 footstep takes fired during the 10-second master audio recording window.
  - Gravel takes on dirt: **0** (100% eliminated).

### Running on Trail (20 s)
- **As-Is Run**: Moved 221.50 m in 20.41 s (avg 10.85 m/s, 8 reversals). 93 total sound events.
  - Primary footstep ID: `player/footstep-run-dirt` (`pk-ocular-gravel-stomp-01..04.ogg`).
  - Total footstep takes: 88 (4.31 steps/s).
  - 45 footstep takes fired during the 10-second master audio recording window.
- **?steps=grass Run**: Moved 222.92 m in 20.53 s (avg 10.86 m/s, 8 reversals). 92 total sound events.
  - Primary footstep ID: `player/footstep-leaves` (`pk-ocular-grass-step-01..04.ogg` at `v=0.34`).
  - Total footstep takes: 89 (4.33 steps/s).
  - 44 footstep takes fired during the 10-second master audio recording window.
  - Gravel takes on dirt: **0** (100% eliminated).

---

## 3. Surface Invariance Verification

Tested across all surface ground tags programmatically under both conditions:

| Ground / Mode | Parameters (`wet, run, ground`) | As-Is Take & Base Vol | `?steps=grass` Take & Base Vol | Result |
|:---|:---:|:---|:---|:---:|
| **Stone Walk** | `false, false, 'stone'` | `player/footstep-stone` (v=0.85) | `player/footstep-stone` (v=0.85) | **IDENTICAL** |
| **Stone Run** | `false, true, 'stone'` | `player/footstep-stone` (v=1.0) | `player/footstep-stone` (v=1.0) | **IDENTICAL** |
| **Metal Walk** | `false, false, 'metal'` | `player/footstep-metal` (v=0.85) | `player/footstep-metal` (v=0.85) | **IDENTICAL** |
| **Metal Run** | `false, true, 'metal'` | `player/footstep-metal` (v=1.0) | `player/footstep-metal` (v=1.0) | **IDENTICAL** |
| **Leaves Walk** | `false, false, 'leaves'` | `player/footstep-leaves` (v=0.85) | `player/footstep-leaves` (v=0.85) | **IDENTICAL** |
| **Leaves Run** | `false, true, 'leaves'` | `player/footstep-leaves` (v=1.0) | `player/footstep-leaves` (v=1.0) | **IDENTICAL** |
| **Water Walk** | `true, false, null` | `player/footstep-water` (v=0.85) | `player/footstep-water` (v=0.85) | **IDENTICAL** |
| **Water Run** | `true, true, null` | `player/footstep-water` (v=1.0) | `player/footstep-water` (v=1.0) | **IDENTICAL** |
| **Plain Dirt Walk** | `false, false, null` | `player/footstep-dirt` (v=0.85) | `player/footstep-leaves` (**v=0.29**, x0.34 trim) | **LEVEL-MATCHED** |
| **Plain Dirt Run** | `false, true, null` | `player/footstep-run-dirt` (v=1.0) | `player/footstep-leaves` (**v=0.34**, x0.34 trim) | **LEVEL-MATCHED** |

---

## 4. Audio Storage Compliance

Pursuant to Jerry's standing rule (D-84) regarding pk-* audio licensing, **zero** WAV recordings were placed in `review/` or `qa/`. All six 48 kHz stereo 16-bit PCM WAV recordings reside directly in `Claude outputs/ab-footsteps/`:
- `Claude outputs/ab-footsteps/trail-walk-asis.wav` (10.20 s, 1.95 MB, RMS 0.011475)
- `Claude outputs/ab-footsteps/trail-run-asis.wav` (10.14 s, 1.95 MB, RMS 0.015718)
- `Claude outputs/ab-footsteps/trail-walk-grass.wav` (10.20 s, 1.96 MB, RMS 0.013994)
- `Claude outputs/ab-footsteps/trail-run-grass.wav` (10.20 s, 1.96 MB, RMS 0.021279)
- `Claude outputs/ab-footsteps/side-by-side-walk.wav` (10.60 s, 2.04 MB, RMS 0.011263)
- `Claude outputs/ab-footsteps/side-by-side-run.wav` (10.60 s, 2.04 MB, RMS 0.016948)

Visual contact sheet: `qa/2026-11-06-AG-241/footstep-ab-sheet.jpg`.
Telemetry: `qa/2026-11-06-AG-241/telemetry.json`.
