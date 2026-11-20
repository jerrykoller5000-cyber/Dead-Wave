# Antigravity — J167 LANDED Brute Step 1 Visual Eyes Report — 2026-11-18

**Reviewed set:** `review/GT-20111/d201/brute-step1-landed-full-owner-v1/` (`owner-v1` 5080 WebGPU capture; no duplicate GPU run performed)
**Verified live anchor:** `studio/zombie-brute.js` SHA256 `7d30b0b43dce753e2f2cf3dcfd8daaba54327a5be0d13a5d1752752e48307f24`, `index.html` MD5 `668e97a30bb7ebea96e87da21ff45736` (`sourceStable: true`, `bruteModuleOverride: false`, `15,734` tris, `1` draw, `hitH: 2.829`).

## Findings (All 28 frames verified unique 1280x900; sheets + key originals inspected)
1. **Rear straps & posterior neck contour (PASS in scoped step 1 across all 4 lights):** Compared against `AG-352` BEFORE (`48a2eb50`, same `668e` index/camera/pose), the former free pointed rear strap tabs are gone in `back-{noon,overcast,dusk,night}` (`diffPct 0.565%..0.780%`) and `side-{noon,overcast,dusk,night}` (`0.215%..0.287%`). Rear straps follow the curved trap hood and seat flush onto the metal back plate.
2. **Raised traps & accepted face (PASS):** Head sits naturally between the raised traps (flat lollipop neck shelf eliminated; posterior notch filled). Accepted face (`head-front-*`, `head-threequarter-*` across Noon/Overcast/Dusk/Night) remains clear and unobstructed.
3. **Unchanged out-of-scope caveats (retained honestly, NOT claiming full-asset acceptance):**
   - Front-right chest-strap corner still flares sharply outward at the chest-plate upper edge (`head-threequarter-noon.png`, `head-threequarter-night.png`).
   - Raised traps still read as thick rounded side lobes (`head-threequarter-*`, `front-*`) with a vertical posterior cleft (`back-*`).
   - Later-step body limbs, waist skirt, boots, and palms remain unfinished; static held-pose photography does not validate motion, floor contact, or FPS. Native `t222` `11/1` Feral chest-miss red remains pending Director triage.

## Sheets & Artifacts
- [sheet-j167-brute1-landed.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-18-j167-brute1-landed/sheet-j167-brute1-landed.jpg) — Independent J167 Brute Step 1 landed sheet (Noon, Night, Silhouettes, Head Closes).
- [crop-j167-brute1-before-vs-landed.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-18-j167-brute1-landed/crop-j167-brute1-before-vs-landed.png) — Tight BEFORE (`48a2eb50`) vs LANDED (`7d30b0b4`) crops across all 4 lights (Back, Side, Head Front, Head 3/4).
- [frame-check.json](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-18-j167-brute1-landed/frame-check.json) — 28/28 unique MD5s and pixel diffs vs `48a2eb50`.
