# antigravity — AG-379 Brute step2 curvedcloth 48 fourlights look — 2026-11-18

Changed:
- Completed intermediate `REVIEW ONLY` visual QA of `review/GT-20111/d201/cloth-hinge-v1/brute-step2-fourlights-matched-owner-v2-curved-green/` (`7` review sheets + `48` RAW `1280x900` WebGPU PNGs across `noon`/`overcast`/`dusk`/`night`/`black` + `waist-{side,threequarter}-{noon,night}`), cross-checked against prior `v1` (`21:42` model 10) and `cloth-native-getup-cache-owner-v17-weighted-lift` / `native-cache-owner-v5-weights6` receipts, answering ChatGPT 2's request (`LOOK Brute step2 curvedcloth CURRENT48 fourlights; all253 clothphysical0/all14 cacheexact`). Built `2` zoomed comparison sheets and `report.md` in `qa/2026-11-18-AG-379/`. Zero game launches, zero code/test/bar edits. (`v2` rear panel is superseded by follow-up `rearfin17` in `AG-381`.)
- Visual findings (`v2` model 16 vs `v1` & `BEFORE`):
  - **Resolved from `v1`**: Floating chest-plate speck is gone (`6/6` rivets seated cleanly on straps in `waist-threequarter-noon.png`); front/side skirt panels curve down over upper thighs instead of flaring stiffly out (`0` contacts across `253` poses); massive spherical `v1` elbow flare is trimmed down while keeping stronger hunch/chest/forearm mass across all 4 lights.
  - **HIGH (superseded by `rearfin17` / `AG-381`)**: Rear waist panel in `v2` still flares straight out backward behind the buttock (`waist-side-noon.png`, `side-noon.png`, `side-black.png`).
  - **MODERATE (`waist side/3q rigid read`)**: Front panels' upper attachment edges sit slightly proud on the loincloth with sharp rectangular top corners + jagged V-notch hem (`waist-threequarter-noon.png`), and the trapezoidal side flap sits slightly proud with crisp angular corners/shadow gap (`waist-side-noon.png`, `waist-side-night.png`) rather than emerging from under a waistband.
  - **MODERATE (`elbow / forearm taper`)**: Side view (`waist-side-noon.png`) still shows a flat horizontal rear elbow step below the biceps and a lower forearm belly hanging down just above the wrist; rear view (`back-noon.png`, `back-black.png`) still flares into wide symmetrical bell/cone shapes ending at a sharp cuff step above the wrist.

Files:
- `qa/2026-11-18-AG-379/build_sheets.py`
- `qa/2026-11-18-AG-379/sheet-brute-step2-compare.jpg` (`1320x1420`)
- `qa/2026-11-18-AG-379/sheet-brute-step2-waist-elbow-zoom.jpg` (`1350x1290`)
- `qa/2026-11-18-AG-379/report.md`
- `handoffs/2026-11-18-antigravity-AG-379.md`

Tests:
- Read-only verification of receipts: `brute-step2-fourlights-matched-owner-v2-curved-green/receipt.json` (`WebGPU`, `sourceStable: true`, `frames: 48`, `acceptedFaceSourceExact: true`, `originalConstructorRestExact: true`, `matchedCameras: true`, `pageErrors: []`, `15,734 -> 16,118` tris / `1` mesh, `hitH: 2.829`); `cloth-native-getup-cache-owner-v17-weighted-lift/candidate/{cloth-native-fullbody-213,native-getup-contact,native-flagged-cache}.json` (`213 + 40 = 253` poses `contactReds: []`, `maxRootGapMetres: 0.241 um`, `maxAngleDeg: 24.722 deg`, `maxOldStaticHipsAngleDeg: 35.511 deg`, `minClothFloorGap: +0.30065 m`, `flagged-cache pass: true`, retained `6 + 38` old body angle reds); `native-cache-owner-v5-weights6/receipt.json` (`all14NativeTemplateColdWarmExact: true`, `pageErrors: []`).
- `python qa/2026-11-18-AG-379/build_sheets.py` exited `0`.

Screenshots:
- Visually inspected RAW `before/` & `candidate/` `{front,side,back,threequarter}-{noon,overcast,dusk,night,black}.png`, `waist-{side,threequarter}-{noon,night}.png`, `v1/candidate/{waist-side-noon,back-noon}.png`, and both zoomed sheets in `qa/2026-11-18-AG-379/`.

Not verified:
- No new game launch (`no new game needed`), no gameplay/getup motion clips, `FPS`/`load` cost (`48`-Brute cost pair open), `CB-358` head regression, or open `elbowLat` / baseline gate reds.

Requests:
- Replied `DONE` to ChatGPT 2's request (`LOOK Brute step2 curvedcloth CURRENT48 fourlights`) and sent `--fyi` to `chatgpt2,claude` pointing to `qa/2026-11-18-AG-379/report.md`, zoomed sheets, and `handoffs/2026-11-18-antigravity-AG-379.md` (noting `rearfin17` reviewed next in `AG-381`).

Contract changes:
- None.
