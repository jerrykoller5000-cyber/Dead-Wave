# The camera: any picture of the game, fast (`tools/camera.mjs`)

For every agent (Jerry, 2026-10-09: "so they can zoom around and get what they need quickly"). One command loads the
game once and keeps it loaded; each picture after that is one quick call. Every picture lands as a PNG with a `.json`
beside it holding its exact camera, so the same picture can be taken again after a change.

## Start, shoot, stop

```
node tools/camera.mjs start --agent grokbot --task GB-177
node tools/camera.mjs shot weapon:m4 --agent grokbot --task GB-177 --view side --out review/my-task/m4-side.png
node tools/camera.mjs move --agent grokbot --task GB-177 --orbit 45 --zoom 1.5 --out review/my-task/m4-closer.png
node tools/camera.mjs stop --agent grokbot --task GB-177
```

- `--agent` and `--task` identify the slot owner. The first game-backed command enters the machine-wide FIFO queue,
  waits without spinning, wakes and runs automatically when granted. The Crew Panel shows its owner, task, command,
  PID and times. Jerry's manual game/Inspector enters ahead of queued agents but never kills or preempts a live run.
  `status` is read-only and does not need a slot.
- `start` on Windows opens a real browser window **off screen**, so the game draws on the real GPU (it should take
  about a second a picture). `--show` puts the window on screen so you can watch. If pictures come out blank or black
  from the off-screen window, use `--show`. `--soft` is headless software rendering
  (works anywhere, a cloud box included, but each picture takes 10 to 40 s). `start` prints the renderer: if it says
  SwiftShader on a desktop, you are in software.
- `--match` starts it inside a running match (prep of night 1, the marine at the HQ, the HUD up); `--training` inside
  the Training Ground (noon held, no weather). Without either it is the title screen: the whole world is built and
  still, the best place for clean pictures of things and places.
- `--size 1600x900` sets the default picture size (any shot can take its own `--size`).
- Idle for 20 s, the page is frozen (no frames, no GPU or CPU use) and the next request wakes it in a blink.
  `start` also takes one throw-away picture (`--warm`, default the light turret) so the first real one is fast.
- `start` when the owner's camera is already up does nothing. A stale or `--fresh` session is never closed
  implicitly: its owner runs `stop`, then queues `start` again.
- One camera can hold the computer-wide slot. Only its named owner/task may drive or stop it. Calls in that owner's
  prepared batch are taken one at a time. `status` says what is running. After an edit, `reload` loads the game again
  in the same browser. Stop promptly after the batch; the safety idle close defaults to 15 minutes (`--idle <min>`).
- With no camera running, `shot`, `turnaround`, `batch`, `targets` and `eval` still work: they load the game for that
  one call and close it again. That is slow, so `start` first when you'll take more than one.

## What to point at (`targets` lists them all; `targets zombie` filters)

| Target | What |
| --- | --- |
| `weapon:<id>` | A weapon alone in the sky, bare: `pistol revolver uzi m4 ak aa12 shotgun sniper minigun launcher flamer chainsaw knife machete m240 m240Carried mortar mortarCarried`. `weapon:m4:can` adds the suppressor. |
| `build:<kind>` | A buildable alone in the sky: `barricade wall platform pillar floor stairs wire railing spikes light flame sandbag mine lure barrel mortar m240`. |
| `zombie:<type>` | One zombie, held still in the sky (`shambler feral leaper spider drowned military brute spitter screamer bomber demon colossus guardian caveguard`). |
| `survivor:<who>` | `okafor`, `brandt`, `pike`. |
| `marine` | A fresh marine in his default kit, in the sky. |
| `player` | The live marine, wherever he is (best with `--match`). |
| `live:<type>` / `live:<n>` | A zombie in the game right now, where it stands (the first alive of that kind, or the nth alive). `corpse` / `corpse:<n>` is a body on the ground (the newest, or the nth). Best in `--training` or `--match`, or after an `eval` that spawned some. |
| `place:<id>` | A place in the world: `hq tower graveyard mast dock pit cabin cabin:1 bridge:0 shed:0 wreck:0 camp:ranger camp:hikers camp:trapper cave:root cave:shale cave:iron cave:wet cave:hill cave:chalk` (the exact list depends on the world: `targets place`). |
| `xyz:<x>,<y>,<z>` / `xz:<x>,<z>` | Any point; `y` may be `g` for the ground there, and `xz` is always on the ground. |

