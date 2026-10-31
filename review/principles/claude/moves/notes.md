# Marine Moves Filmstrips Review Notes (AG-159 / CL-267)

**Generated:** 2026-10-29  
**Renderer:** ANGLE (NVIDIA GeForce RTX 5080, Direct3D11)  
**Output Directory:** `review/principles/claude/moves/`  
**Contact Sheet:** `review/principles/claude/moves/sheet.jpg` (2400 x 3248)  

---

## Overview

High-fidelity 6-frame filmstrips captured from both **Side View** (`-side.png`) and **Three-Quarter Front View** (`-three.png`) across 20 distinct Marine moves (18 inspector moves + shootdodge dive + match drowned drag), plus the composite contact sheet `sheet.jpg`.

Each individual strip is formatted as a 6-frame horizontal sequence at 2880 x 304 resolution (480px width per frame tile with labeled frame number, phase interval, and top header).

---

## Move Inventory & Visual Inspection Notes

### 1. Poses & Holds

| Move ID | Name | Category | Side Strip | Three-Quarter Strip | Visual Inspection Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `stand` | Standing Unarmed | Poses & holds | `stand-side.png` | `stand-three.png` | **Clean.** Both boots planted flat on floor ($y = 0$). Natural relaxed breathing sway, no limb clipping or floating items. |
| `stand-armed` | Standing Armed | Poses & holds | `stand-armed-side.png` | `stand-armed-three.png` | **Clean.** Right hand firmly seated on pistol grip, left hand supporting M4 forend. Stock rests solidly against shoulder pocket. |
| `smoke` | Bored Cigarette Idle | Poses & holds | `smoke-side.png` | `smoke-three.png` | **Clean.** Left hand raises cigarette pack from vest pouch; right hand draws cigarette to mouth. Balaclava mouth flexes during puff. No floating cigarette. |

---

### 2. Locomotion

| Move ID | Name | Category | Side Strip | Three-Quarter Strip | Visual Inspection Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `walk` | Walk Forward | Locomotion | `walk-side.png` | `walk-three.png` | **Minor foot roll clipping.** Stride cycle exhibits realistic heel strike, foot roll, and toe push-off (`marine-gait-feel.js`). Torso/pelvis counter-scissor is prominent. Note: sole penetrates floor by ~1.5 cm during mid-stance push-off as ankle pitches forward before toe release. |
| `walk-back` | Walk Backward | Locomotion | `walk-back-side.png` | `walk-back-three.png` | **Clean.** Reverse stride gait moves cleanly. Boots clear floor plane without hitching. |
| `strafe-left` | Strafe Left | Locomotion | `strafe-left-side.png` | `strafe-left-three.png` | **Clean.** Right leg crosses smoothly while left leg plants wide. Upper torso maintains forward weapon aim. |
| `run` | Sprint Run | Locomotion | `run-side.png` | `run-three.png` | **Clean.** High knee lift and athletic forward torso lean. Stride extension is solid; foot placement lands cleanly without excessive penetration. |
| `crouch` | Crouch Hold | Locomotion | `crouch-side.png` | `crouch-three.png` | **Clean.** Smooth transition into squat. Knee angle flexes to ~90°, thighs lower without ground intersection; boots remain flat. |
| `crouch-walk` | Crouch Walk | Locomotion | `crouch-walk-side.png` | `crouch-walk-three.png` | **Clean.** Low-silhouette tactical stride. Torso pitched forward, weapon held tucked close. Leg stride reaches cleanly. |
| `turn-left` | Turn in Place Left | Locomotion | `turn-left-side.png` | `turn-left-three.png` | **Clean.** 90° step-turn. Planted right boot anchors while left boot lifts and pivots; hip yaw leads the rotation. |
| `jump` | Standing Jump | Locomotion | `jump-side.png` | `jump-three.png` | **Clean.** Pre-jump crouch load, vertical liftoff, airborne knee tuck, and impact absorption. Both boots touch down level on landing. |
| `jump-run` | Running Jump | Locomotion | `jump-run-side.png` | `jump-run-three.png` | **Clean.** Full sprint approach into single-leg leap. Trailing leg trails naturally in flight; forward foot reaches for landing contact. |

