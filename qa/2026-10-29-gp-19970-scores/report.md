# GP-19970 Visual Scores & Pixel Pinpoints (35 Requests — 2026-10-29)

- **Date**: 2026-10-29
- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Requests Answered**:
  1. `GP-19970 colossus shield close2 score`
  2. `GP-19970 Screamer face fit score`
  3. `GP-19970 leaper wound-strip fit score`
  4. `GP-19970 guardian tabard pixel clarification`
  5. `GP-19970 shambler feral forearm fit score and shin pinpoint`
  6. `GP-19970 rear crown close3 score`
  7. `GP-19970 colossus thigh plate fit score`
  8. `GP-19970 screamer close4 score`
  9. `GP-19970 leaper forearm close3 fit score`
  10. `GP-19970 shin and hem fit score`
  11. `GP-19970 colossus shin guard fit score`
  12. `GP-19970 feral and colossus shin close2 rescore`
  13. `GP-19970 guardian throat negative-space check`
  14. `GP-19970 caveguard chest splinter fit score`
  15. `GP-19970 active warning glow score`
  16. `GP-19970 guardian throat bridge rescore`
  17. `GP-19970 live Feral and Colossus motion score`
  18. `GP-19970 Demon f0 flame placement score`
  19. `GP-19970 heavy body-hit pose rescore`
  20. `GP-19970 military and brute attack/death score`
  21. `GP-19970 four-type attack/death score`
  22. `GP-19970 final five attack/death score`
  23. `GP-19970 live Spitter and Screamer special score`
  24. `GP-19970 live Bomber fuse and detonation score`
  25. `GP-19970 live Leaper and Demon special score`
  26. `GP-19970 live Spider web score`
  27. `GP-19970 Colossus hit mass rescore`
  28. `GP-19970 Screamer exposed howl pose score`
  29. `GP-19970 acid and web impact readability score`
  30. `GP-19970 marine waist helper fit score`
  31. `GP-19970 live Drowned grab motion score`
  32. `GP-19970 live Brute smash motion score`
  33. `GP-19970 live Military bash motion score`
  34. `GP-19970 final 14-zombie construction/materials/detail rescore`
  35. `GP-19970 final three generic attack/death motion score`

---

## 1. Colossus Shield `close2` Score (`handoffs/GP-19970/colossus-shield-close2-after/`)

- **Compared**: `handoffs/GP-19970/colossus-shield-after/{noon-close-front,noon-close-right,noon-gameplay,noon-walk-front}.png` vs `handoffs/GP-19970/colossus-shield-close2-after/` (`noon/overcast/dusk/night-close-front.png`, `noon-close-right.png`, `noon-gameplay.png`, `noon-walk-front.png`).
- **Scores**:
  - **Close Construction**: **4.5/5 (`PASS`)**
  - **Close Integration**: **4.5/5 (`PASS`)**
  - **Gameplay Face Readability**: **5/5 (`PASS`)**
- **Findings**:
  - Moving the colossus shoulder shield and its markings outboard opened a clean `~1.5–2 cm` clearance gap (`x ≈ 712–718, y ≈ 35–225` in `1600×900` `noon-close-front.png`) between the shield's inner edge and the colossus's right temple, headband, and cheek.
  - Both eyebrows, both glowing cyan eyes, the nose, and the full upper/lower teeth row read unobstructed in `noon-close-front.png`, `noon-walk-front.png`, `noon-gameplay.png`, and across all four lights (`noon`, `overcast`, `dusk`, `night`).
  - In `noon-close-right.png`, the shield and its curved horn rim remain firmly seated over the right deltoid/pauldron without floating off the upper arm.

---

## 2. Screamer Face Fit Score (`handoffs/GP-19970/screamer-face-after/`)

- **Compared**: `handoffs/GP-19970/screamer-face-before/screamer-noon-head-{side,front}.png` vs `handoffs/GP-19970/screamer-face-after/` (`screamer-{noon,overcast,dusk,night}-head-{side,front}.png`, `screamer-noon-gameplay.png`, `screamer-noon-walk-head-side.png`).
- **Scores**:
  - **Gameplay Scale Construction & Integration**: **4.5/5 (`PASS`)** — open-mouth scream silhouette, glowing cyan eyes, and extended pink tongue read clearly at gameplay distance (`screamer-noon-gameplay.png`) and in oblique walk view (`screamer-noon-walk-head-side.png`).
  - **Close 90° Profile Construction & Integration**: **3.5/5**
- **Improvements Verified**:
  - In `screamer-face-before/screamer-noon-head-side.png`, the cyan eye orbs and brow ridge floated completely out in front of the forehead dome with sky visible behind the eyes. In `screamer-face-after/screamer-noon-head-side.png`, the eye sockets and brow ridge are retracted into the front of the cranium (`x ≈ 895–985, y ≈ 395–450` in `1600×900`) with zero sky behind the cyan eyeballs.
- **Remaining Air Gaps in Close 90° Side Profile (`screamer-noon-head-side.png`, `1600×900`)**:
  1. **Floating nasal/mid-face diamond strut (`x ≈ 880–922, y ≈ 420–500`) & small pre-maxilla dot (`x ≈ 874, y ≈ 480`)**: In 90° side profile, the vertical dark-grey nose/cheek diamond plate sits `~1.5–2 cm` in front of the eye-socket/cheek surface with a clear vertical slit of sky (`x ≈ 912–925, y ≈ 435–485`) behind it, plus a tiny detached dark pellet at `(874, 480)`.
  2. **Upper-jaw / cheek strut to skull neck gap (`x ≈ 860–925, y ≈ 505–625`)**: A thin diagonal daylight gap (`x ≈ 905–930, y ≈ 545–615`) remains between the back of the upper-jaw/maxilla tooth-plate assembly and the front of the lower-jaw hinge / neck column.
  3. **Rear lower hair tips (`x ≈ 1142–1182, y ≈ 525–588`)**: Two small dark lower dreadlock tips at the nape of the neck sit slightly detached from the main hair strips in side view.

---

## 3. Leaper Wound-Strip Fit Score (`handoffs/GP-19970/leaper-strips-after/`)

- **Compared**: `handoffs/GP-19970/leaper-spine-after/noon-side.png` vs `handoffs/GP-19970/leaper-strips-after/` (`noon-side.png`, `noon-close-side.png`, `noon-back.png`, `gameplay-distance.png`, `walk-side.png`, `overcast-side.png`, `dusk-side.png`, `night-side.png`).
- **Scores**:
  - **Pelvis Wound Slashes (Close & Gameplay)**: **4.5/5 (`PASS`)**
  - **Forearm Wound Strip (Gameplay Scale)**: **4/5 (`PASS`)**
  - **Forearm Wound Strip (Close 90° Side Scale)**: **3.5/5**
- **Findings**:
  1. **Pelvis wound slashes (`4.5/5`)**: The long protruding red pelvis bar from `leaper-spine-after/noon-side.png` is completely gone. The two short parallel dark-red slash marks (`x ≈ 685–760, y ≈ 320–385` in `1600×900` `noon-close-side.png`) stay flush against the lower-side hem of the dark pelvis shorts in both rest (`noon-close-side.png`) and locomotion (`walk-side.png`), with zero protrusion into empty air.
  2. **Forearm wound strips (`3.5/5` close, `4/5` gameplay)**:
     - On the **near (left) forearm** in `noon-close-side.png` (`x ≈ 114–118, y ≈ 485–555`), the vertical red strip is seated nearly flush against the anterior forearm skin.
     - On the **far (right) forearm** in `noon-close-side.png` (`x ≈ 307–320, y ≈ 485–568`) and on both forearms in `walk-side.png` (`x ≈ 80–125, y ≈ 430–475` and `x ≈ 224–242, y ≈ 460–490`), the vertical brown-red strip still stands off the anterior forearm loft by `~1–1.5 cm` with a visible vertical slit of background sky between the strip and the arm skin.
  3. **Unrelated lower hind-leg note**: In `noon-close-side.png` (`x ≈ 1035–1188, y ≈ 530–620`), the straight grey Achilles tendon rod on the lower hind leg still spans across the concave calf curve with a triangular daylight window behind it.

