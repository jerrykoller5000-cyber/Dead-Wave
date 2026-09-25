# Claude · CL-34 · chiptune fight loops · 2026-09-24

Jerry's order: take the old fight music out, keep the stingers, and make the fight music chiptune loops from his Suno tracks, so it sits with the game's existing tune.

## What I made
Five seamless loops, one for each Suno track in the day table, in `assets/soundtrack/`:

| New loop | From | Tempo, key | Length |
|---|---|---|---|
| `chip_skirmish_b` | day skirmish B | 112 bpm, A | 51 s, 24 bars |
| `chip_skirmish_a` | day skirmish A | 111 bpm, A minor | 52 s |
| `chip_fight_1` | fight 1A | 126 bpm, B minor | 46 s |
| `chip_fight_2` | fight 2A | 143.5 bpm, G# minor | 40 s |
| `chip_fight_3` | fight 3A | 172 bpm, E | 33 s |

**How they're made:** `tools/chip.py` runs `compose.py`'s arrangement engine, the one behind the game's existing tunes, with 8-bit voices swapped in:
- band-limited pulse waves for the lead and arps;
- an NES-style stepped triangle for the bass;
- LFSR-noise drums.

**How they loop:** each loop is rendered with its last section before it and its first section after it, then cut out. So the echo and reverb tails across the seam are real, and a 12 ms crossfade joins the last sample to the first. At the seam the jump between samples is 781, against 7314 for the loudest 0.1% of sample-to-sample steps elsewhere in the file.

**How they play:** the director plays them with `<audio loop>` (native and gapless), because their hit is 0. Tracks that loop from a later hit still seek on `ended`.

## Honest limit: these are not transcriptions of Jerry's melodies
I measured each Suno track's tempo, key and energy; the analyser matched the known tempo and key of `day_open_ground` and `menu_treeline`. But I couldn't pull his melodies or chord changes out of the dense mixes. I built my own pitch tracking here with numpy (librosa and the usual tools are blocked from install), and it only heard the guitars' power chords.

So the loops follow his tracks' tempo, key and drive, with melodies written by the engine. If Jerry can export stems or MIDI from Suno, I can transcribe the real lead line and re-voice his actual tunes.

## Wiring
- `music.json`: the fight, fight2, fight3 and dayskirmish pools, `waveByDay` and `dayFight` all point at the chip loops, at gain 3.0 like his tracks. The old `compose.py` metal bed is out of the ember pool.
- Stingers are unchanged.
- The Suno fight files stay on disk, and `fight_ember`, `boss_guardian`, `fight_fog`, `fight_siege` and `fight_swarm` still play his Suno versions. Next, I can do them as chip loops too if he likes these.
- `core/audio.js`: the defaults match, `musicState().deckLoop` is new, and a deck whose hit is 0 loops natively.
- Tests: t60 32/0 (it checks the chip names and native looping) and t61 18/0.

## For Jerry
Listen on days 1, 3 and 8 (waves) and in a day fight. If a loop is wrong, tell me which one and how (faster, darker, less busy, more melody). Each one takes 5 s to re-render.
