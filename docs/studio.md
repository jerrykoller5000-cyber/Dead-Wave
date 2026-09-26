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
| `step` | rig units (0 = off). The limb steps for itself: it stays pinned where it stands, and when the body has moved or turned more than this far off where `ik` wants it (or it can no longer reach its pin), it lifts from where it is, swings over, and plants there. One limb in the air at a time (two if one is falling far behind). For clips that say where to stand while the scene moves the body (a turn, a lunge) | a chain |

When one clip fades into another and only one of them places a limb (or looks at something), the
limb's IK, its `level` and the look fade in or out over the blend instead of dropping at its end.

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

A Jerry section with no `>` answer under it is **waiting**. "good" (or "approved") from Jerry closes
the asset at that version. Anything inside `<!-- -->` is ignored (the stub's example lives there).
The round trip (CL-60; the parser is `crew/notes.mjs`, shared by `crew.mjs` and the panel):

```
node crew/crew.mjs review                     every folder and where its notes stand; makes a notes.md
                                              stub where there isn't one; the panel shows the same
node crew/crew.mjs review take <asset>        a request for the owner (meta.json) in handoffs/requests.md,
                                              and "> owner · taken · date" under Jerry's note
node tools/studio.mjs render <clip> --asset <asset>          the owner's next version
node crew/crew.mjs review answer <asset> <agent> "<what changed>"
                                              "> agent · vN · date: ..." under the note; refused while
                                              latest is still the version Jerry wrote about (--force to
                                              answer without a new one, e.g. to explain why not)
```

Every `node crew/crew.mjs` panel prints `✎ Jerry's notes waiting` and `◉ For Jerry to look at`, and
`crew/panel.html` has a Review folders box (and a "Look at ..." line under Your move). The panel
can't list folders over http, so `crew.mjs` keeps the folder list in `crew/reviews.json`.

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

## 9. Scenes (D-41)

A clip is one body moving in place. Most of what looks wrong in a game is between bodies: where a
hand lands on a leg, how fast a thing is hauled, whether the feet push or glide. A **scene** is one
moment with everyone in it, as data: who is there, what each plays, what holds what, how they
travel, and what to check. The studio renders it (CU-46) and the game plays the same file where the
moment happens (the host says where, and hands over its own bodies). A new moment is a new scene
file, not new code: the guardian's drag is the first; the pit's arm, the throw, a zombie grab and the
tower climb are the same shape.

Scenes live in `studio/scenes/<name>.json`:

```json
{
  "format": "dw-scene/1",
  "name": "demo-drag",
  "length": 3,
  "actors": {
    "marine": {
      "rig": "marine", "path": "haul", "along": -2.0, "face": "back",
      "clips": [[0, "marine/lie"]],
      "tilt": [[0, [0, 0, 0]], [0.4, [-78, 0, 0], "out"]],
      "rise": [[0, 0], [0.4, 0.15]]
    },
    "guardian": {
      "rig": "guardian", "path": "haul",
      "clips": [[0, "guardian/pounce"], [0.45, "guardian/drag", { "fade": 0.2, "loop": true, "stride": 1.6 }]]
    }
  },
  "paths": {
    "haul": { "points": [[0, 0, 0], [0, 0, 12]], "speed": [[0, 0], [0.45, 0], [1.2, 2.4, "inout"]] }
  },
  "holds": [
    { "from": "guardian.handR", "to": "marine.footL",
      "reach": [[0.1, 0], [0.4, 1, "out"]], "tow": [[0.4, 0], [0.7, 1]], "lift": [[0.4, 0], [0.7, 1]] }
  ],
  "checks": { "gap": 0.05, "slide": 0.05, "speed": { "guardian": [0, 3.5] } }
}
```

**Actors.** Each names a registered rig (§2) and stands either on a path or at a fixed spot
(`"at": [x, y, z]`, `"face": degrees`). On a path, `along` puts it metres ahead of (+) or behind (−)
the path's point and `side` metres to its right; `face` is `"forward"` (along the travel, the
default), `"back"`, or degrees added to the travel heading. `scale` overrides the rig's display
scale. Two keyed body channels move the whole actor on top of its place: `tilt` (degrees, XYZ, about
the feet: the marine laid on his back) and `rise` (metres up). Keys are the clip format's: `[time, value, ease]`.

**Moving and turning (CL-64).** `at` can be keys (`[[t, [x, y, z], ease], ...]`): a lunge. With a
path too, `onPath` (keyed 0..1) blends from `at` onto the path, so a body can lunge, pull back, walk
round and then set off along the path. `aim: { "at": "marine.footL", "w": keys, "turn": 1 }` turns
it to face another body (or one of its joints) by the keyed weight, on top of its own heading: a
creature grabs facing what it grabs, then turns away to go. `turn` says which way round it goes for
a turn near 180° (1 its left, -1 its right). A body's ground speed (from its path, its keyed `at`,
or both) is what a clip's `stride` is matched to.