---

## 4. Guardian & Caveguard Front Plate Pixel Clarification (`AG-138` Follow-Up)

- **Images Referenced (`1280×720`)**:
  - `handoffs/GP-19970/live/zombie-motion/zombie.guardian-walk-f20-side.jpg`
  - `handoffs/GP-19970/live/zombie-motion/zombie.caveguard-walk-f20-side.jpg`
- **Clarification**:
  - The gap cited in `AG-138` is **NOT** at the pelvis/hip (the pelvis and hip armor plates at `x ≈ 680–760, y ≈ 290–360` are completely flush in both models).
  - What `AG-138` loosely called a "front loincloth/tabard slab" is the **upper-chest / throat hanging plate & sternum armor assembly** in 90° side profile:
    1. **`zombie.guardian-walk-f20-side.jpg` (`1280×720`)**:
       - **Exact Location**: `x = 546..620, y = 170..248` (below the lower jaw and in front of the throat/upper sternum).
       - **Specific Pieces**: The vertical pale-bone throat/jaw cage bars hanging down at `x = 546..582, y = 175..236` and the forward-tilted upper-sternum chest plate at `x = 580..620, y = 180..248`, which leave an open triangular daylight window (`x = 556..578, y = 188..228`) between the hanging jaw/throat strut and the front of the chest.
    2. **`zombie.caveguard-walk-f20-side.jpg` (`1280×720`)**:
       - **Exact Location**: `x = 562..646, y = 148..242` (front of the upper chest/sternum).
       - **Specific Pieces**: The angled pale-stone front sternum plate (`x = 575..640, y = 175..238`) and the thin brown/grey splinter/spike struts (`x = 562..588, y = 148..178`) that jut forward into empty air ahead of the upper chest. (Also note a minor green/brown vine/tendon loop at `x = 652..668, y = 360..395` on the front of the lower thigh just above the knee.)

---

## 5. Shambler & Feral Forearm Ribbon Fit Score & Shin Pinpoint (`handoffs/GP-19970/limb-wounds-after/`)

- **Compared**: `handoffs/GP-19970/face-hair-crown-after/{shambler,feral}-{noon,overcast,dusk,night}-side.png` + `gameplay-distance.png` vs `handoffs/GP-19970/limb-wounds-after/` matching PNGs, plus `handoffs/GP-19970/live/zombie-motion/zombie.shambler-walk-f20-side.jpg` and `zombie.feral-body-hit-f10-side.jpg`.
- **Forearm Ribbon Scores**:
  - **`shambler` Forearm Ribbon**: **4.5/5 (`PASS`)** at both close and gameplay scale — in `limb-wounds-after/shambler-noon-side.png` (`x ≈ 642–668, y ≈ 422–485` in `1600×900`), the conformal loft seats the red ribbon flush along the dorsal forearm slope with zero air gap while keeping the crimson wound streak clearly readable across all four lights (`noon`, `overcast`, `dusk`, `night`) and visible at gameplay distance.
  - **`feral` Forearm Ribbon**: **4.5/5 Construction (`PASS`), 4/5 Readability (`PASS`)** — in `limb-wounds-after/feral-noon-side.png` (`x ≈ 520–540, y ≈ 355–465` in `1600×900`), the protruding dorsal fin from `face-hair-crown-after/feral-noon-side.png` (`x ≈ 518–532, y ≈ 405–465`) is completely eliminated (`zero` floating geometry). Because `feral`'s forearm is rotated slightly in the hunched pose and the ribbon sits tightly against/inside the dorsal loft, only a tiny warm sliver (`x ≈ 530, y ≈ 360`) is visible in strict 90° side profile; if you want a stronger red slash read on `feral` without re-introducing a gap, nudge the conformal ribbon normal offset outward by `+1.5 to +2 mm`.
- **Exact Pinpoint of the Floating Lower-Leg / Shin Pieces (`1600×900` in `limb-wounds-after/*-noon-side.png` and `1280×720` in `zombie-motion/*-side.jpg`)**:
  There are **two** distinct lower-leg elements showing a daylight slit in 90° side profile:
  1. **Front Trouser-Hem Tatter Strip Just Above the Knee Cap**:
     - `limb-wounds-after/shambler-noon-side.png` (`1600×900`): `x = 758..764, y = 652..720` (a thin vertical dark-grey tatter strip hanging straight down in front of the lower trouser cuff / upper knee cap with a `2–3 px` vertical sky slit at `x = 761..763, y = 665..712`).
     - `limb-wounds-after/feral-noon-side.png` (`1600×900`): `x = 792..804, y = 575..640` (same thin dark-grey front trouser tatter strip projecting in front of the lower thigh/knee with a sky slit at `x = 796..800, y = 588..632`).
     - Also seen in `zombie.shambler-walk-f20-side.jpg` (`1280×720`) at `x = 556..568, y = 605..652` and `zombie.feral-body-hit-f10-side.jpg` (`1280×720`) at `x = 588..602, y = 512..568`.
  2. **Straight Anterior Shin Shadow/Bone Rod Below the Knee Cap**:
     - `limb-wounds-after/shambler-noon-side.png` (`1600×900`): `x = 768..778, y = 740..815` (a straight vertical dark-olive/grey rod running from the bottom of the pale knee sphere at `y = 740` down to the boot top at `y = 815`; because the anterior shin loft curves inward behind it, there is a narrow vertical sky slit at `x = 772..775, y = 748..795`).
     - `limb-wounds-after/feral-noon-side.png` (`1600×900`): `x = 822..862, y = 668..795` (the straight diagonal dark-olive/grey rod running from the bottom of the knee sphere at `(824, 668)` to the ankle at `(860, 795)`, with a clear daylight slit between the rod and the pale anterior shin skin along `x = 828..856, y = 675..775`).
     - Also seen on the rear leg of `zombie.feral-body-hit-f10-side.jpg` (`1280×720`) at `x = 680..702, y = 545..572`.

---

## 6. Rear Crown `close3` Score (`handoffs/GP-19970/face-hair-crown-close3-after/`)

- **Compared**: `handoffs/GP-19970/face-hair-crown-after/{shambler,feral,drowned,spitter}-{head-back,head-side,noon-side,overcast-side,dusk-side,night-side,gameplay-distance}.png` vs `handoffs/GP-19970/face-hair-crown-close3-after/` matching PNGs.
- **Scores**:
  - **Close Side Profile (`-head-side.png` & 4-light `-side.png`)**: **4.5/5 (`PASS`)**
  - **Close Rear View (`-head-back.png`)**: **4/5 (`PASS`)**
  - **Gameplay Scale (`-gameplay-distance.png`)**: **4.5/5 (`PASS`)**
- **Findings**:
  1. **Inverted-V Rear Tuft Gap Eliminated (`4.5/5`)**: Across all four types (`shambler`, `feral`, `drowned`, `spitter`), moving the rear row's middle and tip vertices onto the analytic skull back completely closed the inverted-V daylight triangle that was visible in `face-hair-crown-after/*-head-side.png`. The rear hair tufts now hug the upper-back cranium curve cleanly with zero sky underneath and no skull clipping.
  2. **Rear View (`4/5`)**: Folding the upper rear spikes down onto the dome smoothed the top crown silhouette in `*-head-back.png`. Only a minor `~5–8 mm` (`~12–15 px` at `x ≈ 895–945, y ≈ 300–322` in `1600×900`) right-hand crossbar tip overhang past the upper-right parietal curve remains in strict rear view on `shambler`, `drowned`, and `spitter`, which is well above the `4/5` bar.

---

## 7. Colossus Thigh Plate Fit Score (`handoffs/GP-19970/colossus-thigh-after/`)

