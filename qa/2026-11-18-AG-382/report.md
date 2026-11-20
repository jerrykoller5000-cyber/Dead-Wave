# AG-382 Visual QA Report — Spider19 -> Spider20 -> Spider21 Cumulative Look (REVIEW ONLY)

- **Date:** 2026-11-18 (2026-11-19 UTC)
- **Reviewer:** Antigravity (`Gemini 4 Carbon`)
- **Scope:** Read-only visual inspection + receipt audit answering ChatGPT 2's 3 open Spider requests:
  1. `LOOK Spider19 details and AG378 cuffs: native52 fourlights and strict90 green` -> `review/GT-20111/d204/spider-shape-p4-owner-v15-rounded19/`
  2. `LOOK Spider20 rounded knee balls supersede19 flat cuffs: native52 and90contact0` -> `review/GT-20111/d204/spider-shape-p4-owner-v16-ballknee20/`
  3. `LOOK Spider21 material pass after accepted roundknees: native52/nightfirst/all58exact` -> `review/GT-20111/d204/spider-shape-p4-owner-v17-material21/`
- **Game launches / code edits:** Zero (`REVIEW ONLY`, no production/test/bar changes).

## Zoomed Comparison Sheets Built
- `qa/2026-11-18-AG-382/sheet-spider19-20-cuffs-knees-zoom.jpg` (`1382x1150`) — `Spider17` vs `Spider19` vs `Spider20` vs `Spider21` on AG-378 root sockets, cervical neck tuck, and knee joint progression (`front-noon`, `3q-noon`, `side-noon`).
- `qa/2026-11-18-AG-382/sheet-spider21-material-zoom.jpg` (`1304x1390`) — `GEOMETRY20` vs `MATERIAL21` night-first (`3q-night`), `3q-noon`, `side-noon`, `back-noon` zoomed comparison.
- `qa/2026-11-18-AG-382/sheet-spider21-head-claws-zoom.jpg` (`1382x1290`) — `Spider17` vs `Spider19/20` vs `Spider21` head/eyes/fangs/lateral beads (`head-front-noon`, `head-3q-noon/night`) and lower tibiae/hooks (`3q-noon`).

## Verified Receipts (Read-Only)
All three packets (`v15-rounded19`, `v16-ballknee20`, `v17-material21`) verified directly from their `receipt.json`, `*-protected-rest-proof.json`, `NATIVE-LIVE29-DEATH61-*-CONTACT-*.json`, `native-death.json`, `native-gait.json`, and top-level JSONs:
- **Runtime & budget:** `WebGPU`, `sourceStable: true`, `pageErrors: []`, `4,736` tris / `1` draw (`<= 4,742` original cap), `hitH: 0.95`, all 6 original lowest-3 cm hook support corners `maxError: 0`.
- **Protected parts:** Spider19 `31/31` exact; Spider20 `46/46` exact; Spider21 `58/58` rest positions exact + `SPIDER-MATERIAL21-ALL58-SOURCE-GEOMETRY-CPU-v2.json` `pass: true` (all `58` source positions/normals/topology/transforms byte-exact).
- **Spider21 GPU silhouette identity (`MATERIAL21-MATCHED-BLACK-PIXELS-v1.json`):** `0 / 1,152,000` different pixels on all 4 matched black silhouette views (`front`, `threequarter`, `side`, `back`).
- **Strict 2 um support graph (`90` poses = `29` live keys + `61` corpse frames, BOTH phases in v15, v16, v17):** `58/58` rooted, `0` floating, `1` component, `0` non-adjacent contacts.
- **Corpse floor (`61` frames) & same-pose live replay (`1,216` frames / `7,296` feet):** Corpse `minFloorGap: +0.194012 mm` across v15/v16/v17; `SPIDER19-SAME1216-MOTION-HOOK-FLOOR-v2.json`: `0` new penetrations, `0` worsened existing negative gaps, `0` new original 3 cm feet-bar breaches (`maxNativeTipError: 22.36 nm`).

---

## Visual Findings by Stage

### 1. Spider19 (`v15-rounded19`) — AG-378 Cuffs/Neck + Detail Pass
- **Cervical neck tuck — PASS** (`sheet-spider19-20-cuffs-knees-zoom.jpg` Rows 1–2): The abrupt diagonal rear ridge flagged in AG-378 is tucked cleanly into the anterior thorax border in `close-side-noon` and `close-threequarter-noon` (matches Director 01:26Z "Neck tuck OK").
- **Eyes, fangs, proximal tibiae & upper hooks — PASS** (`sheet-spider21-head-claws-zoom.jpg`, `SPIDER19-GEOMETRY-CONTEXT-v1.jpg`): Larger pale-green central eyes pop far better at night (`wide-threequarter-night`, `head-3q-night`); darker, longer fang tips read sharply; proximal tibiae below the knees are noticeably fuller; upper hooks bow inward cleanly with preserved foot support tips.
- **AG-378 femur root sockets — IMPROVED, MINOR-MODERATE RESIDUAL POLISH** (`sheet-spider19-20-cuffs-knees-zoom.jpg` Row 1 `side-noon`): The thin needle-like ventral brown shards from Spider17 are removed, **but** angular dark-brown low-poly wedge corners still protrude slightly along the underside contour of the front, middle, and rear femur root sockets (most visible under the front femur root near the neck and the rear femur root in `close-side-noon`). Less jarring than Spider17 (especially after Spider21 removes wood grain), but not yet completely flush/rounded underneath.
- **Flat knee cuffs — SUPERSEDED BY SPIDER20**: Spider19's flat-topped brown discs ("log stumps", flagged by Director 01:26Z) are clearly visible in `sheet-spider19-20-cuffs-knees-zoom.jpg` Rows 3–4 and resolved in Spider20.

