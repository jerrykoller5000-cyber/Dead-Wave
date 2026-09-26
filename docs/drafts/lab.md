# Draft: the motion lab, the studio's write door and check-labs (for docs/studio-guide.md §6, docs/studio.md §5 and §10)

The lab package of D-42's second round: the review loop, better for Jerry and for agents. It covers
contract (5), the lab's side of contracts (1) to (3) and (6), and a browser check for the lab pages.
The lead folds this into the docs. Nothing here changes the game.

## What changed, in one paragraph

The motion lab keeps the last six seconds of what the bodies did. Jerry can stop it, drag back
through it, step a frame at a time and play it again at any speed, with every event marked on the
bar. A second body can stand beside the first and take every hit at the same moment. Each hit is
drawn as an arrow. A note carries a picture of the screen. What happened can be saved as a scene
that an agent renders like any other. The server's note door takes a note for any review folder, not
only a motion preset's, and a scene. `studio/check-labs.mjs` clicks through the lab in headless
Chrome and fails on any page error or missing event.

---

# For Jerry (the new text for studio-guide.md §6)

## 6. The motion lab (how things react when they're hit)

1. Double-click `Open Motion Lab.bat` in the game folder. A page opens with a zombie standing on a
   green floor.
2. Pick a body at the top left: `zombie/shambler`, `zombie/feral`, `zombie/brute` or `marine/marine`.
3. Pick a weapon, then click the body where it hits. Or press **From the front**, **From the side** or
   **From behind**: the weapon hits the body where the crew's checks aim it (the chest; the shoulder
   for a brute's swing; the hips for a grenade; the head for a killing shot).
4. An arrow shows where the hit landed and which way it pushed. A longer arrow is a harder hit.
   The **power** slider under the weapons makes the weapon hit softer or harder (a quarter to three
   times): slide it until a stagger turns into a fall, and you know how close the body is to falling.
   Tick **Show its points** to see the body the way the physics sees it: white is where its points
   are, green is where its animation wants them.
5. **The bar at the bottom** holds the last six seconds. The marks on it are what happened: red is a
   hit, yellow a stagger step, purple a fall, blue getting up, green back to normal, grey dead.
   - Click or drag on the bar to stop at that moment and look at it. Turn the camera while it's
     stopped.
   - **Play** plays on from there. **Replay** plays from just before the hit.
   - **◀ frame** and **frame ▶** move one frame. The keyboard does the same: Space stops and plays,
     the arrow keys move a frame, R replays, L goes back to live.
   - The speed buttons (**1×**, **½×**, **¼×**, **⅒×**, or the slider, down to 0.05×) set how fast it
     plays. Slow motion looks smoothest in a replay.
   - **Live** goes back to the body as it is now.
6. **Compare** puts a second body beside the first. Every hit lands on both, the same way, at the same
   moment. Pick another body to see them side by side, or pick **B: the file's numbers, A: your
   sliders** to see your slider changes next to the preset as it is.
7. The **muscle** sliders change body A. You don't need to get numbers right: move one until it looks
   better, then say so in a note. The note records the slider for the agent.
   - **Reactions already approved** (once the crew has written down what you approved): **Check them**
     plays every approved hit on the body in a moment and shows a grid: a tick where it still does
     what you approved, a cross where it doesn't. With the sliders moved it checks the sliders too, so
     you can see if a change you like breaks something you already said was right.
8. **Again, the same way** stands the bodies up and hits them the same way again. **Stand up** resets
   them.
9. Write your note bottom right and press **Save note for the crew**. A picture of the screen goes
   with it: what you see, six small pictures of the reaction from the hit on, the bar, and a line
   saying what you did. Stop the bar on the moment you mean before you save, and the big picture is
   that moment. Untick the box to leave the picture out. Press
   **It's good** when a body reacts the way you want. The note goes on the crew panel with the body's
   owner (Grokbot for the zombies and the marine).
   - **Notes so far**, above the box, says where your notes on this body stand: waiting, being worked
     on, or answered with a new version to look at. Click it to read them and the answers.
   - The body's review folder has a page now (`review/motion-<body>/index.html`, the crew panel's
     "Open"): your notes with their pictures and the answers, newest first.
10. **Save as scene** keeps what just happened (the hits since the body last stood still) as a scene
    the crew can render frame by frame. Give it a name or leave the one it suggests.

If the page says "Couldn't save here", it was opened some other way than the .bat file. It copies the
note (and shows the picture to save) for you to paste into the file it names.

