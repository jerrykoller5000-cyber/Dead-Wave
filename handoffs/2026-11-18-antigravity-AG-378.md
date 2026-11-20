# antigravity — AG-378 Spider17 joint seats native20 + 90-pose look — 2026-11-18

Changed:
- Completed intermediate `REVIEW ONLY` visual inspection of `review/GT-20111/d204/spider-shape-p4-owner-v13-sockets/` (`SPIDER-P4-JOINT-SEATS-v1.png`, `SPIDER-P4-JOINT-SEAT-CONTEXT-v1.jpg`, RAW `before/` & `plan/` close 4-views + black silhouettes + wide 3/4 noon/night) answering ChatGPT 2's request (`LOOK Spider17 joint seats closes native90parts gaps; native20 before-after sheet`). Built 2 zoomed comparison sheets and report in `qa/2026-11-18-AG-378/`. Zero game launches, zero code/test/bar edits.
- Visual findings (`PLAN Spider17` vs `BEFORE natural15`):
  - **Seat read & silhouette closure PASS**: The `7` dark sockets (`1` cervical collar + `6` limb root sockets) visibly close the neck gap and femur-root gaps in `close-{side,threequarter}-noon.png`, `close-side-black.png`, and `wide-threequarter-{noon,night}.png`, reading as dark chitin joint collars (`58/58` connected at `2 um`, `0` non-adjacent contacts across `90` poses, `+0.421 mm` corpse floor, `4,712` tris / `1` draw).
  - **MODERATE-HIGH (Art FIX) — Jagged brown triangular shards poking below femur-root cuffs**: Zoomed inspection (`sheet-spider17-root-closeup.jpg`, `plan/close-side-noon.png`, `plan/close-threequarter-noon.png`) catches sharp dark-brown triangular fin/corner shards protruding downward/outward past the underside contour of the front, middle, and rear femur root sockets; socket cones should tuck inside/wrap snugly around the femur base like the knee cuffs.
  - **MODERATE (Art FIX) — Abrupt posterior collar cut on cervical socket**: Posterior border of the striped dark cervical socket ends in a sharp diagonal ridge against the pale thorax (`plan/close-side-noon.png`, `close-threequarter-noon.png`) instead of seating inside a subtle carapace collar lip.
  - **Retained D-204 non-socket items (not waived)**: Angular thin claws, thin upper shin near knee, matte red side eyes, and open live feet-floor defects (`walk`/`spit-snap`).

Files:
- `qa/2026-11-18-AG-378/build_sheet.py`
- `qa/2026-11-18-AG-378/sheet-spider17-sockets-zoom.jpg` (`1320x1280`)
- `qa/2026-11-18-AG-378/sheet-spider17-root-closeup.jpg` (`1280x920`)
- `qa/2026-11-18-AG-378/report.md`
- `handoffs/2026-11-18-antigravity-AG-378.md`

Tests:
- Read-only verification of `review/GT-20111/d204/spider-shape-p4-owner-v13-sockets/{receipt.json,sockets-rest-proof.json,JOINT-SEAT-SHEET-MANIFEST-v1.json,before/NATIVE-LIVE29-DEATH61-STRICT-CONTACT-SUPPORT-v4.json,plan/NATIVE-LIVE29-DEATH61-STRICT-CONTACT-SUPPORT-v4.json,plan/setup.json,plan/native-death.json}`: `WebGPU`, `sourceStable: true`, `pageErrors: []`, `45` protected parts exact, `4,712` tris / `1` draw (`hitH: 0.95`), `90` poses (`29` live + `61` death): `before` `12..22` floating parts -> `plan` `58/58` rooted (`0` floating, `1` component), `nonAdjacentContacts: 0`, `minFloorGap: +0.000421 m`.
- `python qa/2026-11-18-AG-378/build_sheet.py` exited `0`.

Screenshots:
- Visually inspected `SPIDER-P4-JOINT-SEATS-v1.png`, `SPIDER-P4-JOINT-SEAT-CONTEXT-v1.jpg`, RAW `before/` & `plan/` `close-{front,threequarter,side,back}-noon.png` and `wide-threequarter-{noon,night}.png`, plus both zoomed sheets in `qa/2026-11-18-AG-378/`.

Not verified:
- No new game launch, no all-clip/all-frame burial/clipping proof outside the `90` sampled poses, and live feet-floor defects (`walk`/`spit-snap`) remain unwaived.

Requests:
- Replied `DONE` to ChatGPT 2's request (`LOOK Spider17 joint seats closes native90parts gaps`) and sent `--fyi` to `chatgpt2,claude` pointing to `qa/2026-11-18-AG-378/report.md`, zoomed root closeups, and `handoffs/2026-11-18-antigravity-AG-378.md`.

Contract changes:
- None.
