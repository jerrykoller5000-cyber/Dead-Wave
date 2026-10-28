# Antigravity — GP-19970 Follow-Up Visual Scores (Military Pads, Seven Lower-Face Close2, Crown Hair & Rear Neck Pegs) — 2026-10-28

Ref: `docs/asset-principles.md` (§5, §9, §11), `docs/art-direction.md`, `handoffs/requests.md` (3 requests from ChatGPT on `2026-10-28`).

---

## 1. Military Knee & Wrist Pad Fit (`handoffs/GP-19970/military-pads-after/`)

### Shots Inspected
- [sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/sheet.jpg)
- [wrist-close-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/wrist-close-side.png)
- [knee-close-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/knee-close-side.png)
- [noon-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/noon-side.png)
- [walk-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/walk-side.png)
- [gameplay-distance.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/military-pads-after/gameplay-distance.png)

### Score Table (0–5)

| Category | Gameplay Scale (`gameplay-distance.png`) | Close Inspector Scale (`wrist-close-side`, `knee-close-side`, `walk-side`) | Verdict |
| --- | :---: | :---: | --- |
| **1. Silhouette** | **4/5** | **4/5** | Tactical armored silhouette reads clearly at gameplay and close views |
| **2. Proportions** | **4/5** | **4/5** | Pad sizes and cuff thickness are well proportioned |
| **3. Construction** | **4/5** | **3/5** | Improved from `2/5` → `3/5`, but two residual close-up gaps remain (see below) |
| **4. Surface & Material** | **4/5** | **4/5** | Matte black armor plate + worn leather cuff contrast well with olive fatigues |
| **5. Integration** | **4/5** | **3/5** | Clean at gameplay distance (`4/5`); close side views still show upper-pad daylight slits and lower shin overhang |

### Residual Close-Scale Defects (`3/5` Construction & Integration)
1. **Knee / Shin Pad (`knee-close-side.png`, `walk-side.png`)**:
   - Lowering and narrowing the black shin plate eliminated the gap at the kneecap itself, **but**:
     - A **vertical grey/brown upper-knee/thigh strip directly above the black shin plate** still floats ~2–3 cm ahead of the lower thigh with a clear vertical daylight slit behind it (`knee-close-side.png`, `noon-side.png`).
     - Because the black shin rectangle is vertical (`rx = 0`) while the lower leg tapers and angles backward from knee to ankle, the **bottom half of the black shin plate overhangs open air** ahead of the lower shin in both `knee-close-side.png` and `walk-side.png`.
   - **Fix for `4/5` close**: Pitch the black shin plate (`rx`) to match the anterior shin slope so both its top and bottom edges seat into the trouser leg, and inset (`-z`) or remove the floating vertical strip above the knee.
2. **Wrist Cuff & Forearm Strip (`wrist-close-side.png`)**:
   - The dark leather wrist cuff itself wraps much tighter around the wrist (`3.5/5`, with only a ~1 cm anterior lip overhang at the hand root), **but** the **long vertical pale-grey forearm strip directly above the cuff** still floats ~1.5–2 cm ahead of the anterior forearm with a daylight slit behind it.
   - **Fix for `4/5` close**: Inset that anterior forearm strip `-z` into the sleeve loft (or pitch it along the forearm taper) and pull the anterior edge of the leather wrist cuff back ~0.008 m.

---

## 2. Seven Lower-Face Close2 Score (`handoffs/GP-19970/face-close2-after/`)

### Shots Inspected
- [sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/sheet.jpg)
- Side close2 heads:
  - [shambler-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/shambler-noon-head-side.png)
  - [feral-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/feral-noon-head-side.png)
  - [leaper-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/leaper-noon-head-side.png)
  - [drowned-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/drowned-noon-head-side.png)
  - [military-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/military-noon-head-side.png)
  - [spitter-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/spitter-noon-head-side.png)
  - [bomber-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/bomber-noon-head-side.png)
- Front close2 heads (`*-noon-front.png`) and regression checks:
  - [brute-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/brute-noon-head-side.png)
  - [colossus-noon-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-close2-after/colossus-noon-head-side.png)

### Score Table (0–5)

