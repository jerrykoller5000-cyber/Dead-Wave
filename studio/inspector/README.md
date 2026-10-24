# The inspector (CL-196, hardened in GP-19919)

A studio for reviewing the live game's models and animations. Jerry and the agents use the same page and public API.
The catalog currently has 116 subjects and 182 model/variant cases; it covers the marine, zombies, weapons, wildlife,
people, build tiers and selected props. Coverage is curated: the exclusions below still need real-game scene checks.

**Open it:** double-click `Open Marine Inspector.bat` in the game folder, or serve the folder (`node tools/serve.mjs`)
and open `http://127.0.0.1:<port>/index.html?inspect`. Add `=<subject>` to start on one:
`index.html?inspect=zombie.brute`, `index.html?inspect=build.wall&variant=3`.

After a change to the game's code, press **F5**: the page reloads the game and comes back to the same subject (the
address keeps it: `?inspect=<subject>&variant=<variant>`).

It is the game itself: `index.html?inspect` boots it without the intro or the warm-up,
walks the marine into the Training Ground, hides the room behind a studio backdrop and gives the camera, the clock and
the input to the inspector. Models use their game builders; marine moves send input to the real game. A change appears
after reloading. Move recipes, catalog entries and environment assumptions still need checks when the game changes.

## Using it

| | |
|---|---|
| **Mouse** | drag: round the subject · right-drag or shift-drag: slide · wheel: closer / further (ctrl: faster) · double-click: orbit round that spot |
| **Space** | play / pause the game |
| **, .** | one frame back / forward (shift: ten). Back walks the **rewind**: the last few seconds, exactly as the game posed them |
| **- =** | slower / faster (0.05x to 2x). The whole game slows, the aim and the moves' timing too |
| **[ ]** | previous / next move (the marine) or subject; shift+[ ]: previous / next subject |
| **1 – 7** | views. The marine: full, three-quarter, head, torso, hands, back, boots (AG-75's bookmarks). Anything else: three-quarter, front, left, back, right, top, low |
| **F · 0** | frame the subject from where the camera is · back to the first view |
| **Arrows, PgUp / PgDn** | round, up and down · closer, further |
| **B J X W G** | bounds with the size in metres · joints · axes · wireframe · grid |
| **T** | turntable (models) |
| **P** | drive the marine yourself, with the game's keys and mouse. Esc gives the camera back |
| **S · shift+S** | save a picture · a turnaround sheet (8 views), to your downloads |
| **N** | write a note for the subject's owner (below) |
| **H · ?** | hide the panels · the keys |
| **M** | sound on / off |

**Left:** every subject, grouped (Marine, Zombies, Weapons, Animals & people, Props & vehicles), with a search.
**Right:** what it is, where its builder lives, its numbers (triangles, meshes, materials, size), its own switches,
the view (backdrop, light, overlays, lens) and a note box. **Bottom:** the clock, the views, pictures, Drive, sound.

### The marine
- **Moves**: every move is the player's input (a key pressed or held, a mouse button) sent to the game's own handlers,
  so a reload is the game's reload and a dive is the game's dive. Walking and running are on a treadmill: he moves, the
  game moves him, the inspector puts him back on the stage. *Loop the move* replays it every few seconds.
  **Stop / clear holds** cancels pending inputs, releases holds and cleans up inspector-created mounts, carried weapons,
  replacement props, placement ghosts and the knockout/bed-exit state.
- **Kit**: any gun, unarmed, akimbo, the blade (knife, machete, katana), the armory's mods for the gun in his hands
  (bought with the Training Ground's cash and fitted by the armory's own code), gear (helmet, vest, pads, NVG, laser,
  flashlight) and presets (issue, full kit, hot weather, night ops).
- **Wardrobe**: the CIF's own choices (camo, cap, eyewear, sleeves, trousers, gloves, boots, the insulated boots'
  rubber, hair, eyes, skin, the gun's finish). Nothing is saved: the Training Ground keeps its hands off the save.
- **Holds**: the game's own holds, which pin a move at a point (0 to 1): the walk and run cycle, the reload, the blade
  swing, the draw, the grenade's phases.
- **Close-up views**: head, torso, hands, back and boots follow the live joints as the pose changes. **Frame (F)** fits
  the actual posed marine from the current angle, including a dive, vault or ground pose.

### Zombies
*Live* (spawned and run by the game, going for the marine), *Walking* (live, and the marine keeps stepping away so it
keeps walking), *Rising* (clawing up out of the floor), *Statue* (the body at rest). Probe a hit on the body, head or
the legs, kill it, take an arm, a leg or the head off, respawn it. Godmode is on: it can hit the marine, nothing comes
of it. These buttons inject damage/reaction metadata; use the real range or combat checks to assess projectile accuracy.

### Time and the rewind
Pause, slow motion and a step are the game's own clock (the tick asks the inspector's clock first), so everything
slows together. While it plays, the subject's whole rig is recorded every frame (the last several seconds); paused, the
scrubber and `,` restore the recorded transforms, hierarchy and visibility. Play first returns to the newest frame,
then continues the simulation. This is visual pose history, not time travel: AI, ammunition, particles, shader/material
state and arbitrary geometry buffers are not rewound. Cloth that recomputes from joint transforms before drawing follows
the restored pose. Adding/removing rig nodes resets history; reparenting the same nodes preserves it.