### 2. Spider20 (`v16-ballknee20`) — Rounded Knee Balls
- **Rounded 15 cm knee joints — PASS** (`sheet-spider19-20-cuffs-knees-zoom.jpg` Rows 3–4, `SPIDER20-KNEE-FIX-PRIMARY-v1.jpg`, `SPIDER20-GEOMETRY-CONTEXT-v1.jpg`): Completely eliminates Spider19's flat log-stump knee tops across front, 3/4, side, back, and black silhouettes. Each joint now reads as a spherical articulated dome with 8 facet-seated radial hairs cleanly joining femur and tibia (matches Director 01:55Z acceptance).
- **Pre-material surface note (superseded by Spider21):** On Spider20, the wood/root atlas on the spherical knee balls and cervical neck still read as dark striated wood-burls/bark stuck onto pale bone legs (`sheet-spider21-material-zoom.jpg` left column).

### 3. Spider21 (`v17-material21`) — Material Pass (Current Cumulative Candidate)
- **Overall material direction — STRONG PASS** (`sheet-spider21-material-zoom.jpg`, `SPIDER21-MATERIAL-PRIMARY-v1.jpg`, `PAIR-*-FOURLIGHTS-v1.jpg`):
  - **Wood-grain removal & knee keratin pole + dark equatorial band — BIG WIN:** Replacing the striated wood-bark texture on all 6 knee balls with pale bone/keratin upper caps over a darker equatorial ring integrates the joints naturally with the pale femur/tibia across all 4 lights (`noon`, `overcast`, `dusk`, `night`) and at gameplay distance (`wide-threequarter-noon/night`).
  - **Night-first readability — PASS:** In `close-threequarter-night`, `close-side-night`, `close-front-night`, `close-back-night`, and `wide-threequarter-night`, the pale-green central eyes pop cleanly, the pale bone carapace and knee caps hold shape clearly, and dark claws/neck create clean value separation.
  - **Lateral eye beads & head details — PASS** (`sheet-spider21-head-claws-zoom.jpg`): Four matte reddish-brown lateral eye beads sit cleanly beside the accepted pale-cyan central eyes; darker fangs read cleanly in noon and night.
- **Honest minor/polish art observations on Spider21 (strictly from the images):**
  1. **Ridged dorsal plates contrast is very subtle** (`sheet-spider21-material-zoom.jpg` Rows 1, 2, 4): Comparing `GEOMETRY20` vs `MATERIAL21` side-by-side, the crest/crease value separation on the dorsal carapace plates is faint (barely visible on `3q-noon`/`side-noon`, slightly clearer on `back-noon`/`back-night` grooves). If stronger "ridged plates" chitin segmentation is desired before the Jerry sheet, deeper crease darkening between carapace ribs and around dorsal spine bases would boost readability at `wide-threequarter` gameplay distance.
  2. **Bright-noon specular band on wet cervical collar** (`sheet-spider21-material-zoom.jpg` Row 3 `side-noon`): Vastly better than the old wood stripes, and reads great at `3q-night`/`3q-noon`, though under direct `close-side-noon` light the smooth wet-atlas collar shows a fairly broad glossy band that looks slightly rubbery/tubular next to the matte bone carapace. Slightly lower specular contrast or darker chitin value would blend it even better.
  3. **Knee hairs readability at wide distance:** The 8 matte-bone hairs per knee read neatly up close (`close-front/3q/side-noon`) without Spider20's messy wood grain, and naturally recede into the silhouette at `wide-threequarter` (expected at `4,736` tris / `1` draw).
  4. **Retained minor geometry notes (unchanged by material-only pass):** Angular dark-brown ventral wedge facets under the femur root cuffs (`close-side-noon`) and angular lower-shin zigzag just above the protected foot hooks (`close-front/3q-noon`).

## Open / Unwaived Gates (Not Waived by This Look)
- **Spider ORIGINAL head gate RED (`spider21-original-gates-owner-v1`):** `t111` head-centre `48/48` blocked (`0` headshot vs `14` body) and `t222` Spider regression (`2H/2B` vs `5H/1B`) due to accepted cranium exceeding fixed `headCore` in `game/zombie-headshots.js` — awaiting Director A/B decision.
- **Pre-existing live feet/slide defects** (`walk`/`spit-snap`, motion owner) and **raw original C5 quaternion-double-cover corpse reds** (`min -344.05 deg`, `177` reds; wrapped `159.5 deg` is INFO only) remain open and unwaived.
- No production edit, no gameplay-perf/full-clip verification, no finished-for-Jerry claim.
