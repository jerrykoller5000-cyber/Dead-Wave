# MU-2 — Night 20's zombie cost since 82d75118 (1.0.x): which changes

Date: 2026-10-29. Agent: Muse (MU-2). Type: report only, no code changed.
Baseline: `82d75118` (2026-10-24, "the playtest fixes (D-87)"). Compared with: the
working copy on 2026-10-29 (HEAD `c3cd9c86` plus uncommitted changes in
`combat/zombie-fidelity.js`, `studio/zombie-concepts.js`, `game/trapper-path.js`).
Method: reading only — `git diff 82d75118 -- index.html game combat studio world`,
function-level extraction/diff of `index.html`, and a Node geometry probe (below).
No game runs (rule 16: Muse cannot hold the game-test slot). Every suspect names
the bench or probe that would confirm it.

The bench numbers to explain (Cursor's CU-170, `handoffs/2026-10-29-cursor-CU-170.md`,
same seat, night 20, 48 zombies, old/new/old/new): `zombies` mark +0.34 ms then
+0.44 ms; draws +8 then +16; triangles about +4,643 then +3,959; tick +1.39 ms then
+0.50 ms. CU-170 itself notes: "The bench does not split draw calls by owner" —
draws and triangles are scene-wide, the `zombies` mark is not.

## Headline findings

1. **The per-frame zombie CPU code barely changed.** `updateZombies` in
   `index.html` (current lines 55745–57264) differs from 82d75118 in exactly two
   places (the spider standoff and GB-241, suspects 4–5 below), and its helper
   modules are unchanged except `game/shambler-recovery.js`,
   `game/screamer-behavior.js` and `game/screamer-appearance.js`. `makeZombieMesh`
   (current lines 38080–39068) and the skin-bind region after it are byte-identical
   except one added helper, `eyeBase`. Nothing found adds more than a few
   microseconds per frame at 48 zombies. **The +0.34/+0.44 ms on the `zombies`
   mark is not explained by any per-frame code change in scope.** It is either
   measurement/seat variance that happens to repeat, or an indirect effect
   (see "What would settle it", probe A).
2. **The zombie look builders add triangles but zero draws.** Measured in Node
   (method below): every type's batched mesh count is unchanged; triangles move
   by +24 for most types, +384 for the bomber, +176 for the colossus, and
   *down* for the spitter (−140) and screamer (−44). Weighted by the night-20
   mix that is about **+30 triangles per zombie, ≈ +1,460 at 48 zombies** —
   roughly a third of the observed +4,000. The rest of the triangle/draw growth
   is scene-wide and, on the diff, most plausibly sits in the changed
   world/buildable builders, which are outside this task's zombie scope
   (see "Outside the zombie scope", below).
3. **The eyes and the hides cost nothing measurable.** Eye emissive intensity
   went 1.8 → 0.9 (`studio/zombie-concepts.js`, current line 205 area; D-89
   pale-green), the eye batch (`mergeEyes`) is unchanged, and brute/demon skin
   moved to the `wet` detail tile (`hideSurface`, current line 196) — a UV
   remap at build time, no new geometry, material or draw.

## How the geometry was measured

Node probe, run by Muse on 2026-10-29 (Node-only check, no game): build the
test rig from `studio/zombie-concepts.test.mjs` (joint groups, two sphere eyes,
six crawl limbs), call `applyZombieConcept({THREE, g, typeKey, scale: 1, rbox})`
from `studio/zombie-concepts.js`, then traverse and sum meshes, vertices and
triangles (index count / 3, else position count / 3). The baseline mirror was
built from `git show 82d75118:<path>` copies of `studio/zombie-concepts.js`,
`studio/zombie-guardian-detail.js` and `combat/zombie-fidelity.js` over current
copies of the unchanged imports; the current side ran the working-copy files.
Mesh counts are post-`batchSurfaces` (the batching inside `applyZombieConcept`),
i.e. the draw-relevant unit before the game's own `skinZombieMesh` merge, which
is unchanged. Full result:

| type | Δ meshes | Δ verts | Δ triangles (base → current) |
| --- | ---: | ---: | ---: |
| shambler | +0 | +72 | +24 (5,208 → 5,232) |
| feral | +0 | +72 | +24 (4,980 → 5,004) |
| brute | +0 | +144 | +48 (6,096 → 6,144) |
| military | +0 | +72 | +24 (5,656 → 5,680) |
| spitter | +0 | −420 | −140 (5,428 → 5,288) |
| bomber | +0 | +1,152 | +384 (5,976 → 6,360) |
| screamer | +0 | −132 | −44 (5,728 → 5,684) |
| drowned | +0 | +72 | +24 (5,884 → 5,908) |
| leaper | +0 | +72 | +24 (4,794 → 4,818) |
| spider | +0 | +0 | +0 (3,994) |
| colossus | +0 | +528 | +176 (6,464 → 6,640) |
| demon | +0 | +0 | +0 (5,352) |
| guardian | +0 | +0 | +0 (4,344) |
| caveguard | +0 | +0 | +0 (4,344) |

