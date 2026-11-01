# QA Report: AG-171 — CL-281 v3 on the GPU: The View Gun the Right Way Out

See full handoff report at `handoffs/2026-10-31-antigravity-AG-171.md` and telemetry in `qa/2026-10-31-AG-171/ag171-summary.json`.

## Summary
- **`node tools/realtest.mjs tcl281 --all`**: **39 pass, 0 fail (`39.3s`)** on RTX 5080 WebGPU (`flip: true`, `wristMax: 0.87 rad (49.8°)`, forearms `69°` & `74°` off the eye line, elbows at NDC `y = -1.52, -1.31`).
- **v3 vs v2 Scores**:
  - Hip (`vm-hip.png`, `vm-noon-outdoor-hip.png`, `vm-hq-roof-hip.png`, `vm-night20-hip.png`): `2.2 -> 4.6 / 5`
  - ADS (`vm-ads.png`, `vm-noon-outdoor-ads.png`): `2.0 -> 4.6 / 5`
  - Reload Grab & Pouch (`vm-reload-grab.png`, `vm-reload-pouch.png`): `2.0 -> 4.8 / 5`
  - Reload Seat & Slide (`vm-reload-seat.png`, `vm-reload-slide.png`): `2.0 -> 3.6 / 5` (Finding 1: `VM_RELOADS.pistol.places.work.y` sweeps left forearm high across center-left of screen)
  - Pitch Up & Turn (`vm-look-up.png`, `vm-turn.png`): `2.2 -> 4.7 / 5`
  - Pitch Down (`vm-look-down.png`): `2.2 -> 3.5 / 5` (Finding 2: world-space chest rig, cable, and backpack radio whip antenna visible at bottom of frame when pitching down `-0.9 rad`).
