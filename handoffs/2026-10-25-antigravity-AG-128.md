# Antigravity — AG-128 GPU look: CL-261 part 2 knife stab and machete chop (third-person front/right and first-person eyes) — 2026-10-25
Changed:          Verified Claude's `CL-261 part 2` blade turn and knife stab reach on Jerry's RTX 5080 GPU in third person (front and right/blade side) and first person (from his eyes), both held at key phases (`u = 0.14..0.58`) and at 60 fps play speed (`qa/2026-10-25-AG-128/`), plus ran `t299`, `t195`, `t296`, `t297` (`35 pass, 0 fail`). Confirmed the chest now draws the blade's shoulder back at the cock/wind-up (`-11.9°` knife, `-25.7°` machete) and turns it through on the blow (`+25.9°` knife stab with `+11.6°` lean driving the fist `70.1 cm` straight out at shoulder height with `91.1%` arm extension; `+25.8°` machete chop), and noted three first-person visual observations for optional follow-up.
Files:            qa/2026-10-25-AG-128/cl261-part2-blades-sheet.jpg, qa/2026-10-25-AG-128/ag128-report.json, qa/2026-10-25-AG-128/run-ag128-gpu.mjs, qa/2026-10-25-AG-128/cl261p2-knife-front-0-cock.png, qa/2026-10-25-AG-128/cl261p2-knife-front-1-drive.png, qa/2026-10-25-AG-128/cl261p2-knife-front-2-stab.png, qa/2026-10-25-AG-128/cl261p2-knife-front-3-cut.png, qa/2026-10-25-AG-128/cl261p2-knife-right-0-cock.png, qa/2026-10-25-AG-128/cl261p2-knife-right-1-drive.png, qa/2026-10-25-AG-128/cl261p2-knife-right-2-stab.png, qa/2026-10-25-AG-128/cl261p2-knife-right-3-cut.png, qa/2026-10-25-AG-128/cl261p2-knife-fp-0-cock.png, qa/2026-10-25-AG-128/cl261p2-knife-fp-1-drive.png, qa/2026-10-25-AG-128/cl261p2-knife-fp-2-stab.png, qa/2026-10-25-AG-128/cl261p2-knife-fp-3-cut.png, qa/2026-10-25-AG-128/cl261p2-machete-front-0-wind1.png, qa/2026-10-25-AG-128/cl261p2-machete-front-1-windPeak.png, qa/2026-10-25-AG-128/cl261p2-machete-front-2-midChop.png, qa/2026-10-25-AG-128/cl261p2-machete-front-3-chopEnd.png, qa/2026-10-25-AG-128/cl261p2-machete-right-0-wind1.png, qa/2026-10-25-AG-128/cl261p2-machete-right-1-windPeak.png, qa/2026-10-25-AG-128/cl261p2-machete-right-2-midChop.png, qa/2026-10-25-AG-128/cl261p2-machete-right-3-chopEnd.png, qa/2026-10-25-AG-128/cl261p2-machete-fp-0-wind1.png, qa/2026-10-25-AG-128/cl261p2-machete-fp-1-windPeak.png, qa/2026-10-25-AG-128/cl261p2-machete-fp-2-midChop.png, qa/2026-10-25-AG-128/cl261p2-machete-fp-3-chopEnd.png
Tests:            node tools/tests/run-all.mjs t299 t296 t297 t195 --agent antigravity --task AG-128 --jobs 1 → 4 checks: 35 pass, 0 fail (t195: 16/0, t296: 9/0, t297: 4/0, t299: 6/0); new tests: none
Screenshots:      qa/2026-10-25-AG-128/cl261-part2-blades-sheet.jpg
Not verified:     none
Requests:         Replied DONE to Claude's request ("GPU look: the knife stab and the machete chop, part 2 (CL-261)")
Contract changes: none

---

## 1. Third-Person Knife Stab (`cl261p2-knife-front-*`, `cl261p2-knife-right-*`)

| Phase (`u`) | Chest Turn (`rad` / `deg`) | Chest Lean (`rad` / `deg`) | Shoulder `out / right / up` (`m`) | Fist `out / right / up` (`m`) | Arm Straight (`%`) | Off Target (`cm`) |
|---|---|---|---|---|---|---|
| `0.14` (Cock) | `-0.208` (`-11.9°`) | `+0.032` (`+1.8°`) | `0.003 / 0.344 / 1.085` | `0.081 / 0.155 / 1.193` | `39.9%` | `0.00 cm` |
| `0.30` (Drive) | `+0.235` (`+13.4°`) | `+0.209` (`+12.0°`) | `0.216 / 0.315 / 1.044` | `0.450 / 0.020 / 1.137` | `66.8%` | `0.00 cm` |
| `0.40` (Stab Peak) | `+0.452` (`+25.9°`) | `+0.203` (`+11.6°`) | `0.273 / 0.276 / 1.035` | **`0.701 / -0.032 / 1.073`** | **`91.1%`** | **`0.00 cm`** |
| `0.58` (Cut Across) | `+0.519` (`+29.8°`) | `+0.002` (`+0.1°`) | `0.221 / 0.261 / 1.081` | `0.406 / -0.169 / 1.080` | `80.6%` | `0.00 cm` |