- **Compared**: `handoffs/GP-19970/colossus-carrier-after/{noon-side,noon-front,noon-back,overcast-side,dusk-side,night-side,gameplay-distance,colossus-walk-side}.png` vs `handoffs/GP-19970/colossus-thigh-after/` matching PNGs + `noon-close-thigh-side.png`.
- **Scores (Scoped to Thigh Plates)**:
  - **Close Construction & Integration (`noon-close-thigh-side.png`, `noon-side.png`, `colossus-walk-side.png`)**: **4.5/5 (`PASS`)**
  - **Gameplay Construction & Integration (`noon-front.png`, `gameplay-distance.png`)**: **4.5/5 (`PASS`)**
- **Findings**:
  1. **Protruding Box Slab Eliminated (`4.5/5`)**: In `colossus-carrier-after/noon-side.png`, the flat vertical thigh box (`x ≈ 748–778, y ≈ 608–695` in `1600×900`) jutted straight out in front of the lower thigh taper. In `colossus-thigh-after/noon-close-thigh-side.png` (`x ≈ 710–756, y ≈ 520–688`), the two curved, overlapping rusty-brown plates follow the anterior thigh loft contour cleanly from hip hem to knee with zero air gap, zero skin sinking, and clean outward face winding across all 4 lights and in `colossus-walk-side.png`.
  2. **Unrelated Lower-Leg Note (Shin Guard Below Knee)**: While the thigh plates are now completely flush, note that below the knee in `noon-close-thigh-side.png` (`x ≈ 726–775, y ≈ 735–950`) and `colossus-walk-side.png` (`x ≈ 260–310, y ≈ 725–835` and `x ≈ 338–382, y ≈ 715–820`), the curved black shin-guard plate still stands `~1–1.5 cm` forward of the lower shin/ankle taper with a thin vertical daylight slit between the lower half of the shin guard and the front of the lower leg.

---

## 8. Screamer `close4` Construction & Integration Score (`handoffs/GP-19970/screamer-profile-close4/`)

- **Compared**: `handoffs/GP-19970/screamer-profile-close2/` vs `handoffs/GP-19970/screamer-profile-close4/` (`screamer-{noon,overcast,dusk,night}-head-{side,front}.png`, `screamer-noon-gameplay.png`, `screamer-noon-walk-head-side.png`).
- **Scores**:
  - **Strict 90° Close Side Construction & Integration**: **4/5 (`PASS`)**
  - **Gameplay Readability**: **4.5/5 (`PASS`)**
- **Findings (`1600×900`)**:
  1. **Fixes Verified**: The detached black nose dot is completely gone, and the diagonal cheek-to-jaw gap (`x ≈ 905–930`) is filled cleanly by the retracted cheek and jaw-hinge struts.
  2. **Anterior Nasal Plate Pinpoint**: The nasal bridge plate (`x = 876..918, y = 340..430` in `screamer-noon-head-side.png`) now seats back into the brow and maxilla at top and bottom (passing the `4/5` bar), leaving only:
     - A tiny `3–6 px` vertical recessed eye-socket sliver behind the mid-bridge at `x = 910..916, y = 378..418` (`x = 916..922, y = 478..518` in `screamer-noon-walk-head-side.png`),
     - A small `~6×18 px` gap (`x = 858..868, y = 438..462`) between the upper front teeth row (`x = 838..858, y = 430..480`) and the front edge of the dark maxilla plate, and
     - Two small rear lower hair-tip ovals (`x = 1142..1182, y = 455..520`).




---

## 9. GP-19970 Leaper Forearm `close3` Fit Score (`handoffs/GP-19970/leaper-forearm-close3/`)

Compared `handoffs/GP-19970/leaper-strips-after/{noon-close-side,walk-side}.png` with `handoffs/GP-19970/leaper-forearm-close3/{noon-close-side,walk-side,noon-side,overcast-side,dusk-side,night-side,noon-back,gameplay-distance}.png`:

- **Close-Scale Score (0–5)**:
  - **Construction**: **4.0 / 5** (PASS — up from `3.5/5` in `leaper-strips-after`)
  - **Integration**: **4.0 / 5** (PASS — up from `3.5/5` in `leaper-strips-after`)
- **Gameplay-Scale Score (0–5)**:
  - **Readability / Integration**: **4.5 / 5** (PASS)
- **Pinpoint Notes (`1600x900`)**:
  - Projecting both ribbon edges onto 5 forearm loft samples (`1.3 cm` width, `+4 mm` offset) eliminated the thick protruding red-brown fin on the far right forearm in `noon-side.png`, `overcast-side.png`, `dusk-side.png`, `night-side.png`, and `gameplay-distance.png`.
  - In extreme close `noon-close-side.png`, the near left forearm wound mark sits flush at `x = 74..78, y = 480..540`, and the far right forearm mark at `x = 200..206, y = 490..585` now hugs the anterior forearm curve with only a razor-thin `1–2 px` edge sliver at `x = 201..205, y = 515..565` (and `1–2 px` at `x = 144..148, y = 492..528` in `walk-side.png`), well within `4/5`. Both red-brown wound marks remain readable in side and three-quarter views.

---

## 10. `GP-19970` Shin and Hem Fit Score (`handoffs/GP-19970/shin-hem-after/`)

- **Trouser-Hem Tatters (`shambler`, `feral`)**: **PASS (`5/5` Close Construction & Integration, `4.5/5` Gameplay Readability)**
  - In `shambler-after-zoom.png` / `shambler-noon-side.png` (`x = 760..765, y = 600..655`) and `feral-after-zoom.png` / `feral-noon-side.png` (`x = 800..812, y = 565..620`), the former protruding anterior tatter strip is completely tucked against the lower thigh cloth with zero daylight gap while preserving the ragged cuff silhouette.
- **Anterior Shin Tendon (`shambler`, `feral`, `leaper`)**:
  - **Gameplay Readability**: `4.5/5` across all three types (`*-gameplay-distance.png`).
  - **Close Construction & Integration**:
    - `shambler`: **`4/5`** — in `shambler-noon-side.png`, the 4-point tendon narrows the former wide gap down to a minor `2–4 px` (`~4–6 mm`) sliver at `x = 770..776, y = 755..805`.
    - `leaper`: **`4/5` static close / `4.5/5` walk** — in `leaper-walk-side.png` the tendon sits flush against the shin (`4.5/5`); in `leaper-noon-close-side.png` at `x = 1018..1125, y = 670..775` (`leaper-after-zoom.png`) a narrow `3–5 px` (`~5–8 mm`) sliver remains between the tendon and the concave anterior shin loft.
    - `feral`: **`3.5/5` close side** — in `feral-after-zoom.png` and `feral-noon-side.png` at `x = 832..865, y = 690..785` (and matched `overcast`/`dusk`/`night` side views), the concave lower shin still bows backward behind the tendon, leaving a visible `4–7 px` (`~6–10 mm`) triangular daylight slit along the lower half of the shin. Pulling the middle/lower interior control points `+4..6 mm` deeper into the anterior shin loft will bring `feral` close side to `4.5/5`.

---

## 11. `GP-19970` Colossus Shin Guard Fit Score (`handoffs/GP-19970/colossus-shin-after/`)

- **Scores**:
  - **Gameplay Readability (`gameplay-distance.png`, `noon-front.png`)**: `4.5/5`
  - **Close Static Side Construction & Integration (`noon-close-thigh-side.png`, 4-light `*-side.png`)**: `4.0/5`
  - **Close Walk Side Construction & Integration (`colossus-walk-side.png`)**: `3.5/5`
