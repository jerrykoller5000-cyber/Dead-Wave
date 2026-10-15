# chatgpt — GP-19922 Broad zombie model sweep — 2026-10-15

Changed:          Broad source/archived-render audit of all fourteen zombie types; implemented shared face/anatomy cleanup, continuous curved tendons and claws, fitted Brute/Colossus scrap armor, smoother Spider shell/limbs and continuous Guardian talons. Changes ready; waiting for testing slot for the paired live inspector review before calling the sweep complete.
Files:            combat/zombie-fidelity.js (new); studio/zombie-concepts.js; studio/zombie-guardian-detail.js; review/zombie-sweep-GP19922. No index.html changes in this task.
Tests:            64 focused Node tests pass, 0 fail; fourteen-model real-Three geometry audit passes including normal/vertex validity, draw budgets, Brute's four breakable plate partitions and Spitter/Screamer articulated parts; both actual Guardian rigs pass 120 gallop/hand poses each.
Screenshots:      Archived references reviewed: review/zombie-fidelity/{front,face,back}-contact.png and review/zombie-concepts/front-contact.png. Fresh paired screenshots NOT RUN: awaiting new GP-19922 slot grant; inspect-batch.mjs is prepared.
Not verified:     Fresh native inspection, clipping in all live poses, screenshot comparisons, normal-GPU performance and coordinated full suite remain pending. Archived renders guided the initial pass and do not prove the current result looks correct.
Requests:         Claude: queue GP-19922 after GB-177 and AG-78, about 15 minutes; Grokbot: scoped zombie-model assignment notice; Cursor: preserve manual ordering through automatic-queue transition and register prepared batch. No fresh grant received at this checkpoint.
Contract changes: Internal sculpture helpers only; existing animated joints, eye references, material color tags used by armor/uniform/jaw classifiers and template batching remain in the existing pipeline.

## What the sweep changes

- Shambler / Feral: integrated skull, cheek and jaw silhouette; recessed eyes and fitted brow ridges replace protruding eyes and separate cheek balls. Shared muscle profiles and tendons have continuous surfaces.
- Military: same face/body cleanup beneath the existing uniform and helmet pipeline; existing camo color tags retained for the uniform extraction pass.
- Spitter / Bomber: common facial cleanup; continuous organic lines on skin. Spitter jaw extraction and Bomber's existing textured pulse/vein materials remain valid in the focused checks.
- Screamer: rebuilt face and mouth preserve the tongue's exact material color tags for its separate articulation; lower-jaw and pink-tongue extraction pass.
- Drowned / Leaper: face, brow, wrist/finger tendons and exposed bony lines use continuous surfaces; smooth body profiles keep existing joint placement.
- Brute / Colossus: replace the flat chest/back slabs, shoulder chunks, bracers and shin blocks with shaped closed armor surfaces. Brute retains four independently breakable color-tagged zones; Colossus retains its industrial shoulder shield and hazard identity.
- Spider: rounded overlapping carapace, smoother upper/lower leg shells and continuous curved fangs/toe hooks; existing six limb pivots and reach calculation retained.
- Demon: retain GP-19921's already verified sculpture; its shared inlaid lines use the common surface helper, with unchanged model triangle/draw counts in the geometry fixture.
- Guardian / Caveguard: common profile and cord smoothing plus continuous swept talons on the actual articulated rigs. Existing jaw/finger/IK transforms are exercised in the 120-pose checks.

## Evidence

1. `node --test studio/zombie-concepts.test.mjs game/zombie-ability-visuals.test.mjs game/spitter-motion.test.mjs game/screamer-behavior.test.mjs game/zombie-headshots.test.mjs` → tests 64 / pass 64 / fail 0. Saved focused-tests.log.
2. `node review/zombie-sweep-GP19922/geometry-audit.mjs` → PASS fourteen models; no added draws, finite normalized normals/vertices, all four Brute plate partitions, articulated Spitter jaw and Screamer tongue. Saved geometry-audit.log and geometry-report.json.
3. Jerry then explicitly requested the demon's smooth geometry on every zombie. Rounded skin now uses 16-sided profiles on broad masses, 12 on slender sections, and smoother large skin spheres. Final shared fixture: 142,454 before → 162,152 after (+13.83%), with unchanged draw counts and the original overall geometry-budget assertion passing. The earlier +0.47% number describes the initial pass and is superseded. These are source measurements, not FPS evidence; live performance must be checked.
4. `node --experimental-loader ./review/zombie-sweep-GP19922/three-loader.mjs review/zombie-sweep-GP19922/guardian-audit.mjs` → PASS guardian 120 poses / 20,508 triangles / 43 draws, caveguard 120 poses / 19,918 triangles / 41 draws. Saved guardian-audit.log and guardian-report.json. These use world/cave-guardian.js's actual builder and poses, with no browser.
5. `node --check review/zombie-sweep-GP19922/inspect-batch.mjs` passes. This is only syntax validation; the graphical batch has not run.

## Prepared graphical batch and queue

Jerry's one-game-test rule applies: no game launched in GP-19922. GP-19921's grant was explicitly RELEASED and does not authorize this task. Claude's new grant is still required while the automatic queue awaits verification. Requests were posted at the start and again when the batch was ready; do not leapfrog Grokbot/Antigravity just because the new automatic queue state is empty.

After the fresh grant, use the enforced queue wrapper as documented by Cursor, with prepared child command:

```
node review/zombie-sweep-GP19922/inspect-batch.mjs
```

The batch opens one browser/page, captures all fourteen baseline bodies and live walking faces, reloads the same page onto current code, takes matching front/left/back views, verifies finite walking rigs and canonical stat definitions, then pictures the full catalog. It closes in finally. Before modules are served using CDP interception from immutable baseline copies; it NEVER restores source files over the crew checkout.

Baseline snapshot manifest and SHA256 values are in review/zombie-sweep-GP19922/baseline/manifest.json. The source snapshots are one-time captures made before the edits; do not rerun snapshot.mjs or copy them over live files. Review the actual before/after images, fix any visible defects while holding/reclaiming the slot, then finish performance and independent acceptance. Full suite is the one coordinated integration run with Cursor/Claude.
