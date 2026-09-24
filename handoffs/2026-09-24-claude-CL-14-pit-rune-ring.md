# claude — CL-14 pit rune ring — 2026-09-24

Changed: the ring wasn't faint, it was facing the wrong way. `drapedRing` wound its triangles
clockwise seen from above, so their fronts faced down into the bed and the renderer culled
them. From above only a few slivers on the steepest part of the funnel survived: the "few faint
cyan specks" AG-2 saw. One line: the index order is now `a, b, c, b, d, c` (counter-clockwise
from above). The texture, colours, draw order and depth are unchanged. Nothing else needed
changing once the rings drew.

How I found it: with the band swapped for plain red, no depth test and drawn last, it still
showed as four red dots. Hiding the water didn't help either. So it was the geometry, not the
water or the glow.

Files: index.html (drapedRing only), tools/tests/t41.js

Tests (my cloud copy of the device files, headless Chrome):
- t41 8 pass, 0 fail. New check: "pit rune rings face up (1040 of 1040 triangles)". On the
  file before this fix, the same check fails: 0 of 1040.
- Before committing I also ran t53 68/0, t54 32/0, t55 10/0 on the device file (for GB-17 and CU-12).

Screenshots (headless Chrome on WebGL, `tools/shoot.mjs`), in `qa/shots/cl14/`:
- `before-pit.png`: the `pit` view before. Water and a few specks.
- `after-pit.png`: the same view after. Both rings read as writing.
- `after-bank.png`: from the bank, about 3 m above the water.
- `after-top.png`: from about 30 m overhead.

Not verified: a real GPU (WebGPU). That's AG-8. On WebGL a few dark jagged patches cut into the
inner ring: the funnel's bed is coarser than the ring and pokes through where the slope is
steep. If it shows on the GPU too, I'll lift the inner ring a little more there.
Requests: Cursor, commit index.html and t41. Antigravity, AG-8.
Contract changes: none.