### Notes for the owner
Write it in the note box and save (ctrl+Enter). It goes to `review/inspect-<subject>/notes.md`, with a picture of the
view beside it and where it was (the move, the speed, the camera). The folder's `meta.json` names the subject's owner,
so `node crew/crew.mjs` shows the note as waiting for them, like any review note (docs/studio.md §5), and they answer
under it (`node crew/crew.mjs review answer inspect-<subject> <agent> "<what changed>"`). Through a server without the
endpoint (serve.py), the note is copied to the clipboard instead.

## For agents

**In the page:** `window.DWInspect` (`DWInspect.help()`), ready when `DWInspect.ready`.

```js
DWInspect.list('zombie')                          // [{ id, name, group, kind, owner, source, variants }]
await DWInspect.show('zombie.brute', { mode: 'statue' })   // { id, center, size, yaw, info: { tris, meshes, materials } }
await DWInspect.show('build.wall', { variant: '3' })       // a tier, a fish kind, a cave design...
DWInspect.view('three')                          // or DWInspect.view({ yaw: 30, pitch: 10, dist: 4 })
DWInspect.pause(); DWInspect.step(5); DWInspect.speed(0.25); DWInspect.scrub(20)   // 20 frames back
await DWInspect.marine.play('reload-m4'); DWInspect.marine.weapon('ak'); DWInspect.marine.fit('suppressor', true)
DWInspect.marine.hold('reload', 0.4)              // the game's own hold, at 40 % of the reload
DWInspect.zombie.hit('head'); DWInspect.zombie.lose('armL')
await DWInspect.shot()                            // a data URL of the view
await DWInspect.check()                           // every model variant: [{ id, variant, mode, ok, ms, tris, size, error }]
await DWInspect.contactSheet({ only: 'weapon.' }) // every subject (or some) on one picture, the broken ones in red
await DWInspect.note('the left boot sinks into the floor')   // a note (and a picture) for the owner
```

**From a shell:** the camera (`tools/CAMERA.md`) has an inspector mode.

```
node tools/camera.mjs start --inspect                       # keep the inspector loaded (a real-GPU window, off screen)
node tools/camera.mjs shot zombie.brute:statue --view three --out review/my-task/brute.png
node tools/camera.mjs turnaround weapon.m4 --n 8 --out review/my-task/m4/
node tools/camera.mjs check --out review/inspector/          # every subject built: sheet.jpg + check.json, broken ones listed
node tools/camera.mjs check zombie. --out review/z/          # only some
node tools/camera.mjs eval "await DWInspect.marine.play('slow-time'); await new Promise(r => setTimeout(r, 600)); return DWInspect.marine.state()"
```

