# antigravity — AG-152 Claude's fixes on the GPU (CL-267, CL-263) — 2026-10-29
Changed:          Captured and visually verified all 24 inspector after-shots and contact sheet in `review/principles/claude/after/` (`cl267-after.json`) plus the hikers' camp and close-up match shots of Pike's hiding spot (`T.historyProps.pikeHide` at `x = -2.22, z = -91.68`) in `review/sweep/pike-hide/` (`cl263-pike.json` + `pike-close.png`) on the NVIDIA GeForce RTX 5080 through the game-test slot. All 29 output files are non-black (`53 KB` to `1.54 MB`); all 12 inspector subjects and Pike's camp placement build cleanly without broken geometry (minor notes: `prop.marrow-door` `three` view shows the top edge of the black backing slab slightly above the arch seam apex, and `animal.squirrel` shows a tiny pale cap dot on the tip of the tail cylinder).
Files:            review/principles/claude/after/sheet.jpg, review/principles/claude/after/prop.dropped-helmet-three.png, review/principles/claude/after/prop.dropped-helmet-front.png, review/principles/claude/after/prop.insulated-boots-three.png, review/principles/claude/after/prop.insulated-boots-front.png, review/principles/claude/after/prop.rubber-boot-three.png, review/principles/claude/after/prop.rubber-boot-front.png, review/principles/claude/after/prop.worn-boots-three.png, review/principles/claude/after/prop.worn-boots-front.png, review/principles/claude/after/prop.standing-stone-three.png, review/principles/claude/after/prop.standing-stone-front.png, review/principles/claude/after/prop.ring-stone-three.png, review/principles/claude/after/prop.ring-stone-front.png, review/principles/claude/after/prop.marrow-door-three.png, review/principles/claude/after/prop.marrow-door-front.png, review/principles/claude/after/prop.reliquary-three.png, review/principles/claude/after/prop.reliquary-front.png, review/principles/claude/after/animal.squirrel-three.png, review/principles/claude/after/animal.squirrel-front.png, review/principles/claude/after/animal.butterfly-three.png, review/principles/claude/after/animal.butterfly-front.png, review/principles/claude/after/animal.frog-three.png, review/principles/claude/after/animal.frog-front.png, review/principles/claude/after/animal.turtle-three.png, review/principles/claude/after/animal.turtle-front.png, review/sweep/pike-hide/camp-three.png, review/sweep/pike-hide/camp-top.png, review/sweep/pike-hide/pike-close.png, review/sweep/pike-hide/sheet.jpg
Tests:            not run (visual GPU capture task only; no game code modified; all runs queued through `node crew/crew.mjs slot run` per rule 16)
Screenshots:      review/principles/claude/after/sheet.jpg, review/sweep/pike-hide/sheet.jpg, review/sweep/pike-hide/pike-close.png
Not verified:     Nothing — all 24 inspector PNGs (`109 KB` to `674 KB`), `review/principles/claude/after/sheet.jpg` (`289 KB`), and all 4 `review/sweep/pike-hide/` files (`53 KB` to `1.54 MB`) were visually inspected on the real GPU.
Requests:         none
Contract changes: none

## Verification & Visual Notes

### 1. `review/principles/claude/jobs/cl267-after.json` (`review/principles/claude/after/`)
- **Hardware**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)`, `1600x900`, queued via `node crew/crew.mjs slot run antigravity AG-152`.
- **File sizes (all `> 12 KB`, non-black)**:
  - `sheet.jpg`: `288,831` bytes
  - `prop.dropped-helmet-three.png` (`330,442` B), `prop.dropped-helmet-front.png` (`359,236` B): Clean ACH shell, NVG shroud, side rails, interior pads, and chinstrap; no inverted normals or holes.
  - `prop.insulated-boots-three.png` (`350,619` B), `prop.insulated-boots-front.png` (`179,884` B): Clean yellow boot shafts, ankle bellows, black collar, pull loops, toe cap, and lugged soles (standing + sideways boot).
  - `prop.rubber-boot-three.png` (`319,070` B), `prop.rubber-boot-front.png` (`164,517` B): Clean single yellow rubber boot with pull loops, ankle bellows, toe cap, and lugged sole.
  - `prop.worn-boots-three.png` (`360,515` B), `prop.worn-boots-front.png` (`181,828` B): Clean pair of worn yellow boots (`the mast`) with pull loops, ankle bellows, toe caps, and lugged soles.
  - `prop.standing-stone-three.png` (`635,243` B), `prop.standing-stone-front.png` (`359,183` B): Clean upright carved monolith (`A` rune with dot, moss/lichen texture) and fallen fragment.
  - `prop.ring-stone-three.png` (`673,866` B), `prop.ring-stone-front.png` (`409,370` B): Clean wide ring-stone monolith with circular rune ring and two flanking base stones.
  - `prop.marrow-door-three.png` (`673,052` B), `prop.marrow-door-front.png` (`440,055` B): Clean split-arch Marrow door with central dark socket and carved rune ring. *(Minor visual note: in `three` view, the top corners of the black rectangular backing slab behind the center split seam protrude slightly above the curved arch apex.)*
  - `prop.reliquary-three.png` (`343,646` B), `prop.reliquary-front.png` (`128,573` B): Clean stone chest, open cross-embossed lid on the floor in front, corner moss tufts, and golden orb/cross inside.
  - `animal.squirrel-three.png` (`331,163` B), `animal.squirrel-front.png` (`183,415` B): Clean squirrel body, tufted ears, cheek patches, pale paws/belly, and raised bushy tail. *(Minor visual note: a tiny pale/grey center-vertex dot is visible on the flat end-cap of the tail tip in `three` and `front` views.)*
  - `animal.butterfly-three.png` (`303,554` B), `animal.butterfly-front.png` (`205,276` B): Clean patterned wings, segmented body, eyes, and clubbed antennae.
  - `animal.frog-three.png` (`228,614` B), `animal.frog-front.png` (`128,955` B): Clean body, gold-rimmed bulging eyes, mouth crease, pale throat/belly, forelegs, and webbed hind feet.
  - `animal.turtle-three.png` (`233,580` B), `animal.turtle-front.png` (`109,018` B): Clean domed carapace with dorsal scutes, olive rim, clawed flippers, beak, and eyes.

### 2. `review/sweep/jobs/cl263-pike.json` & `pike-close.png` (`review/sweep/pike-hide/`)
- `T.historyProps.pikeHide`:
  ```json
  { "x": -2.2180216876890633, "z": -91.68058726348129, "yaw": -3.112849048850262 }
  ```
- **Outputs**:
  - `review/sweep/pike-hide/camp-three.png` (`1,537,802` B)
  - `review/sweep/pike-hide/camp-top.png` (`1,442,485` B)
  - `review/sweep/pike-hide/pike-close.png` (`917,421` B, `xz:-2.2180216876890633,-91.68058726348129 --view three --dist 6`)
  - `review/sweep/pike-hide/sheet.jpg` (`53,421` B)
- **Visual check**: Hikers' camp tents, sleeping bags, campfire ring, and tree line sit cleanly on the terrain; in `pike-close.png`, Pike stands grounded on the grass slope beyond the camp with no floating geometry or terrain gaps.
