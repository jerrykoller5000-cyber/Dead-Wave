# AG-310b: Armory actions under 50 ms (Antigravity, Claude Sonnet 5.5)

**Verdict: partly met. Buy is under 50 ms in 1P and 3P; open and mod are not yet under 50 ms on every item.**

## What changed (index.html, CRLF and no-BOM kept, t215 green)
- Pass 2 (earlier): warmArmoryPics and trainingWarmCompile now clone the real m81 furniture materials, so first-use shader compiles are gone from buy and close. 3P buy went 433 to 33 ms; close compiles went 192 to 17 ms.
- This pass: MARINE_SHADOW_PAD is now [128]; updateMarineShadowProxy returns while paused, in the CIF or in the shop; armoryPicture and armoryPreview drop jobs for a gun look that has already moved on; the default pistol preview is pre-cached; ag310b-verify waits 75 frames after the view switch.
- Tried and reverted: skipping renderFrame behind the paused CIF. Two runs got worse, so it is out.

## Results (review/AG-310b/ag310b-after.json, one run per view, --exclusive)
Final run:
- 1P: buy max 33.4 ms (all under 50). Still over 50: pistol.open 100 (first DOM build, sync 26 ms), mod on shotgun 100, aa12 100, revolver 50, m4 67, flamer 50, and a few open and close frames at exactly 50 ms.
- 3P: buy max 16.8 ms. Still over 50: pistol.open 133, uzi.close 300 (one-off), mods on revolver 67, shotgun 50, aa12 50.
- 0 runtime or page errors. shadowBuilds is still 2, so the late shadow-proxy rebuild is not fully gone.
- Frame gaps are noisy between runs (three runs gave different outliers on the same code). Other crew sessions were active, so treat the 50 ms frames as unproven rather than regressions.

## Remaining causes, for a follow-up
1. pistol.open: the first build of the Armory panel DOM costs about 26 ms of sync work plus the first preview. It needs the panel built once, hidden, during the warm-up.
2. The gun mods (revolver prism, aa12 and shotgun parts) create meshes and materials on first fit that the warm-up doesn't cover. The warm-up needs to fit and unfit one mod per gun.
3. The late marine shadow proxy rebuild (shadowBuilds=2) still happens in play.
4. Several open, mod and close frames land at exactly 50 ms (three vsyncs), which looks like contention rather than a compile.

## Checks
- t38 26/0, t181 24/0, t215 4/0.
- t334 earlier gave 25 pass, 1 fail. The m4 UV failure is pre-existing (GT-20076's file) and was not touched.
- Visual parity: sheet-ag310b-visuals.jpg shows before and after identical on all four rows (bench, rotated preview, 34 swatches, CIF turntable). after-armory-rack-3p.png was inspected and looks right.

## Changed:
index.html (MARINE_SHADOW_PAD, updateMarineShadowProxy, warmArmoryPics, armoryPicture, armoryPreview), qa/2026-11-11-AG-310b/ag310b-verify.mjs.

## Tests:
t38 26/0, t181 24/0, t215 4/0; t334 25/1 (pre-existing m4 UV, not mine).

## Not verified:
Open and mod under 50 ms on every item, 1P and 3P (see Remaining causes); the late shadow-proxy rebuild; a clean quiet-machine timing run.

