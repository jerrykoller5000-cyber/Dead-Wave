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
| Reactions: the engine, presets, get-up clips, scenes (§10) | `studio/motion.js`, `studio/bodies.js`, `studio/motion/`, `studio/make-getup.mjs` | Claude | CL-65 to CL-67 |
| Reactions in the game (§10.6) | `studio/motion-horde.js`; `index.html` "=== Reactions" | Claude; Grokbot | GB-65 to GB-67 |
| The battery, report and expectations (§10.7) | `studio/motion-battery.js`, `motion-report.mjs`, `motion-expect.js` | Claude | CL-68 |
| The motion lab and the write door (§10.8) | `studio/motion-lab.html`, `studio/notes-endpoint.mjs`, `studio/check-labs.mjs` | Claude | CL-66 |
| Models as data (§11) | `studio/model.js`, `studio/models/` | Claude | CL-69 |
| The model lab and sheets (§12) | `studio/model-lab.html`, `studio/model-look.js`, `studio/render-sheet.mjs`, `studio/check-model-lab.mjs` | Claude | CL-70 |

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
with the ground grid, the scale marine (1.56 m to the top of his cap), the time, and a faint ghost of the frame before.
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

### 10.1 Lying flat, and getting up on a clip (contract 1)

Standing, a muscle keeps the animation's own world orientation: that's what keeps a body upright.
Falling, lying, held and dead, it keeps only the animation's shape, turned with the hips to however
the body lies, so a knocked-down body topples and lies flat instead of being held up in a sit. The
legs and spine keep their shape off the hips, the arms and head off the chest. `fall.upright` and
`held.upright` (0 to 1, default 0) say how much of the animation's way up it still keeps. The fall's
`catch` (hands out) fades as the chest comes down; kept on a body lying on its face, it was a push-up
that somersaulted the marine.

When a body starts to get up it emits `['getup', { side, heading }]`:
- `side` is `'front'` (face down) or `'back'` (face up).
- `heading` is the world yaw to turn the rig's group to, so a get-up clip that starts lying lines up
  with the body: face down, from its hips to its chest; face up, from its chest to its hips.
- `body.lying` is `{ side, heading }` while it's `down` and `getup`, else `null`.

A preset names its clips: `"getup": { "time": 1.2, "front": "zombie/getup-front", "back": "zombie/getup-back" }`.
A host that plays clips (a scene, the lab, the horde) turns the group to `heading`, plays
`getup[side]` from its start at `clip.length / getup.time`, and fades back to its own clip over 0.3 s
when it ends. A host that doesn't play clips gets the old blend back to its animation.

```js
for (const e of body.update(dt)) if (e[0] === 'getup' && preset.getup[e[1].side]) {
  group.rotation.y = e[1].heading;
  const clip = clips[preset.getup[e[1].side]];
  player.play(clip, { speed: clip.length / preset.getup.time });
}
```

While the clip plays under a body that's still weighted, each limb keeps its own twist from the frame
before and swings it onto its new direction: the animation's twist comes back through the weight as
the body lets go. (Taking the twist from the clip at once spun a knee half a turn in one frame.)

The four clips are made by `studio/make-getup.mjs` (`--check` only checks what's on disk):

| Clip | Length | Beats |
| --- | --- | --- |
| zombie/getup-front | 1.2 s | face down, hands under the chest; shove up; hips up onto all fours; a knee under, a hand on it; up. |
| zombie/getup-back | 1.2 s | face up; sit up, hands behind; roll onto the left hip and hand; knees under; up. |
| marine/getup-front | 1.1 s | a soldier's push-up; hips up; a foot planted, a hand on that knee; up. |
| marine/getup-back | 1.1 s | sit up hard; roll onto the left hand and knee; the right foot planted; up. |

Times in the presets (version 2): shambler 1.2 s, feral 0.85 s, brute 1.5 s, marine 0.9 s (with
`down.time` 0.55 s, so he's up 1.45 s after he lands, inside P-72's 1.5 s). The zombie clips end at the
game's stance (hips 0.55, feet 0.21 under the root, P-73). In a scene it's automatic, and the turn
stays with the actor; `sceneClipRefs(json)` lists every clip a scene needs, get-ups included, and a page
that fetches only the actors' clips still plays it (`scene.warnings` says which bodies get up the old way).

### 10.2 Held bodies (contract 2)

```js
body.hold('footL', target, { strength = 1, offset });   // target: a Vector3, [x, y, z], or () => [x, y, z]
body.release('footL');                                   // or release() for every hold
```

- `strength` 1 is hard: the point goes where the hand goes and the rest of the body gives. Under 1
  it's a spring of that tone that firms up into the pin near 1, so a scene can ease a hold in.
- The target is read once a frame and eased across the frame's steps. On a display faster than the
  120 Hz step a held body steps once a frame instead, so the grip stays under 3 cm at 144 to 240 Hz
  (it opened to 6 cm with frames that had no step).
- `offset` (world, optional): where the hand really has it, from the point. It turns with the point's bone.
- Held, the state is `held`: muscles at `held.tone`, feet let go, no balance or steps. A held corpse
  stays `dead` and doesn't settle while held. Let go of, it drops (`fall`) or, still standing (hips
  above 80% of their height), finds its feet (`react`).
- Events `['held', { point }]`, `['released', { point }]`; `body.holding` counts the holds. A lost part
  can't be held. A full pool never sleeps a held body.

The preset's `held`: `tone` (low: arms that trail, a head that bounces), `friction` (the ground's grip,
0.3), `upright` (0) and `absorb` (how much of each yank it soaks up, 0.8: at 0.5 a fast haul flung
him). A held body takes 8 constraint passes a step instead of 4. `marine/held` is the guardian's
victim; `studio/scenes/guardian-grab-drag-flop.json` is the drag with him as a body (grip gap at most
2.6 cm while the hand has him, at 60 to 240 Hz). The game still plays `guardian-grab-drag.json`.

In a scene, a hold whose `to` actor has `motion` is the body's own hold: the holder's hand holds the
body point the hold names (`marine.footL`), with the grip's offset, by `max(tow, lift)`. While a hand
has it, the actor's scene place stays where its keys put it, so the holder aims as it always did.

### 10.3 Lost parts (contract 3)

```js
body.lose('legL');     // armL, armR, legL, legR, head: the game's partsLost keys (BODY_PARTS)
body.lost;             // ['legL']
```

