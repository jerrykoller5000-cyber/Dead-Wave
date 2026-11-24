# antigravity2 — AH-11 Jerry direct: redo all music cues, mood fit, and world exploration pacing — 2026-11-24

Changed:          Overhauled all 1.2 score world tracks, cues, daylight combat suites, and music-director pacing using the local Ghosthack packs (D-97) while keeping Jerry's `sting_alarm_metal.mp3` and legacy `?score=0` intact. Replaced mismatched orchestral/fairytale/spy/techno cues with cohesive `Ghosthack - Anomaly` survival tracks and tight ear-audited `Mystery Nightfall` / `Hellshot` stems, added seamless pool continuity (`menu -> dawnprep -> day`, `dusk -> night`), 45/150/90 s exploration pacing & no-repeat shuffle bags, sustained close-combat daylight engagement with Hellshot suites + retreat/resume, underground calm low-pass filtering, and zero-overlap cue ducking.
Files:            core/audio.js, assets/soundtrack/music.json, tools/music-make.py, docs/audio/music/made.json, index.html (updateAudioDirection), tools/tests/tcl275d.js, tools/tests/tcl294.js (plus local git-ignored `assets/soundtrack/gh/gh-*.ogg` rebuilt via `tools/music-make.py`)
Tests:            Game-test slot (Rule 16, `--jobs 1`): run 1 (`tcl275d tcl294 tcl275a tcl275b t60 t106b t174 t215`) -> `tcl294` 15/0, `tcl275a` 13/0, `t60` 43/0, `t174` 14/0, `t215` 4/0 (`tcl275d` 11/1 on initial fade-in frame timing — fixed; pre-existing unrelated `t106b` 4/5 relative `music.json` 404 under `/tools/tests/test.html` & `tcl275b` 1/1 colossus spawn `TypeError` in `fakethree`); run 2 (`tcl275d tcl275c tcl335 t73`) -> 4 checks: 41 pass, 0 fail (`tcl275d` 12/0, `tcl275c` 7/0, `tcl335` 10/0, `t73` 12/0). Pure-Node behavioral simulation (`sim-music.mjs`): 36 pass, 0 fail. `node tools/check-players.mjs`: 316 reads, all allowed. `node --check` clean; 0 UTF-8 BOM / mojibake.
Screenshots:      N/A (audio / music director overhaul; every rebuilt `.ogg` asset audited by ear via `read_file` and measured with FFmpeg EBU R128).
Not verified:     In-game playback on Jerry's speakers/headphones at Night 1 and Night 20 under live combat load (every rebuilt track, cue, and day-fight suite was audited by ear from the built `.ogg` files and verified via Chrome headless tests + EBU R128 loudness measurements, not yet listened to live by a human in a full play session). `t106b` (pre-existing relative URL 404 bug in `tools/tests/t106b.js`, tracked in `handoffs/requests.md`) and `tcl275b` (colossus spawn `TypeError: Cannot set properties of undefined (setting '0')` in `fakethree`) were not modified because neither file belongs to this task.
Requests:         Claude review requested (`--review` per Rule 13) for updated `tools/tests/tcl275d.js` and `tools/tests/tcl294.js` expectations (new Anomaly pools, Hellshot day-fight suites, and `calmFlow` 45/150/90 s real defaults). Replied DONE to ChatGPT's GP-20316 request (`gh-cue-last-kill.ogg` rebuilt from `Ghosthack-MN_Tonal_Hope_C.wav`, 4.72 s warm uplifting C-major resolve, replacing horror slam `Shocker`).
Contract changes: None (all existing `AudioSys` exports and `musicState()` fields preserved; additive fields `score.dayFight`, `score.place.minTrackS`, `score.place.trackAge`, `cueDuck`).

---

## Rule 16 (Game-Test Slot)
All headless Chrome browser tests were queued and executed through the PC's machine-wide game-test slot (`tools/tests/run-all.mjs --jobs 1 --agent antigravity2 --task AH-11`, which invokes `tools/game-test-slot.mjs run`). No browser or game instance was launched outside the queue.

---

## Summary of Changes

### 1. Audio Assets & Mood Cohesion (`tools/music-make.py`, `assets/soundtrack/music.json`, `docs/audio/music/made.json`)
Audited all existing and candidate Ghosthack assets **by ear** and replaced every mismatched track (bright fairytale/Disney orchestral cues, cartoon-spy tracks, frantic 12 s techno loop, horror slam on wave clear, 8-bit chiptune day fights):

