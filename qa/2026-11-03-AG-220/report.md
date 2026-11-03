# AG-220 — All 13 First-Person Weapons at Hip Rest (1080p WebGPU · Noon · Woods-Trail Seat)

## Summary
- **Launcher & Renderer**: Started from Jerry's launcher (`startMatch(T, 'JERRY')`), real hardware WebGPU (`NVIDIA GeForce RTX 5080`, `1920×1080 @ 1.00x`).
- **Seat & Lighting**: Locked to the `AG-219` woods-trail spawn seat (`[42.0, -7.5468, -20.0]`, `yaw = 0.000152`, `pitch = 0.0`) at exact **12:00 Noon** (`T.setWorldTime(0.50)`, since `setWorldTime` in `index.html:64220` takes a normalized `0..1` day fraction where `0` = midnight and `0.50` = noon).
- **Post-Processing Frame-ID Sync (`nodeFrame.update()`) & Pipeline Warmup (`compileAsync`)**:
  - When `T.flightHold(true)` pauses the main animation loop, `T.stepFrame(dt)` steps simulation outside `renderer.setAnimationLoop`, so `renderer._nodes.nodeFrame.frameId` must be explicitly incremented (`nf.update(); renderer.info.frame = nf.frameId;`) before `T.stepFrame(dt)` so `postProcessing.render()` runs a fresh scene pass instead of re-presenting the previous weapon's cached post-processing frame.
  - Before each still capture, `await T.renderer.compileAsync(T.scene, T.camera)` ensures newly cloned viewmodel weapon meshes (`game/viewmodel.js:buildGun`) have compiled WebGPU pipelines on the very frame they are captured.
- **Per-Frame Assertions & Exact `dt = 0` Reference Diffing**:
  - Asserted `firstPerson === true` (`fp.first && fp.w >= 0.99`), `worldTime === 0.50`, `currentWeapon === w.key` (`pistol` + `dualActive === true` for `akimbo-pistol`), and `vm.root.visible === true && vm.info.active === true && vm.info.key === w.key && vm.info.raise === 1` for all 12 viewmodel weapons (`rightGunVisible === true && leftGunVisible === true` for `akimbo-pistol`).
  - Measured exact `gunPixels` (gun mesh only, hiding `vm.gun.root` at `dt = 0` with identical camera & wind state) and `gunAndHandPixels` (gun + forearms/gloves, hiding `vm.space` at `dt = 0`).

## Telemetry & Pixel Table (`1920×1080`)

| # | Key | Weapon | Mode | `vmActive` | `raise` | Gun Pixels (`gunPx`) | Gun % | Gun + Hands (`totalPx`) | Total % | Muzzle `[x, y]` (px) | Grip `[x, y]` (px) |
|---:|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| 1 | `pistol` | Pistol | `vm` | `true` | `1.00` | `33,483` | `1.61%` | `243,207` | `11.73%` | `[1181.7, 600.2]` | `[1288.7, 696.6]` |
| 2 | `revolver` | Revolver | `vm` | `true` | `1.00` | `69,707` | `3.36%` | `231,610` | `11.17%` | `[1021.9, 546.8]` | `[1255.1, 677.9]` |
| 3 | `uzi` | Wasp (Uzi) | `vm` | `true` | `1.00` | `98,284` | `4.74%` | `236,955` | `11.43%` | `[1182.0, 679.4]` | `[1331.9, 816.6]` |
| 4 | `m4` | GW-4 (M4) | `vm` | `true` | `1.00` | `132,194` | `6.38%` | `299,779` | `14.46%` | `[1084.9, 593.9]` | `[1306.5, 745.2]` |
| 5 | `ak` | KR-7 (AK) | `vm` | `true` | `1.00` | `137,220` | `6.62%` | `307,299` | `14.82%` | `[1078.6, 581.4]` | `[1301.6, 703.3]` |
| 6 | `shotgun` | Shotgun | `vm` | `true` | `1.00` | `170,210` | `8.21%` | `284,661` | `13.73%` | `[1057.5, 571.8]` | `[1281.2, 749.7]` |
| 7 | `aa12` | Breacher-12 | `vm` | `true` | `1.00` | `220,228` | `10.62%` | `379,169` | `18.29%` | `[1060.1, 567.1]` | `[1230.2, 664.0]` |
| 8 | `sniper` | Sniper | `vm` | `true` | `1.00` | `111,293` | `5.37%` | `240,311` | `11.59%` | `[971.0, 584.6]` | `[1185.2, 723.4]` |
| 9 | `launcher` | Launcher | `vm` | `true` | `1.00` | `132,030` | `6.37%` | `234,421` | `11.31%` | `[1040.7, 613.6]` | `[1234.8, 748.0]` |
| 10 | `minigun` | Minigun | `vm` | `true` | `1.00` | `174,380` | `8.41%` | `216,432` | `10.44%` | `[961.7, 739.9]` | `[1195.0, 950.5]` |
| 11 | `flamer` | Flamer | `vm` | `true` | `1.00` | `148,986` | `7.18%` | `301,460` | `14.54%` | `[1074.7, 576.7]` | `[1244.6, 721.4]` |
| 12 | `chainsaw` | Chainsaw | `vm` | `true` | `1.00` | `140,927` | `6.80%` | `206,160` | `9.94%` | `[960.0, 480.8]` | `[960.0, 779.2]` |
| 13 | `akimbo-pistol` | Akimbo Pistols | `akimbo` (`dual=true`) | `false` | `0.00` | `43,835` | `2.11%` | `48,883` | `2.36%` | — | — |

## Findings on `akimbo-pistol` (#13) in First Person
1. **Viewmodel Bypassed When `akimboOn()` Is True (`index.html:51097`)**:
   - `st.want = viewFirst && OTS.w > 0.6 && ... && !unarmed && !akimboOn() && holdW > 0.5 && weaponMount.visible` disables the dedicated `game/viewmodel.js` rig whenever `akimboOn()` is active, falling back to the 3P marine body's dual pistols (`weaponMeshes.pistol` on `armRG` and `offhandMeshes.pistol` on `armLG`).
2. **Offhand Pistol (`offhandMeshes.pistol`) Missing `FP_LIFT` at Hip Rest (`index.html:52391` vs `52516`)**:
   - In `holdWeapon(dt)`, the primary gun (`weaponMeshes.pistol` on `armRG`, which sits on the **left** side of the screen in unmirrored 3P marine space) receives `if (viewFirst && OTS.w > 0) off.y += FP_LIFT * OTS.w;` (`+0.20 m` lift at line `52391`), bringing its barrel/slide into the bottom-left of the `1080p` frame (`43,835` pixels).
   - However, the offhand gun block (`if (akimboOn())` at `index.html:52516`, `offhandMeshes.pistol` on `armLG`, right side of screen) computes `const offL = _hv.origin.set(-holdX, H.hold[1], H.hold[2]).applyAxisAngle(_AXIS_X, -pitch * 0.7);` **without** adding `if (viewFirst && OTS.w > 0) offL.y += FP_LIFT * OTS.w;`. As a result, at stationary hip rest (`akimboCarryW = 0`), the right-side akimbo pistol hangs `20 cm` lower (`H.hold[1] = -0.08` instead of `+0.12`), below the bottom edge of the first-person viewport.
   - Additionally, when the player owns back-slung weapons (`carryRig.slings`), `viewmodel.js:630` calls `setEyeHide(false, null)` when `akimboOn()` lowers the viewmodel, allowing slung back weapons to unhide in the eye pass unless `vmEyeHide` remains active while `viewFirst && OTS.w > 0.6`.