- **Pinpoint Analysis (`1600x900`)**:
  - In `colossus-shin-after/noon-close-thigh-side.png`, tapering the lower three `z` rows inward by `1–2 cm` cut the former ankle gap in half with zero skin intersection, leaving only a thin `3–5 px` (`~5–8 mm`) vertical sky sliver at `x = 742..755, y = 805..925` between the rear edge of the black shin guard and the anterior shin concavity above the boot top (`4/5`).
  - However, in `colossus-shin-after/colossus-walk-side.png` at `x = 682..722, y = 730..815`, on the trailing/bent leg during the walk stride, the lower half of the black shin guard still separates from the shin with a visible `6–10 px` (`~1–1.5 cm`) triangular sky gap between the two legs (`3.5/5`). Tucking the lower rear flange / side return of the shin guard `~1 cm` further back around the shin radius will close the walk-stride gap.

---

## 12. `GP-19970` Feral and Colossus Shin `close2` Rescore (`handoffs/GP-19970/shin-fit-close2/`)

- **Compared**:
  - `shin-hem-after/feral-noon-side.png` vs `shin-fit-close2/feral-noon-side.png` (+ `feral-before2-zoom.png` vs `feral-after2-zoom.png`, matched 4 lights, and `feral-gameplay-distance.png`).
  - `colossus-shin-after/{noon-close-thigh-side,colossus-walk-side}.png` vs `shin-fit-close2/{colossus-noon-close-thigh-side,colossus-colossus-walk-side}.png` (+ `colossus-before2-zoom.png` vs `colossus-after2-zoom.png`, matched 4 lights, and `colossus-gameplay-distance.png`).
- **Scores**:
  - **Feral Anterior Tendon**:
    - Close Construction & Integration: **4.5 / 5 (`PASS`)**
    - Gameplay Readability: **4.5 / 5 (`PASS`)**
  - **Colossus Shin Guard**:
    - Close Static & Bent Walk Construction & Integration: **4.5 / 5 (`PASS`)**
    - Gameplay Readability: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Feral Shin Tendon (`4.5/5`)**: Insetting the middle/lower interior control points by `5 mm` pulled the tendon flush against the anterior shin concavity (`feral-after2-zoom.png`). The prior `4–7 px` / `~6–10 mm` triangular daylight gap is completely closed with zero skin sinking or clipping across `noon`, `overcast`, `dusk`, `night`, and gameplay distance.
  2. **Colossus Shin Guard (`4.5/5`)**: Increasing the lower side wrap by `1–1.5 cm` wrapped the lower flange cleanly around the shin radius. In `colossus-colossus-walk-side.png`, the trailing bent stride leg no longer separates from the shin (`0 px` sky gap; prior `6–10 px` / `1–1.5 cm` gap eliminated) with zero boot collar penetration. Both pass.

---

## 13. `GP-19970` Guardian Throat Negative-Space Check (`handoffs/GP-19970/guardian-chest-before/`)

- **Images Referenced**:
  - `handoffs/GP-19970/guardian-chest-before/guardian-walk-gap-zoom.png`
  - `handoffs/GP-19970/guardian-chest-before/caveguard-walk-gap-zoom.png`
- **Findings & Clarification**:
  1. **Mouth vs Throat Gap**: The cavernous open mouth cavity itself is intentional character negative space and should remain open. The failing `3.5/5` defect cited in `AG-138` is the open triangular daylight window *behind* the vertical bone jaw cage / throat hanging strut and *in front of* the rear neck/throat wall plate.
  2. **Bridge Member Pinpoint**: The rear upright strut of the lower jaw cage currently hangs unanchored in front of the neck column. Connecting the rear/upper edge of that jaw basket back into the sternum/throat wall with a modest neck-local tendon/plate bridge will seat the cage into the chest without closing the open mouth silhouette or altering the forward profile.
- **Baseline Zooms Close Score**: Guardian Close Construction/Integration **3.5 / 5**; Caveguard Close Construction/Integration **3.5 / 5**.

---

## 14. `GP-19970` Caveguard Chest Splinter Fit Score (`handoffs/GP-19970/guardian-chest-after/`)

- **Inspected**:
  - `zombie.caveguard-walk-f{0,20,40}-{front,side}.jpg` (true stepped walk Inspector frames)
  - `caveguard-before-walk-zoom.png` vs `caveguard-after-walk-zoom.png`
  - 4-light static close sides (`caveguard-{noon,overcast,dusk,night}-close-side.png`) and `caveguard-noon-gameplay.png`
- **Scores**:
  - **Close Construction & Integration**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **4.5 / 5 (`PASS`)**
- **Findings**:
  - In `zombie.caveguard-walk-f{0,20,40}-{front,side}.jpg`, shifting the front upper chest cords `8 cm` inward / shortening them `12 cm` and tucking the two front stone plates `4–7 cm` inward seats the sternum assembly cleanly onto the chest loft.
  - Zero disconnected splinters or air gaps remain in either static rest or dynamic walk strides. Both cords and stone plates hug the torso with no clipping.

---

## 15. `GP-19970` Active Warning Glow Score (`handoffs/GP-19970/active-warnings/after/`)

- **Inspected**:
  - Native Inspector shots: `handoffs/GP-19970/active-warnings/after/report.json` (23 shots), `bomber-peak-noon-gameplay.jpg`, `bomber-peak-night-side.jpg`, `demon-active-noon-side.jpg`, `spitter-active-noon-side.jpg`, and matched four-light states.
- **Scores**:
  - **Bomber Fuse Vein Warning Glow**: **4.5 / 5 (`PASS`)**
  - **Spitter Acid Warning Glow**: **4.5 / 5 (`PASS`)**
  - **Demon Flame Fists Warning Glow**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Bomber**: Increasing the active fuse vein peak emissive intensity to `1.68` (from `0.52`) provides clear warning readability across noon, overcast, dusk, and night at gameplay distance without reading as flat neon. The incandescent veins read convincingly as internal thermal pressure building beneath taut skin.
  2. **Spitter & Demon**: The spitter bile sac warning glow and demon flame fists warning glow provide strong silhouette cues in all lighting environments and satisfy the `docs/art-direction.md` warning exception.
  3. **Flaws <= 3.5/5**: None. All warning visuals pass.

---

## 16. `GP-19970` Guardian Throat Bridge Rescore (`handoffs/GP-19970/guardian-throat/`)

- **Compared**: `guardian-chest-before/{guardian,caveguard}-walk-gap-zoom.png` and `guardian-chest-after/` baseline views vs `handoffs/GP-19970/guardian-throat/{guardian,caveguard}-{rest-{noon,overcast,dusk,night}-throat,rest-noon-gameplay,walk-f{0,20,40}-noon-throat}.jpg`.
- **Scores**:
  - **Close Construction & Integration**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **5.0 / 5 (`PASS`)**
- **Findings**:
  - The two neck-local tendon masses and tapered bone paths seat the rear basket upright cleanly into the throat wall across all lighting environments (`noon`, `overcast`, `dusk`, `night`) and during walk strides (`f0`, `f20`, `f40`).
  - The previous failing `3.5/5` triangular daylight gap behind the lower jaw basket is completely sealed with zero residual sky slit.
  - The cavernous mouth cavity negative space, tooth perimeter, and menacing quadruped silhouette remain fully unobstructed.

---

## 17. `GP-19970` Live Feral & Colossus Motion Score (`handoffs/GP-19970/live-specials/`)

- **Inspected**: `handoffs/GP-19970/live-specials/` (`feral-01.png`, `colossus-01/02.png`, `run.json`).
- **Scores (Universal Animation Principles — `docs/animation-principles.md`)**:
  - **Feral Horde Lunge**:
    - Intention & Staging: **3.0 / 5**
    - Timing & Anticipation: **3.5 / 5**
    - Balance & Continuity: **3.5 / 5**
    - Character & Gameplay: **3.5 / 5**
    - *Overall*: **3.5 / 5 (`FAIL` D-89 threshold < 4.0)**
  - **Colossus Ground Slam**:
    - Intention & Silhouettes: **3.5 / 5**
    - Continuity: **2.5 / 5 (`DEFECT`)**
    - Timing & Weight: **3.0 / 5**
    - Balance & Structure: **3.0 / 5**
    - Character & Gameplay: **3.0 / 5**
    - *Overall*: **3.0 / 5 (`FAIL` D-89 threshold < 4.0)**
