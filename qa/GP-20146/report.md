# QA Eyes Report — GP-20146 Landed Military Live Four-Light Pairs (`AG-327`)

- **Date:** 2026-11-17
- **Inspector:** Antigravity (`Gemini 4 Carbon`)
- **Reviewed set:** `review/GP-20146/d191-military-live-pair-v1/`
  - Pair sheets: `pairs-noon.jpg`, `pairs-overcast.jpg`, `pairs-dusk.jpg`, `pairs-night.jpg`
  - After contact sheets: `after/sheet-noon.jpg`, `after/sheet-overcast.jpg`, `after/sheet-dusk.jpg`, `after/sheet-night.jpg`
  - All 16 after originals (`2048x1024` PNG): `after/{front,side,back,q}-{noon,overcast,dusk,night}.png` (plus all 16 `before/*.png` hashes/luma checked: `0` duplicates, `0` blank frames)
  - Metadata verified: `before/setup.json`, `after/setup.json`, `before/shots.json`, `after/shots.json`, `receipt.json`, `after/receipt.json`
- **QA cropped evidence generated in `qa/GP-20146/`:**
  - `qa/GP-20146/crop-closeups-defects.png` (2x/3x zoomed 6-panel summary of visible defects)
  - `qa/GP-20146/crop-helmet-head.png` (front/side/back/3-4 noon + front night helmet & head)
  - `qa/GP-20146/crop-carrier-torso.png` (front/side/back/3-4 plate carrier, pouches, collar, shoulder seams)
  - `qa/GP-20146/crop-belt-waist-arms.png` (front/side/back/3-4 waist belt, forearm clipping, forearm wound)
  - `qa/GP-20146/crop-legs-boots.png` (front/side/back/3-4 cargo pockets, knee pads, trouser hems, boots)
  - `qa/GP-20146/crop-cold-vs-cache.png` (cold `i=0` MARPAT vs cache `i=1` M81 front & side comparison)

---

## Summary Verdict

**Major visual upgrade over legacy (`5,976 -> 20,314 tris`, `2 draws`), cold/cache parity and 4-light readability PASS, front pouches/MOLLE/knee pads/hip pouch PASS — with 5 visible geometry/clipping/seating issues flagged across `studio/zombie-humanoids.js` and `game/military-appearance.js`:**

1. **[HIGH — `studio/zombie-humanoids.js`] Waist belt overhangs hips & slices through BOTH hanging forearms/elbows** (`front`, `back`, `side`, `q`).
2. **[HIGH — `game/military-appearance.js`] Plate carrier shoulder-strap V-notch gap, stiff upturned neck collar wings, and lower front/back standoff wedges** (`side`, `front`, `q`).
3. **[MEDIUM — `studio/zombie-humanoids.js`] Pale shoulder skin triangles poke through top of blouse sleeves (`front`, `side`, `back`, `q`), plus diagonal button-placket cord bridges open air under front plate** (`side`).
4. **[MEDIUM — `studio/zombie-humanoids.js`] Exposed grey shin skin between trouser hem and boot collar (`back`, `side`), plus hard rectangular decal-like patch around right-forearm wound** (`front`, `q`).
5. **[LOW/MEDIUM — `game/military-appearance.js`] Helmet rear-center hem inverted-V fold/notch (`back`), tight temple/ear rim pinch, and low brow fit** (`front`, `side`, `q`).

---

## 1. What Passes Cleanly

- **Before -> After Comparison (`pairs-{noon,overcast,dusk,night}.jpg`):**
  - Legacy (`before/setup.json`, `5,976 tris`, `2 draws`, `armX -0.4256 / -0.3856`, `headScale [1,1,1]`) showed detached boxy shoulder armor, featureless grey pelvis box, knee gaps, and an oversized head towering over the Marine.
  - Landed military (`after/setup.json`, `20,314 tris`, `2 draws`, `armX -0.2471688`, `headScale [0.76,0.76,0.76]`, `crown 0.2107728`, `hasTorsoFit: true`) aligns proportionally beside the Marine (`armX -0.235`, `54,112 tris / 29 draws` unchanged) with cohesive blouse/trousers, laced boots, tactical kit, and grounded soles.
- **Cold (`i=0`, left) vs Cache (`i=1`, middle) Fit (`crop-cold-vs-cache.png`, `after/setup.json`):**
  - Identical mesh counts (`20,314 tris`, `2 drawables`), `armX -0.2471688`, `headScale [0.76,0.76,0.76]`, `crown 0.2107728`, `hasTorsoFit: true`, and identical kit/helmet/belt/boot placement; only the per-spawn cycled camo pattern (`marpat` on `i=0` vs `m81` on `i=1`, `MILITARY_CAMOS` in `game/military-appearance.js`) differs as intended.
- **Four-Light Readability (`after/sheet-{noon,overcast,dusk,night}.jpg`, 16 PNGs):**
  - Distinct luminance and directional/flashlight response across all four lights with `0` duplicate frames and `0` black/blank frames:
    - `dusk`: mean `38.58..39.71`
    - `overcast`: mean `43.22..43.73`
    - `noon`: mean `46.21..47.92`
    - `night`: mean `50.27..54.18` (cyan eyes, teeth, skin, and olive vest/camo read clearly under flashlight).
- **Front Pouches, Rear MOLLE, Knee Pads, Hip Pouch (`crop-carrier-torso.png`, `crop-legs-boots.png`):**
  - Four front magazine pouches and angled pouch flaps seat flush on the front carrier plate with crisp separation.
  - Three rear MOLLE webbing rows sit flush against the back plate.
  - Knee pads (`front`, `side`, `q`), left hip pouch (`front`, `back`, `q`), and cargo thigh pockets + flaps (`front`, `side`, `back`, `q`) read cleanly without floating off the limb surfaces.

