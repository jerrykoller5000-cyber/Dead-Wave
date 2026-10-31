# 1.2 cue sheet — first draft (MU-5, D-97 step 3)

From `docs/audio/music/analysis.json` (MU-3) and the tables in `docs/audio/music-1.2.md`. Numbers and catalogue paths only: no audio copied, converted or moved (Ghosthack licence). Machine-readable sheet: `docs/audio/music/score.json` (one record per moment; stems by role, bars to loop, LUFS to level to). Jerry's heavy-metal stingers stay (D-97): cues here fill only moments with no stinger of his and never play over his.

## How picks were made

- **Nights:** plan tempo bands; one key per night; 2-4 kits; no kit repeated across the 20 nights. Within a key, kits with the most whole-bar layers first. Stems listed are whole-bar files only; `loop_bars` is the shortest core-stem bar count (kick/snare/hats/bass/rhythm), so every layer loops together.
- **Leveling:** each kit record carries `stem_level_lufs` (median LUFS of its whole-bar stems) for the maker to even layers inside a kit; each moment carries `target_lufs` (fights/motifs -16, places -18, cues -12) as the first-draft master for `tools/music-make.py` (step 4). True peaks ride along per stem.
- **Motifs/specials:** the plan's named kits verbatim. **Places/cues:** plan material; longest clean files first, DRY before WET where both exist.

## Nights 1-20

| night | key | kits (BPM) | loop bars | stem level LUFS |
| --- | --- | --- | --- | --- |
| 1 | Em | Scarecrow 105bpm Emin (105), Revenge 100bpm Emin (100), Basilisk 100bpm Emin (100) | 16, 16, 16 | -23.6, -21.1, -19.1 |
| 2 | Fm | Surge 110bpm Fmin (110), Viper 110bpm Fmin (110), Phobia 105bpm Fmin (105) | 16, 16, 16 | -26.9, -21.9, -22.5 |
| 3 | Dm | Tyrant 100bpm Dmin (100), Realm 105bpm Dmin (105), Cleanse 115bpm Dmin (115) | 16, 16, 16 | -25.6, -21.9, -21.8 |
| 4 | F#m | Trauma 110bpm F#min (110), Gloom 110bpm F#min (110), Sin 110bpm F#min (110) | 16, 16, 16 | -21.9, -25.3, -22.9 |
| 5 | Em | Deadweight 110bpm Emin (110), Mental 100bpm Emin (100) | 16, 16 | -21.4, -22.2 |
| 6 | Em | Decay 130bpm Emin (130), Flux 130bpm Emin (130) | 16, 16 | -26.1, -20.6 |
| 7 | Gm | Grave 130bpm Gmin (130), Deathmark 130bpm Gmin (130) | 16, 16 | -21.4, -21.6 |
| 8 | Em | Ironclad 130bpm Emin (130), Babylon 140bpm Emin (140) | 16, 16 | -21.2, -23.7 |
| 9 | Dm | Despair 130bpm Dmin (130), Consume 155bpm Dmin (155) | 16, 16 | -21.8, -21.1 |
| | | fill: Consume 155bpm Dmin (155 BPM): borrowed from outside the tempo band | | |
| 10 | Bm | Disruptor 140bpm Bmin (140), Binary 150bpm Bmin (150) | 16, 16 | -21.4, -22.7 |
| | | fill: Binary 150bpm Bmin (150 BPM): borrowed from outside the tempo band | | |
| 11 | D#m | Hellmouth 150bpm D#min (150), Voltage 150bpm D#min (150) | 16, 16 | -25.1, -22.3 |
| 12 | D#m | Exterminate 150bpm D#min (150), Cursed 150bpm D#min (150) | 16, 16 | -21.5, -22.7 |
| 13 | Fm | Ruin 150bpm Fmin (150), Onslaught 150bpm Fmin (150), Tremor 150bpm Fmin (150) | 16, 16, 16 | -20.4, -20.8, -20.2 |
| 14 | D#m | Chamber 150bpm D#min (150), Crypt 150bpm D#min (150) | 16, 16 | -23.6, -21.9 |
| 15 | Em | Purgatory 150bpm Emin (150), Rusted 156bpm Emin (156) | 16, 16 | -21.4, -20.9 |
| 16 | Fm | Hellforged 170bpm Fmin (170), Cult 160bpm Fmin (160), Rampage 170bpm Fmin (170) | 16, 16, 16 | -23.6, -21.5, -23.8 |
| 17 | Fm | Nightmare 170bpm Fmin (170), Vortex 170bpm Fmin (170), Hellfire 160bpm Fmin (160) | 16, 16, 16 | -23.6, -18.9, -23.4 |
| 18 | Fm | Havoc 160bpm Fmin (160), Exile 175bpm Fmin (175) | 32, 16 | -19.8, -20.6 |
| 19 | Fm | Warlord 170bpm Fmin (170), Abyss 170bpm Fmin (170) | 16, 16 | -20.9, -22.2 |
| 20 | C#m | Annihilation 165bpm C#min (165), Epitah 170bpm C#min (170) | 16, 32 | -27.3, -24.8 |