The camera's old targets work in the inspector too (`weapon:m4`, `build:wall:2`, `zombie:brute`, `survivor:pike`,
`marine`, `player`), mapped onto the catalog. **Without a shell** (the inbox, `review/camera/jobs/`): a job
`{"cmd":"reload","mode":"inspect"}` switches a running camera into the inspector, then `{"cmd":"check"}` or any shot job.

## Changing it

**A new model:** add an entry to `catalog.js` in the list for its group (the comment at the top says what an entry
has). If its builder is an ES module, import it in `build`. If it lives only inside `index.html`, add it to
`inspectHost().builders` there (one line, `name: fn(() => makeIt)`), then call it as `c.B.name`. Run the check
(`DWInspect.check({ only: 'its.id' })`): it builds it, measures it and says if it is broken or empty.

```js
{ id: 'prop.lantern', name: 'Lantern', group: 'Props & vehicles', owner: 'claude', source: 'world/lantern.js: buildLantern',
  build: async (c) => (await import('../../world/lantern.js')).buildLantern(c.THREE),
  tick: (root, dt, t) => { root.userData.flame.scale.y = 1 + 0.1 * Math.sin(t * 9); } }   // only if the game moves it
```

Zombie types, held guns, skull variants, fish and cave designs come from the game's tables. Build tiers derive from
UPGRADE_TRACKS for the curated BUILD_KINDS list; a new build kind still needs an entry. A new gun also needs its builder
in inspectHost().builders.guns. IDs must remain unique and stable; duplicates now fail rather than silently changing IDs.

