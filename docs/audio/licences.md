# What the game ships that someone else made: the licence check before selling (CL-221, D-84)

For Jerry, before 1.0 goes on itch.io for money (and before Steam). Every sound and song in the build, where it came
from, and what has to be true for it to be sold. The build is `tools/package.mjs`: `index.html` and the folders
assets, combat, core, game, studio, ui, vendor, world and z-sounds. Claude is not a lawyer: the terms to read are the
services' own.

## Jerry's answers (2026-10-20)

- The Suno songs: made on his paid Suno plan.
- The ElevenLabs score and sound effects: made on his paid ElevenLabs plan.
- The disclosure video: the song ("Been Warned") is Suno, the siren is ElevenLabs.
- The Training Ground's clips: ElevenLabs.
- The disclosure video's voice lines (ATTENTION!, the four lines, the distant guy): ElevenLabs voices.
- So every sound and song the game ships is from his paid Suno and ElevenLabs plans or made by the game's own code.

## What was checked (the table as it was asked)

| What | Where in the build | How many | Made with | What has to be true |
| --- | --- | --- | --- | --- |
| The songs (day, night, bosses, stings) | `assets/soundtrack/*.mp3` | about 115 | Suno (docs/audio/cue-sheet.md), a few by the game's own music generator (the cue sheet names them: those are ours) | Each Suno track made while a paid plan was active (Suno's free plan doesn't grant commercial use). |
| The ElevenLabs score | `assets/soundtrack/elevenlabs/` | 47 | ElevenLabs Music (CL-163, CL-165) | The ElevenLabs plan at the time allowed commercial use of music. |
| The sound effects | `z-sounds/` (zombies, weapons, world, player, UI, below, ...) | 952 | ElevenLabs Sound Effects (batches 1-3; the prompts are in `z-sounds/PROMPTS*.md`) | The ElevenLabs plan at the time allowed commercial use. |
| The AI disclosure video | `assets/disclaimer/disclaimer.mp4` | 1 | Jerry's clips (`tools/disclaimer/src/README.md`): the five voice lines and the distant guy, "Been Warned" (the song), "Police Siren"; the dancer by ChatGPT | Where the voices, the song and the siren came from, and that each may be sold with the game. |
| The Training Ground's clips | `assets/sfx/training/` (keypad, door open and close, the zombie alarm), `assets/audio/training/shot-timer-start.wav` | 5 | Jerry's "My Replacement Clips" (CL-147) | Where they came from. |

## Claude's (CL-221, done 2026-10-20)

- **Everything else that makes a sound is made by code** (core/audio.js, core/gunsynth.js): nothing to license.
- **The fonts** (`vendor/fonts`: Black Ops One, Chakra Petch) are under the SIL Open Font License, free to sell with
  the game: `vendor/fonts/OFL.txt` has both copyright notices and the licence, and it ships with the fonts.
- **three.js** (`vendor/three`) is MIT; **the desktop shell** is Tauri (MIT or Apache-2.0).
- **`NOTICES.txt`** at the game's root (three.js, the fonts, Tauri, and a line on the AI-made music, sounds and voices):
  `tools/package.mjs` ships it. Put it next to the exe in the itch.io download too.
- **The files the build carried but didn't play are left out of the package** (`tools/package.mjs`): of the soundtrack
  only what `assets/soundtrack/music.json` names goes (the old score stays in the repo as the backup: switch it in and
  the package follows), and of `assets/disclaimer` only the finished video. 58 files, 167 MB less; the package's own
  check (the title and a match from the copy) passes.
- Not done: a full list of the Rust libraries inside the desktop exe (`cargo about` on Jerry's PC, when the build is
  final).
