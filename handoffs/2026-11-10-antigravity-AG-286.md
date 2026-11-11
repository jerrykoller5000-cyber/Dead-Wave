# Handoff: AG-286 — CD-1 Hand Fits in 4 Lights across 9 Guns (RTX 5080 WebGPU)

- **Agent:** ntigravity (Gemini 4 Carbon)
- **Date:** 2026-11-10
- **Status:** DONE

## Changed:
- 	ools/ag286-capture.mjs (Automated capture tool for 9 weapons in first person across 4 lights + ADS on RTX 5080; real-time settle without flightHold freeze; geometric NDC sight centering check Math.abs(ndc.x) < 0.08; robust writeRetry).
- 	ools/build-ag286-sheets.py (Composite sheet generator for sheet.jpg master matrix and hands-detail.jpg close crops).
- 	ools/ag286-slot-batch.mjs (Coordinated slot batch runner for capture and composite sheet generation).
- 
eview/CD-1/ & qa/2026-11-10-CD-1/ (54 WebGPU screenshots 1280x720, sheet.jpg [2102x1730], hands-detail.jpg [1234x1418], capture-manifest.json, 
otes.md).

## Tests:
- 	ools/ag286-capture.mjs: Automated capture of 54/54 hash-unique 1280x720 PNGs on NVIDIA GeForce RTX 5080 WebGPU across 9 guns x 6 light/ADS conditions (exit code 0).
- Aimed (Noon) Retake: Ran under shared game-test slot (exit code 0). All 9 weapons verified at full ADS (p.ads == 1.0) and geometric NDC center alignment (
dcX == 0 for uzi, m4, ak, shotgun, aa12, minigun, pistol, revolver; scopeActive == true for sniper).
- 	ools/build-ag286-sheets.py: Composite sheets sheet.jpg (2102x1730) and hands-detail.jpg (1234x1418) built cleanly (exit code 0).
- Multimodal visual inspection: Verified all 9 weapon rows in 
eview/CD-1/sheet.jpg (column 5) and 
eview/CD-1/hands-detail.jpg (column 4) show true down-the-sights centered aim.

## Visuals Verified:
- **9 Weapons Captured:** uzi, m4 (GW-4), k (KR-7), shotgun, sniper, a12, minigun, pistol, 
evolver.
- **4 Lights + ADS:** Each weapon captured at hip in 
oon, overcast, dusk, 
ight, plus down the sights (imed) in 
oon and 
ight (54 PNGs total).
- **Handguard Wraps:** Support hands cleanly wrap around the handguards and pump slides instead of cradling them flat.
- **Specific Hand Positions:** Uzi support hand grips the front barrel shroud; Minigun firing hand wraps the rear spade grip.
- **Tactical Laser/Light Modules:** Fitted on eligible weapons (Uzi, M4, Pistol) with zero clipping through hands.
- **Aimed (Noon) Down the Sights:**
  - Sights centered directly in the middle of frame: Uzi, M4, KR-7, Shotgun, AA-12, Minigun, Pistol, Revolver.
  - Sniper: Viewmodel root hidden and scope active at full ADS.

## Not verified:
- Dedicated two-hand pistol and revolver inter-hand overlaps (23.8 mm and 9.1 mm documented in Claude 1's CD-1 handoff, scheduled for upcoming two-hand solve pass).
- Grenade launcher firing hand receiver overlap (17.7 mm documented in CD-1).
