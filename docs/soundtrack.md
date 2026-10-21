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

## The nights (CL-128, 2026-10-06)

Jerry, after his first full run: "Better Music deserving special attention each night." His reference is a chiptune mix
("BEST OF CHIPTUNE MIX", Final Discovery), and he likes "everything" in it. So every night has its own chiptune song,
made by `tools/nights.py` on First Blood's 8-bit voices and sections (`tools/day1.py`): its own hook, riff, bridge,
chords, key, mode, tempo, groove, bass line, arpeggio and lead voice, written for what the night is. Night 1 is First
Blood; night 14 is Fog Night (`fight_fognight`). Night 20 comes home to First Blood's key and chords, and its climax
sings First Blood's hook. Which night plays which: `waveByDay` in `assets/soundtrack/music.json`.

| Night | Song | BPM | Key | Groove |
| --- | --- | --- | --- | --- |
| 2 | Runners | 108 | A aeolian | d-beat |
| 3 | The Lake Wakes | 104 | D dorian | shuffle |
| 4 | Two Fronts (Ember) | 116 | F phrygian | four on the floor, gallop riff |
| 5 | The First Nest | 112 | C# harmonic minor | breakbeat |
| 6 | Chalk (Guardian) | 92 | C harmonic minor | half-time |
| 7 | Treeline | 114 | G dorian | breakbeat, shuffle riff |
| 8 | Fuse (Ember) | 122 | E phrygian | four on the floor |
| 9 | Eight Packs | 128 | B aeolian | d-beat |
| 10 | Brute Force | 100 | D harmonic minor | half-time, gallop riff |
| 11 | Every Cave | 124 | A dorian | breakbeat |
| 12 | Red Guardian (Ember) | 104 | F# phrygian | half-time, gallop riff |
| 13 | Artillery | 120 | G aeolian | march |
| 15 | Brood | 132 | A# harmonic minor | breakbeat, blast bridge |
| 16 | Demon Night (Ember) | 136 | F phrygian | four on the floor, gallop riff |
| 17 | Swarm | 148 | C# aeolian | blast beat |
| 18 | The Siege (Guardian) | 110 | G harmonic minor | gallop |
| 19 | The Gauntlet | 144 | F# aeolian | d-beat |
| 20 | Last Stand | 152 | E aeolian | four on the floor, d-beat riff |

To re-render: `python3 tools/nights.py out/` (all of them, or name the ones you want; `--list` prints the table), then
encode each `out/<name>_sections.wav` to `assets/soundtrack/<name>_sections.ogg` (Opus, 112 kbps) and a 96 kbps mp3
fallback `<name>.mp3` with ffmpeg. The old night songs (`fight_n02` to `fight_guardian_late`, `tools/hordes.py`) are out
of `music.json`; their files are still on disk.