Screamer was also probed after `prepareScreamerAppearance` (the jaw/tongue
split in `game/screamer-appearance.js`): 16 meshes both versions, jaw 2 children,
tongue 1 child both versions — **no new draws from the new screamer face**.

Night-20 mix used for weighting (`index.html`, `NIGHT_PLAN[20]`, current line
39506 area; total 860): shambler 361 (42%), feral 126, military 101, leaper 63,
brute 45, spider 45, drowned 30, bomber 30, spitter 25, demon 24, screamer 10.
The 48 alive at the bench peak are assumed roughly proportional (packs and
`late:` entries shift this a little).

## Ranked suspects

### 1. Bomber belly sphere — +384 triangles per bomber (build-time geometry; GPU vertex/skinning cost every frame)

- Where: `studio/zombie-concepts.js`, current line 416:
  `A.put(torso, new T.SphereGeometry(1, 16, 10), acidMat, …)` with scale
  (.415, .36, .335). At 82d75118 this was `egg(torso, acidMat, 0, .095, .12,
  .83, .72, .67)` — the shared egg helper, an 8×4-segment sphere.
- Adds per zombie: 0 meshes, 0 draws, +1,152 vertices, **+384 triangles**
  (measured, table above) for each bomber. The belly is part of the batched,
  skinned body, so those vertices are skinned on the GPU every frame and drawn
  in every pass the body is drawn in (main + shadow).
- Per-frame cost estimate: at the night-20 mix (~3.5% bombers, so ~2 of 48)
  ≈ +770 triangles total — small. Confidence it adds what the table says:
  **high** (measured). Confidence it matters at night 20: **low**.
- Confirm: probe B (below) on a bomber, or the Node probe above re-run.

### 2. The refined face on every non-heavy head — +24 triangles per shambler/feral/military/drowned/leaper (build-time; GPU)

- Where: `combat/zombie-fidelity.js`, `refineZombieFace` (current lines
  51–104), called from `studio/zombie-concepts.js` line 311. Two additions
  versus 82d75118: a jaw egg per side for non-heavy types (line 73,
  `if(!heavy) A.egg(head,skin,side*.065,-.108,…)`) and a recessed maxilla egg
  (line 80, `if(!heavy) A.egg(head,skin,0,-.055,…)`), partly offset by the old
  nostril eggs becoming heavy-only (line 82). Net measured: +72 vertices,
  +24 triangles, +0 meshes per affected zombie. The `front()`/`onSkin()`
  remapping (lines 61–67) moves vertices; it does not add any.
- Per-frame cost estimate: these five types are ~76% of night 20, so ~36 of
  48 zombies × 24 ≈ **+870 triangles** — the largest single zombie-side share
  of the observed triangle growth, but still GPU-side vertex work, not CPU
  `zombies`-mark time. Confidence: **high** that it adds this geometry
  (measured); **high** that it cannot explain the `zombies` CPU mark.
- Confirm: probe B on a shambler; Node probe re-run.

### 3. Colossus thigh plates and brute face/heavy changes — +176 (colossus), +48 (brute) triangles

- Where: `studio/zombie-concepts.js` current lines 540–541: two
  `plate(leg, rust, …)` per leg replace two `box(leg, rust, …)` per leg on
  heavy types; `refineHeavyArmor` in `combat/zombie-fidelity.js` (lines
  153–188) changed only shield position/rotation, same part count. The brute
  also loses two torso paint boxes and gains a leather `path` in
  `studio/zombie-concepts.js` (brute block, current lines ~505–520), and the
  +48 measured includes the heavy face path (suspect 2's heavy variant:
  nostril eggs kept, no jaw/maxilla eggs).
- Per-frame: colossus does not appear in `NIGHT_PLAN[20].kinds` at all, so
  ~0 at night 20 unless spawned as a pack leader by other code; brute ~5%
  (~2–3 of 48) × 48 ≈ +120 triangles. Confidence: **high** (measured);
  night-20 impact **low**.
- Confirm: probe B on brute/colossus.

### 4. Shambler recovery: fuller step and pose maths — per recovering shambler only (CPU, inside the `zombies` mark)

