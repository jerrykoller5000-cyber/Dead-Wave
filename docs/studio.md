# The studio — an agent-friendly way to make and review art (D-40)

Jerry, 2026-09-26: "Bridging the gap between a human developer and a creation suite that agents
can understand. The human acts as the critic and says we need this or that, and the agents can
easily see what they have to do without a million attempts to nail something they are blind to."

The first mission builds it for **modeling and animation**. Textures and sound follow the same
pattern later. The first real job for it is **the guardian's animation** (its model is approved;
its motion is not). The marine's animation stays as it is for now.

## The two rules

1. **Everything visual is data an agent can read and edit.** A clip is a file of keyframes, not a
   function of hand-tuned maths.
2. **Every change can be looked at in seconds, as pictures.** Agents can read images but can't watch
   the game. One command turns any rig or clip into a filmstrip, a video and numbers, in under 30 s,
   on Jerry's PC and in the cloud.

## The pieces

| Piece | Where | Owner | Task |
| --- | --- | --- | --- |
| This spec: formats and folders | `docs/studio.md` | Claude | CL-57 |
| Clip format and player | `studio/clip.js`, `studio/rigs.js`, `studio/index.js` | Claude | CL-58 |
| The renderer | `tools/studio.mjs`, `tools/studio.html` | Cursor | CU-44 |
| Reference motion (Quaternius UAL 1 and 2, CC0) | `assets/anim/reference/`, `studio/reference.js` | Claude | CL-59 |
| Jerry's notes onto the board | `crew/crew.mjs review` | Claude | CL-60 |
| Check it on Jerry's GPU | `qa/` | Antigravity | AG-19 |
| Jerry's guide | `docs/studio-guide.md` | Claude | CL-61 |

`studio/` is Claude's (world/animation data and its player); `tools/studio.*` is Cursor's (the
renderer and its page). The game and the renderer play clips through the same `studio/` code, so a
strip always shows what the game will do.

---

# The spec (CL-57)

Units everywhere: **metres, seconds, degrees**. A rig's frame is **+Z forward, +Y up**, origin on
the ground between its hind feet at rest, in the rig's own units (before its display scale: the
guardian is built at 1 and shown at 1.3, and its clips don't change if that does).

## 1. Clips

A clip is one JSON file, `studio/clips/<rig>/<name>.json`:

```json
{
  "format": "dw-clip/1",
  "name": "pounce",
  "rig": "guardian",
  "length": 0.6,
  "loop": false,
  "reference": "Zombie_Scratch",
  "notes": "Out of the dark and onto his leg: gather, spring, one arm long, the other braces.",
  "tracks": {
    "root":   { "pos": [[0, [0, 0, 0]], [0.6, [0, 0, 1.4], "out"]] },
    "pelvis": { "pos": [[0, [0, 1.02, 0]], [0.18, [0, 0.8, 0]], [0.4, [0, 1.2, 0.2], "back"]],
                "rot": [[0, [-29, 0, 0]], [0.4, [-52, 0, 0]]] },
    "handR":  { "ik": [[0, [0.7, 0, 1.05]], [0.45, "@ankle", "out"]], "grip": [[0, -1], [0.4, 1]] },
    "footL":  { "ik": [[0, [-0.34, 0, -0.25]]], "plant": [[0, 1]] }
  },
  "events": [[0.12, "footfall", { "limb": "footL" }], [0.45, "grab", { "hand": "R" }]]
}
```

