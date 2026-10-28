# AG-139 World Sweep Refresh & Next Places Camera Pass (CL-256)

- **Date**: 2026-10-27
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-139` (`The sweep fresh, and the eyes on its next places (CL-256)`)
- **Renderer**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)` (`1600×900`, `--match` mode with live directional sun shadow-map & foliage player-follow hook)

---

## 1. Fresh Sweep & Report Summary (`2026-10-27 18:06 UTC`)

- **Command 1 (via slot)**: `node tools/sweep/run.mjs tools/sweep/sweep.js --match --out review/sweep/sweep.json` → `wrote review/sweep/sweep.json (802021 bytes) in 33 s`
- **Command 2**: `node tools/sweep/report.mjs review/sweep/sweep.json` → `wrote docs/sweep/README.md, 38 places in docs/sweep/numbers/, jobs in review/sweep/jobs/`
- **World Totals (`2026-10-27 18:06 UTC` vs `2026-10-25 00:54 UTC`)**:
  - **Objects / Pieces**: `2,036` things (`13,713` pieces), `430` trees, `150` rocks, `1,206` colliders (up from `1,994` things / `12,641` pieces / `1,175` colliders on `2026-10-25`).
  - **Suspect Counts**: `11 hangs`, `1 water`, `15 overlap` (down from `17`), `1 branches`, `15 hill-ring` (replaces `15 invisible-wall` after `CL-266` / `AG-137`), `27 no-collider`, `4 on-trail` (down from `7`), `3 reach`, `9 even-spacing`.
  - **Key Delta at `camp-trapper`**: Following `AG-137` (`world/camps.js`), `camp-trapper` dropped from `2 strong / 6 total (hangs, overlap, on-trail)` to **`1 strong / 2 total`** (`0 overlap`, `0 reach`, `0 on-trail`; only the riverside `buildFenceRun` slope hang and leaf-bed `no-collider` remain).

---

## 2. Camera Jobs Execution Summary (`38 / 38 Passed`, `0 Failed`)

All **38** places in `docs/sweep/README.md` (**25** named places + **13** wild squares with suspects) were shot in a single `--match` camera session through the game-test slot.
- **Failed Jobs**: **None (`0` failed shots, `0` failed contact sheets across all 38 jobs).**
- **Note on Place Mapping (`tools/sweep/sweep.js` lines 79–83)**:
  - `sweep.js` folds any `history-props` child within `p.r + 6` meters of a named POI into that POI rather than spawning a separate `h-*` place:
    - **The Chapel (`coldwater-church`)** is within `28 m` of `graveyard` (`(-89.96, 89.15)`) and is reported in `docs/sweep/numbers/graveyard.md` and pictured in `review/sweep/graveyard/sheet.jpg` (note that `graveyard-from-north.png` stands directly inside the ruined chapel walls).
    - **The Mine (`mine-timbers`, `mine-bars-cut`, `bolt-cutters`)** is at `cave-3` (`Northeast Cave`, `(-161.35, 90.29)`) and is reported in `docs/sweep/numbers/cave-3.md` and pictured in `review/sweep/cave-3/sheet.jpg` (`cave-3-suspect-1.png` frames the `bolt-cutters` reach suspect at the mine portal).
    - **Coldwater (`coldwater-foundation`)** stands outside `graveyard`'s radius at `(-61.63, 74.29)` and has its own job `review/sweep/jobs/h-coldwater-foundation.json` → `review/sweep/h-coldwater-foundation/sheet.jpg`.

### Named Places (`25` Jobs — All `PASS`)

