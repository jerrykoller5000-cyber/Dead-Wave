# AG-366 QA Report — AG-357 STEP 4b (D-209 / Jerry Priorities & Tank Top)

- **Date:** 2026-11-18
- **Author:** Antigravity (`AG-366`)
- **Backend verified:** RTX 5080 WebGPU (`WebGPUBackend`), `errors: []`
- **Scope / Isolation:** Review-only inside `review/AG-357/` and `qa/2026-11-18-AG-366/`. Zero live game files (`index.html`, `studio/`, `core/`, `game/`, `world/`) modified.

---

## 1. Jerry / Director 4b Changes Implemented & Visually Verified

1. **Priority B — Round Skull Base & Occiput vs Thin Neck (`shambler-head-skull.mjs`)**
   - Rebuilt `skullRows` (`SK_R=64, SK_C=84`) as a rounded cranial ball (`craniumWidthM = 0.1817 m`) with a rounded occipital base (`yBase = 0.148..0.194`) clearly wider than and overhanging the slim neck (`neckTopWidthM = 0.1077 m`, **`craniumToNeckRatio = 1.69x`**).
   - Slimmed the upper neck (`neckRows`) and shifted it posteriorly beneath the occipital shelf and behind the jaw angles, eliminating the Step 4 wedge/funnel cone on a thick neck column.

2. **Priority A — Wide U-Jaw, Tall Vertical Scream & Big Lower/Upper Teeth + Gums (`shambler-head-skull.mjs`, `shambler-step1.mjs`, `shambler-step3.mjs`)**
   - Widened the U-shaped mandible (`jawGonionWidthM = 0.1205 m`) with broad gonion angles under the ears and a strong squared U-chin symphysis (`chinY = 1.5077 m`).
   - Raised maxilla rim (`0.194`), shifted `jaw` pivot to `(0, 0.200, 0.022)`, and opened scream rotation to `0.88 rad`, doubling incisor-tip gape (`mouthGapeM = 0.0383 m`, vs Step 4 `0.0181 m`, `~5.8 cm` gum-to-gum vertical opening).
   - Replaced thin spaced teeth with **12 big blocky crowded upper teeth** and **12 matching-size blocky lower teeth** seated in sculpted **`shambler-upper-gums`** and **`shambler-lower-gums`** horseshoe ridges.
   - Rebuilt `upperCheekParts` into a single continuous stretched cheek wall tucked inside both skull and jaw (eliminated the Step 4/4b-v1 boxy cheek slab overlap) with asymmetric left cheek wound tearing.

3. **Priority C — Sculpted Forms, Not Painted AO (`shambler-head-skull.mjs`, `textures-step2.mjs`, `atlas-step3.mjs`, `shambler-step1.mjs`)**
   - Carved deeper bony eye sockets (`-4.8 cm`) with crisp overhanging brow bar, glabella frown folds, orbital rim, and recessed eyeballs; carved open inverted-triangle piriform nasal cavity (`-4.2 cm`) with visible central septum; sculpted maxilla tooth-root flutes, zygomatic ridge, sub-malar hollows, and left cheek wound.
   - Sculpted 3-lobe laryngeal cartilage (hyoid, Adam's apple, cricoid), deep flanking throat hollows, bold V-angled SCM tendons, lateral cords, and posterior nuchal cords + spine furrow in geometry AND boosted normal-map relief in `evalHeadTexel`, `evalNeckTexel`, `evalSkinTexel`, and `atlas-step3.mjs` (`slopeScale` sqrt curve).
   - Reduced painted dark eye/cheek AO smudges so lighting & 3D geometry carry the forms (verified in `STEP 4b WHITE CLAY` sculpt proof row); seated raw red tissue inside sculpted throat hollows and sternal chest.

4. **Back-of-Head Hair, Mottled Skin & Neck-Base Seam (`shambler-head-skull.mjs`, `textures-step2.mjs`, `shambler-step1.mjs`)**
   - Removed the 9 protruding `hairCards` that created the overhanging helmet edge at the nape.
   - Rebuilt `evalHeadTexel` scalp hair flush on the skull surface with patchy, thin, scabby dark clumps, pale mottled bald patches, and a tapered V-point hairline feathered cleanly into the nape skin.
   - Unified `evalBaseCorpseSkin`, `evalNeckTexel` back, `evalSkinTexel`, and `shambler-step1.mjs` world-space corpse mottling (pores + red/plum blotches), and wrapped `neckRows` smoothly over the upper trapezius slope (`y_torso = 0.452..0.416`) so `seam_neck_torso_back` blends without a horizontal step.

5. **Tank Top Shape (`shambler-clothes.mjs`)**
   - Rebuilt `getTopY(a)` with symmetric U-scoop necklines front (`0.286`) AND back (`0.338`), deep rib-exposing side armholes (`0.204`), closed 3D rolled collar/armhole binding rim tube (`rimGrid` closed at `rimGrid[0]`), `~3.7 cm` flat edge-stitched shoulder straps lying on the trapezius, loose chest-draped belly clearance with soft vertical folds, ragged uneven hem over the belt, and torn alpha-cutout holes.

---

## 2. Metrics & Cost Summary

| Variant | Tris | Meshes / Draws | Mats | Textures | VRAM | Errors |
|---|---:|---:|---:|---:|---:|---:|
| `step3_1k` (Step 4b, 1K) | 52,136 | 2 | 2 | 3 | 12.00 MB | 0 |
| `step3_512` (Step 4b, 512) | 52,136 | 2 | 2 | 3 | 3.00 MB | 0 |
| `step3_lod1` (15m+ LOD1) | 9,636 | 2 | 2 | 3 | 3.00 MB | 0 |
| `proto_apose` / `proto_shamble` | 52,136 | 33 | 10 | 21 | 18.2 MB | 0 |

- **3D Head/Neck Metrics (A-pose proto):** `crownY = 1.8000 m`, `chinY = 1.5077 m`, `collarY = 1.4150 m`, `chin-to-collar = 0.0927 m`, `mouthGapeM = 0.0383 m`, `craniumWidthM = 0.1817 m`, `neckTopWidthM = 0.1077 m` (**`1.69x`**), `jawGonionWidthM = 0.1205 m`.

---

## 3. Delivered Proof Sheets & Raw Evidence

- **Full Noon Compare + Head Row:** `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- **High-Res Head Close-Ups (`3q`, `back`, `3q back`, `side`, `front` + Step 4 before/after + White Clay Sculpt Proof):** `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- **Tank Top Shape Comparison (`front`, `3q`, `side`, `back` + White Clay vs Tripo):** `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- **Noon Seam Close-Ups (`neck-torso front/back`, `neck-face`, `face-scalp`):** `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- **Night Moonlight + Glowing Eyes + Silhouette Check:** `review/AG-357/17-shambler-step4b-night-check.jpg`
- **Raw JSON & Frames:** `qa/2026-11-18-AG-366/step4b-report.json`, `qa/2026-11-18-AG-366/frames-step4b/`

**Honest notes:** Incisor-tip `mouthGapeM` is `0.0383 m` (gum-to-gum ~`5.8 cm`), `chin-to-collar` is `0.0927 m` (reflecting the deeper jaw drop), and LOD0 is `52,136` tris (`+8,520` vs Step 4 `43,616` for higher head/tooth/gum/rim sculpt detail; LOD1 `9,636` tris; still 2 draws / 3 textures / 3.00 MB @ 512).
