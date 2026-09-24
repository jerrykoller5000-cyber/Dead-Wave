# Dead-Wave music cue sheet

For Jerry, to fill from Suno. Claude builds the music director that plays these (CL-21).
Written 2026-09-24.

## How to hand them over

- Put every file in `assets/soundtrack/incoming/`, named after its slot: `sting_alarm.mp3`,
  `fight_1a.mp3` and so on. If you have two or three candidates for a slot, name them
  `fight_1a-v1.mp3`, `fight_1a-v2.mp3`, and we'll pick one or rotate them.
- Instrumental only. Put "instrumental, no vocals" in every prompt.
- Download at the best quality you can (WAV if your plan has it, otherwise mp3). We even out
  the loudness so they sit together; you don't need to.
- **The most useful thing you can tell us is where the track hits.** If a fight track has a
  quiet intro and slams in at 0:12, write `fight_1a hits at 0:12` in `incoming/notes.txt`. The
  director can jump straight to that point, so a fight never starts on a slow fade-in.
- Songs you already have in Suno count. If one fits a slot, use it, and you don't need the prompt.
- Suno makes whole songs, not 5-second stings. For a sting slot, make a short, hard-hitting
  track and tell us the timestamp of the moment you want. We'll cut it out.

## What stays

These already work, so leave them unless you find something better:

- The menu (`menu_treeline`), the opening and parachute music, and the death music
  (`end_fallen`).
- The peacetime pools: `day_riverside`, `day_open_ground`, `day_long_grass`,
  `day_morning_watch`, `night_lanterns`, `night_embers`, `night_long_watch`.

To go: the five `fight_*` tracks (`fight_breach`, `fight_wire`, `fight_ash_wind`,
`fight_run_the_line`, `fight_teeth`). My guess is these are the corny ones: they were made by
our own music generator, not Suno. The seven `metal_*` tracks can stay if you like them. For
each fight slot below, write a `metal_` track's name in `notes.txt` if it already does the job.

## How a night will sound

1. Peacetime music while you prepare.
2. **The alarm** sounds → `sting_alarm` hits right on top of it → the fight music starts **at
   its hit point**.
3. The fight gets heavier as the numbers and the danger go up: tier 1 → 2 → 3.
4. It stays hot until the **last zombie** dies. Then `sting_clear`: relief.
5. `aftermath` for a minute, then back to peacetime.

Special nights and the guardian swap in their own tracks for steps 2 and 3.

## Slots, in order of priority

### 1. The round starts: `sting_alarm`

3 to 8 seconds, played on top of the siren. It's the "oh no, here they come" moment.

> Instrumental, no vocals. Brutal metal intro: a huge tom and snare drum fill crashing into one
> massive downtuned guitar chord that rings out, air-raid siren texture underneath, 140 BPM,
> E minor. Aggressive, cinematic, instant impact.

### 2. The last zombie dies: `sting_clear`

5 to 10 seconds. You made it: a release of tension, not a victory parade.

> Instrumental, no vocals. Cinematic resolution: one big final drum hit and a crashing cymbal,
> then a warm, wide major chord swelling on strings and clean guitar, relief and exhaustion,
> slow, 8 seconds, fade to silence.

### 3. Fight music in three weights

Each needs a steady tempo, an early hit, and **no long fade-out** (we loop it). 2 to 4 minutes.

**Tier 1, the first nights and small waves: `fight_1a`, `fight_1b`.** Tense and driving, not
full metal yet.

> Instrumental, no vocals. Dark driving action score: pulsing synth bass, tight hybrid
> percussion, palm-muted downtuned guitar chugs, low strings ostinato, tense and relentless,
> 124 BPM, D minor, loopable, starts strong with no slow intro.

**Tier 2, a real wave with the line under pressure: `fight_2a`, `fight_2b`, `fight_2c`.**

> Instrumental, no vocals. Heavy modern metal: fast double-kick drums, crushing downtuned riffs,
> aggressive groove, dark cinematic synth layer, 140 BPM, E minor, relentless energy for a
> zombie horde battle, loopable, no slow intro.

**Tier 3, being overrun: `fight_3a`, `fight_3b`.** The most frantic.

> Instrumental, no vocals. Extreme, chaotic metal: blast beats, tremolo-picked guitars, dissonant
> stabs, pounding war drums, panic and desperation, 165 BPM, C phrygian, loopable, instant start.

### 4. Ember Night (the renamed Blood Moon): `sting_ember`, `fight_ember`

The special night players will remember. It burns.

> `sting_ember`: Instrumental, no vocals. Ominous and huge: a deep war horn, a burning low
> drone, a single choir chord with no words, a massive drum boom. 8 seconds, apocalyptic.

> `fight_ember`: Instrumental, no vocals. Industrial doom metal with a wordless choir: slow,
> crushing riffs that break into fast sections, church organ, war drums, fire and ruin,
> 100 BPM with half-time breakdowns, C minor, epic and apocalyptic, loopable.

