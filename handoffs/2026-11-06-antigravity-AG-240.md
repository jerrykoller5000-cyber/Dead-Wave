# antigravity — AG-240 The footstep A/B, his way (CL-295) — 2026-11-06
Changed:          Executed the four-run footstep A/B evaluation on Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`, WebGPU renderer, RTX 5080) on the dirt trail outside FOB Threshold in first person: 20 s walk and 20 s run as-is (default gravel takes), and 20 s walk and 20 s run with `?steps=grass` (soft grass takes on plain dirt). Captured exact AudioSys trace lists for every sound event, step cadences, distances, and speeds without modifying game files. Programmatically verified ground invariance across all other surfaces (stone, metal, leaves, water). Recorded 10 seconds of master WebAudio directly from the renderer output via MediaRecorder + `decodeAudioData` into 48 kHz 16-bit stereo WAV files for each condition, plus stitched side-by-side comparison tracks in `review/AG-240/` for Jerry's Monday listening review. Built full telemetry JSON, individual 1080p in-game screenshots, and a composite contact sheet. No game code touched.
Files:            qa/2026-11-06-AG-240/run-ag240.mjs, qa/2026-11-06-AG-240/build-sheets.py, qa/2026-11-06-AG-240/telemetry.json, qa/2026-11-06-AG-240/footstep-ab-sheet.jpg, qa/2026-11-06-AG-240/trail-fp-walk-asis.jpg, qa/2026-11-06-AG-240/trail-fp-run-asis.jpg, qa/2026-11-06-AG-240/trail-fp-walk-grass.jpg, qa/2026-11-06-AG-240/trail-fp-run-grass.jpg, review/AG-240/trail-walk-asis.wav, review/AG-240/trail-run-asis.wav, review/AG-240/trail-walk-grass.wav, review/AG-240/trail-run-grass.wav, review/AG-240/side-by-side-walk.wav, review/AG-240/side-by-side-run.wav, handoffs/2026-11-06-antigravity-AG-240.md
Tests:            Real WebGPU renderer through the game-test slot (`node crew/crew.mjs slot run antigravity AG-240 --checks "AG-240 footstep A/B 4 short runs" --minutes 8 -- node qa/2026-11-06-AG-240/run-ag240.mjs`): exit code 0, all 4 runs (Walk 20s + Run 20s As-Is and ?steps=grass) executed and recorded under D-114.
Screenshots:      qa/2026-11-06-AG-240/footstep-ab-sheet.jpg (1980x1540 composite), qa/2026-11-06-AG-240/trail-fp-walk-asis.jpg (1920x1080), qa/2026-11-06-AG-240/trail-fp-run-asis.jpg (1920x1080), qa/2026-11-06-AG-240/trail-fp-walk-grass.jpg (1920x1080), qa/2026-11-06-AG-240/trail-fp-run-grass.jpg (1920x1080)
Audio:            review/AG-240/trail-walk-asis.wav (10.14 s), review/AG-240/trail-run-asis.wav (10.14 s), review/AG-240/trail-walk-grass.wav (10.08 s), review/AG-240/trail-run-grass.wav (10.26 s), review/AG-240/side-by-side-walk.wav (10.60 s), review/AG-240/side-by-side-run.wav (10.60 s)
Not verified:     Jerry's personal aesthetic preference on Monday between the crunching gravel takes and the soft grass takes.
Requests:         Jerry & Claude: WAV files ready in `review/AG-240/` for Monday comparison listening.
Contract changes: none

---

## 1. Executive Summary & Test Protocol

In compliance with Jerry's orders (**AG-240**, `CL-295`, `J53`, `D-111`, and `D-114`), we executed four short runs from Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`) on real WebGPU hardware, evaluating player footstep audio in first person on the dirt trail outside FOB Threshold:

1. **Condition A: As-Is (Default Gravel)**:
   - **Walk (20.47 s)**: Moved 140.91 m along dirt corridor (avg 6.88 m/s, 5 reversals, distToPath 0.570 m). 66 total sound events.
   - **Run (20.57 s)**: Moved 223.15 m along dirt corridor (avg 10.85 m/s, 8 reversals, distToPath 3.125 m). 93 total sound events.
2. **Condition B: ?steps=grass (Soft Grass Takes on Plain Dirt)**:
   - **Walk (20.46 s)**: Moved 139.85 m along dirt corridor (avg 6.83 m/s, 5 reversals, distToPath 0.741 m). 67 total sound events.
   - **Run (20.62 s)**: Moved 223.88 m along dirt corridor (avg 10.86 m/s, 8 reversals, distToPath 3.869 m). 93 total sound events.

