# Reactions in the game: the horde (P-70 to P-72, D-42)

Draft for docs/studio.md §10 ("In the game"), GB-65 to GB-67. Claude (studio side) and Grokbot
(combat side).

The motion lab's bodies now play in the game. A rifle round jolts a zombie, a close shell staggers
it or puts it down, a grenade throws it, and it gets up again. A death falls the way it was hit and
lies where it lands. The marine is rocked by a swipe, staggered a step by a brute and put down by a
bomber's blast, and he is up fast. It is all behind a switch that is **off**. With it off the game
is exactly as it was: the horde is never even made.

## Turning it on

- `index.html?reactions=1`, or
- `localStorage.tt_reactions = '1'` (stays on across reloads), or
- the dev console (~): `reactions on` and `reactions off` (this session only).

`reactions off` lets every body go back to its animation at once.

## The pieces

| Piece | Where |
| --- | --- |
| The horde: adoption, the pool, hits, deaths, drift, get-up clips | `studio/motion-horde.js` (Claude) |
| Its tests, on the studio's zombie stand-ins | `studio/motion-horde.test.mjs` (14) |
| The switch and the wiring | `index.html`, "=== Reactions" by the knockdown (Grokbot's part) |
| The game check, on and off | `tools/tests/t85.js` (26 checks) |
| What it looks like in the game | `docs/drafts/horde-shots.jpg` (see "Seen in the game") |

The bodies are studio/motion.js's, unchanged: the same code the lab and the scenes run.

## studio/motion-horde.js

```js
import { createHorde, fetchHordeClips } from './studio/motion-horde.js';
import { presets } from './studio/motion/index.js';
const horde = createHorde({
  presets,                        // studio/motion/index.js
  max: 8,                         // bodies simulating at once (a pool, rule 12)
  ground: (x, z, y) => groundY,   // the world's ground; y is the body's own height (to pick the deck)
  lodFor: (x, z) => 0 | 1 | 2,    // handed to body.update(dt, { lod }) (contract 4)
  clips: (ref) => clipJson,       // get-up clips, from fetchHordeClips(presets) in the browser
  onEvent: (key, name, data) => {},
  move: (key, dx, dz, group) => {} // optional: default moves the rig's group
});
horde.hit(z, { at: [x, y, z] | 'chest', dir: [x, y, z], power, kind, shot });  // false: refused
horde.kill(z, { ... });           // true: it dies as a ragdoll
horde.beginFrame();               // first thing each frame, before the host animates anything
horde.update(dt);                 // once a frame, after it has → [{ key, name, data }]
horde.busy(z);                    // true while it falls, lies or gets up
horde.adopt(key, { rig, preset, group, move, ground });   // a body of the host's own (the marine)
horde.freeze(z); horde.release(z); horde.releaseAll();
horde.stats;                      // { attached, active, awake, ms, msAvg, lod: [n0, n1, n2], refused, max }
```

**Adoption.** A zombie is adopted the first time something hits it:
`rigs.get('zombie').create({ group: z.mesh })`. The rig and its body are kept on the mesh
(`mesh.userData.hordeBody`), and meshes are pooled, so each one adopts once in its life. Adopting
costs about 0.4 ms (rigs.create builds the studio's own rig to read its rest pose), so at most three
adopt a frame (`adoptsPerFrame`); a fourth fresh zombie in the same frame keeps the old reaction.

**Presets by type** (`z.typeKey`): brute, demon and guardian use `zombie/brute`; feral uses
`zombie/feral`; every other humanoid uses `zombie/shambler`. Spiders, the colossus and the cave
guardian never react. The guardian is on the brute's preset because it is a 420-hp boss: on the
shambler's it would be knocked about like one. (The task said "everything else shambler"; this is the
one change, for the lead to confirm.)

**One shell, one push.** Hits with the same `shot` on one body before the next `update()` become one
hit: the powers add, the direction and the point are their average by power. A killing pellet takes
the rest of its shell with it, so the corpse is thrown by all of it. The game numbers each shotgun
and AA-12 shell (`shotSeq`) and every pellet carries it.

**The pool.** A hit takes a slot at once and holds it until `update()` flushes the hit, so `hit()`
can say yes or no straight away. A body that already simulates always takes more hits. When all
eight are busy, the longest-dead corpse **lying on the ground** gives its slot up and is frozen where
it lies. A corpse still in the air never does (it would hang there), and neither does a body that is
down but alive (the engine's `sleep()` would stand it straight back up). Otherwise the hit is refused
and the game plays its old reaction.

**Two calls a frame.** `beginFrame()` comes first, before the host animates anything: every joint a
body wrote last frame gets back what the animation had left on it. The game sets only some of a
joint's Euler angles each frame (a leg's swing but never its twist; the marine's hips' yaw and roll
but never their pitch), and three.js keeps a joint's Euler in step with its quaternion, so without
this the reaction's own tilt stayed in what the body read as the animation next frame and fed on
itself: a brute's blow threw the marine metres into the air, in the real game (the browser checks'
stand-in for three never syncs a quaternion back to its Euler, so they could not show it). A corpse
lying still keeps its pose. Then `update(dt)`, after the host has animated and every hit is in:

**In update(), for each body that is awake or has a hit waiting** (the rest cost nothing):

1. The ground under it: a plane through three samples at its group (not a lookup for every point on
   every physics step). Slopes past 1.5 are clamped.
2. A body that was asleep is `reset()` first, so it starts from this frame's pose, not moving.
3. A get-up clip, if one plays, poses the rig. Otherwise the joints the body moves by position (the
   zombie's hips; the marine's hips and torso) go back to their rest across the ground: the game only
   ever poses their height, so what the body last wrote there would read as the animation.
4. Far zombies' joints don't update their own matrices (the game's render LOD): they are updated here.
5. `follow()`, then lost parts to `lose()` (contract 3, when the engine has it), then the hits.
6. `update(dt, { lod })`, with lod from `lodFor` (contract 4).
7. The drift goes to the host **before** `apply()`, so the body is drawn where it is.
8. `apply()`.

**Get-up clips (contract 1).** When the engine's `getup` event says `{ side, heading }` and the preset
names a clip for that side (`"getup": { "front": "zombie/getup-front", "back": ... }`), the rig's group
turns to `heading` and the clip plays from its start on the adopted rig. The clip's positions are
scaled to the mesh: the game bakes each type's size into its joint offsets (a brute's hips are at
0.55 × 1.38), where the studio scales the whole rig. When the body stops getting up, the joints go
back to the pose they had before the clip (the game animates from there), and the marine's group
faces the way it did. Without the event's side and heading (today's engine), or without a clip,
nothing is played: the engine's own blend.

**Two fixes to adopted game meshes** (in the horde, so studio/zombie.js is untouched):
- adoptZombie() puts the hand and foot ends at the shambler's offsets. The horde moves them out by the
  mesh's own scale (read from its elbow), so a brute's reacting hands are at its hands.
- The adopted rig's rest keeps the mesh's own joint offsets, not the studio's, for the same reason.

## The game (index.html)

All in Grokbot's parts, each change commented `GB-65`, `GB-66` or `GB-67`.

| Where | What |
| --- | --- |
| The imports; the switch state just after them | `createHorde`, `MotionPresets`; `reactionsOn`, `Horde`, `hordeClips`, `shotSeq` |
| "=== Reactions" (before "=== Knockdown") | making the horde, the power mapping, which hits react, ragdoll deaths, `holdReactingZombie`, the marine, `updateReactions` |
| `damageZombie` | a hit the horde takes skips the old flinch, knockdown and kick; the killing hit's push goes to `killZombie` |
| `killZombie` | the pellet, blade and bullet/burn deaths call `ragdollDeath`; blasts and the saw still gib |
| `beginCorpse(z, dx, dz, rag)`, `updateCorpses`, `finishCorpse` | a ragdoll corpse keeps the blood (its pool follows the body until it is still), the shadows and the sink, not the topple; it is frozen before it sinks and let go before its mesh is pooled |
| `updateZombies` | a busy zombie is the horde's: no walk, no turn, no attack; it still burns, its hit flash fades, and walls and the HQ still hold it |
| `recycleOrDisposeZombie`, `clearZombies` | the body is let go with the mesh; a reset lets them all go |
| the main loop | `Horde.beginFrame()` first in `tick()`; `updateReactions(dt)` after projectiles and grenades, before anything is drawn |
| the projectiles, the explosions | `dist` (how far the round flew), `shot`, `blast` (where in the blast) and `blastDmg` on the hit |
| `damagePlayer`, `explodeGrenade` | a zombie's blow and a bomber's blast go to the marine's body |
| movement, `tryFire`, jumping, `tryRoll`, the knife, grenades | the marine while he reacts |
| `beginScriptedKill`, `endGame` | the marine is let go first |
| the dev console, `window.TT` | `reactions on|off`; `getHorde`, `setReactions`, `getReactions`, `reactionPower`, `marineReactState`, `marineFloored`, `marineReactK` |

### Which hits react

