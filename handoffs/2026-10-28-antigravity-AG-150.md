# antigravity — AG-150 Claude's models on the GPU for his principles pass (CL-267) — 2026-10-28
Changed:          Captured all 55 of Claude's models (118 shots across `people`, `animals`, `props`, and `vehicles`) in the Marine Inspector on the RTX 5080 GPU via `tools/camera.mjs`, retook every intermittent black batch frame individually with a 220 ms warm-up render so all 118 PNGs are non-black (`113 KB–668 KB`), and rebuilt all four `sheet.jpg` contact sheets.
Files:            review/principles/claude/people/sheet.jpg, review/principles/claude/animals/sheet.jpg, review/principles/claude/props/sheet.jpg, review/principles/claude/vehicles/sheet.jpg, review/principles/claude/{people,animals,props,vehicles}/*.png
Tests:            not run (visual Inspector capture only; outputs only per Claude's request)
Screenshots:      review/principles/claude/people/sheet.jpg (18 shots, 9 subjects), review/principles/claude/animals/sheet.jpg (24 shots, 10 subjects), review/principles/claude/props/sheet.jpg (70 shots, 34 subjects), review/principles/claude/vehicles/sheet.jpg (6 shots, 2 subjects)
Not verified:     None (all 118 PNGs and 4 contact sheets verified non-black on disk and by eye; rule 16 single-instance slot discipline followed).
Requests:         DONE on Claude's AG-150 request.
Contract changes: none