- **Play-speed 60 fps verification (`knifePlaySpeed.res3P`):** Across the unheld `0.22 s` swing, the chest turns smoothly from `-11.7°` (frame 1, `shOut = -0.3 cm`, `fistOut = 7.3 cm`) to `+24.7°..+26.6°` (frames 4–5, `shOut = 26.2 cm`, `fistOut = 69.0 cm`, `fistUp = 108.1 cm`) and `+29.5°` (frame 7, cut across) before recovering cleanly by frame 12.

---

## 2. Third-Person Machete Chop (`cl261p2-machete-front-*`, `cl261p2-machete-right-*`)

| Phase (`u`) | Chest Turn (`rad` / `deg`) | Chest Lean (`rad` / `deg`) | Shoulder `out / right / up` (`m`) | Fist `out / right / up` (`m`) | Arm Straight (`%`) |
|---|---|---|---|---|---|
| `0.16` (Early Wind-up) | `-0.187` (`-10.7°`) | `+0.057` (`+3.3°`) | `0.006 / 0.355 / 1.075` | `0.051 / 0.263 / 1.315` | `44.9%` |
| `0.36` (Wind-up Peak) | **`-0.449` (`-25.7°`)** | `+0.141` (`+8.1°`) | **`-0.059 / 0.353 / 1.072`** | `0.226 / 0.271 / 1.544` | `96.1%` |
| `0.48` (Mid-Chop) | `+0.062` (`+3.6°`) | `+0.120` (`+6.9°`) | `+0.121 / 0.357 / 1.049` | `0.557 / 0.000 / 1.165` | `99.1%` |
| `0.58` (Chop End) | **`+0.451` (`+25.8°`)** | `+0.081` (`+4.7°`) | **`+0.222 / 0.272 / 1.074`** | `0.301 / -0.298 / 1.065` | `99.1%` |

- **Result:** The chest turn is now the right way round: at `u = 0.36` the right shoulder draws back (`-25.7°`, `shOut = -5.9 cm`) as the machete climbs overhead (`1.544 m`), then drives forward (`+25.8°`, `shOut = +22.2 cm`) through the diagonal chop.

---

## 3. First-Person View from His Eyes (`cl261p2-knife-fp-*`, `cl261p2-machete-fp-*`)

| Move & Phase (`u`) | `otsW` | Chest Turn (`deg`) | Chest Lean (`deg`) | Shoulder `out` (`m`) | Fist `out / right / up` (`m`) | Arm Straight (`%`) |
|---|---|---|---|---|---|---|
| Knife `0.14` (Cock) | `0.981` | `-3.8°` | `+0.5°` | `0.037` | `0.077 / 0.150 / 1.192` | `37.9%` |
| Knife `0.30` (Drive) | `1.000` | `+4.0°` | `+3.6°` | `0.101` | `0.446 / 0.023 / 1.142` | `80.1%` |
| Knife `0.40` (Stab) | `1.000` | `+7.7°` | `+3.6°` | `0.123` | `0.619 / 0.031 / 1.067` | `99.1%` |
| Knife `0.58` (Cut) | `1.000` | `+8.9°` | `0.0°` | `0.107` | `0.412 / -0.160 / 1.078` | `98.3%` |
| Machete `0.36` (Wind-up) | `1.000` | `-7.7°` | `+7.9°` | `0.065` | `0.312 / 0.218 / 1.529` | `96.1%` |
| Machete `0.48` (Mid-Chop) | `1.000` | `+1.1°` | `+6.8°` | `0.112` | `0.552 / 0.003 / 1.172` | `99.1%` |
| Machete `0.58` (Chop End) | `1.000` | `+7.7°` | `+4.8°` | `0.136` | `0.377 / -0.210 / 1.058` | `99.1%` |

- **View Stability & Reach:** Scaling the chest turn and lean to 30% (`fp = 1 - 0.7 * OTS.w`) keeps the first-person camera completely steady (`0.05°` max camera rotation drift across the 60 fps unheld swing) while the knife fist reaches `61.9 cm` (held) / `62.6 cm` (play speed) in front of the player.
- **Three First-Person Visual Observations (Non-blocking):**
  1. **Held firearm stays at `FP_HIP` during blade swing (`cl261p2-knife-fp-1-drive.png`, `cl261p2-machete-fp-2-midChop.png`):** When a gun (e.g. Pistol) is equipped in first person, it stays parked near the bottom-center of the screen (`FP_HIP`) while the offhand/blade arm (`armLG`) swings the knife or machete directly past/behind the pistol.
  2. **Shoulder-height stab sits near the bottom viewport edge in first person (`cl261p2-knife-fp-2-stab.png`):** Because the first-person eye is at `y ≈ 1.62 m` and the stab target is at shoulder height (`y = 1.067 m`, `61.9 cm` out, i.e. `-41.6°` below horizontal), only the top ~5 cm of the knife tip peeks above the bottom border of the screen at `u = 0.40` (whereas at `u = 0.30` and during the machete chop at `u = 0.48` the blade sits higher in frame).
  3. **Near-plane sleeve clip at `u = 0.14` cock (`cl261p2-knife-fp-0-cock.png`):** Drawing the right shoulder back at `u = 0.14` (`shOut = 3.7 cm`, `fistUp = 1.192 m`) briefly clips 3–4 upper-sleeve triangles against the camera's near plane (`0.1 m`).

---

## Rule 16 (Game-Test Slot)
- All browser tests and GPU captures were executed strictly through `node crew/crew.mjs slot run antigravity AG-128` with a single game instance (`--jobs 1`) and released cleanly upon completion.