- **Defects & Findings**:
  1. **Feral Lunge**: In `run.json` and `index.html` (56121–56125), `hzLungeT` alters only translation speed (1.75x burst) with zero distinct anticipation coil, forward spring pose, or strike tell. The player cannot distinguish a standard sprint from a special lunge before impact.
  2. **Colossus Ground Slam**: In `run.json` and `index.html` (57132–57136), during `slamWind` both massive arms snap instantaneously from -0.1 to -2.5 rad in a single frame (0 ms transition), freezing rigidly overhead for ~0.72s without torso compression, shoulder heaving, or leg planting. Violates Principle II.2 (Anticipation), II.5 (Overlapping Action), II.6 (Slow In/Out), and VI (Continuity). Grokbot's queued GB-245 procedural easing and beat tuning will address this.

---

### Section 17 Rescore (GB-248 — `qa/2026-10-29-GB-248/after/`)

- **Inspected**: `qa/2026-10-29-GB-248/after/` (`feral-01.png`, `feral-02.png`, `colossus-01.png`, `colossus-02.png`, `colossus-03.png`, `colossus-04.png`, `run.json`).
- **Scores (Universal Animation Principles — `docs/animation-principles.md`)**:
  - **Feral Horde Lunge**:
    - Intention & Staging: **4.5 / 5 (`PASS`)**
    - Timing & Anticipation: **4.5 / 5 (`PASS`)**
    - Balance & Continuity: **4.5 / 5 (`PASS`)**
    - Character & Gameplay: **4.5 / 5 (`PASS`)**
    - *Overall*: **4.5 / 5 (`PASS` — D-89 threshold >= 4.0)**
  - **Colossus Ground Slam**:
    - Intention & Silhouettes: **4.5 / 5 (`PASS`)**
    - Continuity: **4.5 / 5 (`PASS - RESOLVED`)** (was 2.5/5 defect)
    - Timing & Weight: **4.5 / 5 (`PASS`)**
    - Balance & Structure: **4.5 / 5 (`PASS`)**
    - Character & Gameplay: **4.5 / 5 (`PASS`)**
    - *Overall*: **4.5 / 5 (`PASS` — D-89 threshold >= 4.0)**
- **Verification & Findings**:
  1. **Feral Horde Lunge**:
     - *Anticipation*: In `feral-01.png` and `run.json` (t=35.634, coil=0.163), the feral executes a clear 0.18s pre-lunge coil (`hzCoilT`). Hips sink into knees (`hipsY` drops to 0.804 m from 0.890 m), torso pitches forward (`torso: 0.502 rad`), both arms draw back (`arms: [-0.523, -0.594]`), and head tilts upward (`head: -0.432 rad`) locked on the marine.
     - *Line of Action & Strike*: In `feral-02.png` (t=36.013..36.055, lunge=0.174..0.131), the spring snaps out fast and holds along a sharp predatory vector. Torso stretches flat along the lunge (`torso: 1.19..1.20 rad`), arms thrust forward toward target (`arms: [-1.45, -1.79 rad]`), and hips drop to 0.735 m.
     - *Follow-Through & Recovery*: Eases smoothly through `hzLungeRec` (0.24s) back into standard run cycle. Distinct visual telegraph enables fair player dodge / counter-play.
  2. **Colossus Ground Slam**:
     - *Staged Wind-Up*: In `colossus-01.png` and `colossus-02.png` and `run.json` (t=38.721..39.413, wind=0.733..0.045), instantaneous 0ms snapping is completely resolved. Both arms heave back progressively from walk posture through `-0.32` -> `-2.15` -> `-2.37` -> `-2.57` rad, shoulders spread, torso arches back (`torso: -0.13 rad`), and hips sink 12 cm (`hipsY: 1.884` down to `1.766 m`).
     - *Strike & Follow-Through*: In `colossus-03.png` and `colossus-04.png` (t=39.465..39.877, follow=0.500..0.091), fists plunge to the ground plane (`arms: -1.60 rad`), torso folds forward (`torso: +0.40..+0.54 rad`), knees absorb impact, and a held beat transitions smoothly out to walk.
     - *Attack Separation*: Slam wind-up and follow-through are fully protected against interruption from standard claw swings.
  3. **Sub-4 Defects**: ZERO. Both motions achieve 4.5/5 PASS, clearing the D-89 animation standards.

---

## 18. `GP-19970` Demon f0 Flame Placement Score (`handoffs/GP-19970/demon-flame/`)

- **Compared**: `handoffs/GP-19970/live/zombie-motion/zombie.demon-walk-f0-front.jpg` (before) vs `handoffs/GP-19970/demon-flame/demon-{noon,night}-walk-f{0,20}-{front,gameplay}.jpg`.
- **Scores**:
  - **Frame 0 Attachment & Continuity**: **5.0 / 5 (`PASS`)**
  - **Gameplay Readability & Style**: **4.5 / 5 (`PASS`)**
- **Findings**:
  - In `demon-noon-walk-f0-front.jpg` and `demon-night-walk-f0-front.jpg`, the initial transform seeding in `game/zombie-ability-visuals.js` correctly anchors both fire meshes directly to the palms/fists at `f0`. The former shin/foot drop bug is completely eliminated.
  - Flame translation maintains continuous tracking through locomotion (`f20`) and clearly communicates the fire-wielding archetype at gameplay distance across noon and night illumination.

---

## 19. `GP-19970` Heavy Body-Hit Pose Rescore (`handoffs/GP-19970/hit-pose/after/`)

- **Compared**: `handoffs/GP-19970/hit-pose/before/` vs `handoffs/GP-19970/hit-pose/after/` (`report.json`, `brute-body-hit-f{5,10,20}-{front,gameplay}.jpg`, `colossus-body-hit-f{5,10,20}-{front,gameplay}.jpg`).
- **Scores**:
  - **Brute Body-Hit Response**:
    - Intention & Staging: **4.5 / 5 (`PASS`)**
    - Weight & Timing: **4.5 / 5 (`PASS`)**
    - Structure & Continuity: **4.5 / 5 (`PASS`)**
    - Gameplay Readability: **4.5 / 5 (`PASS`)**
  - **Colossus Body-Hit Response**:
    - Intention & Staging: **4.5 / 5 (`PASS`)**
    - Structure & Continuity: **4.0 / 5 (`PASS`)**
    - Gameplay Readability: **4.0 / 5 (`PASS`)**
    - Weight & Inertia: **3.5 / 5**
- **Findings & Torso Twist Evaluation**:
  - **Brute**: Torso yaw twist reaches 0.291 rad (~16.7°) at f5, recoiling armL to -1.43 rad before recovering through f10 (0.225 rad) and f20 (0.093 rad). The movement communicates convincing fleshy impact absorption without compromising the brawler's center of mass.
  - **Colossus Torso Twist**: In `colossus-body-hit-f5-front.jpg` and `gameplay.jpg`, torso yaw reaches 0.679 rad (~38.9°), matching the lightweight shambler (0.728 rad). For a massive 3-meter armored behemoth with a giant boulder chassis, 39° of snap twist feels disproportionately light and whips the back-slab excessively. Recommend reducing Colossus torso yaw dampening by ~50% (capping at ~0.25–0.35 rad / 15–20°) to sell crushing inertia.

---

## 20. `GP-19970` Military & Brute Attack/Death Score (`handoffs/GP-19970/attack-death-survey/`)

- **Inspected**: `handoffs/GP-19970/attack-death-survey/{military,brute}/` (31 native frames each, attack f10/f20, death f20/f80, `report.json`).
- **Scores**:
  - **Military**: Attack **4.5 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)**
  - **Brute**: Attack **4.5 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)**
