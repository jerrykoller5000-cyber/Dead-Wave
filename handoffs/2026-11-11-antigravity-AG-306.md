# AG-306 — GPU Look: CE-4 Parts 1 & 2 (`1P` Grenade Throw & Combat Knife Slash at Eye, 4 Lights)

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Requesters:** `Claude 5` (*"shots: CE-4 part 1, the grenade throw at the eye, four lights"* & *"shots: CE-4 part 2, the knife's slash at the eye, four lights (with part 1)"*) and `CLAUDE DIRECTOR`

## Changed:
- `qa/2026-11-11-CE-4-grenade/ce4-look.mjs`: Offscreen RTX 5080 WebGPU 4-light 1P verification harness (`--window-position=-3800,-3800`, `--jobs 1` in shared game-test slot) capturing Part 1 (`1P` grenade throw with `pistol`) and Part 2 (`1P` combat knife slash with `pistol`, `macheteOwned: false`, `katanaOwned: false`) across `noon`, `overcast`, `dusk`, and `night`, with live `#hudTopLeft` (`GRAVE SHIFT` panel) and `#minimap` compositing + 1P left-glove NDC tracking.
- `qa/2026-11-11-CE-4-grenade/build-ce4-sheet.py`: Contact sheet builder producing `review/CE-4/gpu/CE-4-grenade-4lights-5080.jpg` (`2490x874`) and `review/CE-4/gpu/CE-4-knife-4lights-5080.jpg` (`2620x830`).
- `review/CE-4/gpu/CE-4-grenade-4lights-5080.jpg`, `review/CE-4/gpu/CE-4-knife-4lights-5080.jpg`, `review/CE-4/gpu/ce4-summary.json`, and 68 individual JPEGs in `review/CE-4/gpu/shots/`.

## Findings (Multimodally Verified Against `Claude outputs/CE-4/CE-4-grenade-before-after.jpg` & `CE-4-knife-before-after.jpg`):
1. **CE-4 Part 1 — 1P Grenade Throw (`review/CE-4/gpu/CE-4-grenade-4lights-5080.jpg`):**
   - **Cocked fist & grenade clearance right of `#hudTopLeft`:** At `03-cocked` (`~0.40 s` hold), `#hudTopLeft` ends at `rightNdc = -0.588` (`right = 264 px`) while the 1P left glove & olive frag grenade sit completely clear to the right at `gloveNdc = [-0.283, 0.002]` (`+0.305` NDC units right of the HUD panel) with fingers naturally curled around the grenade body and spoon visible across `noon`, `overcast`, `dusk`, and `night`.
   - **Eased fingers, open release, and smooth return to pistol grip:** Across `01-grab` (`t=0.12s`), `02-raise` (`t=0.06s`), `03-cocked`, `04-whip` (`throw:0.02`), `05-release` (`throw:0.08`, grenade leaves hand), `06-follow` (`throw:0.15`, loose open hand follow-through), `07-back-start` (`back:0.00`), and `08-back-grip` (`back:0.13`), there is zero flat-hand flip at `grab` and zero snap onto the pistol support grip.
2. **CE-4 Part 2 — 1P Combat Knife Slash (`review/CE-4/gpu/CE-4-knife-4lights-5080.jpg`):**
   - Verified in a fresh match without `grantAllWeapons` (`macheteOwned === false`, `katanaOwned === false`, `currentWeapon === 'pistol'`).
   - Sampled every 2 frames at `60/s` (`f00`, `f02`, `f04`, `f06`, `f08`, `f10`, `f12`, `f14` + `f20` pistol rest):
     - **`f02` (`t=0.17s`):** Clean wind-up of the combat knife at the right edge of the eye.
     - **`f04` -> `f06` (`t=0.14s` -> `0.10s`):** Diagonal slash across center screen **edge-first** (cutting bevel leading cleanly toward upper-left, gloved fist wrapped cleanly around ribbed handle, camo sleeve cuff aligned cleanly with wrist).
     - **`f08` -> `f10` (`t=0.07s` -> `0.04s`):** Follow-through stays clearly in sight on the left before dropping out of frame.
     - **`f12` -> `f14` -> `f20`:** Smooth transition back to the two-handed pistol hold across all 4 lights (`noon`, `overcast`, `dusk`, `night`).

## Tests:
- `node crew/crew.mjs slot run antigravity AG-306 --checks "CE-4 parts 1 & 2: 1P grenade throw and combat knife slash in 4 lights" -- node qa/2026-11-11-CE-4-grenade/ce4-look.mjs` -> PASS (`68` live WebGPU captures across 4 lights, distinct hashes per beat, `gloveNdc` right-of-HUD assertion PASS, `pageErrors: 0`).
- `python qa/2026-11-11-CE-4-grenade/build-ce4-sheet.py` -> PASS (`CE-4-grenade-4lights-5080.jpg` & `CE-4-knife-4lights-5080.jpg`, both multimodally inspected).

## Not verified:
- Unarmed / ladder / mortar / building-E 1P hands (still open in `Claude 5`'s continuation of `CE-4`).
