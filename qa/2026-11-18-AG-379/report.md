# AG-379 — Brute Step 2 Curved Cloth `CURRENT48` Four-Light Look (Model 16)

- **Date:** 2026-11-18
- **Scope:** Intermediate crew `D-201` / `D-211` visual QA of `review/GT-20111/d201/cloth-hinge-v1/brute-step2-fourlights-matched-owner-v2-curved-green/` (`BRUTE-STEP2-PRIMARY-REVIEW-v1.jpg`, `BRUTE-STEP2-WAIST-CLOSE-v1.jpg`, `BRUTE-STEP2-GEOMETRY-v1.jpg`, `PAIR-{front,side,back,threequarter}-FOURLIGHTS-v1.jpg`, and RAW `before/` & `candidate/` `1280x900` WebGPU PNGs across `noon`, `overcast`, `dusk`, `night`, `black`, and `waist-{side,threequarter}-{noon,night}`), cross-checked against prior `v1` (`21:42` model 10) and `cloth-native-getup-cache-owner-v17-weighted-lift` / `native-cache-owner-v5-weights6` receipts. Answering ChatGPT 2's request (`LOOK Brute step2 curvedcloth CURRENT48 fourlights; all253 clothphysical0/all14 cacheexact`). **Note:** `v2` model 16's rear panel is superseded by follow-up request `LOOK Brute rearfin17 only` (inspected separately in `AG-381`). Zero game launches, zero code/test/bar edits; not whole-gameplay/perf/landing verified.
- **Sheets Built:**
  - `qa/2026-11-18-AG-379/sheet-brute-step2-compare.jpg` (`1320x1420`, `BEFORE` vs prior `v1` vs current `v2` across `front`, `side`, `back`, `3/4` noon)
  - `qa/2026-11-18-AG-379/sheet-brute-step2-waist-elbow-zoom.jpg` (`1350x1290`, zoomed `BEFORE` / `v1` / `v2` waist close-ups, chest fasteners, side/rear flaps, and back forearm/elbow taper)

## Verified Checks & Counts (Read-Only from Receipts)
- **`brute-step2-fourlights-matched-owner-v2-curved-green/receipt.json`:** `WebGPU`, `sourceStable: true`, `frames: 48`, `acceptedFaceSourceExact: true`, `originalConstructorRestExact: true`, `matchedCameras: true`, `pageErrors: []`; `before` `15,734` tris / `1` mesh (`hitH: 2.829`) -> `candidate` `16,118` tris (`+384` tris) / `1` mesh (`hitH: 2.829`).
- **`cloth-native-getup-cache-owner-v17-weighted-lift/candidate/`:**
  - `cloth-native-fullbody-213.json`: `213` samples (`160` travel + `52` busy), `contactReds: []`, `maxRootGapMetres: 2.4138e-7` (`0.241 um`), `maxAngleDeg: 24.722 deg`, `maxOldStaticHipsAngleDeg: 24.789 deg`, `rawBodyAngleReds: 6` (retained).
  - `native-getup-contact.json`: `40` samples, `contactReds: []`, `maxOldStaticHipsAngleDeg: 35.511 deg`, `minClothFloorGap: +0.30065 m`, `rawBodyAngleReds: 38` (retained old `elbowLat` reds).
  - `native-flagged-cache.json`: `pass: true`, `key: 'brute:1.38'`, `WebGPU`.
- **`native-cache-owner-v5-weights6/receipt.json`:** `all14NativeTemplateColdWarmExact: true`, `pageErrors: []`.

## What Improved Cleanly (`v2` Model 16 vs `v1` 21:42 & `BEFORE`)
1. **Floating chest-plate dot RESOLVED:** In `v1/candidate/waist-side-noon.png`, a stray brown speck floated in mid-air ahead of the chest/biceps crease; in `v2/candidate/waist-side-noon.png` & `waist-threequarter-noon.png`, it is gone and all `6` rivets sit cleanly on the two vertical chest-plate leather straps.
2. **Front & side skirt panels curved and thigh-hugging:** Unlike `v1`'s stiff `~35-40 deg` plank flare, the two front brown panels in `v2/candidate/waist-threequarter-noon.png` & `front-noon.png` curve cleanly downward over the upper thighs (`0` contacts across `253` poses), and the small trapezoidal side flaps hug closer along the dark grey loincloth.
3. **Rear elbow bulb reduced vs `v1`:** The massive spherical/pumpkin elbow flare in `v1/candidate/back-noon.png` and rear shelf in `v1/candidate/waist-side-noon.png` are noticeably slimmed down in `v2`, preserving the stronger Step 2 hunch, deep chest, and fuller forearms over `BEFORE` across all four lighting presets (`noon`, `overcast`, `dusk`, `night`) and silhouettes (`black`).

## Concrete Remaining Art Findings (`v2` Model 16)
1. **HIGH (Superseded by `rearfin17` / `AG-381`) — Stiff backward-flaring rear waist fin (`waist-side-noon.png`, `waist-side-night.png`, `side-noon.png`, `side-black.png`, `back-noon.png`):**
   - In `v2`, the rear skirt panels jut backward behind the buttock like a rigid angled fin/shelf instead of hanging down with gravity. (Addressed in model 17 `rearfin17`, reviewed separately in `AG-381`.)
2. **MODERATE (Art FIX — Waist `side` / `3/4` rigid read):**
   - **Where:** `candidate/waist-threequarter-noon.png`, `candidate/waist-threequarter-night.png`, `candidate/waist-side-noon.png`, `candidate/waist-side-night.png`.
   - **What is visible:** Although curved downward along the thigh, the front panels' **top edges** still sit slightly proud on the grey loincloth with sharp rectangular upper corners (viewer's-left front flap) and an abrupt jagged V-notch cut on the viewer's-right front flap, reading somewhat like hinged leather plates rather than strips emerging from under a belt/waistband. On `waist-side-noon.png` / `waist-side-night.png`, the side trapezoidal flap still sits slightly proud with crisp angular corners and a dark shadow seam under its front-lower edge.
3. **MODERATE (Art FIX — Elbow top step & bell-shaped forearm from behind):**
   - **Where:** `candidate/waist-side-noon.png`, `candidate/waist-side-night.png`, `candidate/back-noon.png`, `candidate/back-black.png`.
   - **What is visible:** From the side (`waist-side-noon.png`), the **upper posterior elbow** retains a flat horizontal step/ledge jutting backward below the biceps crease, while the lower forearm belly still droops slightly downward right above the wrist. From behind (`back-noon.png`, `back-black.png`), both forearms flare outward symmetrically into wide conical bell shapes ending in a sharp horizontal cuff step just above the wrist (the bracer strap line) rather than tapering anatomically into the wrist.
4. **Retained Baseline / Non-Waived Items:**
   - Red skin wedge poking through outer metal bracers (`waist-threequarter-noon.png`, `front-noon.png`, present in `BEFORE`), flat dark foot plates under block boots, back-plate hanging tabs, and open `C2` head/getup `elbowLat`/`FPS`/`load`/gameplay-motion gates remain unwaived.
