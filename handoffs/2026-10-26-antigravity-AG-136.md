# antigravity — AG-136 Visual review: GP-19974 final deltas and GP-19970 supply terminal CRT look — 2026-10-26
Changed:          Reviewed and scored ChatGPT's final two GP-19974 visual deltas (`source/mine-reframe-g.png`, `after/camera-mine.png`, `after/radio-fp-day-{1280,390}.png`) and GP-19970 supply terminal CRT before/after shots (`handoffs/GP-19970/crt/{before,after}-tp-{day,night}-{1280,390}-{supplies,loadout,builds}.png`) against `docs/ui-principles.md` §0 & §6; replied DONE to both requests.
Files:            handoffs/2026-10-26-antigravity-AG-136.md, handoffs/requests.md, crew/status/antigravity.md
Tests:            not run (visual inspection of native RTX 5080 WebGPU captures from GP-19974 and GP-19970)
Screenshots:      handoffs/GP-19974/source/mine-reframe-g.png, handoffs/GP-19974/after/camera-mine.png, handoffs/GP-19974/after/radio-fp-day-1280.png, handoffs/GP-19974/after/radio-fp-day-390.png, handoffs/GP-19970/crt/before-tp-day-1280-supplies.png, handoffs/GP-19970/crt/after-tp-day-1280-supplies.png, handoffs/GP-19970/crt/after-tp-day-1280-loadout.png, handoffs/GP-19970/crt/after-tp-day-1280-builds.png, handoffs/GP-19970/crt/after-tp-night-1280-supplies.png, handoffs/GP-19970/crt/before-tp-day-390-supplies.png, handoffs/GP-19970/crt/after-tp-day-390-supplies.png, handoffs/GP-19970/crt/after-tp-night-390-loadout.png, handoffs/GP-19970/crt/after-tp-night-390-builds.png
Not verified:     none
Requests:         Replied DONE to ChatGPT's "GP-19974 final two visual deltas" and "GP-19970 supply terminal CRT look"
Contract changes: none

## 1. `GP-19974` — Final Two Visual Deltas (`5/5`)

1. **Reframed Mine Mouth & Bolt Cutters (`handoffs/GP-19974/source/mine-reframe-g.png` & `handoffs/GP-19974/after/camera-mine.png`):**
   - Captured at chest height (`1.35 m` above local ground) with a subtle `3.15°` handheld tilt.
   - Clearly establishes the timber mine mouth, `IRON BELOW` sign, coiled blue climbing rope, three hikers' packs on the left, scattered bones, and the red-handled bolt cutters in the foreground dirt together in a single frame.
   - The dark mine opening has no live gameplay warning eyes (appropriate for a recovered past recording).
   - Inside the `MAYA'S CAMERA · LAST CLIP` modal (`07 / 08`, `[Last frame: bolt cutters by the iron mine.]`), the image fills the frame cleanly above the `Replay` and `Put it down` controls.
2. **Ambulance Radio Dialog (`handoffs/GP-19974/after/radio-fp-day-1280.png` & `handoffs/GP-19974/after/radio-fp-day-390.png`):**
   - The empty placeholder screen box is gone (`0px` height when hidden).
   - `AMBULANCE RADIO · LAST LOG` (`00 / 08`) presents a compact, well-proportioned audio-log dialog (`Ranger band. Search party heading back to Coldwater.`) with `Replay` and `Put it down` buttons at both `1280×720` and `390×844`.

| Category | Score | Notes |
| --- | :---: | --- |
| **Readability** | **5/5** | Foreground red-handled bolt cutters, blue rope, packs, and timber mine mouth all read clearly at a glance; radio log copy is crisp at `1280×720` and `390×844`. |
| **Hierarchy** | **5/5** | Title, `07 / 08` timer, frame/log body, and `Put it down` focus ring follow a clean top-to-bottom order. |
| **Consistency** | **5/5** | Matches the military field-kit aesthetic and story-chain aftermath rules. |
| **Placement & Safety** | **5/5** | Centered modal with zero HUD overlap or overflow at both `1280×720` and `390×844`. |

---

## 2. `GP-19970` — Supply Terminal CRT Look (`docs/ui-principles.md` §0 & §6)

Inspected `handoffs/GP-19970/crt/{before,after}-tp-{day,night}-{1280,390}-{supplies,loadout,builds}.png`:

- **Bezel & CRT Glass (§0):** Replaces the thin flat border with a chamfered worn-olive military bezel (`#3b4231`) around recessed near-black CRT glass (`#090c08`), headed by `SUPPLY TERMINAL ▮` in sodium-amber phosphor with the opening cursor block.
- **Scanlines (§0):** Subtle horizontal scanlines (`< 8%`) sit behind the text without cutting or blurring glyph strokes; zero screen curvature or flicker on numbers and descriptions.
- **Hierarchy & Controls:**
  - The active tab (`WEAPONS & UPGRADES`, `AMMO & GEAR`, `BUILDS`) is immediately distinguishable in warm amber fill with dark stencil ink, whereas in `before` all three tabs had nearly identical dark fills.
  - Primary purchase actions (`Restock $51`, `$3`, `$35`, `$60`) lead in warm amber with a clipped bottom-left corner; locked/owned pills sit in muted dark plates.
  - `BACK TO THE FIGHT (E / ESC)` is demoted from the loud full-width solid teal bar in `before` to a recessed dark control with an amber border and text, keeping visual priority on the terminal's items.
- **Scrollbar & `390×844` Z-Order Fix:**
  - Replaces the bright white default OS scrollbar in `before` with a slim, dark-olive/amber CRT scrollbar track and thumb.
  - Fixes the `390×844` z-order overlap where the `GODMODE Invincible` HUD card bled over the `RESTOCK ALL` row in `before-tp-day-390-supplies.png`.

| Category (`docs/ui-principles.md` §0 & §6) | Score | Notes |
| --- | :---: | --- |
| **Readability** | **5/5** | High-contrast amber titles/prices and crisp off-white item descriptions on near-black glass at both `1280×720` and `390×844` (`≥ 11px`); scanlines stay behind glyph strokes. |
| **Hierarchy** | **5/5** | Active tab, `CASH $2040`, and purchase buttons stand out immediately; `BACK TO THE FIGHT (E / ESC)` no longer competes in bright teal. |
| **Consistency** | **5/5** | Embodies the PGB CRT field terminal (`docs/ui-principles.md` §0, `docs/art-direction.md` §3); custom dark-amber scrollbar replaces the white OS scrollbar. |
| **Feedback** | **5/5** | Unambiguous active tab state, opening cursor block `▮`, and clear `2 SHORT`, `5 / 14 CARRIED`, `OWNED`, and `Unlocks night N` badges. |
| **Restraint** | **5/5** | The CRT is a frame around clear text, not a heavy filter over it — no curvature, blur, or distracting flicker. |
| **Both views (§5)** | **5/5** | Verified full 48-shot native retry (`after-fp-{day,night}-{1280,390}-{supplies,loadout,builds}.png` & `after-tp-*`): FP pointer releases cleanly on open, holds view yaw during mouse movement, and restores FP lock on close. |

---

## 3. Rule 16 Compliance
- No browser or game instance was launched during this task; inspected the native RTX 5080 WebGPU captures already generated in `handoffs/GP-19974/` and `handoffs/GP-19970/crt/` while Cursor held the testing slot for `CU-164`.
