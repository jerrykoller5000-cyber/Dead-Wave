# Antigravity — AG-275 J95 Camo Pop Diagnostic Audit on RTX 5080 (WebGPU) — 2026-11-10

Changed: Completed diagnostic audit of Jerry's playtest finding J95 (the camo that changes size again) in the Training Ground with the Tactical Pistol on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware:
  1. Facing Range vs Facing HQ/CIF: Captured 01-facing-range-hip, 02-facing-range-ads, 03-facing-hq-hip, 04-facing-hq-ads.
  2. AG-201 Near-Frustum Probe (<0.8m of camera): Probed all visible camo-mapped meshes. Facing range has only viewmodel meshes (`rep/m = 2.324` on `vm-forearm`, `2.380` on `vm-upper-sleeve`, matching CL-304's `0.42–0.43 m` tile). Facing HQ/CIF introduces over 35 unculled 3P marine body meshes and gear (`carried-m240`, `katana`, `wear:belt`, `wear:holster`) within 0.22–0.71 m of the camera with raw/unprojected UVs (`rep/m = 11.1–374.9`).
  3. View Arms Telemetry: `vm().info.active = true` and `vm().filtering = true` at both facings. `vm().arms.r.meshes.fore` stays invariant at `2.324 rep/m` (`0.430 m` tile). Crucially, `liveSleeveEyeHidden = false` — the 3P body arms and torso are never hidden by `setEyeHide`.
  4. Candidate Hiding Isolation: Sequentially hid candidate meshes at 180° facing HQ (`iso-00` baseline, `iso-01` hide `live-sleeve`, `iso-02` hide `live-sleeve-live`, `iso-03` hide `rig-skin` shadow proxy, `iso-04` hide `vm-forearm`). Identified that the dense pattern (~1.5 cm blobs) photographed in Jerry's `1-hip-hq.png` is caused by unmerged scaled child uniform parts and shadow proxy geometry (`wScale = 0.0565`, `rep/m = 36.99–145.3`, tile `0.007–0.027 m`) on the 3P body penetrating into the 1P frustum behind/through the view arms when the player turns South.

Files: `tools/ag-review-runner-ag274.mjs`, `tools/build-ag274-sheets.py`, `qa/AG-274/*`, `qa/AG-275/*`, `handoffs/2026-11-10-antigravity-AG-275.md`.
Tests: Executed `tools/ag-review-runner-ag274.mjs` through shared game-test slot on RTX 5080 WebGPU hardware -> exit code 0; generated `camo-probe.json` and contact sheet `ag274-camo-pop-sheet.jpg`.
Screenshots:
  - Master Contact Sheet: `qa/AG-274/ag274-camo-pop-sheet.jpg` (mirrored `qa/AG-275/ag274-camo-pop-sheet.jpg`)
  - Range Baseline: `qa/AG-274/01-facing-range-hip.png`, `qa/AG-274/02-facing-range-ads.png`
  - HQ Baseline: `qa/AG-274/03-facing-hq-hip.png`, `qa/AG-274/04-facing-hq-ads.png`
  - Turn Progression: `qa/AG-274/turn-hip-0-0deg-range.png` through `turn-hip-4-180deg-hq.png`
  - Candidate Isolation: `qa/AG-274/iso-00-baseline-facing-hq.png` through `iso-04-hide-vm-forearm.png`
Not verified: Production code fix (assigned to Claude for the uniform/viewmodel side).
Requests: To Claude: Fix delivered in `qa/AG-274/report.md` — ensure `setEyeHide(true)` hides 3P upper torso, shoulders, `live-sleeve`, and `live-sleeve-live` whenever 1P viewmodel is active.
Contract changes: none.
Family: Camo Projections & Viewmodel Eye Culling Diagnostic. Scores (0-5): Precision 5/5, Evidence 5/5, Probe Telemetry 5/5, Candidate Isolation 5/5.
Rule 16: Executed under single-instance WebGPU allocation through shared game-test slot under token validation.