Both conditions were run using keys held at natural player speed (KeyW for walk, KeyW + ShiftLeft for run; no teleportation). In every run, a 10-second master WebAudio stream was captured during the steady midpoint of movement (seconds 5.0 through 15.0) directly from the WebAudio master output node and encoded to clean 48 kHz 16-bit stereo PCM WAV files.

---

## 2. A/B Sound Event Analysis & Comparison

### Walking on Trail (20 s)
| Metric / Sound Event | As-Is (Default) | `?steps=grass` | Notes |
|:---|:---:|:---:|:---|
| **Primary Footstep Sound ID** | `player/footstep-dirt` | `player/footstep-leaves` | Soft grass takes cleanly replace gravel |
| **Takes Playing** | `pk-ocular-gravel-step-01..04.ogg` | `pk-ocular-grass-step-01..04.ogg` | Sharp high-frequency crunch replaced by muffled rustle |
| **Footstep Takes Fired** | **61** (2.98 /s) | **63** (3.08 /s) | Step cadence identical (~3.0 steps/s) |
| Gravel Takes Fired | 61 | **0** | **100% eliminated on dirt** |
| Grass Takes Fired | 1 (at turnaround edge) | **63** | Sole footstep sound |
| Ambient / Distant Sounds | 4 (horde 1, owl 2, leaves 1) | 4 (horde 1, owl 2, leaves 1) | Identical background ambience |
| Distance Traveled | 140.91 m | 139.85 m | < 1% difference, natural player movement |
| Mean Ground Speed | 6.88 m/s | 6.83 m/s | Walk/jog velocity identical |

### Running on Trail (20 s)
| Metric / Sound Event | As-Is (Default) | `?steps=grass` | Notes |
|:---|:---:|:---:|:---|
| **Primary Footstep Sound ID** | `player/footstep-run-dirt` | `player/footstep-leaves` | Running dirt stomp replaced by soft grass take |
| **Takes Playing** | `pk-ocular-gravel-stomp-01..04.ogg` | `pk-ocular-grass-step-01..04.ogg` | Hard gravel impact replaced by soft rustle |
| **Footstep Takes Fired** | **89** (4.33 /s) | **90** (4.36 /s) | Step cadence identical (~4.35 steps/s) |
| Gravel Takes Fired | 89 | **0** | **100% eliminated on dirt** |
| Grass Takes Fired | 1 (at turnaround edge) | **90** | Sole footstep sound |
| Ambient / Distant Sounds | 3 (horde 1, owl 1, leaves 1) | 3 (horde 1, owl 1, leaves 1) | Identical background ambience |
| Distance Traveled | 223.15 m | 223.88 m | < 0.3% difference, natural player movement |
| Mean Ground Speed | 10.85 m/s | 10.86 m/s | Sprint velocity identical |

---

## 3. Surface Invariance Verification (Stone, Metal, Water, Leaves)

Pursuant to the brief ("and stone/metal/water/leaves grounds unchanged in both"), we triggered programmatic surface calls to `AudioSys.footstep(wet, running, ground)` under both conditions and logged the resulting take name and file:

