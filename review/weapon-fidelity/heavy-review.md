# GP-164 heavy weapon implementation and CPU evidence

`studio/weapon-heavy.js` exports the six requested context-based constructors. `heavy-source.json` lists the exact material/helper dependencies and source hash. The original six constructors were copied unchanged into `heavy-baseline-constructors.json` before implementation. No gameplay, animation, scale, grip, ammunition-capacity or test-expectation change is included.

## Reference interpretation

All eight corresponding AG-Weapons JPGs and handoffs AG-62/AG-63 were inspected. The minigun has a round olive ammunition drum, machined barrel retainers, a connected feed belt and vented receiver panels. The launcher uses six open chambers with recessed olive noses and narrow yellow bands, clean top surfaces and no rail, flip-up sight or lettering. The flamer has plain shaped access panels, an actual perforated steel heat shield, tank straps and a hose terminating at the body and tank fittings. The chainsaw has a revised engine shell, clutch panels, chain rivets and shaped moving cutters.

The mortar keeps the tube and root orientation, with a ribbed baseplate, hollow collars, aiming wheel, clamp, bipod sleeves and feet. Its carried version has folded legs and binding wraps within the original carry bounds. All parts respect `matOverride`, including translucent placement previews. The M240 has a perforated barrel jacket, receiver details, linked cartridges between can and receiver, leg braces and telescoping collars. Its carried model folds the tripod forward, binds the legs and omits the deployed ammunition can. `M240_PIVOT` is read only inside its constructor.

## Checks run

- `node --check studio/weapon-heavy.js` exited 0.
- `node review/weapon-fidelity/heavy-audit.mjs` exited 0: eight actual-THREE variants, unchanged userData references/base transforms/muzzle points, finite geometry and ghost material support. Results are in `heavy-audit.json`.
- `node review/weapon-fidelity/heavy-fake-smoke.mjs` exited 0: all eight variants also construct with the repository's FakeThree and retain those animation contracts.
- Custom drum and heat-shield geometry has zero reversed triangles, zero degenerate triangles and unit normals within 3e-8. Launcher face probes passed at 9,345 solid sample points and 4,676 open chamber sample points. All six round noses stop at drum-local z=0.058, behind the z=0.065 front face. Sector corners and near-zero seam coordinates were corrected during this audit.
- Bright rendered review exposed a coplanar decorative rim on the launcher. The rim now stands 1.5 mm proud of each drum face; 432 assembled front/back ray probes verify clear depth separation. This changes no whole-weapon bounds, geometry counts or animation references. Both CPU audits were rerun after this repair.

Final visible model mesh counts before/after are minigun 14/15, launcher 11/12, flamer 16/17, chainsaw 31/31, mortar 8/14, carried mortar 7/16, M240 11/12 and carried M240 11/11. The corresponding triangle counts are recorded in the audit JSON; all eight models are below 12,000 triangles. The carried mortar retains its complete original bounds; the carried M240 is narrower. Handheld longitudinal limits and all muzzle points are preserved. The flamer's flat tank straps retain the old support radius exactly. Its buckle extends its side by 3 mm; the deployed mortar foot extends forward by 1.9 mm, and the deployed M240 foot extends one lateral bound by 11.6 mm. Those are cosmetic fitted details, not placement or collision changes.

## Construction cost

`node review/weapon-fidelity/heavy-constructor-bench.mjs` constructs all 18 before/after weapon variants using actual THREE and the original shared helper implementations. It performs three warm sets and ten measured sets per version, alternates the measured order, creates 468 independent roots and records all assets' mesh/triangle/vertex counts and finite geometry. Sources stayed unchanged during measurement.

The final median total constructor time per 18-model set was 23.65 ms before and 53.53 ms after (mean 23.53/54.48 ms). Complete samples and final source hashes are in `heavy-constructor-bench.json`, refreshed after the parent froze all three modules. The eighteen visible variants total 203/231 meshes and 52,370/119,218 triangles before/after. Including hidden accessories and effects, allocated totals are 256/285 meshes, 57,034/127,014 triangles and 166,737/373,648 vertices. All geometry is finite and source hashes remained unchanged during the run.

This measures CPU construction only, excluding inspection/disposal and any renderer. The machine is shared, and the parent was running a separate camera contact check during this measurement. These numbers establish neither full loading performance nor GPU/frame-rate acceptance.

## Rendered review

All sixteen parent-captured heavy side/three-quarter world views were inspected, along with the bright reverse views. The brighter launcher view revealed the rim defect repaired above. The M240 reverse view shows its belt joining the receiver and can; the carried legs fold and bind beneath the receiver. The flamer perforations, hose endpoints, tank bands and blank panels read cleanly.

An apparent offset second mortar tube occurred only with the temporary photo sphere and lights. `heavy-mortar-trace.mjs` compares the complete actual-THREE mesh trees: original and revised outer tube/bore have identical positions, bounds and orientation, with a single exterior cylinder. Parent's `mortar-world-reverse.png` confirms one correctly aligned tube when that photo setup is disabled. No mortar production change was needed; the parent is replacing the temporary photo setup for final evidence.

Final before/after screenshots, integration tests and hardware acceptance are coordinated by the parent task. No browser, camera, git or production files outside `studio/weapon-heavy.js` were touched by this subtask.

After final runtime checks, the parent requested a read-only flamer sling diagnosis. The newly reported t189 right-side gap is a vertex-sampling miss: the existing smooth receiver triangle is only 2.336 mm from the supporting stowed weapon, slightly closer than the old rail sample. Full coordinates, reproduction and the still-reported test failure are in `heavy-fit-review.md` and `heavy-fit-comparison.json`. One isolated camera geometry export was used for this later investigation; no production or test change was made.
