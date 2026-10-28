# Antigravity — AG-146: The Six Cave Mouths on the GPU, by Day and Night (CL-256) + GP-19970 Visual Scores — 2026-10-28

Ref: `CL-256` (`world/caves.js`), `docs/world-design.md` (Rule 6 Transitions, Rule 9 Focal Points), `docs/asset-principles.md` (§5, §9, §11), `handoffs/requests.md`.

---

## Part 1 — Six Cave Mouths on the GPU (`CL-256`, `review/sweep/cave-mouths/`)

### Command Run (via Game-Test Slot)
```
node tools/camera.mjs job review/sweep/jobs/cave-mouths.json --agent antigravity --task AG-146
```
- **Output**: 24 real-GPU renders (`review/sweep/cave-mouths/gpu-cave-{1..6}-{front,slant}-{noon,night}.png`, `1280×720`) + contact sheet ([review/sweep/cave-mouths/sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/sheet.jpg) and [qa/2026-10-28-AG-146/sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-28-AG-146/sheet.jpg)) in `17.4 s`.

### Four-Criteria GPU Verification (`CL-256`)

| # | Criterion | Verdict | GPU Evidence & Notes |
| --- | --- | :---: | --- |
| **1** | **Walls read as rock and earth going in (first `1.5 m` of the throat)** | **PASS (6/6)** | All 6 cave mouths clearly show lit 3D rock/earth/timber throat geometry receding `1.5 m` inward from the lip in both `front` and `35° slant` cameras: warm root-earth & stone in **Cave 1** ([gpu-cave-1-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-1-slant-noon.png)), cool layered shale in **Cave 2** ([gpu-cave-2-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-2-slant-noon.png)), red ironstone + timber lagging in **Cave 3** ([gpu-cave-3-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-3-slant-noon.png)), damp dark limestone in **Cave 4** ([gpu-cave-4-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-4-slant-noon.png)), weathered megalithic hill-stone in **Cave 5** ([gpu-cave-5-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-5-slant-noon.png)), and the outer toothed arch + inner fissure threshold in **Cave 6** ([gpu-cave-6-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-6-slant-noon.png)). |
| **2** | **Each mouth still reads deep and dark past the first ring** | **PASS (6/6)** | Past the `1.5 m` throat ring (`r1 → r2` + back cap), all five open warrens (Caves 1–5) and the central vertical fissure of Cave 6 drop to pure abyssal black (`#000000`), preserving the unmistakable deep-warren read from gameplay and close angles. |
| **3** | **No visible seam where the lit rock meets the black interior** | **PASS (6/6)** | Zero geometry gaps, zero z-fighting, and zero bright edge seams between the `1.5 m` lit ring (`r0 → r1`) and the black interior (`r1 → r2`). In `slant` views ([gpu-cave-1-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-1-slant-noon.png), [gpu-cave-5-slant-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-5-slant-noon.png)), the vertex-color falloff (`1.0 → 0.38 → 0.0`) steps smoothly down into darkness. *(Minor non-blocking polish note: on **Cave 4** [gpu-cave-4-front-noon.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/review/sweep/cave-mouths/gpu-cave-4-front-noon.png), two small green moss/ivy clusters near the upper-left interior hang slightly isolated inside the black silhouette.)* |
| **4** | **Nothing glows at night** | **PASS (6/6)** | Across all 12 night renders (`gpu-cave-{1..6}-{front,slant}-night.png`), the `MeshLambertMaterial` throat responds naturally to dim night skylight/moonlight with zero emissive or unlit `MeshBasicMaterial` glow. |

### Score Table (0–5, `docs/asset-principles.md` §11)

| Cave | Silhouette | Proportions | Construction | Surface & Material | Integration | Overall |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cave 1 (`WARREN 1 · ROOT`)** | 5/5 | 5/5 | 4/5 | 4/5 | 4/5 | **PASS (4.4/5)** |
| **Cave 2 (`WARREN 2 · SHALE`)** | 5/5 | 5/5 | 4/5 | 4/5 | 4/5 | **PASS (4.4/5)** |
| **Cave 3 (`WARREN 3 · IRON`)** | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | **PASS (5.0/5)** |
| **Cave 4 (`WARREN 4 · WET`)** | 4/5 | 5/5 | 4/5 | 4/5 | 4/5 | **PASS (4.2/5)** |
| **Cave 5 (`WARREN 5 · HILL`)** | 5/5 | 5/5 | 5/5 | 4/5 | 5/5 | **PASS (4.8/5)** |
| **Cave 6 (`Sealed Runic Gate`)** | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 | **PASS (5.0/5)** |

---

## Part 2 — ChatGPT `GP-19970` Follow-Up Visual Scores

Full per-shot breakdown and score tables are in [gp-19970-reviews.md](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-28-AG-146/gp-19970-reviews.md):
1. **Military Knee & Wrist Pad Fit (`handoffs/GP-19970/military-pads-after/`)**:
   - **Gameplay Scale**: **PASS (`4/5` across all 5 categories)**.
   - **Close Inspector Scale**: Improved `2/5 → 3/5` Construction & Integration (`knee-close-side.png`, `wrist-close-side.png`, `walk-side.png`) — kneecap and leather cuff wrap much closer, but the vertical upper-knee strip and anterior forearm strip still show daylight slits behind them, and the vertical (`rx = 0`) black shin plate overhangs the tapered lower shin.
2. **Seven Lower-Face Close2 Score (`handoffs/GP-19970/face-close2-after/`)**:
   - **`brute` & `colossus`**: **PASS (`5/5` gameplay, `4/5` close2)** — zero regression.
   - **7 smaller humanoids (`shambler, feral, leaper, drowned, military, spitter, bomber`)**: **PASS (`4/5`) at gameplay scale**; improved `2.5/5 → 3/5` at `close2` Construction & Integration — lower jaw/chin now anchors into the skull underside and floating nostril beads are gone, but a ~2–3 cm vertical daylight gap remains behind the nose wedge and upper teeth in `*-noon-head-side.png`.
3. **Crown Hair & Rear Neck Peg Fit (`handoffs/GP-19970/face-trim-after/`)**:
   - **Rear Occipital / Neck Pegs (`shambler, drowned, spitter, bomber`)**: **PASS (`4/5` close2, `5/5` gameplay)** — all 5 rear pegs + `drowned` side kelp ribbons seat cleanly into the skull loft with zero air gap in both side and back views.
   - **Crown Hair Ribbons (`shambler, feral, drowned, spitter`)**: **PASS (`4/5`) at gameplay scale**; improved `2/5 → 3/5` at `close2` — rear crown roots now touch the skull dome, but the front-most inverted-V hair strand still rises ~2–3 cm off the upper forehead with a triangular daylight gap in `*-head-side.png`.
