# AG-368 — AG-357 Step 4b Pass 5 (Last) + Final Jerry Sheet

- **Scope:** Strictly review-only under `review/AG-357/` and `qa/2026-11-18-AG-368/` (zero live game file edits).
- **Backend & Budget:** `WebGPUBackend`, `errors: []`, `36,496` LOD0 tris (`step3_512`, `step3_512_shamble`, `step3_1k`), `7,820` LOD1 tris, `2` draws (`SkinnedMesh` + `eyes`), `3` textures (`3,145,728` bytes / `3.00 MB` @ `512`).
- **3D Head & Neck Metrics (`A-pose proto`):**
  - `crownY`: `1.8000 m`
  - `chinY`: `1.5066 m` (`headHeightChinToTopOpenJaw = 0.2934 m`)
  - `collarY`: `1.4145 m` (`neckLengthChinToCollar = 0.0921 m` = `9.21 cm`, target `9–9.5 cm`)
  - `jawGonionWidthM`: `0.1418 m` (wide U-jaw in `[1.545, 1.605]`, keeping rounded U-chin)
  - `craniumWidthM`: `0.1835 m` / `neckTopWidthM`: `0.0918 m` (`craniumToNeckRatio = 2.00x`)
  - `mouthGapeM`: `0.0528 m` (tall vertical scream with 12 big uppers + 12 matching lowers)

## Pass 5 Fixes Verified Across White Clay, Seam Closeups & Final Sheet
1. **Hair Split Removed (`review/AG-357/textures-step2.mjs`):** Replaced unwrapped `du -/+ offset` patch Gaussians (which stepped abruptly from `+0.5` to `-0.5` down the exact back centerline `u = 0.5`) with periodic `wrapDU(u, u0)` across all crown, temple, occiput, mid-back, and nape bald islands, and kept `u` unscaled in `cylFbm(u, ...)` so hair and scalp patches wrap seamlessly around both `u = 0` and `u = 0.5`.
2. **Wide U-Jaw `~0.14 m` (`review/AG-357/shambler-head-skull.mjs`):** Widened the anterior/lateral mandible (`headShellRows` `v = 0.13..0.21` `rx = 0.064..0.071`) to `jawGonionWidthM = 0.1418 m` while keeping the rounded U-chin (`yF = 0.086`), taller scream (`mouthGapeM = 0.0528 m`), and keeping lower gums/mouth floor tucked safely inside the chin (`minY = 1.5218 m` vs `chinY = 1.5066 m`, zero chin underside bumps).
3. **Smooth Neck-to-Skull Back Transition (`review/AG-357/shambler-head-skull.mjs`):** Added `sstep(0.14, 0.22, v)` guard to `mouthMaskF` so `v = 0.00..0.13` never blasts backward out the back of the neck (`( )` horns removed); tapered the retro-mandibular jaw behind `ca < 0.10` (`backSideTaper` down to `0.70`), constrained `jawEdge` to `sstep(-0.02, 0.55, ca)`, softened `mastoid`, and nestled the upper neck rows (`y = 0.122..0.170`) inside the lower occiput with damped upper-neck noise (`1 - sstep(0.105, 0.138, y)`) so zero jaw-corner lump, neck-top dome, or zig-zag seam appears in `white_apose` or textured `HEAD BACK` / `HEAD 3/4 BACK`.
4. **Shorter Neck `9–9.5 cm` (`review/AG-357/shambler-step1.mjs`, `shambler-head-skull.mjs`):** Lowered `head.position.y` from `0.496` to `0.484` (keeping `neckRows` bottom locked to torso clavicles/traps and `crownY = 1.8000 m`), bringing `neckLengthChinToCollar` down from `0.1134 m` to `0.0921 m` (`9.21 cm`) and aligning `bakeShamblerAO` + `zones` to the updated head height.
5. **ONE Final Sheet for Jerry (D-211):** Built `review/AG-357/18-shambler-final-jerry.jpg` comparing `FINAL ATLAS 512` (`A-pose` & `Shamble pose`) against `JERRY TRIPO` across `FRONT`, `3/4 ANGLE`, `SIDE`, `BACK`, `HEAD 3/4`, and `HEAD BACK` in Noon and Night (no step-4 or clay rows). Also updated `review/AG-357/13..17-shambler-step4b-*.jpg` for Director/Claude 5 verification.

## Outputs
- [pass5-report.json](pass5-report.json)
- `review/AG-357/18-shambler-final-jerry.jpg`
- `review/AG-357/13-shambler-step4b-noon-compare.jpg`
- `review/AG-357/14-shambler-step4b-head-closeups.jpg`
- `review/AG-357/15-shambler-step4b-tank-compare.jpg`
- `review/AG-357/16-shambler-step4b-seam-closeups.jpg`
- `review/AG-357/17-shambler-step4b-night-check.jpg`
