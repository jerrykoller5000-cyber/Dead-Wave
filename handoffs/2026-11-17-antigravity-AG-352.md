# antigravity — AG-352 D201 Brute step1 5080 four lights, Marine scale and head closes — 2026-11-17

Changed:
- Completed the 5080 WebGPU `brute-step1-capture-v4.mjs full ag-v2` capture (`56/56` frames: `28` `before` LIVE `48a2eb50` + `28` `candidate` `ecf0770e`), cleared both `FIRST-CELL-LOOKED.txt` barriers after visually inspecting `front-noon.png`, ran `brute-step1-contact-audit-v1.mjs` on `ag-v2`, built 5 comparison sheets/crops in `qa/2026-11-17-AG-352/`, and visually inspected all frames and sheets. Kept failed `brute-step1-full-ag-v1/` untouched.
- Visual 5080 verdict (metrics/mapping **PASS**; contour/harness **VISUAL CAVEATS FLAGGED FOR C6/DIRECTOR**):
  - **Metrics, face, scale, and lighting (`PASS`):** `56/56` unique `1280x900` WebGPU PNGs (`meanRGB` noon `124.1` -> night `75.1`, head-close noon `117.1` -> night `104.0`), `0` page errors, exact `15,638` tris / `1` mesh (`+0%` vs `+25%` cap), exact `hitH` `2.829`, exact held-pose bounds (`[0.144, 20.000, -0.584]`..`[1.899, 22.611, 0.906]`), true-scale Marine aligned, `134` parts / `46,914` corners mapped (`0` unclaimed, `0` max bind error), all `29` `head/*` parts `0` world error, and all `6` anatomical joins `gapMm: 0` (`noNewContactRed: true`). Accepted face remains unobstructed in front and `3/4` closes across all 4 lights.
  - **Improved contours (`PASS`):** Front and black-silhouette views replace the flat lollipop neck shelf with raised traps sloping into the shoulder pads (`cheek/ear` height); `Side Noon` fills the deep posterior neck notch behind the skull.
  - **Visible step-1 caveats (`FLAGGED` for ChatGPT 2 / Claude 6 / Director):** (1) In `Back Noon (Upper)` and `Side Noon (Upper)`, the two back harness strap tips project upward as flat pointed tabs, with a strap corner sticking proud off the rear trap/back-plate contour into open air on the side profile; (2) in `Head 3/4 Noon/Night`, the front-right harness strap corner flares sharply outward at the chest-plate upper edge while the left strap hides in the jaw/trap fold; (3) the raised traps read as thick rounded side lobes (`Head 3/4` far lobe bulges behind the jaw with a sharp shoulder-cap crease) with a vertical center cleft splitting the rear neck hood (`Back Noon`).

Files:
- `review/GT-20111/d201/brute-step1-full-ag-v2/` (created — `28` `before/*.png`, `28` `candidate/*.png`, `receipt.json`, `sources-before.json`, `before/` & `candidate/` `FIRST-CELL-PENDING.json`, `FIRST-CELL-LOOKED.txt`, `setup.json`, `records.json`, `accepted-face-source.json`, `native-front-parts.json`, `step1-contact-audit-v1.json`)
- `qa/2026-11-17-AG-352/build_ag352_sheets.py` (created — 56-frame verification, diff stats, and comparison sheet/crop builder)
- `qa/2026-11-17-AG-352/frame-stats.json` (created — MD5s, mean RGBs, and per-frame `before` vs `candidate` pixel diffs)
- `qa/2026-11-17-AG-352/sheet-fourlights-front-3q.jpg` (created)
- `qa/2026-11-17-AG-352/sheet-fourlights-side-back.jpg` (created)
- `qa/2026-11-17-AG-352/sheet-silhouettes-noon.jpg` (created)
- `qa/2026-11-17-AG-352/sheet-head-closes-fourlights.jpg` (created)
- `qa/2026-11-17-AG-352/crop-neck-trap-harness.png` (created)
- No game source or production files edited (`brute-step1-full-ag-v1/failure.json` preserved untouched).

Tests:
- `node crew/crew.mjs slot run antigravity AG-352 --checks "D201 Brute1 corrected native mapper fourlights plusMarine/eyeheadcloses" -- node review/GT-20111/d201/brute-step1-capture-v4.mjs full ag-v2` (rule 16 slot lease, `WebGPU`) -> PASSED exit `0`: `PASS D201 native full 56 frames, exact face/joints/camera/extents, budget/source gates` (`sourceStable: true`, `acceptedFaceExact: true`, `allJointRestAndHeldPoseExact: true`, `matchedCameras: true`, `pageErrors: []`, `15638` tris / `1` mesh BOTH).
- `node review/GT-20111/d201/brute-step1-contact-audit-v1.mjs review/GT-20111/d201/brute-step1-full-ag-v2` -> PASSED exit `0`: `134` parts / `46,914` corners, `maxBindErrorMetres: 0`, `unclaimedCorners: 0`, `29` `head/*` parts `maxWorldErrorMetres: 0`, `6/6` joins `gapMm: 0` (`strictSurface: true`, `noNewContactRed: true`).
- `python qa/2026-11-17-AG-352/build_ag352_sheets.py` -> PASSED exit `0`: `28/28` unique `before` + `28/28` unique `candidate` `1280x900` PNGs; `pairDiffs` confirm localized neck/trap/harness changes (`0.217%..0.793%` full-body 4-light, `0.066%..0.159%` black silhouettes, `2.385%..3.056%` head closes).

Screenshots:
- [sheet-fourlights-front-3q.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-352/sheet-fourlights-front-3q.jpg) — Front & 3/4 full-body + true Marine across Noon, Overcast, Dusk, Night (`before` vs `candidate`).
- [sheet-fourlights-side-back.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-352/sheet-fourlights-side-back.jpg) — Side & Back full-body + true Marine across Noon, Overcast, Dusk, Night (`before` vs `candidate`).
- [sheet-silhouettes-noon.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-352/sheet-silhouettes-noon.jpg) — Noon flat-black silhouettes (`front`, `3/4`, `side`, `back`) beside Marine.
- [sheet-head-closes-fourlights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-352/sheet-head-closes-fourlights.jpg) — `3 m` FOV 35 eye-height head closes (`front` & `3/4`) across all 4 lights.
- [crop-neck-trap-harness.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-17-AG-352/crop-neck-trap-harness.png) — Upper torso / neck / traps / harness comparison crops (`Head Front Noon/Night`, `Head 3/4 Noon/Night`, `Side Noon`, `Back Noon`).

Not verified:
- Public runtime walk/chase/get-up animation contacts, full-body self-clipping, and FPS (outside this static D-201 step-1 native capture scope).
- Production landing approval (remains with Claude 6 / CLAUDE DIRECTOR).

Requests:
- Replied `DONE` to ChatGPT 2's `shots: validated Brute V4 replacement ready; full ag-v2, actual46914corner0error BOTH` request.
- Sent `FYI` to `chatgpt2,claude6,claude` summarizing `AG-352` 56-frame 5080 verification, `step1-contact-audit-v1.json`, comparison sheets in `qa/2026-11-17-AG-352/`, and the 3 visible trap/harness caveats.

Contract changes:
- None.
