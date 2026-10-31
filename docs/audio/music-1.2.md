# The score for 1.2: the whole game's music from F:\Music (D-97)

Jerry, 2026-10-29: "For 1.2 we are going to do yet another Music overhaul. I finally found some packs that I really
like. We should be able to score everything from the individual zombies coming out in training to every night having
a unique track. Locations and events as well as cues getting close to things, completing missions, you name it. We
are going to scrap all other music. ... the design is evolving and this is the final direction. All the hellshots are
fight music. There is peaceful stuff in the others and tense stuff as well. ... I want you guys to craft the music for
the world completely using tracks or elements from here: F:\Music."

**The rule (D-97):** every piece of music in the game comes from F:\Music: the menu, the days, the nights, the fights,
the places, the cues and stingers, the Training Ground, the bosses, the end screens. Nothing else stays: the Suno
songs, the chiptune loops and the ElevenLabs music are retired from the game. **Jerry's heavy-metal stingers stay**
(Jerry, 2026-10-29: the alarm's metal stinger, CL-265, and the ui/* stingers: victory, game over, wave start, streak, day
cleared, badge, missing in action, deja vu); the score's cues fill only the moments that have no stinger of his, and play
around his, never over them. The game's sounds are not music and keep D-94's rules: the zombies, the HQ alarm's siren
and klaxon, the UI's terminal sounds, the world.
Jerry's own files in assets/soundtrack/ stay on disk until he says to delete them (D-81: his files are his).

## What's in F:\Music (catalogue: docs/audio/music/catalogue.json)

Six Ghosthack packs, 16 GB, 2,017 WAVs (13.3 hours, 32-bit float) and 367 MIDI files.