| Ground / Condition | Parameters (`wet, run, ground`) | As-Is Take & File | `?steps=grass` Take & File | Invariance Status |
|:---|:---:|:---|:---|:---:|
| **Stone Walk** | `false, false, 'stone'` | `player/footstep-stone` (`...concrete-02.ogg`) | `player/footstep-stone` (`...concrete-02.ogg`) | **IDENTICAL** |
| **Stone Run** | `false, true, 'stone'` | `player/footstep-stone` (`...concrete-01.ogg`) | `player/footstep-stone` (`...concrete-03.ogg`) | **IDENTICAL** |
| **Metal Walk** | `false, false, 'metal'` | `player/footstep-metal` (`...metal-03.ogg`) | `player/footstep-metal` (`...metal-02.ogg`) | **IDENTICAL** |
| **Metal Run** | `false, true, 'metal'` | `player/footstep-metal` (`...metal-01.ogg`) | `player/footstep-metal` (`...metal-01.ogg`) | **IDENTICAL** |
| **Leaves Walk** | `false, false, 'leaves'` | `player/footstep-leaves` (`...grass-step-04.ogg`) | `player/footstep-leaves` (`...grass-step-02.ogg`) | **IDENTICAL** |
| **Leaves Run** | `false, true, 'leaves'` | `player/footstep-leaves` (`...grass-step-02.ogg`) | `player/footstep-leaves` (`...grass-step-03.ogg`) | **IDENTICAL** |
| **Water Walk** | `true, false, null` | `player/footstep-water` (`...water-02.ogg`) | `player/footstep-water` (`...water-02.ogg`) | **IDENTICAL** |
| **Water Run** | `true, true, null` | `player/footstep-water` (`...water-04.ogg`) | `player/footstep-water` (`...water-04.ogg`) | **IDENTICAL** |
| **Plain Dirt Walk** | `false, false, null` | `player/footstep-dirt` (`...gravel-step-04.ogg`) | `player/footstep-leaves` (`...grass-step-01.ogg`) | **A/B EFFECTIVE** |
| **Plain Dirt Run** | `false, true, null` | `player/footstep-run-dirt` (`...gravel-stomp-03.ogg`) | `player/footstep-leaves` (`...grass-step-02.ogg`) | **A/B EFFECTIVE** |

**Conclusion**: All surfaces other than plain dirt (caves/concrete, roofs/towers, woods/canopy leaves, river/lake water) remain 100% invariant between modes.

---

## 4. Master Audio Recordings in `review/AG-240/`

Recorded via WebAudio master output tap (`createMediaStreamDestination` + MediaRecorder + `decodeAudioData`):

1. **`review/AG-240/trail-walk-asis.wav`** (10.14 s, 1.95 MB, 48 kHz stereo 16-bit PCM):
   - Crisp gravel footsteps (`pk-ocular-gravel-step-01..04.ogg`) at ~3 steps/s. Sharp high-frequency crunch on every step.
2. **`review/AG-240/trail-walk-grass.wav`** (10.08 s, 1.94 MB, 48 kHz stereo 16-bit PCM):
   - Soft grass footsteps (`pk-ocular-grass-step-01..04.ogg`) at ~3 steps/s. Zero gravel crunch; warm organic earth shuffle.
3. **`review/AG-240/trail-run-asis.wav`** (10.14 s, 1.95 MB, 48 kHz stereo 16-bit PCM):
   - Heavy gravel stomps (`pk-ocular-gravel-stomp-01..04.ogg`) at ~4.35 steps/s. Aggressive gravel spray on each strike.
4. **`review/AG-240/trail-run-grass.wav`** (10.26 s, 1.97 MB, 48 kHz stereo 16-bit PCM):
   - Soft grass footsteps (`pk-ocular-grass-step-01..04.ogg`) at ~4.35 steps/s. Muffled organic footfalls.
5. **`review/AG-240/side-by-side-walk.wav`** (10.60 s, 2.04 MB, 48 kHz stereo 16-bit PCM):
   - 5 seconds of As-Is gravel walking -> 0.6 s silence -> 5 seconds of `?steps=grass` walking.
6. **`review/AG-240/side-by-side-run.wav`** (10.60 s, 2.04 MB, 48 kHz stereo 16-bit PCM):
   - 5 seconds of As-Is gravel running -> 0.6 s silence -> 5 seconds of `?steps=grass` running.

---

## 5. Visual Artifacts & Contact Sheet

- **Master Composite Sheet**: `qa/2026-11-06-AG-240/footstep-ab-sheet.jpg` (1980x1540, 445 KB).
  - Panel 1: Trail Outside Threshold · First Person · Walk (As-Is Gravel Steps).
  - Panel 2: Trail Outside Threshold · First Person · Run (As-Is Gravel Stomps).
  - Panel 3: Trail Outside Threshold · First Person · Walk (`?steps=grass` Soft Grass Takes).
  - Panel 4: Trail Outside Threshold · First Person · Run (`?steps=grass` Soft Grass Takes).
  - Lower Infographic: Comprehensive breakdown table of sound takes, frequencies, surface invariance, and audio file inventory.
- **Individual 1080p Screenshots**:
  - `qa/2026-11-06-AG-240/trail-fp-walk-asis.jpg`
  - `qa/2026-11-06-AG-240/trail-fp-run-asis.jpg`
  - `qa/2026-11-06-AG-240/trail-fp-walk-grass.jpg`
  - `qa/2026-11-06-AG-240/trail-fp-run-grass.jpg`
