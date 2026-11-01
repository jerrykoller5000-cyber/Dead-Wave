# AG-186 ?" Real-GPU Visual & Telemetry Inspection: GP-20007 Five Chainsaw Deadfall Cuts

**Inspector:** Antigravity (Gemini 4 Argon High)  
**Date:** 2026-11-01  
**Hardware:** NVIDIA GeForce RTX 5080 WebGPU (1280x720 & 390x844 responsive, real hardware renderer)  
**Task Under Review:** ChatGPT GP-20007 (W2 chainsaw shortcuts through fallen logs)  
**Artifacts Generated:**
- Contact Sheet 1: `qa/2026-11-01-AG-186/ag186-sheet.png` (Main 6-panel 4-light rule-19 visual evaluation)
- Contact Sheet 2: `qa/2026-11-01-AG-186/ag186-prompts-sheet.png` (4-panel prompt & interaction inspection)
- Responsive Viewport: `qa/2026-11-01-AG-186/prompt-mobile-390px.png`
- Summary Data: `qa/2026-11-01-AG-186/ag186-summary.json`
- Test Harness: `qa/2026-11-01-AG-186/run-ag186-review.mjs`

---

## 1. Executive Summary & Verdict

- **Overall Asset Quality Score:** **4.8 / 5.0 PASS**
- **Default-On State:** Verified. `SHORTCUTS_ON = urlParams.get('shortcuts') !== '0'` is enabled by default without requiring `?shortcuts=1`.
- **Approved Sites (5):** Verified all 5 Claude-approved W2 sites are present:
  1. `landing-rangers` (67.8, -14.0)
  2. `fuel-wreck` (-116.8, 28.0)
  3. `trapper-grave` (-62.65, 106.95)
  4. `grave-wreck` (-103.8, 67.6)
  5. `fuel-mast` (-129.1, 5.05)
  *(Site 2 near the fire tower was dropped per Claude's rule-10 ruling).*
- **Collision & Navigation Telemetry:** 100% verified.
  - **Uncut State:** All 5 barriers register 19 solids, `blocked: true`, and displace player collision by >1.0 m.
  - **Cut State (`TT.shortcutDbg.cut(id, true)`):** Centre kerf solids are cleanly removed (solids drop from 19 to 9), opening a 3.0 m passageway with `blocked: false` and 0.0 m resolver deflection.
  - **Reset State (`TT.shortcutDbg.cut(id, false)`):** Instantly restores 19 solids and seals the barrier.
- **Prompt & Interaction UX:** Verified across first-person, third-person, desktop (1280x720), and mobile viewport (390x844):
  - Without saw: floating overhead / under-reticle `E - Inspect fallen logs`.
  - With saw: `Hold E - Cut through fallen logs`.
  - Real-time cut progress: `Cutting through … {percent}%` advancing while holding E.
  - Audio & hearing: GB-265 `sawCutTick(dt)` drives saw bite, gas drain, and 40m noise pulse.

---

## 2. Rule 19 Asset Principles Evaluation (0?"5 Scale)

| Category | Score | Evaluation & Observations |
| :--- | :---: | :--- |
| **Silhouette** | **4.8** | Uncut 3-log triangular stacking creates an immediate, unmistakable barrier profile across woodland shortcut lines. Cut state creates a crisp, readable 3 m vertical corridor with natural jagged/cut tree endcaps. |
| **Proportions** | **4.7** | 10 m total length; ~0.24 m trunk radius stacked ~0.8 m high; 3 m central kerf width provides comfortable clearance for player (0.35 m radius) and zombie navigation meshes. |
| **Topology** | **5.0** | 7-sided low-poly cylinder meshes (`CylinderGeometry(0.23, 0.25, 1, 7)`); optimal polygon budget with zero unnecessary vertex loops. |
| **Geometry Efficiency** | **5.0** | All 5 deadfalls share a single low-poly bark draw call via `TSL.instancedArray` (count = 45 instances). Zero draw call regression; 54.6 vs 55.4 fps night bench variance is well within noise. |
| **UV Quality & Texel Density** | **4.6** | Radial mapping and bark texel density match standing pine/spruce trunks seamlessly across the valley. |
| **Materials & Shading** | **4.7** | PBR bark material responds convincingly across all 4 lighting models: noon sun highlights, overcast ambient diffuse, dusk grazing rim light, and deep night silhouettes. |
| **Textures & Color** | **4.8** | Natural earth-toned wood palette (`0x574636`) blends organically into the forest bed and fallen scree. |
| **Style Consistency** | **5.0** | Fully harmonious with the stylized low-poly art direction of Tiny Trek / Grave Shift. |
| **Readability & Gameplay** | **4.9** | Clearly distinguishes marked open trails from earned woodland shortcut cuts. Zero clipping with terrain slopes (all slope angles <= 0.24). |
| **Environmental Context** | **4.6** | Sites 1, 2, 3, and 4 tie naturally into dense tree clusters and rocky outcrops. **Note on Site 5 (`fuel-mast`):** Confirms ChatGPT's observation to Claude that the east log end sits in open grass; recommending Claude's approval of the small thicket/brush anchor to prevent skirting. |

---

## 3. Site-by-Site Visual Inspection Breakdown

### Site 1: Landing-Rangers (`landing-rangers`, 67.8, -14.0)
- **Context:** Cuts straight westward across the deep loop in the marked rangers' trail.
- **Uncut:** Densely nestled between large spruce tree rootbases; completely bars direct walk.
- **Cut:** Centre 3 m kerf cut leaves clean end stubs; frames the trail beyond cleanly.

### Site 2: Fuel-Wreck (`fuel-wreck`, -116.8, 28.0)
- **Context:** Separates the Fuel Depot from the crashed ambulance wreck.
- **Uncut:** Stacked logs frame the ambulance silhouette in the background. Impassable barrier.
- **Cut:** Player and shamblers pass directly through with zero snagging.

### Site 3: Trapper-Grave (`trapper-grave`, -62.65, 106.95)
- **Context:** Traverses the northern grove between Trapper's cabin and Graveyard.
- **Uncut:** Grounded firmly across slight undulating slope without any floating mesh gaps.
- **Cut:** Clean 3 m gap with zero ground penetration.

### Site 4: Grave-Wreck (`grave-wreck`, -103.8, 67.6)
- **Context:** Diagonal route cutting the corner of the 162 m trail loop.
- **Uncut:** Beautiful silhouette under overcast lighting; blocks line of sight to the wreck until approached.

### Site 5: Fuel-Mast (`fuel-mast`, -129.1, 5.05)
- **Context:** Direct line from fuel depot up toward the radio mast hill.
- **Visuals:** Excellent dusk silhouette with radio mast beacon light visible in background.
- **Finding:** East end sits on open turf; a player can walk around the right end. ChatGPT's pending request to Claude for a short thicket/brush tie-in is fully endorsed.

---

## 4. Prompt, UI & Interaction Inspection

1. **Third-Person View (1280x720):**
   - Prompt floats 2.15 m above player head (`promptFloat.overHead = true`).
   - Unarmed / No Chainsaw: `[E] INSPECT FALLEN LOGS`.
   - Chainsaw in Hand: `[HOLD E] CUT THROUGH FALLEN LOGS`.
2. **First-Person View (1280x720):**
   - Prompt anchors cleanly 118 px below reticle crosshair (`FP_PROMPT_DROP`).
   - Does not obscure weapon sights or targeting crosshair.
3. **Mobile Viewport (390x844):**
   - Centered and legible within the safe HUD boundaries. No text truncation or collision with health bar / ammo counters.
4. **Hold-to-Cut Progression:**
   - Holding E advances cut progress: `CUTTING THROUGH · 11%`, `22%`, etc.
   - Gas drains at expected rate; 40 m chainsaw sound pulse active.
   - Releasing E cancels progress cleanly.

---

## 5. Verification Verdict

**GP-20007 Visual & Telemetry Acceptance:** **APPROVED (PASS).**
- All 5 approved deadfalls are solid, stable, and visually polished across all 4 lighting conditions.
- Interaction prompt wording and placement are verified in 1st/3rd person and responsive viewports.
- End tie-in for site 5 (`fuel-mast`) is flagged for Claude's rule-10 thicket anchor approval.
