# AG-383 Visual QA Report — Spider22 AG-382 Polish Look (Root Wedges, Carapace Ridges, Neck Sheen; REVIEW ONLY)

- **Date:** 2026-11-18 (2026-11-19 UTC)
- **Reviewer:** Antigravity (`Gemini 4 Carbon`)
- **Scope:** Read-only visual inspection + receipt audit answering ChatGPT 2's open Spider22 request (`LOOK Spider22 AG382 root wedge ridge and neck polish: native52 contact0`) on `review/GT-20111/d204/spider-shape-p4-owner-v18-polish22/` (`BEFORE21` = Spider21 material pass vs `REVIEW22` = Spider22 polish).
- **Game launches / code edits:** Zero (`REVIEW ONLY`, no production/test/bar changes).

## Zoomed Comparison Sheets Built
- `qa/2026-11-18-AG-383/sheet-spider22-roots-neck-zoom.jpg` (`1382x1110`) — `Spider17` -> `Spider21` -> `Spider22` tight zooms on the ventral femur root sockets and cervical neck collar across `side-noon`, `side-overcast`, `side-dusk`, `side-night`, `3q-noon`, and `3q-night`.
- `qa/2026-11-18-AG-383/sheet-spider22-ridges-zoom.jpg` (`1304x1390`) — `Spider21` vs `Spider22` night-first (`3q-night`, `back-night`) and noon (`3q-noon`, `back-noon`) tight zooms on dorsal carapace plate ridge/crease contrast.
- `qa/2026-11-18-AG-383/sheet-spider22-wide-sil-zoom.jpg` (`1264x1310`) — `Spider21` vs `Spider22` zoomed gameplay distance (`wide-threequarter-noon/night`), `close-side-black` underside root contour trim, and `head-threequarter-noon` unchanged head/eyes/fangs check.

## Verified Receipts (Read-Only)
All claims in the request verified directly against `review/GT-20111/d204/spider-shape-p4-owner-v18-polish22/`:
- **`receipt.json`:** `WebGPU`, `sourceStable: true`, `pageErrors: []`, `frames: 52`, `matchedCameras: true`, `allOriginalRigRestExact: true`, `4,736` tris / `1` draw (`<= 4,742` original cap), `hitH: 0.95`.
- **`polish22-protected-rest-proof.json`:** `protectedActualParts: 52` exact; all `6` hook lowest-3 cm support corners (`48/48/48/48/60/60`) `maxError: 0`.
- **`POLISH22-SHEET-MANIFEST-v1.json`:** `uniqueSources: 52`, `noRetouch: true`, all cells `cropped: false`, `retouched: false`.
- **Black silhouette pixel diff (`before` vs `plan`, `1280x900` raw PNGs):** `front` `0/1,152,000` (identical), `back` `13/1,152,000`, `threequarter` `91/1,152,000`, `side` `325/1,152,000` (strictly localized to the tucked ventral femur-root facets).
- **Strict `2 um` support & non-adjacent contact audit (`{before,plan}/NATIVE-LIVE29-DEATH61-POLISH22-CONTACT-v10.json`):** `90/90` rows (`29` live keyframes + `61` corpse frames) in BOTH `before` and `plan`: `minRootedParts: 58`, `maxFloatingParts: 0`, `maxComponents: 1`, `maxNonAdjacentContacts: 0`, `maxWorstFive: 0`.
- **Live & corpse motion samples (`{before,plan}/native-gait.json`, `native-death.json`):** `608` live samples (`29` keyframes) + `61` corpse frames per phase; corpse `minFloorGap: +0.194012 mm` in both `before` and `plan`.

---

## Visual Verdict on the Three AG-382 Polish Items

**Overall Art Verdict: PASS (clean targeted polish on all 3 AG-382 items; supersedes Spider21 visually).**

