# Draft: the reaction engine, held, lost, getting up, level of detail (for docs/studio.md §10)

The engine package of D-42's second round (P-74, and what P-70 to P-72 need from the engine). It
covers the shared contracts (1) to (4). The lead folds this into `docs/studio.md` §10 and
`docs/contracts.md`; nothing here changes the game (`index.html` plays nothing new).

## What changed, in one paragraph

A body knocked down now lies flat on its front or its back instead of slumping into a sit, and gets
up on a clip for that side. A hand can hold a body by one point; the rest of it hangs, trails and
drags. A body can lose an arm, a leg or its head. A body far away can simulate at half rate, or hold
still while its timers run. Standing reactions (a flinch, a stagger) are exactly what they were: the
same numbers, bit for bit.

## Lying flat (`fall.upright`)

A muscle pulls each point toward where the animation has it, relative to the body's root point.
Standing, it keeps the animation's own world orientation: that's what keeps a body upright. Before,
it did that falling and lying too, so a knocked-down body was held up in a sit. Now, falling, lying,
held and dead, a muscle keeps only the animation's shape, turned with the hips to however the body
lies. It topples, and lies flat.

`fall.upright` (0 to 1, default 0) says how much a falling or lying body still keeps the animation's
way up. `held.upright` is the same while held. React and getup are always 1.

Turned like this, the legs and spine keep their shape off the hips, and the arms and head off the
chest. (Off the hips alone, a twisted spine put the arms' targets in the ground and they shoved the
body over.) The fall's `catch` (hands out to the ground ahead) fades out as the chest comes down:
kept on a body lying on its face, it was a push-up over the top, and a marine somersaulted again and
again and never lay still.

Knocked down, 48 zombies cost about 7 to 15% more a frame than before (about 2 ms against 1.9,
update and apply, Node): two frame turns a step. That's about 0.04 ms a body; the pool keeps it to 8.

## Getting up (contract 1)

When a body starts to get up it emits `['getup', { side, heading }]`:

- `side` is `'front'` if it lies face down (its chest faces the ground), `'back'` if face up.
- `heading` is the world yaw (radians, three.js Y rotation, +Z forward) to turn the rig's group to,
  so that a get-up clip that starts lying lines up with the body. Face down, it's the way from its
  hips to its chest (its head is toward +Z in the clip). Face up, it's the way from its chest to its
  hips (its feet are toward +Z in the clip).
- `body.lying` is `{ side, heading }` while the body is `down` and `getup`, and `null` otherwise.

A preset names its clips:

```json
"getup": { "time": 1.2, "front": "zombie/getup-front", "back": "zombie/getup-back" }
```