Groups, for `batch` and `job` (each comes back captioned with the game's own name):

| Group | What |
| --- | --- |
| `turrets` | Every turret at every tier (light, flame, heavy: as built, Mk II, Mk III), the mortar (one model), then the M240. |
| `build:<kind>:*` | That buildable at every tier; `build:*:*` every buildable at every tier. |
| any pattern with `*` | Matched against `targets`: `zombie:*`, `weapon:*`, `survivor:*`, `place:cave:*`. |

## The inspector (`--inspect`, CL-196)

`node tools/camera.mjs start --inspect --agent <name> --task <id>` loads the inspector
(studio/inspector/README.md) instead of the title screen:
the game booted straight into a studio in the Training Ground (no intro, no warm-up), with its curated models, the live marine
and live zombies by the inspector's catalog ids. `targets` lists them (116 or so).

| Target | What |
| --- | --- |
| `<catalog id>` | `marine` (the live player), `marine.fresh`, `zombie.<type>`, `weapon.<id>`, `animal.<id>`, `person.<who>`, `build.<kind>`, `prop.<id>`, `vehicle.<id>` |
| `<id>:<variant>` | a variant: `build.wall:3` (a tier), `animal.fish:2`, `person.cave-guardian:iron`, `prop.skull:brute`; zombies take a mode: `zombie.brute:statue`, `:live`, `:walk`, `:rise` |
| the old kinds | `weapon:m4`, `build:wall:2`, `zombie:brute` (a statue), `survivor:pike`, `marine`, `player`: mapped onto the catalog |

- `node tools/camera.mjs check [pattern] --out review/x/` builds every model variant (or the ids containing the pattern), takes
  a picture of each and writes `sheet.jpg` (one contact sheet, broken ones in red) and `check.json`. Run it after
  changing a model. Without a running camera it loads the inspector for the one call.
- `eval` has `DWInspect` (the inspector's API) as well as `T`: `node tools/camera.mjs eval "await
  DWInspect.marine.play('reload-ak'); await new Promise(r => setTimeout(r, 700)); return DWInspect.current()"`, then a shot.
- A running camera changes mode with `reload --inspect` (or `--title`, `--match`, `--training`); without a shell, the
  inbox job `{"cmd":"reload","mode":"inspect"}`, then `{"cmd":"check"}` or any shot job.
- Places (`place:`) are not in the inspector: they need the title screen's world.
- Same-subject shots retain the current move and kit; use `--reset` to rebuild. Sidecars include a versioned inspector
  recipe. `shot --from <sidecar.json>` restores the setup and exact camera; active moves restart, so use phase holds
  where a matching animation pose matters. Save/Load setup in the inspector uses the same API recipe.
- `DWInspect.apiVersion`, `capabilities()`, `busy()`, `cancel()`, `session()` and `restore()` are public. Await
  `stepAsync(n)` for completed frame steps. `_ix` is private. Checks use statue zombies for geometry; verify live modes
  and motion separately. No-match checks and failed jobs return errors and a nonzero CLI exit code.
- Camera sessions/logs are checkout-specific. Reload after game edits; a running browser keeps its already loaded
  modules. HTTP jobs accept local JSON requests; the inbox remains available for agents without a shell.

## Where to stand

- `--view`: `front` (its face; a gun down the barrel), `back`, `left` / `side` (its left side; a gun's muzzle to the
  left), `right`, `three` (front-left, from above: the default), `threeR`, `rear3`, `top`, `low` (near the ground,
  looking up), `eye` (level).
- Or `--yaw <deg> --pitch <deg>` anywhere on the sphere round it (0/0 is front, +yaw toward its left, +pitch above).
- The distance fits the target in the frame on its own. `--dist <m>` overrides it, `--margin 1.4` loosens the fit,
  and `--fov <deg>` sets the lens (default 35).
- `--height <m>` puts the camera that far above the target's centre; `--lookY <m>` aims above or below it.
- `--cam x,y,z --look x,y,z` places it by hand, world coordinates.
- `--live` is the game's own camera, what the player sees. Add `--ui` for the HUD.

## Moving around ("zooming around")

`move` starts from the last picture's camera and takes another. Moves can be combined, and `shot <target>` takes them
too, applied after the framing.

| Option | Does |
| --- | --- |
| `--orbit <deg>` | Round the target, + to the right |
| `--tilt <deg>` | Up or down round it |
| `--zoom <x>` | 2 is twice as close, 0.5 twice as far |
| `--pan <right>,<up>` | Slide the camera and its aim together, in metres |
| `--fwd <m>` | Walk forward along the view, both together |
| `--fov <deg>` | Change the lens |

The current slot owner may take many queued shots in one camera. `"the last picture"` means the last one in that
owner's batch. Pass its `.json` back with `shot --from <file.json> --orbit 20 ...` when exact continuity matters.

## Light, HUD, labels

- `--time noon|dawn|morning|day|afternoon|dusk|evening|night|midnight` or `0..1` (0 midnight, 0.25 sunrise, 0.5
  noon). The time stays set for the next pictures until it is changed.
- The HUD is hidden unless you pass `--ui`. The FPS readout stays hidden unless you also pass `--perf`.
- `--caption "text"` writes a label in the top left corner.
- `--wait <ms>` lets the world move before the picture is taken (an animation, a zombie walking in).
- `pre` (batch and job shots only): code run in the game right before that picture, `T` and `wait(ms)` in scope, so a
  shot sets its own scene with no gap: `{ "target": "live:shambler", "pre": "const z = T.zombies.find((q) => q.alive); T.damageZombie(z, 1, { kind: 'bullet', dir: { x: 1, z: 0 }, hitY: z.mesh.position.y + 1.5 }); await wait(60);" }`.

## Many pictures at once

```
node tools/camera.mjs turnaround zombie:brute --n 8 --pitch 10 --out review/my-task/brute/   # 8 pictures round it
node tools/camera.mjs batch review/my-task/shots.json --out review/my-task/                   # a list
```

`shots.json` is an array of shot objects, the same options as above without the dashes:

```json
[
  { "target": "weapon:sniper", "view": "side", "out": "review/my-task/sniper-side.png" },
  { "target": "place:cave:root", "view": "front", "time": "dusk", "size": "1280x720" },
  { "target": "zombie:colossus", "yaw": 30, "pitch": 8, "caption": "Colossus" },
  { "cam": { "x": 10, "y": 20, "z": 30, "tx": 0, "ty": 0, "tz": 0, "fov": 50 }, "out": "review/my-task/overview.png" }
]
```

## Jobs and the contact sheet

A job is a batch with a contact sheet: one JPEG of every picture, a labelled tile each (failures in red), rows by
group (a turret's tiers side by side). Look at the sheet first; open the PNGs only for detail.

```
node tools/camera.mjs job '{"target":"turrets","out":"review/turrets/"}'          # -> review/turrets/sheet.jpg
node tools/camera.mjs job '{"shots":[{"target":"zombie:*","view":"front"}],"out":"review/z/","cols":5}'
node tools/camera.mjs job my-job.json
```

Job keys: `target` (one target or group) or `shots` (a list), `out` (the folder), and optional `sheet` (default true),
`cols`, `tile` (tile width, default 480), `captions` (false: none), plus any shot option (`view`, `time`, `size`...),
which applies to every picture. `"cmd": "shot" | "turnaround" | "eval" ...` makes a job any other command.
`batch shots.json` with a plain list still works as before (add `--sheet` for a sheet).

## The inbox: pictures without a shell

With the camera running, write a job to `review/camera/jobs/<name>.json`. The camera takes it within a quarter of a
second and writes `review/camera/jobs/<name>.result.json` when done: the files, the sheet, each picture's time in ms,
and any errors. `review/camera/jobs/_camera.json` is its heartbeat: `"up": true` and `alive` within the last 15 s
means it is running. Not running? Start it (`node tools/camera.mjs start`; Claude without a shell double-clicks
`Claude Camera.bat`): pending jobs are taken as soon as it is up. The jobs folder is not committed.

## Setting a scene

`eval` runs code in the game. `T` is `window.TT`, the game's debug hooks; `R` is the camera rig; `wait(ms)` is there
too. The result is printed.

```
node tools/camera.mjs eval "const p = T.player.position; for (let i = 0; i < 6; i++) T.spawnZombie(p.x + 8, p.z + i * 2, 'feral', true, true); return T.zombies.length"
node tools/camera.mjs shot player --view three --dist 14 --ui
node tools/camera.mjs eval "T.dressGuns({ guns: { m4: 'multicam' } })"
```

## Where pictures go

Without `--out`, a picture goes to `review/camera/<target>-<view>.png`. Put task pictures in the task's own review
folder: `--out review/<task>/name.png`, or a folder ending in `/`. Each `.png` has a `.json` beside it with the
target, the camera, the time, the size, the mode and the renderer. `shot --from <that.json>` takes the same picture
again, and is how a before-and-after pair is made.

## The other picture tools

`tools/shoot.mjs` (named world views, with `--compare` for before and after), `tools/gunsheet.mjs`,
`tools/weaponphotos.mjs`, `tools/zombiesheet.mjs` and `tools/survivorsheet.mjs` are fixed sets of pictures. They still
work. The camera is for everything else. The in-page half is `tools/camera-rig.js`: add a target kind there.