- Where: `game/shambler-recovery.js`. `shamblerRecoveryStep` (current lines
  33–52) used to return a fixed forward pace; now, after the 0.36 s stumble,
  it computes target direction per frame: 1× `Math.hypot`, 2× `Math.atan2`,
  several `Math.sin`/`Math.cos`, 2–3 smoothstep evaluations, and updates
  `s.walkPhase`. `applyShamblerRecovery` (lines 56–96) adds 1× `Math.hypot`
  and two smoothsteps for the arm-clearance/close-guard terms (lines 61–63),
  plus stride/lift maths per leg (lines 88–92). State record also grew
  (`yaw`, `target`, `stepDt`, `walkPhase`, `pace`, `turnWeight`, line 10–11).
- Adds per zombie per frame: **only for shamblers inside the 1.25 s recovery**
  (entered on a whiffed melee lunge, `shamblerLungeResult`): roughly
  150–400 ns of extra maths and no new allocations (the returned `{x, z, pace}`
  object already existed). Even 10 simultaneously recovering shamblers —
  more than a melee-heavy night-20 moment would hold — is ≈ 0.004 ms.
- Confidence: **high** that this is the largest *new* per-frame CPU item in
  the mark; **high** that it is at least 50× too small to explain +0.34 ms.
- Confirm: probe C (below).

### 5. Spider standoff rewrite (GP-19979) and GB-241 turn-on-the-spot — branches only (CPU, inside the mark)

- Where: `index.html` current lines 56155–56176 (spider hold/back-off:
  `lineSawBlock`, committed approach, no strafe after a blocked line) and
  line 56389–56391 (GB-241: a shambler close and facing away has `spd = 0`).
  These are the *only* two changes inside `updateZombies` itself.
- Adds per zombie per frame: a handful of comparisons and, for GB-241, one
  `zHyp` (the allocation-free hypot, line 55743 area) plus two trig calls
  **only for shamblers already steering** (`shamblerTurn` non-null). No new
  `shotBlocked` calls (still two, on the existing timer), no allocations.
  Estimate < 0.005 ms across 48 zombies. Confidence: **high** (diff is 19
  added / 9 removed lines total in a 1,519-line function).
- Confirm: probe C with spiders/shamblers isolated; code reading is probably
  sufficient.

### 6. Screamer pose: guard/call smoothing and a split arm loop — per screamer only (CPU, inside the mark)

- Where: `game/screamer-behavior.js`, `applyScreamerPose` (current line 55).
  New: `s.call` smoothing (line 64, one extra `Math.exp`), a critically damped
  `s.guard` spring (lines 65–67, one extra `Math.exp`), reworked torso/head/
  jaw/tongue terms, and the arm posing moved out of the leg loop into its own
  two-iteration loop (lines ~95–106) — same iteration count as before, but it
  now runs even when a leg lacks the ankle helper. `game/screamer-appearance.js`
  changes (jaw-colour masks, lines 17–31) are build-time only and measured
  draw-neutral (probe above: 16 meshes both versions).
- Adds per zombie per frame: ~2 `Math.exp` and ~20 flops **per screamer**.
  Night 20 fields ~1% screamers (0–1 of 48 typically): < 0.001 ms.
  Confidence: **high**.
- Confirm: probe C with screamers isolated.

### 7. Things checked and cleared (no per-frame or per-draw cost added)

- `updateZombies` helpers unchanged since 82d75118: `game/shambler-motion.js`,
  `game/shambler-steering.js`, `game/spitter-motion.js`, `game/spider-motion.js`,
  `game/feral-motion.js`, `game/leaper-motion.js`, `game/drowned-motion.js`,
  `game/zombie-feet.js`, `game/zombie-ability-runtime.js` (`enemyAbilities`),
  `combat/zombie-joins.js` (`blendZombieJoins` is bind-time; `zombieJoinRules`
  unchanged), `studio/zombie-detail.js` (detail atlas/material: build-time,
  cached). `git diff --stat 82d75118` shows no change in any of them.
- The other two calls inside the `zombies` mark — `enemyAbilities.update(dt)`
  and `feralMotion.update(dt)` (`index.html` lines 59845–59846) — are in
  unchanged files.
- Eyes: `mergeEyes`, eye scale and the eye-batch draw are unchanged; emissive
  intensity 1.8 → 0.9 (`studio/zombie-concepts.js` line ~205) and the corpse
  fade now starts from `eyeBase(m)` (`index.html`, `updateCorpses`, one
  property read per corpse per frame — outside the `zombies` mark, and
  negligible).
- Hides: brute/demon `skin`/`shadow`/`pale` materials now carry the `wet`
  detail surface (`studio/zombie-concepts.js` line 196). Build-time UV tile
  choice only; same material count, same batching signature shape.
- Spitter and screamer geometry went *down* (−140 / −44 triangles measured):
  the spitter's vest boxes/rags became two ribbons and one plate
  (`studio/zombie-concepts.js` lines ~426–428), which offsets part of
  suspects 1–3 in the scene total.
