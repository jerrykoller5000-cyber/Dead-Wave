# The flight recorder: Jerry's exact moment, replayed (CL-266; Cursor builds CU-160)

Claude, 2026-10-24. Jerry asked what most limits the crew's results; the answer was that the agents can't watch the game
in motion on his PC, so they check stand-ins they chose themselves, and a fix can pass every check and still miss his
moment. "Yes that should be helpful" (D-89). This is the tool: while he plays, the game keeps the last two minutes;
when something looks wrong he presses one key; the crew replays exactly that, before and after a fix, on his GPU.

## What it can and can't promise

- **Exact:** his inputs (keys, mouse, buttons, the wheel), and so his body, his camera, his aim, his view mode and
  weapon, frame by frame with the frame times he had. Most of his motion and camera notes live there (N5's bounce, a
  clip through a wall, an arm through a gun, a jump that yanks).
- **Close, not identical:** the dead and the world. The game rolls dice everywhere (AI, spawns, weather) and steps its
  physics by each frame's time; a snapshot can't hold every zombie's mind. They start where they were and go their own
  way. A seeded `Math.random` (below) narrows that a lot.
- So a clip is evidence of what he saw, and a replay is a reproduction of what he did. Both are worth more than a
  description.

## Recording (always on, cheap)

- **A ring buffer, per frame:** sim time and dt; the keys held (the game's `keys` map as a bitmask of the codes it
  reads); mouse movement (dx, dy summed), buttons, the wheel; OTS yaw and pitch; viewFirst, currentWeapon, the zoom
  held; the player's position, velocity and vy; the camera's position, quaternion and FOV. About 100 bytes a frame:
  two minutes at 60 fps is under 1 MB.
- **A snapshot every 5 s:** day, phase, the time of day, weather (raining, intensity, the wind spell), the player's
  full state (hp, weapon, ammo in each magazine, medkits, grenades, carried things, the mortar, the dive meter), every
  zombie within 60 m (type, position, yaw, hp, state, target), the relay's and the missions' states, and the RNG's state
  (below). Kept for the same two minutes.
- **Cost:** nothing visible: no frame-time cost measurable on night 20 (rule 12's budget; a t-test measures it).

## Saving: one key

- **F9** saves the last two minutes (and the next five seconds) as one clip, with a one-line note he types in a small
  box (Enter to save, Esc to skip the note). A toast: "Clip saved".
- Where: `qa/clips/<date>-<time>.json` in the game folder through the local server when it runs; otherwise the
  browser's download (`tt-clip-<date>-<time>.json`) for him to drop into `qa/clips/`. A clip names the build (version
  and the git commit if known) and his settings (FOV, sensitivity, brightness).
- The crew sees new clips on the board (`crew.mjs` lists `qa/clips/`).

## Replaying (the crew, through the slot)

`node tools/replay.mjs qa/clips/<clip>.json [--from <seconds>] [--shots every|N] [--video] [--frames a-b] [--build current|clip]`

1. Starts the game (the slot), with the clip's settings.
2. Restores the nearest snapshot at or before `--from`: the world state above, the player, the zombies.
3. Drives the frames itself with the clip's dt sequence (a `TT.stepFrame(dt)` hook in place of
   requestAnimationFrame), feeding the recorded inputs into the same handlers the keyboard and mouse use.
4. Writes what the crew needs: a filmstrip (every Nth frame), an optional video, and the numbers per frame (camera
   height and pitch, the player's speed, hands to their grips, anything a test exposes), beside the clip:
   `qa/clips/<clip>/replay-<build>/`.

The same clip replayed on the build before a fix and after it is the before-and-after (rule 7's shots), from Jerry's
own moment instead of a stand-in.

## Making the dice repeat (optional, recommended)

At page load, `Math.random` becomes a seeded generator (mulberry32 or similar) with a random seed; its state is
recorded in every snapshot and restored on replay. With the same dt sequence and the same inputs, the world then
repeats far more closely from a snapshot. It changes nothing for play (it is still random), and the world's own seeds
(layout, caves; rule 10) don't move.

## Tests

- A t-test records 20 s of scripted input (walk, turn, aim, run with the sights up), saves a clip, replays it from its
  first snapshot, and checks the player's path and the camera match frame by frame within 1 mm and 0.01 degree.
- A frame-time check: night 20 from the standard view with recording on and off, the same within noise.

## Owners

- Spec and the crew's use (the board, the handoffs, the tests that replay): Claude (CL-266).
- The engine side (the buffer, snapshots, F9 and the note box, the save, `TT.stepFrame`, the snapshot restore, the
  seeded RNG) and `tools/replay.mjs`: Cursor (CU-160).
- The note box's words: ChatGPT (ui/strings.js, under `// CU-160`).