A lost part's points stop simulating and stop counting for balance, and ride with the point they
hung from. A body standing on a leg it loses falls (the way its hips were moving, else toward the
lost side, so a replay falls the same way); a lost arm or head doesn't wake it. A hit at a lost point
lands on the point it hung from. Event `['lost', { part }]`; `body.reset()` puts it back together.
`studio/bodies.js` `parts` says each part's points, anchor and `joint` (the group a host hides). In a
scene, `"lose": [[t, "legL"]]` takes it off at `t`.

### 10.4 Level of detail (contract 4), and a body the host moves

```js
body.update(dt, { lod })   // 0: every 1/120 s step. 1: half the steps, twice as long. 2: the pose holds still.
body.shift(dx, dy, dz, { stop })   // the host moved the body's group itself: the body goes with it
```

- lod 1 falls, lies, gets up and recovers as at lod 0, for about half the cost.
- lod 2 doesn't simulate, but its timers run: a body that's down gets up on time, a flinch recovers.
  A corpse still on its way down falls at half rate until it's down, then freezes (it slept standing
  up before).
- Cost, 48 zombies after a shell, update only, Node: lod 0 about 1.6 ms, lod 1 0.9 ms, lod 2 0.04 ms a
  frame. `apply()` is the same at every lod (about 0.2 ms for 48).
- `body.shift` moves every point, the planted feet and a step under way, keeping their speed. With
  `{ stop: true }` it's a wall: the speed into the way it was pushed goes. The horde uses it to carry a
  reacting body with the host's own movement and to put one back out of a wall.

### 10.5 Events

`wake`, `hit`, `stagger`, `step`, `fall`, `land`, `down`, `getup` (`{ side, heading }`), `recovered`,
`dead`, `settled`, `held` / `released` (`{ point }`), `lost` (`{ part }`). `body.pointAt(name, out)`
reads one point, cheaper than `points()`.

### 10.6 In the game: the horde (P-70 to P-72)

The lab's bodies play in the game behind a switch that is **off**. With it off the game is exactly as
it was: the horde is never made. On: `index.html?reactions=1`, `localStorage.tt_reactions = '1'`, or
the dev console's `reactions on` / `reactions off` (off lets every body go at once).

`studio/motion-horde.js` (Claude's) is the adapter; the wiring is `index.html`'s "=== Reactions" block
(Grokbot's, each change commented `GB-65` to `GB-67`).

```js
const horde = createHorde({
  presets, max: 8,                    // a pool: at most 8 bodies simulate at once
  ground: (x, z, y) => groundY,       // y is the body's own height (to pick the deck)
  lodFor: (x, z) => 0 | 1 | 2,        // handed to body.update (contract 4)
  clips: (ref) => clipJson,           // the get-up clips, from fetchHordeClips(presets)
  solve: (key, x, z) => ({ x, z }),   // where walls and builds let its group stand
  onEvent: (key, name, data) => {}, move: (key, dx, dz, group) => {}
});
horde.hit(z, { at, dir, power, kind, shot });   // false: refused, the old reaction plays
horde.kill(z, {...});                            // true: it dies as a ragdoll
horde.beginFrame();                              // each frame, before the host animates (after pause's return)
horde.update(dt);                                // after it has and every hit is in → [{ key, name, data }]
horde.busy(z); horde.adopt(key, { rig, preset, group, move, ground }); horde.freeze(z); horde.release(z);
horde.releaseLiving();                           // reactions off: the living let go, corpses stay as they lie
horde.stats;                                     // { attached, active, awake, ms, msAvg, lod, refused, max }
```

- **Adoption.** A zombie adopts the studio rig on its first hit (`mesh.userData.hordeBody`, kept with
  the pooled mesh), at most three a frame (0.4 ms each). Brutes, demons and the guardian use
  `zombie/brute`, ferals `zombie/feral`, every other humanoid `zombie/shambler`; spiders, the colossus
  and the cave guardian never react.
- **One shell, one push.** Pellets with the same `shot` on one body in one frame add up into one hit;
  a killing pellet takes the rest of its shell with it.
- **The pool.** When all eight are busy, the longest-dead corpse lying on the ground gives its slot up
  and is frozen where it lies (never one in the air, never one down but alive). Otherwise the hit is
  refused and the old reaction plays.
- **beginFrame** hands every joint a body wrote back to the animation before the host animates, or a
  host that sets only some Euler angles feeds the reaction back into itself (a brute's blow threw the
  marine metres up). It runs after the pause and insertion returns, so a body that's down stays down
  behind the pause menu, and it leaves corpses alone (one frozen mid-frame was drawn standing).
- **Moved by the host.** Where the host moves a reacting body's group (the player walking the marine
  on, a zombie's AI, the game's own push out of a wall), the body goes with it (`body.shift`). Where a
  reaction carries a body into a wall, build or the HQ, `solve` puts it back out, stopped against it.
- **The power** at the point hit, in m/s: bullet 0.57 × √damage (M4 2.5, sniper 5.5); pellet 0.103 ×
  damage each (a close shell 6.5, at 6 m about 3.2); blast 8 × √(damage ÷ 55) at the centre (grenade 8);
  crush 6 (a falling trunk). Melee isn't one yet: a knife hit barely moved a body, so GB-52's shove
  plays until the blade presets shove (P-75); a melee kill still falls as a body.
- **The marine** is adopted as `marine/marine` on his first hit, outside the pool. A shambler's blow is
  2.4 (a rock), a brute's 4.3 (a stagger step), a demon's charge 6.4 and a bomber at 1 m 6.9 (down). He
  keeps control while he staggers or gets up, at 60% pace, and walks where he's steered; he loses it
  while he falls and lies (about a second).
- **Checking it:** `studio/motion-horde.test.mjs` (17) and `tools/tests/t85.js` (29 checks, on and off;
  the game's dice are held still around its shells and kill, so a lost limb can't fail it). The browser
  checks' stand-in for three has no `Matrix4.makeBasis`, so t85 stands its bodies facing +Z.

**Seen in the game:** `docs/images/horde-shots.jpg`, the real game rendered in software: a close shell, a
grenade, a killing M4 round and a close shell on a brute, with the same hits with reactions off. The drawn
body follows the simulated one; the shamblers are down 1.6 s and up about 1 s later; the brute keeps its feet.

**Before it's on by default** (Jerry's GPU, P-77): 60 fps with 48 zombies and 8 reacting; a shotgun
into a fresh crowd with no hitch; corpses lying right on slopes, bridges and the dock; a zombie blown
into a wall stays on its side; the marine's stagger, bomber knockdown and get-up; the get-up clips on a
brute and a feral with no pop when the walk takes over.