**A host that plays clips** (a scene, the lab, the game's horde adapter), on the event:

1. turns the rig's group to `heading` (world yaw);
2. plays `getup[side]` from its start, at `clip.length / getup.time`, so it ends as the body lets go;
3. when it ends, goes back to its own clip (a 0.3 s fade from the clip's last frame is seamless: each
   get-up clip ends in the rig's rest with its idle's spine and head).

The body's weight goes from 1 to 0 over `getup.time` while its muscles follow the clip. A host that
doesn't play clips keeps the old blend back to its own animation.

```js
for (const e of body.update(dt)) if (e[0] === 'getup' && preset.getup[e[1].side]) {
  group.rotation.y = e[1].heading;                       // or its parent-relative equivalent
  const clip = clips[preset.getup[e[1].side]];
  player.play(clip, { speed: clip.length / preset.getup.time });
}
```

The four clips (`studio/clips/zombie/getup-front.json`, `getup-back.json`,
`studio/clips/marine/getup-front.json`, `getup-back.json`) are made by `studio/make-getup.mjs`:

```
node --import ./studio/node-three.mjs studio/make-getup.mjs            write them, and check them
node --import ./studio/node-three.mjs studio/make-getup.mjs --check    only check what's on disk
```

Each is a few beats: where the hips are and how they're turned, how the spine and head bend, and
where the hands and feet go (rig frame). The script fits each limb without twist (a shoulder or hip
swing, an elbow or knee bend, from where the beat before left it), so beats blend into each other
and into the rest without an arm spinning about itself. It prints each clip's worst one-frame turn
at the fastest rate a preset plays it (all under 0.3 rad), how low any end goes, and how far the
last frame is from the rest.

| Clip | Length | Beats |
| --- | --- | --- |
| zombie/getup-front | 1.2 s | lying face down, hands under the chest; shove the chest up; hips up onto all fours; a knee under and the other foot planted, a hand on that knee; up that leg; standing, arms dropping into the droop. |
| zombie/getup-back | 1.2 s | lying face up; a sit-up with the hands behind; a roll onto the left hip and hand; the knees under; up. |
| marine/getup-front | 1.1 s | a soldier's push-up; hips up; a foot planted, a hand on that knee; up. |
| marine/getup-back | 1.1 s | sit up hard; roll onto the left hand and knee; the right foot planted; up. |

Times in the presets (each bumped to version 2):

| Preset | getup.time | Plays the clip at | Also |
| --- | --- | --- | --- |
| zombie/shambler | 1.2 (was 1.0) | 1× | |
| zombie/feral | 0.85 (was 0.45) | 1.41× | |
| zombie/brute | 1.5 (was 1.4) | 0.8× | |
| marine/marine | 0.9 (was 0.6) | 1.22× | `down.time` 0.55 (was 0.7), so he's still up fast: 1.45 s from down to recovered, inside P-72's 1.5 s. |

The zombie clips end at the rig's rest: hips 0.55, feet 0.21 under the root, as the game stands its
zombies (P-73). If P-73 raises the hips, the last beat in `make-getup.mjs` moves with it.

**In a scene** it's automatic: an actor with `motion` whose preset names get-up clips turns to the
heading and plays the clip (the scene's own clips keep their clock underneath), then fades back to
its own clips over 0.3 s. The turn stays: the scene's facing for that actor turns with it, as its
place moves with its drift. Its `tilt` and `rise` stop applying once it has got up. A new fall,
death or hold stops the get-up clip. `studio/load.js` fetches the get-up clips
(`sceneClipRefs(json)` lists every clip a scene needs). A page that fetches only the actors' clips
still plays the scene; `loadScene` returns `scene.warnings` and those bodies get up the old way.

## Held bodies (contract 2)

```js
body.hold('footL', target, { strength = 1, offset });   // target: a Vector3, [x, y, z], or () => [x, y, z]
body.release('footL');                                   // or release() for every hold
```

- `strength` 1 is hard: the point is put on the target in every constraint pass, and it has no
  weight in the solve (it goes where the hand goes; the rest of the body is what gives).
- Under 1 it's a spring of that tone, and it also pins by strength⁴ of the way each pass, so it
  firms up into the hard pin near 1 without a jump. A scene eases a hold in by its weight.
- The target is read once a frame and eased across the frame's steps.
- `offset` (optional, world, now): where the hand really has it, from the point (the ankle, where the
  point is the sole under it). It turns with the point's own bone every pass.
- A body that's held is in the state `held`: its muscles take `held.tone`, its feet let go, and it
  neither balances nor steps. A held corpse stays `dead`, and doesn't settle while held.
- Let go of, it drops (`fall`), or, if it's still standing (its hips above 80% of their standing
  height), it finds its feet (`react`).
- Events: `['held', { point }]`, `['released', { point }]`. `body.holding` is how many holds it has.
- A lost part can't be held (`hold` returns false). A full pool never sleeps a held body.

The preset's `held`:

| Field | Meaning | Default |
| --- | --- | --- |
| `tone` | Muscle tone while held. Low: arms that trail, a head that bounces, legs that catch. | legs 0.1, spine 0.18, arms 0.06, head 0.1 |
| `friction` | The ground's grip on it. Low: it slides rather than sticks. | 0.3 |
| `upright` | How much it keeps the animation's way up (see Lying flat). | 0 |
| `absorb` | How much of each yank it soaks up. Hauled fast by a hand held high, every step's pull comes through the bones as a jump, and kept as speed the legs and hips fly up the line to the hand. 0.8 keeps him on the ground; 0.5 flung him at some frame rates. | 0.8 |

A held body gets 8 constraint passes a step instead of 4, so its limbs keep their length while it's
hauled (the grip stays in the hand). Held bodies are few.

`studio/motion/marine/held.json` is the guardian's victim (owner claude, P-74): the marine preset
plus `held`.

**In a scene**, a hold whose `to` actor has `motion` is the body's own hold, not the kinematic tow
and lift: the holder's hand holds the body point the hold names (`marine.footL` is the point `footL`;
a joint is the point on it; otherwise the nearest point to the grip), with the grip's offset, by
`max(tow, lift)`. `trail` still turns the held actor's animation, so its muscles pull it into a body
stretched out behind the grip. While a hand has it, the actor's scene place stays where its keys
put it (as in the scene without a body), so the holder aims and reaches as it always did: aiming at
a body that a hand pins is aiming at your own hand, and it whips. Let go of, the actor takes up where
the body lies. The gap check measures the hand to the grip as drawn.

