# Models as data (dw-model/1)

A draft for `docs/studio.md` (D-40's second half: "modeling and animation"; it replaces "Later:
Models"). Claude's. The code is `studio/model.js`; the models are `studio/models/`.

A clip made animation something an agent can read and edit. A model does the same for the thing
being animated: a prop or a creature is one JSON file of materials, joints and plain shapes, not a
function of hand-placed boxes. An agent writes the file, checks it in a second, looks at it as a
contact sheet, and Jerry writes his note on it like any review folder. The game, the pages and the
tests all build the file through the same code, so what Jerry approves is what the game draws.

A model with a skeleton and limbs is also a **studio rig**: it plays clips, stands in scenes, and,
with a body, reacts when it's hit. The spider is the first creature that is only data.

## 1. The file

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
rig's, docs/studio.md §2). "L" is the model's -X side, as for the marine and the zombies.

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

## 2. Materials

| Field | Meaning |
| --- | --- |
| `color` | `"#rrggbb"`. The only one needed. |
| `roughness`, `metalness` | 0..1 (defaults 0.8 and 0). The game has no reflections to show metal in, so over about 0.5 metal reads as dark: the boat's aluminium is 0.3. |
| `emissive`, `emissiveIntensity` | The colour it glows, and how much (0..20, default 1): a lamp, an eye. |
| `flatShading`, `transparent`, `opacity` | As three.js has them. Under 1 opacity needs `transparent`. |
| `side` | `"double"` draws both faces: a thin sheet seen from either side (a hull plate). |
| `note` | Free text. |

## 3. Joints

`{ "name": { "parent", "at", "rot" | "aim" + "pole", "mirror" } }`:

| Field | Meaning |
| --- | --- |
| `parent` | Another joint; leave it out for one on the model itself. Loops are refused. |
| `at` | `[x, y, z]`, metres from the parent. |
| `rot` | `[x, y, z]` degrees, in the parent's frame (Euler XYZ, the clip format's `rot`). |
| `aim`, `pole` | Instead of `rot`, and easier blind: `aim` is the way the joint's bone (its -Y) points, `pole` the way its +Z turns, both in the **model's** frame whatever the parents do. For a limb, the pole is the way the middle joint bends (§5). |
| `mirror` | `"x"`: a twin on the other side. The name must end in L or R (or L/R before digits: `hip1L`); the twin is the other (`hip1R`), at `x` flipped, turned the mirror way, under the parent's twin if it has one. |

## 4. Parts

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

## 5. A model that is a rig

| Field | Meaning |
| --- | --- |
| `rig` | The name it registers as. `studio/rigs.js` registers every listed model that names one (a rig written in code keeps its name; a model that doesn't validate is left out with its problems in the console). |
| `chains` | Its limbs, in the rig chain format (docs/studio.md §2): `{ "leg1L": { "root", "mid", "end", "pole", "lengths"?, "exact"?, "mirror"? } }`. `lengths` default to the joints' own. `mirror: "x"` makes the R limb from the L. |
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

## 6. A body that reacts

`body` is what `studio/motion.js` moves (docs/studio.md §10), in one of three forms:

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
rocks it, a grenade throws it and it rights itself, a kill goes limp and settles. A reacting spider
costs about 0.08 ms a frame warmed in Node (a shambler 0.04 to 0.05 here): more points, so more, and
still inside eight at once.

## 7. In code

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

## 8. Looking at a model

```
node studio/model-sheet.mjs --check prop/evac-boat my/draft.json    no browser: problems as sentences,
                                                                    cost against budget, joints, limbs
node studio/model-sheet.mjs prop/evac-boat                          the next version: review/model-evac-boat/vN/
node studio/model-sheet.mjs <model or draft.json> --out look.png    just the picture (a draft that isn't
                                                                    listed yet goes to Claude outputs/models/)
node studio/model-sheet.mjs --all                                   every model; unchanged ones are skipped
```

The sheet (`sheet.png`) is six views beside the scale marine (three-quarter with the joints named,
front, side, back, top, and night when it glows), the cost against the budget in green or red, the
materials, the notes, and under it a strip of the model's first clip. The version folder keeps
`model.json` as it was and `stats.json`; the asset folder has `meta.json` (kind `model`, its owner),
`notes.md` for Jerry and `index.html`, as for clips (docs/studio.md §5).

**The model lab**, `studio/model-lab.html?model=prop/evac-boat` (served by `tools/serve.mjs`), is
Jerry's bench for models: turn round it, toggle the joints, the triangles, night and the marine,
play its clips, and click a creature that has a body to hit it with the motion lab's weapons. His
note goes through `POST /__studio/note` with a picture of what he's looking at (asset
`model-<name>`, `meta.kind` `"model"`; the endpoint makes the folder the first time). Without the
endpoint the note shows, ready to paste into `notes.md`. `?file=studio/models/prop/new.json` opens a
draft that isn't listed yet, and `?mode=sheet` is the picture the sheet command saves.

## 9. The models today

| Model | What | Cost (budget) |
| --- | --- | --- |
| `prop/fuel-drum` | The wrecks' drum (P-43): the game's `buildBarrel` as data. | 2 draws, 328 triangles (2, 400) |
| `prop/evac-boat` | The boat for night 20 (P-52): a 5.7 m aluminium launch, centre console, a searchlight on a mast, running lights, outboard. A rig: `search`, `arrive`. | 20 draws, 2,958 (36, 4,000) |
| `creature/spider` | The spider zombie on eight limbs, with a skeleton, eight leg chains, a head that looks and a jaw, its body, and `crawl` and `idle`. | 30 draws, 2,636 (32, 3,200) |
| `creature/zombie` | `studio/zombie.js`'s shambler stand-in as data: the same joints, offsets and boxes, checked joint by joint. | 15 draws, 720 (24, 1,200) |

The spider's crawl: two sets of four limbs take turns, 0.3 m a step; in a scene give it
`"stride": 0.6` and its planted hands don't slide (`studio/scenes/spider-crawl.json`). The game's
spider today has six limbs; drop pair 2 or 3 in the file if Jerry wants six.

**Checking it:** `node --import ./studio/node-three.mjs --test "studio/*.test.mjs"`.
`model.test.mjs` checks that every model on disk is listed, valid and within budget, that bad
models give their problems as sentences, every shape, mirror, array and merge, that builds repeat
exactly, the zombie model against `studio/zombie.js` (joints, boxes, and a shell's reaction), the
spider's IK, crawl and scene, the boat's clips, and the spider's reactions.
