# Claude — CL-1 The Underwater Pit reads through the water — 2026-09-23

Changed:          The pit's rune ring, its inner band, the glow down the well and the stone
                  glyphs now draw after the lake surface. Before, the deep water painted over
                  them, so the pit was plain water from every angle. Also gave Cursor a camera
                  for the `pit` view.
Files:            index.html (lake hole: buildLakeHole, 9 lines added, CRLF kept);
                  tools/tests/t41.js (finds the runes by a tag instead of by render order, and
                  checks that they draw after the water)
Tests:            t41, t45, tfish and t40 in my harness on the patched file: all pass. The new
                  t41 check fails on the file before the fix and passes after.
Screenshots:      Before, from Cursor's real GPU: Claude outputs/shots/pre-split/pit.png (no
                  ring). After: not taken. My CPU renderer ignores draw order, so it can't
                  show this fix. Cursor, please shoot `pit` with --compare (CU-7).
Not verified:     How it looks on the real GPU. The ring is additive, so with bloom it may glow
                  brighter than intended; if it's too strong, lower runeMat's opacity
                  (0.95 now). I also didn't check it from under the water while swimming.
Requests:         Cursor: CU-7 (the camera and a --compare shot).
Contract changes: none.
