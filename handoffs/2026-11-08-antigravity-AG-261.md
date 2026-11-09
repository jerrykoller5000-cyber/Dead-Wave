# Antigravity — AG-261 GP-20063 independent model & FP/TP review on RTX 5080 — 2026-11-08

Changed: Independently reviewed GP-20063 models on Jerry's RTX 5080 WebGPU hardware: Breacher-12 selector lever, rotary gun 1.040m, flamer 1.293m, and chainsaw 0.971m. Measured FP socket offsets and TP held/carried sizing, compositing a 16-panel review sheet and metrics JSON.
Files: `tools/ag-review-gp20063.mjs`, `qa/AG-261/*`, `qa/AG-261/gp20063-ag-review-sheet.jpg`, `qa/AG-261/metrics.json`.
Tests: Executed `tools/ag-review-gp20063.mjs` through shared slot `node crew/crew.mjs slot run antigravity AG-261 ...` → exit code 0, 0 WebGPU page errors, 0 Three.js exceptions.
Screenshots: Master 16-panel contact sheet `qa/AG-261/gp20063-ag-review-sheet.jpg`; Gunshot selector close-up `qa/AG-261/aa12-selector-close.png`; FP captures `qa/AG-261/{aa12,minigun,flamer,chainsaw}-fp-{hip,ads}.png`; TP held `qa/AG-261/{aa12,minigun,flamer,chainsaw}-tp-held.png` & `tp-hands.png`; TP slung carry `qa/AG-261/{aa12,minigun,flamer,chainsaw}-tp-carried.png`.
Not verified: Claude's pending socket retune for rotary left glove and chainsaw ADS elevation; full suite `npm test` left to committer per Rule 7/8.
Requests: Answered ChatGPT's GP-20063 request with DONE; highlighted action items for Claude's D-122 integration pass (minigun sockets & WEAPON_HOLD, chainsaw ADS framing & WEAPON_SIZE.chainsaw.len).
Contract changes: none.
Family: military/industrial hardware. Scores (0-5): Breacher 5/5/5; Rotary 4/4/2 (LH float); Flamer 5/5/5; Chainsaw 4/4/2 (ADS blade occluded).
Rule 16: Review ran through the shared game-test slot under single-instance WebGPU allocation on Jerry's PC.

---

### Detailed Findings

#### 1. Breacher-12 (`aa12`)
- **Geometry & Proportions**: 14,116 triangles, 0 floating parts, 0 browser errors. Bounding box `[-0.106, -0.284, -0.397]` to `[0.106, 0.123, 0.668]`, length = 1.065 m held.
- **Left Receiver Thumb Selector**: Verified in Gunshot close-up (`qa/AG-261/aa12-selector-close.png`). Lever and dial seat properly on the left receiver wall directly above the pistol grip tang, indexed cleanly to manual specifications with distinct SAFE, SEMI, and AUTO notches and central pivot rivet.
- **First-Person View**: Hip and ADS sight picture down the ghost ring / blade front sight is crisp and centered. `muzzleLocal` is `[0, 0.015, 0.98]`.
- **Third-Person Held**: Stance twist 0.8 rad. Right hand at grip `[0, -0.145, -0.166]`, left hand cupping lower handguard at `[0, -0.035, 0.36]`. Scale factor = 0.7604.
- **Third-Person Carried**: Slung cleanly across marine back (`qa/AG-261/aa12-tp-carried.png`); drum magazine sits flush without clipping into the pack or carrier vest.

#### 2. Rotary Gun (`minigun`)
- **Geometry & Proportions**: 13,188 triangles, 0 floating parts. Bounding box `[-0.203, -0.161, -0.350]` to `[0.182, 0.234, 0.690]`, length = 1.0396 m (~1.040 m, -30% scale).
- **Side Peg Anchors**: Scaled side-peg centre is `[-0.2128, 0.0084, 0.112]` with 36 mm diameter. Rear grip centre is `[0, -0.0119, -0.364]`.
- **First-Person Left Glove Miss (Known Defect)**:
  - In `game/viewmodel-poses.js`, `VM_SOCKETS.minigun.support` remains at the old unscaled position `[-0.304, 0.012, 0.16]`.
  - Offset delta: $\Delta x = -91.2\text{ mm}$, $\Delta y = +3.6\text{ mm}$, $\Delta z = +48.0\text{ mm}$ (total 3D miss: $103.2\text{ mm}$).
  - In `qa/AG-261/minigun-fp-hip.png`, the left support glove visibly floats ~10 cm into thin air to the left of the side peg. Rear firing hand tang contact is solid.
- **Third-Person Held**:
  - `WEAPON_HOLD.minigun` still references `fore: [-0.304, 0.012, 0.16]` and `grip: [0, -0.017, -0.52]`.
  - In third person (`qa/AG-261/minigun-tp-hands.png`), the support hand reaches outward to the old 1.485 m peg location, missing the scaled peg by ~10 cm.
