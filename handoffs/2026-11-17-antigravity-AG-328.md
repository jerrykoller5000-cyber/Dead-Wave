# AG-328 — LIVE Player (Marine) Full-Frame Reference Captures (5080 WebGPU)

- **Agent / Model:** Antigravity (`Gemini 4 Carbon`)
- **Date:** 2026-11-17
- **Task:** `AG-328` — Capture the LIVE player (marine) full-frame (`1600x1600+`) on RTX 5080 WebGPU via the shared game-test slot for Jerry, look-only (zero game code edits).
- **LIVE build pinned:** `index.html` MD5 `75854361`, `studio/inspector/api.js` MD5 `36f93978`.

## Handoff Summary

- **Changed:** Capture-only artifacts in `review/AG-328/` (`16` native `1600x1600` WebGPU PNGs, labelled contact sheet `review/AG-328/sheet.jpg`, `review/AG-328/capture-ag328.mjs`, `review/AG-328/summary.json`). Zero game files touched.
- **Files:**
  - `review/AG-328/capture-ag328.mjs`
  - `review/AG-328/summary.json`
  - `review/AG-328/sheet.jpg` (`1310x1432`)
  - `review/AG-328/marine-pistol-noon-{front,side,back,3q}.png` (`1600x1600`)
  - `review/AG-328/marine-pistol-night-{front,side,back,3q}.png` (`1600x1600`)
  - `review/AG-328/marine-unarmed-noon-{front,side,back,3q}.png` (`1600x1600`)
  - `review/AG-328/marine-unarmed-night-{front,side,back,3q}.png` (`1600x1600`)
- **Tests:** Ran `node crew/crew.mjs slot run antigravity AG-328 --checks "AG-328 player front/side/back/3q captures" -- node review/AG-328/capture-ag328.mjs` -> `Command exited with code 0`; `16/16` shots (`pageErrors=0`, `inspectorErrors=0`, `camErr=0`, `flashlight=false`, `zombies=0`). Python PIL verification (`build_sheet.py`) confirmed `16/16` `1600x1600` RGB PNGs with `16` unique MD5 hashes, `mean RGB` `119.8..128.8` (noon) and `49.3..70.4` (night).
- **Screenshots:** `review/AG-328/sheet.jpg` plus all 16 full-res PNGs inspected directly via image viewer (`read_file`).
- **Not verified:** Post-`J163`/`J164` edits (not yet landed; this capture documents the pre-edit LIVE `75854361` baseline).
- **Requests:** Answering `CLAUDE DIRECTOR` request `AG-328 = the player front/side/back capture for Jerry (separate from your AG-327 QA eyes)` as `DONE`.
- **Contract changes:** None.

## Capture Setup & Framing

- **Subject & Kit:** LIVE third-person marine (`DWInspect.show('marine')`), reset to standard Issue kit (`TT.resetEconomyDbg()`, `gear.laserLight = false`, `gear.flashlight = false`, `helmet/vest/pads/nvg = false`, M81 woodland camo, coyote balaclava, patrol cap, black boots, pistol + thigh holster).
- **Poses:**
  - `pistol`: third-person standing idle armed (`stand-armed`, `unarmed: false`, `weapon: "pistol"`), idle cigarette timer zeroed (`quiet: 0`) so pistol remains raised at chest/eye aim height.
  - `unarmed`: standing idle unarmed (`stand`, `unarmed: true`, pistol holstered behind left hip).
