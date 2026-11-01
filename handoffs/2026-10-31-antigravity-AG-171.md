# Handoff: AG-171 — CL-281 v3 on the GPU: The View Gun the Right Way Out

- **Date:** 2026-10-31
- **Agent:** `antigravity` (`Gemini 4 Argon (High)`)
- **Task:** `AG-171` — `CL-281` v3 on the GPU: `game/vm-flip.js` (WebGPU mirrored winding twins) & `VM.wristMax = 0.87` (`50°`)
- **Evidence Folder:** `qa/2026-10-31-AG-171/` (`ag171-summary.json`, `tcl281-real.log`, `vmsheet.log`, `run-ag171.mjs`, 18 PNG screenshots)

Changed:
- `qa/2026-10-31-AG-171/run-ag171.mjs`, `qa/2026-10-31-AG-171/ag171-summary.json`, `qa/2026-10-31-AG-171/tcl281-real.log`, `qa/2026-10-31-AG-171/vmsheet.log`, `qa/2026-10-31-AG-171/report.md`, and 18 GPU screenshots (`qa/2026-10-31-AG-171/*.png`).

Tests:
- `node tools/realtest.mjs tcl281 --all`: **39 pass, 0 fail** (`39.3s` on real WebGPU renderer, NVIDIA GeForce RTX 5080).

Not verified:
- None for `AG-171` (all `tcl281` real-renderer checks and `vmsheet` + outdoor/roof/night shots captured and scored).

---

## 1. Automated Real-Renderer Suite (`tcl281 --all`)

- **Command:** `node tools/realtest.mjs tcl281 --all` (via slot runner on RTX 5080 WebGPU)
- **Result:** **39 pass, 0 fail (`39.3s`)**
- **Key New v3 Assertions Verified:**
  - `PASS the wrists bend no more than VM.wristMax, at most 50 degrees (0.87, 0.81 of 0.87)` (`49.8°` R, `46.4°` L of `49.8°` max)
  - `PASS the forearms leave the view downward, not at the eye (69, 74 degrees off the eye line; elbows at ndc y -1.52, -1.31)`
  - `PASS the mirrored meshes draw wound the other way on WebGPU, as they are elsewhere (flip true)` (`34 / 34` viewmodel meshes using `vmFlipOf` twin index buffers)
  - `PASS nothing on screen in front of the near plane (nearest 24.9 cm, 24 meshes)`
  - `PASS both wrists on their sockets (0.00, 0.00 cm)`
  - `PASS the firing hand's grip through the pistol's grip (0.12 cm)`
  - `PASS the rear notch and the front post on the view's centre, within a pixel at 1080p (0.000, -0.000, 0.000, 0.000)`

---

## 2. Visual Scores: CL-281 v3 vs v2 (`qa/2026-10-31-AG-171/`)

| Pose / Shot | v2 Score | **v3 Score** | Telemetry (`ag171-summary.json`) | Visual Comparison (v3 vs v2) |
|---|---:|---:|---|---|
| **Hip Hold** (`vm-hip.png`, `vm-noon-outdoor-hip.png`, `vm-hq-roof-hip.png`, `vm-night20-hip.png`) | `2.2 / 5` | **4.6 / 5** | `flip: true`, `flippedMeshes: 34/34`, `wristBendDeg: {r: 49.8, l: 46.7}`, `forearmR: 68.9° off eye (elbow y -1.525)`, `forearmL: 74.6° off eye (elbow y -1.313)` | **Fixed.** The inside-out WebGPU face culling and the flat circular cuff end-cap disc are 100% gone. The M81 sleeves and rolled wrist cuffs shade smoothly, the pistol's slide serrations / ejection port / sights are crisp, and both forearms angle cleanly downward out the bottom edge of the viewport. |
| **ADS (Down the Sights)** (`vm-ads.png`, `vm-noon-outdoor-ads.png`) | `2.0 / 5` | **4.6 / 5** | `ads: 1`, `wristBendDeg: {r: 49.8, l: 49.8}`, `forearmR: 75.1° off eye (elbow x 0.679, y -1.343)`, `forearmL: 74.5° off eye (elbow x -0.822, y -1.387)` | **Fixed.** Rear notch and front red sight post align dead-center (`0.000 NDC`), the giant circular cuff disc that sat under the pistol in v2 is completely gone, and both sleeves angle symmetrically down to the bottom-left and bottom-right corners. |
| **Reload Beat 1 — Grab** (`vm-reload-grab.png`, `u = 0.195`) | `2.0 / 5` | **4.8 / 5** | `mag: "hand"`, `hand: "below"`, `u: 0.195` | **Excellent.** Right hand cants the pistol up-left in clear view with fingers wrapped cleanly around the grip; left arm drops below the frame toward the pouch. |
| **Reload Beat 2 — Pouch / Approach** (`vm-reload-pouch.png`, `u = 0.455`) | `2.0 / 5` | **4.8 / 5** | `mag: "hand"`, `hand: "below"`, `u: 0.455` | **Excellent.** Left hand brings the full-scale magazine (`GB-260`) up from bottom-left directly aligned with the pistol magwell. Reads like a shipped modern FPS reload. |
| **Reload Beat 3 & 4 — Seat & Slide Rack** (`vm-reload-seat.png` `u = 0.654`, `vm-reload-slide.png` `u = 0.882`) | `2.0 / 5` | **3.6 / 5** | `u: 0.654` (`hand: "well"` -> `"work"`) and `u: 0.882` (`hand: "work"`) | **See Finding 1 below.** When the support hand rises to rack the slide over the top (`handPlace: "work"`), the left sleeve sweeps diagonally high across the center-left of the screen in front of the pistol frame. |
| **Pitch Up & Turn Sway** (`vm-look-up.png`, `vm-turn.png`) | `2.2 / 5` | **4.7 / 5** | `pitch: +0.5 rad` / `otsLook(-160, 0) × 6` | **Clean.** View gun rides the camera with smooth spring lag and zero clipping. |
| **Pitch Down (`-0.9 rad`)** (`vm-look-down.png`) | `2.2 / 5` | **3.5 / 5** | `pitch: -0.9 rad` | **See Finding 2 below.** Stowed weapons are hidden, but pitching straight down shows the top of the marine's world-space M81 chest rig, a dark cable below the pistol grip, and his backpack radio antenna on the right. |

