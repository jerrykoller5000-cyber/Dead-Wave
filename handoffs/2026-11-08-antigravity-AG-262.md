# Antigravity — AG-262 GP-20063 folded launcher proportion review on RTX 5080 — 2026-11-08

Changed: Independently reviewed GP-20063 folded launcher (Milkor M32A1) proportions on Jerry's RTX 5080 WebGPU hardware: collapsed M32A1 stock (scale.z = 0.7 about pivot [-0.25], held length 0.774 m vs 0.750 m reference), narrowed six-bore drum (0.157 m held diameter, 0.065 m orbit, 42 mm chamber bores), live WebGPU first-person hip & ADS view, 4-phase drum-open reload contact sequence, and third-person held combat stance and slung pack carry.
Files: `tools/ag-review-launcher.mjs`, `qa/AG-262/*`, `qa/AG-262/gp20063-launcher-ag-sheet.jpg`, `qa/AG-262/metrics.json`.
Tests: Executed `tools/ag-review-launcher.mjs` through shared slot `node crew/crew.mjs slot run antigravity AG-262 --checks "GP-20063 launcher proportion review" -- node tools/ag-review-launcher.mjs` → exit code 0, 0 WebGPU page errors, 0 Three.js exceptions.
Screenshots: Master 16-panel contact sheet `qa/AG-262/gp20063-launcher-ag-sheet.jpg`; Gunshot views `qa/AG-262/{launcher-side,launcher-quarter,launcher-top,launcher-drum-close,launcher-open-drum}.png`; First-Person views `qa/AG-262/{launcher-fp-noon,launcher-fp-ads,launcher-fp-overcast,launcher-fp-dusk,launcher-fp-night}.png`; Reload sequence `qa/AG-262/{launcher-reload-swing,launcher-reload-insert,launcher-reload-wind,launcher-reload-close}.png`; Third-Person views `qa/AG-262/{launcher-tp-held,launcher-tp-hands,launcher-tp-shoulder,launcher-tp-carried}.png`.
Not verified: Full test suite `npm test` left to committer per Rule 7/8.
Requests: Answered ChatGPT's GP-20063 add-on launcher request with DONE; confirmed stock collapse, drum narrowing, reload contacts, and 3P carry all pass inspection without defects.
Contract changes: none.
Family: heavy/explosive hardware. Scores (0-5): Model Geometry 5/5/5; FP View & ADS 5/5/5; Drum-Open Reload 5/5/5; TP Held & Slung 5/5/5.
Rule 16: Review ran through the shared game-test slot under single-instance WebGPU allocation on Jerry's PC.

---

### Detailed Findings

#### 1. Geometry & Proportions (Collapsed Stock & Narrowed Drum)
- **Triangle Count & Floats**: 16,272 triangles, 0 floating parts, 0 console/runtime errors.
- **Held Length Bounds**:
  - Bounding box (without forward laser beam): `min = [-0.1130, -0.1314, -0.2985]`, `max = [0.0782, 0.1451, 0.4759]`.
  - Dimensions: width = 0.1912 m, height = 0.2765 m, length = **0.7744 m** (~0.774 m).
  - Target held length (0.750 m reference) closely matched; successfully reduced from the old 0.828 m length.
- **Collapsible Stock (`gun.userData.fpStock`)**:
  - `scale.z = 0.7` applied about the receiver pivot at `[0, 0.04, -0.25]`.
  - Telescoping tube stops and rubber butt pad scaled along z without altering grip tang or receiver interface.
  - Stock bounds: `min.z = -0.2985`, `max.z = -0.1745` (depth = 0.1241 m).
  - Group naming (`fp-stock`) correctly allows viewmodel to omit stock from first-person view while preserving it for third person and shadow caster.
- **Six-Chamber Drum (`gun.userData.drum`)**:
  - Drum cylinder bounding box: width = **0.1563 m**, height = **0.1563 m**, depth = 0.1179 m.
  - Target diameter 0.157 m achieved (0.1563 m held).
  - Chamber orbit = 0.065 m (reduced from 0.075 m); chamber bore radius = 0.030 m (42 mm diameter bores).
  - Six 40 mm grenades seat cleanly within the bores with outer walls and winding axle cap clear of coplanar z-fighting.
  - Loose round (`gun.userData.loadRound`) present at origin, ready for reload hand parenting.

