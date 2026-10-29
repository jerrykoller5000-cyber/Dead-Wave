# z-sounds

> **CL-162 (2026-10-10): every take evened, batch 3 in.** All 1,348 ElevenLabs takes (zombies, batch 2, batch 3)
> are in `<category>/<sound>/<sound>-N.ogg` and evened to one loudness (the loudest 0.4 s of each one-shot, or the
> whole length of a loop, at -20 LUFS; peaks under -1 dB). The game's mix is unchanged: `core/takes.js` still sets
> each take to its folder's level. **Jerry is picking takes by deleting the bad ones here**; the game plays whatever is
> left (see `_HOW TO PICK TAKES.txt`). Batch 3 (80 sounds, 301 takes) is imported; 26 of its folders play in the game
> now (`WIRED_3` in `core/takes.js`), the rest wait for their features. Not generated yet: `weapons/machine-gun-shot`,
> `weapons/rotary-gun-loop`, `turrets/light-turret-shot`, `turrets/heavy-turret-shot` (the 16 pending jobs in the
> batch-3 tool).

> **CL-272 (2026-10-26): takes from Jerry's sound packs.** Files named `pk-<pack>-<name>.ogg` are made from the packs
> in `F:\Sound_Effects` (docs/audio/packs.md, `tools/pack-make.py`). In a folder that has them they play instead of
> the ElevenLabs takes, which stay right there: on the listen page tick **"your takes, not the pack's"** for that
> folder to hear yours in the game again. They're git-ignored (the licences don't allow them on GitHub) and ship in the
> builds. First in: both guardians (`zombies/guardian/*`, `zombies/caveguard/*`).

**Three sets of folders in here:** the zombies (`zombies/`, `footsteps/`, `impacts/`, `horde/`, `build-attacks/`;
prompts in `PROMPTS.md`), the rest of the game (`player/`, `weapon-foley/`, `weapons/`, `bullet-impacts/`, `builds/`,
`turrets/`, `hq/`, `world/`, `below/`, `vehicles/`, `ui/`, `training/`; prompts in `PROMPTS-2.md`), and since CL-161
batch 3 (`crew/`, `burial/`, `story/` and more in the groups above; prompts in `PROMPTS-3.md`, the bulk tool in
`review/elevenlabs-batch-3`). The first two are in the game (CL-156, CL-161); batch 3's folders are wired when their
takes are in: tell Claude.

- **Each sound can be switched off:** on the listen page (below), untick "in the game" and the game plays its own
  sound there again. The gunfire (`weapons/`, the TRY prompts) is the other way round: the game keeps its own until
  you tick a gun on, so you can compare.
- **The loops** (wind, rain, the river, the crickets, the warren's air, the NVG hum, the chainsaw, the lure, Heron at
  the dock) play as beds: one take looping, the game's own layer quiet under it. Their levels are in `core/audio.js`
  (BED_K); `levels.json` here works for them too.
- Not played by the game: `weapons/machine-gun`, `rotary-gun`, `rotary-spin`, `flamethrower`, `turrets/light-` and
  `heavy-turret-fire` (bursts and a loop, which can't play round by round: batch 3 has single shots for them), and
  `vehicles/cargo-plane-interior` (there is no scene inside the plane).

Where the zombie sounds from ElevenLabs go. Every folder has a `_prompt.txt` with the prompt for it;
`PROMPTS.md` has them all in one list to copy from. Put the takes from each prompt in its folder (any file names; mp3,
wav or ogg) and **the game plays them the next time it starts** (CL-148): each zombie picks one of the takes at random,
pitched a little per zombie, so four sound like a crowd. A folder with no takes keeps the game's own sound.

- **Check what the game has found:** double-click `Listen to Z-Sounds.bat` in the game folder. It lists every folder,
  how many takes are in it, plays each take, and plays one "as in the game" (evened and at its level). Files in a
  folder the game doesn't know are listed at the top.
- **Your Z-Sounds layout works too:** you can copy a whole folder like `04 - New Voices` (Bomber\Hit Reaction,
  Cave Guardian\Idle, Leaper\Movement, Colossus\Footstep ...) in here as it is.
- **Too loud or too quiet?** Make a `levels.json` here, for example `{ "zombies": 1, "zombies/brute": 1.3,
  "footsteps/shuffle": 0.6 }` (1 is as it is; the longest matching folder wins). Takes are evened to one loudness
  per kind first, so one setting per folder is usually enough.

```
zombies/shambler/         idle, chase, attack, hurt, death
zombies/feral/            idle, chase, attack, hurt, death
zombies/leaper/           idle, chase, attack, hurt, death, move
zombies/spider/           idle, chase, attack, hurt, death, spit, acid-splash
zombies/drowned/          idle, chase, attack, hurt, death
zombies/military/         idle, chase, attack, hurt, death
zombies/brute/            idle, chase, attack, hurt, death
zombies/spitter/          idle, chase, attack, hurt, death
zombies/screamer/         idle, chase, attack, hurt, death, call
zombies/bomber/           idle, chase, attack, hurt, death, burst
zombies/demon/            idle, chase, attack, charge, hurt, death
zombies/colossus/         idle, chase, attack, hurt, death, step
zombies/guardian/         idle, chase, attack, hurt, death, roar, slam
zombies/caveguard/        idle, chase, attack, hurt, death, growl, screech, cave-groan, in-walls
footsteps/                shuffle, barefoot, waterlogged, boots, hop, crawl, heavy, huge
impacts/                  flesh-hit, flesh-hit-heavy, headshot, gore-small, gore-big, body-fall
horde/                    emerge, groan-near, distant
build-attacks/            wood-hit, wood-break, stone-hit, stone-break, sand-hit, sand-break, wire-hit, wire-break, metal-hit, metal-break, turret-hit, turret-break
```

`manifest.json` is for Claude: each folder, its prompt, and the game hook it replaces.