The kinds map as the task said: bullets `bullet`, shotgun pellets `pellet` (a shell's summed),
explosions `blast`, the knife, machete and chainsaw `blade`, falling trees `crush`. A hit does not
react (the old reaction plays) when: reactions are off; it has no push (spikes, fire: `generic`, or a
melee hit with no direction); the zombie is in the old knockdown, still clawing out of the ground,
in a window, mid-leap or mid-charge, in water deeper than 0.6 m, or crawling; it is a spider, the
colossus or the cave guardian; or the pool refuses it.

A death falls as a ragdoll unless it gibs (blasts, the saw), it is in the water, it is still rising
or in a window, or the horde refuses it. A death with no push (a burn) goes limp where it stands.

### The power mapping

A hit's power is the push at the point hit, in m/s (docs/studio.md §10). From the weapon and the
distance:

| Kind | Power | Examples |
| --- | --- | --- |
| bullet | 0.57 × √damage, 1% less every 2 m flown (at most 30% less), at most 7 | M4 2.5, AK 3.0, pistol 2.8, Uzi 1.9, revolver 4.1, sniper 5.5 |
| pellet | 0.103 × damage each (at most 1.5), full to 2 m, then 1/17 less a metre (to 35%) | shotgun pellet 0.93: a close shell 6.5; at 6 m 0.71 each, about 3.2 for the four or five that land; an AA-12 shell 3.6 up close |
| blast | 8 × √(damage ÷ 55) at the centre, falling to 35% at the edge, at most 11; at the pelvis, lifted | grenade 8, launcher shell 9.6, bomber 7.3 |
| blade | 1.6 + 0.022 × the blade's damage (before GB-52's size scaling), at most 5; the saw 1.2 a tick | knife 2.1, machete 3.5 |
| crush | 6, at the chest, pressed down | a falling trunk |

Damage is the round's (perks and pierce falloff included), before armour: armour takes damage, not
momentum; the brute's preset takes the rest (bullets × 0.5). The caps keep a debug hit of thousands
from throwing a body across the map.

The marine: a zombie's blow is `crush` (claws: feral, leaper, spider are `blade`) at the shoulder
facing it, 1.5 + 0.15 × damage, a tenth more from the heavy kinds, at most 7. A shambler 2.4, a brute
4.3 (a stagger), a demon's charge 6.4 and the colossus's slam 5.9 (both put him down). A bomber's
blast is 8 × (1 − 0.6 × distance ÷ radius) at his pelvis, lifted: 6.9 at 1 m (down).

### The marine (P-72)

He is adopted as the `marine` rig with `marine/marine` on his first hit, with no pool slot of his own
to lose (he is never refused; he is the ninth body at most). His drift moves `player.position`. While
he staggers or gets up he keeps control at 60% pace; while he falls and lies (about a second) he
can't move, shoot, jump, roll, knife or throw. A roll from a stagger takes him out of it (his planted
feet would hold the roll back). He never reacts in a scripted kill, the insertion, a roll, the water,
on the ladder or at the mortar, nor in godmode, and he is let go when a scripted kill starts and when
the match ends. When his body takes a blow, GB-50's knockback slide and scripted knee are dropped:
his stagger steps are the knockback, and the scripted knee under a staggering body pulled it over
(three steps and a fall from a brute; one step without it). GB-50's camera and aim jolt stay.

## Checking it

- `node --import ./studio/node-three.mjs --test studio/motion-horde.test.mjs`: 14 tests. The preset
  by type and what is refused; adoption once per mesh; a shell's pellets as one hit (a close one drops
  a shambler, which gets up; a far one staggers it; a brute shrugs one off); a kill that lies, settles
  and is frozen, and takes its shell's pellets with it; the pool and the lying corpse that gives up its
  slot; lod and lost parts handed to the engine; a get-up clip turned to the heading and played; the
  hips back where the host keeps them; three adoptions a frame; determinism; the marine (a brute's
  blow is a step, a bomber at 1 m puts him down and he is up in under 1.5 s); a host that poses some
  Euler angles each frame, as updateMarinePose does, with beginFrame (a brute's blow stays a step; it
  threw him 6 m up without); 48 attached with 8 reacting in about 0.4 ms a frame.
- `tools/tests/t85.js`, in the game: all of the above that the game adds, on and off (26 checks).

The browser checks run on a stand-in for three.js with no `Matrix4.makeBasis`, so a body's hip and
chest frames are only right facing +Z there; t85 stands its zombies and the marine that way. The same
stand-in runs its maths through proxies, about 25 times slower than three.js: t85 bounds the horde at
4 ms a reacting body a frame there (it measures about 1.5), and the Node test holds the real figure.
**Requests for Cursor**, both in `tools/tests/fakethree.mjs`: a real `Matrix4.makeBasis`, so a reacting
body is right whichever way it faces in the browser checks; and a quaternion that keeps its object's
Euler in step (three.js does, the stand-in only goes the other way), so a check can see what the game
does when it sets one angle of a joint a body has turned.