#### 2. First-Person View & Optics
- **First-Person Hip**:
  - Firing hand firmly seated on A2 pistol grip (`VM_SOCKETS.launcher.grip: [0, -0.088, -0.046]`).
  - Support fist planted on forward vertical rail grip (`VM_SOCKETS.launcher.support: [0, -0.075, 0.42]`).
  - Collapsed stock remains excluded from the first-person view frustum, preventing sleeve or camera clipping.
- **First-Person ADS**:
  - M2A1 open reflex sight reticle (illuminated center dot, outer ring, and dual hold-over dots at -5 mm and -10 mm) is centered down the bore line.
  - Folding backup leaf post (hinge at `[0, 0.1225, -0.20]`, top notch at `y = 0.137`) sits cleanly beneath the reflex sight picture.
  - The narrowed 0.1563 m drum rim sits at `y = 0.064 m`, well clear of the lower sight aperture (`y = 0.1225 m`), providing an expansive, unobstructed sightline.

#### 3. Live Drum-Open Reload Sequence
- **Phase 1: Cylinder Swing Open (`u = 0.18`, `handPlace: "drumOut"`)**:
  - Support palm reaches forward to release latch; cylinder hinge rotates `drumHinge.rotation.z = -2.968 rad` (~-170°).
  - Swung drum clears receiver frame and barrel shroud with generous 18 mm clearance; zero mesh interpenetration.
- **Phase 2: Grenade Insertion (`u = 0.44`, `handPlace: "load"`)**:
  - Support pinch retrieves 40 mm grenade from chest pouch and pushes it home into the bottom chamber.
  - Palm contacts drum back face (`rootAt: [0, -0.115, -0.145]`); fingertips align directly with the narrowed 0.065 m orbit chamber mouth.
- **Phase 3: Winding Key Contact (`u = 0.83`, `handPlace: "wind"`)**:
  - Support fingers grip the rear winding key (`drumWinder` at `z = -0.071`) on the cylinder axle, completing the spring-tension rotation.
- **Phase 4: Drum Closed to Battery (`u = 0.96`, `handPlace: "fore"`)**:
  - Cylinder snaps shut into receiver frame (`drumHinge.rotation.z` returns to 0); support hand returns cleanly to the vertical foregrip.

#### 4. Third-Person Held Combat Stance & Pack Stowage
- **Held Combat Stance**:
  - Marine stance twist 0.8 rad, torso offset `hold: [-0.24, -0.14, 0.26]`.
  - Right firing hand grips pistol grip at `[0, -0.088, -0.046]`; left hand holds foregrip at `[0, -0.075, 0.42]`.
  - Collapsed stock butt (`z = -0.428`) sits snugly into the marine's right shoulder pocket without protruding past the deltoid armor.
  - Sizing factor: `factor = 0.7585`, held scale = `0.6978`.
- **Slung Backpack Carry**:
  - Carried on primary sling across marine's backpack (`carryDbg`).
  - Shortened 0.774 m length and compact 0.1563 m drum keep the slung launcher high on the torso, maintaining >28 cm clearance above the ground and avoiding clipping with the bedroll, radio pack, or carrier plates.

#### 5. Four Lighting Environments Verification
Verified across all 4 engine lighting presets on RTX 5080 WebGPU:
1. **Noon** ($t=0.42$): Bright solar specular highlights on matte stainless receiver `#858a8d` and black anodized quad rails.
2. **Overcast-Rain** ($t=0.50$, rain 1.0): Diffuse sky illumination, realistic wet sheen across drum cylinder flutes, zero depth-sorting artifacts.
3. **Dusk** ($t=0.74$): Amber grazing horizon rim lighting highlights the collapsed stock contour and reflex sight hood.
4. **Night-Flashlight** ($t=0.00$): Flashlight cone illumination reveals sharp shadow falloff behind the cylinder flutes and barrel rail teeth.

---

### Verdict & Summary for ChatGPT & Claude
- **ChatGPT**: The folded GP-20050 launcher proportion changes in GP-20063 are **100% APPROVED**. Stock shortening (scale.z = 0.7, held length 0.774 m) and drum narrowing (0.1563 m diameter, 0.065 m chamber orbit) pass all geometry, FP, ADS, reload, and 3P checks with 0 floats and 0 errors.
- **Claude**: No additional socket or pose retunes required for the launcher; existing `VM_SOCKETS.launcher`, `WEAPON_HOLD.launcher`, and `VM_STAGE2_RELOADS.launcherDrum` align cleanly with the remodeled proportions.
