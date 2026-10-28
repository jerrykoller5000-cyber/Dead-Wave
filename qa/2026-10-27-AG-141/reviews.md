# Antigravity — GP-19970 & GP-19977 Visual Reviews — 2026-10-27

## 1. GP-19970 Brute Chest Plate & Harness Visual Score (`docs/asset-principles.md`)

**Inspected Shots**:
- Gameplay scale: `handoffs/GP-19970/brute-structure-after/static/noon/gameplay-distance.png`
- Inspector close scale (4 lighting rigs): `handoffs/GP-19970/brute-structure-after/static/{noon,overcast,dusk,night}/{front,side}.png`
- Baseline comparison: `handoffs/GP-19970/live/zombie-motion/zombie.brute-walk-f0-front.jpg`, `handoffs/GP-19970/live/zombie-motion/zombie.brute-walk-f20-side.jpg`

### Findings
- **Flat Black Slab Resolved**: In the baseline `zombie.brute-walk-f0-front.jpg`, a flat unlit-looking black rectangle (`0x0a0c0e`) floated proud of the brute's upper chest. In all four lighting rigs (`noon`, `overcast`, `dusk`, `night`) and at `gameplay-distance.png`, the flat black slab is completely gone; the chest plate reads as contoured charcoal steel (`0x252a2e`) with rust/wear patches and horizontal structural banding.
- **Torso-Flush Fit**: In baseline `zombie.brute-walk-f20-side.jpg`, the chest plate and rear harness straps stood several centimetres off the ribcage and upper back with a visible daylight gap. In `static/noon/side.png` (and overcast/dusk/night side views), both the front plate and the leather shoulder/back straps sit flush against the ribcage and upper back with zero floating gap.
- **Remaining Notes**:
  - Under `night` lighting (`static/night/front.png`), the charcoal steel chest plate and dark torso silhouette drop very dark together (expected unlit night value), while `noon`, `overcast`, `dusk`, and `gameplay-distance.png` separate the plate, rust patches, and leather straps clearly.
  - At close Inspector scale (`front.png`), there is a thin dark shadow crease along the bottom-centre edge of the chest plate just above the belly strap, and in `side.png` the out-of-scope pale-tan outer-bicep patch and lower shin-guard standoff remain visible (tracked separately).

### Scoped Score Table (`docs/asset-principles.md` §6 — Brute Chest & Harness)

| Category | Before (`GP-19970` baseline) | After (Gameplay Distance) | After (Inspector Close 4-Light) | Notes |
| --- | :---: | :---: | :---: | --- |
| **Construction** (chest & harness) | 2 / 5 | **5 / 5** | **4 / 5** | Zero floating gap in `side.png`; front plate and back harness sit flush against the torso contour. |
| **Materials** (chest & harness) | 2 / 5 | **4 / 5** | **4 / 5** | Flat black slab (`0x0a0c0e`) replaced by weathered charcoal steel (`0x252a2e`) with rust wear and brown leather straps that hold across `noon`, `overcast`, `dusk`, and `gameplay-distance.png`. |

**Verdict**: **PASS** (`>= 4/5` in both scoped categories at gameplay and close Inspector scales).

---

## 2. GP-19977 Shambler Close-Contact Polish Rescore (`docs/animation-principles.md`)

**Inspected Shots & Proof**:
- After (6-frame close sequence): `handoffs/GP-19977/close/recovery-{012,038,058,086,116,122}.png`
- Before (baseline close sequence): `handoffs/GP-19977/close-before/recovery-{012,038,058,086,116,122}.png`
- Metrics: `handoffs/GP-19977/close/proof.json` (`turnStep > 0` during pivot frames `12..58`, `nearContactGuard` active up to `0.625` inside the `0.88 m` contact ring at frames `116` and `122`).

### Findings
- **Pivot Foot Phase (`recovery-038.png`, `recovery-058.png`, `recovery-086.png`)**: During the `pace = 0` yaw recovery (`038` → `058`) and initial step-out (`086`), the Shambler's boots no longer skate frozen side-by-side (`stride = 0`). Frame `058` shows the right boot lifting while the left boot plants, and frames `086` and `116` show clear alternating fore-aft stride separation.
- **Near-Contact Arm Guard (`recovery-116.png`, `recovery-122.png` at `gap = 0.88 m`)**: Inside the `0.88 m` contact ring (`116`) and during the marine's sidestep (`122`), the right arm chambers back and only the left hand reaches toward the marine's upper pack. The dual-arm helmet/shoulder clipping seen in `close-before/recovery-116.png` is resolved; in `122`, the left fingertips lightly graze the top-left corner of the backpack frame without penetrating the marine's head or torso.

### Updated Score Table (`docs/animation-principles.md` §6 — Close Scale)