Why: tempo follows the plan's ramp (100-115 heavy, 125-140 driving, 147-156 relentless, 160-175 the end); keys stay minor throughout, matching the catalogue (all Hellshot kits are minor). Role coverage is near-total: almost every kit loops kick, snare, hats, bass and rhythm guitar on whole bars, so the vertical layers (drums+bass / rhythm / lead+synth) exist per kit record.

## Training Ground motifs (plan-fixed)

| type | kit (BPM, key) |
| --- | --- |
| shambler | Rotten 125bpm D#min (125), D#m |
| feral | Frenzy 160bpm Fmin (160), Fm |
| brute | Sledgehammer 150bpm Cmin (150), Cm |
| colossus | Titan 130bpm Emin (130), Em |
| spitter | Venom 130bpm Gmin (130), Gm |
| spider | Glitchform 130bpm D#min (130), D#m |
| leaper | Chimera 110bpm Emin (110), Em |
| screamer | Haunted 150bpm Emin (150), Em |
| bomber | Carnage 130bpm Emin (130), Em |
| drowned | Gutter 150bpm Fmin (150), Fm |
| demon | Inferno 160bpm Gmin (160), Gm |
| the guardians | Hell Knight 105bpm Dmin (105), Dm |

## Specials

- **guardian fight** (special-guardian): Hell Knight 105bpm Dmin (105) — shares the guardian motif kits (Hell Knight, Wraith); Wraith record in special-guardian-b
- **guardian fight (second kit)** (special-guardian-b): Wraith 170bpm Fmin (170)
- **the heart's fight** (special-heart): Doom 103bpm F#min (103) — plan: heaviest slow kit (Doom or Tyrant); Doom 103 F#m picked, Tyrant is night-pool
- **colossus fight** (special-colossus): Titan 130bpm Emin (130) — shares the colossus motif kit (Titan) by plan
- **red sky night** (special-red-sky): Flame 170bpm D#min (170) — plan names Ember; no Ember kit exists in the catalogue — Flame 170 D#m is the stand-in (gap)
- **the wanderer** (special-wanderer): Rude 160bpm Emin (160) — first-draft pick: Rude 160 Em, a roaming mid-high kit outside the night suites
- **fog night** (special-fog): no kit — no kit: Dark Valley underscores (wet) + Mystery drones under the night suite (see places)

## Places and cues

