# antigravity — AG-382 Spider19->20->21 cumulative look (AG378 cuffs, rounded knee balls, material pass) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual QA and receipt audit across all three open Spider requests from ChatGPT 2:
  1. `Spider19` (`review/GT-20111/d204/spider-shape-p4-owner-v15-rounded19/`): AG-378 cuffs/neck + eyes/fangs/tibiae/hooks.
  2. `Spider20` (`review/GT-20111/d204/spider-shape-p4-owner-v16-ballknee20/`): rounded 15 cm knee balls + 8 hairs superseding Spider19 flat cuffs.
  3. `Spider21` (`review/GT-20111/d204/spider-shape-p4-owner-v17-material21/`): material pass on accepted Spider20 geometry (night-first, four lights, all 58 geometry exact, 4 black silhouettes pixel-identical).
- Built `3` zoomed comparison sheets and `report.md` in `qa/2026-11-18-AG-382/`. Zero game launches, zero code/test/bar edits.
- Key visual findings:
  - **Spider19:** Neck tuck, larger pale-green eyes (much better night pop), darker longer fangs, fuller proximal tibiae, and inward upper hooks PASS. AG-378 needle-like ventral shards removed, but minor-moderate angular dark-brown low-poly wedge facets still protrude slightly on the undersides of front/mid/rear femur root cuffs (`close-side-noon`). Flat log-stump knee cuffs superseded by Spider20.
  - **Spider20:** Rounded 15 cm knee balls + 8 seated hairs PASS (completely removes Spider19 flat log-stump tops in front/3q/side/back + black silhouettes); wood-bark knee/neck texture superseded by Spider21.
  - **Spider21 (current cumulative candidate) — STRONG PASS on material direction:** Removing wood-grain from the knees/neck and switching to pale keratin knee poles + dark equatorial bands + wet dark neck collar + matte lateral eye beads transforms visual cohesion across all 4 lights (`noon`, `overcast`, `dusk`, `night`) and wide distance, while preserving exact geometry (`58/58`, `0/1,152,000` black silhouette pixel diffs).
  - **Spider21 minor/polish art notes:** (1) Ridged dorsal carapace plate crest/crease contrast is very subtle vs Geometry20 (`3q-noon`/`side-noon` nearly uniform tan; deeper inter-plate crease shading would strengthen chitin armor read at wide distance); (2) wet cervical collar catches a slightly broad glossy rubber-like highlight under direct `close-side-noon` (looks great at night/3q); (3) close-up knee hairs tidy, naturally subtle at wide distance; (4) retained minor Spider19 ventral femur-root wedge facets (`side-noon`) and angular lower-shin hook kink (`front/3q-noon`).
  - **Open non-visual gates NOT waived:** `spider21-original-gates-owner-v1` `t111`/`t222` head-core RED (awaiting Director A/B call), pre-existing live feet/slide defects, and raw C5 quaternion-double-cover corpse reds.

Files:
- `qa/2026-11-18-AG-382/build_sheet.py`
- `qa/2026-11-18-AG-382/sheet-spider19-20-cuffs-knees-zoom.jpg` (`1382x1150`)
- `qa/2026-11-18-AG-382/sheet-spider21-material-zoom.jpg` (`1304x1390`)
- `qa/2026-11-18-AG-382/sheet-spider21-head-claws-zoom.jpg` (`1382x1290`)
- `qa/2026-11-18-AG-382/report.md`
- `handoffs/2026-11-18-antigravity-AG-382.md`

Tests:
- Read-only verification of `v15-rounded19`, `v16-ballknee20`, and `v17-material21` receipts (`receipt.json`, `*-protected-rest-proof.json`, `MATERIAL21-MATCHED-BLACK-PIXELS-v1.json`, `SPIDER-MATERIAL21-ALL58-SOURCE-GEOMETRY-CPU-v2.json`, `SPIDER19-SAME1216-MOTION-HOOK-FLOOR-v2.json`, and all 6 `before/plan` `NATIVE-LIVE29-DEATH61-*-CONTACT-*.json` + `native-death.json` + `native-gait.json`): `WebGPU`, `sourceStable: true`, `pageErrors: []`, `4,736` tris / `1` draw (`<= 4,742`), `hitH: 0.95`, all `90` poses `58/58` rooted / `0` floating / `0` non-adjacent contacts, corpse `minFloorGap: +0.194012 mm`, Spider21 `58/58` byte-exact source geometry & `0/1,152,000` black silhouette pixel diffs across all 4 views.
- `python qa/2026-11-18-AG-382/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected `SPIDER19-{PRIMARY-REVIEW,FEATURES-HEAD,GEOMETRY-CONTEXT}-v1.jpg`, `SPIDER20-{KNEE-FIX-PRIMARY,GEOMETRY-CONTEXT}-v1.jpg`, `SPIDER21-{MATERIAL-PRIMARY,HEAD-FEATURES,GEOMETRY-CONTEXT}-v1.jpg`, all 4 `PAIR-{FRONT,THREEQUARTER,SIDE,BACK}-FOURLIGHTS-v1.jpg` of Spider21, and all 3 zoomed RAW-crop sheets in `qa/2026-11-18-AG-382/`.

Not verified:
- No new game launch (`REVIEW ONLY`), no production edits, no gameplay perf / full-clip animation / route verification, and open original `t111`/`t222` head-core RED, live feet/slide defects, and raw C5 corpse reds remain unwaived.

Requests:
- Replied `DONE` to all 3 ChatGPT 2 Spider requests (`LOOK Spider19 details and AG378 cuffs`, `LOOK Spider20 rounded knee balls`, `LOOK Spider21 material pass`) and sent consolidated `--fyi` to `chatgpt2,claude`.

Contract changes:
- None.
