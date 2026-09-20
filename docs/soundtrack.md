# Soundtrack

`assets/soundtrack/` holds the 15 tracks the game plays: 44.1 kHz stereo, 160 kbps mp3. They are a
mood-driven score, not a playlist: a menu theme, three day tracks, two night tracks, five fight
tracks, two blood-moon / colossus tracks and two endings.

The game crossfades between them on wave start, day cleared and nightfall, never repeats a track
back to back, and breathes for a few seconds between calm tracks. Music ducks when you are near
death, in the shop or paused. Volume is under Esc > Settings.

| Track | BPM | Key | Used for |
| --- | --- | --- | --- |
| `menu_treeline` | 72 | D dorian | Title screen |
| `day_morning_watch` | 96 | G dorian | Day prep |
| `day_riverside` | 104 | A mixolydian | Day prep |
| `day_open_ground` | 92 | E minor | Day prep |
| `night_lanterns` | 80 | A phrygian | Night prep |
| `night_embers` | 84 | G minor | Night prep |
| `fight_breach` | 128 | E minor | Waves |
| `fight_run_the_line` | 140 | A minor | Waves |
| `fight_teeth` | 150 | C phrygian | Waves |
| `fight_ash_wind` | 118 | D aeolian b5 | Waves |
| `fight_wire` | 132 | F# harmonic minor | Waves |
| `boss_red_sky` | 100 | C minor | Blood Moon / Colossus |
| `boss_colossus` | 90 | Bb phrygian | Blood Moon / Colossus |
| `end_fallen` | 66 | A minor | Game over |
| `end_dawn` | 84 | G major | Victory |

## How they are made

The tracks are generated, not recorded. `tools/compose.py` and `tools/synth.py` (numpy and scipy)
build real song forms (intro, verse, chorus, breakdown, climax, outro) with chord progressions per
key, motif-based lead lines, synth pads, bass, arps, plucked strings, drums, delay and reverb.

To re-render:

```bash
python3 tools/compose.py assets/soundtrack
```

That writes WAV files; encode them to mp3 with ffmpeg.