### 10.7 Reading a reaction without eyes: the battery, the report and expectations (contract 6)

Agents can't watch a reaction, but they can read what it did. **The battery**
(`studio/motion-battery.js`) is the lab's seven weapons (`rifle` 2.5, `shotgun-far` 3.2,
`shotgun-close` 6.5, `machete` 3.5, `brute-swing` 4.5 at the shoulder, `grenade` 8 at the hips, `kill`
3 at the head), each from the front, the back and the side, on a fresh body standing on its idle.
Each run says the outcome (`none`, `flinch`, `stagger`, `down`, `dead`), the steps, how long until it
was itself again, how far the chest went, where it ended, which way it lies, how low it got, and the
worst one-frame snap as it came back to its animation (over 0.3 rad is a snap; "roll" means a limb
turned about its own length). A body without the point a hit names (the spider has no shoulders) is
hit on a stand-in on that side, and the row says so. Deterministic: a change to a preset shows up as a
change in the numbers and nothing else does.

```
node studio/motion-report.mjs zombie/shambler                      every hit from every side, as a table
node studio/motion-report.mjs zombie/shambler --vs zombie/feral    side by side, differences marked
node studio/motion-report.mjs zombie/shambler --try hits.pellet.knockdown=6   against a copy with that changed
node studio/motion-report.mjs zombie/shambler --sweep              the powers where the outcome changes
node studio/motion-report.mjs all --check                          every preset; exit 1 if an expectation fails
```

The sweep steps the power up and halves the gap at each change, so every band's edge is exact: a hit
at a band's `from` gives that band. Today, from the front:

| Preset | bullet | pellet | blast | crush (at the shoulder) |
| --- | --- | --- | --- | --- |
| zombie/shambler | stagger 3.42, down 7.00 | stagger 2.58, down 5.50 | down from 0.23 | down 3.50 |
| zombie/feral | stagger 2.00, down 4.80 | stagger 1.45, down 3.60 | down from 0.08 | stagger 2.10, down 2.40 |
| zombie/brute | never | never | stagger 1.95, down 6.11 | down 12.00 |
| marine/marine | stagger 2.70, down 9.90 | stagger 1.88, down 7.70 | goes back and forth (on an edge) | stagger 3.25, down 5.50 |

Worth tuning (P-75): almost any blast drops a shambler or a feral, a rifle round staggers a feral, a
brute's swing drops a shambler, and the marine's blast response sits on an edge.

**Expectations** are what Jerry approved, in the preset, checked by the tests
(`studio/motion-expect.js`):

```json
"expect": [
  { "hit": "rifle", "want": "flinch" },
  { "hit": "shotgun-close", "from": "back", "want": "down", "note": "shot in the back, it pitches over" }
]
```

An agent tuning a preset changes its numbers until the battery agrees again. Changing an
expectation is changing what Jerry approved: check out with `--review` (rule 13).

### 10.8 The motion lab and the write door (contract 5)

