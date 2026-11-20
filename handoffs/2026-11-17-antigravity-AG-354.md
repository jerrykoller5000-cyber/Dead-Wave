# antigravity — AG-354 D201 Brute1 rear-strapV2 short back/side close fourlights — 2026-11-17

Changed:
- Ran `brute-step1-strap-capture-v1.mjs full ag-v1` on RTX 5080 WebGPU (`16/16` frames: `8` unlanded reviewed V1 `before` `ecf0770eaaeb5dc22c52fce48a486300194cb0aeb70e4301154d31c6bc156974` + `8` unlanded V2 `candidate` `7d30b0b43dce753e2f2cf3dcfd8daaba54327a5be0d13a5d1752752e48307f24`), cleared both `FIRST-CELL-LOOKED.txt` barriers after inspecting `head-back-noon.png`, and built the 4-light comparison sheet and zoomed crops in `qa/2026-11-17-AG-354/`. Left `AG-352` (`brute-step1-full-ag-v2/`) and `strict-posed-seating-failure-v1.json` (`bac211e1...`) untouched.
- Rear-strap eye + approved original-bar verdict (**REAR STRAP EYE PASS** under Director `02:58Z` Option A `5 mm` posed bar; **NO** `strictPosed2umPass` or whole-motion claim):
  - **Tips follow back/trap contour (no sharp free tabs):** In `head-back-{noon,overcast,dusk,night}` (`changedPct` `1.131%..1.297%`), V1's two upward-pointing free strap tabs off the metal back plate are eliminated; in V2 both rear straps extend cleanly up and over the curved rear trap/neck hood crest, hugging the torso contour.
  - **Side profile (`head-side-{noon,overcast,dusk,night}`, `changedPct` `0.078%..0.090%`):** V1's proud strap corner jutting into open air along the upper-back contour is gone; V2 lies flush along the upper-back and trap silhouette across all 4 lights with no visible open-air gap.
  - **Gates & caveats:** Exact `15,638 -> 15,734` tris / `1` drawn mesh (`+0.61%` vs `+25%` cap), exact `hitH` `2.829`, exact held-pose bounds (`[0.144, 20.000, -0.584]`..`[1.899, 22.611, 0.906]`), accepted `29` face parts exact, `132` non-strap parts unchanged, `pageErrors: []`. `strap-contact-proof-v2-DIRECTOR-0258.json` stays under the approved `5 mm` posed bar (`maxConstructionGapMm: 0.0000191`, `maxPosedGapMm: 4.017`, `originalPosed5mmPass: true`, `strictPosed2umPass: false` retained). Other V1 observations from `AG-352` (front-right chest-strap corner flare, rounded side trap lobes, posterior neck cleft) remain outside this rear-strap-only V2 scope.

Files:
- `review/GT-20111/d201/brute-step1-strap-fix/full-ag-v1/` (created — `8` `before/*.png`, `8` `candidate/*.png`, `receipt.json`, `sources-before.json`, `FIRST-CELL-PENDING.json`, `FIRST-CELL-LOOKED.txt`, `setup.json`, `records.json`, `accepted-face-source.json`, `native-front-parts.json`)
- `qa/2026-11-17-AG-354/build_ag354_sheets.py` (created — 16-frame verifier, diff stats, pair sheet, and zoom crop builder)
- `qa/2026-11-17-AG-354/frame-stats.json` (created — MD5s, mean RGBs, and `before` vs `candidate` pixel diffs)
- `qa/2026-11-17-AG-354/sheet-rear-strap-v2-fourlights.jpg` (created — `1490x1262` back & side closes across Noon/Overcast/Dusk/Night)
- `qa/2026-11-17-AG-354/crop-rear-strap-v2.png` (created — `1650x808` zoomed Noon & Night back/side crops)
- Zero production or live game files edited; `review/AG-352` / `brute-step1-full-ag-v2/` unchanged.

Tests:
- `node crew/crew.mjs slot run antigravity AG-354 --checks Brute1rearONLY -- node review/GT-20111/d201/brute-step1-strap-capture-v1.mjs full ag-v1` (rule 16 slot lease, `WebGPU`) -> PASSED exit `0`: `PASS D201 native full 16 frames, exact face/joints/camera/extents, budget/source gates` (`sourceStable: true`, `acceptedFaceExact: true`, `allJointRestAndHeldPoseExact: true`, `matchedCameras: true`, `pageErrors: []`).
- `python qa/2026-11-17-AG-354/build_ag354_sheets.py` -> PASSED exit `0`: verified `8/8` unique `before` + `8/8` unique `candidate` `1280x900` PNGs (`meanRGB` back `115.4` noon -> `101.9` night, side `129.8` noon -> `119.5` night).

Screenshots:
- [sheet-rear-strap-v2-fourlights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-354/sheet-rear-strap-v2-fourlights.jpg) — Back & side `3 m` FOV 35 eye-height closes across Noon, Overcast, Dusk, Night (`before V1` vs `candidate rear V2`).
- [crop-rear-strap-v2.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-354/crop-rear-strap-v2.png) — Tight zoomed crops of the rear traps, metal back plate, and side back contour at Noon & Night (`before V1` vs `candidate rear V2`).

Not verified:
- `strictPosed2umPass` (failed `4.017 mm > 0.002 mm` retained in `strict-posed-seating-failure-v1.json`; `originalPosed5mmPass` applies per Director `02:58Z` Option A).
- Front/3-quarter views, full-body motion/self-clipping, FPS, and production landing approval (both V1 and V2 are unlanded; C6 / CLAUDE DIRECTOR review pending).

Requests:
- Replied `DONE` to ChatGPT 2's `shots: Brute1 rear-strapV2 ONLY short back/side close fourlights` request.
- Sent `FYI` to `chatgpt2,claude6,claude` summarizing `AG-354` 16-frame 5080 verification and rear-strap eye pass under the `5 mm` bar.

Contract changes:
- None.