- **Stage & Lighting:** `DWInspect.backdrop('studio')`, all overlays `false` (plain ground, no grid/axes/bounds), HUD & `#perf` hidden, `zombies: 0`; `noon` and `night` (`flashlight: false`, `laserLight: false`).
- **Camera:** Chest height (`y = min.y + h * 0.70`, `fov = 34°`) at `yaw = 0°` (Front), `+90°` (Side / Marine's Left), `180°` (Back), `+40°` (3/4 Front-Left), iteratively framed via vertex projection on `WebGPUBackend` (`1600x1600`) to `84.80%–85.03%` vertical body fill with `camErr = 0`.

## Verified Shots Table

| File | Size | MD5 | Fill % | Pixel Box (L, R, T, B) | Mean RGB |
|---|---|---|---:|---|---|
| `marine-pistol-noon-front.png` | `1600x1600` | `1e3d6b54` | `84.99%` | `(532, 1050, 118, 1478)` | `(122.8, 125.0, 123.3)` |
| `marine-pistol-noon-side.png` | `1600x1600` | `ef93b978` | `84.91%` | `(364, 1238, 121, 1479)` | `(124.5, 126.7, 124.8)` |
| `marine-pistol-noon-back.png` | `1600x1600` | `d683f736` | `85.03%` | `(546, 1047, 120, 1480)` | `(121.6, 124.1, 122.6)` |
| `marine-pistol-noon-3q.png` | `1600x1600` | `24ae5c77` | `85.00%` | `(458, 1136, 118, 1478)` | `(120.6, 122.6, 120.1)` |
| `marine-pistol-night-front.png` | `1600x1600` | `2119f0c1` | `84.99%` | `(532, 1050, 118, 1478)` | `(52.7, 58.9, 69.3)` |
| `marine-pistol-night-side.png` | `1600x1600` | `4e0c406c` | `84.91%` | `(364, 1238, 121, 1479)` | `(50.3, 56.7, 67.6)` |
| `marine-pistol-night-back.png` | `1600x1600` | `dcf78576` | `85.03%` | `(546, 1047, 120, 1480)` | `(52.5, 58.6, 69.3)` |
| `marine-pistol-night-3q.png` | `1600x1600` | `8cc484b6` | `85.00%` | `(458, 1135, 118, 1478)` | `(49.3, 55.4, 65.6)` |
| `marine-unarmed-noon-front.png` | `1600x1600` | `0714ab6d` | `84.80%` | `(541, 1059, 120, 1477)` | `(121.8, 123.8, 121.4)` |
| `marine-unarmed-noon-side.png` | `1600x1600` | `2c9a517a` | `84.92%` | `(586, 1027, 120, 1479)` | `(126.4, 128.8, 127.3)` |
| `marine-unarmed-noon-back.png` | `1600x1600` | `f73db954` | `84.99%` | `(540, 1059, 114, 1473)` | `(119.8, 122.3, 120.6)` |
| `marine-unarmed-noon-3q.png` | `1600x1600` | `e1025efe` | `85.01%` | `(508, 1012, 120, 1480)` | `(121.8, 123.9, 121.5)` |
| `marine-unarmed-night-front.png` | `1600x1600` | `7c59abc2` | `84.80%` | `(541, 1059, 120, 1477)` | `(52.2, 58.4, 68.4)` |
| `marine-unarmed-night-side.png` | `1600x1600` | `12c834aa` | `84.92%` | `(587, 1027, 120, 1479)` | `(52.9, 59.3, 70.4)` |
| `marine-unarmed-night-back.png` | `1600x1600` | `c75b4ac0` | `84.99%` | `(540, 1059, 114, 1473)` | `(51.5, 57.5, 67.9)` |
| `marine-unarmed-night-3q.png` | `1600x1600` | `16553a27` | `85.01%` | `(508, 1012, 120, 1480)` | `(52.0, 58.2, 68.3)` |

## Visual Observations (Look-Only Baseline Notes)

- Full body (patrol cap crown to boot tread) sits comfortably unclipped inside every frame (`top 114..121`, `bottom 1473..1480`).
- **Proportions visible on LIVE `75854361`:** Boxy/chunky thigh-hip block with thigh straps and wide outer calf flare relative to waist/torso; oversized rounded boot soles; tall head/cap proportion relative to shoulder width; in `pistol` `side`/`3q` (`marine-pistol-noon-side.png`), a small dark rectangular clip hangs slightly loose below the front waist/thigh area when armed (not visible hanging below waist in `unarmed`, where arms hang naturally at sides and the pistol sits visibly holstered on the left back hip).
- **Note on directory path:** The initial `AG-327` request referenced `review/AG-327/` before the `09:12Z` reassignment to `AG-328`; all captures for this task live under `review/AG-328/` with exact paths reported in the reply.
