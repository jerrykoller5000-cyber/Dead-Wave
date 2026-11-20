# Task: AG-331 — 5080 QA of the landed J159c zombie feet

- **Owner:** antigravity
- **Date:** 2026-11-17
- **Model:** Gemini 4 Carbon
- **Status:** DONE
- **Goal:** Run native 5080 WebGPU QA on the landed J159c zombie feet changes (`game/zombie-feet.js` `6befd0a6`, `game/zombie-limits.js` `e51526d5`, `index.html` `9311196f`, zero game-code edits), capturing 1/10 s sequences per requested type (`screamer`, `feral`, `shambler`, `drowned`, `military`, `brute`), inspecting pixels and telemetry, and reporting anything that looks wrong to the Director, Claude 5, and Claude 6.

## Summary Verdict

Overall landed J159c feet are **solid / no major regressions**, with clean alternating step arcs on `screamer`, unchanged `feral` attack/sprint (still on old feet by design), and planted stance across the 4 walkers (`shambler` cleanest; minor stance creep on `military` / `brute` and a stop-slide / asymmetric low-L step arc on `screamer` noted below).

## Per-Type Results (Noon, 5080 Native Inspector `?inspect&raf=timer` + `I.still(true)`)

| Sequence | Frames (`0.1s`) | Sole Y Min/Max (cm) | Same-Lock Stance Slip (`cm/0.1s`) | Max Lock Drift (cm) | Visual & Telemetry Notes |
|---|---:|---|---|---|---|
| `screamer-walk-side` | 24 (24 unique) | `L [-0.2, 6.2]` / `R [-0.3, 11.9]` | `L 2.0` / `R 2.0` | `L 4.0` / `R 3.7` | Steps lift cleanly in alternating arcs (`rv ~ 1.61 m/s`, `9 L / 8 R` steps), no sky-snaps. Note: (1) `L` lifts lower than `R` (`max 6.2 cm` vs `11.9 cm`, `t+1.90->2.00s` `L` step clears only `1.6->2.4 cm` over `42.5 cm` travel), (2) when decelerating to stop at `t+2.20..2.30s` (`rv 0.70->0.26`), locks release (`free`) and `R` slides `9.9 cm` at `-0.3 cm`, (3) dark sonic cloud smears in a coarse trail behind her at noon. |
| `feral-attack-side` | 24 (24 unique) | `L [-5.5, 73.4]` / `R [-3.0, 66.0]` | `0.0 / 0.0` (unused) | `0.0 / 0.0` | Standing attack against marine on old feet by design; rear-leg kick (`66–73 cm`) and lunge dips (`-5.5 / -3.0 cm`) look no worse than pre-landing baseline. |
| `feral-walk-side` | 16 (16 unique) | `L [-0.9, 60.9]` / `R [-0.5, 65.1]` | `0.0 / 0.0` | `L 5.3` / `R 5.0` | Fast crouch-sprint / curving (`rv=6.21`, `yaw 0.90 -> -1.24`), huge bounding strides, no foot breakage or worse behavior. |
| `shambler-walk-3q-45m` | 16 (16 unique) | `L [-0.5, 12.3]` / `R [-0.4, 13.4]` | `L 0.7` / `R 0.6` | `L 1.7` / `R 1.5` | Cleanest walker (`rv 1.94 -> 3.66 m/s`): crisp alternating lifts and solidly planted stance (`<= 0.7 cm/0.1s` slip, `<= 1.7 cm` lock drift). |
| `drowned-walk-3q-45m` | 16 (16 unique) | `L [-0.9, 9.4]` / `R [-1.2, 10.2]` | `L 1.0` / `R 1.2` | `L 3.6` / `R 2.9` | Planted stance and clear alternating walk steps (`rv 1.14 -> 2.24 m/s`). Note: red `sl=47.0` strip label at `t+1.30s` is `0.1 s` sampling aliasing across a full `0.080 s` fast right step (not locked sliding); minor `-0.9..-1.2 cm` sole-into-floor dip at stance. |
| `military-walk-3q-45m` | 16 (16 unique) | `L [0.1, 22.6]` / `R [0.2, 22.5]` | `L 2.6` / `R 2.6` | `L 3.4` / `R 3.4` | Clear high march arcs at `rv 3.59 -> 3.62 m/s`, `t+0.00..1.40s` feet visible. Minor flaw: consistent `2.6 cm / 0.1s` same-lock forward stance creep (`3.4 cm` drift here; `4.7 cm` / `5.6 cm` in pre-reframing run) despite `shambler` at the same `3.6 m/s` holding `<= 0.7 cm`. |
| `brute-walk-3q-45m` | 16 (16 unique) | `L [-1.5, 15.4]` / `R [-1.9, 18.8]` | `L 2.6` / `R 2.2` | `L 7.0` / `R 7.0` | Heavy stride (`rv 1.16 -> 2.11 m/s`), full body framed across all 16 tiles, clear lifts. Minor flaw: stance lock drift reaches `7.0 cm` on late stance (`t+0.80..0.90s`, `1.50s`) and soles sink slightly (`-1.5 / -1.9 cm`). |

## Artifacts & Verification
- Capture script: `review/AG-331/capture-ag331.mjs` (`slot run antigravity AG-331 --checks "AG-331 J159c zombie feet 5080 QA" -- node review/AG-331/capture-ag331.mjs` -> exit `0`, `7 sequences`, `pageErrors=0`, `inspectorErrors=0`, `100%` unique frame MD5s).
- Strip builder & telemetry: `review/AG-331/build_strips.py`, `review/AG-331/metrics.json`, `review/AG-331/summary.json`.
- 1/10 s contact strips (all visually inspected):
  - `review/AG-331/strip-screamer-walk-side.jpg`
  - `review/AG-331/strip-feral-attack-side.jpg`
  - `review/AG-331/strip-feral-walk-side.jpg`
  - `review/AG-331/strip-shambler-walk-3q-45m.jpg`
  - `review/AG-331/strip-drowned-walk-3q-45m.jpg`
  - `review/AG-331/strip-military-walk-3q-45m.jpg`
  - `review/AG-331/strip-brute-walk-3q-45m.jpg`

Changed:
- Review-only QA scripts and artifacts under `review/AG-331/` (`capture-ag331.mjs`, `build_strips.py`, `metrics.json`, `summary.json`, 7 strips + frame PNGs); zero edits to live game code.

Tests:
- `node crew/crew.mjs slot run antigravity AG-331 --checks "AG-331 J159c zombie feet 5080 QA" -- node review/AG-331/capture-ag331.mjs`: exited 0 (`7 sequences`, `pageErrors=0`, `inspectorErrors=0`, 100% unique MD5s across all 128 frames).
- `python review/AG-331/build_strips.py`: exited 0, rebuilt all 7 strips and `review/AG-331/metrics.json`.

Not verified:
- Longer multi-second feral circling transitions beyond the 2.4 s `live` attack window and 1.6 s `walk` crouch-sprint sequence.
