# AG-363 QA Report — AG-357 STEP 4 (D-209 Jerry): FINAL Shambler Look + Seams

- **Date:** 2026-11-18
- **Author:** Antigravity (`AG-363`)
- **Backend verified:** RTX 5080 WebGPU (`WebGPUBackend`), `errors: []`
- **Scope / Isolation:** Review-only inside `review/AG-357/` and `qa/2026-11-18-AG-363/`. Zero live game files (`index.html`, `studio/`, `core/`, `game/`) modified.

---

## 1. D-209 Changes Implemented & Visually Verified

1. **Shorter neck seated lower on shoulders (kept SCM tendons)**
   - Lowered `head` mount from `0.542` -> `0.506` in [review/AG-357/shambler-step1.mjs](../../review/AG-357/shambler-step1.mjs), kept exact `crownY = 1.8000 m`, dropped skull/occiput base (`yBase = 0.122..0.146`), and seated `neckRows` cleanly into the hunched trapezius & sternal collar while keeping bold V-angled SCM tendon cords (`chinY = 1.5146 m`, `collarY = 1.4291 m`, open-jaw `chin-to-collar = 0.0855 m` / ~0.115 m closed-mouth equiv, `mouthGapeM = +0.0181 m`).
2. **Narrower, gaunter cheekbones & cheeks (kept closed side profile)**
   - Pulled `skullRows` zygomatic & lower-cheek widths inward (`[0.28, 0.069]`, `[0.14, 0.058]`, `[0.00, 0.044]`), shifted `cheekBone` projection primarily forward (`+Z`) with reduced lateral `zygArch`, narrowed `ctrl` mandible width (`<= ±0.041`), and tucked `upperCheekParts`/`lowerCheekParts` flush inside the cheek contour with zero side-gap or protruding jaw bar.
3. **More hair (patchy dark hair over crown & back with thin bald patches; still 2 draws)**
   - Added organic patchy charcoal-brown scalp hair with receding temple dips, irregular nape V-taper, follicle stippling, and 4 uneven thin bald patches (`crown`, left parietal, back-right occiput, nape) in [textures-step2.mjs](../../review/AG-357/textures-step2.mjs).
   - Added 9 asymmetric alpha-cutout wispy hair cards (`shambler-hair-card`, `evalHairCardTexel`) packed directly into the bottom-left-inner sub-quadrant alongside solid PBR zones in [atlas-step3.mjs](../../review/AG-357/atlas-step3.mjs) -> **0 extra draws, 0 extra textures**.
4. **Blended colour seams across all 4 close-up boundaries**
   - Unified `evalHeadTexel` face skin, `evalNeckTexel` edges, and `evalSkinTexel` (`cheek-flesh-upper`, `lower-jaw`, `torso-skin`, limbs) onto shared `evalBaseCorpseSkin` albedo and softened torso/limb contrast dots.
   - Feathered `evalNeckTexel` `collarBotFade` & `collarTopFade` + `napeFade` completely to neutral flesh well above torso insertion and below mandible, extended `neck` base gently over `TORSO_ROWS` (`[0.506, 0.132]`..`[0.550, 0.032]`), and applied matched 3D world-space dried-blood / flesh washes across `neck-skin`, `torso-skin`, `lower-jaw`, `cheek-flesh-upper`, and `skull-cranium`.

---

## 2. Metrics & Cost Delta

| Variant | Tris | Meshes / Draws | Mats | Textures | VRAM | Errors |
|---|---:|---:|---:|---:|---:|---:|
| `step3_1k` (Step 4 Final, 1K) | 43,616 | 2 | 2 | 3 | 12.00 MB | 0 |
| `step3_512` (Step 4 Final, 512) | 43,616 | 2 | 2 | 3 | 3.00 MB | 0 |
| `step3_lod1` (15m+ LOD1) | 8,920 | 2 | 2 | 3 | 3.00 MB | 0 |
| `proto_apose` / `proto_shamble` | 43,616 | 32 | 11 | 21 | 18.19 MB | 0 |

- **Cost vs Step 3:** `step3_512` changed from `43,472` tris -> **`43,616` tris** (**+144 tris / +0.33%** for the silhouette hair cards). Draw count (**2**), material count (**2**), texture count (**3**), and VRAM (**3.00 MB @ 512**) are unchanged (`STEP3_MIXED_HORDE` 30-shambler bench remains representative; no separate re-bench run needed).

---

## 3. Delivered Proof Sheets & Raw Evidence

- **Compare Sheet (Noon ours / proto / Step 4 1K & 512 atlas / Tripo + head row):**
  - `review/AG-357/10-shambler-step4-noon-compare.jpg`
- **Close-up Noon Seam Sheet (`neck-to-torso front`, `neck-to-torso back`, `neck-to-face`, `face-to-scalp`):**
  - `review/AG-357/11-shambler-step4-seam-closeups.jpg`
- **Night Moonlight + Glowing Eyes + Silhouette Check:**
  - `review/AG-357/12-shambler-step4-night-check.jpg`
- **Raw capture log & JSON:** `qa/2026-11-18-AG-363/step4-report.json`, `qa/2026-11-18-AG-363/frames-step4/`

**Remaining honest close-up note:** At macro seam close-up distance (`~28 cm` frame height), `upperCheek` bottom rim beside the upper canine shows a minor ambient crease line (`noon-step3_512-seam_neck_face.png`), and the back trapezius concavity shows a subtle shadow fold where `neck` meets upper `torso` (`noon-step3_512-seam_neck_torso_back.png`). Colour transitions across all four seams (`neck-to-torso front`, `neck-to-torso back`, `neck-to-face`, `face-to-scalp`) blend continuously with zero mismatched colour seams, and at full-body/head views (`10` & `12`) all proportions read cleanly.