- **Third-Person Carried**:
  - Minigun has no `WEAPON_SIZE` entry (retains raw 1:1 scale). Held and carried scale factor is 1.0. At 1.040 m it rides high and compact on the marine's back without dragging soil.

#### 3. Flamer (`flamer`)
- **Geometry & Proportions**: 12,628 triangles, 0 floating parts. Bounding box `[-0.100, -0.175, -0.277]` to `[0.178, 0.112, 1.015]`, length = 1.2926 m (~1.293 m, +224 mm wand stretch). Hand points retained (`grip: [0, -0.078, -0.157]`, `support: [0, -0.07, 0.28]`). `muzzleLocal.z` is 0.998.
- **First-Person View**:
  - Both hands remain firmly planted on the rear pistol grip and forward vertical grip.
  - The extended burner tube and bell nozzle extend gracefully into the lower viewport without obstructing the ADS aim sightline.
  - Multi-light WebGPU inspection (Noon, Overcast-Rain, Dusk, Night-Flashlight) confirmed rich burner shroud speculars and zero clipping.
- **Third-Person Held & Carried**:
  - Held pose is clean with proper grip alignment.
  - Carried slung gear: `WEAPON_SIZE.flamer` currently has `len: 1.094` in `index.html`. Size factor formula yields $f = (0.95 \times 1.05 \times 0.91944) / 1.094 = 0.8385$, rendering the slung flamer at 1.084 m on the pack. Visually clean, but `WEAPON_SIZE.flamer.len` should be updated to 1.293 m to match the new builder length.

#### 4. Chainsaw (`chainsaw`)
- **Geometry & Proportions**: 8,952 triangles, 0 floating parts. Bounding box `[-0.141, -0.088, -0.405]` to `[0.175, 0.214, 0.566]`, length = 0.9708 m (~0.971 m, guide bar and chain shortened by 0.71x). `muzzleLocal.z` is 0.696 (was 0.940).
- **First-Person Hip View**: Both rear throttle and top hoop wrap grips maintain contact. However, the guide bar is visibly foreshortened, barely extending past the forward glove.
- **First-Person ADS View (Known Defect)**:
  - In `qa/AG-261/chainsaw-fp-ads.png`, the guide bar and cutting teeth are **100% occluded** behind the bulky engine cowling and muffler body.
  - As requested of Claude, `VM.chainsaw` ADS camera elev/pitch or model offset must be retuned to lift the blade into view per Jerry's J60 guideline.
- **Third-Person Carried (Stale Scaling Defect)**:
  - In `index.html`, `WEAPON_SIZE.chainsaw` still lists `len: 1.715` (from the old long bar).
  - This calculates a scale factor of $f = (0.85 \times 1.2 \times 0.91944) / 1.715 = 0.5468$.
  - In `qa/AG-261/chainsaw-tp-carried.png`, the slung chainsaw shrinks down to **0.531 m** (excessively tiny on the backpack).
  - Updating `WEAPON_SIZE.chainsaw.len` from 1.715 to 0.971 in `index.html` will fix the third-person pack scale.

---

### Four Lighting Environments Verification
All four weapons were verified across the 4 game lighting presets on Jerry's RTX 5080 WebGPU:
1. **Noon** ($t=0.42$, rain off): Clean daylight speculars on metallic receivers, crisp shadow maps.
2. **Overcast-Rain** ($t=0.50$, rain intensity 1.0): Wet reflection sheen, diffuse sky murk, dynamic raindrop streaks.
3. **Dusk** ($t=0.74$, rain off): Warm amber horizon lighting, high-contrast weapon silhouettes.
4. **Night-Flashlight** ($t=0.00$): Flashlight cone illumination, crisp shadows cast from weapon furniture.

### Action Items for Claude (D-122 Integration Pass)
1. **Rotary Gun Sockets**:
   - Update `VM_SOCKETS.minigun.support` to `[-0.2128, 0.0084, 0.112]` (eliminates 103 mm glove float).
   - Update `VM_SOCKETS.minigun.grip` to `[0, -0.0119, -0.364]`.
   - Update `WEAPON_HOLD.minigun.fore` to `[-0.2128, 0.0084, 0.112]` and `grip` to `[0, -0.0119, -0.364]` (fixes third-person support hand).
2. **Chainsaw ADS Framing**:
   - Retune `VM.chainsaw` ADS pose/camera elevation so the shortened 0.971 m guide bar remains visible over the engine housing.
   - Update `WEAPON_SIZE.chainsaw.len` from 1.715 to 0.971 in `index.html` (resolves 0.531 m shrunken pack carry).
3. **Flamer Carry Length**:
   - Update `WEAPON_SIZE.flamer.len` from 1.094 to 1.293 in `index.html` to align third-person carried size with builder.
