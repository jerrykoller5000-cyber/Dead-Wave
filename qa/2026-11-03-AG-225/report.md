# AG-225 — GP-20020 Final 12-Gun Hip & ADS Four-Light Gate + Updated AG-221 13-Weapon Noon Sheet

- **Date**: 2026-11-03
- **Author**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-225` (Response to ChatGPT's request `Final GP-20020 first-person placement four-light score` and update to `qa/2026-11-03-AG-221/all-weapons-fp.jpg`)
- **GPU Hardware & Environment**:
  - `NVIDIA GeForce RTX 5080` (Desktop, Driver 572.16)
  - Resolution: `1920×1080 @ 1.00x` (`1080p`) WebGPU (Chrome CDP)
  - Seat: Locked to `AG-219` woods-trail seat (`[42.0, -7.5468, -20.0]`, `yaw = 0.000149`, `pitch = 0.0`)
  - Lighting: Four canonical game conditions — **Noon** (`t = 0.50`, clear), **Overcast** (`t = 0.42`, rain `0.85`), **Dusk** (`t = 0.77`, clear), and **Night** (`t = 0.02`, clear)
- **Reviewed Code & Assets**:
  - `game/viewmodel-poses.js` (`VM_POSES` hip & ADS placements for all 12 viewmodel guns, `VM_SOCKETS`, `VM_STAGE3_RELOADS`)
  - `game/viewmodel.js` (mirroring, full-girth arms `SLIM = 1.0`, `upperArmR/L`, `elbowRel`, ADS spring easing, stock visibility `(st.ads < 0.35)`)
  - `studio/fp-arms.js` & `studio/weapon-*.js`

---

## 1. Executive Summary & Gate Verdict

- **Overall Four-Light Gate Verdict**: **PASS (`4.80 / 5.0` overall; all categories and lighting conditions `>= 4.70 / 5.0`, zero sub-4 defects)**.
- **Placement & Silhouette Validation**:
  - All nine modified hip placements from ChatGPT's `GP-20020` (`m4`, `ak`, `shotgun`, `pistol`, `revolver`, `sniper`, `aa12` Breacher-12, `flamer`, `launcher`) along with the retained matching silhouettes (`uzi` Wasp, `minigun`, `chainsaw`) were captured through the shared test slot across all four lighting environments at both **Hip** (`ads = 0.00`) and **ADS** (`ads = 1.00`).
  - **Hip Silhouettes**: Long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`, `launcher`) exit frame naturally in the lower-right corner at `boreAngleDeg = 40.7° .. 53.9°` (well within Jerry's `35° .. 55°` target window) spanning `1.67% .. 9.14%` screen area (`34,564 .. 189,379` pixels), showing receiver right-side details and handguards while leaving crosshair vision wide open.
  - **ADS Boresight Centering**: In every single gun, ADS aligns the muzzle exactly at `muzzleNdc.x = 0.0000` (`960.0 px` center line) with iron sights/optics centered directly on target. On `sniper`, `root.visible` cleanly yields to the full-screen scope overlay above `82%` ADS per spec.
  - **Stocks & Upper Arms**: Stocks are verified visible at hip (`stockVisible = true`) on all five shoulder long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`), and cleanly fold/hide during ADS (`stockVisible = false`). Both upper arms (`upperArmR = true`, `upperArmL = true`) and forearm entries (`elbowRel`) enter steeply from the bottom corners without elbow flare or side intrusion.
- **AG-221 13-Weapon Sheet Updated**:
  - Recaptured all 13 weapons at exact noon rest (`worldTime = 0.50`) enforcing Claude's strict capture rule: stepping a full `1.0 s` (`60` frames at `1/60 s`) continuously asserting `vm.info.key === weapon && vm.info.raise === 1 && vm.info.ads === 0` (`holdFull1sVerified = true`).
  - Master composite sheet updated at `qa/2026-11-03-AG-221/all-weapons-fp.jpg` and mirrored at `qa/2026-11-03-AG-225/all-weapons-fp.jpg`.

---

## 2. Updated AG-221 13-Weapon Noon Rest Telemetry (`qa/2026-11-03-AG-221/all-weapons-fp.jpg`)

| # | Weapon Key | Display Name | Kind | Muzzle NDC `[X, Y]` | Grip Px `[X, Y]` | Bore Angle | Stock Visible | Gun Pixels (`gunPx`) | Screen % | Total Gun+Hands | Hold 1.0s Verified |
| :- | :--- | :--- | :-: | :---: | :---: | :---: | :-: | :---: | :---: | :---: | :-: |
| 01 | `pistol` | Pistol | `vm` | `[+0.2340, -0.1917]` | `[1291.1, 757.8]` | `47.1°` | — | `34,564` | `1.67%` | `194,116` (`9.36%`) | **PASS** |
| 02 | `revolver` | Revolver | `vm` | `[+0.1580, -0.1460]` | `[1299.1, 785.7]` | `41.7°` | — | `64,037` | `3.09%` | `169,483` (`8.18%`) | **PASS** |
| 03 | `uzi` | Wasp (Uzi) | `vm` | `[+0.2312, -0.2592]` | `[1323.0, 777.6]` | `42.5°` | — | `100,944` | `4.87%` | `201,012` (`9.70%`) | **PASS** |
| 04 | `m4` | GW-4 (M4) | `vm` | `[+0.2104, -0.1535]` | `[1293.7, 769.9]` | `45.6°` | **`true`** | `123,879` | `5.97%` | `233,459` (`11.26%`) | **PASS** |
| 05 | `ak` | KR-7 (AK) | `vm` | `[+0.2045, -0.1416]` | `[1287.4, 765.2]` | `40.7°` | **`true`** | `139,539` | `6.73%` | `231,960` (`11.19%`) | **PASS** |
| 06 | `shotgun` | Shotgun | `vm` | `[+0.2160, -0.1207]` | `[1274.6, 762.1]` | `53.9°` | **`true`** | `134,540` | `6.49%` | `208,797` (`10.07%`) | **PASS** |
| 07 | `aa12` | Breacher-12 | `vm` | `[+0.2263, -0.1262]` | `[1295.2, 796.8]` | `47.1°` | **`true`** | `189,379` | `9.14%` | `272,195` (`13.13%`) | **PASS** |
| 08 | `sniper` | Sniper | `vm` | `[+0.1298, -0.1852]` | `[1287.3, 831.6]` | `50.6°` | **`true`** | `126,565` | `6.11%` | `182,716` (`8.82%`) | **PASS** |
| 09 | `launcher` | Launcher | `vm` | `[+0.1820, -0.1684]` | `[1294.6, 804.5]` | `43.9°` | **`true`** | `153,187` | `7.39%` | `221,433` (`10.68%`) | **PASS** |
| 10 | `minigun` | Minigun | `vm` | `[+0.0018, -0.3751]` | `[1323.5, 785.4]` | `42.0°` | — | `172,127` | `8.30%` | `215,724` (`10.41%`) | **PASS** |
| 11 | `flamer` | Flamer | `vm` | `[+0.1879, -0.1174]` | `[1312.4, 778.2]` | `49.3°` | — | `142,635` | `6.88%` | `263,222` (`12.70%`) | **PASS** |
| 12 | `chainsaw` | Chainsaw | `vm` | `[0.0000, +0.1102]` | `[960.0, 874.1]` | `90.0°` | — | `138,363` | `6.68%` | `237,810` (`11.47%`) | **PASS** |
| 13 | `akimbo-pistol` | Akimbo Pistols | `akimbo` | — | — | — | — | `36,144` | `1.74%` | `37,306` (`1.80%`) | **PASS** |

---

## 3. Four-Light Hip & ADS 12-Gun Matrix (`qa/2026-11-03-AG-225/telemetry.json`)

All 96 stills captured at `1920×1080` WebGPU under `qa/2026-11-03-AG-225/stills/<gun>-<mode>-<light>.jpg` and compiled into 8 composite sheets (`sheet-{hip,ads}-{noon,overcast,dusk,night}.jpg`).

| Gun Key | Hip Muzzle NDC | Hip Left Wrist NDC | Hip Right Wrist NDC | Hip Bore Angle | ADS Muzzle NDC | ADS Muzzle X Centered | ADS Bore Angle | Stock at Hip -> ADS |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`pistol`** | `[+0.2340, -0.1917]` | `[+0.2136, -0.6815]` | `[+0.5132, -0.5541]` | `47.1°` | `[0.0000, -0.0787]` | **`0.0000`** | `48.2°` | N/A (no stock) |
| **`revolver`** | `[+0.1580, -0.1460]` | `[+0.2414, -0.7694]` | `[+0.5424, -0.6647]` | `41.7°` | `[0.0000, -0.0794]` | **`0.0000`** | `42.5°` | N/A (no stock) |
| **`uzi`** | `[+0.2312, -0.2592]` | `[+0.2471, -0.6091]` | `[+0.4901, -0.6272]` | `42.5°` | `[0.0000, -0.1222]` | **`0.0000`** | `43.1°` | N/A (folded) |
| **`m4`** | `[+0.2104, -0.1535]` | `[+0.2117, -0.5098]` | `[+0.5091, -0.6406]` | `45.6°` | `[0.0000, -0.1177]` | **`0.0000`** | `46.0°` | `true` -> `false` |
| **`ak`** | `[+0.2045, -0.1416]` | `[+0.2119, -0.5003]` | `[+0.4907, -0.6441]` | `40.7°` | `[0.0000, -0.0914]` | **`0.0000`** | `41.2°` | `true` -> `false` |
| **`shotgun`** | `[+0.2160, -0.1207]` | `[+0.2105, -0.4851]` | `[+0.5042, -0.6223]` | `53.9°` | `[0.0000, -0.0589]` | **`0.0000`** | `54.2°` | `true` -> `false` |
| **`aa12`** | `[+0.2263, -0.1262]` | `[+0.2468, -0.4362]` | `[+0.5182, -0.6385]` | `47.1°` | `[0.0000, -0.1675]` | **`0.0000`** | `47.8°` | `true` -> `false` |
| **`sniper`** | `[+0.1298, -0.1852]` | `[+0.1878, -0.5204]` | `[+0.5042, -0.8941]` | `50.6°` | `[0.0000, -0.1170]` | **`0.0000`** | `51.0°` | `true` -> Scope |
| **`launcher`** | `[+0.1820, -0.1684]` | `[+0.2135, -0.5218]` | `[+0.4876, -0.6542]` | `43.9°` | `[0.0000, -0.1070]` | **`0.0000`** | `44.5°` | `true` -> `false` |
| **`minigun`** | `[+0.0018, -0.3751]` | `[-0.1982, -0.5124]` | `[+0.2451, -0.4120]` | `42.0°` | `[0.0000, -0.2980]` | **`0.0000`** | `42.5°` | N/A (drive housing) |
| **`flamer`** | `[+0.1879, -0.1174]` | `[+0.1945, -0.4952]` | `[+0.4912, -0.6401]` | `49.3°` | `[0.0000, -0.1140]` | **`0.0000`** | `49.8°` | N/A (dual tanks) |
| **`chainsaw`** | `[0.0000, +0.1102]` | `[-0.2514, -0.4812]` | `[+0.2521, -0.4820]` | `90.0°` | `[0.0000, -0.1883]` | **`0.0000`** | `90.0°` | N/A (guide bar) |

---

## 4. Independent Four-Light 0–5 Asset/Art Scores

| Category | Noon (`0.50`) | Overcast (`0.42`) | Dusk (`0.77`) | Night (`0.02`) | Category Mean | Evaluation Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Geometry & Joinery** | `4.8` | `4.8` | `4.8` | `4.8` | **`4.80`** | Zero near-plane clipping (`near = 0.01`). Stock presence and visibility rules verified on all 5 shoulder rifles; elbows enter cleanly from below; wrists natural across all 12 viewmodels. |
| **Materials & Specular / Lighting** | `4.8` | `4.7` | `4.7` | `4.8` | **`4.75`** | Clean separation of weapon receivers, handguards, and scopes under bright direct sun and diffuse overcast; night flashlight reflects cleanly across barrels. (Dark weapon material contrast flagged for Claude's follow-on pass). |
| **Gameplay Context & Sight Alignment** | `4.9` | `4.8` | `4.8` | `4.9` | **`4.85`** | Every single weapon at ADS lines up dead-center on `muzzleNdc.x = 0.0000`. Hip silhouettes occupy `1.67% .. 9.14%` screen area, leaving navigation and target acquisition uncompromised. |
| **Composite Lighting Mean** | **`4.83`** | **`4.77`** | **`4.77`** | **`4.83`** | **`4.80 / 5.0`** | **PASS — Final GP-20020 placement gate verified and cleared.** |

---

## 5. Artifacts & Generated Files

- **Contact Sheets**:
  - `qa/2026-11-03-AG-221/all-weapons-fp.jpg` (Updated 13-weapon master noon contact sheet)
  - `qa/2026-11-03-AG-225/sheet-hip-noon.jpg` (12 guns at Noon Hip)
  - `qa/2026-11-03-AG-225/sheet-hip-overcast.jpg` (12 guns at Overcast Hip)
  - `qa/2026-11-03-AG-225/sheet-hip-dusk.jpg` (12 guns at Dusk Hip)
  - `qa/2026-11-03-AG-225/sheet-hip-night.jpg` (12 guns at Night Hip)
  - `qa/2026-11-03-AG-225/sheet-ads-noon.jpg` (12 guns at Noon ADS)
  - `qa/2026-11-03-AG-225/sheet-ads-overcast.jpg` (12 guns at Overcast ADS)
  - `qa/2026-11-03-AG-225/sheet-ads-dusk.jpg` (12 guns at Dusk ADS)
  - `qa/2026-11-03-AG-225/sheet-ads-night.jpg` (12 guns at Night ADS)
- **Telemetry**:
  - `qa/2026-11-03-AG-225/telemetry.json` (96-shot four-light matrix telemetry)
  - `qa/2026-11-03-AG-221/all-weapons-fp-telemetry.json` (13-weapon noon rest telemetry)
- **Stills**:
  - `qa/2026-11-03-AG-225/stills/` (96 individual 1080p WebGPU stills)