| Pack | What it is | Use |
| --- | --- | --- |
| **Hellshot, Hellshot 2, Hellshot 3 (Argent Metal)** | 75 metal construction kits, one riff section each (23-48 s), as stems: kick, snare, hats, bass guitar, rhythm guitars, leads, synths; drum one-shots; Hellshot 3's 39 bonus hits. 100 to 175 bpm, all minor: F minor 21 kits (105-175), E minor 17 (100-170), D# minor 9, D minor 7, G minor 7, F# minor 6, and a few in B, C, C#, A#, G#. | **All the fighting**: every night's fight, the day fights, the bosses, the special nights, each zombie type's motif in the Training Ground. |
| **Anomaly** | 5 cinematic kits with full mixes up to 6.5 min, stems and MIDI: Safe Zone (A minor, 70), Dark Valley (C minor, 65), The Anomaly (D#, 70), The Brain Scorcher, Clear Sky (A minor, 65). 40 granular underscores (12-114 s, dry and wet). 40 impacts. | **The calm and the tension**: the HQ (Safe Zone), the open day (Clear Sky), dusk and the dark forest (Dark Valley), the caves and the Hollows (The Anomaly, The Brain Scorcher), the underscores under places. |
| **Cinematic Orchestra Volume 2** | 4 orchestral song kits (80-128 s each with stems): Blue Peace (C major, 90), Captain's Ship, Pressure, Unappreciated. 135 instrument loops, 60 melodic one-shots, 100 drum loops and hits. | **The human moments**: dawn and the day's peace (Blue Peace), a mission done (Captain's Ship), the alarm's build (Pressure), loss and Coldwater (Unappreciated); the melodic one-shots for small cues. |
| **Mystery Nightfall (Trailer SFX)** | 214 loops (53 musical, 53 pulses, 72 percussion kits, 36 percussion loops) and 234 one-shots (81 tonal, 31 atonal, 20 braams, 17 drones, 10 whooshes, 8 risers, 67 percussion). | **The cues**: nearing an objective (a pulse that grows), discoveries, the wave's start (a braam), the last kill (an impact), the night falling (a drone), risers into events. |

## The licence: in the game yes, on GitHub never

Ghosthack's Single-User Media Producer License (each pack's License.txt and its "Read me before you distribute
music"): use in your own productions, games named, including sync and public performance; **no isolated or
independent use** (the music only ever inside the game, never as a separate soundtrack or a library); **never shared
or stored on a public server**; personal to Jerry; demo songs only inside the production; and no YouTube Content ID
(or the like on Meta, TikTok, SoundCloud) on anything with recognizable unedited material. So, as with the sound
packs (D-94): every file made from them is named `gh-*.ogg`, `.gitignore` keeps them off GitHub, and they exist on
Jerry's PC and inside the builds. NOTICES.txt and docs/audio/licences.md name Ghosthack.

## The design: one score that follows the game

The music director (core/audio.js, Claude's, D-21) keeps its rule of one piece of music at a time, but plays it from
stems and sections instead of whole files:

- **Vertical (how hard):** a fight track is its kit's stems in layers: drums and bass at the edge of a fight, rhythm
  guitars as the dead close in, leads and synths when they're on him or the wave peaks. The director already reads how
  close the nearest dead are and how big the horde is; those drive the layers, faded on the beat.
- **Horizontal (where in the night):** a night's fight is a short suite of kits in one key, moving to the next section at a
  bar line (the tempo is in every kit's name): the build, the push, the peak, the finisher.
- **Stingers on the beat:** cues land on the next beat of whatever's playing (or at once in silence).

### The fights: every night its own

| Nights | Tempo | Character | Kits (one key per night, 2 to 4 kits) |
| --- | --- | --- | --- |
| 1-5 | 100-115 | Heavy and slow: the first nights are a weight, not a sprint | E minor and D minor: Basilisk, Mental, Revenge, Scarecrow, Chimera, Deadweight; Tyrant, Hell Knight, Realm, Cleanse |
| 6-10 | 125-140 | Driving | E minor 130s (Carnage, Decay, Flux, Ironclad, Titan), D# minor (Rotten, Glitchform), G minor 130s (Deathmark, Grave, Venom), Babylon, Nihility, Violence |
| 11-15 | 147-156 | Relentless | F minor and G minor 150s (Onslaught, Ruin, Gutter, Tremor, Nemesis, Reaper, Scorn), D# minor 150s (Crypt, Cursed, Hellmouth, Voltage, Chamber, Exterminate), Haunted, Purgatory, Retribution, Exodus, Sledgehammer, Binary |
| 16-20 | 160-175 | The end: everything | F minor 160-175 (Frenzy, Havoc, Hellfire, Cult, Abyss, Hellforged, Nightmare, Rampage, Vortex, Warlord, Wraith, Exile), Inferno, Tyrant (G), Beast, Consume, Rude, Hostile, Annihilation, Epitah, Flame |

Each night gets its own kits; none repeats inside a run. The specials get their own too: the fog night, the red sky
(Ember), the guardian, the heart, the colossus, the wanderer. Day fights take a kit by horde size from the same pool, one
step below the night's tempo. The Training Ground's practice fights take the kit of the type that's out.

### The Training Ground: each type its own motif

When a type comes out, its motif plays: a short phrase from a kit whose sound and name fit it, then its loop under the
practice. The first pairing to judge by ear (Jerry's call is final):
shambler, Rotten; feral, Frenzy; brute, Sledgehammer; colossus, Titan; spitter, Venom; spider, Glitchform; leaper,
Chimera; screamer, Haunted; bomber, Carnage; drowned, Gutter; demon, Inferno; the guardians, Hell Knight and Wraith.

### The days, the places, the cues

| Moment | Material |
| --- | --- |
| The menu | Anomaly, Clear Sky (the valley before) |
| Dawn and the day's peace | Cinematic Orchestra, Blue Peace; Clear Sky by day |
| The HQ and its yard | Anomaly, Safe Zone |
| Dusk, the forest at night, the walk home | Anomaly, Dark Valley; granular underscores (wet) |
| Inside a grove at night (D-98) | Dark Valley's stems and the wet underscores, in by how deep he is in the grove, out in the clearings |
| The caves, the Hollows, the Marrow, the heart | Anomaly, The Anomaly and The Brain Scorcher; drones; the heart's fight from the heaviest slow kit (Doom or Tyrant) |
| The graveyard, the chapel, the first people's stones | granular underscores (dry); tonal one-shots |
| The relay and its vault, the mast | Mystery Nightfall pulses |
| Coldwater, the hikers' camp, the missing | Cinematic Orchestra, Unappreciated |
| The alarm's build, the prep before a night | Cinematic Orchestra, Pressure, then a braam into the fight |
| Nearing an objective, a survivor, a cache | a pulse loop that grows over the last 40 m; a tonal one-shot on finding it |
| A mission done, a camp cleared | Captain's Ship's phrase, or a melodic one-shot over a braam |
| The wave's start, the last kill, a boss's entrance | braams, impacts, risers (Mystery Nightfall, Anomaly) |
| Fallen; the last dawn | Anomaly impacts into Dark Valley's end; Blue Peace in full |

Places fade in by distance as the existing ambience does; a fight always wins over a place. The volume has its own sliders (D-98, CU-177): master, music (the score and his stingers) and ambience.

## How it's built

1. **The catalogue** (done, 2026-10-29): docs/audio/music/catalogue.json, every file's path, length, rate and channels.
2. **The analysis:** each stem's loudness (LUFS), its bars (tempo from the name, the downbeat from the onsets), and
   which stems are which (drums, bass, guitars, lead, synth) by name and spectrum. Read, not heard: nobody on the crew can
   hear, so the analysis decides what fits and Jerry's ear judges.
3. **The cue sheet:** every moment above with its material, in docs/audio/music/score.json (the recipe).
4. **The making:** `tools/music-make.py` (like pack-make.py): stems summed into layers (drums, bass and rhythm, lead and
   synth), cut on bar lines, looped seamlessly, evened, 48 kHz OGG, `gh-*.ogg` into assets/soundtrack/gh/.
5. **The director:** music.json v2 (layers, sections, bars, cues), core/audio.js plays layers in sync and moves
   sections on bar lines; decoding per night (only tonight's kits, the last night's released) inside a memory budget,
   measured on night 20.
6. **The listen page:** a music group: each night's suite, each place, each cue, the layers as switches, so Jerry
   hears them as the game plays them and says what to change.
7. **The switch:** the old music off in the game when the new score covers every moment; his files stay on disk.

**Who:** Claude designs it, makes it and wires the director (D-21). Muse (MU-n) builds the analysis tools and the
catalogue's tags from WSL (F:\Music is /mnt/f/Music there). Grokbot gives the director the fight signals it needs (the
horde's size and distance already flow; the boss and special-night phases). ChatGPT times the UI's cues (the dawn card, the
objective, mission done). Antigravity checks night 20's frame time and memory with the score on. Cursor packages the
`gh-*` files into the builds and runs the suite.

**When:** 1.2, after Jerry's 1.1 playthrough, with the forest's clumping (D-95). Nothing of it goes into 1.1.