Two more appear once the crew's engine can do them: **Shift-drag** a body to hold it by the point
you grab and let go to drop it, and **Take a part off** (an arm, a leg or the head).

---

# For the agents

## The write door: POST /__studio/* (contract 5)

`tools/serve.mjs` hands every POST under `/__studio/` to `studio/notes-endpoint.mjs` (one line
changed in Cursor's file: the hook). It writes in two places only: `review/<asset>/` and
`studio/scenes/lab-<name>.json`.

| Route | Body | Does | Reply |
| --- | --- | --- | --- |
| `/__studio/note` | `{ asset, text, context?, snapshot?, meta? }` | Adds `## <date> · Jerry · <version> · lab` and the note at the top of `review/<asset>/notes.md` (under the stub's comment, above the notes already there). | `{ ok, asset, file, owner, version, created, picture? }` |
| `/__studio/note` | `{ preset: "zombie/shambler", text, context? }` | The lab's first form: asset `motion-<rig>-<name>`, meta read from `studio/motion/<rig>/<name>.json`. | as above |
| `/__studio/scene` | `{ name, json }` | Writes `studio/scenes/lab-<name>.json`, with `json.name` set to `lab-<name>`. | `{ ok, name, file, replaced, render }`: `render` is the command |
| `/__studio/notes` | `{ asset }` | Reads only: the folder's notes as `crew/notes.mjs` reads them, newest first (at most 20). A folder that isn't there is `exists: false`, not a 404, so a page can ask without an error in its console. | `{ ok, asset, exists, latest, owner, state, lookAt, page, notes: [{ date, who, version, text, state, answer }] }` |
| `/__studio/ping` | `{}` | Nothing. A page asks whether it can save. | `{ ok, routes, limits }` |

**Beyond the contract** (the lead keeps or drops them; each is one line to take out): the `notes`
route above, and the **folder page**. The crew panel links every review folder's `index.html` and
the notes stub tells Jerry to open it, but only the renderer writes one, and it never renders a lab's
folder, so a motion folder's "Open" led nowhere. A note on a folder whose `meta.kind` is `motion` or
`model` (or whose meta names a `motion`, as the first lab's folders do) now writes `index.html` too:
plain HTML, no script (it opens from the disk), the latest version big at the top, how to look at it
again (and a link to `meta.look` for when the lab is running), and every note with its picture, its
context and the answers, newest first, each with its state from `crew/notes.mjs`. It's written again
with each note. A page the renderer wrote (no `<!-- written by studio/notes-endpoint.mjs ... -->`
mark) is left as it is. The reply names it as `page`.

- **A new folder** (no `meta.json`) needs `meta`, with `meta.kind` `motion` or `model`. It gets
  `meta.json` (meta, with `asset` set and `owner` defaulted: grokbot for motion, claude for model),
  `latest.txt` (`v` + `meta.version`, or v1) and the `notes.md` stub (`crew/notes.mjs notesStub`).
- **A folder that has `meta.json`** takes the note as it is. The note's version is `latest.txt`'s. A
  note whose `meta.version` is newer (the owner bumped the preset and not the folder) moves
  `latest.txt` up to it, so the heading and the picture agree. It never moves it back.
- **snapshot**: `data:image/png;base64,...`, up to 3 MB of text, a real PNG. Saved as
  `review/<asset>/<version>/lab-<yyyymmdd-hhmmss>.png` (UTC; `-2` if two land in the same second) and
  named in the note as `![What the lab showed](v2/lab-....png)`, so it shows in any Markdown view.
- **Jerry's words** are kept, but a line can't start a heading or an answer (`#` and `>` at the start
  of a line go), and `<!--` / `-->` go, so a note can't hide the notes under it.
- **Refusals**, each a JSON `{ ok: false, error }` with a sentence:

| Code | When |
| --- | --- |
| 400 | Not JSON, not an object; a bad `asset` (2 to 64 of a-z, 0-9 and `-`, starting with a letter or digit) or a Windows device name (`con`, `prn`, `aux`, `nul`, `com1`, `lpt1`...); an empty note; `context` not text; a new folder without `meta`, or `meta.kind` not motion or model, `meta.owner` not an agent, `meta.version` not a whole number from 1; a snapshot that isn't a base64 PNG; a scene `name` outside `^[a-z0-9-]{1,40}$`, no `json`, `json.format` not `dw-scene/1`, no actors. |
| 403 | `review/<asset>` (or its version folder) leads outside `review/` through a link. |
| 404 | No such route; the old form's preset doesn't exist. |
| 409 | `review/<asset>` is a file; its `latest.txt` isn't a version like `v2` (fix it by hand). |
| 413 | The request is over its cap (note 3 MB + 64 KB, scene 1 MB); the note over 8,000 characters; `context` over 2,000; the snapshot over 3 MB; `meta` over 16 KB. |
| 500 | `meta.json` isn't JSON (fix it by hand); anything the disk refuses. |

A GET under `/__studio/` is served as a file like any other (so it's a 404). Tests:
`studio/notes-endpoint.test.mjs` (14) runs the real `tools/serve.mjs` from a copy in a temporary
folder (review/, studio/motion/, crew/notes.mjs) and exercises every route and every refusal, the old
form, a link out of `review/`, capped bodies with and without a length, the folder page (escaped,
newest first, never over the renderer's), the read route, and checks that nothing was written
anywhere else.

## The lab page (studio/motion-lab.html)

**URL**: `?preset=zombie/brute`, `&compare=file` or `&compare=<rig/name>`, `&weapon=<battery hit>`,
`&power=1.5` (0.25 to 3 times the weapon's), `&bones=1` (the overlay on), `&asset=<review folder>`
(where notes go; default `motion-<rig>-<name>`).

**Power.** The slider multiplies the weapon's power (log scale, 0.25× to 3×). A hit at another power
says so in its label ("Shotgun, 6 m at 1.40×"), in the note's context and in a saved scene (the
actual m/s), and the approved-reaction line on the readout only judges hits at the battery's power.

**The overlay** ("Show its points"): `LineSegments` over the rig, drawn on top, one for the body's
simulated points (`points()` while it reacts, else `animPoints()`) joined by its `bones`, one for
`animPoints()` (the muscles' targets). Recorded per frame with the pose (17 points, twice, as
Float32Array), so it's there in a replay, the strip and the picture.

**Weapons** are the battery's (contract 6): `rifle`, `shotgun-far`, `shotgun-close`, `machete`,
`brute-swing`, `grenade`, `kill`, with its powers and points. "From the front/side/behind" is the
battery's hit exactly (FROM front `[0, 0, -1]`, back `[0, 0, 1]`, side `[-1, 0, 0]` in the body's
frame). A click hits the point nearest the click, pushing along the camera's ray; the side it came
from is read from that push.

**What happened, and what's expected.** Each body's readout says the outcome of the run (the
battery's words: none, flinch, stagger, down, dead), its steps and how long until it was itself
again. When the preset has an `expect` entry for that hit from that side (contract 6), it says
"expected down ✓" or "✗", noting when the click wasn't at the battery's point or the sliders were
moved. The lab only reports it; `studio/motion-expect.js` is what checks it.

**The note's context** is one line: the preset and version; the first hit of the run (weapon, kind,
power, point, side) and what came of it; every slider moved, against the file's number; what stood
beside it and what came of that; parts taken off; and where the replay was when the picture was
taken. The picture is the canvas as drawn (at most 1280 wide); under it, for a note, a strip of six
moments from just before the first hit the recording holds to its end, each drawn from the
recording with one crop round the bodies (so the six compare) and labelled with its time from the hit
and each body's state; then the scrub bar and that line. 1280×936 from a 1280×720 window, about
120 to 350 KB. The words are drawn on a canvas of their own (see "Things found on the way").

**Timeline.** Every frame (at most every 1/120 s of lab time) records each body's joints and its
group, its arrow and hidden parts. Six seconds are kept. Replay interpolates between frames, so slow
motion is smooth. Lab time is the simulation's time: at ¼× live, six seconds of it is 24 real ones.

**Compare.** Body A at x −1, B at x +1, both facing +Z. A click on either hits both at the same body
point, from the same side of each body (turned with each body's facing, which a get-up changes).
"The file's numbers" is B with no sliders.

**Save as scene.** A run starts with a hit (or a part lost, or a hold) when every body is standing on
its animation; later hits join it. The scene has an actor per body (`a`, `b`): where it stood and
faced when the run began, its preset (the preset object with the sliders when they were moved), its
idle clip, and the hits at the times they landed, the first at 0.5 s (`kill` for a killing shot;
`lose` for parts taken off, which the engine package reads). It ends a second after the last body
was itself again, 2 to 20 s. The whole scene is the lab turned a quarter turn about the vertical, so
`tools/studio.mjs scene`'s side camera sees the bodies side by side facing it, as in
`zombie-reactions`. The physics doesn't care which way the floor faces: `check-labs` replays each
saved scene in Node and gets the lab's outcomes. Not saved: holds (a scene can't hold a body by the
mouse), and a zombie's build (a scene can only scale the rig, so a saved feral is the shambler build
at the feral's size; the reaction is the same body).

**Get-up clips (contract 1).** A preset's `getup.front` / `getup.back` clips are fetched with its
idle. On `['getup', { side, heading }]` with a clip for that side, the rig turns to `heading` and the
clip plays from its start at `clip.length / getup.time`, then fades back to standing over 0.3 s. A
new fall, death or hold stops it. With no data on the event, or no clip, the body blends back as
before. A named clip that's missing is a warning on the readout, not an error.

**Held and lost (contracts 2 and 3)**, shown only when the body has `hold` / `lose`. Shift-drag holds
the point nearest the grab (`body.hold(point, target)`, the target a Vector3 on the plane facing the
camera); letting go releases it. "Take a part off" calls `body.lose(part)` on every body and hides
the part's group (`body.parts[part].joint` from studio/bodies.js, else the shoulder, hip or head).

**Two things now match the game.** The lab takes on the body's drift (`if (body.awake)
group.position.add(body.drift)`, before `apply`), so a staggered or fallen body stays where it went
instead of sliding back. Zombies are built at the game's size for their type (feral 0.88, brute
1.38; `ZOMBIE_SCALES`, as in `studio/motion-battery.js`).

**The readout's last line** is the cost of a frame here: the bodies (animation, simulation, pose,
recording), the drawing, and fps.

**Reactions already approved (contract 6).** When body A's preset has an `expect` list, the lab shows
**Check them**. It imports `studio/motion-expect.js` (the report package's; it comes with those lists,
so a studio without it never requests the file and there's no 404) and runs `checkExpect` on the
file's numbers, and again on the sliders' preset object when they're moved, with the lab's own clips
for the get-ups (`clipOf` from the raw clip files it fetched). About 0.2 s for fifteen entries in
headless Chrome. It draws a grid (hit by side: what it got, ✓ or ✗; the approved outcome on hover)
and folds the `explain` sentences under "Why". The note's context then says "approved reactions: the
file 15 of 15, with the sliders 10 of 15". `lab.checkExpect()` returns the same numbers.

**Notes so far.** With the write door there, the lab asks `POST /__studio/notes` for body A's folder
when it builds and after each note, and shows one line (waiting for the owner; the owner is on it;
answered with vN, "which is what you see now" when the preset is at vN; approved) that opens to the
last eight notes with their answers and a link to the folder's page.

**window.lab**, for a script or the console:

```js
lab.ready; lab.state()      // mode, times, power, every body (state, outcome, events, get-up, arrow, preset),
                            // the recording, the run, last save and scene, notes so far, the note's context
await lab.setPreset('zombie/brute'); await lab.compare('file' | '<rig/name>' | '')
lab.setWeapon('grenade'); lab.setPower(1.5); lab.fire('front' | 'side' | 'back'); lab.again()
lab.lose('legL'); lab.slider('legs', 0.4); lab.showBones(true); await lab.checkExpect()
lab.advance(2)              // live time on in whole 1/60 s frames, without waiting for the screen
lab.pause(); lab.play(); lab.replay(0.25); lab.scrub(t); lab.stepFrames(-1); lab.live(); lab.setSpeed(0.5)
await lab.snapshot({ strip }) // the next frame as a PNG data URL, with the bar and the caption (and the strip)
await lab.note(text, { picture }); await lab.saveScene(name); lab.sceneJson(name)
lab.screenOf('A', 'chest'); lab.scrubAt(t); lab.jointY('A', 'head'); lab.cost
```

## Checking the labs: studio/check-labs.mjs

```
node studio/check-labs.mjs                every lab page (today: motion)
node studio/check-labs.mjs motion         the ones named
node studio/check-labs.mjs --shots <dir>  a screenshot after each step
node studio/check-labs.mjs --keep         leave the note's folder and the scene on disk to look at
node studio/check-labs.mjs --root <dir>   serve another checkout (a merge of the packages)
```

It serves the repo with `tools/serve.mjs`, opens the lab in headless Chrome (`tools/cdp.mjs`; CHROME
and CHROME_ARGS as for the tests) at 1280×720, and:

1. loads it, and the page reaches the write door (`/__studio/ping`) and reads its notes so far
   (none, for the check's own folder);
2. clicks the chest with a real mouse event: one hit, an arrow at it;
3. plays the reaction through: wake, hit, fall, down, getup, recovered, in order, judged "down";
4. get-up clips, when the preset names them: a side, a clip, a heading;
5. the timeline: about six seconds, the events on it in order;
6. drags the scrub bar with the mouse: paused at the right time, the head low while down and high
   before the hit (the recording holds real poses), one frame step is 1/60 s;
7. replays at ¼×, then plays at 2× to the end and stops there; back to live;
8. the picture: a PNG under 3 MB, 640 to 1280 wide, not blank;
9. a shift-drag holds a foot (held, then released), when the engine can hold;
10. a leg comes off (lost, then fall; the scene takes it off at 0.5 s), when the engine can take it;
11. compare with the brute: both hit at the same moment, both judged, both with arrows;
12. save as scene: the file, the render command, and the scene replayed in Node gives the lab's
    outcome for each body;
13. the file's numbers against the sliders: A carries them, B doesn't, and the context names them;
14. the approved reactions checked in the lab, when the preset has `expect`: the file's and the
    sliders' counts, and the context says them (it reports the counts; judging them is the report
    package's `motion-expect` test);
15. a note with a picture, typed and saved through the page's own button: notes.md holds one waiting
    note with the context and the picture's line, the PNG is there with the strip under the view,
    meta.json says motion, the folder
    page shows the note, and the lab's notes so far now say one, waiting;
16. no page errors and no console errors;
17. from a plain static server (POST answered 501, as python's is): it loads, knows it can't save,
    copies (or shows) the note and the scene, and writes nothing. It says how many frames the page
    had in a second.

A failed step prints what the page said last (its errors and console errors), and the last phase
names the call that didn't come back. Interrupted (Ctrl-C), it still deletes its folder and scene and
closes its Chrome.

The note's folder (`review/check-labs-<time>`) and the scene (`studio/scenes/lab-check-<time>.json`)
are deleted at the end. Exit 1 on any failure. It takes about 20 to 90 s; most of it is the replay
running at headless Chrome's frame rate.

**Adding the model lab**: one entry in `PAGES` (`model: { path, title, run }`), a `run(browser,
server)` that drives it through its own `window.lab`-style object, and the same `step()` and
`pageErrors()`. The note side needs nothing new: the write door takes `meta.kind: 'model'`.

## Things found on the way

- **Chrome adds noise to what's read back from a canvas that has had text drawn on it** (its
  fingerprinting guard; seen in HeadlessChrome 141). A picture with its caption drawn on the same
  canvas came back with every pixel off by a few levels and not quite opaque, which showed as bands
  on the ground. The lab draws the words on a canvas of their own and copies it over the frame; the
  picture is then the frame exactly (compared pixel by pixel).
- **Headless Chrome draws the lab at about 1 to 10 fps** (software GL). `lab.advance()` moves lab
  time in whole frames without waiting, so the check doesn't depend on it. On a busy box it can go a
  whole second with no frame at all, so a picture that no frame has taken after 1.5 s is drawn there
  and then, and a frame that throws still draws and hands over its pictures.
- **The clipboard can wait forever** on a permission nobody grants (headless Chrome, a window
  without the focus, a busy box). The copy fallback gives it 1.5 s, then shows the copy box. Before
  that, one check in four hung there.
- **`tools/studio.mjs scene` draws a lab scene's strip, but its video step times out headless** ("the
  scene video did not finish"), as the engine package also found. That's P-76, Cursor's.

## For studio/index.js

Nothing. The lab and check-labs are a page and a script; the endpoint is server-side (`node:fs`) and
`tools/serve.mjs` imports it directly. When the report package lands, the lab's `outcome()` and
check-labs' `outcome()` can import `classify` from `studio/motion-battery.js` instead of repeating it.

## For other owners

- **Cursor** (CU-47, P-76): `tools/serve.mjs`'s hook line now sends every POST under `/__studio/` to
  the module (`pathname.startsWith('/__studio/')`, with the pathname passed on). Please review it with
  the rest of the hook. The scene video step times out headless for lab scenes too.
- **The lead, docs/contracts.md (Reactions, last paragraph)**: the write door now writes
  `review/<asset>/` (a note, a picture, a new folder's meta.json, latest.txt and notes.md) and
  `studio/scenes/lab-<name>.json`, not only `review/motion-*`.
- **Antigravity** (P-77): `node studio/check-labs.mjs --shots qa/<folder>` leaves a screenshot of
  each step; the readout's last line is the frame's cost and fps on Jerry's GPU.

## Checking it

```
node --import ./studio/node-three.mjs --test "studio/*.test.mjs"     (52: the 38 before and the endpoint's 14)
node --test crew/notes.test.mjs
CHROME=... CHROME_ARGS=... node studio/check-labs.mjs
```
