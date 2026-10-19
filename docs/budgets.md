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
| Frame time, Jerry's GPU, High, night 20 | 60 fps mean, ≥ 50 fps 1 % low | **33 fps, 26 low** (AG-85, 10-18); every night 5-20 is 31-35 fps |

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