**A new move for the marine:** add it to `MOVES` in `marine.js` as the player would do it (`keys` to hold, or `run` with
`d.press('KeyX')`, `d.holdKey(...)`, `d.weapon(...)`, the game's debug hooks on `window.TT`). Never pose him by hand.

**A backdrop, a light, an overlay:** `BACKDROPS`, `LIGHTS` and the overlay flags in `stage.js`. The light is the game's
own sun (with its shadows), sky light and fill, re-aimed just before each draw: no light is ever added, so nothing
recompiles.

**When the game changes:** a builder renamed or removed comes back `null` from `inspectHost()` and its subject is red in
the list and in the check, with the reason. The check is the thing to run after a change to a model.

## What is where

| File | |
|---|---|
| `inspector.js` | boot (into the Training Ground, onto the stage), the frame, the keyboard, the clock's hooks |
| `catalog.js` | every subject |
| `subjects.js` | the marine, a zombie, a model, on the stage |
| `stage.js` | the backdrop and floor, the light presets, the overlays, measuring |
| `orbit.js` | the camera and its views |
| `timeline.js` | the clock and the rewind |
| `marine.js` | his kit and moves |
| `ui.js`, `inspector.css` | the panels |
| `api.js` | `window.DWInspect` |
| `index.html` (CL-196) | `INSPECT` (`?inspect`), `inspectHost()` (the builders and a few hooks), the clock's two questions and the last-word frame in `tick()`, the boot without the warm-up |
| `studio/notes-endpoint.mjs` | `POST /__inspect/note` (wired in `tools/serve.mjs`) |
| `tools/camera.mjs`, `tools/camera-rig.js` | `--inspect`, `check`, inspector targets |

Owner: Claude (studio/*). The first inspector, AG-75's `tools/marine-inspector.html`, is kept as it was; it rebuilt
the marine from copies of the game's code, which drift (studio/inspector/AUDIT.md, CL-196).

## Not in here (yet)

- Places (the HQ, the caves, the tower): the camera's `place:` targets in its title mode show them.
- Moves that need the valley: ladders (the watchtower, the mast, the HQ wall), the campfire kneel, the burial crew,
  the parachute insertion. The Training Ground has none of them.
- Effects outside the rig are not rewound (casings, magazines, blood, smoke).

## Reliable review workflow (1.1)

Double-click the same BAT as before. Node 22 or newer is required. The launcher reuses a server only when its checkout
identity and loaded server-code fingerprint match; another application on port 8975 is preserved and a free port is used.
It waits for readiness and reports the log path on failure. Background server and camera session files are specific to
this checkout. Static files stream in bounded chunks and support byte ranges, so media requests cannot monopolize startup.

Choose the subject, then its variant/mode, kit and move. **Stop** releases held inputs, pending move sequences and animation
holds. **Stand him on the stage** also clears the old dive and jump. **Save setup / Load setup** in View share a JSON recipe
with subject, kit, camera, backdrop, lighting, overlays and clock settings. A loaded move starts again; it is not a saved
airborne frame. F5 keeps subject/variant and existing URL options; use a setup file to retain the rest of the review.

Pictures and turnaround sheets pause the pose for capture. Sheets restore the prior view and play state, so eight angles
show one pose rather than eight different animation frames. Checks restore the previous selection, variant, mode, kit,
holds and view; an active move restarts. They use statue zombies for deterministic geometry coverage. Check live/walk/rise
and reactions separately. Geometry smoke checks cannot judge anatomy, texture quality or animation continuity.

External browser pictures draw the selected subject, wait for GPU completion and temporarily display a bounded 2D copy
of those pixels beneath the inspector panels. Resume, failure and cancellation remove it. Camera viewport changes run the
game's resize handler and verify the renderer size before capture. This prevents an old GPU surface or old window dimensions
from appearing under a newly updated subject panel. Viewports are 64–8192 pixels per dimension, with at most 32 million pixels.

Live bookmarks follow the newly staged actor after a setup is restored, so their world coordinates can recenter with its
fresh pose. Use `DWInspect.camera(DWInspect.camera())` to pin the current world camera before saving when an absolute view is
required. Named head/hands/torso bookmarks keep their relationship to the live joints instead.

An operation label and **Cancel / Esc** remain available during batch work. Stage changes are exclusive while a check,
sheet, note or restore owns the stage. Exit Drive with Esc before starting a capture/batch. Corrupt browser settings fall
back safely. Invalid API parameters fail before allocating large sheets or changing a valid setup. Runtime errors are
bounded and available through `DWInspect.errors()`; startup errors appear on screen and in `window.DWInspectError`.

### Agent contract and repeatable shots

Use the public API, not `_ix`. Discover `DWInspect.apiVersion === 1`, `DWInspect.capabilities()`, `list()` and
`marine.moves()` after `ready`. IDs returned by `list()` are canonical. `step(n)` queues frames; **await `stepAsync(n)`**
when the next command must see the finished pose. Positive steps are 1/60 inspector seconds; the game's own bullet-time
systems may slow their simulation further. `still(true)` holds one rendered frame for an external capture; a later
frame-dependent API command resumes the loop automatically. Always call `still(false)` in a finally block.

```js
await DWInspect.show('marine');
DWInspect.marine.weapon('m4');
await DWInspect.marine.play('reload-m4', { loop: false });
DWInspect.marine.hold('reload', 0.4);
DWInspect.pause();
await DWInspect.stepAsync(1);
const recipe = DWInspect.session();
const image = await DWInspect.shot();
// Later, after changing code and reloading:
await DWInspect.restore(recipe);
await DWInspect.note('Reload at 40%: check the support hand.');
```

Standalone model controls use stable IDs returned by the API; recipes keep these switches and the turntable angle too.

```js
await DWInspect.show('weapon.m4');
DWInspect.model.controls();                       // descriptors with id, type, options and current value
DWInspect.model.set('suppressor', true);
DWInspect.model.turntable(0.4);                    // radians/second; 0 stops it
DWInspect.pause();
DWInspect.model.yaw(Math.PI / 4);                 // radians, -PI to PI
const setup = DWInspect.session();
await DWInspect.restore(setup);
```

Only toggle/select controls are restored; recipes cannot run action buttons. Marine gear and attached gun mods use
`marine.gear()` / `marine.fit()`, while standalone weapon switches use `model.set()`. Their IDs are discovered separately.

Recipes use `schema: 'dw-inspector-session'`, `schemaVersion: 1`, and `inspectorVersion`. Camera PNG sidecars use
`schema: 'dw-camera-shot'`, `schemaVersion: 2`, and include the recipe under `inspect`. The PNG, thumbnail and sidecar
describe the same held frame. Recipe restoration is setup reproduction; ammunition, AI, random effects and elapsed move
phase are not a deterministic simulation replay. Use explicit phase holds for a matching pose where available.

```text
node tools/camera.mjs start --inspect
node tools/camera.mjs check weapon. --out review/my-task/weapons
node tools/camera.mjs eval "await DWInspect.show('marine'); await DWInspect.marine.play('walk', {loop:false}); return DWInspect.marine.state()"
node tools/camera.mjs shot marine --view three --out review/my-task/walk.png
node tools/camera.mjs shot --from review/my-task/walk.json --out review/my-task/walk-after.png
```

A shot of the current subject preserves its active move. Add `--reset` to rebuild it explicitly. A different subject,
variant or mode still stages a new object. Old camera-only sidecars remain usable. Failed check/batch/shot commands exit
nonzero; inspect `{ok:false}`, `error` and every result rather than treating file creation as a pass. An unmatched check
filter is an error. `check({variants:false})` opts into one variant per subject; default checks cover all 182 current cases.

For agents without a shell, use unique JSON job names in `review/camera/jobs/`, then read the matching `.result.json`.
Write a complete temporary file before exposing the final `.json` filename. The shared camera serializes jobs; an implicit
`move` can inherit another agent's last view, so use explicit targets/recipes. Reload jobs select `mode:'inspect'`.
HTTP jobs require local JSON requests; cross-origin browser requests and oversized payloads are rejected.

### Extending without drift

- Keep builders and motion in their original game modules. Catalog entries adapt the real builder; moves describe input,
  not copied joint rotations. Use `d.wait()` for game-clock timing; it is cancellable when another move is chosen.
- Preserve stable IDs, valid variants, owner and source metadata. Run the subject's variants, view its sheet, then check
  affected live modes and moves. A successful mesh/bounds check alone is not visual approval.
- Mark deliberately cached/shared geometry or material with `userData.shared = true`. Borrowed resources from the game
  scene, detached weapon roots and weapon context are protected; new subject resources are disposed on switching.
  A hidden cache inside an opaque builder closure cannot be inferred automatically. Do not dispose another subsystem's cache.
- Additive API changes keep API/session versions compatible; incompatible recipe changes need a schema-version bump and
  migration or a clear rejection. Preserve existing callers and document the shape in this guide.
- Measurements and triangle statistics follow the main camera's layers. Shadow-only merged rigs stay in the game for
  rendering shadows; measuring their skinned vertices duplicated the visible marine and caused expensive CPU work.
  Preserve the camera-layer filter when adding merged rigs. The small explicit-render adapter in inspectHost must be
  rechecked when the pinned Three renderer changes; the capture parity scripts check actual pixels as well as metadata.
- Keep environment-dependent checks in actual game scenes. Door/window build modifiers, world places and valley actions
  are not covered by the current studio catalog. This is a coverage boundary, not proof those models or moves work.

Audit findings and proof: `review/inspector-audit-GP19919/AUDIT.md`. Focused tests live beside that report; the normal
behavior suite keeps its original assertions. The legacy copied inspector remains a reference, not the authoritative tool.

Run `node review/inspector-audit-GP19919/verify.mjs` after changing inspector infrastructure. It records focused regression
results in `focused.json` and `focused.log`; it does not replace `npm test` or real GPU review. The native `native-audit.mjs`,
`motion-audit.mjs` and `advanced-audit.mjs` scripts beside it open their own inspector and close only their own browser/server.
They write screenshots and structured results. The 48-move smoke pass checks execution and finite transforms; watch the moves
to judge contacts, anatomy and continuity. An agent can automate inspection, but building a model successfully is not visual approval.
