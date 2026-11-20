# Handoff — Antigravity `AG-363` (AG-357 STEP 4 / D-209 Jerry Final Shambler)

- **Owner:** Antigravity (`AG-363`)
- **Date:** 2026-11-18
- **Status:** DONE (review-only in `review/AG-357/`; zero edits to live `studio/`, `index.html`, `core/`, `game/`)
- **QA Report:** `qa/2026-11-18-AG-363/report.md`

## What Changed (`review/AG-357/` only)
- `review/AG-357/textures-step2.mjs`: Added shared `evalBaseCorpseSkin`, feathered `evalNeckTexel` top/bottom/nape envelopes completely to flesh above/below collar seams, added patchy charcoal-brown scalp hair with thin uneven bald patches + follicle stipple hairline gradient in `evalHeadTexel`, softened `evalSkinTexel` spots/veins to match face tone, and added `evalHairCardTexel` + `hairMat`.
- `review/AG-357/atlas-step3.mjs`: Packed `evalHairCardTexel` (`rects.hair`) cleanly into bottom-left-inner sub-quadrant alongside solid PBR tiles — **still 3 textures and 2 draw calls**.
- `review/AG-357/shambler-head-skull.mjs`: Shorter collar-seated neck (`head` at `0.506`, `crownY = 1.8000`, `chinY = 1.5146`, `collarY = 1.4291`, `chin-to-collar = 0.0855 m`, `mouthGapeM = 0.0181 m`), narrower gaunt cheekbones & flush-tucked mandible (`ctrl` inside cheek wall), plus 9 asymmetric wispy alpha hair cards leaving bald islands open.
- `review/AG-357/shambler-step1.mjs`, `review/AG-357/shambler-clothes.mjs`, `review/AG-357/shambler-step3.mjs`, `review/AG-357/index.html`: Lowered head mount (`0.506`), tucked upper torso collar cone smoothly inside neck flare, unified world-space seam color washes across face/jaw/neck/torso, raised tank scoop slightly (`0.394/0.408`), routed `hair-card` into `'hair'` atlas zone, and added close-up seam camera presets (`seam_neck_torso_front`, `seam_neck_torso_back`, `seam_neck_face`, `seam_face_scalp`).

## WebGPU Verification & Proof Sheets
- Captured on `WebGPUBackend` via `node crew/crew.mjs slot run antigravity AG-363 --checks "AG-357 Step 4 D-209 final clean WebGPU capture" -- node qa/2026-11-18-AG-363/capture-step4.mjs` (`errors: []`).
- **Compare sheet (Noon ours / proto / Step 4 1K & 512 atlas / Tripo + head row):** `review/AG-357/10-shambler-step4-noon-compare.jpg`
- **Close-up noon seam sheet:** `review/AG-357/11-shambler-step4-seam-closeups.jpg`
- **Night quick check:** `review/AG-357/12-shambler-step4-night-check.jpg`
- **Atlas cost:** `43,616` tris LOD0 (`+144` tris / `+0.33%` vs Step 3 `43,472`), `8,920` tris LOD1, **2 draws**, **3 textures**, **3.00 MB @ 512** (12.00 MB @ 1K).