| Category | Place ID | Name | Strong / All Suspects | Numbers File | Contact Sheet | Status |
| --- | --- | --- | :---: | --- | --- | :---: |
| **Supply Sites** | `hut-1` | Hut 1 | `0 / 0` | `docs/sweep/numbers/hut-1.md` | `review/sweep/hut-1/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `hut-2` | Hut 2 | `0 / 0` | `docs/sweep/numbers/hut-2.md` | `review/sweep/hut-2/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `hut-3` | Hut 3 (fuel depot) | `1 / 2` (`reach, overlap`) | `docs/sweep/numbers/hut-3.md` | `review/sweep/hut-3/sheet.jpg` | **PASS** (7 shots) |
| **Supply Sites** | `wreck-1` | Ambulance wreck (medical convoy) | `0 / 1` (`overlap`) | `docs/sweep/numbers/wreck-1.md` | `review/sweep/wreck-1/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `wreck-2` | Utility truck wreck | `0 / 0` | `docs/sweep/numbers/wreck-2.md` | `review/sweep/wreck-2/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `cabin-1` | Cabin 1 | `0 / 1` (`overlap`) | `docs/sweep/numbers/cabin-1.md` | `review/sweep/cabin-1/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `cabin-2` | Cabin 2 | `0 / 0` | `docs/sweep/numbers/cabin-2.md` | `review/sweep/cabin-2/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `camp-ranger` | Ranger Camp | `0 / 4` (`overlap, no-collider`) | `docs/sweep/numbers/camp-ranger.md` | `review/sweep/camp-ranger/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `camp-hikers` | Hikers Camp | `0 / 0` | `docs/sweep/numbers/camp-hikers.md` | `review/sweep/camp-hikers/sheet.jpg` | **PASS** (6 shots) |
| **Supply Sites** | `camp-trapper` | Trapper Camp | `1 / 2` (`hangs, no-collider`) | `docs/sweep/numbers/camp-trapper.md` | `review/sweep/camp-trapper/sheet.jpg` | **PASS** (7 shots) |
| **Landmarks** | `tower` | Watchtower | `1 / 1` (`on-trail`) | `docs/sweep/numbers/tower.md` | `review/sweep/tower/sheet.jpg` | **PASS** (7 shots) |
| **Landmarks** | `graveyard` | Graveyard (+ Chapel) | `0 / 1` (`overlap`) | `docs/sweep/numbers/graveyard.md` | `review/sweep/graveyard/sheet.jpg` | **PASS** (6 shots) |
| **Landmarks** | `dock` | Dock | `1 / 1` (`on-trail`) | `docs/sweep/numbers/dock.md` | `review/sweep/dock/sheet.jpg` | **PASS** (7 shots) |
| **Landmarks** | `h-coldwater-foundation` | Coldwater Foundation | `0 / 0` | `docs/sweep/numbers/h-coldwater-foundation.md` | `review/sweep/h-coldwater-foundation/sheet.jpg` | **PASS** (6 shots) |
| **Landmarks** | `h-cordon-gate` | Cordon Gate | `2 / 10` (`overlap, no-collider`) | `docs/sweep/numbers/h-cordon-gate.md` | `review/sweep/h-cordon-gate/sheet.jpg` | **PASS** (8 shots) |
| **Landmarks** | `hq` | FOB Threshold (the HQ) | `1 / 1` (`on-trail`) | `docs/sweep/numbers/hq.md` | `review/sweep/hq/sheet.jpg` | **PASS** (6 shots) |
| **Landmarks** | `mast` | Radio mast | `0 / 1` (`reach`) | `docs/sweep/numbers/mast.md` | `review/sweep/mast/sheet.jpg` | **PASS** (6 shots) |
| **Bridges & River** | `bridge-1` | Bridge 1 | `0 / 0` | `docs/sweep/numbers/bridge-1.md` | `review/sweep/bridge-1/sheet.jpg` | **PASS** (6 shots) |
| **Bridges & River** | `bridge-2` | Bridge 2 | `1 / 1` (`on-trail`) | `docs/sweep/numbers/bridge-2.md` | `review/sweep/bridge-2/sheet.jpg` | **PASS** (7 shots) |
| **Cave Mouths** | `cave-1` | Northwest Cave | `0 / 4` (`hill-ring`) | `docs/sweep/numbers/cave-1.md` | `review/sweep/cave-1/sheet.jpg` | **PASS** (6 shots) |
| **Cave Mouths** | `cave-2` | North Cave | `0 / 0` | `docs/sweep/numbers/cave-2.md` | `review/sweep/cave-2/sheet.jpg` | **PASS** (6 shots) |
| **Cave Mouths (+ Mine)** | `cave-3` | Northeast Cave (Mine) | `1 / 8` (`reach, overlap, hill-ring`) | `docs/sweep/numbers/cave-3.md` | `review/sweep/cave-3/sheet.jpg` | **PASS** (7 shots) |
| **Cave Mouths** | `cave-4` | East Cave | `0 / 4` (`hill-ring`) | `docs/sweep/numbers/cave-4.md` | `review/sweep/cave-4/sheet.jpg` | **PASS** (6 shots) |
| **Cave Mouths** | `cave-5` | South Cave | `0 / 0` | `docs/sweep/numbers/cave-5.md` | `review/sweep/cave-5/sheet.jpg` | **PASS** (6 shots) |
| **Cave Mouths** | `cave-6` | Southwest Cave | `0 / 1` (`hill-ring`) | `docs/sweep/numbers/cave-6.md` | `review/sweep/cave-6/sheet.jpg` | **PASS** (6 shots) |

### Wild Squares with Suspects (`13` Jobs — All `PASS`)

| Wild Square ID | Coordinates | Strong / All Suspects | Numbers File | Contact Sheet | Status |
| --- | --- | :---: | --- | --- | :---: |
| `wild-m150_m100` | `-150, -100` | `2 / 15` (`hangs, no-collider`) | `docs/sweep/numbers/wild-m150_m100.md` | `review/sweep/wild-m150_m100/sheet.jpg` | **PASS** |
| `wild-200_50` | `200, 50` | `1 / 1` (`hangs`) | `docs/sweep/numbers/wild-200_50.md` | `review/sweep/wild-200_50/sheet.jpg` | **PASS** |
| `wild-m100_m200` | `-100, -200` | `1 / 1` (`hangs`) | `docs/sweep/numbers/wild-m100_m200.md` | `review/sweep/wild-m100_m200/sheet.jpg` | **PASS** |
| `wild-150_m150` | `150, -150` | `1 / 1` (`hangs`) | `docs/sweep/numbers/wild-150_m150.md` | `review/sweep/wild-150_m150/sheet.jpg` | **PASS** |
| `wild-m100_m100` | `-100, -100` | `0 / 5` (`no-collider`) | `docs/sweep/numbers/wild-m100_m100.md` | `review/sweep/wild-m100_m100/sheet.jpg` | **PASS** |
| `wild-m150_150` | `-150, 150` | `0 / 2` (`hangs`) | `docs/sweep/numbers/wild-m150_150.md` | `review/sweep/wild-m150_150/sheet.jpg` | **PASS** |
| `wild-200_100` | `200, 100` (River) | `0 / 2` (`no-collider, water`) | `docs/sweep/numbers/wild-200_100.md` | `review/sweep/wild-200_100/sheet.jpg` | **PASS** |
| `wild-m100_0` | `-100, 0` | `0 / 2` (`branches, no-collider`) | `docs/sweep/numbers/wild-m100_0.md` | `review/sweep/wild-m100_0/sheet.jpg` | **PASS** |
| `wild-m50_200` | `-50, 200` | `0 / 1` (`hangs`) | `docs/sweep/numbers/wild-m50_200.md` | `review/sweep/wild-m50_200/sheet.jpg` | **PASS** |
| `wild-200_m100` | `200, -100` | `0 / 1` (`hangs`) | `docs/sweep/numbers/wild-200_m100.md` | `review/sweep/wild-200_m100/sheet.jpg` | **PASS** |
| `wild-200_m50` | `200, -50` | `0 / 1` (`hangs`) | `docs/sweep/numbers/wild-200_m50.md` | `review/sweep/wild-200_m50/sheet.jpg` | **PASS** |
| `wild-50_100` | `50, 100` | `0 / 1` (`overlap`) | `docs/sweep/numbers/wild-50_100.md` | `review/sweep/wild-50_100/sheet.jpg` | **PASS** |
| `wild-m150_50` | `-150, 50` | `0 / 1` (`hill-ring`) | `docs/sweep/numbers/wild-m150_50.md` | `review/sweep/wild-m150_50/sheet.jpg` | **PASS** |
