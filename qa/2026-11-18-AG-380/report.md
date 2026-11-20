# AG-380 — Brute `rearfin17` Matched Side-Waist Look (Supersedes Model 16 Rear Plane)

- **Date:** 2026-11-18
- **Scope:** Intermediate crew `D-201` / `D-211` visual QA of `review/GT-20111/d201/cloth-hinge-v1/cloth-native-getup-cache-owner-v18-hanging-back/candidate/` (`BRUTE-REAR-FIN-FIX-MATCHED-v1.jpg`, RAW `waist-side-{noon,night}.png`, `side-noon.png`, `waist-threequarter-noon.png`, `key-strike-1-side-close-noon.png`, `key-wind-1-side-close-noon.png`), compared directly against `BEFORE` and model 16 (`brute-step2-fourlights-matched-owner-v2-curved-green` / `v17-weighted-lift`), answering ChatGPT 2's request (`LOOK Brute rearfin17 only: matchedsidewaist +native2530 supersedes16rearplane`). Zero game launches, zero code/test/bar edits; cost/perf, `C2` head regression, and open baseline gates remain open.
- **Sheet Built:**
  - `qa/2026-11-18-AG-380/sheet-brute-rearfin17-compare.jpg` (`1350x1290`, `BEFORE` vs model 16 vs model 17 `rearfin17` across `waist-side` noon/night, `side-noon`, `key-strike-1`, and `key-wind-1`)

## Verified Checks & Counts (Read-Only from `v18-hanging-back` Receipts)
- **`receipt.json` & `REAR-FIN-ONLY-PROTECTED-NATIVE-PROOF-v2.json`:** `sourceStable: true`, `pass: true`, `protectedActualParts: 132` (`maxProtectedWorldCoordinateError: 0`, `maxProtectedBindError: 0`), only the `2` back panels modified (`BRUTE-REAR-FIN-FIX-MATCHED-v1.jpg` camera/projection/scale/`hitH` exact).
- **`cloth-native-fullbody-213.json` (`213` samples):** `contactReds: []`, `maxRootGapMetres: 2.4138e-7` (`0.241 um`), `maxAngleDeg: 24.722 deg`, `maxOldStaticHipsAngleDeg: 24.789 deg`, `rawBodyAngleReds: 6` (retained).
- **`native-getup-contact.json` (`40` samples):** `contactReds: []`, `maxOldStaticHipsAngleDeg: 35.543 deg`, `minClothFloorGap: +0.29468 m`, `rawBodyAngleReds: 38` (retained).
- **`native-flagged-cache.json`:** `pass: true`, `key: 'brute:1.38'`, `WebGPU`.

## Visual Findings (`model 17 rearfin17` vs `model 16`)
1. **PASS on Rear Fin Fix (`waist-side-noon.png`, `waist-side-night.png`, `side-noon.png`, `key-strike-1-side-close-noon.png`):**
   - Model 16's stiff backward-projecting rear fin behind the hip is resolved: in both standing (`waist-side-{noon,night}.png`, `side-noon.png`) and forward strike (`key-strike-1-side-close-noon.png`), the rear panels now hang down cleanly close along the buttock and upper thigh with zero thigh clipping.
2. **MINOR — Rear Panel Top Attachment Crease & Windup Tip:**
   - **Where:** `candidate/waist-side-noon.png`, `candidate/key-strike-1-side-close-noon.png`, `candidate/key-wind-1-side-close-noon.png`.
   - **What is visible:** The rear panel's upper hinge edge still sits slightly proud along a sharp dark crease on the grey loincloth, and during deep windup (`key-wind-1-side-close-noon.png`) its lower edge still tilts outward slightly (~10 deg), though far cleaner than model 16's shelf.
3. **Retained Step 2 & Windup Notes (Not Changed by `rearfin17`):**
   - Front/side flap shingle-cut top edges & side-flap gap (`waist-side/3q`) and upper-elbow step / bell-cone forearm taper (`AG-379`) remain unchanged as expected.
   - Note: in `key-wind-1-side-close-noon.png` (identical in model 16 `v17` and model 17 `v18`), the right-side chest-plate harness straps float wide off the torso during the windup pose (pre-existing chest-strap skinning behavior, not introduced by `rearfin17`).
