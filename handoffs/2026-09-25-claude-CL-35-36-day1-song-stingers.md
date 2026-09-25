# Claude · CL-35 the day-1 fight song, CL-36 chiptune stingers, CL-37 levels · 2026-09-25

Jerry, after playing: chiptune is the way; chiptune the stingers. 20 unique fight songs, one per day, each 4-5 minutes and looping. Start by nailing day 1: aggressive but simple, heavy, slow, adrenaline (his touchstone is Hotline Miami). Fight music and the flamethrower are too loud. Use your best judgement on the volume and on when it fades and plays.

## CL-35: "First Blood", `assets/soundtrack/fight_day01.mp3`

**The feel:** 96 bpm with half-time drums (slow and heavy), over a bass that never stops pulsing 16ths (the adrenaline). Every kick pumps the synths down like a sidechain. One simple lead hook in E minor, the kind you can hum after one wave.

**The voices (all 8-bit):**
- band-limited pulse waves for the lead, stabs and arps;
- a stepped-triangle sub;
- LFSR-noise drums, risers and impacts.

**The form, 108 bars, 4:30:**

| Bar | Section | What happens |
|---|---|---|
| 0 | intro, 8 bars | the filtered bass opens up over a heartbeat kick |
| 8 | drop A | the hook from bar 12 |
| 24 | riff B | E minor to F: the menace |
| 40 | breakdown | the hook as an echo |
| 48 | drop A' | the hook up an octave, with arps |
| 64 | bridge | Am C Em B: a kick on every beat, quarter-note stabs, a climbing line |
| 80 | build | |
| 88 | climax | the hook high, with a harmony |
| 104 | turn | back down to the filtered bass, where bar 0 starts |

**The loop:** rendered as a circle (every tail past the end is folded onto the start) and played with `<audio loop>`, so it is gapless.

**Source:** `tools/day1.py` (patterns written by hand, not generated).

## CL-36: chiptune stingers and cues, `tools/stingers.py`
In the song's voices:

| File | Length | What it is |
|---|---|---|
| alarm | 6.4 s | a chip air-raid siren and snare march that hits on E, where the song starts |
| clear | 7.2 s | the hook's opening, lifting from E minor to E major, a ringing chord and a sparkle arp. It is still 7.2 s, because the finisher's slow motion runs exactly as long as this sting. |
| dawn | 8 s | a rising major arpeggio |
| night falls | 8 s | a descending line over the waking bass |
| ember | 8 s | phrygian stabs and a wailing lead |
| guardian | 4.4 s | three half-step stabs and a screech |
| cues | | achievement, airdrop, objective and POI cleared |

Levels: stings at −13 dB RMS and cues at −16 dB, both at gain 2.0 (Jerry's were at 3.0).

## CL-37: levels and fades (my judgement, as asked)
- **The song fades in over 1.5 s,** not 10, because its intro is the build (`music.json` `fadeIn`). The default 10 s fade stays for the other tracks.
- **Fight music is quieter:**
  - the day-1 song is at gain 1.6, where the chip loops sit at 3.0;
  - proximity swings less: 70% with nobody within 150 m, full within 20 m (it was 50% to 100%).
  - Together that makes the fight about 5 dB quieter when zombies are close and about 2 dB quieter when they're far.
- **The flamethrower is about 6 dB down:** stream 0.48 → 0.24, water hiss 0.11 → 0.06, crackle about 40% down.
- **Waves by day:** day 1 plays `fight_day01`, day 2 skirmish B, then the chip table as before.

## Tests
t60 32/0, t61 18/0, t34 20/0, t67 9/0 on my copy. t60 now checks the day-1 song, the quick fade and the 70% floor.

## Not verified
How it sounds. I built it by structure, measurements and spectrograms; Jerry's ears decide. It's also why I sent him the mp3s to hear on his phone. Every choice is a number at the top of `tools/day1.py`, and a render takes 12 s.

## FL Studio
`tools/day1.py` also writes `fight_day01.mid`: a type-1 MIDI file at 96 bpm, 480 ticks per beat, with a track per part (lead, harmony, bass, sub, stabs, arp, pad, drums on channel 10, GM kick 36, snare 38/40, hats 42/46). Jerry can load it into FL Studio and re-voice any part with his own chip plugins. Anything he changes in the notes can come back to me as MIDI.
