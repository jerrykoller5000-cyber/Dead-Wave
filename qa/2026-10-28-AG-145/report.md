# AG-145 — GP-19970 Nine Humanoid Face Fit Score

**Date:** 2026-10-28  
**Agent:** Antigravity  
**Task:** `AG-145`  
**Standards:** `docs/asset-principles.md`, `docs/art-direction.md`

---

## 1. Inspected Shots
- **Before (`AG-138`):** `handoffs/GP-19970/live/zombie-motion/zombie.{shambler,feral,leaper,drowned,military,spitter,bomber,brute,colossus}-walk-f20-side.jpg`
- **After (`handoffs/GP-19970/face-after/`):**
  - Contact sheet: `handoffs/GP-19970/face-after/sheet.jpg`
  - Close head side profiles: `{shambler,feral,leaper,drowned,military,spitter,bomber,brute,colossus}-noon-head-side.png`
  - Full-body 4-light, walk-side, and gameplay-distance sets: `{kind}-{noon,overcast,dusk,night}-{front,side}.png`, `{kind}-walk-side.png`, `{kind}-gameplay-distance.png`

---

## 2. Visual Findings by Group

### A. Boss / Heavy Humanoids (`brute`, `colossus`) — **PASS (`4 / 5` Close, `5 / 5` Gameplay)**
- In `brute-noon-head-side.png` (`brute-noon-front.png`) and `colossus-noon-head-side.png` (`colossus-noon-front.png`), the broader cranium/jaw volume of the heavy head mesh meets the projected sockets, cyan eyes, brow ridges, nose bridge, and jaw/teeth cleanly.
- The detached front face-mask gap seen in `zombie.brute-walk-f20-side.jpg` and `zombie.colossus-walk-f20-side.jpg` is closed; no daylight separates the eyes, nose, or jaw from the head mass.

### B. Seven Common / Specialist Humanoids (`shambler`, `feral`, `leaper`, `drowned`, `military`, `spitter`, `bomber`) — **Close Scale Still Below Bar (`2.5 / 5` Close, `4 / 5` Gameplay)**
In `shambler-noon-head-side.png`, `feral-noon-head-side.png`, `leaper-noon-head-side.png`, `drowned-noon-head-side.png`, `military-noon-head-side.png`, `spitter-noon-head-side.png`, and `bomber-noon-head-side.png`:
1. **Lower-Face / Jaw / Cheek Strut Air Gap (All 7 Types):**
   - While the upper brow ridge and cyan eyes now contact the upper forehead, the smoothed head loft tapers sharply backward below the mid-cranium. Consequently, the lower half of the facial rig—the vertical cheek struts, open mouth cavity, upper/lower teeth, and lower jaw—still hangs out in front of the tapered lower head with a wide triangular daylight gap between the jaw/cheek struts and the skull/chin.
2. **Floating Nose Wedge & Detached Black Nostril Dots (All 7 Types):**
   - In side profile (`*-noon-head-side.png`), the nose block stands proud of the mid-face with two tiny black nostril spheres floating in empty air between the bottom of the nose and the upper teeth.
3. **Floating Wire Hair Strands (`shambler`, `feral`, `drowned`, `spitter`):**
   - The black angular hair ribbons on the crown and forehead still hover ~2–4 cm above/ahead of the scalp with daylight visible underneath them (`shambler-noon-head-side.png`, `feral-noon-head-side.png`, `drowned-noon-head-side.png`, `spitter-noon-head-side.png`).
4. **Floating Rear Occipital / Neck Pegs (`shambler`, `drowned`, `spitter`, `bomber`):**
   - Two small pale disc/oval pegs at the lower back of the skull still float in open air behind the occipital curve (`shambler-noon-head-side.png`, `drowned-noon-head-side.png`, `spitter-noon-head-side.png`, `bomber-noon-head-side.png`).

---

## 3. Per-Type Scoped Score Table (Face Fit Only)

| Zombie Type | Gameplay Distance (Const / Integ) | Inspector Close (Const / Integ) | Remaining Close-Scale Defects | Status |
| :--- | :---: | :---: | :--- | :---: |
| **`brute`** | `5 / 5` · `5 / 5` | **`4 / 5` · `4 / 5`** | Sockets, eyes, nose, and jaw seated against the broad skull. | **PASS** |
| **`colossus`** | `5 / 5` · `5 / 5` | **`4 / 5` · `4 / 5`** | Sockets, eyes, brow, and jaw seated cleanly against the head. | **PASS** |
| **`shambler`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts overhang tapered lower skull with air gap; floating black nostril dots; floating wire hair strands; floating rear neck pegs. | **NEEDS FIX** |
| **`feral`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts overhang tapered lower skull with air gap; floating nostril dots; floating forehead hair strand. | **NEEDS FIX** |
| **`leaper`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts and nose wedge project ahead of the lower head taper with daylight gap and floating nostril dots. | **NEEDS FIX** |
| **`drowned`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts overhang lower head taper; floating nose/nostril dots; floating crown hair strands; floating rear skull pegs. | **NEEDS FIX** |
| **`military`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts and nose wedge project ahead of the lower head taper under the helmet with daylight gap and floating nostril dots. | **NEEDS FIX** |
| **`spitter`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts overhang lower head taper; floating nose/nostril dots; floating hair strands; floating rear neck pegs. | **NEEDS FIX** |
| **`bomber`** | `4 / 5` · `4 / 5` | **`2.5 / 5` · `2.5 / 5`** | Lower jaw/mouth/cheek struts and nose wedge overhang lower head taper with air gap; floating nostril dots; floating rear neck pegs. | **NEEDS FIX** |