That slowness also means a browser check that times something by the wall clock can come up short
when many bodies react at once there (t77's "off, it cools" did once, under three jobs; it passes with
two). t85 times everything by the game's own dt for that reason.

With the switch off (the default), the whole browser suite at two jobs gave 1242 passes and 8 fails
against the base's 1220 and 4. Of the extra fails, t41's "cave grab running", t59's two "drag
finished" and t85's two passed when run again at lighter load, and t79's (A) was already known to
fail. The one I can't explain is t80's "three wall pieces between them stop his rounds": it failed 4
times in about 19 runs here and never in 15 on the base. In the one failure caught with a probe,
the rounds that hit the spider were fired from about 4.3 m south of the marine and 3.35 m above him,
as if the muzzle hadn't caught up with the check moving him there. Since then 13 probed runs here and
9 on the base, side by side, all passed; on both, the rounds fired in that check follow the frames
drawn (about one round every three frames), so a faster run fires more and has more chances. With
the switch off the horde is never made and every hook returns at once, so I have found no way for
this work to cause it. It is left here for Grokbot and Cursor: where a round starts on the frame
after the check moves the marine.

Run with the switch on, the checks near what changed (t0, t14, t21, t24, t28, t31, t33, t34, t36, t37,
t40, t53, t54, t60, t61, t63, t69, t71 to t77, t80, t83, t84, t85) pass, apart from t76's "sampled N
frames" (it fails on the untouched base too) and t85's first check, which says the switch is off by
default and so fails, as it should, on a page opened with `?reactions=1`. A script that runs the suite
that way is a copy of `run-all.mjs` with `&reactions=1` on the page's address.

## Seen in the game

`docs/drafts/horde-shots.jpg`: the real game with real three.js, rendered in software (SwiftShader,
about one frame a second, so no fps from it). Four zombies west of the HQ in the grace hour, side-on:
a close shell on a shambler, a grenade by a shambler, an M4 round that kills a shambler, and a close
shell on a brute. Each "reactions on" frame is taken when the first shambler reaches that state, not
at a clock time. The last frame is the same hits with reactions off.

Logged at each frame (the body's simulated pelvis against the drawn hips joint, over the ground):
falling 0.27 and 0.27, down 0.12 and 0.12, getting up 0.53 and 0.57, up 0.62 and 0.59. The drawn body
follows the simulated one; the shamblers are down 1.6 s and up about 1 s later, as their preset says;
the brute rocks and keeps its feet; the corpse lies flat where it fell.

One thing to tune (P-75): **down, a shambler sits rather than lies**. Its pelvis is on the ground but
its chest stays up, because the fall tone keeps the spine and head against the standing pose. A lower
`fall.tone.spine`, or the get-up clips (contract 1) posing it flat, would lay it down.

## Before it is on by default (on Jerry's GPU)

- fps with 48 zombies and 8 reacting from the standard view: no worse than 60 (P-77, Antigravity).
  `TT.getHorde().stats.ms` gives the horde's own time.
- A shotgun into a crowd: no hitch when several fresh zombies are adopted in one frame.
- Corpses: lying on the ground (not floating, not through it) on slopes, bridges and the dock; the
  blood pool under the body; 18 corpses and fps no worse (P-71).
- Zombies with limbs shot off: with today's engine the lost limb's points still simulate (hidden); with
  contract 3 (`lose()`) they don't. A crawler never reacts.
- A zombie knocked into a wall or the HQ: held out of it.
- The marine: a brute's blow (a step), a bomber (down, up in about 1.3 s, input back), a demon's
  charge; with the get-up clips once the engine package adds them.
- Get-up clips (contract 1) on a brute and a feral: the clip lined up with the lying body; no pop at
  the end of the clip when the walk takes over.
- The knife and machete shove: with reactions on it is the body's stagger, not GB-52's kick. Check
  it still clears a zombie out of your face (Jerry's call; tune the blade presets if not, P-75).

## Exports for studio/index.js

```js
export { createHorde, fetchHordeClips, hordePresetFor, HORDE_PRESETS, NEVER_REACT, HORDE_PARTS } from './motion-horde.js';
```

The game imports `./studio/motion-horde.js` directly today; it can switch to `Studio.createHorde` once
the lead adds the line.
