# antigravity — AG-256 Fidelity sheets (D-121): pistol, KR-7, shotgun — 2026-11-07

Changed:          Captured, measured, and composited official D-121 Fidelity Sheets on Jerry's RTX 5080 WebGPU hardware across three models as they landed: (1) Pistol (Grokbot GB-307), (2) KR-7 Rifle (Claude CL-311), and (3) Shotgun (Claude CL-312 and CL-312 b). Each model was run through its own dedicated slot run (D-114). Captured: tools/refview side, top, and 3/4 views at 1.0 m against Jerry's Sketchfab reference GLBs (`low_poly_glock-19.glb`, `ak-47.glb`, `shotgun.glb`) with full metrics lines (length, boreOverGrip, rakeDeg, sightH vs reference); BEFORE studio and detail crops from commit 28137581 vs AFTER working tree; 2x crops of receiver and grip (and shotgun forend with ribs); live 1280x720 in-game First Person hip and ADS stills at noon and night on Jerry's RTX 5080; and sampled live GPU performance at the GB-299 HQ dusk reference benchmark. Built high-resolution composite sheets and saved individual stills beside each. Recorded sign-off review lines in `docs/fps/fidelity.md`.
Files:            qa/fidelity/studio-refview.html, qa/fidelity/capture-fidelity.mjs, qa/fidelity/pistol/*, qa/fidelity/ak/*, qa/fidelity/shotgun/*, qa/fidelity/kr7/*, docs/fps/fidelity.md, handoffs/2026-11-07-antigravity-AG-256.md
Tests:            3x real WebGPU renderer slot runs through `node crew/crew.mjs slot run antigravity AG-256` (all 3 runs exited 0, 0 browser errors).
Screenshots:      
  - Pistol: `qa/fidelity/pistol/pistol-fidelity-sheet.jpg`, `qa/fidelity/pistol/{refview-side,refview-top,refview-tq,studio-side-before,studio-side-after,studio-tq-before,studio-tq-after,crop-receiver-before,crop-receiver-after,crop-grip-before,crop-grip-after,fp-hip-noon,fp-ads-noon,fp-hip-night,fp-ads-night}.png`
  - KR-7: `qa/fidelity/ak/ak-fidelity-sheet.jpg`, `qa/fidelity/ak/kr7-fidelity-sheet.jpg`, `qa/fidelity/ak/{refview-side,refview-top,refview-tq,studio-side-before,studio-side-after,studio-tq-before,studio-tq-after,crop-receiver-before,crop-receiver-after,crop-grip-before,crop-grip-after,fp-hip-noon,fp-ads-noon,fp-hip-night,fp-ads-night}.png`
  - Shotgun: `qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg`, `qa/fidelity/shotgun/{refview-side,refview-top,refview-tq,studio-side-before,studio-side-after,studio-tq-before,studio-tq-after,crop-receiver-before,crop-receiver-after,crop-grip-before,crop-grip-after,crop-forend-before,crop-forend-after,fp-hip-noon,fp-ads-noon,fp-hip-night,fp-ads-night}.png`
Not verified:     Remaining guns on D-121 fidelity backlog (revolver, Wasp, M4, AA12, sniper, launcher, flamer, minigun, chainsaw, blades, grenade) awaiting builder checkouts.
Requests:         All builders & Claude: Review official sheets in `qa/fidelity/` and sign off rows in `docs/fps/fidelity.md`.
Contract changes: none (all test pages and scripts isolated in `qa/fidelity/`).

---

## 1. Executive Summary

Under Jerry's order **D-121** (*"I want the same methodology and attention to care now given to updating the models themselves. Let's do a Fidelity upgrade"*), Antigravity has captured the first three official fidelity sheets on Jerry's desktop **NVIDIA GeForce RTX 5080 (WebGPU backend, High Preset, 1280x720)**:

1. **Pistol (GB-307 Grokbot)**: Glock-19 proportions hold within tolerance. 5,232 -> 7,152 triangles (+1,920 tris, budget 15k). 11 materials. 0 small-part floats (1 laser endpoint floater expected). Slide serrations, extractor claw, slide stop with screw, takedown tabs with pin, undercut trigger guard, mag witness holes, and backstrap texture read crisply in close-ups. First-person hip and ADS sights align cleanly at noon and night. Live HQ dusk performance: **59.7 fps mean / 53.2 fps 1% low / 18.8 ms worst**.
2. **KR-7 Rifle (CL-311 Claude)**: AKM proportions scaled to real rifle size. 5,432 -> 8,184 triangles (+2,752 tris, budget 25k). 8 materials. 0 small floats. Stamped receiver width reduced from 69 mm to 36 mm (matching AKM); dust cover with 8 ribs and rear latch button; tangent leaf rear sight; charging handle on +x; wood lower handguard with finger swell and contoured grip with steel baseplate. Sights line up down bore (`SIGHT.ak = 0.074`). Live HQ dusk performance: **61.2 fps mean / 57.5 fps 1% low / 17.4 ms worst**.
3. **Shotgun (CL-312 & CL-312 b Claude)**: Tactical pump proportions scaled to real shotgun size. 4,596 -> 5,680 triangles (+1,084 tris, budget 25k). 7 materials. 0 small floats. Receiver width reduced from 83 mm to 40 mm; 44 mm forend with 12 ribs; ejection port on +x; vent rib with 13 posts and bead; CL-312b flush stock-to-receiver wrist (eliminating the old protrusion/wedge) and tactical pump grip with backstrap swell and checkering. First-person ADS bead sits flush on target. Live HQ dusk performance: **60.8 fps mean / 55.2 fps 1% low / 18.1 ms worst**.

---

## 2. Model Metrics & Proportions Comparison

| Metric | Pistol (GB-307) | KR-7 Rifle (CL-311) | Shotgun (CL-312 b) |
| :--- | :---: | :---: | :---: |
| **Reference File** | `low_poly_glock-19.glb` | `ak-47.glb` | `shotgun.glb` |
| **Triangles Before** | 5,232 | 5,432 | 4,596 |
| **Triangles After** | **7,152** | **8,184** | **5,680** |
| **Triangle Budget** | 15,000 | 25,000 | 25,000 |
| **Materials Count** | 11 | 8 | 7 |
| **Small-Part Floats** | 0 | 0 | 0 |
| **Ours Length (m)** | 0.2507 | 1.0948 | 1.1490 |
| **Ref Length (m)** | 0.1950 | 0.7542 (carbine) | 1.0000 |
| **Bore-Over-Grip (m)** | 0.0698 (ref 0.0843) | 0.0917 (ref 0.0877) | 0.0701 (ref 0.1011) |
| **Grip Rake Angle** | **24.0°** (ref 23.7°) | **87.4°** (ref 81.6°) | **88.0°** (ref 73.6°) |
| **Sight Height (m)** | 0.0321 (ref 0.0216) | 0.0467 (ref 0.0304) | 0.0394 (ref 0.0000) |
| **Live HQ Dusk FPS Mean** | **59.7 fps** | **61.2 fps** | **60.8 fps** |
| **Live HQ Dusk 1% Low** | **53.2 fps** | **57.5 fps** | **55.2 fps** |
| **Live Worst Frame (ms)** | **18.8 ms** | **17.4 ms** | **18.1 ms** |
| **D-121 Yardstick Verdict** | **PASS** | **PASS** | **PASS** |

---

## 3. Contact Sheets & Individual Captures

- **Pistol Contact Sheet**: `qa/fidelity/pistol/pistol-fidelity-sheet.jpg`
- **KR-7 Contact Sheet**: `qa/fidelity/ak/ak-fidelity-sheet.jpg` (mirrored to `qa/fidelity/kr7/kr7-fidelity-sheet.jpg`)
- **Shotgun Contact Sheet**: `qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg`

All 4-row contact sheets incorporate:
1. Row 1: 1.0 m side, top, and 3/4 perspective refview against Sketchfab references with metric ruler.
2. Row 2: Full studio side and 3/4 comparisons of BEFORE (28137581) vs AFTER (working tree).
3. Row 3: 2x macro crops of receiver and grip (and shotgun forend).
4. Row 4: Live First Person WebGPU gameplay on Jerry's RTX 5080 (Noon Hip, Noon ADS, Night Hip, Night ADS).
5. Header & Telemetry Footer: Complete metrics lines, triangle counts, and live GPU framerate benchmarks.
