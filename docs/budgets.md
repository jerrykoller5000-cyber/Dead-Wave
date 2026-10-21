# Frame budgets (1.0)

Claude, 2026-10-15 (CL-203). The road to 1.0 needs 60 fps on Jerry's PC at the High preset on the busiest night.
A week of model upgrades made every subject heavier; these budgets say how much each owner gets. Numbers are
`renderer.info` (draw calls and triangles per frame, the shadow pass included) and the inspector's own counts
(`DWInspect.show(id).info`). Frame time comes from Jerry's GPU (AG-82, Cursor's `bench.mjs --night N`, CU-148); the
cloud's software renderer can count but not time.

## The whole frame

| Scene | Budget | Measured 2026-10-15 |
| --- | --- | --- |
| A prep day at the HQ (the world alone) | ≤ 650 draws, ≤ 800 k triangles | 649 draws, 759 k |
| A night (5, 10, 14, 18, 20), about 15-20 dead out | ≤ 700 draws, ≤ 900 k | 530-710 draws, 740-770 k |
| 48 dead (the cap, MAX_ZOMBIES) | ≤ 800 draws, **≤ 1.2 M** | 784 draws, **1.68 M** |
| A 100-piece base and 48 dead | ≤ 1 000 draws, ≤ 1.5 M | (665 pieces and 87 dead: 1 784 draws, 2.0 M) |
| Frame time, Jerry's GPU, High, night 20 | 60 fps mean, ≥ 50 fps 1 % low | **55.9 fps median, 29.6 low; tick 14.3 ms** (AG-97, 10-20 01:27Z); was 49.9 (AG-91), 44.8 (21:08Z) and 32.5 before CL-211; night 10 45.4; the megaswarm 60.0; **day 5 59.5 fps, 43.6 low** (AG-94) |

The world is holding (CL-117 measured 561 draws and 770 k at the HQ on 10-02). What grew is what there are many of:
the dead (each now 10-17 k triangles, drawn twice with its shadow) and the marine and his survivors.

## Each subject

