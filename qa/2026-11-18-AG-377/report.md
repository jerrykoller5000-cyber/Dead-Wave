# AG-377 — Spider `naturalleg15` Original vs `death2` Filmstrip Look

- **Date:** 2026-11-18
- **Scope:** Crew-only `D-191` / `D-204` visual QA of existing WebGPU renders in `review/GT-20111/d204/spider-death-retarget-owner-v5/` (`before-native-death-filmstrip-v1.png`, `plan-native-death-filmstrip-v1.png`, and all 12 RAW keyframe PNGs `before/death-frame-{00,10,20,30,43,60}.png` & `plan/death-frame-{00,10,20,30,43,60}.png`), answering ChatGPT 2's request (`LOOK Spider naturalleg15 original-vs-death2 filmstrips; all61 floorcontacts proved, rootseams stillopen`, with `FYI correction BEFORE Spider corpse max14 contacts, not12`). Zero game launches, zero code/test/bar edits.
- **Sheets Built:**
  - `qa/2026-11-18-AG-377/sheet-spider-death2-frames.jpg` (`1160x1480`, `BEFORE` vs `PLAN death2` keyframes `0, 10, 20, 30, 43, 60`)
  - `qa/2026-11-18-AG-377/sheet-spider-death2-closeup.jpg` (`1280x920`, zoomed `f43` & `f60` `BEFORE` thorax/neck piercing vs `PLAN` upright coat-hook legs & open root seams)

## Verified Checks & Counts (Read-Only from `spider-death-retarget-owner-v5` Receipts)
- **`receipt.json`:** `WebGPU`, `sourceStable: true`, `61` death-curl frames (`before` & `plan`), `before` `actorLift: 0.008820 m`, `4,664` triangles / `1` mesh / `hitH: 0.95`.
- **Floor Clearance (`before/native-death.json` vs `plan/native-death.json`):** `61` samples each; `before` `minFloorGap: -0.132034 m` (`-132.03 mm`), `plan` `minFloorGap: +0.000117 m` (`+0.117 mm`).
- **Contacts & Support (`NATIVE-EVERY-DEATH-FRAME-CONTACT-SUPPORT-v3.json`):** `before` `maxNonAdjContacts: 14` across `35` of `61` frames (`floatingParts: 12..22`); `plan` `maxNonAdjContacts: 0` across all `61` frames (`framesWithContacts: 0`), `floatingParts: 12..22` retained on pre-socket `naturalleg15` geometry.

## What Improved Cleanly (`PLAN death2` vs `BEFORE`)
1. **Leg-on-body & leg-on-leg clipping eliminated:** In `before/death-frame-{20,30,43,60}.png`, femurs bundle together and dark lower-leg tips/claws pierce up through the thorax/abdomen/neck junction (`14` max non-adjacent contacts, `-132.03 mm` floor penetration). In `plan/death-frame-{00,10,20,30,43,60}.png`, all `6` legs clear each other and the body (`0` non-adjacent contacts, `+0.117 mm` above floor across `61` frames).
2. **Early collapse (`f00 -> f20`):** Opening the legs outward (`f10 -> f20`) avoids the mid-collapse belly tangle seen in `before/death-frame-20.png`.

## Concrete Visual Findings (`PLAN death2` RAW Evidence — Not Whole-Model Verified)
1. **HIGH (Motion Read / Corpse Pose `f30..f60`) — Knees rest on floor while all six tibias point vertically up like coat-hooks:**
   - **Where:** `review/GT-20111/d204/spider-death-retarget-owner-v5/plan/death-frame-{30,43,60}.png` and `qa/2026-11-18-AG-377/sheet-spider-death2-closeup.jpg`.
   - **What is visible:** After splaying horizontally in `f20`, the femurs angle backward/downward with the knees touching down while all six lower tibias and black curved claws point nearly straight UP into the air around an upright hovering torso (`f43`, `f60` virtually identical). That reads mechanical ("upside-down chair/antler legs") rather than a dead spider; a credible death curl should fold the legs **inward/under** toward the sternum or relax limbs along the ground rather than holding six vertical spikes upright above the carapace.
2. **MODERATE-HIGH (Pre-Socket Root & Neck Gaps `f00..f60`) — Open gaps at neck and proximal femur sockets:**
   - **Where:** `plan/death-frame-{00,10,20,30,43,60}.png` and `sheet-spider-death2-closeup.jpg`.
   - **What is visible:** Because this death retarget test uses pre-socket `naturalleg15` geometry (`floatingParts: 12..22`), visible dark gaps remain at the neck-to-cephalothorax transition and between proximal femur roots and the carapace flanks across every frame. (Socket closure is evaluated separately on `Spider17` in `AG-378`.)
3. **MODERATE (Stiff Forebody) — Head & chelicerae stay hovering level:**
   - **Where:** `plan/death-frame-{43,60}.png`.
   - **What is visible:** Cephalothorax and dark mouth block/chelicerae stay suspended upright off the floor at essentially the same pitch from `f20` through `f60`.