| Category | Close Before | Close After (`GP-19977`) | Gameplay Scale | Notes |
| --- | :---: | :---: | :---: | --- |
| **Pose** | 4 / 5 | **4 / 5** | **4 / 5** | Asymmetric single-arm reach at contact reads clearly instead of symmetric zombie-arm lock. |
| **Timing** | 4 / 5 | **4 / 5** | **4 / 5** | Heavy wind-up, lunge, overshoot recovery (`012..058`), and pursuit resumption read cleanly. |
| **Weight** | 4 / 5 | **4 / 5** | **4 / 5** | Stepping pivot (`turnStep`) grounds the recovery turn. |
| **Secondary** | 4 / 5 | **4 / 5** | **4 / 5** | Head/torso follow-through and chambered right arm counter-balance the left-hand reach. |
| **Continuity** | 3.5 / 5 | **4 / 5** | **4 / 5** | Smooth transition from stepping pivot (`038..058`) into forward pursuit (`086..116`). |
| **Blend** | 4 / 5 | **4 / 5** | **4 / 5** | Clean entry/exit between attack recovery, pivot step, and near-contact guard. |
| **Contact** | 3 / 5 | **4 / 5** | **4 / 5** | Pivot boot skate eliminated; dual-arm helmet/shoulder penetration at `0.88 m` replaced by chambered guard + light pack-edge graze at `122`. |
| **Structure** | 4 / 5 | **4 / 5** | **4 / 5** | Shoulder/elbow/hip joints hold volume through pivot and close guard. |

**Verdict**: **PASS** (`4/5` across all 8 categories at both gameplay and close camera scales).

---

## 3. GP-19970 Spitter & Bomber Belly Construction Score (`docs/asset-principles.md`)

**Inspected Shots**:
- After: `handoffs/GP-19970/spitter-bomber-after/{spitter,bomber}-{noon,overcast,dusk,night}-{front,side}.png`, `{spitter,bomber}-gameplay-distance.png`
- Before: `handoffs/GP-19970/live/zombie-motion/zombie.{spitter,bomber}-walk-f{0,20}-{front,side}.jpg`

### A. Spitter Belly & Vest
- **Improvements**: The floating rear slab (`zombie.spitter-walk-f20-side.jpg`) and boxy front vest blocks (`f0-front.jpg`) are replaced by torso-hugging dark vest straps and a curved dorsal ridge (`spitter-noon-side.png`), and the chest pustules now sit on the belly surface instead of floating out in air.
- **Remaining Float / Intersection Defects**:
  1. In `spitter-noon-side.png`, the glowing yellow acid-drip ribbons drop straight down from the jaw/throat across the neck hollow, standing ~2–4 cm proud of the upper chest contour before meeting the belly apex.
  2. In `spitter-noon-front.png` and `spitter-gameplay-distance.png`, a bright white specular/uncolored triangle facet appears on the lower-right (character's left) curve of the belly above the waistband.
  3. Out of belly scope (tracked under `refineZombieFace`): the detached facial plate and floating black hair zigzag remain visible in `spitter-noon-side.png`.

| Scale | Construction | Topology | Integration | Notes |
| --- | :---: | :---: | :---: | --- |
| **Gameplay Distance** (`spitter-gameplay-distance.png`) | **4 / 5** | **4 / 5** | **4 / 5** | Reads cleanly at gameplay scale; small white highlight facet on lower-right belly. |
| **Inspector Close** (`spitter-*-{front,side}.png`) | **4 / 5** | **4 / 5** | **3.5 / 5** | Rear/side vest float resolved; upper throat-to-chest acid ribbon bridges across the neck hollow in `side.png` and a bright white facet shows on the lower-right belly in `front.png`. |

### B. Bomber Belly & Harness
- **Improvements**: The sharp equatorial crease of the old low-segment belly sphere (`zombie.bomber-walk-f0-front.jpg`) is smoothed out into a rounder dome (`bomber-noon-front.png`), and the boils/fissures sit closer to the belly surface.
- **Remaining Float / Intersection Defects**:
  1. **Floating Front Harness Straps in Profile (`bomber-noon-side.png`)**: The two brown front harness straps still span as 3-segment straight chords that stand **~3–5 cm proud of the upper and lower belly curve** with a clear daylight air gap between the strap and the green belly in `bomber-noon-side.png`.
  2. **Side Patch & White Facet**: In `bomber-noon-side.png`, a flat pale-grey rectangular slab sits on the left flank below the shoulder; in `bomber-noon-front.png` and `bomber-gameplay-distance.png`, a bright white specular/uncolored patch appears on the lower-right underside of the belly.
  3. Out of belly scope: the detached facial plate in front of the head remains visible in `bomber-noon-side.png`.

| Scale | Construction | Topology | Integration | Notes |
| --- | :---: | :---: | :---: | --- |
| **Gameplay Distance** (`bomber-gameplay-distance.png`) | **4 / 5** | **4 / 5** | **4 / 5** | Smoother belly silhouette reads well at distance; bright white patch on lower-right underside. |
| **Inspector Close** (`bomber-*-{front,side}.png`) | **3.5 / 5** | **4 / 5** | **3.5 / 5** | Front brown harness straps still float ~3–5 cm off the upper/lower belly curve with an air gap in `bomber-noon-side.png`; flat grey flank rectangle in `side.png` and bright white lower-right belly patch in `front.png`. |

