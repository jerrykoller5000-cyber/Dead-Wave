# AG-142 — GP-19970 Visual Construction & Integration Scores (Colossus Rear Carrier, Spitter/Bomber Close2 Rescore, Military Backpack & Chest Rig, Drowned Kelp & Washboard)

**Date:** 2026-10-27  
**Agent:** Antigravity  
**Task:** `AG-142`  
**Standards:** `docs/asset-principles.md`, `docs/art-direction.md`

---

## 1. Colossus Rear Carrier Construction Score (`GP-19970`)

### Inspected Shots
- **Before:** `handoffs/GP-19970/live/zombie-motion/zombie.colossus-walk-f20-side.jpg`
- **After:**
  - `handoffs/GP-19970/colossus-carrier-after/noon-side.png`
  - `handoffs/GP-19970/colossus-carrier-after/noon-back.png`
  - `handoffs/GP-19970/colossus-carrier-after/colossus-walk-side.png`
  - `handoffs/GP-19970/colossus-carrier-after/colossus-walk-back.png`
  - `handoffs/GP-19970/colossus-carrier-after/gameplay-distance.png`

### Findings
- **Before:** In `zombie.colossus-walk-f20-side.jpg`, the rear boulder rack and its three stone masses floated ~12 cm behind the upper/lower back with a wide triangular air gap and long horizontal top strap bridging across empty space.
- **After:** Insetting the rear carrier rack, all three boulders, and the rear horizontal/vertical straps by `0.12` local units seats the lower and mid boulders directly into the upper/mid back mass in both idle (`noon-side.png`, `noon-back.png`) and walk (`colossus-walk-side.png`, `colossus-walk-back.png`) poses.
- Only a tiny (~1–2 cm) natural anatomical V-notch remains at the top neck-to-upper-boulder tangent where the upper cervical spine curves forward toward the head.
- *Out-of-scope note:* As noted in the request, the oversized right shoulder shield and pale arm/thigh plates remain separate defects outside this rear-carrier slice.

### Scoped Score Table (Colossus Rear Carrier Only)

| View Scale | Construction | Integration | Status |
| :--- | :---: | :---: | :---: |
| **Gameplay Distance** (`gameplay-distance.png`) | **5 / 5** | **5 / 5** | **PASS** |
| **Inspector Close** (`noon-side.png`, `colossus-walk-side.png`, `colossus-walk-back.png`) | **4 / 5** | **4 / 5** | **PASS** |

---

## 2. Spitter & Bomber Close Defect Rescore (`GP-19970`)

### Inspected Shots
- **Before (previous pass):** `handoffs/GP-19970/spitter-bomber-after/{spitter,bomber}-noon-{front,side}.png`
- **After (`close2` pass):**
  - `handoffs/GP-19970/spitter-close2-after/{noon-front,noon-side,gameplay-distance}.png`
  - `handoffs/GP-19970/bomber-close2-after/{noon-front,noon-side,gameplay-distance}.png`

### Findings — Spitter (`spitter-close2-after/`)
1. **Chin-to-Chest Acid Drips (`noon-side.png`):** Shortening and recessing the head-local chin drips toward the jaw/throat completely eliminated the vertical yellow bridge across the throat hollow seen in `spitter-bomber-after/spitter-noon-side.png`. The upper drips now tuck cleanly beneath the lower jaw and follow the upper chest contour.
2. **Belly Specular Highlight (`noon-front.png`, `gameplay-distance.png`):** The small bright spot on the lower-right belly dome is a normal PBR directional-light specular highlight on the glossy distended belly surface (consistent across angle changes), not an untextured or broken polygon, and does not hold `Integration` below `4/5`.

### Findings — Bomber (`bomber-close2-after/`)
1. **Side Harness Straps (`noon-side.png`):** Pulling the brown harness strap centerlines 2 cm deeper with denser control points closed the upper-belly air gap seen in `spitter-bomber-after/bomber-noon-side.png`. The straps now hug the upper and mid belly dome cleanly, with only a negligible (~1 cm) proudness at the lowest under-belly kink.
2. **Remaining Close Items (`noon-side.png`, `noon-front.png`):**
   - The pale-grey wedge under the upper arm in `noon-side.png` is the exposed side ribcage/lat torso mesh where the dark rotten upper arm meets the side body, not a floating harness slab.
   - As on the Spitter, the small white spot on the lower-right belly in `noon-front.png` is a standard directional specular highlight on the glossy belly material.

### Score Table (Spitter & Bomber Close2 Rescore)

| Zombie & Scale | Construction | Topology | Integration | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Spitter — Gameplay Distance** (`gameplay-distance.png`) | **4 / 5** | **4 / 5** | **4 / 5** | **PASS** |
| **Spitter — Inspector Close** (`noon-front.png`, `noon-side.png`) | **4 / 5** *(up from 3.5)* | **4 / 5** | **4 / 5** *(up from 3.5)* | **PASS** |
| **Bomber — Gameplay Distance** (`gameplay-distance.png`) | **4 / 5** | **4 / 5** | **4 / 5** | **PASS** |
| **Bomber — Inspector Close** (`noon-front.png`, `noon-side.png`) | **4 / 5** *(up from 3.5)* | **4 / 5** | **4 / 5** *(up from 3.5)* | **PASS** |

---

## 3. Military Backpack Scoped Construction Score (`GP-19970`)

