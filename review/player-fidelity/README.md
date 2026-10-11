# GP-163 player model fidelity review

The reference is `../player-survivors/v1/player-pistol/GPT-Player/Player.png`. This review uses the game's actual renderer and `makeMarine()`, with the Training square as the background. The only review lighting addition is a soft hemisphere fill, identical in both passes.

## Baseline provenance

The cosmetic sources were saved before GP-163 edits began. `baseline-source-hashes.json` records SHA-256 hashes for `baseline-marine-body.js`, `baseline-marine-face.js`, and the complete `baseline-makeMarine.js` function. `baseline-index.html` is an untouched recovery snapshot. The harness never serves that whole snapshot: it replaces only the original `makeMarine` function and face import in the current index, and routes the two original modules. Other agents' current gameplay changes remain present in both passes.

## Reproduce

Use the bundled Node dependencies through `NODE_PATH`, then run:

```text
node ui/player-fidelity.browser.mjs --before
node ui/player-fidelity.browser.mjs
node ui/player-fidelity.browser.mjs --contact-only
node tools/shoot.mjs --compare review/player-fidelity/before review/player-fidelity/after
node ui/player-fidelity.browser.mjs --tests=t199,t134,t146,t184,t224,t189
```

`--only=front,face,boots` makes a separate preview folder and does not replace the full evidence set. `--before --tests=...` runs existing tests against the original cosmetic sources. These tests run unchanged in fresh Hunt matches with real THREE geometry; their common `startMatch` helper is a no-op only after the actual match has entered prep and its deployment has completed.

`--tag=name` preserves separate diagnostic/retest outputs. `--diagnose-fit` traces the launcher's actual sampled vertices to supporting body triangles; it is a read-only diagnosis, not an acceptance-test replacement.

## What the capture checks

The 29 views include front/back/sides/top/three-quarter, face/NVG/boots/vest/belt/pack, pistol and rifle aiming/crouching/running, sleeves/shorts/gloves, four hats, mask/eyewear, slung weapons, and a drawn rifle. Each view checks finite geometry, wardrobe selection, both hands' actual weapon contact points, and held-versus-carried weapon visibility. Grounded poses also check boot contact with the floor. The run uses a fixed existing gait phase. Crouch and aim use the production pose and weapon-hold functions, including their final grounding correction.

The after run compares all 18 animated joints and grip mounts, plus gear and wardrobe registries, with the saved baseline. It also evaluates 120 frames each of the existing stand, walk and run clips. Source hashes are checked again after rendering; page and shader errors fail the run. `checks.json` stores geometry counts, camera coordinates, grip distances, boot heights, source hashes and timings.

The four contact sheets and four paired comparison sheets are generated from captured PNGs. Fullbody shots contain a large unchanged background, so a low whole-image difference does not establish that the model stayed unchanged. The repository comparison tool's greater-than-3% threshold is retained unchanged.

## Final render evidence

Both 29-view runs pass; see `baseline-render.log`, `final-render.log`, and each pass's `checks.json`. The final cosmetic hashes and separately recorded whole-index/animation hashes remained unchanged throughout the final capture. All 18 original joints/mounts and wardrobe/gear registries compare exactly. All wardrobe, carry, deployed-NVG and grounded-pose checks pass. Each original clip evaluates 120 finite frames. The worst final hand-to-weapon error is below 3.68e-13 m. No page or shader errors were reported.

The full-kit front view increased from 97 visible meshes / 22,472 triangles to 105 / 30,400. Whole-scene front draw calls increased from 295 to 310, including the Training background and shadows. Geometry has deliberately increased for the new details; these counts are recorded rather than hidden behind changed thresholds.

The refreshed images include the corrected recessed eyes, conforming helmet side patch, yoke connections, genuinely deployed NVG view and restored carrier envelope. All four final contact sheets were visually inspected. The four paired before/after sheets are refreshed too. `tools/shoot.mjs --compare` completed with exit 0 across all 29 views: mean differences range from 0.16% to 2.90%, with the face closeup highest. See `compare.log` for every view. Earlier `preview-*` outputs are not final acceptance evidence.

## Performance limits

The final after sample averaged 54.18 fps over four one-second windows, with one cumulative hitch and a worst frame of 53.1 ms. The before sample averaged 29.31 fps with hitches. Boot readiness was 26.338 s before and 11.735 s after. Those differences are **not** evidence of a speed improvement or a certified loading result: another agent's `twist-probe.mjs` and Chrome were active, outside this validation task's control. Our own captures ran sequentially, but the machine was not isolated.