- **Findings**:
  - **Attacks**: Military f10/f20 displays crisp overhead claw telegraph and downward lunge. Brute f10/f20 shows heavy dual-fist overhead preparation and massive groundward clubbing stroke with clear torso heave.
  - **Deaths & Detached Gore**: Both dismember cleanly at f20 with severed limbs, head popping, and stylized crimson blood/tissue capsules scattering into the air. At f80, corpses and dismembered chunks settle firmly onto the terrain with skull target rings intact. Zero clipping through floor; gore chunks read crisply as intended stylized combat feedback. Zero sub-4 defects.

---

## 21. `GP-19970` Four-Type Attack/Death Score (`handoffs/GP-19970/attack-death-survey/`)

- **Inspected**: `handoffs/GP-19970/attack-death-survey/{leaper,drowned,spitter,bomber}/` (31 native frames each, `report.json`).
- **Scores**:
  - **Leaper**: Attack **4.5 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)**
  - **Drowned**: Attack **4.0 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)**
  - **Spitter**: Attack **4.0 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)**
  - **Bomber**: Attack **4.0 / 5 (`PASS`)**, Death **5.0 / 5 (`PASS`)**
- **Findings**:
  - **Leaper Arc & Contact**: In `leaper-attack-f10.jpg`, the airborne diving silhouette with outstretched claws communicates lethal predator trajectory; in `f20`, landing into a four-point crouch makes clean ground contact with convincing weight absorption.
  - **Drowned & Spitter**: Drowned moves with waterlogged lumbering weight; Spitter attack presents clear bloated thoracic silhouette; both collapse cleanly with distinctive gore and skull rings.
  - **Bomber Detonation**: Death f20 presents a spectacular spherical detonation with limbs, shrapnel, sparks, and radiant center core, settling cleanly at f80 with ticking bomb skull indicator. Zero sub-4 defects.

---

## 22. `GP-19970` Final Five Attack/Death Score (`handoffs/GP-19970/attack-death-survey/`)

- **Inspected**: `handoffs/GP-19970/attack-death-survey/{spider,screamer,demon,guardian,caveguard}/` (31 native frames each, `report.json`).
- **Scores**:
  - **Spider**: Attack **4.0 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)** (inward leg curl settle is archetypal)
  - **Screamer**: Attack **4.0 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)** (arched shriek posture, severed head settle)
  - **Demon**: Attack **4.5 / 5 (`PASS`)**, Death **4.5 / 5 (`PASS`)** (flaming fist slam, horned skull ring)
  - **Guardian & Caveguard**: Attack **4.5 / 5 (`PASS`)**, Death Settle **4.0 / 5 (`PASS`)**
- **Findings & Settle Analysis**:
  1. **Guardian & Caveguard Attack**: Frame 10 windup and frame 20 slash communicate massive beastly force and weight.
  2. **Death Settle & Pinpoints**:
     - The collapsed body postures in `guardian-death-f80.jpg` and `caveguard-death-f80.jpg` settle heavily and convincingly onto the ground with chassis weight properly grounded.
     - *Inspector Stepping Artifact / Floating Particle*: In `guardian-death-f80.jpg`, an unparented red rectangular gore chunk hangs suspended in mid-air (`x ≈ 830, y ≈ 190`), and in `caveguard-death-f80.jpg`, a faint pink diamond particle floats at `x ≈ 640, y ≈ 540`.
     - *Caveguard Snout Ground Penetration*: In `caveguard-death-f80.jpg`, the stone snout/jaw tip sinks slightly (~3–5 cm) into the floor plane (`x ≈ 460..510, y ≈ 710..740`).


---

## 23. `GP-19970` Live Spitter & Screamer Special Score (`handoffs/GP-19970/live-own-specials/`)

- **Inspected**: `handoffs/GP-19970/live-own-specials/` (`framed2-spitter-*.png`, `framed2-screamer-*.png`, `run-all-framed2.json`).
- **Scores**:
  - **Live Spitter Spit**:
    - Intention & Staging: **4.5 / 5 (`PASS`)**
    - Timing & Anticipation: **4.0 / 5 (`PASS`)**
    - Structure & Continuity: **4.0 / 5 (`PASS`)**
    - Gameplay Readability: **4.5 / 5 (`PASS`)**
  - **Live Screamer Sonic**:
    - Energy Shield Readability: **4.0 / 5 (`PASS`)**
    - Skeletal Posing & Structure: **3.0 / 5 (`INCONCLUSIVE / BLOCKED BY FX`)**
- **Findings**:
  1. **Spitter Acid Regurgitation**: In `run-all-framed2.json`, `action` (spitWind) steps cleanly through a 0.6s countdown down to 0.1s. In `framed2-spitter-02.png`, the arms spread backward (-0.67 rad) and head lowers (-0.34 rad) as an intense glowing lime-green acid orb expands in front of the open maw. This provides unmistakable gameplay telegraphing before trajectory launch.
  2. **Screamer Sonic Shield Limitation**: In `framed2-screamer-01.png` and `framed2-screamer-02.png`, the Screamer is enveloped by a dense spiraling sonic vortex against the pitch-black night terrain. While `run-all-framed2.json` confirms state progression (`screamT` = 1.2s and `sonicOpenT`), the dark model silhouette within the opaque swirling energy shroud has insufficient contrast to verify joint articulation, neck extension, or spinal arching. As instructed, this limit is recorded rather than inferring a pass; full skeletal evaluation requires daytime lighting or reduced shield opacity.

---

## 24. `GP-19970` Live Bomber Fuse and Detonation Score (`handoffs/GP-19970/live-bomber/`)

- **Inspected**: `handoffs/GP-19970/live-bomber/` (`bomber-01.png` through `bomber-08.png`, `run.json`).
- **Scores**:
  - **Staging & Readability**: **4.5 / 5 (`PASS`)**
  - **Mass & Acceleration**: **4.0 / 5 (`PASS`)**
  - **Timing & Anticipation**: **4.5 / 5 (`PASS`)**
  - **Blast Transition**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Vein Emissive & Escalation**: In `run.json`, as the bomber closes from 9m down to point-blank contact over 3.65s (`t = 27.514` to `31.168`), fuse intensity ramps continuously across two distinct pulse tiers (`0.367..0.898` and `0.782..1.696`). At night (`bomber-04.png`), the incandescent abdominal veins illuminate surrounding geometry and provide urgent, unmistakably clear gameplay telegraphing.
  2. **Locomotion Mass**: The waddling approach communicates authentic ponderous mass; footfalls remain grounded without weightless skating.
  3. **Blast Transition**: At zero distance (`bomber-08.png`), the detonation transition occurs cleanly without hitching: the pressurized body disintegrates instantaneously into radiant fire, expanding shrapnel, severed limbs, and scattering gore pellets.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 25. `GP-19970` Live Leaper & Demon Special Score (`handoffs/GP-19970/live-leaper-demon/`)

- **Inspected**: `handoffs/GP-19970/live-leaper-demon/` (`leaper-01..04.png`, `demon-01..06.png`, `run.json`).
- **Scores**:
  - **Live Leaper Leap**:
    - Staging & Readability: **4.5 / 5 (`PASS`)**
    - Ballistic Arc & Mass: **4.5 / 5 (`PASS`)**
    - Timing & Reaction Window: **4.5 / 5 (`PASS`)**
    - Landing Contact: **4.5 / 5 (`PASS`)**
  - **Live Demon Melee Charge**:
    - Staging & Silhouette: **4.5 / 5 (`PASS`)**
    - Flame Mesh Attachment: **5.0 / 5 (`PASS`)**
    - Timing & Anticipation: **4.5 / 5 (`PASS`)**
    - Impact & Contact: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Leaper Airborne Trajectory**: In `run.json`, `leapT` peaks at 0.744s as distance closes rapidly from 8.675m down to 0.88m. Mid-air frames (`leaper-02.png`) show a terrifying forward-diving pounce silhouette with cast ground shadow tracking below. Landing (`leaper-03.png`) transitions cleanly into a grounded four-point crouch beside the player without penetrating terrain.
  2. **Demon Rush & Burning Fists**: In `run.json`, Demon executes a 0.6s `chargeWind` anticipation, rushes forward (`chargeT` = 0.778s), and lands melee impact (`chargeHit: true`) at 1.556m. Throughout the entire sequence (`demon-01` to `demon-06`), both flame meshes remain rigidly and convincingly anchored to the wrists/palms, casting flickering amber light. Ground dust particles reinforce speed and mass.
  3. **Sub-4 Defects**: Zero. All categories pass.

