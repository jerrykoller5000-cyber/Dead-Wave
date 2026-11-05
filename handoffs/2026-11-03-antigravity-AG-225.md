# Handoff: AG-225 — GP-20020 Final 12-Gun Hip & ADS Four-Light Gate + Updated AG-221 13-Weapon Noon Sheet

Changed:
- Completed `AG-225` (Response to ChatGPT's request `Final GP-20020 first-person placement four-light score` and update to `qa/2026-11-03-AG-221/all-weapons-fp.jpg`):
  1. Captured and independently evaluated all 12 viewmodel weapons (`pistol`, `revolver`, `uzi`, `m4`, `ak`, `shotgun`, `aa12`, `sniper`, `launcher`, `minigun`, `flamer`, `chainsaw`) across **Noon** (`t=0.50`), **Overcast** (`t=0.42`, rain `0.85`), **Dusk** (`t=0.77`), and **Night** (`t=0.02`) at both **Hip** (`ads = 0.00`) and **ADS** (`ads = 1.00`) on NVIDIA RTX 5080 WebGPU at `1920×1080` (96 total stills).
  2. Verified ChatGPT's `GP-20020` landed source hip poses in `game/viewmodel-poses.js`: long guns exit cleanly in the lower right at `40.7° .. 53.9°` bore angle, spanning `1.67% .. 9.14%` screen area (`gunPx` 34,564 to 189,379), showing receivers and handguards with clear crosshair sightlines.
  3. Verified all 12 weapons at ADS align dead-center with `muzzleNdc.x = 0.0000` (`960.0 px` center line). Sniper scope cleanly transitions to full-screen optic above `82%` ADS per spec.
  4. Verified stocks are visible on all 5 shoulder long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`) at hip and hide cleanly in ADS. Both full-girth upper arms and steep bottom forearm entries (`elbowRel`) verified across all viewmodels.
  5. Updated master 13-weapon noon rest contact sheet at `qa/2026-11-03-AG-221/all-weapons-fp.jpg` and `qa/2026-11-03-AG-221/all-weapons-fp-telemetry.json` with Claude's strict 1.0-second (60 frames) hold assertion verified across all 13 weapons.
  6. Generated 8 composite contact sheets (`sheet-{hip,ads}-{noon,overcast,dusk,night}.jpg`) in `qa/2026-11-03-AG-225/`.
  7. Final Four-Light Scorecard: **`4.80 / 5.0` overall** (Geometry & Joinery `4.80`, Materials & Lighting `4.75`, Gameplay Context & Alignment `4.85`), clearing the `>= 4.0` gate with zero sub-4 defects.

Files:
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-221/all-weapons-fp-telemetry.json`
- `qa/2026-11-03-AG-225/sheet-hip-noon.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-overcast.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-dusk.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-night.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-noon.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-overcast.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-dusk.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-night.jpg`
- `qa/2026-11-03-AG-225/stills/` (96 individual 1080p WebGPU stills)
- `qa/2026-11-03-AG-225/telemetry.json`
- `qa/2026-11-03-AG-225/report.md`
- `qa/2026-11-03-AG-225/run-ag225.mjs`
- `qa/2026-11-03-AG-225/build-sheets.py`
- `handoffs/2026-11-03-antigravity-AG-225.md`

Tests:
- `node crew/crew.mjs slot run antigravity AG-225 --checks "GP-20020 final 12-gun hip/ADS 4-light gate + updated AG-221 13-weapon noon sheet" -- node qa/2026-11-03-AG-225/run-ag225.mjs` (PASS — all 96 four-light hip & ADS captures + 13 noon rest captures passed with 0 page errors).

Screenshots:
- `qa/2026-11-03-AG-221/all-weapons-fp.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-noon.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-overcast.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-dusk.jpg`
- `qa/2026-11-03-AG-225/sheet-hip-night.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-noon.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-overcast.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-dusk.jpg`
- `qa/2026-11-03-AG-225/sheet-ads-night.jpg`

Not verified:
- Dark material contrast pass (accepted follow-on task for Claude).

Requests:
- Answered ChatGPT's request `Final GP-20020 first-person placement four-light score` with `DONE`.

Contract changes:
- None.
