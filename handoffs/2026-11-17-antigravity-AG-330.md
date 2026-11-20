# AG-330 — CC-357 (J164) 5080 WebGPU Shots, Capture Fix & AG-328 Pair Sheet

Changed:
- Captured the full 20-shot RTX 5080 `WebGPUBackend` review set (`1600x1600` PNGs) serving Claude 3's three `review/CC-357/` review copies (`marine-body.js` `f5e0e02d`, `marine-face.js` `0ec0cb83`, `marine-hats.js` `c2695acf`) over CDP `Fetch.enable` without modifying any live game files (`index.html` `9311196f`, `studio/marine-body.js` `810ba41b`, `ui/marine-face.js` `511beaf9`, `studio/marine-hats.js` `03724f53`, `studio/inspector/api.js` `36f93978` all untouched).
- Fixed `review/CC-357/capture-cc357.mjs` in place (per Claude 3's request):
  1. Allowed current live `index.html` `9311196f` alongside `75854361` (verified via diff against `_DELETE ME/index.html.75854361.before-CB-339c` that `CB-339c (a)` only touched `updateGuardianBossRigs` around lines `51426..51500` and left marine, lighting, and camera untouched).
  2. Removed the offscreen `--window-position=-3800,-3800` arg / `Browser.setWindowBounds` offscreen move (kept `setViewport(1600, 1600)` and `--window-size=1600,1600`).
  3. Replaced `I.still(true)` / `sampleHeld()` with `I.pause(); I.camera(m.cam); await I._ix.nextFrame(); await I._ix.nextFrame(); await new Promise((r) => setTimeout(r, 80));` + direct `page.screenshot(outPath)` + `assert.ok(bytes > 20000)`. On this Chrome/WebGPU build, `I.shot()` and `I.still(true)` both read `maxRgb: 0, meanRgb: 0` from `ctx2d.drawImage(webgpuCanvas, 0, 0)` and `I.still(true)` painted an opaque black `<canvas data-dwi-held-frame>` overlay (`Held frame canvas is uniform black after retry`), whereas onscreen `page.screenshot()` with `I.pause()` renders the live lit WebGPU swapchain.
- Built 20-tile contact sheet `review/CC-357/ag/sheet.jpg`, BEFORE (`review/AG-328/`) vs AFTER (`review/CC-357/ag/`) pair sheet `review/CC-357/ag/pair-sheet.jpg` (`front/side/back/3q` noon + `fight3q` noon/night), and zoomed comparison crops under `qa/2026-11-17-AG-330/`.
- Visual review findings (skin-only Issue kit, ballcap, `TT.resetEconomyDbg()`):
  - **DEFECT — Boot cuff / trouser vs boot tongue & laces (`review/CC-357/marine-body.js:282-287, 319`):** Narrowing the lower trouser cuff from `16.3 cm` to `11.7 cm` (`calfR` `-.2706`..`-.301`) puts the front trouser fabric behind/inside the boot tongue plate (`z=.071`) and 5 lace rows (`k=0..4`, `y=.064` down to `-.020`). In `BEFORE` (`AG-328`), the wider cuff bloused cleanly over the tongue and upper laces; in `AFTER` (`CC-357`), all 5 X-laces, eyelets, and the dark tongue block protrude out in front of / through the lower front trouser cuff (`front`, `3q`, and `side` profile; see `crop-boot-cuff-zoom.png`).
  - **PASS — Boot slimming (`BOOT={x:.78,z:.84,h:.82}`):** Slimmer width, shallower shaft, and lower toe box read clearly and cleanly; soles sit flush on the studio floor with no floating or sink.
  - **PASS — Head & cap vs shoulders (`HEAD_SIZE=.89`):** `boundsH` drops `1.5811 -> 1.5449` (`pistol`) and `1.5756 -> 1.5402` (`unarmed`), reading much better balanced (`7.33` heads) across both close `85%` views (`84.8%..85.03%`) and `4.5 m` `fight3q` (`35.88%` pistol, `37.05%` unarmed; `noon` & `night`), with cap, `8 cm` bill (`marine-hats.js` `c2695acf`), ears, collar, and balaclava cleanly seated. (With torso/arms untouched in items 1–3, the square torso/shoulder blocks look slightly boxier in `front` until items 5–8 land.)
  - **PASS — Thigh taper, cargo pockets & holster mount:** Reseated thigh pocket/flap/buttons/seam (`-6 mm`) and left holster mount (`-3.5 mm`) conform cleanly to the tapered thigh; pistol holsters cleanly in `unarmed`.
  - **Minor / Pre-existing (`holster-thigh-band` & sling clip):** Pre-existing front/inner air gap under `holster-thigh-band` (`marine-body.js:250`, `e=.7` vs `e=.82` `thighR`) is slightly more noticeable on the slimmer thigh in `unarmed 3q`; pre-existing detached dark rectangular sling clip on a thin wire below the right waist/front thigh (`AG-328` baseline) is unchanged.

Files:
- Updated: `review/CC-357/capture-cc357.mjs` (3-line fix block for `9311196f`, onscreen viewport, direct WebGPU swapchain screenshot replacing `I.still(true)`).
- Created: `review/CC-357/ag/marine-{pistol,unarmed}-{noon,night}-{front,side,back,3q,fight3q}.png` (`20` `1600x1600` PNGs), `review/CC-357/ag/summary.json`, `review/CC-357/ag/build_sheets.py`, `review/CC-357/ag/sheet.jpg` (`1772x1578`), `review/CC-357/ag/pair-sheet.jpg` (`1420x2026`).
- Created: `qa/2026-11-17-AG-330/crop-before-after-details.png` (`1284x1320`), `qa/2026-11-17-AG-330/crop-boot-cuff-zoom.png` (`1002x1794`).

Tests:
- `node crew/crew.mjs slot run antigravity AG-330 --checks "CC-357 marine copies 5080 set" -- node review/CC-357/capture-cc357.mjs` -> PASS (`20/20` shots captured, `20` unique MD5s, `copiesServed` = `1` each for `/ui/marine-face.js`, `/studio/marine-body.js`, `/studio/marine-hats.js`, `camErr=0`, `fillHeightPct` `84.8%..85.03%` chest / `35.88%` & `37.05%` `fight3q`, `boundsH` `1.5449` pistol / `1.5402` unarmed, `pageErrors=0`, `inspectorErrors=0`).
- `python review/CC-357/ag/build_sheets.py` + Python PIL verification -> PASS (`20/20` unique PNGs; noon channel-average meanRGB `121.4..135.4`, night `57.8..66.7`).

Screenshots:
- Full 20-shot sheet: `review/CC-357/ag/sheet.jpg`
- BEFORE (`review/AG-328/`) vs AFTER (`review/CC-357/ag/`) pair sheet + `fight3q`: `review/CC-357/ag/pair-sheet.jpg`
- 8-pair zoomed details: `qa/2026-11-17-AG-330/crop-before-after-details.png`
- Boot cuff & laces pokethrough zoom: `qa/2026-11-17-AG-330/crop-boot-cuff-zoom.png`

Not verified:
- **Full kit (`helmet/vest/pads/nvg = true`) AFTER 5080 captures — NOT VERIFIED:** `capture-cc357.mjs` uses `TT.resetEconomyDbg()` (Issue kit, ballcap, `helmet/vest/pads/nvg = false`). Supplementary `kit-after` runs (`helmet/vest/pads/nvg = true`) stalled with `Page.captureScreenshot` returning a frozen initial compositor frame (`unique=1`, swapchain calls frozen at `181`/`241`) after `~05:23` local, so 3D shaded knee pad (`-2 cm`) fit on the slimmer knee and `-11%` helmet/NVG fit remain unverified on the 5080 (`review/CC-357/cc357-silhouettes-kit.jpg` flat silhouettes remain Claude 3's only full-kit check so far). Temporary stale `kit-check` captures were removed.
- **Clothing / clip automated cloud tests:** Not re-run by Antigravity (Claude 3 already ran `LIVE 209/0 = COPIES 209/0`).

Requests:
- Replied `DONE` to Claude 3 on `shots: CC-357 J164 marine copies on the 5080 (your AG-328 set + 3/4 at fighting distance)`.
- Sent follow-up request to `claude3` reporting the boot cuff / laces pokethrough defect (`crop-boot-cuff-zoom.png`), `holster-thigh-band` gap, pre-existing sling clip, `capture-cc357.mjs` `I.still(true)` WebGPU fix, and unverified full-kit (`pads/helmet/nvg`) note.

Contract changes: None (live game files untouched; only `review/CC-357/capture-cc357.mjs` updated in place as requested).
