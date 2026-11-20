# antigravity — AG-383 Spider22 AG382 root wedge, ridge, and neck polish look (native52/strict90) — 2026-11-18

Changed:
- Completed `REVIEW ONLY` visual QA and receipt audit answering ChatGPT 2's Spider22 request (`LOOK Spider22 AG382 root wedge ridge and neck polish: native52 contact0`) on `review/GT-20111/d204/spider-shape-p4-owner-v18-polish22/`.
- Built `3` zoomed raw-PNG comparison sheets and `report.md` in `qa/2026-11-18-AG-383/`. Zero game launches, zero code/test/bar edits.
- **Visual verdict — PASS on all 3 AG-382 polish items (supersedes Spider21 visually):**
  1. **Root-seat wedge removal — PASS:** Protruding dark-brown low-poly wedge corners under the front/mid/rear femur roots in Spider21 (`close-side-noon/overcast/night`, `close-side-black`) are cleanly tucked/smoothed into a continuous underside contour (`325` localized `side-black` silhouette pixels; `front-black` `0` diff).
  2. **Cervical neck matte sheen — PASS:** Switching the cervical collar/root membrane to the darker rougher atlas family eliminates Spider21's rubbery `close-side-noon`/`overcast` specular band; reads as cohesive matte-dark chitin across all 4 lights (`noon`, `overcast`, `dusk`, `night`).
  3. **Dorsal carapace plate ridge/crease contrast — PASS (improved):** Visibly stronger transverse inter-plate crease shading at night (`3q-night`, `back-night`, `side-night`) and close-ups (`back-noon`, `side-noon`); stays natural/subtle under direct bright `noon` and at `wide-threequarter` distance without texture noise or new draws.
  4. **Protected features unchanged — PASS:** Head, pale-cyan central eyes, 4 matte lateral eye beads, dark-tipped fangs, rounded 15 cm keratin-pole knee balls + 8 hairs, and lower tibiae/hooks match Spider21 (`52` protected parts + all `6` lowest-3 cm hook support corners exact).
- **Open non-visual gates NOT waived:** `spider21-original-gates-owner-v1` `t111`/`t222` head-core RED (awaiting Director A/B decision; Spider22 does not touch head), pre-existing live feet/slide defects, raw C5 quaternion-double-cover corpse reds, and Spider48 perf. Private review only; no production landing or finished-for-Jerry claim.

Files:
- `qa/2026-11-18-AG-383/build_sheet.py`
- `qa/2026-11-18-AG-383/sheet-spider22-roots-neck-zoom.jpg` (`1382x1110`)
- `qa/2026-11-18-AG-383/sheet-spider22-ridges-zoom.jpg` (`1304x1390`)
- `qa/2026-11-18-AG-383/sheet-spider22-wide-sil-zoom.jpg` (`1264x1310`)
- `qa/2026-11-18-AG-383/report.md`
- `handoffs/2026-11-18-antigravity-AG-383.md`

Tests:
- Read-only verification of `review/GT-20111/d204/spider-shape-p4-owner-v18-polish22/` receipts (`receipt.json`, `polish22-protected-rest-proof.json`, `POLISH22-SHEET-MANIFEST-v1.json`, `{before,plan}/NATIVE-LIVE29-DEATH61-POLISH22-CONTACT-v10.json`, `native-death.json`, `native-gait.json`): `WebGPU`, `sourceStable: true`, `pageErrors: []`, `frames: 52`, `matchedCameras: true`, `allOriginalRigRestExact: true`, `4,736` tris / `1` draw (`<= 4,742`), `hitH: 0.95`, `52` protected parts exact, `6` hook lowest-3 cm support corners `maxError: 0`, `608` live + `61` corpse frames per phase, corpse `minFloorGap: +0.194012 mm`, and strict `2 um` `90/90` poses `58/58` rooted / `0` floating / `1` component / `0` non-adjacent contacts in BOTH `before` and `plan`.
- `python qa/2026-11-18-AG-383/build_sheet.py` exited `0` (verified black silhouette pixel diffs: `front` `0/1,152,000`, `back` `13`, `threequarter` `91`, `side` `325`).

Screenshots:
- Visually inspected all `7` native sheets (`SPIDER22-POLISH-PRIMARY-v1.jpg`, `SPIDER22-HEAD-FEATURES-v1.jpg`, `SPIDER22-GEOMETRY-CONTEXT-v1.jpg`, and all `4` `PAIR-{FRONT,THREEQUARTER,SIDE,BACK}-FOURLIGHTS-v1.jpg`) plus all `3` zoomed RAW-crop sheets in `qa/2026-11-18-AG-383/`.

Not verified:
- No new game launch (`REVIEW ONLY`), no production edits, no gameplay perf / full-clip animation / route verification; original `t111`/`t222` head-core RED, live feet/slide defects, raw C5 corpse reds, and Spider48 perf remain open and unwaived.

Requests:
- Replied `DONE` to ChatGPT 2's Spider22 request (`LOOK Spider22 AG382 root wedge ridge and neck polish: native52 contact0`) and sent `--fyi` summary to `chatgpt2,claude`.

Contract changes:
- None.
