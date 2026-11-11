# Handoff: AG-286 — CD-1 Hand Fits in 4 Lights across 9 Guns (RTX 5080 WebGPU)

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-10`
- **Status:** `DONE`

## Changed:
- `tools/ag286-capture.mjs` (NEW: Automated capture tool for 9 weapons in first person across 4 lights + ADS).
- `tools/build-ag286-sheets.py` (NEW: Composite sheet generator for `sheet.jpg` master matrix and `hands-detail.jpg` close crops).
- `tools/ag286-slot-batch.mjs` (NEW: Coordinated slot batch runner for capture and composite sheet generation).
- `review/CD-1/` & `qa/2026-11-10-CD-1/` (NEW: 54 WebGPU screenshots `1280x720`, `sheet.jpg` [2102x1730], `hands-detail.jpg` [1234x1418], `capture-manifest.json`, `notes.md`).

## Tests:
- `tools/ag286-capture.mjs`: Automated capture of 54/54 hash-unique 1280x720 PNGs on NVIDIA GeForce RTX 5080 WebGPU across 9 guns x 6 light/ADS conditions (`exit code 0`).
- `tools/build-ag286-sheets.py`: Composite sheets `sheet.jpg` (2102x1730) and `hands-detail.jpg` (1234x1418) built cleanly (`exit code 0`).
- Automated size & integrity check: 54/54 PNGs verified exactly `1280x720`, non-blank.

## Visuals Verified:
- **9 Weapons Captured:** `uzi`, `m4` (GW-4), `ak` (KR-7), `shotgun`, `sniper`, `aa12`, `minigun`, `pistol`, `revolver`.
- **4 Lights + ADS:** Each weapon captured at hip in `noon`, `overcast`, `dusk`, `night`, plus down the sights (`aimed`) in `noon` and `night` (54 PNGs total).
- **Handguard Wraps:** Support hands now cleanly wrap around the handguards and pump slides instead of cradling them flat.
- **Specific Hand Positions:** Uzi support hand grips the front barrel shroud; Minigun firing hand wraps the rear spade grip.
- **Tactical Laser/Light Modules:** Verified fitted on eligible weapons (Uzi, M4, Pistol) with zero clipping through hands.

## Aimed (Noon) Settle Retake (Director's Review Request):
- Retook all 9 weapons in Aimed (Noon) down the sights after explicitly stepping frames until `fp.ads >= 0.999` and `vm.info.ads >= 0.999` plus 45 settle frames for viewmodel resting inertia.
- Verified all 9 weapons align true down the sights in Noon:
  - Uzi, M4, KR-7, Shotgun, AA-12, Minigun, Pistol, Revolver: Centered sight pictures, support hands resting cleanly underneath barrels/shrouds without clipping sightlines.
  - Sniper: Viewmodel hides and full-screen scope mask active at full ADS.
- Master matrix `review/CD-1/sheet.jpg` (2102x1730) and crop detail `review/CD-1/hands-detail.jpg` (1234x1418) regenerated and verified.

## Not verified:
- Dedicated two-hand pistol and revolver inter-hand overlaps (23.8 mm and 9.1 mm documented in Claude 1's CD-1 handoff, scheduled for upcoming two-hand solve pass).
- Grenade launcher firing hand receiver overlap (17.7 mm documented in CD-1).