| Field | Meaning |
| --- | --- |
| `format` | Always `dw-clip/1` (the player refuses anything else). |
| `name`, `rig` | The clip's name and the registered rig it plays on. |
| `length` | Seconds. Keys past it are ignored. |
| `loop` | `true`: time wraps, and the last key blends into the first (write the first key again at `length` for a seamless loop). |
| `reference` | Optional. A reference clip's name (§4); the renderer draws it beside ours. |
| `notes` | Free text: what the clip is meant to feel like. The owner keeps it current. |
| `stage` | Optional. Where the renderer puts live targets for this clip, rig frame: `{ "ankle": [x, y, z] }` (overrides the rig's `stage.targets`). |
| `tracks` | Per joint or limb, one or more **channels** (below). |
| `events` | `[time, name, data]`: moments the game hangs things on (dust, shake, sound, the grab). |

### Keys and easing

A channel is a list of keys `[time, value, ease?]`, sorted by time. The value **arrives** at `time`
along `ease`, which shapes the move from the previous key:

| Ease | Shape |
| --- | --- |
| `smooth` (the default) | Slow out, slow in. |
| `linear` | Constant speed. |
| `in` / `out` / `inout` | Cubic: accelerate / decelerate / both, harder than `smooth`. |
| `back` | Overshoots and settles: weight arriving. |
| `step` | Holds the previous value, then jumps at `time`. |

Before the first key a channel holds the first value; after the last, the last.

### Channels

| Channel | Value | On |
| --- | --- | --- |
| `rot` | `[x, y, z]` degrees, the joint's local Euler rotation (XYZ) | any joint |
| `pos` | `[x, y, z]` rig units, the joint's local position | `pelvis`, and `root` (below) |
| `ik` | `[x, y, z]` target for the limb's end, **rig frame**; or a live target (below) | a chain: `handL`, `handR`, `footL`, `footR` |
| `pole` | `[x, y, z]` direction, rig frame, the middle joint bends toward | a chain (default: the rig's) |
| `plant` | `0..1`. At 1 the end is pinned in the world where it was when `plant` crossed 0.5, so the body can move over a planted hand or foot without it sliding | a chain |
| `level` | `0..1`. How flat the palm or sole lies on the ground (1 = flat). Default: 1 while planted, else 0 | a chain |
| `grip` | `-1..1`. Negative curls the hand under to knuckle-walk; positive closes it on something | `handL`, `handR` |
| `look` | `[x, y, z]` rig frame, or a live target: the head and neck turn to it (on top of their `rot`) | `head` |
| `open` | `0..1` jaw open (added to the jaw's `rot`) | `head` |

Joints a clip doesn't mention keep the rig's rest pose. A chain with an `ik` channel overrides the
`rot` of its two joints. `root` is the whole creature moving over the ground (root motion); the game
may take that motion itself (the chase moves the creature) and play the clip in place, which is the
renderer's default too (`--root-motion` shows it moving).

### Live targets

An `ik` or `look` value can be a name the game supplies at play time instead of a fixed point:
`"@ankle"`, or `{ "at": "@ankle", "offset": [0, 0.1, 0] }` with the offset in world metres. The
game passes `targets: { ankle: <world Vector3> }`; the renderer puts a stand-in (the scale marine)
where the rig says (`rig.stage.targets`). This is how the guardian's hand lands on the marine's real
leg in the game and on the dummy's leg in the strip.

## 2. Rigs

`studio/rigs.js` registers each rig once:

```js
registerRig('guardian', {
  build: (opts) => makeCaveGuardianRig(opts.design),   // a Group with userData.rig (joints by name)
  displayScale: 1.3,
  rest: 'stand',                                        // the clip that is its rest pose
  chains: {
    handL: { root: 'shoulderL', mid: 'elbowL', end: 'wristL', lengths: [1.08, 1.16], pole: [-0.7, 0.35, -1] },
    footL: { root: 'hipL', mid: 'kneeL', end: 'ankleL', lengths: [0.74, 0.66], pole: [0, 0.2, 1] }
    // ... R the same, mirrored
  },
  grip: (rig, side, v) => { ... },                      // how -1..1 closes this rig's hand
  stage: { targets: { ankle: [0.4, 0.25, 2.6] } },      // where live targets sit in the renderer
  budget: { draws: 160, triangles: 8000 }
});
```

Everything the player needs about a body is here; a new creature is a new entry, not new player
code. `studio/index.js` exports `rigs`, `loadClip`, `createPlayer`, `sampleClip`, `applyPose`,
`clipEvents` and the reference library (CL-58, CL-59).

## 3. The player

```js
const player = createPlayer(rigInstance);         // from rigs.get('guardian').create({ design })
player.play(clip, { loop, speed, rootMotion });
player.crossfade(nextClip, 0.2);                  // blend into the next clip over 0.2 s
const events = player.update(dt, { targets });    // poses the rig; returns the events it passed
```

Also `sampleClip(clip, t) → pose`, `blendPoses(a, b, w)`, `applyPose(rig, pose, { targets })` for a
caller that wants to mix a clip with its own logic (the game's chase steers; the clip animates), and
`player.poseAt(t, { targets })` to pose a frame without moving the clock (the renderer's frames).

`loadClip` refuses a bad clip with every problem as a sentence ("handR.ik key 2: value must be
[x, y, z] or a live target"), so an agent can fix a clip from the error alone.

**Checking the player (Node, real three.js maths, no browser):**

```
node --import ./studio/node-three.mjs --test "studio/*.test.mjs"
```

It loads every clip on disk, plays it through, and prints each one's worst one-frame turn.

### The guardian's clips today

`studio/bake-guardian.mjs` turned the CL-56 procedural beats into clips, so the guardian's animation
as Jerry saw it is now data (`studio/clips/guardian/`): `rest`, `stand`, `gallop`, `pounce`, `drag`,
`carry`, `throw`, `walk`. Played back they land hands, feet and head within 3 cm of the old code
(`--check`). These are v1: what Jerry called poor. The game still runs the old code until CL-62 moves
it onto the clips. Known faults, straight from the player: the gallop snaps at the hips (1.2 rad in one
frame: a stride every 0.32 s is too fast to read), and the pounce and throw pop once each (0.36 and
0.43 rad).

## 4. Reference motion

The Quaternius Universal Animation Library 1 and 2 (CC0; Jerry's `Desktop\Animation Assets`):
86 motion-captured-quality clips on one humanoid skeleton. `studio/import-ual.mjs` keeps only what we
use (23 clips, 23 body bones, no fingers), sampled at 30 fps, in `assets/anim/reference/ual.json`
(about 500 KB, never loaded by the game), with `catalogue.json` (name, pack, length, loop, what it's
good for) and `LICENSE.txt`. To bring another clip in, add it to `WANT` in the importer and run it on
the unzipped packs.

```js
const ref = loadReference(json);            // assets/anim/reference/ual.json
const man = makeMannequin(ref);             // a plain grey figure, 1.8 m, facing +Z like our rigs
poseReference(man, ref.clip('Push_Loop'), t);
```

The guardian isn't human, so a reference is a guide for timing, weight and spacing, not a pose to
copy; our humanoids (the marine, the zombies) can be retargeted onto these later.

`studio/preview.html?clip=drag&n=6&row=rig` (or `row=ref`) draws a quick strip of a clip or of its
reference, served from the repo root: Claude's quick look, and a starting point for CU-44.

## 5. The review folder

```
review/
  guardian-drag/
    meta.json          { "asset", "owner", "rig", "clip", "reference", "task", "design" }
    notes.md           Jerry's notes and the answers, newest at the top
    index.html         open this: the latest version beside the one before, videos playing
    latest.txt         "v3"
    v1/  strip.png  video.webm  stats.json  clip.json
    v2/  ...
```

- `clip.json` is a copy of the clip as it was for that version, so any two versions can be compared.
- One asset per thing Jerry judges (a clip, or a rig's turntable). Its `owner` is the agent who
  changes it when Jerry writes.

### notes.md

Jerry writes plain sentences under a heading. Nothing else to learn:

```markdown
## 2026-09-27 · Jerry · v1
The drag feels floaty. It should dig in harder on each heave.

> claude · v2 · 2026-09-27: each heave now plants both hind feet and throws the shoulders back.
```

A Jerry section with no `>` answer under it is **waiting**. `crew.mjs review` lists waiting notes;
`crew.mjs review take <asset>` turns one into a task for the owner (CL-60). The owner answers with
the version that addresses it. "good" (or "approved") from Jerry closes the asset.

## 6. The strip and stats

`strip.png`: 12 frames evenly over the clip (or `--frames n`), left to right, top to bottom, each
with the ground grid, the scale marine (1.75 m), the time, and a faint ghost of the frame before.
With a reference, a second row shows it at the same times. Red marks on a frame where a joint snaps
or a planted foot slides.

`video.webm`: the clip at real speed then quarter speed, from the side, then from the play camera's
angle (above and behind, as in the game).

`stats.json`:

```json
{
  "version": "v2", "clip": "studio/clips/guardian/drag.json", "rig": "guardian",
  "length": 1.4, "frames": 42,
  "draws": 150, "triangles": 5808, "budget": { "draws": 160, "triangles": 8000 },
  "maxTurn": { "rad": 0.21, "joint": "elbowR", "at": 0.63 },
  "footSlide": { "footL": 0.01, "footR": 0.0, "handL": 0.02 },
  "events": [[0.12, "footfall"]],
  "renderSeconds": 14.2
}
```

`maxTurn` is the biggest one-frame rotation of any joint, scaled to 60 fps (over 0.3 rad is a snap:
the t79 rule). `footSlide` is the most a planted end moved while planted, in metres (over 0.05 is a
slide).

## 7. The render command (CU-44)

```
node tools/studio.mjs render <clip.json> [--asset <name>] [--vs <reference>] [--frames 12]
                              [--cam side|play|front|three] [--root-motion] [--design wet|chalk|...]
node tools/studio.mjs rig <rig> [--design ...]       a turntable of the rig at rest (strip + stats)
node tools/studio.mjs list                           rigs, clips, references, review assets
```

`render` makes the next version of the asset (default asset name: `<rig>-<clip name>`), writes
`meta.json` if it's new, updates `latest.txt` and `index.html`, and prints the stats. It loads only
the rig, the player and three.js, never the game, so it stays under 30 s. On the cloud box set
`CHROME_ARGS="--no-sandbox"` as for the tests.

## 8. Budgets

A rig declares its draw calls and triangles; every render prints them against it and the strip goes
red if they're over. The guardian today: 150 meshes and 5,808 triangles, one creature on screen at
a time. A clip is only done when it doesn't snap, doesn't slide, and the game still holds 60 fps.

---

## Later

- **Textures:** recipes as data (noise layers, colours, wear, grime), baked at load; the renderer
  makes a swatch sheet (flat, on a sphere, on the prop, day and night) into the same review folder.
- **Sound:** the same loop for stingers and effects (a waveform, a spectrogram and the file, with
  notes).
- **Models:** a turntable and a contact sheet for any prop or creature, with its budget.

## Looked at and set aside (2026-09-26)

- **Caracal Studio** (Jerry's earlier texturer: Tauri, React, three.js, a TripoSR image-to-mesh
  server). It's built for a person clicking a desktop app, and most of its backend is placeholders;
  TripoSR's dense meshes don't fit the game's low-poly look. The idea carries over; the code doesn't,
  for now.
- **Blender and skinned meshes.** Best if a person animates; agents can't, and the game's creatures are
  procedural rigs. Revisit if Jerry wants to hand-animate.