The 60 fps hardware budget and cold/warm loading budget remain unverified here and need Antigravity's normal GPU run. The harness measurements are indicative only.

## Existing behavior tests

The real-renderer tests use unchanged repository test files. Per-test output goes into `real-after/`; `real-renderer-tests.log` collects the initial run. The stub-renderer focused batch is in `focused-tests.log` (169 pass / 1 borderline t199 sole-height failure).

- Initial actual-renderer passes: t134 9/9, t146 43/43, t199 10/10, t224 42/42. The actual t199 walking sole probe reached -0.058 m against the unchanged > -0.06 m threshold. t224 includes real triangle-gap checks and live audio timing, with no skipped checks.
- Baseline t184: 28 pass / 1 fail, planted-foot slide 25.05% versus <25%. Initial after: 27 pass / 2 fail, slide 25.58% plus right unarmed hand-to-knee distance at the 0.35 m boundary. The final diagnostic rerun (`real-after-verified/t184.txt`) passes slide at 22.76% but retains that hand-distance failure (28 pass / 1 fail).
- `studio/marine-turn.js` changed externally during this verification window, at 04:04:48 local, between the baseline t184 result (03:53:01) and final t184 result (04:05:20). GB-149 movement work is active. Consequently this is not a controlled before/after movement comparison; the remaining boundary was sent to that owner. GP-163's 18 rig anchors remain unchanged.
- Baseline t189 has four existing gaps outside its threshold: AK left sling, Uzi left pair, M4 left sling and flamer left sling. The repaired after run reproduces exactly those four failures, with 43 pass / 4 fail across 23 carried gun/spot pairs and 21 gap checks. Its launcher-left contact passes again. No existing failure was hidden or converted to a pass.
- Tests t189 and t224 dispatch F13 on `window`, producing two DOM errors per test in `ui/prep-checklist.js:116` (`contains` receives Window rather than a Node). The same errors reproduce with the baseline model; full stacks are in `real-before/checks.json`. Ordinary model captures report no page/shader errors. The behavior-harness exit remains nonzero for these errors and the recorded test failures.

The broad verification is complete as a combined interrupted run plus resumed retries: **228 checks, 3,628 passing assertions, 8 failures, 10 timing failures cleared on retry and 8 no-assertion probes**. Remaining checks are t39 (1), t178 (2) and t182 (5), the same checks/counts as the earlier broad baseline. t178/t182 reproduce its detailed messages; the interrupted run did not print t39's detailed final message. See `combined-latest-results.json`.

`npm test` completed all initial checks and part of its retries, then exited during interruption with code 1073807364. The four remaining retries were completed with `npm test -- t170 t178 t182 t188 --jobs 1 --no-retry --all-fails`: 146 pass / 7 fail, including t188 91/0. The resumed process returned 0 because this runner does not use assertion failures as its exit status; the log remains authoritative. This is not a completed single full-suite claim. Original and resumed logs/status files are preserved separately.

The whole index and all five cosmetics stayed unchanged across both runs. External marine-turn.js changed during the original run; all tracked sources stayed stable during the resumed batch. Current fake-THREE has an inert Matrix4.transpose, so real-renderer grip/geometry checks remain necessary and separate. No expectation or acceptance threshold was changed. Final normal-GPU visual/load/FPS acceptance remains with Antigravity.

## Carrier fit regression found and repaired

The first detailed carrier lost the original extruder's outside bevel: its supporting side wall moved from x=-0.183 to x=-0.175 m. The launcher-left gap increased from 3.573 to 13.187 mm, crossing t189's 12 mm maximum. Both traces hit the carrier material (#4c5138) from the identical launcher vertex and direction; no attachment moved.

The dedicated closed carrier surface now reproduces the original outer envelope and square lower corners. The traced launcher clearance is exactly 3.573 mm again, at the same contact point. `carrier-fit-comparison.json` holds the three measurements; complete records are in `real-before-diagnostic/fit.txt`, `real-after-diagnostic/fit.txt` and `real-after-repaired/fit.txt`. `pre-carrier-render-checks.json` preserves the earlier render metadata. Only the refreshed `after/` images represent the repaired final model.
