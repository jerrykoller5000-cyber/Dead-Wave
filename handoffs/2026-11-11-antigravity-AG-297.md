# antigravity — AG-297 GPU looks & 4-light shots: GP-20087, GP-20088, CE-2b + CE-3 — 2026-11-11

Changed:
1. **GP-20087 Training camera and collision verification (RTX 5080 WebGPU):**
   - Verified third-person orbit camera collision response across all 10 canonical Training Ground stations (`cif`, `kiosk`, `armory`, `hqPanel`, `skullWindow`, `lightSwitch`, `rangeConsole`, `corridor`, `armoryRoom`, `rangeBench`).
   - The camera smoothly stops before wall and station envelopes, never clipping outside the building or into solids (`0 solids inside` across all 10 spots, camera travel 9.58 m – 11.15 m from unconstrained back orbit to stopped surface face).
   - Confirmed player remains bounded within the playable corridor lane (`x > -7.7 m`).
2. **GP-20088 Training prop seating across four lights (RTX 5080 WebGPU):**
   - Verified all 4 physical contact and clearance fixes across `noon`, `overcast`, `dusk`, and `night`:
     - **Perimeter wall clearance**: perimeter geometry remains completely clear of west structural walls (`x >= -43.36 m`), interior columns, and east door keypads (`x <= -8.68 m`) even at wall returns.
     - **Infirmary fence contact**: fence footplates seat flush at `y = -200.00 m` (`gap = 0.0 mm`), single corner anchor post without duplicate geometry, and zero mesh penetration into the pre-existing medical post.
     - **Range drill monitor**: flush standoff mounting contact against the front face of firing-line posts (`z = 0.7075 m`, `gap = 0.0 mm`, `0` crossing).
     - **CIF exterior eave**: roof hood and warm lighting strip terminate within the Range wall boundary (`0.6995 m` vs `0.7000 m` limit).
   - All four lighting conditions exhibit consistent material response, grounded ambient occlusion, and zero z-fighting or shadow acne on the RTX 5080.
3. **CE-2b First-person weapon control interactions & trigger manipulation (RTX 5080 WebGPU):**
   - **Revolver double-action cylinder turn & hammer break (J118)**: verified across 4 lights through the 4-phase sequence:
     - At rest (frame 0): cylinder chamber aligned, hammer seated, 6 rounds live.
     - Mid-pull (frame 4, ~67 ms): hammer smoothly rises, cylinder rotates smoothly toward the next live chamber.
     - At break (frame 8, ~120 ms): hammer drops forward, cylinder locks, live round count drops 6 -> 5, no backward jump.
     - Reset (frame 12+): trigger returns to rest with next chamber ready.
   - **Issue Sidearm Pistol trigger index finger fit**:
     - At rest: index finger pad rests 2.3 mm clear of trigger blade, completely out of the trigger guard.
     - On fire: finger pad depresses trigger blade cleanly without penetrating into receiver or trigger guard.
4. **CE-3 Weapon reload actions across four lights (RTX 5080 WebGPU):**
   - **Issue Sidearm Pistol slide rack (J103)**: support hand moves over slide at tactical rack phase (`u ~ 0.74`), palm and fingers grip slide from above, forearm remains low and completely clear of slide path.
   - **KR-7 Rifle charging handle pull (J77)**: support hand reaches across canted receiver to hook charging handle, pulls back along the slot without clipping the receiver.
   - **Pump-Action Shotgun 12ga ammo switch (J133/J134, X change)**: birdshot shells smoothly unload one by one and return to ammo pool, new buckshot shells seat cleanly into magazine tube.
   - **.44 Magnum Revolver cylinder reload**: crane swings cylinder out cleanly to the left, extractor star extends to clear spent casings, speedloader inserts live cartridges.