| Subject (owner) | Budget | Measured | Over? |
| --- | --- | --- | --- |
| A zombie, the common kinds (ChatGPT's look) | ≤ 6 k triangles, ≤ 4 draws | shambler 10.4 k, leaper 10.9 k, spitter 12.0 k, screamer 12.5 k, drowned 12.5 k, demon 14.2 k, brute 15.0 k, military 17.4 k, bomber 17.5 k; 3-6 draws | **yes, all** |
| A boss (guardian, colossus, caveguard) | ≤ 14 k, ≤ 6 draws | 16.1-20.4 k | **yes** |
| The marine in the game (Claude) | ≤ 40 draws, ≤ 40 k | 100 draws, 38 k; **since CL-210 (10-18): 32 meshes on him and 20 on the guns he carries, 38 k** | no (his guns are in the gun row) |
| A survivor on the roof (Claude) | ≤ 20 draws, ≤ 15 k | 92-127 draws, 40-42 k; **since CL-210: 13-16 meshes, 40-42 k** | **triangles** |
| A held gun (Grokbot) | ≤ 12 draws, ≤ 8 k | m240 11.4 k, flamer 10.5 k (18 draws), minigun 9.6 k (16), sniper 9.3 k (16), aa12 8.8 k, m4 8.3 k; katana 64 draws, sheathed 83, chainsaw 33 | **some** |
| A build piece, placed (Antigravity's look) | ≤ 2 draws, ≤ 1.5 k in the game | about 1.6 draws, 1.05 k each (a 665-piece base); sandbag tier 2 is 6.2 k | **sandbag 2** |
| Cinematic only (Heron 25 k, the cargo plane 36 k, the church 24 k) | no budget: one at a time, briefly | | |

## How to stay inside

- Count before and after any model change: `await DWInspect.show('<id>')` returns `info.tris` and `info.meshes`. Put
  both numbers in the report.
- Fewer segments where nobody looks closely: a zombie is never seen nearer than a metre or two, and mostly at 10-30 m.
  A round profile of 8-10 sides reads the same as 16 at that distance.
- One mesh per material: merge rigid parts (`mergeRigidMeshes`, `mergeStatic`, `world/bake.js`); every separate mesh is
  a draw, and another in the shadow pass.
- New detail must pay for itself: if a change adds triangles, it takes them out somewhere else in the same subject.

## CL-210: the marine and the survivors (2026-10-18)

Each joint group of the marine was its own set of meshes, one per material: 76 on a fresh marine and about 100 in
the game. `studio/marine-skin.js` bakes his rigid parts into a few SkinnedMeshes whose bones are the joint groups the
pose code already turns, as CL-138 did for the dead. The plain parts go into one mesh, with their colour, roughness and
metalness per vertex. The camo and detail-mapped parts get one mesh per material. Nothing else in the game has to know:
the source meshes stay in place and keep their own `visible`; they are only taken off the render layers. A changed part
bakes him again on the next frame, and a part that keeps changing is handed back to draw itself.

| | Before | After |
| --- | --- | --- |
| A fresh marine (the inspector) | 76 meshes | 25 |
| The marine at the HQ in a prep day | about 100 | 52: 32 on him, 20 on the guns he carries (the gun row's budget) |
| Okafor, Brandt, Pike | 101, 127, about 100 | 14, 16, 13 |
| The HQ frame, a prep day | 649 draws (10-15) | 565-607 draws (10-18, in the cloud) |

Still drawn on their own:

- The player's live cloth (sleeves, trouser legs, seat, waist), because it bends every frame.
- The eyes, the hair fade (it is see-through) and the PGB patch.
- The gloved hands: the grip pose changes them, so they were handed back.
- Every gun, which comes and goes with what he owns and holds.

The survivors also merge parts that share textures (their cap, pack and carrier). Their cloth is baked too while they
stand still. To see the old way, add `?rigskin=0` to the URL.

The survivors' triangles are unchanged (40-42 k against 15 k). That needs a lighter build of the figure (fewer rings
on the cloth, a simpler rifle). Three survivors are about 125 k, under a tenth of a night's frame, so it waits for 1.x.

## 2026-10-19: draw calls are not what holds the nights (CL-211)

Antigravity's two runs on Jerry's RTX 5080 (AG-82 before CL-210 and AG-84, AG-85 after; `bench.mjs --night N`, the
last push, 48 dead out, High):

| | Draws | Triangles | Frame |
| --- | --- | --- | --- |
| Nights 5-20, before | 549-640 | 738-951 k | 28.4-31.7 ms (31.5-35.2 fps) |
| Nights 5-20, after | 476-602 | 735-989 k | 28.8-31.3 ms (31.9-34.7 fps) |
| Megaswarm, 48 shamblers at the title (AG-82) | 342-470 | 508-559 k | 19.1-20.4 ms |
| Megaswarm, AG-85's own lines (64-65 dead) | 730-760 | 1.72-1.73 M | 39.2-42.2 ms |

- **Within a night the frame barely changes with draws:** night 18 at 476 draws takes as long as night 10 at 634.
  Taking 32-120 draws off did not move any night. Something else sets a floor of about 29 ms at night that the title
  scene does not have: the 48 dead's own work on the CPU (their AI, the director, the pathing), the night's lights and
  effects, or the GPU's fill. That is what CU-156's `--prof` and AG-86 answer.
- **The title scene does follow its load** (19 ms at 342 draws and 0.5 M triangles, 42 ms at 730 and 1.7 M), so
  triangles and draws still count when they are large; GB-189 and GP-19930 go on.
- AG-85's report quotes AG-82's megaswarm (52-54 fps); its own runs counted 64-65 dead and 24-26 fps. CU-156 finds out
  why the scenario changed.
- The budgets above stay until the profile is in; CL-211 resets them from it.

## 2026-10-19: where the night's frame goes (CL-211, AG-86's profile)

Antigravity, night 20's last push at High on Jerry's 5080 (`bench.mjs --prof`, then `--prof --cpu`): a 28.7-34.1 ms
frame (29-35 fps); the GPU's own work is **0.2-0.3 ms** of it (WebGPU timestamps). The frame is the CPU, and two
thirds of it is three's `renderer.render()` walking and submitting the scene:

| Where (night 20, High, 30.4 ms frame) | ms a frame |
| --- | --- |
| `renderer.render()`, all of it | 19.5 |
| the sun's shadow pass (a second render of the whole scene inside the first) | 7.8 |
| the scene's matrices (`updateMatrixWorld`, walked by both renders) | 6.9 |
| projecting the scene into render lists (`_projectObject`, both renders) | 4.0 |
| the draws themselves (bindings, buffer writes, pipelines) | about 5 |
| `updateZombies` (the 48 dead's AI and poses) | 2.5 (the `zombies` mark 2.9-4.2) |
| the marine's cloth and waist (`bend`) | 0.8 |
| `syncRigSkins` (CL-210) | 0.1 |

- **Draw calls and triangles don't set the night's frame; the size of the scene does.** Every render walks every
  Object3D, and the shadow pass is a whole second walk. The megaswarm at the title (198 draws) still spends 14.5 ms
  in render.
- **Cut 1 (CL-211, landed 10-19 20:57Z, `index.html` renderFrame):** the matrices are walked once a frame
  (`scene.updateMatrixWorld()` before render, `matrixWorldAutoUpdate` off during it). About -3.4 ms, day and night.
- **Cut 2 (same):** at night (the sun under 0.12; it is 0.025 under a 0.15 sky) the sun's shadow map is redrawn every
  4th frame instead of every frame. About -5.8 ms at night; by day it is as before.
- **Expected:** the night frame near 21 ms (about 47 fps). **Measured (AG-86/AG-88, 21:08-21:15Z):** night 20
  44.8 fps (22.3 ms, 1% low 32.3, no hitches; was 32.5), night 10 45.4 (22.0 ms; was 34.8), the megaswarm 60.0
  (16.7 ms; was 59). The shadow pass went 8.5 to 1.1 ms, the matrices 7.1 to 3.7 ms.
- **Cut 3 (21:17Z):** the matrix walk (`updateSceneMatrices`) skips the top-level things sceneCull hid: the
  matrices 3.1 to 2.5 ms (AG-89). Keeping nothing off-screen at night for the shadows was tried with it and bought
  nothing but worse lows (43.7 fps, 1% low 28.4), so that half is undone.
- **Cut 4 (21:24Z):** bees and butterflies shelter at night as they do in rain, and the walk skips them hidden (930
  of 9,900 nodes).
- **The dead (ChatGPT, GP-19934):** idle poses behind the camera past 12 m skip their overlay work at night; the
  `zombies` mark 3.61 to 2.77 ms. Their draws (GP-19935): 80 of the camera's 383 a frame, under the 100 line, so
  the common kinds keep ≤ 4 draws. The AI's own tick is Grokbot's GB-194; the HUD's per-frame work ChatGPT's GP-19936.
- **The bench varies run to run** (the night's last push is never the same: 383-623 draws, 42.5-53.9 fps on one
  build). Compare medians of three runs, or the marks, not single fps lines.
- **The census (night 20):** 9,768 Object3Ds under the scene, 7,208 recomposed every frame, 7,429 meshes (3,548
  shown, 442 drawn), 1,832 top-level. 585 unnamed groups hold 6,757 of the nodes; the wildlife (butterflies, bees,
  birds) 951; the relay vault 219. The next census names the unnamed groups.
- **Left at night 20 (22.3 ms):** render() 10.4 (the render lists 2.6, bindings and draws about 4, bloom 0.8,
  transparents 0.8, the shadow 1.1), the dead 3.6 (ChatGPT's GP-19934: to 2), the matrices 3.1.
- **Next, from `bench.mjs --census`:** how many Object3Ds the scene holds and whose; static props that recompose
  their matrix every frame (`matrixAutoUpdate`); the zombies' 2.5-4 ms; the daytime shadow pass.

## 2026-10-19, late: the draws that are left (CL-214, CL-218)

From AG-91 (three night-20 runs, 22:52Z), AG-94 (the day) and AG-92 (23:33Z), all on Jerry's 5080 at High:

| | fps (1% low) | frame | render() | draws (camera) |
| --- | --- | --- | --- | --- |
| Night 20, before CL-214 (AG-89) | 45.5 (24.7) | 21.98 ms | 10.89 ms | 468 |
| Night 20, CL-214's rock cells (median of 3, AG-91) | 49.9 (28.9) | 20.04 ms | 9.74 ms | 395 |
| Night 20, AG-92's four prop merges | 50.3 (31.6) | | | 390 |
| Day 5 (the sun's full shadows, AG-94) | 59.5 (43.6) | 16.81 ms | 8.80 ms | 314 (+13 shadow) |

- **CL-214:** the 147 rocks are drawn from 47 merged cells (41 culled at night): 147 draws to 4.
- **render() is now about 25 µs a draw.** Of night 20's 396 camera draws (AG-91's census by owner): the HQ house
  145, loose world meshes 65 (foliage chunks, tree cells, the river's life, the landmarks), the marine 54, the ground
  sectors 39, the dead about 77 (eyes and skin a zombie, the demon's fist and horn).
- **CL-218 (23:40Z):** the HQ house was one draw a material (CL-117), and its hatches and props bring their own
  colours. `world/bake.js` `foldStatic` folds every plain one (no texture, no glow, opaque) into one mesh a side,
  its colour, roughness and metalness per vertex (a node material reads them), as CL-210 did for the marine. Expected:
  the house from 145 to about 40 draws, about 2.5 ms off the night's frame. AG-96 measures it (`?fold=0` is the old
  way).
- **Next:** the loose world meshes (the river's 67 chunks of weed, reeds and pads, the boundary stations), the dead's
  eyes (one draw with the skin, GP-19939), the marine's 32.

## 2026-10-20: read the tick, not the fps (CL-219)

The bench's display refreshes at 60 Hz (the megaswarm reads exactly 60.0 fps, 16.67 ms, with a 12.2 ms tick), so a
frame is shown on a 16.7 ms beat: a tick under it is a 60 fps frame, a tick just over it waits for the next beat and is
a 30 fps frame. That is why night 20's fps barely moved while its work fell: a 17-18 ms tick (AG-91, AG-96) is a mix of
16.7 and 33.3 ms frames, about 48-50 fps, and a cut that leaves the tick over 16.7 shows nothing. **The measure is
`prof.tickMs`; the bar for 60 fps is a tick under about 15 ms** (room for its swings), and the 1 % low is the
heavy frames (the night's shadow redraw every 4th frame until CL-219, the 50 ms spikes of a material compiling or the
marine rebaking).

| Night 20, High | tick | frame | fps |
| --- | --- | --- | --- |
| AG-91 (CL-214), median | 17.81 ms | 20.04 ms | 49.9 |
| AG-96 (CL-218 fold), median | 17.03 ms | 20.96 ms | 47.7 |
| Day 5 (AG-94) | 14.99 ms | 16.81 ms | 59.5 |
| AG-97 (CL-218's second cuts, CL-219's night shadows, GP-19939's eyes), median | 14.31 ms | 17.89 ms | 55.9 |
| AG-97, best of 3 | 14.13 ms | 17.36 ms | 57.6 |

AG-97 (01:27Z): night 20's camera draws 334 to 265 (the house 74, the marine 52, loose world meshes 50, the dead 37,
the terrain 16), `r:render` 9.2 to 7.0 ms, and `computeBoundingSphere` gone from the profile. The tick is now under
the beat most of the time; what keeps the 1 % low near 30 fps is the frames that aren't: the 40-70 ms first-sight
shader builds (`r:render` 38-73 ms in `prof.spikes`; ChatGPT's GP-19940 warms them), the `zombies` mark's swings (2.5
ms on average, 13 ms at worst) and the matrices' (1.6, at worst 4.2).



## 2026-10-20, night: the long frames are garbage collection (GP-19940, CL-220)

ChatGPT's traces (GP-19940) showed no new pipeline on the 40-53 ms `r:render` frames once the zombie kinds and
effects were warmed; `bench --alloc` (a DevTools allocation sample over the measured seconds, CL-219) then found
**1,558 kB allocated a frame at night 20 (87 MB/s)**: a young-generation scavenge every second or so and a full
collection every few, each one a 20-70 ms frame. Two of six spikes were proven collections (22 and 74 MB freed in the
frame); the rest grew the heap by 10 MB and are not proven either way.

Where it came from (kB a frame, `alloc.self`): updateZombies 264; the marine's waist 235 and cloth 131 (the per-vertex
`Math.hypot`); three's cache keys 160 (get/getNodeChildren/getDynamicCacheKey, the renderer's own, not ours); the
ability collision sweep 59; marine-skin's state arrays 24; the water's `riverProject` result objects 24; tree
collisions, sceneCull, the tree fade and sampleClip 8-14 each.

**`Math.hypot` allocates.** In V8 every call builds a double array (about 64 bytes), whatever the argument count:
5e6 calls ran 311 scavenges and 348 ms against 79 and 58 ms for `Math.sqrt(a * a + b * b)`. index.html made about
600 such calls in its text and thousands a frame at night (every zombie's distance checks, the trees, the water, the
sounds). Every `Math.hypot(` in index.html is `hypot(a, b, c)` now (CL-220), and the rule for per-frame code is: no
fresh objects or arrays, no `Math.hypot`; scratch objects reused across frames.

| Night 20, High, `--alloc` | kB a frame | render spikes |
| --- | --- | --- |
| Baseline (ChatGPT, 06:4xZ) | 1,558 | 6 (2 proven GC) |
| The waist, the cloth, the acid ribbon cut | 1,092 | 3 |
| The ability collision sweep cut | 954 | 7 (1 proven GC) |
| CL-220's hypot/riverProject/marine-skin (after 07:35Z) | not benched yet | |

Still to cut: updateZombies 270 (Grokbot, GB-202: objects or arrays per zombie per frame, not hypot any more); the
ability trace 48 (ChatGPT). The target is under about 300 kB a frame: collections every few seconds instead of every
one, and a scavenge of a small young generation is a few ms, not forty. three's 160 is a lead for a later three bump.

Also found by the way: a batched tree whose snapshot changed and changed back (the canopy fade on the camera's line
after any teleport) stayed live for the rest of the run: a slow draw-count leak in play, fixed in CL-220 (t50).

## 2026-10-20, evening: after GB-202 and GP-19941, the 1 % low has not moved (AG-103, CL-223)

AG-103 ran night 20 at High three times on Jerry's 5080 with `--prof --cpu --alloc`, after Grokbot's GB-202 (the
flow field's rebuild sliced over frames) and ChatGPT's GP-19941 (the ability trace) landed
(`qa/2026-10-20-AG-103/bench-3x-summary.json`):

| Night 20, High | fps | 1 % low | tick ms | kB a frame | draws |
| --- | --- | --- | --- | --- | --- |
| Run 1 | 52.3 | 21.3 | 15.42 | 893 | 269 |
| Run 2 | 56.0 | 24.3 | 14.50 | 859 | 259 |
| Run 3 | 49.7 | 20.5 | 16.85 | 925 | 264 |
| Median | 52.3 | 21.3 | 15.42 (AG-97: 14.31 without `--alloc`) | 893 (from 1,558 this morning) | |

What it says:
- Allocation is down 43 % since this morning, but the 1 % low is where it was: run 1 still had eight frames of
  50-74 ms. A 1 % low of 50 fps needs every frame but one in a hundred under 20 ms, so it is the spikes, not the mean,
  that stand between night 20 and the budget.
- The heap figures on the spikes repeat at about -10 MB (the heap grew 9.8, 9.9, 10.0, 10.3 MB in the frame). Most
  likely that is Chrome's coarse `performance.memory` (it rounds unless launched with `--enable-precise-memory-info`),
  so those figures can't say whether a spike collected garbage.
- So the spikes' cause is still not proven. Three candidates: a collection (the 893 kB a frame still fills the young
  generation every second or so); a pipeline built or a texture or geometry uploaded on the frame; or the game's own
  code (the `zombies` mark reached 34 ms in one of them).

CL-223 makes the bench answer that. `bench --prof` now launches Chrome with `--enable-precise-memory-info` (real
heap figures), records spikes from 25 ms instead of 50, puts on each one the pipelines (three's render-pipeline
cache), textures and geometries built in that frame, and counts all of them by cause in `prof.spikeCauses`
(`pipelines`, `uploads`, `gc` for 2 MB or more freed, `code` for none of these). AG-105 runs it on the 5080.

## 2026-10-20, later: the night's spikes are pipelines being built (AG-105, CL-226)

AG-105 ran night 20 at High on the 5080 with CL-223's bench: three `--prof` runs (no sampler) and one with
`--prof --cpu --alloc` (`qa/2026-10-20-AG-105/`, `handoffs/2026-10-20-antigravity-AG-105.md`).

| Night 20, High | fps | 1 % low | tick ms | spikes over 25 ms | built a pipeline | gc | code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `--prof` run 1 | 52.8 | 25.4 | 15.21 | 37 | 23 | 1 | 13 |
| `--prof` run 2 | 53.5 | 27.1 | 14.65 | 30 | 21 | 2 | 6 |
| `--prof` run 3 | 55.1 | 25.7 | 13.96 | 29 | 25 | 1 | 3 |
| `--prof --cpu --alloc` | 54.7 | 28.4 | 14.40 | 28 | 26 | 1 | 1 |

What it says:
- **Most of the long frames build a render pipeline**: 70 to 93 % of the spikes. Each spends 22-48 ms in `r:render`
  and grows the heap by about 10 MB. That is three's node builder writing a material's shaders on the frame it is
  first drawn in that state, which is why the "-10 MB" kept repeating on the spikes (it was real, not rounding).
- **It goes on all night**, not only at the start: pipelines are built at frames 72 to 644 of a 30-second sample,
  one every second or so. The warm-up (`warmEffectPools`, compileAsync) covers what exists at load. So something in the
  fight keeps making states that have no pipeline yet, or keeps handing one back and building it again. Three drops a
  pipeline when its last user moves to another state, so a state that flips back and forth (a material switched to
  transparent and back, for example) is rebuilt each time it comes back.
- Garbage collection is 1-2 frames a run. The 893-904 kB a frame is no longer what makes the 1 % low.
- The mean is about 54 fps, and the CPU tick is 14-15 ms, nearly all of a 16.7 ms frame. That is the other half of
  the 60 fps budget, after the spikes.

CL-226 makes the bench name them. `bench --prof` now keeps a journal of every pipeline built while it measures:
the object (its name or type and three parents), the material, the state that goes into the pipeline's key, the
camera that drew it (the scene's, or a shadow or pass camera), whether its shaders were new. It counts every release
too, and reports the top groups in `prof.pipelines`. AG-106 runs it; the cut follows from what it names.

## 2026-10-20, late: who the pipelines were for (AG-106, CL-227)

CL-226's journal on the 5080 (night 20 High, two runs): 40-43 pipelines built in 30 s, 0 released, nearly all with new
shaders. 20-22 were zombie skins with a new vertex shader each: three writes a skeleton's length into the skinning
shader, and the one-draw bodies (CL-138) had skeletons of 10-17 bones and more in a fight. 18 were the demon's fire
fists' shadow, all at once when the demons came close: the far-shadow toggle turned every mesh's shadow on, the
fists' too. CL-227 pads every zombie skeleton to 32 bones (one shader per body material, warmed at load) and keeps
each mesh's own shadow flag. AG-107 measures it.
