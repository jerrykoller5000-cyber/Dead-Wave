# antigravity — AG-198 the score's cues and places on the PC — 2026-11-02
Changed:          Validated CL-275 and CL-294 (J65) score cues, calm places, and audio regression suites (`tcl294`, `tcl275d`, `tcl275a`, `t73`, `t60`, `t61`) on the real WebGPU renderer on Jerry's RTX 5080 PC via the shared game-test slot, plus an ear-proxy tour of all calm places (`place_graveyard` within 40 m, `place_relay` within 35 m, `place_hikers` within 30 m), `dusk` (`gh/gh-place-alarm-build`), and `night_falls` (`gh/gh-cue-night-fall`) cue verification.
Files:            qa/2026-11-02-AG-198/run-ag198.mjs, qa/2026-11-02-AG-198/run-ag198-cl294.mjs, qa/2026-11-02-AG-198/run-ag198-ear-only.mjs, qa/2026-11-02-AG-198/run-ag198-relay.mjs, qa/2026-11-02-AG-198/ag198-telemetry.json, qa/2026-11-02-AG-198/report.md, qa/2026-11-02-AG-198/*.png (11 screenshots), handoffs/2026-11-02-antigravity-AG-198.md
Tests:            Real WebGPU on RTX 5080 via game-test slot: tcl294 (default URL) 8 PASS / 0 FAIL; tcl275d (default URL, post-CL-294) 10 PASS / 1 FAIL (line 46 expects gh-place-(hq|menu) on return home, gets gh-place-dawn because match starts in dawnprep); tcl275a (?score=0) 12 PASS / 0 FAIL, (default URL) 10 PASS / 2 FAIL (expected until CL-297: off-until-asked & old1); t73 (?score=0) 12 PASS / 0 FAIL; t60 (?score=0) 43 PASS / 0 FAIL; t61 (?score=0) 22 PASS / 0 FAIL; Ear-proxy places & cues pass: all 4 calm place/dusk tracks decode & play audibly (vol > 0.01, err null, overlapFrames 0).
Screenshots:      qa/2026-11-02-AG-198/tcl294.png, qa/2026-11-02-AG-198/tcl275d.png, qa/2026-11-02-AG-198/tcl275a.png, qa/2026-11-02-AG-198/t73.png, qa/2026-11-02-AG-198/t60.png, qa/2026-11-02-AG-198/t61.png, qa/2026-11-02-AG-198/place-hq-day.png, qa/2026-11-02-AG-198/place-graveyard.png, qa/2026-11-02-AG-198/place-relay.png, qa/2026-11-02-AG-198/place-hikers.png, qa/2026-11-02-AG-198/place-dusk-pressure.png
Not verified:     None on the PC WebGPU renderer; t60, t61, t73 under default score-on URL are deferred to Claude's CL-297 per request.
Requests:         claude FYI: AG-198 results & 3 findings (tcl275d.js line 46 dawnprep regex, night_falls not auto-called on dusk transition, and daytime POI guards at Relay/Hikers triggering dayfight before calmFlow.dwellS unless cleared).
Contract changes: none

## 1. Suite Results on Real WebGPU (`NVIDIA GeForce RTX 5080`)

| Test | URL Mode | Result | Notes |
|---|---|---|---|
| `tcl294` | Default (`score=ON`, `CL-294`) | **8 PASS / 0 FAIL** | `calmFlow` defaults `{"dwellS":20,"gapS":60}`; 1.5 s sprint-through seen (`graveyard`) but not settled; settles after stay (`5.1 s >= 3 s`); holds inside 6 s gap (`2.6 s`); returns to day's calm (`dawnprep/gh/gh-place-dawn`) after gap; duplicate `musicCue('objective')` within 20 s held (`played:true` then `played:false, held:true`). |
| `tcl275d` | Default (`score=ON`, `CL-294`) | **10 PASS / 1 FAIL** | `P.dusk[0] === 'gh/gh-place-alarm-build'` PASS; `off: calm_day` PASS; `on: gh/gh-place-hq,gh/gh-place-menu` PASS; stings mapped to `gh/gh-cue-*` with `alarm` untouched (`sting_alarm_metal`) PASS; graveyard underscore (`place_graveyard/gh/gh-place-graveyard`) PASS; audible `0.075` (`level 1.00, err null`) PASS. **1 FAIL**: line 46 `home again: the day's calm (gh/gh-place-dawn)` — see Finding 1 below. |
| `tcl275a` | `?score=0` | **12 PASS / 0 FAIL** | `gh/night-01` (`scarecrow`, `gh-hs3-scarecrow-drums.ogg`), 16-bar loop `36.5714375 s` at `105 bpm` (`barS = 2.2857 s`), distance layers (`drums` at ~190 m -> `rhythm` at ~28 m -> `lead` at ~7 m), `0` overlap frames, restores `elevenlabs/night-01` when `setScore(false)`. |
| `tcl275a` | Default (`score=ON`) | **10 PASS / 2 FAIL** | Expected red until `CL-297`: line 16 `off until asked` (`on:true` at startup) and line 54 `old1` captured while score was already on (`gh/night-01`). All 10 Hellshot kit/loop/layer checks PASS. |
| `t73` | `?score=0` | **12 PASS / 0 FAIL** | Day 1 sections decoded (`elevenlabs/night-01_sections.ogg`), `stalk` -> `dropA` -> `riffB` -> `break` -> `climax` on bar lines (`2.500 s`), `vol 0.132`, `overlap 0`. |
| `t60` | `?score=0` | **43 PASS / 0 FAIL** | All 20 night songs, night curve, briefing duck (`0.50`), `sting_alarm_metal` solo, proximity curve, relief sting solo, camp clear stinger, `0` overlap frames. |
| `t61` | `?score=0` | **22 PASS / 0 FAIL** | Night 9 song, wave finisher `2.4 s`, slow-mo `3.0 s` matching relief sting (`2.95 s`), 137° camera orbit, `night_embers` calm return, `0` overlap frames. |

---

## 2. Ear-Proxy & Places Pass (`score=ON`, Real WebGPU)

All telemetry is saved in `qa/2026-11-02-AG-198/ag198-telemetry.json`:

1. **Cues & Stings Table (`musicState().stings`)**:
   - `alarm`: `"sting_alarm_metal"` (untouched, as required)
   - `clear`: `"gh/gh-cue-last-kill"`
   - `dawn`: `"gh/gh-cue-dawn"`
   - `night_falls`: `"gh/gh-cue-night-fall"`
   - `guardian` / `ember`: `"gh/gh-cue-boss-entrance"`
   - `objective` / `achievement` / `airdrop`: `"gh/gh-cue-discovery"`
   - `poi_cleared` / `camp`: `"gh/gh-cue-mission-done"`

2. **Calm Places (`stage === 'calm'`)**:
   - **HQ / Dawnprep (`place-hq-day.png`)**: `mood: "dawnprep"`, `deckTrack: "gh/gh-place-dawn"`, `front: ".../assets/soundtrack/gh/gh-place-dawn.ogg"`, `volume: 0.0735`, `deckLevel: 0.981`, `overlapFrames: 0`, `lastDeckError: null`.
   - **Graveyard (`place-graveyard.png`, within 40 m)**: at `(-83.96, 89.15)`, `dist: 5.92 m` from `POI.graveyard` (`-89.96, 89.15`) -> `mood: "place_graveyard"`, `deckTrack: "gh/gh-place-graveyard"`, `front: ".../assets/soundtrack/gh/gh-place-graveyard.ogg"`, `volume: 0.0101` (rising on fade-in), `overlapFrames: 0`, `lastDeckError: null`.
   - **Relay Mast (`place-relay.png`, within 35 m)**: at `(-147.37, -4.15)`, `dist: 6.00 m` from `POI.mast` (`-153.37, -4.15`) -> `mood: "place_relay"`, `deckTrack: "gh/gh-place-relay"`, `front: ".../assets/soundtrack/gh/gh-place-relay.ogg"`, `volume: 0.0111`, `overlapFrames: 0`, `lastDeckError: null`.
   - **Hikers' Camp (`place-hikers.png`, within 30 m)**: at `(27.00, -126.00)`, `dist: 5.00 m` from `campsites[1]` (`22, -126`) -> `mood: "place_hikers"`, `deckTrack: "gh/gh-place-hikers"`, `front: ".../assets/soundtrack/gh/gh-place-hikers.ogg"`, `volume: 0.0111`, `overlapFrames: 0`, `lastDeckError: null`.
   - **Dusk / Last Prep Before Dark (`place-dusk-pressure.png`)**: at HQ `(0, 12)` with `worldTime = 0.72` -> `stage: "calm"`, `mood: "dusk"`, `deckTrack: "gh/gh-place-alarm-build"` (*Pressure*), `front: ".../assets/soundtrack/gh/gh-place-alarm-build.ogg"`, `volume: 0.0112`, `overlapFrames: 0`, `lastDeckError: null`.

3. **`night_falls` Cue at Dusk & `overlapFrames`**:
   - Stepping `worldTime` across sunset (`0.68 -> 0.72`) transitions `mood` to `"dusk"` and starts `"gh/gh-place-alarm-build"`, but **does not automatically call `musicCue('night_falls')`** (`autoTriggeredNightFallsAtDusk: false`).
   - Calling `AudioSys.musicCue('night_falls')` plays `assets/soundtrack/gh/gh-cue-night-fall.ogg` and records `lastCue: { name: "night_falls", played: true, at: 2 }`. Calling it a second time within 20 s is held by `CL-294` (`lastCue: { name: "night_falls", played: false, at: 3, held: true }`).
   - Across the entire run (including explicit `night_falls` cue over `gh/gh-place-alarm-build`), `musicState().overlapFrames` stayed **`0`**.

---

## 3. Findings for Claude

1. **`tools/tests/tcl275d.js` Line 45–46 (`gh/gh-place-dawn` on return to HQ)**:
   - Because `startMatch(T, 'ScoreCalm')` begins in the opening dawn window (`worldTime ~ 0.38`, `state.dawn === true`), the base calm mood at HQ is `'dawnprep'` (`gh/gh-place-dawn`), not `'day'`. When the player leaves `place_graveyard` and returns to `home`, `calmMoodFor` returns `'dawnprep'` and plays `'gh/gh-place-dawn'`. Updating the regex on lines 45–46 of `tools/tests/tcl275d.js` from `/^gh\/gh-place-(hq|menu)$/` to `/^gh\/gh-place-(hq|menu|dawn)$/` (just like `tcl294.js` line 40 accepts `dawnprep/gh/gh-place-dawn`) will make `tcl275d` 11/0.
2. **`night_falls` Cue Not Wired to Dusk/Night Transition**:
   - `music.json` and `core/audio.js` map `stings.night_falls` to `"gh/gh-cue-night-fall"` and `AudioSys.musicCue('night_falls')` plays cleanly with `0` overlap frames, but neither `index.html` nor `core/audio.js` calls `musicCue('night_falls')` when dusk or night falls.
3. **Daytime POI Guards at Relay Mast & Hikers' Camp vs `calmFlow.dwellS`**:
   - At `POI.mast` (radius 35 m) and `hikers` camp (radius 30 m), lazy-spawned daytime POI guard zombies stand within `DAY_FIGHT_RANGE` (38 m). In normal play, walking into Relay or Hikers' Camp wakes `stage = 'dayfight'` (`chip_skirmish_b`) before the 20 s `calmFlow.dwellS` settles; once the player kills the guards (`liveN === 0`), `campclear` finishes and the place's calm track (`gh/gh-place-relay` / `gh/gh-place-hikers`) fades in after `dwellS`.