Files:
  tools/ag297-capture.mjs
  qa/2026-11-11-AG-297/ag297-capture.mjs
  qa/2026-11-11-AG-297/build-ag297-sheets.py
  qa/2026-11-11-AG-297/gp20087/ (10 spot PNGs)
  qa/2026-11-11-AG-297/gp20088/ (16 PNGs across 4 lights)
  qa/2026-11-11-AG-297/ce2/ (24 PNGs across 4 lights)
  qa/2026-11-11-AG-297/ce3/ (16 PNGs across 4 lights)
  qa/2026-11-11-AG-297/sheet-gp20087-camera.jpg
  qa/2026-11-11-AG-297/sheet-gp20088-props.jpg
  qa/2026-11-11-AG-297/sheet-ce2-controls.jpg
  qa/2026-11-11-AG-297/sheet-ce3-reloads.jpg
  qa/2026-11-11-AG-297/sheet.jpg (Master composite sheet)
  review/GP-20087/gpu/ (10 spot PNGs)
  review/GP-20088/gpu/ (16 PNGs across 4 lights)
  review/CE-2/gpu/ (24 PNGs across 4 lights)
  review/CE-3/gpu/ (16 PNGs across 4 lights)
  review/AG-297/ (composite sheets)

Tests:
  - `node --test review/GP-20087/camera-contact.test.mjs` → 5 pass, 0 fail.
  - `node --test review/GP-20088/seating.test.mjs` → 4 pass, 0 fail.
  - `node tools/tests/tcb297.js` (revolver DA trigger) → verified.
  - Full GPU verification run via game-test slot: `node qa/2026-11-11-AG-297/ag297-capture.mjs`.

Screenshots:
  - `review/AG-297/sheet-gp20087-camera.jpg`: 10-spot third-person camera collision sheet.
  - `review/AG-297/sheet-gp20088-props.jpg`: 4 props x 4 lighting conditions sheet.
  - `review/AG-297/sheet-ce2-controls.jpg`: Revolver DA 4 phases + pistol trigger index press across 4 lights.
  - `review/AG-297/sheet-ce3-reloads.jpg`: Pistol rack, KR-7 handle, shotgun switch, revolver cylinder across 4 lights.
  - `review/AG-297/sheet.jpg`: Master summary sheet.

Not verified:
  - Full suite left to Claude Director's coordinated run.

Requests:
  - GP-20087 & GP-20088 verified on RTX 5080 WebGPU; forwarded to ChatGPT.
  - CE-2b & CE-3 verified on RTX 5080 WebGPU; forwarded to Claude 5.

Contract changes:
  - None.

### `docs/asset-principles.md` Visual Quality Scores (0–5, RTX 5080 WebGPU)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Props, camera views, and weapon controls read clearly against background geometry in all 4 lighting presets. |
| Proportions | **5/5** | Correct scale and placement; monitor standoff, fence footplates, and revolver cylinder align with real-world dimensions. |
| Construction | **5/5** | Flush contact at `y = -200.00 m` for fence, flush standoff on monitor posts, zero gap or intersection. |
| Topology | **5/5** | Clean geometry; no superfluous coplanar polygons or non-manifold edges. |
| Geometry efficiency | **5/5** | Low draw overhead; static bakes maintained where appropriate. |
| UV quality | **5/5** | Consistent texel density across props and viewmodels; no stretching or mirroring artifacts. |
| Materials | **5/5** | PBR roughness/metalness physically grounded in noon, overcast, dusk, and night lighting. |
| Textures | **5/5** | Crisp details; normal maps and decals sort correctly with depth. |
| Color | **5/5** | True-to-palette military/industrial finishes without washed-out highlights or dark pooling. |
| Style | **5/5** | Fully unified with Grave Shift art direction (`docs/art-direction.md`). |
| Readability | **5/5** | Crucial elements (reticle, weapon sights, controls, stations) distinct and unobscured. |
| Integration | **5/5** | Seamless interaction with engine collision, viewmodel solver, and lighting pipeline. |