---

## 3. What Still Reads Wrong (Actionable Findings with Numbers)

### Finding 1 — Support Forearm Sweeps High Across the Screen During Slide Rack (`vm-reload-seat.png` `u = 0.654`, `vm-reload-slide.png` `u = 0.882`)
- **What shows in the shots:**
  - In `vm-reload-seat.png` (`u = 0.654`, halfway along the `0.56 -> 0.74` transition from `'well'` to `'work'`) and `vm-reload-slide.png` (`u = 0.882`, `'work'`), the left M81 forearm tube (`forearmL`) cuts diagonally from bottom-left (`NDC x ≈ -0.35, y = -1.0`) up to the top of the pistol slide (`NDC x ≈ +0.18, y = +0.05`), covering the left side of the pistol and part of the rear sight.
- **Why (`game/viewmodel-poses.js:41` & `23`):**
  - In `VM_RELOADS.pistol.places.work`, the wrist's dorsal/forearm axis is `y: [0.25, 0.72, 0.65]` (pointing up `+0.72` and away `+0.65`) while `VM_POSES.pistol.elbow.l` is `[-0.36, -0.38, -0.10]`. When the left hand climbs to the top of the slide (`y ≈ -0.05` in view space), clamping the wrist bend to `VM.wristMax = 0.87 rad` (`50°`) from `pl.work.y` keeps the forearm angled across the front of the camera rather than dropping steeper down/left.
- **Fix:**
  - In `VM_RELOADS.pistol.places.work` (`game/viewmodel-poses.js:41`), tilt `work.y` slightly more downward/outward (e.g. `y: [0.45, 0.35, 0.82]`) or lower `elbow.l` during `'work'` so the support elbow drops lower to the left and doesn't mask the pistol slide while racking.
  - Also in `tools/vmsheet.mjs:47`, sampling `vm-reload-seat` at `at = 0.50` (instead of `0.58`, which settles around `u = 0.654` after the `settle` + IPC round-trip) will capture the exact mag-seat beat (`u ≈ 0.56`) before the hand climbs to the slide.

### Finding 2 — Looking Straight Down (`pitch = -0.9 rad`, `vm-look-down.png`) Shows the Marine's World-Space Chest Rig & Backpack Radio Antenna
- **What shows in the shot (`qa/2026-10-31-AG-171/vm-look-down.png`):**
  - Along the bottom fifth of the frame (`NDC y < -0.60`), the camera looks down into the top of the marine's world-space M81 torso/plate-carrier, a dark strap/cable hanging below the pistol grip, and the black whip antenna of his backpack radio sticking out behind the right sleeve.
- **Why (`game/viewmodel.js:121-139` `eyeHideSet`):**
  - `eyeHideSet` hides `armLG`, `armRG`, `stowed()` weapons, `rigSplit` arm skins, `ARM_CLOTH`, and `gunSrc`, **but leaves the marine's torso/chest and backpack meshes (`torsoG` / non-`rigSplit` skins) in the eye's pass**.
- **Fix:**
  - Either include the marine's upper-torso/backpack meshes in `eyeHideSet` while `viewmodel` is active in first person (since `castShadow` stays active in the shadow pass via `vmEyeHide`), or hide the backpack/chest attachments from the eye pass when `camera` pitch `< -0.55 rad`.