---

## 26. `GP-19970` Live Spider Web Score (`handoffs/GP-19970/live-spider/`)

- **Inspected**: `handoffs/GP-19970/live-spider/` (`spider-01..03.png`, `run.json`).
- **Scores**:
  - **Staging & Silhouettes**: **4.5 / 5 (`PASS`)**
  - **Structure & Posing**: **4.5 / 5 (`PASS`)**
  - **Timing & Anticipation**: **4.5 / 5 (`PASS`)**
  - **Projectile Origin & Readability**: **4.5 / 5 (`PASS`)**
  - **Continuity**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Windup & Anticipation**: In `run.json`, `wind` builds through 0.380s (`t = 27.593`) with `lineClear: true`. In `spider-01.png`, the arachnid raises its anterior leg pair and flares pedipalps, giving distinct telegraphing before release.
  2. **Projectile Release**: At `snap = 0.191s` (`spider-02.png`), the white cone silk projectile launches along line of sight toward the target (`x ≈ 710..845, y ≈ 770..915`), reading cleanly against grass and dirt roads.
  3. **Recovery**: Cooldown resets to 7.453s (`spider-03.png`) as legs plant smoothly back into standard crawl stance without popping or hitching.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 27. `GP-19970` Colossus Hit Mass Rescore (`handoffs/GP-19970/hit-pose/colossus-mass-after/`)

- **Inspected**: `handoffs/GP-19970/hit-pose/colossus-mass-after/` (32 four-light baseline & hit f5/f10/f20 front/gameplay stills, `report.json`), compared against `handoffs/GP-19970/hit-pose/after/colossus-body-hit-f5-gameplay.jpg`.
- **Scores**:
  - **Intention & Staging**: **4.5 / 5 (`PASS`)**
  - **Weight & Timing**: **4.5 / 5 (`PASS`)** *(improved from 3.5 / 5)*
  - **Structure & Balance**: **4.5 / 5 (`PASS`)**
  - **Continuity**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Torso Yaw Dampening**: Damping the Colossus-only torso yaw coefficient from 0.7 down to 0.32 directly resolves the previous 3.5/5 ragdoll snapping defect. In `report.json`, torso yaw measures 0.310 rad (17.8°) at f5 (down from 0.68 rad / 39°), dissipating smoothly to 0.240 rad at f10 and 0.099 rad at f20 across noon, overcast, and dusk.
  2. **Mass Perception**: The reduced torso rotation communicates the authentic momentum and inertia of a multi-ton armored juggernaut absorbing heavy rifle rounds rather than violently twitching like a Shambler.
  3. **Preservation of Hit Reactions**: All limb hit-reactions and the 0.45s recovery curve remain intact without affecting other zombie types.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 28. `GP-19970` Screamer Exposed Howl Pose Score (`handoffs/GP-19970/live-screamer-structure/`)

- **Inspected**: `handoffs/GP-19970/live-screamer-structure/` (`screamer-clay-01.png` through `03.png`, `run.json`).
- **Scores**:
  - **Intention & Staging**: **4.5 / 5 (`PASS`)**
  - **Timing & Anticipation**: **4.5 / 5 (`PASS`)**
  - **Balance & Structure**: **4.5 / 5 (`PASS`)**
  - **Continuity**: **4.5 / 5 (`PASS`)**
  - **Character & Gameplay Silhouette**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Structural Howl Pose**: Neutral clay material inspection confirms clean skeletal anatomy across 18 articulated meshes without joint disarticulation or clipping.
  2. **Pose Dynamics**: In `run.json` at peak scream (`t = 27.644s`, `scream = 0.661s`, `screamer-clay-02.png`), the head extends backward (`rx = -0.449 rad` / -25.7°), the upper torso arches rearward (`rx = -0.269 rad` / -15.4°), and both arms flare outward and back (`left: [0.712, 0.099, -0.937]`, `right: [0.689, -0.099, 0.904]`), presenting an unmistakable primal shriek posture.
  3. **Transition to Sonic Release**: The arched posture smoothly sustains into sonic wave expansion (`open = 0.612` at `t = 30.094s`) and returns seamlessly to locomotion.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 29. `GP-19970` Acid and Web Impact Readability Score (`handoffs/GP-19970/live-projectile-contact/`)

- **Inspected**: `handoffs/GP-19970/live-projectile-contact/` (`spitter-01..04.png`, `spider-01..03.png`, `run.json`).
- **Scores**:
  - **Visual Impact Clarity**: **4.5 / 5 (`PASS`)**
  - **Style & Material Representation**: **4.5 / 5 (`PASS`)**
  - **Gameplay Hazard Readability**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Spitter Acid Impact**: Launched at `t = 27.912s` (`spitter-02-flight.png`), the acid blob strikes the ground at `(0, 8.061)` at `t = 29.418s` (`spitter-03-impact.png`, `spitter-04-impact-close.png`), forming an illuminated, toxic bubbling green puddle. The decal conforms flush to the terrain without clipping or hovering and offers sharp visual contrast against dirt and grass.
  2. **Spider Web Impact**: Launched at `t = 30.301s` (`spider-02-flight.png`), the silk projectile impacts at `(-0.042, 8.747)` at `t = 31.064s` (`spider-03-impact.png`), creating a bright white radial fibrous web snare decal. High luminance ensures instant recognition even in foliage or twilight.
  3. **Sub-4 Defects**: Zero. All categories pass.

---

## 30. `GP-19970` Marine Waist Helper Fit Score (`handoffs/GP-19970/marine-waist-review/`)

- **Inspected**: `handoffs/GP-19970/marine-waist-review/` (20 native Inspector side/back stills across light and full kits, `report.json`), compared with `handoffs/GP-19970/live/marine-after-clean/`.
- **Scores**:
  - **Construction**: **4.5 / 5 (`PASS`)**
  - **Integration & Contact**: **4.5 / 5 (`PASS`)**
  - **Silhouette & Readability**: **4.5 / 5 (`PASS`)**
  - **Materials & Style**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Geometry & Fit**: 2,240 triangles, 6,720 vertices, zero errors across 3 builder checks. The waist helper bridges the pelvis-to-torso transition seamlessly; the tactical belt, magazine pouches, holster, and canteen seat firmly against the uniform without gap openings or hovering.
  2. **Extreme Articulation**: In side and 3/4 rear profiles during extreme gait poses (`crouch-walk f30` and `turn-left f30` at noon), no clipping, tearing, or backface penetration occurs between the belt line and thighs/tunic.
  3. **Materials**: M81 camo webbing, olive-drab pouch canvas, and dark buckles integrate naturally with the marine model across noon and night views.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 31. `GP-19970` Live Drowned Grab Motion Score (`handoffs/GP-19970/live-drowned-grab/`)

