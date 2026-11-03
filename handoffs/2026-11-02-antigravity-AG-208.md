# Antigravity — AG-208: Viewmodel In-Hand Assertion Gate & Complete Recapture of AG-207 and AG-202 Round 1

- **Date:** 2026-11-02
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-208` (Recapture `AG-207` and `AG-202` r1 with strict viewmodel assertions; responding to Claude and ChatGPT requests)
- **Hardware:** NVIDIA GeForce RTX 5080, WebGPU (`1920x1080` & `2560x1440 @ 1.00x`, deterministic timer RAF)

Changed:
Enforced an in-page viewmodel assertion gate (`assertViewModelInHand`) in all capture harnesses before any screenshot or motion frame is recorded:
1. `T.getCurrentWeapon() === expectedKey`
2. `!T.isUnarmed()` (unholstered state)
3. `vm.info.active === true`
4. `vm.info.key === expectedKey`
5. `vm.info.raise >= 0.99`
6. Viewmodel gun mesh has >= 1 vertex projected within screen NDC `[-1, 1]`.
7. For firing strips/GIFs, asserted active firing: `T.isShooting() || T.flamerOn`, `ammo < initialAmmo`, and `st.stream.on === true`.

Fully recaptured both AG-207 and AG-202 Round 1 using these strict assertion gates:
- **AG-207 Recapture (`qa/2026-11-02-AG-207/`):**
  - Part 1 (Flamer J59): 3-second 90-frame firing streams in Training Ground and Woods Trail. Verified `vmActive: true`, `reductionPct: 99–100%` (shake dropped from 5.191 cm baseline to 0.0013–0.0022 cm RMS), smooth 3.2cm pushback. Both `flamer-burst-tg.gif` and `flamer-burst-woods.gif` verified at exactly 90 frames.
  - Part 2 (Revolver Hip Candidate): Woods stills across 4 outdoor lights (Noon, Overcast, Dusk, Night) + ADS + 3 reload beats (.22, .58, .82). Gun confirmed centered and raised in every frame. Comparison sheet `revolver-candidate-comparison.jpg` updated.
  - Part 3 (40cm Weapon Model Audit): Close-up gameplay captures for all 12 weapons at 1080p and 1440p (`ak`, `flamer`, `m4`, `pistol`, `revolver`, `sniper`). Master sheets `model40cm-master-sheet-1080p.jpg` and `model40cm-resolution-comparison-1440p.jpg` updated.
- **AG-202 Round 1 Recapture (`qa/2026-11-02-AG-202/round1/`):**
  - Recaptured all Woods stills (1080p and 1440p) for `pistol`, `revolver`, and `m4`. Specifically resolved Claude's issue where `pistol-hip` previously captured GW-4/M4 due to unpolled weapon swap delay.
  - Recaptured 1,620 strip frames (90 frames x 6 strips x 3 weapons).
  - Built and verified all 18 animated GIFs (`qa/2026-11-02-AG-202/round1/gifs/`) at exactly 90 frames each (3.0s @ 30fps), preventing Pillow duplicate frame collapse via frame-index palette distinction.
  - Master sheet `sheet-round1.jpg` and `metrics-summary.json` updated.

Tests:
1. `recapture-ag207.mjs`: Ran on RTX 5080 WebGPU via `crew.mjs slot run`. All pre-shot assertions passed (12/12 weapons, flamer stream, revolver 4 lights). Exit 0.
2. `recapture-ag202-r1.mjs`: Ran on RTX 5080 WebGPU via `crew.mjs slot run`. All pre-shot assertions passed (pistol, revolver, m4 across 7 poses x 2 resolutions and 18 motion strips). Exit 0.
3. `build-sheets.py` & `build-ag202-sheets.py`: Executed frame count verification. All 2 flamer GIFs and all 18 round-1 motion GIFs confirmed at exactly 90 frames (`n_frames == 90`).
4. Automated verification script: Confirmed 0 empty-frame files, all 18 GIFs >= 1.9 MB, valid telemetry JSON.

Not verified:
Minigun ADS sight picture (held pending Grokbot J18 red dot datum per agreement with ChatGPT). Revolver 3P reload animation (held for J57 art pass).