1. **Ventral femur root-seat wedge removal — PASS** (`sheet-spider22-roots-neck-zoom.jpg` Rows 1–4, `sheet-spider22-wide-sil-zoom.jpg` Row 3 `side-black`, `PAIR-SIDE-FOURLIGHTS-v1.jpg`):
   - The protruding angular dark-brown low-poly wedge corners under the front, mid, and rear femur root seats flagged in AG-382 (`Spider21` `side-noon`/`side-overcast`/`side-night`) are cleanly tucked and smoothed into the lower thorax/femur contour.
   - In `close-side-black` (`325` changed silhouette pixels) and all four lights (`noon`, `overcast`, `dusk`, `night`), the underside edge of the front and rear roots is now smooth and continuous with no jagged dark triangular teeth hanging below the joint line. The subtle dark root membrane remaining in the seam reads naturally as a socket crease rather than protruding debris.

2. **Cervical neck matte sheen — PASS** (`sheet-spider22-roots-neck-zoom.jpg` Rows 1–4, `PAIR-SIDE-FOURLIGHTS-v1.jpg`, `PAIR-THREEQUARTER-FOURLIGHTS-v1.jpg`):
   - Switching the cervical collar and root membrane to the darker, rougher existing atlas family completely eliminates Spider21's broad glossy/rubbery specular band under direct `close-side-noon` and `close-side-overcast` lighting.
   - Across `noon`, `overcast`, `dusk`, and `night` (side and 3/4), the neck now reads as cohesive matte-dark chitin/leathery tissue bridging the pale-bone thorax and skull cleanly.

3. **Dorsal carapace plate ridge/crease contrast — PASS (improved; strongest at night and close-ups, subtle-moderate in bright noon/wide)** (`sheet-spider22-ridges-zoom.jpg` Rows 1–4, `sheet-spider22-wide-sil-zoom.jpg` Rows 1–2, `PAIR-BACK-FOURLIGHTS-v1.jpg`, `PAIR-THREEQUARTER-FOURLIGHTS-v1.jpg`):
   - **Night-first (`3q-night`, `back-night`, `side-night`):** Transverse inter-plate shadow bands between the dorsal spines are visibly darker and cleaner than Spider21, giving clearer segmented chitin armor structure without texture noise or new draws.
   - **Noon & wide (`3q-noon`, `back-noon`, `wide-threequarter-noon/night`):** Segmentation bands read cleaner up close (`back-noon`, `side-noon`), while remaining fairly natural/subtle under direct bright noon light and at `wide-threequarter` gameplay distance. Clean and cohesive as-is — no further crease darkening required for this pass unless Jerry explicitly asks for heavier graphic grooves later.

4. **Protected features verified unchanged — PASS** (`SPIDER22-HEAD-FEATURES-v1.jpg`, `PAIR-FRONT-FOURLIGHTS-v1.jpg`, `sheet-spider22-wide-sil-zoom.jpg` Row 4):
   - Pale-cyan central eyes (strong night pop), 4 matte reddish-brown lateral eye beads, dark-tipped fangs, rounded 15 cm keratin-pole knee balls with dark equatorial bands + 8 radial hairs, and lower tibiae/hooks match Spider21 visually and preserve all `52` protected parts and `6` foot support corners (`maxError: 0`).
   - Retained untouched geometry note from AG-382: the angular lower-shin kink just above the protected foot hooks (`front/3q-noon`) remains intentionally unchanged to preserve lowest-3 cm support corners.

## Open / Unwaived Gates (Not Waived by This Look)
- **Original Spider21 head-core gate RED (`spider21-original-gates-owner-v1`):** `t111` head-centre `48/48` blocked (`0` headshot vs `14` body) and `t222` Spider regression (`2H/2B` vs `5H/1B`) — Spider22 leaves the head untouched; awaiting Director A (owner contract) vs B (resculpt) decision.
- **Pre-existing live feet/slide defects** (`walk`/`spit-snap`, motion owner), **raw original C5 quaternion-double-cover corpse reds** (`min -344.05 deg`; wrapped `159.5 deg` INFO only), and **Spider48 performance** (not measured on Spider22; Spider21 pair was `18.1 fps / 13.5 low` vs `17.0 / 12.5` original, below 60 fps target) remain open and unwaived.
- Private review checkpoint only — no production landing or finished-for-Jerry claim.