- **Inspected**: `handoffs/GP-19970/live-drowned-grab/` (`drowned-01-wind.png` through `06-idle.png`, `run.json`).
- **Scores**:
  - **Intention & Staging**: **4.5 / 5 (`PASS`)**
  - **Timing & Weight**: **4.5 / 5 (`PASS`)**
  - **Balance & Contact**: **4.0 / 5 (`PASS`)** *(Drowned attack 4.5/5; marine victim reaction note)*
  - **Continuity**: **4.5 / 5 (`PASS`)**
  - **Structure & Character**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **Drowned Grab & Drag**: In `run.json`, Drowned advances from 1.95m (`drowned-01-wind.png`), latches onto the victim, and executes a full 3.500m drag (`pulled = 3.5m`, `drowned-02` through `04`). Arm reaching (`arms: [-1.35, -0.1, 0.22]`) and waterlogged dragging posture communicate authentic heavy drag resistance.
  2. **Victim Reaction Analysis (Frame 05)**: In `drowned-05-recover.png`, the marine is in a forced knockdown/seated state where the marine's pelvis sits ~18cm above the ground plane before recovering. This is confirmed as a marine victim knockdown-anchor offset on the player/marine controller side, rather than a Drowned model or motion defect. The Drowned itself remains perfectly grounded (`y = -3.169m`) and balanced throughout recover and idle (`drowned-06-idle.png`).
  3. **Sub-4 Defects**: Zero in Drowned-owned motion. Flagged player/marine victim seat height offset (~18cm in frame 05) for marine motion owner.

---

## 32. `GP-19970` Live Brute Smash Motion Score (`handoffs/GP-19970/live-brute-smash/`)

- **Inspected**: `handoffs/GP-19970/live-brute-smash/` (`brute-01..04.png`, `run.json`), `after/` (`brute-01..04.png`, `after/run.json`), and `near/run.json`.
- **Scores**:
  - **Intention & Staging**: **5.0 / 5 (`PASS`)**
  - **Weight & Timing**: **4.5 / 5 (`PASS`)**
  - **Balance & Structure**: **4.5 / 5 (`PASS`)**
  - **Continuity & Character**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **5.0 / 5 (`PASS`)**
- **Findings**:
  1. **Visual Smash Motion**: The two-handed overhead hammer slam is exceptionally clear and imposing. Windup (`brute-01-wind.png`) elevates arms overhead (`arms: [-2.6, 0, 0.16]`), strike (`brute-02-strike.png`) snaps forward, and the recovery follow-through (`brute-03-recover.png`) shows deep torso flexion (`torso: 0.955 rad` / 54.7°) as both fists slam into the floor plane.
  2. **Range Verification (GB-246)**: The initial baseline whiff at 1.935m occurred because `startRange` (1.95m) exceeded `reach` (1.72m). With Grokbot's GB-246 tuning `startRange` to 1.60m, `after/run.json` confirms natural approach winds at 1.597m, connects solidly (`connected: true` in `after/brute-03-recover.png`), and recovers to idle without hitches.
  3. **Sub-4 Defects**: Zero. All categories pass.

---

## 33. `GP-19970` Live Military Bash Motion Score (`handoffs/GP-19970/live-military-bash/`)

- **Inspected**: `handoffs/GP-19970/live-military-bash/` (`military-01-bashWind.png` through `04-idle.png`, `run.json`).
- **Scores**:
  - **Intention & Staging**: **4.5 / 5 (`PASS`)**
  - **Timing & Weight**: **4.5 / 5 (`PASS`)**
  - **Balance & Contact**: **4.5 / 5 (`PASS`)**
  - **Continuity**: **4.5 / 5 (`PASS`)**
  - **Structure & Character**: **4.5 / 5 (`PASS`)**
  - **Gameplay Readability**: **4.5 / 5 (`PASS`)**
- **Findings**:
  1. **CQB Rifle Butt Strike**: In `run.json`, Military closes to 0.92m, cocks shoulders into aggressive preparation (`bashWind`, `torso yaw: -0.280 rad`), thrusts the rifle butt forward into the target at `t = 28.508s` (`connected: true`, `torso: 0.470 rad`), follows through in `bashRecover`, and resets cleanly to idle.
  2. **Structure & Equipment**: Tactical gear, chest rig, helmet, and limb pads remain solidly bound to the body throughout the aggressive strike without floating or clipping.
  3. **Readability**: Reads immediately as an alert, trained soldier-zombie close-quarters strike, easily distinguished from generic shambling swings.
  4. **Sub-4 Defects**: Zero. All categories pass.

---

## 34. `GP-19970` Final 14-Zombie Construction / Materials / Detail Rescore (`handoffs/GP-19970/final-zombie-atlas/`)

- **Inspected**: `handoffs/GP-19970/final-zombie-atlas/` (140 stills across 14 builders, 4 lights [noon, overcast, dusk, night], front, side, 8m gameplay, and walk f20; `report.json`), compared against `AG-138` baseline defects.
- **Consolidated Builder Scores**:
  1. **Shambler** (`5,048 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Forearm and shin wound decals seated flush; floating jaw/face plates resolved.
  2. **Feral** (`4,820 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **5.0** (`PASS`). Forearm wound strips contoured flush; low quadrupedal predatory silhouette.
  3. **Leaper** (`4,650 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Dorsal spine strip firmly anchored along curved vertebrae without floating pegs; wound strips flush.
  4. **Spider** (`3,794 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Multi-jointed arachnid legs and abdomen mesh integrated with zero unanchored parts.
  5. **Drowned** (`5,708 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Kelp strands and chest washboard ribs follow torso curvature cleanly.
  6. **Military** (`5,976 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Backpack, chest rig, knee and wrist pads sit flush with no floating gaps.
  7. **Brute** (`5,944 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **5.0** (`PASS`). Chest straps and shin guards seated; chest slab fully shaded (no unshaded #000).
  8. **Spitter** (`5,088 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Belly pustules, acid seam, and torn vest flaps conformed to torso curvature (resolved prior 8-12cm floating).
  9. **Screamer** (`5,724 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Facial features and cranial plates fully seated; slender silhouette distinct from all angles.
  10. **Bomber** (`6,328 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **5.0** (`PASS`). Belly geometry smooth without octagonal cone artifacts; harness straps conformed tightly.
  11. **Demon** (`5,672 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **5.0** (`PASS`). Fist flame emitters correctly anchored at wrist/palm joints; horns and back spines cleanly embedded.
  12. **Colossus** (`6,976 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **5.0** (`PASS`). Rear boulder carrier, shoulder pauldron, and thigh plates seated with zero floating sticks.
  13. **Guardian** (`4,180 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Throat/sternum daylight gap bridged without closing cavernous mouth cavity.
  14. **Caveguard** (`4,180 tris`): Construction **4.5**, Materials **4.5**, Detail **4.5**, Silhouette **4.5** (`PASS`). Upper chest splinter plates and throat basket integrated solidly.
- **Summary Verdict**: **ALL 14 BUILDERS PASS D-89 STANDARDS (4.5 / 5 average)**. Zero sub-4 defects across all 140 four-light and gameplay captures.

---

## 35. `GP-19970` Final Three Generic Attack / Death Motion Score (`handoffs/GP-19970/attack-death-survey/{shambler,feral,colossus}/`)

- **Inspected**: Native Inspector surveys across Shambler (31 frames), Feral (31 frames), and Colossus (35 frames extended to f240 settle), `report.json` (zero errors).
- **Scores**:
  - **Shambler Generic Attack & Death**: **4.5 / 5 (`PASS`)**
    - Attack: Asymmetric windup and forward lunge reads clearly with shambling inertia.
    - Death: Clean dismemberment at f20; limbs and head decapitate cleanly; crimson gore particles settle completely to the ground plane by f80.
  - **Feral Generic Attack & Death**: **4.5 / 5 (`PASS`)**
    - Attack: Rapid low-crouch double-swipe provides visceral telegraphing.
    - Death: Torso collapses forward into terrain at f40; severed limbs disperse and settle firmly by f80.
  - **Colossus Generic Attack & Death**: **4.5 / 5 (`PASS`)**
    - Attack: Heavy two-handed downward clubbing strike conveys massive scale and force.
    - Death (Extended Settle): Survey extended to f240 (`corpseT = 3.252s`) captures the complete ballistic trajectory of airborne severed armor boulders and giant limbs, which settle naturally onto the floor plane without clipping through geometry or hovering.
- **Sub-4 Defects**: Zero. All three loops pass D-89 motion standards.

