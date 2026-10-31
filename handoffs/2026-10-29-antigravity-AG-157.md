# antigravity — AG-157 Re-shoot Pike behind tree on GPU (CL-263) — 2026-10-29
Changed:          Captured and verified GPU visual outputs for CL-263 on the NVIDIA GeForce RTX 5080 through the game-testing slot. Captured 4 shots and contact sheet into `review/sweep/pike-hide-3/` (`camp-three.png`, `camp-top.png`, `pike-close.png`, `pike-from-fire.png`, and `sheet.jpg`), measuring campsite campfire at `(-1.98, 1.17, -81.68)`, nearest alive tree at `(-25.09, -80.34)`, and Pike's hiding spot at `(-26.18, 0.07, -80.27)`. Visual finding: PASS. Unlike AG-154 where Pike stood exposed in open grass, Claude's widened tree search (within 125° of outward vector and up to 30 m) successfully located an alive tree 24.25 m from the hikers' camp. Pike is positioned exactly 1.10 m behind the trunk relative to the campfire. In `pike-close.png` he stands beside the tree trunk; in `pike-from-fire.png` his torso is positioned directly in the tree's visual occlusion line from the camp fire.
Files:            review/sweep/pike-hide-3/camp-three.png, review/sweep/pike-hide-3/camp-three.json, review/sweep/pike-hide-3/camp-top.png, review/sweep/pike-hide-3/camp-top.json, review/sweep/pike-hide-3/pike-close.png, review/sweep/pike-hide-3/pike-close.json, review/sweep/pike-hide-3/pike-from-fire.png, review/sweep/pike-hide-3/pike-from-fire.json, review/sweep/pike-hide-3/sheet.jpg, qa/2026-10-29-AG-157/run.mjs, qa/2026-10-29-AG-157/analysis.json
Tests:            Visual inspection and screenshot verification through shared game-test slot (`qa/2026-10-29-AG-157/run.mjs`); 5/5 PNG/JPG outputs verified non-black and size-validated.
Screenshots:      review/sweep/pike-hide-3/sheet.jpg, review/sweep/pike-hide-3/camp-three.png, review/sweep/pike-hide-3/camp-top.png, review/sweep/pike-hide-3/pike-close.png, review/sweep/pike-hide-3/pike-from-fire.png
Not verified:     Game code changes (none made; inspection role only per rule 16 and card guidelines).
Requests:         none
Contract changes: none

## Findings & Visual Verification

### 1. CL-263: Pike Behind Tree Verification (`review/sweep/pike-hide-3/`)
- **Hardware & Engine**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`, resolution `1600x900`.
- **Outputs Captured**:
  - `camp-three.png` (`1,531,951` bytes)
  - `camp-top.png` (`1,440,874` bytes)
  - `pike-close.png` (`980,245` bytes)
  - `pike-from-fire.png` (`1,263,488` bytes)
  - `sheet.jpg` (`103,639` bytes)

### 2. Geometry & Coordinates
- **Hikers Campfire**: `x = -1.98, y = 1.17, z = -81.68`
- **Cover Tree (Alive)**: `x = -25.09, z = -80.34` (dist to camp/fire: `23.15 m`)
- **Pike Position (`T.historyProps.pikeHide`)**: `x = -26.18, y = 0.07, z = -80.27`
- **Distance from Campfire to Pike**: `24.25 m`
- **Distance from Tree Trunk to Pike**: `1.10 m` (trunk placed directly on vector between fire and Pike)

### 3. Visual Analysis
- **Comparison to AG-154**: In AG-154, `treeHide` failed to find trees in the narrow 9–22 m sector and placed Pike at `(-2.22, -91.68)` in open grass on the uphill slope with no cover.
- **AG-157 Result**:
  - `pike-close.png`: Shows Pike in full woodland uniform standing sheltered right next to the tree trunk (1.10 m offset).
  - `pike-from-fire.png`: Camera placed at the campfire (`y = 2.37`) looking down toward the lake and Pike (`tx = -26.18, ty = 1.17, tz = -80.27`). The tree trunk stands squarely between the fire and Pike, obscuring his center mass. Pike reads genuinely as a survivor hiding behind cover.
  - `sheet.jpg`: 2-column contact sheet confirming valid lighting, terrain, shadows, and asset placement across all four views.
- **Verdict**: **PASS**. Claude's widened tree search fix in `index.html` (lines 8727–8743) resolves the open-grass issue completely.
