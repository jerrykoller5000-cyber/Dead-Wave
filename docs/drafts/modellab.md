# The model lab and the model sheet

A draft for `docs/studio.md` (after "Models as data", docs/drafts/model.md) and for Jerry's guide
(`docs/studio-guide.md`). Claude's. The code is `studio/model-lab.html`, `studio/model-look.js` and
`studio/render-sheet.mjs`; the check is `studio/check-model-lab.mjs`.

A model is a file of shapes (docs/drafts/model.md). This is how Jerry looks at one and says what he
thinks, and how an agent sees it without a screen: the lab is a page Jerry turns round a model in, and
the sheet is one picture of it from every side that an agent reads. Both draw the model with the same
`buildModel` the game uses.

---

## For Jerry

**Open it.** Double-click `Open Model Lab.bat` in the game folder. Pick a model at the top left.

**Look at it.**
- Drag to turn round it. The wheel zooms. Drag with the right button to slide.
- **Turntable** turns it for you.
- **Look from**: *front*, *side*, *back* and *top* show it straight on, with a ruler in metres up the
  left. *¾ front* and *¾ back* are the way an eye sees it.
- The grey figure beside it is exactly **1.75 m** tall. The box under it can show the marine instead
  (the studio's marine is 1.56 m to the top of his cap).
- **Grid** is a metre grid on the ground.

**Light.** *Day* is the game's noon. *Night* is the game at night with the goggles up: very dark, on
purpose. *Night vision* is the game's green, goggles down.

**Parts.** The list on the left is every part in the file. Click one and it lights up orange on the
model, every copy of it. Hold **Shift** and click the model to find which part something is. Click a
colour under *Materials* to light up everything made of it. *Joints* shows the skeleton: yellow dots
where parts hang, blue dots where the game hangs a light or a flame. *Joint names* names them.
**Parts in colour, numbered** paints every part its own colour with its number, the same number as in
the list: say "part 12 is too long" and whoever reads your note knows exactly which.

**A creature with a body** (the spider, the zombie): pick a weapon and click where it hits.
*Stand it up* puts it back. *Lose a limb* takes an arm, a leg or the head off.

**Your note.** Write it in the box on the right and press **Save note for the crew**. It goes into
`review\model-<name>\notes.md` with a picture of exactly what you're looking at, and the model's
owner answers there. **It's good** says it's approved. If the lab can't save (it was opened some other
way), it shows the note and copies it: paste it at the top of `notes.md`, under the box.

Your notes so far are under the box, each with its picture. *see what was looked at* opens the lab
the way it was when you wrote it.

**While an agent works on a model**, keep the lab open: it changes by itself a second or two after
the file is saved. When the file has changed since the version in the review folder, the lab says
so, and **Show v1 as a ghost** draws the old one over the new in blue lines.

**The review folder.** `review\model-<name>\index.html` shows the latest sheet beside the one before,
what changed between them, and the notes. Write in `notes.md` there as for any animation.

Keys: `1`-`6` the views, `F` fit, `T` turntable, `W` wireframe, `J` joints, `N` names, `P` parts in colour, `G` grid,
`L` the next light, `Esc` clear the pick.

---

## For agents

### Looking at a model as pictures

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

On the cloud box set `CHROME` and `CHROME_ARGS=--no-sandbox`, as for the tests. A sheet takes 4 to 6
seconds. It loads the studio and three.js, never the game.

**The sheet** (`sheet.png`, 1600 wide) reads top to bottom:
- The asset and its version, the cost against the budget as bars (red over), the size (width ×
  height × depth, and from how far below the ground to how high), the materials, the file's notes.
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
  "namesHidden": ["chest", "foot4L"], "renderSeconds": 4.4 }
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

### The lab's address

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

### The note (contract 5)

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

On this branch the write door is still the first lab's, which takes only motion presets, so model
notes are copied; with contract 5's endpoint (the lab package) they save, picture and all. Both are
checked.

### window.lab

The live lab can be driven from outside (studio/check-model-lab.mjs; studio/check-labs.mjs can take it
as `PAGES.model`): `ready`, `frames`, `state()` (the model, its cost and bounds, the settings, the
pick, the review folder, the body, the note's context and `look`), `setModel(ref)`, `setLight(mode)`,
`toggle(name, on)`, `setFigure(f)`, `view(key)`, `pick(i)`, `pickMaterial(name)`, `screenOfPart(i)`,
`partAtScreen(x, y)`, `lose(limb, on)`, `snapshot()`, `note(text, { picture })`, `ping()`,
`readReview()`, `watch()` (read the file now), `ghost(on)`, `nextFrame()`.

### In code: studio/model-look.js

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
| `modelNote({ json, ref, text, ... })`, `noteBlock(...)`, `ASSET_NAME` | The note's body (contract 5) and the block to paste. |
| `readLabQuery(params)`, `labQuery(state)`, `FIGURES` | The lab's address, both ways. |

### Checking it

```
node --import ./studio/node-three.mjs --test "studio/*.test.mjs"      model-look.test.mjs (12) and
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

### Found while making it

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
- The studio's marine is 1.56 m to the top of his cap (the game's about 1.62 m), not the 1.75 m
  docs/studio.md §6 says; the sheet and the lab have their own 1.75 m figure.
- The zombie model's feet are 0.26 m under the ground, as the game's are (P-73): its elevations
  show the boots under the ground line against the ruler, which is the screenshot P-73 asks for.

### For the lead

- Add to `studio/index.js`: from `./model-look.js`, `SHEET_VIEWS`, `VIEW`, `fitOrtho`,
  `fitPerspective`, `orthoScale`, `figureSpot`, `SCALE_FIGURE`, `buildFigure`, `LIGHTS`, `applyLight`,
  `NVG_FILTER`, `partRows`, `partOverlay`, `partAt`, `modelDiff`, `modelNote`, `readLabQuery`,
  `labQuery`; from `./render-sheet.mjs` (Node only, so not in index.js): `renderSheet`, `planVersion`,
  `writeReviewPage`.
- docs/studio.md §6: "the scale marine (1.75 m)" is 1.56 m.
- docs/drafts/model.md §8 says `model-sheet.mjs <model>` makes "the next version": it's now
  render-sheet's rule (the file's `"version"`), and `?mode=sheet` still works beside `?sheet=1`.
- studio/check-labs.mjs (the lab package) has a place for the model lab: `PAGES.model` can call the
  checks in check-model-lab.mjs, which drive the same kind of `window.lab`.
