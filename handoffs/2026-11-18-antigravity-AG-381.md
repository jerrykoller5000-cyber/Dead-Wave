# antigravity — AG-381 Spider17 corrected inward corpse curl filmstrip look (supersedes UPtips) — 2026-11-18

Changed:
- Completed intermediate `REVIEW ONLY` visual QA of `review/GT-20111/d204/spider-death-retarget-owner-v9-world-limited-inward/` (`before-native-inward-filmstrip-v1.png`, `plan-native-inward-filmstrip-v1.png`, and all `12` RAW keyframe PNGs `death-frame-{00,10,20,30,43,60}.png`), superseding `AG-377` (`v5` UPtips), answering ChatGPT 2's request (`LOOK Spider corrected INWARD corpse curl supersedes UPtips: actual61 contact0/range159.5`). Built `2` zoomed comparison sheets and `report.md` in `qa/2026-11-18-AG-381/`. Zero game launches, zero code/test/bar edits.
- Visual findings (`PLAN INWARD curl` vs `BEFORE UPtips`):
  - **Dead-curl motion read PASS (`f30..f60`)**: Eliminates the upright coat-hook leg spikes seen in `UPtips` (`BEFORE f30..f60`): `PLAN f30` folds smoothly downward and `PLAN f43..f60` raise the knees while tucking all six lower tibias and claws inward/downward along and under the flanks (`0` non-adjacent contacts across `61` frames, `58/58` rooted, `+0.032 mm` floor, `159.5 deg` max knee clamp inside `160 deg`).
  - **Retained art/trajectory notes**: Pre-`Spider19` `AG-378` ventral femur-cuff shards and pinched front-femur cuff notch remain visible at `f43/f60` (evaluated on `Spider19` in `AG-382`); preserved `.72 s` torso trajectory keeps forebody level/upright above folded legs (`f43` and `f60` nearly identical); live feet-floor (`walk`/`spit-snap`) & non-curl D-204 items unwaived.

Files:
- `qa/2026-11-18-AG-381/build_sheet.py`
- `qa/2026-11-18-AG-381/sheet-spider-inward-frames.jpg` (`1160x1480`)
- `qa/2026-11-18-AG-381/sheet-spider-inward-closeup.jpg` (`1280x1360`)
- `qa/2026-11-18-AG-381/report.md`
- `handoffs/2026-11-18-antigravity-AG-381.md`

Tests:
- Read-only verification of `v9-world-limited-inward` receipts (`receipt.json`, `before/plan` `NATIVE-EVERY-WORLD-LIMITED-INWARD-CONTACT-v5.json`, `native-death.json`): `sourceStable: true`, `61/61` frames `58/58` rooted (`0` floating), `maxNonAdjacentContacts: 0`, `plan minFloorGap: +0.032 mm`, `maxWrappedDeg: 159.500 deg` / `maxRawDeg: 159.500 deg` (`<= 160 deg`, raw C5 double-cover rule retained).
- `python qa/2026-11-18-AG-381/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected `before-native-inward-filmstrip-v1.png`, `plan-native-inward-filmstrip-v1.png`, all `12` RAW `death-frame-{00,10,20,30,43,60}.png`, and both zoomed sheets in `qa/2026-11-18-AG-381/`.

Not verified:
- No new game launch (`no new game needed`), no gameplay-camera/full-clip live/walk/spit checks, no `Spider19` geometry (covered next in `AG-382`), and live feet-floor defects remain unwaived.

Requests:
- Replied `DONE` to ChatGPT 2's request (`LOOK Spider corrected INWARD corpse curl`) and sent `--fyi` to `chatgpt2,claude` pointing to `qa/2026-11-18-AG-381/report.md`, zoomed sheets, and `handoffs/2026-11-18-antigravity-AG-381.md`.

Contract changes:
- None.
