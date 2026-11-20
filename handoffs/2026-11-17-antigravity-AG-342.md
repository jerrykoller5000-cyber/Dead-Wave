# Task: AG-342 — CB-349 v5 guardian & caveguard hind soles: native t164/t340/tg164 served swap + AG-339 5080 sheet

- **Owner:** antigravity
- **Date:** 2026-11-17
- **Model:** Gemini 4 Carbon
- **Status:** DONE
- **Goal:** Run native `realtest-swap.mjs` gates (`t164`, `t340`, `tg164` on `review/CB-349/v5/index.cb349v5.html` `b22ffe13` + live `9311196f` `tg164` BEFORE probe) keeping `index.html` (`9311196f`) untouched on disk, and capture the 5080 WebGPU BEFORE vs AFTER sheet (gallop deepest plunge, gallop fold trailing-foot frame, and settled stand, side + low 3/4, noon) in `review/CB-349/v5-ag/`.

Changed:
- Capture / sheet / log outputs only (zero game code edited; `index.html` stays `9311196f`):
  - `qa/2026-11-17-AG-341/capture-cb349v5.mjs` (staged, verified untouched live tree)
  - `qa/2026-11-17-AG-341/build_sheet_v5.py` (label updated `AG-341` -> `AG-342`)
  - `review/CB-349/v5-ag/native-swap-raw.txt`
  - `review/CB-349/v5-ag/CB-349-v5-before-after-sheet.jpg`
  - `review/CB-349/v5-ag/summary.json` + 24 PNGs (`before-*` & `after-*` x `{guardian,caveguard}` x `{gallop,fold,stand}` x `{side,low3q}`)

Tests:
- `node crew/crew.mjs slot run antigravity AG-342 --minutes 15 --checks "CB-349 v5 swap: t164 t340 tg164 + live tg164" -- cmd /c "node review/CB-349/v5/realtest-swap.mjs review/CB-349/v5/index.cb349v5.html t164 t340 review/CB-349/v5/tg164.js --all && echo === LIVE BEFORE PROBE === && node review/CB-349/v5/realtest-swap.mjs index.html review/CB-349/v5/tg164.js --all"`:
  - Served swap `review/CB-349/v5/index.cb349v5.html` (`b22ffe13`, `index.html` `9311196f` untouched): **3 checks: 38 pass, 0 fail** (`t164 14 pass 0 fail` `53.3s` — max turn `0.61 rad` <= `0.9`; `t340 19 pass 0 fail` `57.1s`; `tg164 5 pass 0 fail` `72.1s`).
  - Live `index.html` (`9311196f`) `tg164` BEFORE probe: **1 check: 5 pass, 0 fail** (`66.7s`).
  - Key `tg164` deltas (`LIVE 9311196f` -> `CB-349 v5 b22ffe13`):
    - **Guardian:** biggest turn `0.835 (ankleR, gallop)` -> **`0.523 (kneeR, gallop)`**; gallop hind sole min/p5/med `-36.5 / -35.6 / -22.2 cm` -> **`-2.7 / -1.2 / 0.0 cm`**; stand min/med `-22.6 / -9.6 cm` -> **`-0.9 / -0.8 cm`**.
    - **Caveguard:** biggest turn `0.747 (ankleR, gallop)` -> **`0.553 (kneeL, gallop)`**; gallop hind sole min/p5/med `-39.8 / -36.5 / -24.8 cm` -> **`-2.6 / -1.1 / 0.0 cm`**; stand min/med `-18.9 / -6.5 cm` -> **`-1.0 / -1.0 cm`**.
- `node crew/crew.mjs slot run antigravity AG-342 --minutes 15 --checks "CB-349 v5 BEFORE vs AFTER 5080 sheet capture (gallop, fold, stand)" -- node qa/2026-11-17-AG-341/capture-cb349v5.mjs`: exited `0`, `pageErrors=0/0`, `inspectorErrors=0/0`, `12` unique BEFORE + `12` unique AFTER PNGs (`1280x720`).
- `python qa/2026-11-17-AG-341/build_sheet_v5.py`: exited `0`, verified `12/12` unique BEFORE and `12/12` unique AFTER hashes, wrote `CB-349-v5-before-after-sheet.jpg` (`950126 bytes`).

Not verified:
- No night lighting pass (noon only per request; same cameras across BEFORE/AFTER).

## 5080 Visual Inspection (`CB-349-v5-before-after-sheet.jpg` & Full-Res PNGs)
- **Guardian gallop (`bestIdx=88`):** `BEFORE` sole `[-39.94, -36.51] cm` (ankles `-25.4/-21.97 cm`, hind shins plunged underground) -> **`AFTER` sole `[-0.34, -0.15] cm`** (`ankle [16.9, 15.95] cm`), `90`-frame `sole min..med` `-39.94..-26.92 -> -2.48..0 cm`.
- **Guardian gallop fold (`foldIdx=19`):** `BEFORE` trailing sole `[-28.01, -31.33] cm` buried in floor -> **`AFTER` trailing sole `[+3.47, +4.27] cm`** lifted clearly under the shin with sole down, claws forward, zero floor intersection.
- **Guardian stand:** `BEFORE` sole `-6.69 cm` -> **`AFTER` `-0.93 cm`** seated cleanly on the floor grid.
- **Caveguard gallop (`bestIdx=8`):** `BEFORE` sole `[-34.2, -32.06] cm` (`ankle [-23.04, -20.86] cm`) -> **`AFTER` sole `[-0.07, -0.18] cm`** (`ankle [11.5, 11.69] cm`), `90`-frame `sole min..med` `-35.59..-27.83 -> -2.65..+0.45 cm`.
- **Caveguard gallop fold (`foldIdx=82`):** `BEFORE` trailing sole `[-32.96, -34.08] cm` -> **`AFTER` `[+0.4, +1.91] cm`** cleanly clear above the floor, toes forward under shin.
- **Caveguard stand:** `BEFORE` sole `-3.88 cm` -> **`AFTER` `-1.04 cm`** cleanly seated.

## Outputs
- [`review/CB-349/v5-ag/native-swap-raw.txt`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CB-349/v5-ag/native-swap-raw.txt)
- [`review/CB-349/v5-ag/CB-349-v5-before-after-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CB-349/v5-ag/CB-349-v5-before-after-sheet.jpg)
- [`review/CB-349/v5-ag/summary.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/CB-349/v5-ag/summary.json)
