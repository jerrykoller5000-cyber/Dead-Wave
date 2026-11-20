# AG-367 — AG-357 Step 4b Shambler (Claude 5 CE-14 FIX + Director Pass 3 & Pass 4 Notes)

- **Scope:** Strictly review-only under `review/AG-357/` and `qa/2026-11-18-AG-367/` (zero live game file edits).
- **Backend & Budget:** `WebGPUBackend`, `errors: []`, `36,496` LOD0 tris (`step3_512` & `step3_1k`, down from `52,136`), `7,820` LOD1 tris, `2` draws (`SkinnedMesh` + `eyes`), `3` textures (`3,145,728` bytes / `3.00 MB` @ `512`).
- **3D Head & Neck Metrics (`A-pose proto`):**
  - `crownY`: `1.8000 m`
  - `chinY`: `1.5284 m` (`headHeightChinToTopOpenJaw = 0.2716 m`)
  - `collarY`: `1.4150 m` (`neckLengthChinToCollar = 0.1134 m`)
  - `mouthGapeM`: `0.0576 m` (`~1.5x` vs Pass 2 `0.0383 m`, taller than oval inner width)
  - `craniumWidthM`: `0.1817 m` / `neckTopWidthM`: `0.1086 m` (`craniumToNeckRatio = 1.67x`)
  - `jawGonionWidthM`: `0.1242 m` (measured in `[1.545, 1.605]` mandibular band)

## Key Fixes Landed & Verified Across Sheets 13–17
1. **Collar Shelf & Seamless Neck-to-Torso (`review/AG-357/shambler-head-skull.mjs`, `shambler-step1.mjs`):** Tucked lower `neckRows` (`-0.088..-0.044`) cleanly inside the torso shell with a tapered `trapFlare` so skin flows continuously from 3D sculpted V-angled SCM tendons and pale 3D sculpted clavicles straight under the tank straps (removed Pass 3's horizontal chest/back collar shelf and narrow sternal-wash dashes across collarbones).
2. **Cheekbones, Hollow Cheeks, Rounded Chin & Unified U-Jaw (`review/AG-357/shambler-head-skull.mjs`, `shambler-step3.mjs`):** Unified cranium, brow, orbital sockets, piriform nose, cheekbones, gaunt sunken cheeks (`cheekHollow = -0.0145`), wide curved mandible, rounded chin (`yF = 0.096 -> 1.5284 m`), and tall oval scream cavern (`mouthCav = -0.072`) into ONE continuous watertight surface with dual-bone `[head, jaw]` skinning weights in `shambler-step3.mjs`. Zero detached jaw tube, zero box-slab chin corners, zero downward beak, zero under-eye ledge, zero cheek-nose slit.
3. **Big Crowded Upper & Lower Teeth (`shambler-head-skull.mjs`):** Restored blocky shoulder-to-shoulder crowded teeth geometry (`12` uppers + `12` matching-size lowers, `0.0576 m` incisor tip-to-tip gape) set inside dark-red sculpted gums, visible cleanly in both `HEAD FRONT` and `HEAD 3/4`.
4. **Deep Sunken Eyes (`shambler-head-skull.mjs`, `shambler-step1.mjs`):** Recessed smaller eyeballs (`r = 0.0074` at `z = 0.058`) inside deeper (`-0.055 m`) concave dark-shaded bony orbital bowls beneath a natural scowling brow bar.
5. **Mottled Patchy Scalp Hair & Clean Nape (`shambler-head-skull.mjs`, `textures-step2.mjs`):** Fixed `headShellRows[0]` monotonic bottom profile (`yB = 0.152`) so no crescent fold pokes at the nape, and broke up the back-hair mask with asymmetric scalp islands across crown and occiput (removing the back-of-head dark horizontal band).
6. **Real Torn Tank Holes, Drape & Elbow Seam (`textures-step2.mjs`, `shambler-clothes.mjs`, `shambler-step1.mjs`):** Removed unrequested back tank hole (`u = 0.54`), aligned front-left tear `hole1` over the sculpted lower-left ribcage with dark frayed tear edges + cast cavity AO + bruised intercostal valleys contrasting pale sculpted ribs, deepened side/back loose tank drape, and smoothed the elbow humerus-to-forearm transition (`upperGeo`/`forearmGeo` overlap).

## Outputs
- [step4b-report.json](step4b-report.json)
- `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- `review/AG-357/17-shambler-step4b-night-check.jpg`
