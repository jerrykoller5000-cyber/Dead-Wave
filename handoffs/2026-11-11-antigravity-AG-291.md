# Handoff: AG-291 — CE-1 Four Lights on RTX 5080: Gun Action Cycles Across 6 Weapons

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Task:** `AG-291`
- **Status:** `DONE`

## Changed:
- `tools/ce1-capture.mjs`: Added `--rest-only` support and fixed 0 ms Rest (`f000`) frame rendering. Pre-settles camera orientation and position at the shooting range before recording origin, steps a frame on `f000` to flush the WebGPU frame buffer with the gun drawn and raised in hand, and merges capture manifests seamlessly.
- `tools/build-ce1-sheets.py`: Composite generator for 24 individual weapon action strips, 4 light contact sheets, ADS down-the-sights comparison sheet, and master GPU sheet.
- `tools/ce1-slot-batch.mjs`: Coordinated slot batch runner for capture and composite sheet generation.
- `review/CE-1/gpu/` & `qa/2026-11-10-CE-1/`: 304 WebGPU screenshots (1280×720 PNGs) across 6 weapons × 4 lights × 12 action frames + 16 ADS frames.
- `review/CE-1/gpu/strips/`: 24 individual 12-frame action strips (`<weapon>-<light>-strip.jpg`).
- Contact Sheets:
  - `review/CE-1/gpu/sheet-noon.jpg` (2342×1218)
  - `review/CE-1/gpu/sheet-overcast.jpg` (2342×1218)
  - `review/CE-1/gpu/sheet-dusk.jpg` (2342×1218)
  - `review/CE-1/gpu/sheet-night.jpg` (2342×1218)
  - `review/CE-1/gpu/ads-25ms.jpg` (1476×382)
  - `review/CE-1/CE-1-actions-gpu.jpg` (2342×1218)

## Tests:
- `tools/ce1-capture.mjs --rest-only`: Retook all 24 Rest (`f000`) frames across 6 weapons × 4 lights under the game-test slot (`exit code 0`).
- `tools/build-ce1-sheets.py`: Rebuilt all 24 strips and 5 composite contact sheets cleanly (`exit code 0`).
- Automated visual integrity checks:
  - Verified 0 ms Rest (`f000`) column across all 6 weapons and 4 lights contains the gun drawn and settled in the exact same shooting range camera view as the shot frames (std dev 35–47 across all rows).
  - Verified Pistol row at `f000` is now stationed at the shooting range, matching frames `f008`–`f170`.
  - Verified all 6 weapon action cycles:
    - Pistol: slide cycles rearward to peak at 17–25 ms (-0.0045) and returns home (0.0500) by 83 ms.
    - M4 (GW-4): carrier bolt cycles in port (0.0472 → 0.0170 peak) while charging handle stays still (`work: 0`).
    - AK (KR-7): carrier bolt cycles in port and charging handle reciprocates with it (peak stroke -0.0660 at 33 ms).
    - Uzi (Wasp): recoil bolt cycles in port while cocking knob stays static (`work: 0`).
    - Revolver: double-action trigger rotates back to 0.3600 (8–42 ms) and resets forward to 0 by 170 ms; hammer stays uncocked (`ham: 0`).
    - AA-12: recoil bolt stroke cycles to peak (0.0440) and returns home (0.0795) by 130 ms.
    - Down-the-sights ADS at 25 ms for M4 and AK: sights verified centered on target across all 4 lights.

## Not verified:
- Viewmodel ADS Aimed (Noon) settle in CD-1 master sheet (`review/CD-1/sheet.jpg`), addressed next in AG-286 retake.
- Third-person body wrist limits and joint deviation swap investigation (Claude 2 CB-289).