The lab (`studio/motion-lab.html`, Jerry's guide §6) keeps the last six seconds: stop, scrub, step a
frame, replay at any speed, every event marked on the bar. A second body can stand beside the first
and take every hit at the same moment ("the file's numbers" against the sliders). A hit is an arrow;
power is a quarter to three times the weapon's; the body's points can be drawn over it. A note
carries a picture with a six-frame strip of the reaction under it. **Check them** runs the preset's
approved reactions in the lab, sliders and all. **Save as scene** writes what happened as
`studio/scenes/lab-<name>.json` for an agent to render; a part taken off in an earlier run stays in it.
Shift-drag holds a body; **Take a part off** loses one.

URL: `?preset=zombie/brute&compare=file&weapon=grenade&power=1.5&bones=1&asset=<review folder>`.
`window.lab` drives it from a script (`state()`, `setPreset`, `compare`, `setWeapon`, `setPower`,
`fire(side)`, `again`, `lose`, `slider`, `advance(secs)`, `pause`, `play`, `replay`, `scrub`,
`stepFrames`, `snapshot`, `note`, `saveScene`, `sceneJson`, `checkExpect`).

**The write door.** `tools/serve.mjs` hands every POST under `/__studio/` to
`studio/notes-endpoint.mjs`. It writes only `review/<asset>/` and `studio/scenes/lab-<name>.json`, and
only for the studio's own pages: the Host must be this machine, a browser's Origin the page's own, and
a cross-site request is refused (403), so another web page open in the same browser can't post a note
signed Jerry.

| Route | Body | Does |
| --- | --- | --- |
| `/__studio/note` | `{ asset, text, context?, snapshot?, meta? }` | Adds `## <date> · Jerry · <version> · lab` and the note at the top of `review/<asset>/notes.md`; a PNG snapshot goes to `<version>/lab-<time>.png` and is linked in the note. A new folder needs `meta` (`kind` motion or model) and gets `meta.json`, `latest.txt` and the stub. A lab's folder gets an `index.html` of its notes and pictures. |
| `/__studio/note` | `{ preset, text, context? }` | The lab's first form: asset `motion-<rig>-<name>`. |
| `/__studio/scene` | `{ name, json }` | Writes `studio/scenes/lab-<name>.json`; replies with the render command. |
| `/__studio/notes` | `{ asset }` | Reads a folder's notes back, newest first, as `crew/notes.mjs` does. |
| `/__studio/ping` | `{}` | Whether a page can save. |

Every refusal is a 4xx with a sentence (a bad asset name, an empty note, a snapshot that isn't a PNG,
over a cap, a link out of `review/`). Jerry's words are kept, but a line can't start a heading or an
answer and `<!--` / `-->` go.

`studio/check-labs.mjs` clicks through the lab in headless Chrome (CHROME and CHROME_ARGS as for the
tests; `--shots <dir>` keeps a screenshot of each step, `--keep` leaves what it wrote): a real click,
the reaction in order, the get-up clip, scrubbing, replay, the picture, a hold, a lost part saved in a
scene, compare, save as scene replayed in Node, the approved reactions, a note with a picture through
the page's own button, and the page from a plain static server. It deletes what it wrote.

### 10.9 Checking it

```
node --import ./studio/node-three.mjs --test "studio/*.test.mjs"
CHROME=... CHROME_ARGS=... node studio/check-labs.mjs
CHROME=... CHROME_ARGS=... node studio/check-model-lab.mjs
npm test -- t85
```

`motion.test.mjs` covers standing, the flinch, the stagger, the knockdown and get-up on the side it
fell, the limp death, holds (a moving hand, a spring, the flop scene at 60 to 240 Hz), lost parts,
level of detail, a limb that doesn't spin when a clip starts under it, falls that replay exactly,
determinism, the brute, the pool, the 48-body cost and the review scenes.

---

## 11. Models as data (dw-model/1)

A clip made animation something an agent can read and edit. A model does the same for the thing
being animated: a prop or a creature is one JSON file of materials, joints and plain shapes, not a
function of hand-placed boxes. An agent writes the file, checks it in a second, looks at it as a
contact sheet, and Jerry writes his note on it like any review folder. The game, the pages and the
tests all build the file through the same code, so what Jerry approves is what the game draws.

A model with a skeleton and limbs is also a **studio rig**: it plays clips, stands in scenes, and,
with a body, reacts when it's hit. The spider is the first creature that is only data.

### 11.1 The file

`studio/models/<kind>/<name>.json`, listed in `studio/models/index.js` (one line each, like the
motion presets):

```json
{
  "format": "dw-model/1",
  "name": "fuel-drum",
  "kind": "prop",
  "version": 1,
  "owner": "claude",
  "notes": "The red fuel drum by the wrecks that chains when it goes up (P-43).",
  "materials": {
    "paint": { "color": "#a8261c", "roughness": 0.55, "metalness": 0.45 },
    "band":  { "color": "#e0b83a", "roughness": 0.55, "metalness": 0.45 },
    "iron":  { "color": "#3a2a26", "roughness": 0.6, "metalness": 0.5 }
  },
  "joints": { "top": { "at": [0, 0.95, 0], "note": "flames start here" } },
  "parts": [
    { "name": "drum", "shape": "cylinder", "size": [0.36, 0.95], "segments": 14, "at": [0, 0.475, 0], "material": "paint" },
    { "name": "hoop", "shape": "cylinder", "size": [0.375, 0.05], "at": [0, 0.12, 0], "array": { "count": 2, "step": [0, 0.7, 0] }, "material": "iron" },
    { "name": "band", "shape": "cylinder", "size": [0.365, 0.16], "at": [0, 0.5, 0], "material": "band" }
  ],
  "budget": { "draws": 2, "triangles": 400 },
  "merge": "color"
}
```

Units: **metres and degrees**. The model's frame is **+Z forward, +Y up**, origin on the ground (a
rig's, §2). "L" is the model's -X side, as for the marine and the zombies.

| Field | Meaning |
| --- | --- |
| `format` | Always `dw-model/1`. |
| `name`, `kind` | Its name (lower case and dashes, the file's name) and `prop` or `creature` (the folder). Names are unique across kinds: the review folder is `review/model-<name>`. |
| `version`, `owner` | Bump `version` with each change Jerry should look at; `owner` answers his notes (default claude). |
| `notes` | What it is and what it should feel like. The owner keeps it current. |
| `materials` | By name (below). |
| `joints` | Optional. The skeleton (below). A joint with no parts is a socket: where the game hangs a light, a flame, the boarding prompt. |
| `parts` | The shapes (below). |
| `budget` | `{ "draws": n, "triangles": n }`: what it may cost. Every build counts it; the sheet goes red over it. |
| `merge` | `false` (the default: every part its own mesh), `true` (parts on one joint with one material draw as one), or `"color"` (parts on one joint whose materials differ only in colour draw as one, coloured per vertex). |
| `rig`, `chains`, `head`, `stage`, `body`, `displayScale`, `clips` | For a model that is a rig (§5). |

A field the format doesn't know is refused by name ("part 2: unknown field "rotation""), so a typo
never goes quietly.

### 11.2 Materials

| Field | Meaning |
| --- | --- |
| `color` | `"#rrggbb"`. The only one needed. |
| `roughness`, `metalness` | 0..1 (defaults 0.8 and 0). The game has no reflections to show metal in, so over about 0.5 metal reads as dark: the boat's aluminium is 0.3. |
| `emissive`, `emissiveIntensity` | The colour it glows, and how much (0..20, default 1): a lamp, an eye. |
| `flatShading`, `transparent`, `opacity` | As three.js has them. Under 1 opacity needs `transparent`. |
| `side` | `"double"` draws both faces: a thin sheet seen from either side (a hull plate). |
| `note` | Free text. |

### 11.3 Joints

`{ "name": { "parent", "at", "rot" | "aim" + "pole", "mirror" } }`:

| Field | Meaning |
| --- | --- |
| `parent` | Another joint; leave it out for one on the model itself. Loops are refused. |
| `at` | `[x, y, z]`, metres from the parent. |
| `rot` | `[x, y, z]` degrees, in the parent's frame (Euler XYZ, the clip format's `rot`). |
| `aim`, `pole` | Instead of `rot`, and easier blind: `aim` is the way the joint's bone (its -Y) points, `pole` the way its +Z turns, both in the **model's** frame whatever the parents do. For a limb, the pole is the way the middle joint bends (§5). |
| `mirror` | `"x"`: a twin on the other side. The name must end in L or R (or L/R before digits: `hip1L`); the twin is the other (`hip1R`), at `x` flipped, turned the mirror way, under the parent's twin if it has one. |

### 11.4 Parts

| Field | Meaning |
| --- | --- |
| `shape`, `size` | Below. |
| `joint` | The joint it moves with; leave it out for the model itself. |
| `at`, `rot`, `scale` | Where it sits on its joint: metres, degrees (XYZ), and a number or `[x, y, z]` above 0. |
| `material` | One of `materials`. |
| `mirror` | `"x"`: its twin on the other side, on the joint's twin (`hipL` → `hipR`), reflected exactly (an asymmetric shape comes out as its mirror image, faces still out). On a joint with no L/R, the twin is on the same joint. |
| `array` | `{ "count", "step", "rot", "pivot" }`: `count` copies, each `step` metres on and `rot` degrees further round `pivot` (on the joint). Hoops, ribs, spokes, a prop's blades. |
| `name`, `note` | Its name (a mirrored `...L` becomes `...R`), and free text. |
| `merge` | `false` keeps this part its own mesh when the model merges: something the game moves, lights or hides alone. |
| `shadow` | `false`: it casts none (lamps, eyes). |
| `limb` | `armL`, `armR`, `legL`, `legR` or `head` (the game's `partsLost` keys): it hides with that limb. `buildModel` lists the meshes per limb, and limbs never merge together. |

The shapes:

| Shape | `size` | Also | What it is |
| --- | --- | --- | --- |
| `box` | `[w, h, d]` | | A plain box, 12 triangles. |
| `rbox` | `[w, h, d]` | `radius` (m, default a quarter of the smallest side), `segments` 2..6 | The rounded box the marine and zombies are made of (core/geometry.js), 48 triangles. |
| `cylinder` | `[r, h]` or `[top r, bottom r, h]` | `segments` (12), `open` | Upright on its middle. |
| `cone` | `[r, h]` | `segments` (12), `open` | Point up. |
| `sphere` | `[r]` | `segments` `[around, down]` ([12, 8]) | |
| `capsule` | `[r, length]` | `segments` `[around, per cap]` ([8, 3]) | Upright; `length` is the straight middle. |
| `torus` | `[ring r, tube r]` | `segments` `[around, around the tube]` ([16, 6]), `arc` (degrees) | Lying in XY (the hole along Z). `arc` 180 is a handle. |
| `lathe` | | `points` `[[r, y], ...]` bottom to top, `segments` (12), `arc` | An outline turned about Y: a bottle, a lamp shade, a bell. |
| `extrude` | | `outline` `[[x, y], ...]`, `holes`, `depth`, `bevel` | A flat outline pushed out along Z, centred on it: a plate with a hole, a sign, an L-bracket. |
| `panel` | | `corners`: three or four `[x, y, z]` | A flat sheet through the corners (anticlockwise from the side that shows, or a `"double"` material). A hull plate, a roof. |
| `rod` | `[r]` | `from`, `to`, `segments` (6), `open` | A bar from one point to another. A rail, a mast, a rope. |

`panel` and `rod` place things by points, not angles: the easiest shapes to get right without
seeing them. The evac boat's hull is twenty panels laid between six stations.

**Merging** is what makes a detailed prop cheap. `merge: true` puts every part on a joint that
shares a material into one mesh; `"color"` also merges materials that differ only in colour (the
same roughness, metalness, glow and so on), with each part's colour on its vertices. The drum is
seven parts in two draws that way; the spider is 77 in 30. Parts on different joints never merge
(they move apart), and nor do different limbs or a part marked `merge: false`. It's done in
`studio/model.js`, not BufferGeometryUtils (not vendored), and keeps the index.

### 11.5 A model that is a rig

| Field | Meaning |
| --- | --- |
| `rig` | The name it registers as. `studio/rigs.js` registers every listed model that names one (a rig written in code keeps its name; a model that doesn't validate is left out with its problems in the console). |
| `chains` | Its limbs, in the rig chain format (§2): `{ "leg1L": { "root", "mid", "end", "pole", "lengths"?, "exact"?, "mirror"? } }`. `lengths` default to the joints' own. `mirror: "x"` makes the R limb from the L. |
| `head` | `{ "neck", "head", "jaw"?, "jawOpenDeg"?, "limitDeg"? }`, for the clip format's `look` and `open`. |
| `stage` | `{ "targets": { name: [x, y, z] } }`: where the renderer stands live targets. |
| `body` | What reacts when it's hit (§6). |
| `displayScale` | The size it's shown at (default 1). |
| `clips` | The clips it plays, `"rig/clip"`, the one to show first first. The lab offers them; the sheet shows the first. |

The IK solver bends limbs that hang along -Y (studio/ik.js): a limb's middle joint sits straight
down its root's -Y (`"at": [0, -length, 0]`), and the end down the middle's (or anywhere in its YZ
plane with `"exact": true`). The check says so, and which joint to turn instead. Turn the root with
`aim` along the upper bone and `pole` the way the knee points, and the middle joint's `aim` along the
lower bone: when all three lie in one plane (the spider's legs each stand in their own upright
plane) the solver's pose at rest is exactly the modelled pose. `model.test.mjs` checks the spider's.

`rigFromModel(json)` returns the definition `registerRig` takes: `build()` makes a fresh one,
`adopt(group)` takes one the host built with `buildModel` (`rigs.get('spider').create({ group })`),
the chains, head, stage, body and budget, and `rest`: the model's rest pose as a clip.

### 11.6 A body that reacts

`body` is what `studio/motion.js` moves (§10), in one of three forms:

- `"zombie"` or `"marine"`: the layouts in `studio/bodies.js`. The zombie model uses `"zombie"`, and
  a shell hits it exactly as it hits the code stand-in.
- `{ "human": { "pelvis", "chest", "crown", "foot" }, "pelvisIsRoot": bool }`: a humanoid with those
  offsets (bodies.js `humanBody`).
- The whole thing as data: `points`, `bones`, `braces`, `hinges`, `frame`, `segments`, `feet`,
  `hands`, `root`. The spider's is this: 30 points (the hips and chest with a point over each so the
  body has an up, the head and its crown, each limb's hip, knee and foot), the hips braced to the body
  and across each pair, knees hinged up, all eight feet feet. The engine runs it unchanged.

Its preset is `studio/motion/spider/spider.json` (not yet in `studio/motion/index.js`: the motion
lab maps each rig to an idle clip, and `spider/idle` is there for it). Against the lab's weapons: a
rifle round, a far shell and a machete are flinches, a close shell skids it a step, a brute's swing
rocks it, a grenade throws it and it rights itself, a kill goes limp and settles. A reacting spider has 30 points against a
shambler's 17. On the shared cloud box the two measured about the same, 0.1 to 0.2 ms a frame each and
too noisy to rank; the budget is 0.07 ms a body, so P-77 measures it on Jerry's GPU before spiders join
the horde.

### 11.7 In code

```js
import { validateModel, buildModel, instanceModel, rigFromModel } from './studio/model.js';
import { models } from './studio/models/index.js';

const errs = validateModel(json);                 // every problem as a sentence; [] means good
const m = buildModel(models.json('prop/fuel-drum'));
// m.group (at the model's origin; group.userData.rig is its joints), m.joints { name: Group },
// m.parts [{ name, joint, material, limb, mirrored, copy, mesh }], m.meshes, m.limbs { armL: [meshes] },
// m.cost { draws, triangles }, m.over (past its budget)
const more = instanceModel(m);                     // another, sharing geometry and materials
for (const mesh of m.limbs.armL || []) mesh.visible = false;   // a lost arm (with body.lose('armL'))
```

`restClip(json)`, `modelCost(group)`, `disposeModel(built)` (frees what a build made for itself;
shapes are shared and stay), `modelAsset(json)` (`"model-<name>"`), `mirrorName(name)`, and
`MODEL_FORMAT`, `MODEL_KINDS`, `MODEL_SHAPES`, `LIMBS`. The same JSON builds the same geometry every
time; shapes are built once and shared, so a horde of one model holds one copy of each.

For the roadmap's first two:
- **P-43, the drums:** `buildModel(models.json('prop/fuel-drum'))` once, `instanceModel` per drum
  (two draws each, down from six meshes), the fire at `joints.top`.
- **P-52, the boat:** `rigs.get('evac-boat').create({})`, the spotlight on `R.beam` (it shines along
  the lamp's +Z), and `evac-boat/arrive` played with `rootMotion` for the 20 s run in (its events:
  `horn` at 0.5 s, `flares` at 1.2, `horn` at 16, `docked` at 19.5); `evac-boat/search` while it
  waits. It floats with `joints.waterline` on the water; he boards at `joints.board`.

### 11.8 Looking at a model

```
node studio/model-sheet.mjs --check prop/evac-boat my/draft.json   no browser: problems as sentences, cost
                                                                   against budget, joints, limbs, clips
node studio/render-sheet.mjs creature/spider                       the contact sheet into review/model-spider/vN/ (§12)
```

`model-sheet.mjs` without `--check` hands its arguments to `render-sheet.mjs`, so either writes review
folders. The model lab (§12) is Jerry's bench for models.

### 11.9 The models today

| Model | What | Cost (budget) |
| --- | --- | --- |
| `prop/fuel-drum` | The wrecks' drum (P-43): the game's `buildBarrel` as data. | 2 draws, 328 triangles (2, 400) |
| `prop/evac-boat` | The boat for night 20 (P-52): a 5.7 m aluminium launch, centre console, a searchlight on a mast, running lights, outboard. A rig: `search`, `arrive`. | 20 draws, 2,958 (36, 4,000) |
| `creature/spider` | The spider zombie on eight limbs, with a skeleton, eight leg chains, a head that looks and a jaw, its body, and `crawl` and `idle`. | 30 draws, 2,636 (32, 3,200) |
| `creature/zombie` | `studio/zombie.js`'s shambler stand-in as data: the same joints, offsets and boxes, checked joint by joint. | 15 draws, 720 (24, 1,200) |

The spider's crawl: two sets of four limbs take turns, 0.3 m a step; in a scene give it
`"stride": 0.6` and its planted hands don't slide (`studio/scenes/spider-crawl.json`). The game's
spider today has six limbs; if Jerry wants six, drop pair 2 or 3 from the file (its joints, parts,
chain and body points).

**Checking it:** `node --import ./studio/node-three.mjs --test "studio/*.test.mjs"`.
`model.test.mjs` checks that every model on disk is listed, valid and within budget, that bad
models give their problems as sentences, every shape, mirror, array and merge, that builds repeat
exactly, the zombie model against `studio/zombie.js` (joints, boxes, and a shell's reaction), the
spider's IK, crawl and scene, the boat's clips, and the spider's reactions.

---

## 12. The model lab and the model sheet

A model is a file of shapes (§11). This is how Jerry looks at one and says what he thinks, and how an
agent sees it without a screen: the lab (`studio/model-lab.html`, `Open Model Lab.bat`; Jerry's guide
§7) is a page Jerry turns round a model in, and the sheet is one picture of it from every side that an
agent reads. Both draw the model with the same `buildModel` the game uses. The code is
`studio/model-lab.html`, `studio/model-look.js` and `studio/render-sheet.mjs`; the check is
`studio/check-model-lab.mjs`.

### 12.1 Looking at a model as pictures

```
node studio/render-sheet.mjs creature/spider                 the next version: review/model-spider/vN/
node studio/render-sheet.mjs --all                           every model; unchanged ones are skipped
node studio/render-sheet.mjs creature/spider --asset spider-6    into review/spider-6/ instead
node studio/render-sheet.mjs studio/models/prop/new.json --out look.png
                                                             just the picture; a draft with no --out goes
                                                             to Claude outputs/models/<name>.png
node studio/render-sheet.mjs --look "model=creature/spider&light=nvg&view=side&part=3" --out look.png
                                                             the lab set up by an address, as one picture
```

On the cloud box set `CHROME` and `CHROME_ARGS=--no-sandbox`, as for the tests. A sheet takes about 4
to 7 seconds there. It loads the studio and three.js, never the game.

**The sheet** (`sheet.png`, 1600 wide) reads top to bottom:
- The asset and its version, the cost against the budget as bars (red over), the size (width ×
  height × depth, and from how far below the ground to how high), the materials, the file's notes,
  and **the checks** (below): green when it's one piece with nothing under the ground, orange with
  what's wrong.
- **Front, side, back**: orthographic, one scale and one ground line for all three, with a ruler in
  metres. The side view looks at the R side (+X), so the front is on the left. The ground is a line;
  anything under it shows through a green tint (the zombie's feet do: P-73).
- **Top** (its front down, as a plan is drawn), with its own scale and a scale bar; **¾ front** with
  the joints named where the names fit (the footer lists the ones left out); **¾ back**.
- **Light**: the ¾ front by day, at night, and in night vision, and **in the game**: the model 12 m
  from the game's camera (60°, 46° down) at 1:1 on a 1280 × 720 screen, so it's as big as the player
  sees it.
- **The parts map**: the model from both three-quarter sides with every part of the file in its own
  colour and numbered (its index in `parts`), and the key beside it: number, colour, name, copies. A note
  that says "the thing at the back" is matched to its entry here. The colour of part N is the same on
  every sheet and in the lab (`partColor`).
- For a model that is a rig, six frames of its first clip, side on (`--clip rig/clip` for another).
- In every view, the 1.75 m figure stands beside the model, never behind it.

**Versions follow the file's `"version"`.** Change the file, bump `"version"`, render: the folder gets
`vN` (N the file's version). Nothing changed: skipped. Changed but not bumped: refused, and it says
to bump it (`--force` makes the next number anyway). That way the lab, the sheet and Jerry's note
heading all say the same version. A version a note from the lab made first (latest.txt says v2, and
v2/ has only the note's picture) is filled in, not skipped over. `--redraw` draws the latest sheet
again (after the sheet itself changed) only while Jerry has no note on that version.

A version folder holds `sheet.png`, `model.json` (the file as it was) and `stats.json`:

```json
{ "version": "v1", "model": "creature/spider", "file": "studio/models/creature/spider.json", "modelVersion": 1,
  "draws": 30, "triangles": 2636, "budget": { "draws": 32, "triangles": 3200 }, "over": false,
  "bounds": { "min": [-0.907, 0.015, -0.911], "max": [0.907, 0.867, 0.84], "size": [1.815, 0.852, 1.751] },
  "joints": ["pelvis", "..."], "parts": 33, "drawn": 77, "meshes": 30, "merge": "color",
  "views": ["front", "side", "back", "top", "three-front", "three-back"],
  "scale": { "elevationsPxPerMetre": 156.7, "topPxPerMetre": 156.7 }, "clip": "spider/crawl",
  "namesHidden": ["chest", "foot4L"],
  "checks": { "pieces": 1, "gaps": [], "touch": 0.021, "underGround": null, "said": [] }, "renderSeconds": 4.4 }
```

The folder has `meta.json` (`kind: "model"`, `ref`, `owner`, `version`, `file`, `look`), `latest.txt`,
`notes.md` (the stub) and `index.html` (plain HTML: the latest sheet beside the one before, what changed
between their `model.json`s as sentences, and the notes with their pictures).

`node studio/model-sheet.mjs --check <model>` is still the quick look without a browser (problems,
cost, joints, limbs, clips). Given no `--check`, model-sheet hands its arguments to render-sheet, so one
command writes review folders.

**When Jerry writes a note**, `node crew/crew.mjs review take model-<name>` says what to do: change the
file and bump its version, look at it, render, answer. His note's context ends with
`look: studio/model-lab.html?...`: give that to `render-sheet --look` to see exactly what he saw.

### 12.2 The checks

`modelChecks(json)` (studio/model-look.js) says in numbers what a model looks like it gets wrong, the
things that are easy to miss without eyes:

- **Pieces.** Parts that touch (their boxes within 1.2% of the model's biggest size: 2 cm on a man, 7 cm
  on the boat, never under 1 cm) are one piece. More than one piece means something floats, and it says
  what, how far, and the two nearest parts: `1 of the 7 spine floats 0.025 m off the rest (spine to gut)`.
- **Under the ground**: how far and which parts, for a model that stands (one with a `waterline` joint
  floats, so it's let off).

The sheet's header, `stats.json` (`checks`), the lab's panel, `render-sheet` and `model-sheet --check`
all say them. They are hints, not failures: the zombie model keeps the game's gaps on purpose.

### 12.3 The lab's address

Every setting is in the address, and the lab keeps it up to date as Jerry clicks.

| Parameter | Meaning |
| --- | --- |
| `model` | `kind/name`, a listed model. |
| `file` | A repo path to a draft `.json` (it stands in for a listed model of the same `kind/name`). |
| `asset` | The review folder the notes go to, when it isn't `model-<name>`. |
| `clip` | `rig/clip` to play (a model that is a rig). |
| `light` | `day` (the default), `night`, `nvg`. |
| `figure` | `figure` (1.75 m, the default), `marine`, `none`. |
| `wire`, `joints`, `names`, `spin`, `colors` | `1` to switch on (`colors`: parts in colour, numbered). `grid=0` switches the grid off. |
| `view` | `front`, `side`, `back`, `top`, `three-front`, `three-back`. |
| `cam`, `at` | The orbit camera: `yaw,pitch,distance` (radians, metres) and the point it looks at. |
| `part` | The index of a part in the file's `parts`, lit up. |
| `sheet=1` | The contact sheet (`mode=sheet` too). `rv=v2` puts the review version in its title. |
| `shot=1` | One picture, no panels, `w` × `h` (1280 × 800): what `render-sheet --look` saves. |

The sheet and shot pages set `window.__ready`, `window.__size`, `window.__stats`, and
`window.__png()` (a promise of the picture as a PNG data URL).

### 12.4 The note (contract 5)

The lab POSTs to `/__studio/note` (tools/serve.mjs hands it to studio/notes-endpoint.mjs):

```json
{ "asset": "model-spider", "text": "Longer legs.",
  "context": "creature/spider v1; night vision; side (its R, +X); part skull picked; ...; look: studio/model-lab.html?model=creature/spider&light=nvg&view=side&part=10",
  "snapshot": "data:image/png;base64,...",
  "meta": { "kind": "model", "ref": "creature/spider", "owner": "claude", "version": 1,
            "file": "studio/models/creature/spider.json", "look": "studio/model-lab.html?model=creature/spider" } }
```

`meta` makes the folder the first time. `version` is the file's `"version"`. The picture is the view
with its caption (what it shows, the light, the pick, the cost, the date), at most 1280 wide, smaller
until it's under 3 MB. The lab asks `POST /__studio/ping` first to say whether it can save; it tries
the note anyway. With no write door (a Python server) or one that refuses, the note is shown and
copied as the block to paste into `notes.md`:

```
## 2026-09-26 · Jerry · v1 · lab
Longer legs.
(In the model lab: creature/spider v1; night vision; ...)
```

The write door (§10.8) takes model notes, picture and all, and makes the folder the first time.

### 12.5 window.lab

The live lab can be driven from outside (studio/check-model-lab.mjs; studio/check-labs.mjs can take it
as `PAGES.model`): `ready`, `frames`, `state()` (the model, its cost and bounds, the settings, the
pick, the review folder, the body, the note's context and `look`), `setModel(ref)`, `setLight(mode)`,
`toggle(name, on)`, `setFigure(f)`, `view(key)`, `pick(i)`, `pickMaterial(name)`, `screenOfPart(i)`,
`partAtScreen(x, y)`, `lose(limb, on)`, `snapshot()`, `note(text, { picture })`, `ping()`,
`readReview()`, `watch()` (read the file now), `ghost(on)`, `nextFrame()`.

### 12.6 In code: studio/model-look.js

No browser needed; `model-look.test.mjs` checks it in Node.

| Export | What it is |
| --- | --- |
| `SHEET_VIEWS`, `VIEW` | The six views, in the sheet's order, by key: `dir` (from the model to the camera), `ortho`, `label`. |
| `viewBasis(view)`, `viewExtent(box, view)` | A view's picture axes, and how far a box reaches along them. |
| `orthoScale(boxes, views, w, h, pad)` | Metres a pixel that fits every orthographic view of the boxes into w × h. |
| `fitOrtho(cam, box, view, w, h, mpp)`, `fitPerspective(cam, box, view, aspect, pad)` | Point a camera at a box from a view; the box centred and all in. |
| `figureSpot(box, view)`, `SCALE_FIGURE`, `buildFigure()`, `FIGURE_HEIGHT` | The 1.75 m figure (a model file itself) and where it stands for a view. |
| `LIGHTS`, `LIGHT_MODES`, `applyLight(mode, scene, rig)`, `NVG_FILTER`, `drawNvgEdges(ctx, x, y, w, h)` | The game's day, night and night-vision light and filter. |
| `PLAY_CAMERA` | The game's camera: 60°, 12 m, 0.8 rad down, 1280 × 720. |
| `modelBounds(object)`, `sizeText(bounds)`, `rulerTicks(lo, hi, mpp)` | Size to the millimetre; ruler ticks. |
| `placeLabels(items, { w, h, measure })` | Names beside points that never overlap; deterministic. |
| `partRows(json)` | One row per part: copies, triangles, joint, material, limb, the mesh that draws it. |
| `partColor(i)`, `partHex(i)` | Part i's colour in the parts map, the same everywhere. |
| `partOverlay(json, joints, root, { src } \| { material }, mat)`, `partAt(json, joints, root, raycaster, hidden)` | Light up a part on the shown model (following its joints); find the part a ray hits, even inside a merged mesh. |
| `modelDiff(a, b)` | What changed between two versions of a file, as sentences. |
| `modelChecks(json, { touch })`, `checkSentences(checks)` | Pieces that don't touch and what's under the ground (above), and the same as sentences. |
| `modelNote({ json, ref, text, ... })`, `noteBlock(...)`, `ASSET_NAME` | The note's body (contract 5) and the block to paste. |
| `readLabQuery(params)`, `labQuery(state)`, `FIGURES` | The lab's address, both ways. |

### 12.7 Checking it

```
node --import ./studio/node-three.mjs --test "studio/*.test.mjs"      model-look.test.mjs (14) and
                                                                      render-sheet.test.mjs (6) among the rest
CHROME=... CHROME_ARGS=--no-sandbox node studio/check-model-lab.mjs   the lab in a real browser (63 checks)
```

`check-model-lab.mjs` opens the lab for every model and checks: no page error; the cost, joints and
parts are Node's; the turntable, the toggles, the three lights and the six views; parts in colour (every
drawn copy coloured, the model's own meshes hidden); a part picked from the
list lights every copy; a shift-click picks the part under the pointer; a material; a limb; a click on
a creature with a body hits it and it reacts; the picture; the note's body against contract 5; the
note's `look` opens the same view again; a file changed under the lab shows (keeping the camera), a
bad one shows its problems, and the old version shows as a ghost; the sheet draws with Node's numbers;
a draft opened with `?file=`. Then the note with no write door (copied), and with the real
tools/serve.mjs on a scratch copy of the repo whose review folder is empty (saved, or copied on the
first lab's endpoint), so it never writes into the repo.

### 12.8 Found while making it

- three's WebGPU renderer takes a light's new colour and strength once per turn of its own animation
  loop, not at each `render()`: a picture drawn outside the loop after the light changed keeps the old
  light (the model package's night view was lit like day). The lab draws each picture inside the
  loop (`paint`).
- The key light's world matrix has to be updated before its shadow is drawn, or each picture's
  shadows fall where the picture before had its light.
- In headless Chrome, a 2D canvas that has a WebGL canvas drawn into it moves onto the GPU, and every
  line of text drawn after that faintly tints and dithers the whole canvas (the header came out with
  alpha 252 and diagonal stripes). Pictures are handed over as pixels (`putImageData`).
- A grid far off shimmers into moiré, so the grid only covers the model and a few metres round it.
- The studio's marine is 1.56 m to the top of his cap (the game's about 1.62 m); the sheet and the lab
  have their own 1.75 m figure.
- The zombie model's feet are 0.26 m under the ground, as the game's are (P-73): its elevations
  show the boots under the ground line against the ruler, which is the screenshot P-73 asks for. The
  checks also find a 5 cm gap at its waist, between the hips and the torso, which the game's
  makeZombieMesh has too (hips box 0.55 to 0.75 m, torso from 0.80 m): it shows in the front view.
  Both are left as the game has them; they're for Grokbot and Jerry to decide (P-73).
- One of the spider's seven spine bones floated 2.5 cm above its gut. Its gut is 5 cm taller now and
  sags a little under the spine (`creature/spider` version 2: review/model-spider/v2 beside v1).

---

## Later

- **Textures:** recipes as data (noise layers, colours, wear, grime), baked at load; the renderer
  makes a swatch sheet (flat, on a sphere, on the prop, day and night) into the same review folder.
- **Sound:** the same loop for stingers and effects (a waveform, a spectrogram and the file, with
  notes).
- **Reactions beyond humanoids.** The spider has a body as data (§11.6) and reacts in the studio; it
  joins the game's horde (and `studio/motion/index.js`) once its preset is tuned. The colossus and the
  guardian get theirs when they need to react. The guardian's thrown marine is a held body in a scene
  (§10.2); the game still plays the kinematic one. Hit arcs on top of the same points.

## Looked at and set aside (2026-09-26)

- **Caracal Studio** (Jerry's earlier texturer: Tauri, React, three.js, a TripoSR image-to-mesh
  server). It's built for a person clicking a desktop app, and most of its backend is placeholders;
  TripoSR's dense meshes don't fit the game's low-poly look. The idea carries over; the code doesn't,
  for now.
- **Blender and skinned meshes.** Best if a person animates; agents can't, and the game's creatures are
  procedural rigs. Revisit if Jerry wants to hand-animate.