| moment | material (plan) | files | first pick |
| --- | --- | ---: | --- |
| the menu | Anomaly Clear Sky (the valley before) | 6 | Ghosthack-A_Kit 05_Clear Sky_Am 65Bpm.wav |
| dawn and the day's peace | Cinematic Blue Peace; Clear Sky by day | 6 | GH_FS III_Songkits_Blue Peace_Cmaj_90bpm_ Atmosphere.wav |
| the HQ and its yard | Anomaly Safe Zone | 6 | Ghosthack-A_Kit 01_Safe Zone_Am 70Bpm.wav |
| dusk, forest at night, walk home | Anomaly Dark Valley; granular underscores (wet) | 6 | Ghosthack-A_Kit 02_Dark Valley_Cm 65Bpm.wav |
| caves, Hollows, Marrow | Anomaly The Anomaly + Brain Scorcher; drones | 9 | Ghosthack-A_Kit 03_The Anomaly D# 70Bpm.wav |
| graveyard, chapel, first people | granular underscores (dry); tonal one-shots | 6 | Ghosthack-A_Alone Fm 65Bpm (DRY).wav |
| relay, vault, mast | Mystery Nightfall pulses | 4 | Ghosthack-MN_Pulse Loop 80_Abnormality_E.wav |
| Coldwater, hikers, the missing | Cinematic Unappreciated | 6 | GH_FS III_Songkits_Unapreciated_Cm_140bpm_ White Noise Riser.wav |
| alarm's build, prep before a night | Cinematic Pressure, then a braam | 6 | GH_FS III_Songkits_Pressure_Em_150bpm.wav |
| nearing an objective/survivor/cache (last 40 m) | pulse loop that grows | 4 | Ghosthack-MN_Pulse Loop 80_Abnormality_E.wav |
| on finding it | tonal one-shot | 3 | Ghosthack-MN_Tonal_Entangle_D.wav |
| mission done, camp cleared | Captain's Ship phrase / melodic one-shot over a braam | 5 | GH_FS III_Songkits_Captains Ship_Cm_106bpm.wav |
| wave's start | braam | 3 | Ghosthack-MN_Braam_Expanse_D.wav |
| last kill | impact | 3 | Ghosthack-A_Shocker Gm 65Bpm (DRY).wav |
| boss's entrance | riser into impact | 3 | Ghosthack-MN_Riser_Collide.wav |
| night falling | drone | 3 | Ghosthack-MN_Drone_Scavenge_C.wav |
| fallen; the last dawn | Anomaly impacts into Dark Valley end; Blue Peace in full | 5 | Ghosthack-A_Kit 02_Atmos Drone_Cm 65Bpm (WET).wav |

## Moments with no good material (gaps for Claude/Jerry)

- **Red sky (plan: Ember):** no kit named Ember exists in the catalogue. Flame (170, D#m) stands in; rename by ear or accept Flame.
- **Shared kit:** special-guardian / motif-guardians share Hell Knight + Wraith (plan gives the guardians both jobs). First draft keeps the plan's pairing; split only if play shows the clash.
- **Shared kit:** special-colossus shares Titan with the colossus Training motif (plan). First draft keeps the plan's pairing; split only if play shows the clash.
- **Night fill:** night-09: Consume 155bpm Dmin (155 BPM): borrowed from outside the tempo band. Band 125-140 fragments by key (four single-kit keys), so two nights borrow.
- **Night fill:** night-10: Binary 150bpm Bmin (150 BPM): borrowed from outside the tempo band. Band 125-140 fragments by key (four single-kit keys), so two nights borrow.
- **Borrow flags (MU-8):** both borrowed kits carry `"borrow": true` in score.json; the checker reports them as INFO, not mistakes. Jerry's ear judges them at the listen page (step 6) — if a borrow jars, its night falls back to its in-band kit alone.
- **No lead/synth layer loop:** Tremor 150bpm Fmin — their peak layer must borrow the kit's fx stems or stay at rhythm (maker's call, step 4). All other night kits loop a lead or synth.
- **Anomaly tempo reads:** only 35/281 Anomaly files agree with their named tempo (beatless material; MU-3 `tempo_conf` median 0.57). Place beds loop on duration, not bars — the maker should loop the longest DRY stems by ear-free crossfade, not the bar grid.
- **Wet tails:** 21 kits (mostly Anomaly) have stems off the bar (MU-3 list); WET variants are excluded from loop picks wherever a DRY twin exists.
- **Fog night** has no kit by design: Dark Valley wet underscores + Mystery drones sit under the night suite; if the suite must change character for fog, that is a step-5 director call.
