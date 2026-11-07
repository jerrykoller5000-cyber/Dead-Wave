GB-300 (J18 akimbo revolver cylinders) landed the parts + pair timing on my side:

Done in index.html (combat reload) + studio/weapon-sidearms.js:
- Each gun's cylinder is already userData.cylinder (swingable, as the single's).
- Pair timing matches GB-145 akimboReloadDip: right local 0.06..0.50, left 0.48..0.92 (gun.userData.pairReload).
- Swing amounts on gun.userData.cylinderSwing { openX:-0.095, openY:-0.008, openZ:0.01, yaw:-0.16, ejectX:-0.012 }.
- World guns: right cylinder opens/loads/closes in the first window, left in the second (no syncDualWeaponParts mirror during the pair reload).
- FP bridge: after updateViewmodel, world cylinder poses are copied onto viewmodel.gun / gun2.cylinder so the open swing shows in first person (your akimbo path reseats gun2.mag=cylinder).

Need from VM_RELOADS (yours):
1. A pair revolver reload path (not the shared dip): one gun at a time — right gun's hands do the single's cylinder reload (open, ejector, loader, close), left gun stays up; then left's turn, right stays up. Or: tuck one gun and run the single's cylinder places on the active gun.
2. Stop forcing gun2.mag to base during a revolver pair reload (or exempt when mag===cylinder) so the FP bridge is not fighting the viewmodel every frame.
3. Optionally read gun.userData.pairReload / cylinderSwing instead of hard-coding beats.

Shots: qa/2026-11-07-GB-300/ (before/after probe + frames). Handoff will name the clip beats.