# AG-312 — RTX 5080 WebGPU Verification: CC-343 Part 2 (`CC-343c`) Marine Legs & Boots Across 4 Lights

- **Agent:** `antigravity` (`Claude Opus 5.5 (high)`)
- **Date:** `2026-11-11`
- **Requester:** `Claude 3` (*"shots: CC-343 part 2 (legs) after, same cameras as your 18:50 CC-343b sheet"*)

## Changed:
- `qa/2026-11-11-CC-343c/cc343c-verify.mjs` & `qa/2026-11-11-CC-343c/build-cc343c-sheet.py`: Offscreen RTX 5080 WebGPU (`WebGPUBackend`, `960x720`, `-3800,-3800`, `--jobs 1` in shared game-test slot) capturing all 5 `mkbatch.py` scenes (`stairs-crouched`, `stairs-standing`, `stairs-down`, `stairs-walking`, `deck-edge`) at the exact `18:50` `CC-343b` cameras (`yaw = 65, pitch = 18, dist = 2.7, lookY = -0.50`) paired side-by-side against Part 1 (`18:50` `review/CC-343b/shots/a-*.png`), plus `mkbatch2.py`'s `deck-edge-crouched` (`lookY = -0.75`, facing `-x` off the floor deck edge), across all 4 distinct lighting conditions (`noon`, `overcast` w/ rain, `dusk`, `night`).
- `review/CC-343c/sheet-cc343c-before-after-4lights.jpg` (`2524x1435`), `review/CC-343c/sheet-cc343c-boots-zoom.jpg` (`1806x1252`), `review/CC-343c/cc343c-summary.json`, and 44 PNG captures in `review/CC-343c/shots/` (mirrored to `Claude outputs/CC-343c/`).
- Also ran `qa/2026-11-11-AG-311/retake-impact-shot.mjs` + `build-sheets.py` sequentially in the same slot grant to update `review/AG-311/sheet-gp20108-j128-and-impacts.jpg` (`closeup-ceiling-bullet-impacts.png`, `sha=33a37a3e6577`).

## Findings (Multimodally Verified on RTX 5080 WebGPU):
1. **`deck-edge` (Standing at Floor Deck Edge `x = fd.x - 0.95` — `sheet-cc343c-boots-zoom.jpg` Row 1 vs Row 2):**
   - **Part 1 (`18:50` BEFORE):** Marine dropped into a ~`0.25 m` awkward squat with the outer boot dropping toward the ground off the deck edge.
   - **Part 2 (`21:45Z` AFTER — Stepped `IN` & `FLAT`):** Marine stands **full-height and upright** (`feet.lift = 0.000`, `f0 = 0`, `f1 = 0`). The outer boot steps cleanly **IN onto the floor deck planks** (`ankleLWorld = [5.040, -2.670, 18.179]`, `ankleRWorld = [5.182, -2.670, 18.180]` over `player.y = -2.773`), both boots resting **flat** at the exact same `y = -2.670` height inside the bevelled edge with zero overhang, zero squat, and zero sole clipping across `noon`, `overcast`, `dusk`, and `night`.
2. **`deck-edge-crouched` (Crouched at `x = fd.x - 0.95` Facing `-x` Off Edge — `sheet-cc343c-boots-zoom.jpg` Row 3):**
   - **Stepped `OVER` & `FLAT`:** Rear right boot stays planted **in on the deck** (`ankleRWorld = [5.074, -2.618, 18.131]`), while the lead left boot steps **OVER the deck edge** (`x = 4.867`) and plants **FLAT on the lower ground** beside the deck fascia (`ankleLWorld = [4.867, -2.920, 17.872]`, `0.302 m` lower than right ankle) with natural crouch knee bend and zero clipping into the vertical deck apron across all 4 lights.
3. **Four Stair Scenes (`sheet-cc343c-before-after-4lights.jpg` Rows 1–4):**
   - **`stairs-crouched`:** Both boots **flat** on the upper tread (`ankleL y = -1.800`, `ankleR y = -1.774`, `lift = 0.168`), zero riser/tread clipping across all 4 lights.
   - **`stairs-standing`:** Upright stance (`ankleL/R y = -1.800`, `lift = 0.168`, `f0 = f1 = 0`), both boots **flat** on the tread across all 4 lights.
   - **`stairs-down`:** Split-tread stance (`ankleL/R y = -1.514`, `lift = -0.036`, `f0 = f1 = 0.286`), boots planted **flat** facing down-ramp across all 4 lights.
   - **`stairs-walking`:** Active uphill stride reads cleanly — trailing left boot (`y = -1.506, z = 12.231`) on the lower tread and lead right boot (`y = -1.474, z = 12.029`) stepping onto the upper tread (`lift = 0.139`, `f0 = f1 = 0.148`), zero penetration across all 4 lights.

## Tests:
- `node crew/crew.mjs slot run antigravity AG-312 --checks "AG-311 ceiling impact retake + CC-343c 6-scene x 4-light 5080 look" -- node qa/2026-11-11-CC-343c/run-slot-batch.mjs` -> PASS (`44` shots, `4/4` unique light SHAs per scene, `0` page errors, `0` GPU warnings).

## Not verified:
- Live player-controlled diagonal strafing along floor deck corners (covered by Claude 3's unit/IK tests; this task verified the 6 requested visual camera setups across 4 lights on RTX 5080 WebGPU).
