# antigravity — AG-377 Spider naturalleg15 death2 filmstrip look — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual inspection of `review/GT-20111/d204/spider-death-retarget-owner-v5/` (`before-native-death-filmstrip-v1.png`, `plan-native-death-filmstrip-v1.png`, and all 12 RAW keyframe PNGs `death-frame-{00,10,20,30,43,60}.png`), answering ChatGPT 2's request (`LOOK Spider naturalleg15 original-vs-death2 filmstrips; all61 floorcontacts proved, rootseams stillopen`, noting `FYI correction BEFORE Spider corpse max14 contacts, not12`). Built 2 zoomed comparison sheets and report in `qa/2026-11-18-AG-377/`. Zero game launches, zero code/test/bar edits.
- Visual findings (`PLAN death2` vs `BEFORE`):
  - **Resolved clipping & floor sink**: `BEFORE` bundles femurs and stabs black claws through the thorax/neck (`f30..f60`, `14` max contacts, `-132.03 mm` floor); `PLAN` clears all legs and floor across all `61` frames (`0` non-adjacent contacts, `+0.117 mm` min floor gap).
  - **HIGH (Motion Read `f30..f60`) — Unnatural upright "coat-hook" corpse pose**: After splaying horizontally in `f20`, `f30..f60` drop knees to the floor while all six tibias and dark claws point straight UP into the air around an upright hovering body (`plan/death-frame-{30,43,60}.png`). Needs inward/underneath curl or relaxed ground settle rather than six vertical upward hooks.
  - **MODERATE-HIGH — Retained open root/neck gaps (`f00..f60`)**: Pre-socket `naturalleg15` geometry shows open neck-to-body and femur-root gaps across all frames (`12..22` floating parts; evaluated separately on `Spider17` in `AG-378`). Not whole-model verified.

Files:
- `qa/2026-11-18-AG-377/build_sheet.py`
- `qa/2026-11-18-AG-377/sheet-spider-death2-frames.jpg` (`1160x1480`)
- `qa/2026-11-18-AG-377/sheet-spider-death2-closeup.jpg` (`1280x920`)
- `qa/2026-11-18-AG-377/report.md`
- `handoffs/2026-11-18-antigravity-AG-377.md`

Tests:
- Read-only verification of `review/GT-20111/d204/spider-death-retarget-owner-v5/{receipt.json,before/NATIVE-EVERY-DEATH-FRAME-CONTACT-SUPPORT-v3.json,plan/NATIVE-EVERY-DEATH-FRAME-CONTACT-SUPPORT-v3.json,before/native-death.json,plan/native-death.json}`: `WebGPU`, `sourceStable: true`, `61` keyframes each; `before` `maxNonAdjContacts: 14` (`35` frames), `minFloorGap: -0.132034 m`; `plan` `maxNonAdjContacts: 0` (`61/61` frames), `minFloorGap: +0.000117 m`; `floatingParts: 12..22` in both.
- `python qa/2026-11-18-AG-377/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected `before-native-death-filmstrip-v1.png`, `plan-native-death-filmstrip-v1.png`, all 12 RAW PNGs (`before/death-frame-{00,10,20,30,43,60}.png`, `plan/death-frame-{00,10,20,30,43,60}.png`), and both sheets in `qa/2026-11-18-AG-377/`.

Not verified:
- No new game launch (`no new game needed`), no whole-model / `Spider17` socket check (covered in `AG-378`), no live walk/gait/spit/attack clips or intermediate frames outside the 6 captured keyframes per phase.

Requests:
- Replied `DONE` to ChatGPT 2's request (`LOOK Spider naturalleg15 original-vs-death2 filmstrips`) and sent `--fyi` to `chatgpt2,claude` pointing to `qa/2026-11-18-AG-377/report.md`, zoomed sheets, and `handoffs/2026-11-18-antigravity-AG-377.md`.

Contract changes:
- None.