---

### 3. Combat, Traversal & Reloads

| Move ID | Name | Category | Side Strip | Three-Quarter Strip | Visual Inspection Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `vault` | Sandbag Wall Vault | Combat | `vault-side.png` | `vault-three.png` | **Clean hand brace.** Left hand braces firmly on sandbag obstacle edge (`sampleVault()`). Pelvis lifts cleanly over sandbag height (~0.7m); legs scissor sideways across barrier. |
| `draw` | Draw and Holster | Combat | `draw-side.png` | `draw-three.png` | **Clean.** Weapon drops smoothly to tactical sling chest rest; secondary weapon is drawn and brought to ready high-retention stance. Sling stays mapped. |
| `medpen` | Med Pen Heal | Combat | `medpen-side.png` | `medpen-three.png` | **Clean.** Marine reaches to belt pouch, pulls auto-injector, jabs outer thigh, depresses plunger, discards spent pen, and re-grips long gun. Hand index on injector body is precise. |
| `knockout` | Infirmary Cot Recovery | Crew-served | `knockout-side.png` | `knockout-three.png` | **Clean bed exit.** Sequence follows `sampleBedExit()`: flat on cot mattress, sit-up, 90° swivel over cot frame, boot plant onto floor, and stand to attention. Mattress contact is clean. |
| `reload-m4` | M4 Rifle Reload | Reloads | `reload-m4-side.png` | `reload-m4-three.png` | **Clean.** Mag release drops empty 30-rd STANAG mag; support hand indexes fresh magazine from chest rig, feeds into magwell, and slaps left-side bolt release. Hand aligns cleanly with receiver. |
| `reload-pistol` | Pistol Reload | Reloads | `reload-pistol-side.png` | `reload-pistol-three.png` | **Clean.** Empty magazine drops from pistol grip; fresh box mag fed into grip base; slide released into battery. Thumb placement on slide stop is aligned. |

---

### 4. Match / Special Mechanics

| Move ID | Name | Category | Side Strip | Three-Quarter Strip | Visual Inspection Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dive` | Shootdodge Dive | Combat & Traversal | `dive-side.png` | `dive-three.png` | **Clean horizontal flight.** Modeled via `applyDivePose(marine, u)`. Launch phase extends body forward; airborne phase maintains parallel floor orientation with weapon aimed forward; descent leads into chest slide. Note: In late slide ($u = 0.8\text{--}1.0$), pelvis settles at $y \approx 0.18\text{--}0.20$m above deck with legs extended behind. |
| `drowned-drag` | Drowned Drag Knockdown & Recovery | Damage & Reactions | `drowned-drag-side.png` | `drowned-drag-three.png` | **Noticeable pelvis hover during drag.** Live match captures (side view from RTX 5080 match run; three-quarter view from ChatGPT GP-19970 live wave). Zombie claws grab and pull marine backward off balance. Note: As Jerry observed, during the active backward drag ($t \approx 0.5\text{--}1.5$s), the marine's pelvis hovers approximately 18 cm above the terrain/mud plane while clawing forward before executing the scramble recovery to stand back up. |

---

## Summary of Potential Defects / Polish Opportunities for Claude's Pass

1. **Walk Stride Push-Off Foot Roll:**
   - At phase ~0.45-0.55 of the walk cycle, the heel rises aggressively while the toe is still on the ground, causing the toe box to dip ~1.5 cm into the ground plane before lifting into swing. A minor toe clamp or floor collision threshold would eliminate the slight penetration.
2. **Drowned Drag Pelvis Ground Clearance:**
   - The marine's root height during `drownedPull` sits at $\sim 0.18$m ($18$cm) off the ground surface rather than scraping along the mud/ground. Dropping the ragdoll/body root closer to the terrain during the drag phase would heighten the visceral feel of being dragged through the dirt.
3. **Shootdodge Prone Rest Clearance:**
   - In prone shooting stance ($u = 1.0$), chest and vest clear the ground cleanly, but thigh pads hover slightly ($\sim 5$cm) above floor plane.