### 5. The guardian: `sting_guardian`, `boss_guardian`

When it shows up and while you fight it. It should sound like a monster, not a band.

> `sting_guardian`: Instrumental, no vocals. Horror sting: violent string screech, a sub-bass
> hit, metallic scrape, a distorted roar-like swell, 5 seconds, terrifying.

> `boss_guardian`: Instrumental, no vocals. Monstrous boss battle: tribal drums, horror
> string stabs, detuned brass, heavy sludge riffs, 90 BPM, Bb phrygian, primal and terrifying,
> loopable.

### 6. Daytime skirmishes: `day_skirmish_a`, `day_skirmish_b`

New: the POI fights in daylight. They should feel different from the night: tense and
adventurous, not horror.

> Instrumental, no vocals. Tense outdoor action: gritty baritone guitar riff with a western
> edge, driving drums, stomps and claps, dark synth pad, 112 BPM, A minor, gritty survival
> action, loopable.

### 7. The other special nights

One track each is enough (we can reuse `sting_ember`'s style for the stings, or you make one per
night).

- **Fog Night, `fight_fog`:** suspense, not metal. You can't see them coming.
  > Instrumental, no vocals. Horror suspense: heartbeat kick, detuned music box, reversed
  > pianos, low drones, sudden string stabs, sparse and unsettling, 70 BPM, loopable.
- **Swarm Night, `fight_swarm`:** fast runners everywhere.
  > Instrumental, no vocals. Frantic speed metal meets drum and bass: 175 BPM, breakneck drums,
  > shredding tremolo guitars, alarm-like synth arps, panic, loopable.
- **Siege Night, `fight_siege`:** brutes hammering the walls.
  > Instrumental, no vocals. Slow crushing sludge metal: 80 BPM, enormous war drums, walls of
  > distorted guitar, grinding bass, relentless and heavy like a battering ram, loopable.
- **Silent Night, `silent_drone`:** there's no alarm, so the music barely exists.
  > Instrumental, no vocals. Almost silent dark ambient drone: a low hum, faint distant metallic
  > creaks, breathing-like textures, no rhythm, very quiet and unsettling, 3 minutes.

### 8. Between the moments

- **`aftermath`**, 60 to 90 s, the minute after a wave. `aftermath_hold` exists; replace it only
  if you find better.
  > Instrumental, no vocals. Somber aftermath: lonely clean electric guitar, soft pads, distant
  > wind, exhausted and bittersweet, slow, 60 BPM.
- **`sting_night_falls`**, 5 to 10 s, when dusk turns to night.
  > Instrumental, no vocals. Ominous transition: a low brass swell, a rising dark drone, a faint
  > heartbeat, dread building, 8 seconds.
- **`sting_dawn`**, 8 to 15 s, you survived the night.
  > Instrumental, no vocals. Sunrise after a long night: warm strings and gentle piano rising
  > into a hopeful major chord, relief, 12 seconds.

### 9. Small cues (nice to have)

About 2 seconds each, for achievements, a POI cleared, an airdrop incoming, an objective done.
Easiest: make one short fanfare track and tell us the timestamps of three or four moments you
like; we'll cut them all from it.

> Instrumental, no vocals. Short military-style fanfare and stingers: a snare roll into brass
> hits, a bright synth chime, a heroic three-note motif, punchy, 20 seconds.

## Sound effects (ours, not Suno)

We build these in the game's sound engine, so they don't need files. If you want to try Suno
for any of them, go ahead: a good file beats a synthesized one.

- The guardian's screech when it attacks.
- Groans and whispers that grow as you get near a cave mouth.
- A low rumble and bubbles over the lake pit as you swim close.
- A warning cue when a special night begins (on top of its sting).

## Checklist

| # | Slot | Length | Status |
| --- | --- | --- | --- |
| 1 | `sting_alarm` | 3 to 8 s | |
| 2 | `sting_clear` | 5 to 10 s | |
| 3 | `fight_1a`, `fight_1b` | 2 to 4 min | |
| 3 | `fight_2a`, `fight_2b`, `fight_2c` | 2 to 4 min | |
| 3 | `fight_3a`, `fight_3b` | 2 to 4 min | |
| 4 | `sting_ember`, `fight_ember` | 8 s, 3 min | |
| 5 | `sting_guardian`, `boss_guardian` | 5 s, 3 min | |
| 6 | `day_skirmish_a`, `day_skirmish_b` | 2 to 3 min | |
| 7 | `fight_fog`, `fight_swarm`, `fight_siege`, `silent_drone` | 2 to 3 min | |
| 8 | `aftermath`, `sting_night_falls`, `sting_dawn` | varies | |
| 9 | fanfare for small cues | 20 s | |

Slots 1 to 3 alone fix most of what you felt: the fight music starts on the alarm, hits hard
right away, and ends with a release when the last zombie dies.