**Clips.** `[start time, "rig/clip", options]`, in time order; each takes over from the one before.
A clip reference is `studio/clips/<rig>/<clip>.json`. Options: `fade` (seconds to blend from the
last one, default 0.15), `loop`, `speed` (a fixed rate), and **`stride`**: metres the actor covers
in one play of the clip. With a stride, the clip plays at the actor's ground speed (rate = speed ×
length ÷ stride, and never below `minRate`, default 0.2), so feet planted in the clip stay planted
in the world: the body goes over them and they push. A walk that glides is a stride that's wrong.

**Paths.** `points` is a line in scene space (metres, y ignored: actors stand on the ground the
host gives). `speed` is keyed metres per second; the distance travelled is its integral. Actors on
the same path travel together; `along` keeps their spacing.

**Holds** are what makes it two bodies. `from` is a limb (an IK chain) of one actor, `to` is a
joint or a limb of another (`actor.chain` means the chain's end joint). Three keyed weights, 0 to 1:

| Weight | What it does |
| --- | --- |
| `reach` | The `from` limb goes to the `to` joint: the hand lands on the ankle, wherever the ankle is. |
| `tow` | The `to` actor is pulled along the ground (x and z) so its joint stays at the hand: the marine follows the grip, his body trailing on its own path heading. |
| `lift` | The `to` limb (it must be a chain) goes up to the hand: the held leg rises to where the hand holds it. |

A hold's `offset` ([x, y, z] metres, in the `to` joint's frame) moves the grip point along the limb
(a hand round the shin instead of the ankle bone).

More on a hold (CL-64): `trail` (keyed 0..1, with `tow`) swings the towed body round so it stretches
out behind the grip, away from whoever has it. `"taut": true` pulls the held limb straight: the body
is slid back along the ground until the limb can only just reach the hand. If a limb pulled straight
still can't reach up to the hand, the body comes off the ground by the difference (up to 0.8 m, once
the limb is fully lifted): he's being held up by the leg. A limb that's lifted (or, without `lift`,
towed) lets go of its own clip's plant by as much as it's held, so a foot eases off the ground as the
hold comes in instead of springing off its pin, and it's pulled straight along the clip's direction
rather than going on with the clip's bend. When a hold hands over from `reach` to `tow`, let the reach
fade as the tow comes in: with both at full, the hand chases the ankle and the ankle chases the hand.
Timing that reads well in the game (CL-64): `tow` over about 0.2 s, `lift` over about 0.5 s with the
`smooth` ease, and a clip change on the held body faded over 0.3 s; a faster lift yanks the leg
straight in a frame or two.

**Order each frame.** Every actor is put on its path and posed from its clips. Then, for each hold,
the held actor is posed before the holder; the holder reaches; the held actor is towed and its limb
lifted. An actor can hold one and be held by another; a loop (A holds B holds A) is refused when
the scene loads.

**Checks** run on every frame and come back from the player, so the renderer marks them and the
game can log them:

| Check | What it measures | Flagged over |
| --- | --- | --- |
| `gap` | for each hold at full `reach` or `tow`, metres from the hand to the grip point | `checks.gap`, default 0.05 |
| `slide` | for each limb on the ground, how far it moved over the ground since it touched down. On the ground: the clip plants it (plant ≥ 0.5), or its end is down at the height it stands at in the rig's rest pose (+6 cm), so a clip that plants nothing is still caught gliding. Skipped for a body being towed and a limb that's holding | `checks.slide`, default 0.05 |
| `speed` | each actor's ground speed, m/s | outside `checks.speed.<actor>` |
| `snap` | the biggest one-frame joint turn, scaled to 60 fps (§6) | 0.3 rad |

**The player** (`studio/scene.js`, exported from `studio/index.js`):

```js
const scene = loadScene(json, (ref) => clipJson);          // validates; throws with every problem
const sp = createScene(scene, {
  parent,                           // where the actors go (the host's group, placed at the moment)
  bodies: { marine: myMarineInst }, // optional: actors the host already has (rigs.get(n).create({ group }))
});
sp.update(dt);   // → { t, events: [{ actor, t, name }], checks: { gap: {...}, slide: {...}, speed: {...} } }
sp.seek(t);      // replays from 0 in fixed steps: the same pose at t every time (the renderer's frames)
sp.worst;        // the worst of each check since the last seek: { "slide:guardian.footL": { value, t, bad }, ... }
sp.actors.marine.inst, sp.actors.guardian.rate, sp.root, sp.done
```