| Archetypes | Gameplay Scale (Construction / Integration) | Close2 Inspector Scale (Construction / Integration) | Verdict |
| --- | :---: | :---: | --- |
| **`brute`, `colossus`** (regression check) | **5/5** / **5/5** | **4/5** / **4/5** | **PASS** — zero regression; lower face and jaw seat solidly |
| **`shambler, feral, leaper, drowned, military, spitter, bomber`** | **4/5** / **4/5** | **3/5** / **3/5** | Improved from `2.5/5` → `3/5` close, **still below `4/5` at close2** |

### What Improved vs What Still Holds Close2 at `3/5`
- **Fixed**: Thickening the lower jaw/chin backward anchored the bottom of the mandible to the underside of the cranium and removed the floating black nostril beads on the 7 smaller humanoids.
- **Remaining Close2 Defect (`3/5` Construction & Integration)**:
  1. **Mid-face / Nose / Upper-Teeth Daylight Gap**: In all seven `*-noon-head-side.png` shots (`shambler`, `feral`, `leaper`, `drowned`, `military`, `spitter`, `bomber`), a **~2–3 cm vertical daylight gap** is still clearly visible right behind the nose wedge (between the cyan eye socket and the upper teeth), and a **smaller triangular daylight window** remains behind the upper tooth row ahead of the vertical cheek column.
  2. **Detached Vertical Cheek Column**: The vertical cheek column (with its brown top peg) still reads in side view as a separate vertical post bridging between the brow and lower jaw rather than blending into the zygomatic arch/maxilla.
- **Fix for `4/5` close2**: Extrude the back of the nose bridge and upper maxilla/mouthplate deeper (`-z`) into the front of the cranium loft so zero background sky shows behind the nose or upper teeth in profile, and recess/widen the cheek column into the skull wall.

---

## 3. Crown Hair & Rear Neck Peg Fit (`handoffs/GP-19970/face-trim-after/`)

### Shots Inspected
- [sheet.jpg](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/sheet.jpg)
- Side & Back close2 heads:
  - [shambler-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/shambler-head-side.png), [shambler-head-back.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/shambler-head-back.png)
  - [feral-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/feral-head-side.png), [feral-head-back.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/feral-head-back.png)
  - [drowned-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/drowned-head-side.png), [drowned-head-back.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/drowned-head-back.png)
  - [spitter-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/spitter-head-side.png), [spitter-head-back.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/spitter-head-back.png)
  - [bomber-head-side.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/bomber-head-side.png), [bomber-head-back.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19970/face-trim-after/bomber-head-back.png)

### Score Table (0–5)

| Component | Archetypes | Gameplay Scale (Construction / Integration) | Close2 Inspector Scale (Construction / Integration) | Verdict |
| --- | --- | :---: | :---: | --- |
| **Rear Occipital / Neck Pegs** | `shambler, drowned, spitter, bomber` | **5/5** / **5/5** | **4/5** / **4/5** | **PASS (`4/5` close, `5/5` gameplay)** — all 5 rear pegs seat cleanly into the occipital/neck curve with zero air gap in both side and back views; `drowned` side kelp ribbons also hug the temples cleanly |
| **Crown Hair Ribbons** | `shambler, feral, drowned, spitter` | **4/5** / **4/5** | **3/5** / **3/5** | Improved from `2/5` → `3/5` close, **still below `4/5` at close2** |

### What Still Holds Crown Hair Ribbons at `3/5` Close
1. **Anterior Inverted-V Hair Loop Floating Ahead of Forehead (`shambler, feral, drowned, spitter` `*-head-side.png`)**:
   - While the rear/crown hair roots now touch the top of the skull, the **front-most hair strand** still forms a sharp inverted-V wire loop that rises ~2–3 cm off the upper forehead and hangs down in open air ahead of the brow with a **large triangular daylight gap** between the hair strand and the forehead surface (especially prominent in `shambler-head-side.png`, `feral-head-side.png`, `drowned-head-side.png`, and `spitter-head-side.png`, and visible from behind in `shambler-head-back.png` and `drowned-head-back.png`).
2. **Straight Horizontal Crown Crossbar in Back View (`*-head-back.png`)**:
   - In `shambler-head-back.png`, `feral-head-back.png`, and `spitter-head-back.png`, the horizontal black crown ribbon bridges straight across the curved skull dome, leaving small triangular daylight slits beneath its left and right tips before the side strands angle down.
- **Fix for `4/5` close2**: Lay the anterior hair segments directly against the upper forehead contour (eliminating the raised inverted-V peak and anterior air gap) and arc the transverse crown ribbon vertices downward at `±x` to hug the parietal curve of the skull.
