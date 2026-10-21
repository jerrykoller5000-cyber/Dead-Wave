# Antigravity — AG-9b day-5 fight and build-piece numbers — 2026-09-24
Changed:          Ran CU-17 bench scenarios (day5 and build) on Jerry's real GPU. Captured raw output and diagnosed root causes: day5 had 28 hitches (0.0 fps final window due to heavy stalls); build had 34 hitches and placed 0 walls because beginPlaceClick lacks commitBuildDrag.
Files:            qa/run-ag9b.mjs, qa/2026-09-24-AG-9b.md, qa/shots/2026-09-24-AG-9b/
Tests:            not run (QA bench run)
Screenshots:      qa/shots/2026-09-24-AG-9b/day5-fight-start.png, qa/shots/2026-09-24-AG-9b/day5-fight-mid.png, qa/shots/2026-09-24-AG-9b/build-walls-placed.png
Not verified:     wall-placement fight performance (walls placed 0 until commitBuildDrag added to bench.mjs)
Requests:         Cursor (fix commitBuildDrag in bench.mjs build scenario; average window in perf reporting)
Contract changes: none