The host's options (the game, CL-64): `paths: { haul: [[x, y, z], ...] }` lays a path where this
moment needs it (to this cave's mouth), keeping the scene's speed keys; `ground: (x, z) => y`
(world) puts every body on the real terrain; `enter: { actor: { position, yaw, time } }` starts a
body where the host's really was (world position and yaw) and eases it, placement and every joint,
into the scene over `time` seconds; while it eases in, its feet don't pin (a pin taken where the game
had the foot would hold it there while the body slides into the scene over it), and they pin where
they stand once it has arrived. Every blend turns the short way (`slerpTo` in studio/ik.js): the
tests' stand-in three blends quaternions component by component and would otherwise swing a joint
the long way round at a partial weight. `sp.path(name)` says how far along a path the scene is, so the
host can end a haul on arrival; past the scene's length a path carries on at its last speed.
`sp.dispose()` hands the host's bodies back exactly as they were given and removes the rest.
Adopted bodies take the studio's rest pose joint by joint, so the game plays exactly what the review
folder shows. `fetchScene(name)` (browser) loads a scene and its clips relative to the studio's own
folder.

`validateScene(json)` returns the problems as sentences, like `validateClip`. A quick look without
the renderer: `studio/scene-preview.html?scene=demo-drag&n=8` (side-on tiles following the bodies,
red where a check fails). The demo, `studio/scenes/demo-drag.json`, is the v1 guardian clips hauling
the marine by the ankle: it shows the machinery (and the v1 drag's gliding feet, flagged on every
tile), not the finished grab, which is CL-64's. The marine rig
(`studio/marine.js`) is built from the game marine's joint offsets, so a grip point in the studio is
the grip point in the game; `rigs.get('marine').create({ group: marine })` adopts the game's own
marine (its joint groups from `makeMarine()`'s `userData`) instead of building one.


## 10. Reactions: bodies that get hit (D-42)

Euphoria's idea, cut down for a browser horde (`studio/motion.js`). A body plays its clip until something
hits it. Then it's a handful of points joined by bones, held in its pose by **muscles**. A hit drops
their **tone** for a moment and it comes back. Planted feet stay put. When the body's weight leaves its
feet it takes **stagger steps**. Past a limit it **falls**, puts its hands out, lies there, and **gets up**.
Dead, it goes limp and **settles**, then sleeps. Nothing is hand-keyed: a reaction is the same
physics every time, tuned by a preset file. The game, the scenes and the motion lab all run the
same code, so what Jerry approves in the lab is what the game plays.

**What reacts is the rig's `body`** (`studio/bodies.js`, hung on the rig in `studio/rigs.js`):
- `points`: about 17 per humanoid, each on a joint with a mass, a radius and a tone group (`legs`,
  `spine`, `arms`, `head`).
- `bones`: held at their length.
- `braces`: kept within a range, so the spine bends, the head nods and legs can't fold flat.
- `hinges`: knees fold forward, elbows back. A hinge never forces the animation's own bend.
- `segments`: how the points pose the joints again. `frame` for hips and chest, `aim` for limb bones,
  `pos` for a pivot that moves.

The marine and the zombies (`studio/zombie.js`, the game's `makeZombieMesh` layout) have one. The
guardian, spiders and the colossus get theirs when they need to react.

**How it reacts is a preset**, `studio/motion/<rig>/<name>.json` (listed in `studio/motion/index.js`):

| Field | Meaning |
| --- | --- |
| `format`, `name`, `rig` | `dw-motion/1`, its name, the rig it's for. |
| `version`, `owner` | Bump `version` with each change Jerry should look at; `owner` answers his notes (default grokbot). |
| `tone` | 0..1 per group. A muscle's stiffness is tone²: at 1 a limb sags 3 mm, at 0.3 about 4 cm, at 0.1 a third of a metre, at 0.03 it's limp. |
| `mass`, `strength` | Heavier bodies move less per hit; stronger ones pull back harder. |
| `balance` | `step` (m off balance before a step), `fall` (m before it falls), `steps` (how many before it gives up), `stepTime`, `lift`, `lead` (how far ahead it reads its own motion), `anchor` (hips over feet), `support` (legs holding it up). |
| `hits.<kind>` | For `bullet`, `pellet`, `blast`, `blade`, `crush`: `scale` (× power), `spread` (to nearby points), `slump` (how much each tone drops), `recover` (seconds to get it back), `knockdown` (power that drops it at once), `lift` (upward share, blasts). |
| `fall`, `down`, `getup`, `death` | Tone while falling and `catch` (hands out); seconds lying and the height that counts as down; seconds to get up; tone when dead and seconds of stillness before it sleeps. |

A hit's **power** is metres per second at the point hit. For reference, today's presets react like
this: a rifle round (2.5) is a flinch; a shotgun shell at 6 m (3.2) is a stagger step; a close shell
(6.5) knocks a shambler down; a grenade (8) throws it; a brute shrugs off the close shell.

**In code** (each frame, after the animation posed the rig):

```js
import { rigs, loadMotion, createBody, createMotionPool } from './studio/index.js';
import { presets } from './studio/motion/index.js';
const pool = createMotionPool({ max: 8 });                    // at most 8 simulate at once (rule 12)
const inst = rigs.get('zombie').create({ group: z.mesh });    // adopt the game's own zombie
const body = createBody(inst, loadMotion(presets.json('zombie/shambler')), { ground: entityGroundY, pool });
body.follow();                                                // read the animated pose
body.hit({ at: [x, y, z], dir: [dx, dy, dz], power: 6.5, kind: 'pellet' });   // false if the pool is full
const events = body.update(dt);                               // [['stagger'], ['step', {foot}], ['fall'], ['down'], ['getup'], ['recovered'], ['dead'], ['settled'], ...]
body.apply();                                                 // the rig shows the reaction, by body.weight
if (body.awake) z.position.add(body.drift);                   // the host takes on where it staggered to
```

`body.state` is `animated`, `react`, `fall`, `down`, `getup` or `dead`. `body.kill({...})` goes limp.
`body.reset()` stands it back up on its animation. Bodies are deterministic, so a scene replays
exactly. The pool refuses a hit only when every slot is mid-reaction; the host then plays its old
reaction. Cost: about 0.07 ms a body a frame (48 at once, 2.6 ms, in Node).

**In a scene**, an actor takes `"motion": "zombie/shambler"` (or a preset object) and
`"hits": [[t, { "at": "chest" | [x, y, z], "dir": [x, y, z], "power": 6.5, "kind": "pellet" }]]`, and
optionally `"kill": [t, {...}]`. `dir` and `at` are in scene space. The scene takes on the body's drift
itself. The snap and slide checks skip a body while it reacts, because a fall turns fast by design.
`node tools/studio.mjs scene studio/scenes/zombie-reactions.json` renders one into a review folder like
any scene (`zombie-reactions`, `marine-knocked` are the first two).

**The motion lab**, `studio/motion-lab.html` (Jerry: `Open Motion Lab.bat`):
- Pick a body and a weapon, click where it hits, and watch at full or quarter speed.
- Try the muscle sliders.
- Write a note. The note goes into `review/motion-<rig>-<name>/notes.md` under
  `## <date> · Jerry · v<version> · lab`, with what he last did and any slider he moved. `meta.json`
  names the preset's owner, and `crew.mjs review` and the panel show it as waiting.
- The owner changes the preset, bumps its `version` and `latest.txt`, and answers with
  `crew.mjs review answer` as for any asset.
- The notes come in through `POST /__studio/note` on `tools/serve.mjs` (`studio/notes-endpoint.mjs`). It
  writes only under `review/motion-*`.

**Checking it:** `node --import ./studio/node-three.mjs --test "studio/*.test.mjs"`. `motion.test.mjs`
covers standing, the flinch, the stagger, the knockdown and get-up, the limp death, the pose landing
on its points, determinism, the brute, the pool, the 48-body cost and both review scenes.

---

## Later

- **Textures:** recipes as data (noise layers, colours, wear, grime), baked at load; the renderer
  makes a swatch sheet (flat, on a sphere, on the prop, day and night) into the same review folder.
- **Sound:** the same loop for stingers and effects (a waveform, a spectrogram and the file, with
  notes).
- **Models:** a turntable and a contact sheet for any prop or creature, with its budget.
- **Reactions beyond humanoids (after D-42, §10).** The guardian's thrown marine and the pit's pull as
  bodies (a scene hands the victim to `createBody` mid-scene); spiders and the colossus as their own
  `body` entries; hit arcs and dismemberment on top of the same points.

## Looked at and set aside (2026-09-26)

- **Caracal Studio** (Jerry's earlier texturer: Tauri, React, three.js, a TripoSR image-to-mesh
  server). It's built for a person clicking a desktop app, and most of its backend is placeholders;
  TripoSR's dense meshes don't fit the game's low-poly look. The idea carries over; the code doesn't,
  for now.
- **Blender and skinned meshes.** Best if a person animates; agents can't, and the game's creatures are
  procedural rigs. Revisit if Jerry wants to hand-animate.
