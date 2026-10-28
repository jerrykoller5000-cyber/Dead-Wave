# The sound packs (Jerry, 2026-10-26; CL-272)

Jerry bought three big sound effect packs and put them in `F:\Sound_Effects` on his PC: "I want you guys to go through
and see what you can use/replace sound effects with. Let's get our monies worth." His rule (2026-10-26, corrected the
same evening: "Most Zombie sounds. Not all the sounds; there are a ton of material to work with in the packs"):
**hands off most of the zombie sounds** (batch 1: `zombies/*` voices, the horde, the dead's footsteps, the flesh hits
and gore, the builds being attacked: his takes stay) **and the HQ alarm sequence**. **Replace both guardians' sounds**
(the cave guardian `zombies/caveguard/*` and the heart's guardian `zombies/guardian/*`). **Everything else is open:
the UI, the world and the weapons** take the packs wherever a pack sound is better than what's there, his take or the
game's own synthesized one. His takes that a pack sound replaces stay where they are (below), so any folder comes back
to his with one tick.

## What's in them (52 GB, about 6,400 files, all WAV)

| Pack | Files | What's useful to us |
| --- | --- | --- |
| `Guns\Real Firearms Sounds` | 618 | Game-ready per weapon: single shots, firing loops, last shot, equip and unequip, mag eject and insert, reload hands, the minigun's barrel spin (start, loop, end). Rifles 1-7, MGs 1-3, minigun 1-2, pistols 1-6, revolver, shotguns 1-2, sniper, SMGs 1-8, grenade launchers 1-3, a missile launcher; "Bullet Sound FX" (75: whizzes, impacts). |
| `UI\Binary Code 3 - Interface Multiverse` (Sound Response) | 1,300 | Interface sounds in ten styles: 1 Neutral (Simple), 2 Neutral (Delayed), 3 Confirmed (Access Granted), 4 Denied (Access Denied), 5 Data Processing (Futuristic), 6 Data Processing (Retro), 7 Subtle Transitions & Holograms, 8 Glitches, 9 Typing, 10 8-Bit Retro. |
| `OCULAR_SOUNDS` (Ocular Sounds, 20 libraries) | about 4,900 | **Aberration** (creature growls, moans, mutations, guttural distortion, braams, drones, eerie, stingers: the guardians and the uncanny). **Sinister** (horror strings, designed tonal and granular). **Puncture** (designed stingers, impacts, eerie). **Foundation** (impacts, booms, whooshes, risers). **Carnage** (gore: splats, bone, squish, stabs, flesh). **Mechanica** (gears: lifts, vault doors, cranks). **Utility** (keyboards, paper handling, pencils and pens, tools, electric motors). **Aperture** (cameras: the hikers' camera). **Stride** (853 footsteps, boots among them). **Countryside, The Provence, Rainforest, Seaside, Swell** (ambiences: fields, forest, rain, shore, waves). **Felt** (designed and piano pings). Velocity, Vélo, Cityscapes 1-2, Pendulum: little for this valley. |

Each Ocular library has a `... Metadata Import.csv` (file, description, category, duration); the UI pack has its
`Binary Code 3 - Interface Multiverse Metadata.xls`. The cloud copies of those catalogues are what Claude searched.

## The licences: in the game yes, on GitHub no

The UI pack's licence (Docs\License Agreement.pdf) is royalty-free for video games, and forbids "uploading ... to or
from any server or database", sharing, or the files leaving the production on their own; it is a single-user licence.
Ocular's libraries and the gun pack carry no licence file in their folders: their terms are the store's where Jerry
bought them (to check before selling, with docs/audio/licences.md). Until then they're treated the same way. So:

- **Every file made from a pack is named `pk-<pack>-<name>.ogg`** and lives in its z-sounds folder beside Jerry's takes.
- **`.gitignore` keeps `z-sounds/**/pk-*` out of git** (and out of GitHub): the files exist on Jerry's PC and inside
  the builds, which `tools/package.mjs` makes from the folder (it copies z-sounds/ whole). A clone without them simply
  plays Jerry's takes or the game's own sound in those folders, as before.
- **`z-sounds/index.json` (committed) leaves them out; `z-sounds/index-packs.json` (git-ignored) lists them**
  (`node tools/zsounds-index.mjs` writes both); the take bank reads both. The game's local servers (/__zsounds) and a
  build's own index list everything anyway.
- `NOTICES.txt` and `docs/audio/licences.md` name the three packs and their makers.

## How a pick becomes a sound in the game

1. **Pick** (the family's owner, below): a list in `docs/audio/packs/<family>.json`, one entry per game folder:
   `{ "<z-sounds folder>": [ { "src": "F:\\Sound_Effects\\...wav", "why": "one line", "start": 0, "end": null } ] }`.
   Two to five takes a folder (variety: nothing that repeats should sound the same twice running). Name the sound rule
   for each (immersive or impactful) and the family (`docs/sound-principles.md` §5: military mechanical and close; the
   uncanny low, close, breathing). Short where it repeats: a UI click under 0.25 s, a gun's shot without its tail.
2. **Make** (Claude: `python3 tools/pack-make.py docs/audio/packs/<family>.json --src-root "F:\Sound_Effects=<the
   packs>" --out z-sounds`; ffmpeg and numpy): each take cut to its `start`/`end`, high-passed at the folder's `hp`
   (below it a pack's sub only eats the level the game evens to), faded, mono for anything placed in the world
   (`"stereo": true` keeps two channels for the UI), 48 kHz, OGG Vorbis, `pk-<pack>-<name>.ogg` in the folder. The game
   evens every take to its folder's measured level (`core/take-levels.js`), so a pack take comes in where Jerry's did;
   where the ear still hears a folder's pack takes louder or softer than his at that level (K-weighted loudness after
   the evening, measured per folder), `PACK_TRIM` in `core/takes.js` evens it.
3. **Wire**: in a folder that has pack takes, they play and his takes rest in place (`core/takes.js`: `chosenTakes`);
   on the listen page (Listen to Z-Sounds.bat) the pack takes are the purple P buttons, and **"your takes, not the
   pack's"** puts his back in the game for that folder (kept in the browser, like "in the game"). A folder can also be
   switched off whole, as before. Never a zombie folder but the guardians'. A sound the game still synthesizes gets a
   folder and a `tk()` call.

## Done

- **Both guardians (CL-272, 2026-10-26): 66 takes in 16 folders**, picks in `docs/audio/packs/guardians.json`, all
  from Ocular (Aberration's mutant growls, moans and designed mutants; Sinister's breaths, hits, strings and whooshes;
  Puncture's jump scares; Foundation's booms). The heart's guardian: raspy torn-throat growls and barks, moans for its
  death, four roars, four slams. The cave guardian: thin close breaths, whistling chitters and scrapes, wet clicks,
  creaking friction-moans for its growl and the cave's groan, things moving in the rock. Picked from the spectra, the
  libraries' descriptions and Jerry's prompts; Claude can't hear them, so the listen page is where they're judged.

- **The UI (CL-272, 2026-10-27): 26 takes in 12 folders**, from ChatGPT's picks (`docs/audio/packs/ui.json`, GP-19975:
  Binary Code 3's Neutral, Confirmed, Denied and Typing, one military-terminal family), made with `--pack bc3 --route
  ui/kiosk-tab=hq/kiosk-tab --route ui/shop-tab=hq/kiosk-tab` (the kiosk and the shop share one tab sound). In: the
  menu's click, hover and back, the objective, the kiosk's tab, the Training Ground's panel beep and keypad deny, and
  five new folders for sounds that were only synthesized (`PACK_FOLDERS`: the reset blip, the relay panel's keys, deny
  and opening chime, the Training Ground's way in). **Left as they are, on purpose:** Jerry's heavy-metal stingers
  (victory, game over, wave start, streak, day cleared, badge, missing in action, déjà vu: his own picks, a character
  the terminal's chimes don't have); the sounds whose prompts are things, not a terminal (the map is paper being
  unfolded and folded, the dawn card a card slid across a table, expand a structure locking open, the keypad's press
  a rugged metal button and its accept a magnetic lock's clunk: those are the world family's, from Utility's paper and
  Mechanica if anything); `ui/panel-beep` (the relay's beep is the mast's number signal and the Training Ground's
  count); the Training Ground's clear and blackout (their actions have their own sound).

- **The world, first pass (CL-272, 2026-10-27): 18 takes**, picks in `docs/audio/packs/world.json`. **Four beds** from
  Ocular's field recordings (The Provence, Countryside), each a seamless 24 s loop (`"loop"` in the picks): the day's
  wind (a constant wind through trees over a field), the night's crickets (a wood at night), the river (two streams),
  the rain (steady rain on trees and stone). **Three sounds that were only synthesized** (`PACK_FOLDERS`): the relay
  vault's door (Puncture's metal-slam mechanism stems: bolts, a wheel, a reinforced door), the relay hatch's latch
  (Mechanica's latches), the field notes' paper (Utility's note sheets). Kept: his night wind, the lake shore (the
  packs' water is the sea's), the frogs (a rainforest's), birds, owl, thunder, the fires, the cave mouths (below).
  **Found:** his four cave-mouth takes were in `world/crickets-night/cave-mouth/`, so the game read them as crickets
  (and the bed played a cave's breath for crickets) while the cave mouths had nothing; copies are now in
  `world/cave-mouth/`, and the crickets folder's pack takes play over the strays. Jerry deleted the stray folder
  (2026-10-27). The camera's click for GP-19974's clip (`story/camera`, Aperture's Canon T7i) came with it.

- **The weapons (CL-272 from Grokbot's GB-239 picks, 2026-10-27): 117 takes in 44 folders**, picks in
  `docs/audio/packs/weapons.json`, all from Real Firearms Sounds and its Bullet Sound FX (`pk-rfs-*`). Every gun's
  single shot (layered over the game's own, as his were), the reload parts (mags, slides, bolt, shells, cylinder, the
  rotary gun's box, the launcher), the brass, the draw, the bullets' hits in dirt, rock, metal, wood and sand; the
  machine gun's single shot and both turrets' shots, opt-in folders that were never filled, now play the pack's
  (`usesTakes`: an opt-in folder with pack takes is on, still his to switch off). **The rotary gun:** its roar while it
  fires (`weapons/rotary-gun-loop`, a seamless loop under its rounds, gone 0.2 s after the last) and its barrels at
  speed (`weapons/rotary-spin-loop`, new: a loop whose pitch and level follow the barrels, in place of the synthesized
  motor); the Training Ground's containment bed (`weapons/rotary-gun`) is made a loop too (1.8 s, seamless) instead of
  the picks' 2 s cuts, which would have clicked each time round (Grokbot updates his picks to match). **Heard only on
  the listen page:** the machine gun's three-round burst and the light turret's rattle (the game fires round by round),
  the spin-up (`weapons/rotary-spin`), the wind-down (`rotary-spin-end`, new: the loop's falling pitch does it) and a
  round passing close (`bullet-impacts/whiz`, new: nothing in the game shoots at him). Left as his: the mortar, the
  flamethrower, the chainsaw, blades, grenades, pumps, the slide's back, the dry fire, the suppressor, the laser, the
  wheel, the belt, the heavy turret's fire, the flesh hits (the zombies' side).

- **The player (CL-272 from Cursor's CU-164 picks, 2026-10-27): 40 takes in 10 folders**, picks in
  `docs/audio/packs/player-builds.json`, all Ocular Stride (`pk-ocular-*`): boots on concrete (stone), glass (the
  Training Ground's tile), metal, wood and water; gravel for the packed ground and the run; grass for leaves; a boot
  stomp for the landing; a boot on a steel rung for the ladder. In the game: the ground, the run, wading, the boards,
  the Training Ground's floor, the landing, the ladder. **Made, not yet heard in the game:** stone, metal and leaves
  (batch 3's folders: the game doesn't tell its footsteps which ground they're on yet). Left as his: mud, jump, the
  roll, the vault, the swim, breath, both hurts, and every builds folder (the packs have none of them).

- **Levels:** the bank evens a pack take like the take it replaces, then `PACK_TRIM` (core/takes.js) sets it where
  the ear hears his: K-weighted loudness after the evening, his against the pack's, folder by folder. 44 folders are
  trimmed so far (11 from the first three, 33 from the weapons and the player), from 0.1 (the day's wind) to 1.72
  (wading).

## Who does what

| Family | Owner | Task |
| --- | --- | --- |
| The pipeline (convert, level, name, ignore, index, NOTICES); both guardians; the world: the ambience beds (wind, rain, the river and the lake, crickets, frogs, birds, owl, thunder, campfire, fire, cave mouths), below (the warrens, drips, the rock), the HQ's machines (never the alarm), the story's and the crew's sounds, the vehicles, and every world sound the game still synthesizes (the relay's boot, clunk, spark and static, the vault's door and lift, the truck's cutters, chain and alarm, paper, the lighter) | Claude | CL-272 |
| The UI: every `ui/*` folder (click, hover, back, the map, wave start, streak, day cleared, objective, badge, dawn card, expand ...), the kiosk and the shop, the panels' keys, beeps and opens (the relay's panel, the keypads' accept and deny), the reset blip, the Training Ground's panel beeps | ChatGPT | GP-19975 |
| The weapons: every gun's shots, loops and tails, the reload parts (`weapon-foley/*`: mags, slides, bolts, pumps, shells, cylinders, belts), draw and holster, the minigun's spin, the empty folders (machine-gun shot, rotary-gun loop, the turret shots), the bullets' impacts and whizzes (`bullet-impacts/*`), the explosions and the grenade launcher, the turrets, the katana's draw | Grokbot | GB-239 |
| The player and the builds: his footsteps on each ground (Ocular Stride's boots), jump, land, roll, vault, ladder, swim, his breath and hurt; `builds/*` (placing wood, sandbags, metal, wire, turrets, upgrade, repair, sell, doors, mines); then the packaged build and the listen page with the pack files present, and CU-163's rerun in chunks | Cursor | CU-164 |

## What the game synthesizes today (no take folder at all)

From core/audio.js (2026-10-26): the relay panel's keys, beep, boot, open, clunk, spark and static; the reset blip;
the vault's door and lift; the bolt cutters' pick-up and bite, the chain's snap, the truck's alarm; the paper rustle;
the lighter; the katana's draw. (2026-10-27: the relay panel's keys, deny and opening chime, the reset blip, the
vault's door, the relay's clunk and the paper have pack takes now, and the minigun's spin; the four empty opt-in
folders, the machine gun's shot, the rotary gun's loop and both turrets' shots, are filled from the gun pack.)