`studio/scenes/guardian-grab-drag-flop.json` is `guardian-grab-drag.json` with
`"motion": "marine/held"` on the marine. He's yanked onto his face, crumples while it turns, and is
dragged with his arms trailing and his head down. While the hand has him the grip gap is at most
2.4 cm at 60 fps (1.2 cm while hauled); it's 4 cm at 30 fps, at the yank. The only other gap over
3 cm is the reach before the hand has him (6 cm at 0.42 s), the same as the plain scene. The
guardian's own flagged checks (slides, a snap) are its clips', identical in both scenes (CL-64). The
game still plays `guardian-grab-drag.json`, untouched.

**Review scenes.** Besides the flop, two new ones for Jerry's eye (studio/scenes/):

- `getting-up`: a shambler and a marine, each shot onto its face and onto its back at 0.3 s; each
  gets up on its own clip for that side, turned the way it lies.
- `zombie-dismembered`: a shambler loses its left leg (it goes over, lies, and gets up on the leg it
  has); one loses its right arm and takes a rifle round (it only rocks); one loses its head with the
  killing shot (it drops limp).

`zombie-reactions` and `marine-knocked` now show the get-up clips too (the close shell, the
grenade, the blast).

Not done: the review folders. `node tools/studio.mjs scene studio/scenes/guardian-grab-drag-flop.json`
drew the strip here, but its video step timed out headless ("the scene video did not finish"; P-76,
Cursor's), so there's no folder to commit. Render them on Jerry's GPU. For `getting-up` and the
reactions, `tools/studio-scene.html` first needs to fetch `sceneClipRefs(json)`, or its bodies get
up the old way.

## Lost parts (contract 3)

```js
body.lose('legL');     // armL, armR, legL, legR, head: the game's partsLost keys (BODY_PARTS)
body.lost;             // ['legL']
```

- A lost part's points (an elbow and hand, a knee and foot, the head and crown) stop simulating and
  stop counting for balance. The shoulder, hip and chest points stay: they're part of the torso's
  and the hips' frames.
- A lost point rides with the point it hung from, turned with the torso (an arm, the head) or the
  hips (a leg), as the rig draws a lost part: its segment isn't written, so the joint keeps the
  animation's turn under its parent.
- A body standing on a leg it loses falls (`lose` wakes it; false if the pool refused). A lost arm
  or head doesn't wake it.
- A hit at a lost point lands on the point it hung from.
- Event: `['lost', { part }]`. `body.reset()` puts it back together.
- `studio/bodies.js` says what each part is: `parts: { legL: { points, anchor, joint } }`. `joint`
  is the part's group, the one a host hides.

**In a scene**, `"lose": [[t, "legL"]]` on an actor with `motion` takes the part off at `t`, and a
studio body stops drawing it (a host's own body is the host's to hide). A seek puts it back.

## Level of detail (contract 4)

```js
body.update(dt, { lod })   // 0: every step (1/120 s). 1: half the steps, twice as long. 2: the pose holds still.
```

- lod 1 steps at 1/60 s. A change of step keeps every point's speed. It falls, lies, gets up and
  recovers as at lod 0.
- lod 2 doesn't simulate. Its timers run: a body that's down gets up on time, a get-up finishes, a
  flinch recovers, a corpse settles and sleeps, a fall in mid-air ends after 1.2 s. A body a hand
  holds goes where the hand goes.
- Cost, update only, 48 zombies after a shell, Node: lod 0 1.6-1.9 ms, lod 1 0.9-1.0 ms, lod 2
  0.04 ms a frame. `apply()` is the same at every lod (about 0.2 ms for 48).

## Everything else that changed in the engine

- `frameQuat` writes its basis straight into the matrix, and `apply` blends the short way
  (`slerpTo`), so the engine runs the same under the game's test stand-in for three (its
  `makeBasis` does nothing and its `slerp` doesn't take the short way). The horde adapter's tests
  run there.
- The runaway guard ("nothing flies apart") puts a held body back with its held point on the hand.
- `body.pointAt(name, out)`: one point, cheaper than `points()`.
- `validateMotion` checks `getup.front`/`back` (a clip ref for the preset's rig), `held` and
  `fall.upright`, and still leaves fields it doesn't know alone (`expect`).

## Events, all of them

`wake`, `hit`, `stagger`, `step`, `fall`, `land`, `down`, `getup` (now with `{ side, heading }`),
`recovered`, `dead`, `settled`, and new: `held`, `released` (`{ point }`), `lost` (`{ part }`).

## For studio/index.js (the lead adds)

```js
export { MOTION_FORMAT, HIT_KINDS, BODY_PARTS, validateMotion, loadMotion, createBody, createMotionPool } from './motion.js';
export { SCENE_FORMAT, validateScene, loadScene, createScene, sceneClipRefs } from './scene.js';
```

## For other owners

- **The motion lab** (`studio/motion-lab.html`): turn the rig to the heading and play the get-up
  clip on `getup`, as in the snippet above; it fetches `clips/<ref>.json` like its idle.
- **Cursor, `tools/studio-scene.html`**: fetch `sceneClipRefs(json)` instead of the actors' clips
  only, or the review renders get up the old way (`scene.warnings` says so).
- **Grokbot, P-70 to P-72**: `update(dt, { lod })` for far zombies; `lose(part)` from
  `detachZombiePart`; the `getup` event and `preset.getup` clips for the horde adapter; the marine's
  get-up is 0.9 s and `down.time` 0.55 s.

## Checking it

`node --import ./studio/node-three.mjs --test "studio/*.test.mjs"` (48 tests). New in
`motion.test.mjs`: a held body's point stays within 3 cm of a moving hand and nothing goes through
the ground; a hold can be a function and is a spring under 1; the flop scene's grip gap stays under
3 cm while the hand has him, and it seeks the same every time; a lost leg drops a body, a lost arm
doesn't; knocked down face down it reports front, on its back back, and both rigs end standing on
their animation after the clip; every preset's get-up clips start lying, end standing and don't snap
at their rate; a scene turns and gets a body up on its clip, and still plays without the clips; the
new review scenes play (each body gets up from the side it fell on; what's left of a body reacts); a
scene takes a part off on cue; lod 1 costs clearly less and still gets up, lod 2 holds the pose and
its timers run.
