# antigravity — AG-380 Brute rearfin17 matched side waist look (supersedes v16 rear) — 2026-11-18

Changed:
- Completed intermediate `REVIEW ONLY` visual QA of `review/GT-20111/d201/cloth-hinge-v1/cloth-native-getup-cache-owner-v18-hanging-back/candidate/` (`BRUTE-REAR-FIN-FIX-MATCHED-v1.jpg` + RAW `waist-side-{noon,night}.png`, `side-noon.png`, `waist-threequarter-noon.png`, `key-strike-1-side-close-noon.png`, `key-wind-1-side-close-noon.png`) vs `BEFORE` and model 16 (`v2` / `v17`), answering ChatGPT 2's request (`LOOK Brute rearfin17 only: matchedsidewaist +native2530 supersedes16rearplane`). Built comparison sheet and `report.md` in `qa/2026-11-18-AG-380/`. Zero game launches, zero code/test/bar edits.
- Visual findings (`model 17 rearfin17` vs `model 16`):
  - **Rear fin FIX PASS**: Rear panels now drape down close behind the buttock/upper thigh in standing (`waist-side-{noon,night}.png`, `side-noon.png`) and strike (`key-strike-1-side-close-noon.png`), eliminating model 16's sticking-out rear fin (`253` poses `contactReds: []`, `maxRootGap: 0.241 um`, `minClothFloorGap: +0.29468 m`, `132/132` protected parts exact).
  - **MINOR**: Rear panel's top attachment edge still shows a crisp dark step seam on the loincloth (`waist-side-noon.png`, `key-strike-1-side-close-noon.png`), with slight ~10 deg outward tilt in `key-wind-1-side-close-noon.png`.
  - **Retained**: Non-rear Step 2 items from `AG-379` (front/side flap top cuts + side gap, elbow step/bell forearm) remain unchanged; pre-existing windup chest-strap separation noted in `key-wind-1-side-close-noon.png` (identical to model 16 `v17`).

Files:
- `qa/2026-11-18-AG-380/build_sheet.py`
- `qa/2026-11-18-AG-380/sheet-brute-rearfin17-compare.jpg` (`1350x1290`)
- `qa/2026-11-18-AG-380/report.md`
- `handoffs/2026-11-18-antigravity-AG-380.md`

Tests:
- Read-only verification of `v18-hanging-back` receipts (`receipt.json`, `REAR-FIN-ONLY-PROTECTED-NATIVE-PROOF-v2.json`, `cloth-native-fullbody-213.json`, `native-getup-contact.json`, `native-flagged-cache.json`): `sourceStable: true`, `protectedActualParts: 132` exact (`maxProtectedWorldCoordinateError: 0`), `213 + 40 = 253` poses `contactReds: []`, `maxRootGapMetres: 0.241 um`, `minClothFloorGap: +0.29468 m`, `flagged-cache pass: true`, retained `6 + 38` old body angle reds.
- `python qa/2026-11-18-AG-380/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected `v18-hanging-back/candidate/{waist-side-noon,waist-side-night,side-noon,waist-threequarter-noon,key-strike-1-side-close-noon,key-wind-1-side-close-noon}.png`, `v17-weighted-lift/candidate/key-wind-1-side-close-noon.png`, and `qa/2026-11-18-AG-380/sheet-brute-rearfin17-compare.jpg`.

Not verified:
- No new game launch (`no new game`), no `48`-Brute FPS/cost pair (separate queued work), `CB-358` head regression, or open baseline gate reds.

Requests:
- Replied `DONE` to ChatGPT 2's request (`LOOK Brute rearfin17 only`) and sent `--fyi` to `chatgpt2,claude` pointing to `qa/2026-11-18-AG-380/report.md`, comparison sheet, and `handoffs/2026-11-18-antigravity-AG-380.md`.

Contract changes:
- None.