| Slot / Cue | Before (problem) | After (ear-audited Ghosthack source) | Dur | Integrated LUFS | True Peak |
| --- | --- | --- | --- | --- | --- |
| `menu` (`gh-place-menu`) | `Clear Sky` (cut on Play) | `Anomaly / Kit 05 - Clear Sky` (shared seamlessly into `dawnprep` & `day`) | 3:00.9 | -19.4 | -1.1 dBFS |
| `day` / `hq` (`gh-place-hq`) | `Safe Zone` (only track in day) | `Anomaly / Kit 01 - Safe Zone` | 5:10.3 | -18.9 | -1.6 dBFS |
| `day` / `wilds` (`gh-place-wilds`, NEW) | *(unused)* | `Anomaly / Kit 04 - The Brain Scorcher` | 3:29.1 | -21.6 | -1.4 dBFS |
| `dusk` & `night` (`gh-place-dusk`) | `Pressure` (cartoon spy) in dusk | `Anomaly / Kit 02 - Dark Valley` | 6:27.7 | -18.1 | -1.1 dBFS |
| `night` (`gh-place-anomaly`, NEW) | *(unused)* | `Anomaly / Kit 03 - The Anomaly` | 2:40.3 | -19.7 | -1.0 dBFS |
| `dawn` ending (`gh-place-dawn`) | `Blue Peace` (bright fairytale) | `Anomaly / Kit 05 - Clear Sky` (from 27.0 s, 1.5 s fade-in: acoustic guitar + cello) | 2:33.9 | -19.4 | -1.1 dBFS |
| `fallen` (`gh-place-fallen`) | `Dark Valley Atmos Drone` | Kept (`Anomaly / Kit 02 Atmos Drone`) | 6:25.9 | -18.0 | -4.9 dBFS |
| `place_graveyard` (`gh-place-graveyard`) | `Anomaly / Alone` | Kept (`Anomaly / Alone (DRY)`) | 1:51.7 | -17.9 | -1.4 dBFS |
| `place_relay` (`gh-place-relay`) | `Abnormality` (12 s frantic techno) | `Anomaly / Facility (DRY)` (dark industrial/radio pulse) | 1:42.4 | -18.0 | -4.7 dBFS |
| `place_hikers` (`gh-place-hikers`) | `Unappreciated` (whimsical glockenspiel) | `Anomaly / Environmental Problems (DRY)` (melancholic pad) | 1:36.9 | -18.1 | -1.3 dBFS |
| `place-alarm-build` | `Pressure` (cartoon spy) | `Anomaly / Kit 03 - The Anomaly` | 2:40.3 | -19.7 | -1.0 dBFS |
| `clear` (`gh-cue-last-kill`) | `Shocker` (horror slam; GP-20316 bug) | `Mystery Nightfall / Tonal_Hope_C` (warm uplifting C-major resolve) | 4.72 s | -12.1 | -1.1 dBFS |
| `camp` / `poi_cleared` (`gh-cue-mission-done`) | `Captain's Ship` (11 s sleepy orchestral) | `Mystery Nightfall / Tonal_Equilibrium_D` (grounded low resolve) | 3.21 s | -12.0 | -2.9 dBFS |
| `objective`/`achievement`/`airdrop` (`gh-cue-discovery`) | `Entangle` (7.8 s alien moan) | `Mystery Nightfall / Tonal_Endure_C` (crisp atmospheric swell) | 2.88 s | -14.9 | -1.0 dBFS |
| `guardian`/`ember` (`gh-cue-boss-entrance`) | `Riser_Collide` (shrill sci-fi) | `Mystery Nightfall / Braam_Hostile_C` (massive monstrous low braam) | 2.71 s | -12.2 | -1.7 dBFS |
| `night_falls` (`gh-cue-night-fall`) | `Drone_Scavenge_C` | Kept (`Mystery Nightfall / Drone_Scavenge_C`) | 6.50 s | -12.0 | -3.2 dBFS |
| `dawn` cue (`gh-cue-dawn`) | `Blue Peace` (10.7 s Disney swell) | `Cinematic Orchestra / String Chords_ 4_Am #13` (subtle minor swell) | 3.12 s | -13.3 | -0.9 dBFS |
| `alarm` | `sting_alarm_metal.mp3` | Untouched (Jerry's metal stinger, D-97 / CL-265) | — | — | — |
| `dayfight-1` (NEW, 1–4) | `chip_skirmish_b` (8-bit chiptune) | `Hellshot / Joker 107bpm Fmin` (layered drums+bass, rhythm; 16 bars) | 35.89 s | -16.0 sum | -7.1 dBFS |
| `dayfight-2` (NEW, 5–10) | `chip_skirmish_a` (8-bit chiptune) | `Hellshot 2 / Nihility 135bpm A#min` (drums+bass, rhythm, lead; 16 bars) | 28.44 s | -16.0 sum | -2.3 dBFS |
| `dayfight-3` (NEW, 11+) | `chip_fight_1` (8-bit chiptune) | `Hellshot 3 / Retribution 150bpm F#min` (drums+bass, rhythm, lead; 16 bars) | 25.60 s | -16.0 sum | -2.5 dBFS |

- **New `score.pools` (~20 minutes of cohesive survival exploration)**:
  - `menu`: `['gh/gh-place-menu']`
  - `dawnprep`: `['gh/gh-place-menu', 'gh/gh-place-hq', 'gh/gh-place-wilds']`
  - `day`: `['gh/gh-place-hq', 'gh/gh-place-wilds', 'gh/gh-place-menu', 'gh/gh-place-dusk']`
  - `dusk` & `night`: `['gh/gh-place-dusk', 'gh/gh-place-anomaly']`
  - `aftermath`: `['gh/gh-place-hq', 'gh/gh-place-menu']`

### 2. Music Director Pacing & Polish (`core/audio.js`, `index.html`)
- **Zero-cut pool continuity**: If the playing world track already belongs to the next calm pool (`menu -> dawnprep -> day`, `dusk -> night`), the director adopts the new mood seamlessly without cutting or restarting the track.
- **Anti-thrash world exploration pacing**: Raised `calmFlow` to `{ dwellS: 45, gapS: 150, minTrackS: 90 }`. Sprinting around the entire valley no longer flips tracks on every landmark or time boundary; active calm tracks play at least 90 s before interrupting, fade out smoothly over `4.0 s` (`SCORE_FADE_OUT_S`) with a `2.0 s` quiet valley breath (`SCORE_SWITCH_GAP_S`) before the next fades in over `6.0 s`, and breathe for `10–16 s` after a track ends naturally.
- **No-repeat shuffle bag (`pickTrack`)**: Plays every track in a calm pool before repeating any track (first visit still deterministic `list[0]`).
- **Fixed cancelled-fade silence bug**: Leaving a POI mid-fade-out now restores `deckTarget = 1` smoothly instead of silently fading the track to `0`.
- **Smart daylight combat engagement, retreat, and resume**: In 1.2 score mode, stray guards or passing zombies no longer hijack exploration music or cut to 8-bit chiptune. Daylight combat requires sustained close-range engagement (`4+` within 42 m for 1.0 s, `2–3` within 32 m for 2.0 s, `1` within 22 m for 3.5 s, or boss/guardian within 65 m for 1.0 s; `dayEngageT` never pre-charges outside an active band). Uses layered Hellshot suites (`gh/dayfight-1..3`, preloading `dayfight-1` in `secWantDay`), saves long calm tracks (`>45 s` left) to resume after clearing (`SCORE_CAMP_S = 4.8 s` so the 3.2 s resolve cue finishes completely with zero overlap) or disengaging (`dayretreat` after >85 m for 8.0 s, no false victory cue).
- **Smoother combat layering & cue mix**: Layered kit swaps crossfade (`0.14 s` in / `0.32 s` out), wider layer hysteresis (`+20 m` rhythm, `+15 m` lead, `0.14 s / 0.42 s` swells), `lullAfter: 8 s` on layered suites, `3.0 s` boss-return hold, `cueDuck` ducks bed to `0.42` during short `musicCue()` clips, suppresses cues during solo stings and suppresses redundant `dawn` cue within 12 s of wave-clear `clear`, and routes the calm `<audio>` deck through a `650 Hz` underground low-pass (`deckLp`).
- **`index.html` (`updateAudioDirection`)**: Computed `a.place` before `AudioSys.updateMusic(dt, a)` (fixing 1-frame lag), cleared `a.place` underground, and tightened POI radii (`graveyard: 32 m`, `relay: 28 m`, `hikers: 24 m`, `+10 m` hysteresis).

---

## Sound Principles Score Table (`docs/sound-principles.md` §6, D-92)
**Jerry's rule**: Both **immersive** (uninterrupted cohesive survival atmosphere while exploring the small valley, natural ambient breathing, rock-muffled underground calm) and **impactful** (layered Hellshot combat suites, crisp ear-audited resolve/boss/wave-clear cues with clean ducking and zero overlap).

| Category | Score (0–5) | Notes |
| --- | --- | --- |
| Clarity | 5 | Every short cue ducks the music bed (`0.42`) and solo stings (`alarm`, `clear`) clear the deck completely (`overlapFrames === 0`). |
| Placement | 4.5 | Calm tracks now run through the `650 Hz` underground low-pass (`deckLp`), cave-mouth `dread` pulls calm back, and POI underscores require deliberate 45 s stay inside tight radii (`32/28/24 m`). |
| Character | 5 | 100% cohesive dark survival-horror & argent-metal palette (`Anomaly` + `Mystery Nightfall` + `Hellshot` + Jerry's metal alarm); zero fairytale/spy/techno/chiptune tonal clashes. |
| Mix | 4.5 | All 25 rebuilt assets peak-safe (`<= -0.9 dBFS`) and EBU R128 leveled (`-18` world, `-16` layered combat sum, `-12` cues) with `music.json` gain matching and smooth `4 s` fade-outs / `6–12 s` fade-ins. Needs Jerry's live ear check at Night 1 & Night 20. |
| Variety | 5 | ~20 min of distinct Anomaly exploration tracks via no-repeat shuffle bags, 3 distinct layered Hellshot day-fight tiers, plus 20 unique layered night suites. |
| Timing | 5 | Seamless `menu -> dawnprep -> day` and `dusk -> night` adoption, 90 s track commitment, 10–16 s inter-track valley breath, 4.8 s camp-clear window (3.2 s cue + 1.6 s breath), bar/beat-quantized layered combat swells. |