---

## 2. Detailed Visual Findings (With Image & Code Locations)

### Finding 1 (HIGH) — Waist belt overhangs waist and clips directly into both forearms
- **Seen in:** `qa/GP-20146/crop-closeups-defects.png` (panels 2 & 3), `qa/GP-20146/crop-belt-waist-arms.png` (`front`, `side`, `back`, `q`), `after/{front,side,back,q}-noon.png`.
- **What is visible:** The dark brown waist belt extends ~4–5 cm past the waist on both sides (`front` and `back`) and cuts straight into the medial skin of both hanging forearms/elbows. In `side`, the belt sticks straight backward off the curved lower back as a rigid horizontal shelf; in `back`, a pale grey rim peeks right along the top edge of the belt bar.
- **Source cause (`studio/zombie-humanoids.js:829`, read-only inspection):** `military` builds the belt `tube` with `w: .19 * bw0 + .012` (`0.2343` at `bw0 = 1.17`) vs `B.pelvis` waist width `0.158 * 1.17 = 0.1849` (~4.9 cm wider per side, reaching right into the hanging arms at `armX = -0.2472`).
- **Owner:** `studio/zombie-humanoids.js` (`claude3` / `chatgpt`).

### Finding 2 (HIGH) — Plate carrier shoulder-strap step/gap, stiff collar wings, and lower front/back standoff
- **Seen in:** `qa/GP-20146/crop-closeups-defects.png` (panels 1 & 6), `qa/GP-20146/crop-carrier-torso.png` (`front`, `side`, `back`, `q`), `qa/GP-20146/crop-helmet-head.png` (`side`, `q`).
- **What is visible:**
  - **Shoulder join (`side`, `q`):** The top shoulder straps (`fittedCarrierGeometry`, `y0: .43*s`) meet the front/back carrier plates (`y1: .43*s`) with a stepped V-notch gap and floating outer edge over the shoulder seam.
  - **Collar tabs (`front`, `q`):** Left and right upper front carrier corners stick up symmetrically beside the jaw/neck like rigid upturned collar wings with clear air gaps between the carrier rim and the collarbone/throat.
  - **Lower standoff (`side`):** Both the lower front plate (below the chest) and lower back plate flare away from the curved blouse, leaving open wedge shadows underneath.
- **Owner:** `game/military-appearance.js` (`fittedCarrierGeometry`, `chatgpt`).

### Finding 3 (MEDIUM) — Pale shoulder skin triangles poking out + bridging diagonal button-placket cord
- **Seen in:** `qa/GP-20146/crop-closeups-defects.png` (panels 1 & 6), `qa/GP-20146/crop-carrier-torso.png` (`front`, `side`, `back`, `q`).
- **What is visible:**
  - **Shoulder pokethrough (`front`, `side`, `back`, `q`):** On top of BOTH left and right shoulders just outside the carrier straps, a small pale-grey skin vertex/triangle pokes upward through the top of the camo blouse sleeve seam.
  - **Diagonal chest cord (`side`):** A thin tan diagonal rod runs straight across open air from beneath the front carrier plate down to the front belt area (`onTube(tb, [[0, .48], [0, .25], [0, -.04]], .011)` in `studio/zombie-humanoids.js:811`, whose lower segment bridges straight between `y=.25` and `y=-.04` outside the recessed mid-torso).
- **Owner:** `studio/zombie-humanoids.js` (`claude3` / `chatgpt`).

### Finding 4 (MEDIUM) — Exposed ankle skin above boot collar + rectangular forearm wound patch
- **Seen in:** `qa/GP-20146/crop-closeups-defects.png` (panels 2 & 5), `qa/GP-20146/crop-legs-boots.png` (`back`, `side`), `qa/GP-20146/crop-belt-waist-arms.png` (`front`, `q`).
- **What is visible:**
  - **Ankle skin gap (`back`, `side`):** Between the bottom hem of the bloused camo trousers (`lo: -.20`) and the rolled top collar of both tan boots (`-.215`), a jagged band of pale grey shin skin peeks out on both legs (most prominent in `back`, also visible at the front-shin edge in `side`).
  - **Forearm wound patch (`front`, `q`):** On the zombie's right forearm, the `armBite` wound sits inside a sharp pale-white/grey rectangular patch (`woundVariant` on `foreR`/`foreL`) that reads like an unblended square decal on the smooth forearm.
- **Owner:** `studio/zombie-humanoids.js` (`claude3` / `chatgpt`).

### Finding 5 (LOW/MEDIUM) — Helmet rear-center hem fold, tight temple/ear rim, and snug brow fit
- **Seen in:** `qa/GP-20146/crop-closeups-defects.png` (panel 4), `qa/GP-20146/crop-helmet-head.png` (`front`, `side`, `back`, `q`).
- **What is visible:**
  - **Back hem notch (`back`):** The center-back lower rim of the camo helmet folds into a jagged inverted-V peak over the nape.
  - **Temple/ear & brow fit (`front`, `side`, `q`):** The vertical ear-cutout rims hug tightly against the temples/ears with minimal standoff, and the front brow wraps almost flush on the forehead like a cap rather than a proud combat helmet shell (face, teeth, cheek wound, and glowing eyes remain unobstructed).
- **Owner:** `game/military-appearance.js` (`fittedHelmetGeometry`, `chatgpt`).
