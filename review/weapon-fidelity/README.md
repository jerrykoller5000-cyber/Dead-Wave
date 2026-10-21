# GP-164 — AG weapon designs implemented

All 16 weapon types are updated from the latest JPG designs in review/weapon-photos/AG-Weapons. The M240 and mortar each include carried and deployed forms, giving 18 visual variants. This is the October 9 pass; older loose JPGs and index.html in this review folder belong to an earlier task.

## Review images

- preview/sheet.jpg: the final 16-weapon overview.
- studio/: 54 final side, front-quarter and opposite-quarter images.
- before/ and after/: 36 paired world images using the saved before-camera coordinates.
- final-capture-manifest.json: image timestamps/hashes and the three final model source hashes.

Captured with tools/camera.mjs on the NVIDIA RTX 5080 renderer. The isolated studio adds temporary fill light and hides the world. Its visibility wrapper restores the original hidden reload/upgrade pieces that the camera's generic bare view exposes; game visibility code is unchanged. Root reviewed the final overview, AA-12 contact detail, and all earlier detail views, including both sides of the mortar, launcher, sniper, shotgun and revolver.

## Model work and preserved contracts

The 15 original constructors in index.html now delegate to three private studio modules. Sidearms gain shaped slides/frames/grips, a fluted revolver cylinder, folded Uzi stock and ground blade geometry. Longarms gain shaped furniture, receiver details, open handguard vents, magazine/drum details and a correctly placed AA-12 support surface. Heavies gain connected feeds, real launcher chamber openings, a perforated flamer shield, moving chainsaw teeth and detailed support hardware.

The launcher's six gameplay chambers remain six despite the art's seven-hole sketch. The sniper grip stays behind the magazine; revolver markings/medallions and launcher rails/sights were omitted per the design notes. No gameplay stats, ammo counts, input, reload logic, grip/muzzle anchors, carry or weapon scale tables changed. Moving-object references and transforms match baseline. Pistol/Uzi magazines are bit-identical; other magazine surfaces changed without moving their animation roots.

## Validation and limitations

- node --check passes for all three modules and the browser harness. check-players: 287 reads, all allowed.
- sidearms-audit.mjs, longarms-audit.mjs and heavy-audit.mjs pass using actual THREE and the original merge helpers. All 18 variants are finite; animated contracts remain identical. FakeThree construction smoke checks also pass.
- Final real-renderer audit passes: geometry finite, original animation references intact, hold/size/carry tables identical. Source fingerprints are in after-audit.json.
- Focused npm run: 15 checks, 501 pass / 5 fail; after fixing the AA-12 grip, t188 rerun is 90 pass / 1 fail (flamer aim, 2.84 degrees). The combined latest focused results are 502 pass / 4 fail, not a single full-suite run. Logs: targeted-tests.log and final-grip-tests.log. No tests or expectations were changed.
- Real renderer: t146 wardrobe/camo 43/0; t196 melee 17/0; t217 suppressors 54/0; t218 reloads 66/0; t221 sniper bolt 28/0. t217/t218 were recorded before the final static AA-12 palm-rib addition, with their exact source hashes retained; their moving parts did not change afterward.
- Real t188 is 114/7 both before and after: the same prior M4/AK/shotgun/sniper/flamer aim and two chainsaw hand failures. The new AA-12 failure was corrected: nearest vertex 55.4 to 24.6 mm, actual exposed underside 30.8 mm against the 35 mm limit.
- Real t189 is 43/4 before and 42/5 after. Four prior carry gaps remain. The additional right-flamer failure is sparse vertex sampling: its actual receiver surface is 2.336 mm from the support, versus 2.568 mm before. See heavy-fit-review.md and the reproducible exported-triangle comparison.
- Real t224 is 42/0 before and 41/1 after. The additional right-revolver failure is also sparse sampling: sampled 16.480 mm, but all-vertex actual contact is 3.528 mm versus 9.340 mm before; the continuous surface nearest the original contact gives 9.706 mm, below the unchanged 15 mm limit. Left clipping also improves. See sidearms-fit-review.md. Raw failing outputs remain intact.
- FakeThree failures t196 and t218 (plus Cursor's t146 report) reproduce independently of weapon geometry: CL-136 cloneLean exercises missing Mesh.copy geometry/material behavior and Box3.applyMatrix4 support. Actual renderer t146/t196/t218 passes. Proof: sidearms-harness-diagnosis.json; owners notified.
- Synthetic F13 events trigger the preexisting ui/prep-checklist.js:116 contains(non-Node) exception in both before and after behavior runs. Normal image/performance capture has no runtime errors.

With 48 visible zombies, offscreen timer-mode FPS is pistol 30.02 to 30.04, M4 29.28 to 29.72, minigun 30.17 to 29.85. This is a comparative sample around the offscreen limit, not proof of the normal 60 FPS budget. Final 18-constructor CPU median is 23.65 to 53.53 ms (+29.88 ms); visible aggregate meshes 203 to 231, triangles 52,370 to 119,218. This includes all 18 model variants and is not one gameplay frame. Full samples/source hashes are in heavy-constructor-bench.json and the two performance JSON files.

Full final-source npm integration, cold/warm title timing, independent visual acceptance and normal visible 60 FPS acceptance remain with the crew. CU-98 boots and CL-136 clone changes landed during this task; CU-99 turn work is concurrent. All were preserved, so the performance comparison is not an isolated weapon-only benchmark. Claude/Cursor/Grokbot received integration/fit-test reports; Antigravity received the visual/performance request. No git operations or test-expectation changes were made by this task.