### Inspected Shots
- **Before:** `handoffs/GP-19970/live/zombie-motion/zombie.military-walk-f20-side.jpg`
- **After:**
  - `handoffs/GP-19970/military-backpack-after/noon-side.png`
  - `handoffs/GP-19970/military-backpack-after/noon-back.png`
  - `handoffs/GP-19970/military-backpack-after/walk-side.png`
  - `handoffs/GP-19970/military-backpack-after/gameplay-distance.png`

### Findings
- **Before:** In `zombie.military-walk-f20-side.jpg`, the field backpack sat behind the hunched upper back with a visible daylight slit between the pack backplate and the dorsal spine.
- **After:** Moving the backpack, radio box, antenna base, rear scuffs, and worn rear carrier 6 cm into the upper back (`military-backpack-after/noon-side.png`, `walk-side.png`, `noon-back.png`) seats the pack completely flush against the shoulder blades and upper back in both idle and forward-hunched walk frames, with zero daylight gap.

### Scoped Score Table (Military Backpack Only)

| View Scale | Construction | Integration | Status |
| :--- | :---: | :---: | :---: |
| **Gameplay Distance** (`gameplay-distance.png`) | **5 / 5** | **5 / 5** | **PASS** |
| **Inspector Close** (`noon-side.png`, `noon-back.png`, `walk-side.png`) | **4.5 / 5** | **4.5 / 5** | **PASS** |

---

## 4. Drowned Kelp & Washboard Scoped Construction Score (`GP-19970`)

### Inspected Shots
- **Before:** `handoffs/GP-19970/live/zombie-motion/zombie.drowned-walk-f20-side.jpg`
- **After:**
  - `handoffs/GP-19970/drowned-fit-after/noon-side.png`
  - `handoffs/GP-19970/drowned-fit-after/noon-front.png`
  - `handoffs/GP-19970/drowned-fit-after/noon-back.png`
  - `handoffs/GP-19970/drowned-fit-after/walk-side.png`
  - `handoffs/GP-19970/drowned-fit-after/gameplay-distance.png`

### Findings
- **Front Chest Washboard & Leather Rails (`noon-side.png`, `noon-front.png`, `walk-side.png`):** Lowering and insetting the front washboard and leather side rails onto the chest surface eliminated the thick standoff blocks and chin clash seen in `zombie.drowned-walk-f20-side.jpg`. The washboard now sits flush against the sternum in both idle and walk poses (`4/5`).
- **Dorsal Kelp Strands (`noon-side.png`, `noon-back.png`, `walk-side.png`):** Compared to the wide detached cage in `zombie.drowned-walk-f20-side.jpg`, the kelp roots now anchor into the upper shoulder blades and the lower tips meet the waist/lower back. In strict side profile (`noon-side.png`, `walk-side.png`), the mid-span arches of the outer kelp ribbons still bow ~2–3 cm proud of the mid-back curve with a narrow sliver of daylight, though the roots and tips are seated and the overall fit meets the `4/5` bar (optional follow-up if desired: pull the mid-back kelp control points ~2 cm further inward).

### Scoped Score Table (Drowned Kelp & Washboard Only)

| Component & Scale | Construction | Integration | Status |
| :--- | :---: | :---: | :---: |
| **Gameplay Distance** (`gameplay-distance.png`) | **4 / 5** | **4 / 5** | **PASS** |
| **Inspector Close — Chest Washboard & Rails** (`noon-side.png`, `noon-front.png`, `walk-side.png`) | **4 / 5** | **4 / 5** | **PASS** |
| **Inspector Close — Dorsal Kelp Strands** (`noon-side.png`, `noon-back.png`, `walk-side.png`) | **4 / 5** | **4 / 5** | **PASS** *(minor ~2–3 cm mid-arch bow in strict side view)* |

---

## 5. Military Chest Rig Scoped Construction Score (`GP-19970`)

### Inspected Shots
- **Before:** `handoffs/GP-19970/military-backpack-after/{noon-side,walk-side}.png`
- **After:**
  - `handoffs/GP-19970/military-chest-after/noon-front.png`
  - `handoffs/GP-19970/military-chest-after/noon-side.png`
  - `handoffs/GP-19970/military-chest-after/walk-side.png`
  - `handoffs/GP-19970/military-chest-after/gameplay-distance.png`

### Findings
- **Before:** In `military-backpack-after/walk-side.png` and `noon-side.png`, the front chest rig, 4 magazine pouches, and brown vertical shoulder straps projected ~4–6 cm forward of the ribcage and clavicles like a rigid floating tray.
- **After:** Seating the 4 magazine pouches and leather side rails onto the vest ellipsoid and insetting the front carrier and shoulder webbing (`military-chest-after/noon-side.png`, `walk-side.png`, `noon-front.png`) pulls the entire chest rig and pouch row snug against the sternum and pectoral contour in both idle and hunched walk poses, with clean pouch separation and zero chest air gap.
- *Out-of-scope note:* Knee/wrist pads and face remain separate slices as noted in the request.

### Scoped Score Table (Military Chest Rig Only)

| View Scale | Construction | Integration | Status |
| :--- | :---: | :---: | :---: |
| **Gameplay Distance** (`gameplay-distance.png`) | **5 / 5** | **5 / 5** | **PASS** |
| **Inspector Close** (`noon-front.png`, `noon-side.png`, `walk-side.png`) | **4.5 / 5** | **4.5 / 5** | **PASS** |
