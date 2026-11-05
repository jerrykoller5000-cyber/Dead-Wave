Changed:
- Completed `AG-222` (`GB-273` walls' cull audit requested by Grokbot in `handoffs/2026-11-03-grokbot-GB-273.md`):
  1. Re-shot all five `AG-203` first-person stone-wall seats at `1080p` on real WebGPU (`RTX 5080`) comparing `?wallcull=0` (`wallCull OFF`, stone walls kept) vs default (`wallCull ON`), after full map `sceneCull` + `wallCull` warm-up (`160` cells, `139` segments, `0.00–0.20 ms` per frame).
  2. Measured behind-band frustum draw reductions (`OFF -> ON`):
     - **Seat 1 (`seat1_hq_north_ring`, `[-4, 42]` -> `hq-thicket` N arc):** `187 -> 110` (`-77` draws, **`-41.2%`**), total frustum draws `329 -> 252`, `hidden = 23 / 160` cells.
     - **Seat 2 (`seat2_hq_west_ring`, `[42, -10]` -> `hq-thicket` W gap):** `114 -> 80` (`-34` draws, **`-29.8%`**; `history-props` `20 -> 0`, `-100%`), total frustum draws `255 -> 221`, `hidden = 60 / 160` cells.
     - **Seat 3 (`seat3_quarter_nw`, `[70, 62]` -> `quarter-nw`):** `116 -> 88` (`-28` draws, **`-24.1%`**; `history-props` `20 -> 0`, `-100%`), total frustum draws `251 -> 223`, `hidden = 15 / 160` cells.
     - **Seat 4 (`seat4_quarter_ne`, `[-22, 76]` -> `quarter-ne`):** `83 -> 82` (`-1` draw, **`-1.2%`**), total frustum draws `219 -> 218`, `hidden = 24 / 160` cells.
     - **Seat 5 (`seat5_quarter_sw`, `[44, -68]` -> `quarter-sw`):** `63 -> 58` (`-5` draws, **`-7.9%`**), total frustum draws `198 -> 193`, `hidden = 10 / 160` cells.
  3. Isolated the exact root causes why behind-band draw reduction is `1.2%–41.2%` instead of the `>= 66.7%` (two-thirds) target:
     - **Root Cause 1 (Primary Bug — Horizontal `c.r` Inflates Vertical Cell Top `y1`):** `index.html:2364` passes `c.r = _cullS.radius * 1.2 + 0.5` into `wallCull.include(cx, cy, cz, c.r)`, and `game/wall-cull.js:126` sets the cell's vertical top `box[o + 4] = Math.max(box[o + 4], cy + r)`. Wide-but-low props (`4–12 m` wide horizontally, `c.r = 3.5–8.2 m`, but only `1.0–2.0 m` tall vertically) inflate their `16x16 m` cell's `y1` to `7–14 m` (`3–7 m` above actual `_cullBox.max.y`), causing `y1 > wy0 + t * (wy1 - wy0)` (`wall-cull.js:158`) to keep cells `32, 44, 45, 56, 67, 68, 72, 83` visible behind the `2.8–3.5 m` wall! Passing `_cullBox.max.y` (already computed at `index.html:2357`) as `y1` fixes this immediately.
     - **Root Cause 2 (Container Groups With `c.r > 10 m` and No `userData.cullKids = true`):** `streamGroup` (`c.r = 340.3 m`, `10–15` individual pebble draws/seat), `scatterWaterLife` `36 m` shore chunks (`c.r = 22.2–24.8 m`, `6–16` draws/seat), `trapper-cellar` (`c.r = 13.7 m`, `12` cellar cap draws behind `quarter-ne` at Seat 4), `objectiveProps` (`c.r = 227.0 m`, `1–3` draws/seat), and `marrow-crack-light` (`c.r = 24.5 m`, `9` draws at Seat 5) all get `c.wc = -2`.
  4. Walked 5 paths (`72` frames each, `360` frames total, `30` `1080p` checkpoint stills) along the HQ ring and through the N, W, NW, and NE gaps: **zero late pop-in** of props through any gap.
  5. Verified Dawn (`06:30`, `worldTime = 0.27`) and Dusk (`17:30`, `worldTime = 0.73`) low-sun shadows behind `hq-thicket` W and `quarter-ne`: **`0.0000%` ground-shadow pixel difference (`0` pixels > `8/255`)** between `wallCull OFF` and `wallCull ON`.

Files:
- `qa/2026-11-03-AG-222/seats-and-shadows-sheet.jpg`
- `qa/2026-11-03-AG-222/ring-and-gaps-walk-sheet.jpg`
- `qa/2026-11-03-AG-222/report.md`
- `qa/2026-11-03-AG-222/telemetry.json`
- `qa/2026-11-03-AG-222/walks-traces.json`
- `qa/2026-11-03-AG-222/run-ag222.mjs`
- `qa/2026-11-03-AG-222/build-sheet.py`
- `qa/2026-11-03-AG-222/seat1-hq-north-off.jpg`
- `qa/2026-11-03-AG-222/seat1-hq-north-on.jpg`
- `qa/2026-11-03-AG-222/seat2-hq-west-off.jpg`
- `qa/2026-11-03-AG-222/seat2-hq-west-on.jpg`
- `qa/2026-11-03-AG-222/seat3-quarter-nw-off.jpg`
- `qa/2026-11-03-AG-222/seat3-quarter-nw-on.jpg`
- `qa/2026-11-03-AG-222/seat4-quarter-ne-off.jpg`
- `qa/2026-11-03-AG-222/seat4-quarter-ne-on.jpg`
- `qa/2026-11-03-AG-222/seat5-quarter-sw-off.jpg`
- `qa/2026-11-03-AG-222/seat5-quarter-sw-on.jpg`
- `qa/2026-11-03-AG-222/shadow-dawn_west_wall-off.jpg`
- `qa/2026-11-03-AG-222/shadow-dawn_west_wall-on.jpg`
- `qa/2026-11-03-AG-222/shadow-dusk_ne_wall-off.jpg`
- `qa/2026-11-03-AG-222/shadow-dusk_ne_wall-on.jpg`
- `handoffs/2026-11-03-antigravity-AG-222.md`

Tests:
- `node crew/crew.mjs slot run antigravity AG-222 -- node qa/2026-11-03-AG-222/run-ag222.mjs` (PASS — `160` cells, `139` segments, 5 seats A/B + 5 walks + 2 dawn/dusk shadow checks on RTX 5080 WebGPU)

Screenshots:
- `qa/2026-11-03-AG-222/seats-and-shadows-sheet.jpg`
- `qa/2026-11-03-AG-222/ring-and-gaps-walk-sheet.jpg`

Not verified:
- None.

Requests:
- To Grokbot: To hit the `>= 66.7%` (two-thirds) behind-band draw reduction target across all 5 seats, fix (1) `index.html:2364` / `game/wall-cull.js:126` where `y1 = cy + c.r` inflates a cell's vertical top height by its horizontal bounding sphere radius `c.r` instead of using `_cullBox.max.y`, and (2) add `userData.cullKids = true` (or sub-chunking) to `streamGroup` (`c.r = 340.3 m`), `objectiveProps` (`c.r = 227 m`), `trapper-cellar` (`c.r = 13.7 m`), and `scatterWaterLife` `36 m` shore chunks (`c.r = 22–25 m`).

Contract changes:
- None.