- `spawnWaveBatch` (+1 line ×2, day-1 only), `resetZombieMesh` (one
  `eyeBase()` call on pool reset), `preRollFight` (CL-245 ground-fire warm-up)
  are spawn/load-time, not per-frame. Night-20 type composition
  (`NIGHT_PLAN`, `pickZombieType`) is unchanged, so the 48 at the peak are
  the same mix as the old build fielded.

## Outside the zombie scope (where the rest of the scene growth most plausibly sits)

Draws (+8/+16) cannot come from the zombie look builders: measured Δ meshes
is +0 for all 14 types, before and after the screamer jaw split, and
`skinZombieMesh`/skin-merge are unchanged. The same three checkpoints changed
many scene builders that draw every frame — e.g. in `index.html`: `makeHouse`
(454 → 773 lines), `decoratePiece` (471 → 522), `decorateTurret`,
`makeFlameTurretMesh` (35 → 139), `makeHeavyTurretMesh` (50 → 127),
`makeLightTurretMesh` (76 → 125), `makeWireMesh`, `buildHistoryProps`, plus
`world/history-props.js` (+193 lines) and `game/trapper-path.js`. CU-170's
bench does not split draws by owner, so this report does not rank them; it
only records that the zombie side is measured draw-neutral and roughly
+1,460 of the ~+4,000 triangles (×48, night-20 mix), leaving ~2,500 triangles
and all of the extra draws to be accounted for outside the zombies. That
remainder is a follow-up for the owners of those areas, not a finding
against them — turrets and the world pass were deliberately rebuilt in this
window (D-88/D-89 principles passes).

## What would settle it (probes for whoever holds the game-test slot)

Rule 16: these need the slot (`node crew/crew.mjs slot run …`), so they are
written for Claude/Cursor, not run here.

- **Probe A — is the `zombies` mark growth real CPU, and whose?** Re-run
  CU-170's `qa/2026-10-29-CU-170/alternate.mjs` seat (night 20, 48 zombies,
  `--prof`) on the current build with two extra marks split out of the
  existing `zombies` mark: one after `updateZombies(dt)` and one after
  `enemyAbilities.update(dt)` (`index.html` lines 59844–59847). If
  `updateZombies` itself is flat versus 82d75118 while the combined mark
  moved, the growth is in the two unchanged updaters' *inputs* (state the
  new code sets), not their code. Prediction from this report: all three
  sub-marks within ±0.05 ms of the old build.
- **Probe B — triangles/draws per zombie, in the real build.** The game
  already exposes `drawsOf(root)` in its debug hooks (see `tick()`'s debug
  object, `index.html` line ~60489 area: per-mesh verts, material, visibility).
  On both builds, spawn one of each night-20 type at the bench seat and sum
  `verts` and mesh count per `z.mesh`. Prediction: Δ meshes 0 everywhere;
  Δ triangles matches the Node table above (bomber +384, common types +24,
  spitter −140, screamer −44). This also settles how much of the scene-wide
  +4,000 is zombies (prediction: ~1,500) versus the rest of the scene.
- **Probe C — the three small CPU suspects.** Bench night 20 with (i)
  `tickShamblerRecovery` forced to return false, (ii) `applyScreamerPose`
  stubbed to the 82d75118 version, (iii) the GP-19979 spider block reverted —
  one at a time, same seat, `--prof`. Prediction: each moves the `zombies`
  mark by < 0.02 ms; if one moves it by ~0.3 ms, this report's reading of
  that file is wrong and it becomes suspect 1.
- **Probe D (Node, no slot needed; anyone can re-run).** The geometry probe
  in "How the geometry was measured": rig from
  `studio/zombie-concepts.test.mjs`, `applyZombieConcept` per type, traverse
  and sum. Baseline side from `git show 82d75118:…` mirrors. This is exactly
  how the table above was produced; re-running it on a future build gives
  the per-type triangle/draw delta before any game bench.

## Bottom line

Since 82d75118 the zombies got **more triangles but not more draws, and
essentially no more per-frame CPU**: about +30 triangles per zombie at the
night-20 mix (≈ +1,460 at 48), led by the bomber's new belly sphere and the
refined face on the common types, partly offset by the spitter and screamer
getting cheaper. The `zombies`-mark growth (+0.34/+0.44 ms) has no
corresponding code change in `updateZombies` or its helpers — the three new
per-frame items (shambler recovery, spider standoff/GB-241, screamer guard
spring) sum to well under 0.02 ms — and the +8/+16 draws are measured to
come from outside the zombie builders. Probe A is the one that would prove
or refute the mark; probe B would close out the triangles and draws.
