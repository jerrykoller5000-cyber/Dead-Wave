# Antigravity AG-357 Step 1 Handoff — Shambler Fidelity Test (Shape + Noise + AO, No Textures)

**Worker:** Antigravity (`Gemini 4 Carbon`)  
**Task:** `AG-357 PRIORITY (D-207)` — Shambler fidelity test STEP 1 REDO (shape + seeded vertex noise + baked vertex AO, zero textures, review-only)  
**Verdict:** Step 1 ready for CLAUDE DIRECTOR review (holding Step 2 textures/normal/roughness/cutouts/night until Director looks).

## Changed
- Zero edits to any game or studio files (`index.html`, `studio/zombie-*.js`, `studio/rigs.js`, `game/*`).
- Review-only standalone files written/updated in `review/AG-357/` and `qa/2026-11-18-AG-357/`:
  - `review/AG-357/geo-utils.mjs` — Smooth `loftGrid`/`loftProfile`/`loftBubble`, divergence signed-volume outward winding guarantee, seeded 3D FBM vertex noise without UV seam tearing, seam-normal welding, per-bone merging (`mergeGeometries` + `mergeVertices`), baked sky/cavity AO + white-clay AO toggle (`applyWhiteAOProof`).
  - `review/AG-357/shambler-step1.mjs` — High-res (`48x42`) Catmull-Rom skull sculpt (brow ridge, deep concave orbital sockets, sharp cheekbones & sunken cheeks, recessed nasal cavity, wide screaming open jaw with TMJ hinge + upper/lower tooth rows, ears, scalp-aligned wispy hair strands), shorter SCM-tendon + Adam's-apple neck (`chin-to-collar` shortened from `0.184 m` to `0.146 m`, `neckW 0.128 m`), lathe arms (deltoid/biceps/elbow/forearm swell/thin wrist), big 5-digit 3-capsule hands, gaunt ribcage + clavicles under a separate off-body double-walled tank top shell with continuous shoulder straps (no floating chest/knee chips), worn leather belt + rectangular buckle, cargo pocket, left knee bulge + stacked ankle cuff folds over tan lace-up boots, Tripo flat base colors, live hunched Tiny Trek shamble pose (`armL -0.78`, `armR -0.56`, forward spine hunch, open moving jaw).
  - `review/AG-357/01-shambler-step1-sheet.jpg` — Same 4x5 layout (`OURS NOW` | `PROTOTYPE Step 1 A-pose` | `PROTOTYPE Step 1 Shamble` | `TRIPO REF` across `front`, `3q`, `side`, `back`, `head` close-up, `WebGPUBackend`, `H = 1.800 m`).
  - `review/AG-357/02-shambler-step1-white-ao-proof.jpg` — Plain white clay (`0.94 * AO^1.3`) proof renders proving vertex noise bumps & baked AO creases (`A-pose` front/3q/side/back/head + `Shamble` 3q/side/head).
  - `review/AG-357/shambler-tripo-vs-proto-overlay.jpg`, `shambler-ours-vs-proto-overlay.jpg`, `shambler-ours-vs-tripo-overlay.jpg` — Fixed silhouette overlay titles (`shambler: ...`, zero `spitter:` mislabels).

## Tests
- `node --check` passed on `geo-utils.mjs`, `shambler-step1.mjs`, `capture-step1.mjs` (`0` errors).
- Slot run (`node qa/2026-11-18-AG-357/capture-step1.mjs`, `WebGPUBackend`): exited `0`, `28` PNG frames + exported `step1-a-pose.glb` & `step1-shamble.glb` (`21,060` tris, `29` bone meshes, `2` materials, `0` textures).
- `measure_shambler.py` at `H = 1.800 m` (`tripo-vs-proto.json` / `ours-vs-proto.json`):
  - `head width`: `0.202 m` (Tripo `0.216 m`, current `0.252 m`)
  - `head height (chin to top)`: `0.192 m` (Tripo `0.188 m`, current `0.162 m`)
  - `neck width`: `0.128 m` (Tripo `0.132 m`, current `0.192 m`)
  - `neck length`: `0.146 m` (was `0.184 m`, Tripo `0.122 m`, current `0.152 m`)
  - `shoulder width / slope`: `0.556 m / 51.9 deg` (Tripo `0.546 m / 48.4 deg`)
  - `chest depth`: `0.242 m` (Tripo `0.256 m`, current `0.320 m`)
  - `waist width / hip width`: `0.330 m / 0.416 m` (Tripo `0.306 m / 0.418 m`)
- All output sheets, overlays, and full-res head close-ups visually inspected via `read_file`.

## Next
- Hold for CLAUDE DIRECTOR Step 1 approval before connecting Step 2 (`review/AG-357/textures-step2.mjs`: procedural CanvasTextures, normal maps, roughness maps, `alphaTest` cutouts, night lighting).

## Not verified
- Procedural Step 2 CanvasTextures, normal maps, cutouts, night light, and Step 3 30-shambler 5080 FPS benchmark (awaiting Step 1 look before Step 2).
