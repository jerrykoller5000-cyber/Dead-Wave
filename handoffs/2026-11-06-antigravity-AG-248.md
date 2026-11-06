# antigravity — AG-248 Kiosk Upgrades Comparison Shots (GP-20034) — 2026-11-06
Changed:          Completed live WebGPU hardware verification on Jerry's RTX 5080 for ChatGPT's GP-20034 request. Evaluated kiosk Upgrades and Weapons pages at Day 4 in ungated play vs gated play (?gates=1&chaingates=1). Verified that in ungated play the machete row appears under Upgrades ($85, replaces knife; reach 2.45m, dmg 69), while under ?gates=1 the machete row is 100% absent from the kiosk (STORY_GATES_ON guard). Verified direct purchase attempt via buyMachete() is safely rejected (bank remains unchanged, macheteOwned remains false). Verified chainsaw remains in stock under Weapons at Day 4 in gated play ($190, 'new tonight'). Evaluated visual reflow and interaction: no gaps, blank cards, or layout jitter. Generated side-by-side composite comparison contact sheet (qa/2026-11-06-GP-20034/kiosk-comparison-sheet.jpg). No game code touched.
Files:            qa/2026-11-06-GP-20034/run-gp20034.mjs, qa/2026-11-06-GP-20034/build-sheets.py, qa/2026-11-06-GP-20034/telemetry.json, qa/2026-11-06-GP-20034/ungated-day4-upgrades-full.png, qa/2026-11-06-GP-20034/ungated-day4-upgrades-card.png, qa/2026-11-06-GP-20034/ungated-day4-weapons-full.png, qa/2026-11-06-GP-20034/ungated-day4-weapons-card.png, qa/2026-11-06-GP-20034/gated-day4-upgrades-full.png, qa/2026-11-06-GP-20034/gated-day4-upgrades-card.png, qa/2026-11-06-GP-20034/gated-day4-weapons-full.png, qa/2026-11-06-GP-20034/gated-day4-weapons-card.png, qa/2026-11-06-GP-20034/kiosk-comparison-sheet.jpg, review/GP-20034/kiosk-comparison-sheet.jpg, handoffs/2026-11-06-antigravity-AG-248.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-248 --checks "Capture kiosk upgrades and weapons Day 4 ungated vs gated" -- node qa/2026-11-06-GP-20034/run-gp20034.mjs`): exit code 0, 0 browser console errors, full 1920x1080 captures and modal card crops completed across both modes. Composite sheet assembled via Python Pillow (build-sheets.py).
Screenshots:      qa/2026-11-06-GP-20034/kiosk-comparison-sheet.jpg (1920x1535 3-panel composite comparison sheet), qa/2026-11-06-GP-20034/ungated-day4-upgrades-card.png (900x530 card crop, machete row visible), qa/2026-11-06-GP-20034/gated-day4-upgrades-card.png (900x450 card crop, machete row absent), qa/2026-11-06-GP-20034/gated-day4-weapons-card.png (900x530 card crop, chainsaw row present), qa/2026-11-06-GP-20034/ungated-day4-upgrades-full.png (1920x1080 full in-game view), qa/2026-11-06-GP-20034/gated-day4-upgrades-full.png (1920x1080 full in-game view), qa/2026-11-06-GP-20034/gated-day4-weapons-full.png (1920x1080 full in-game view)
Not verified:     Jerry's physical mouse and keyboard feel when navigating shop tabs in a live match run.
Requests:         ChatGPT: Visual comparison proof and DOM audit complete. Machete appears exclusively in ungated play; gated play removes the row and blocks direct purchase; chainsaw remains stocked on Weapons in gated play. Composite sheet copied to review/GP-20034/kiosk-comparison-sheet.jpg.
Contract changes: none

---

## 1. Executive Summary & Context

Under task **AG-248** (fulfilling ChatGPT's **GP-20034** request for kiosk comparison shots), we captured and analyzed the kiosk UI on Jerry's PC (`RTX 5080`, WebGPU, 1920x1080) at **Day 4** with **$1000 cash** under two runtime modes:
1. **Ungated Play (Standard)**: `index.html?solid=1&debug=1&raf=timer`
2. **Gated Play (Story Gates)**: `index.html?gates=1&chaingates=1&solid=1&debug=1&raf=timer`

Per specification (D-116 and GP-20034 spec):
- Under gated play (`?gates=1`), the machete is a world find (placed in the depot shed by CL-303) and must **not** be sold at the kiosk or issued from the relay vault.
- The chainsaw remains in the kiosk on the Weapons tab in gated play (its conversion to a find is deferred to 1.3).

---

## 2. Visual Findings & Inspection Results

### Upgrades Tab Comparison (Day 4)

| Metric / Check | Ungated Play (Standard) | Gated Play (`?gates=1&chaingates=1`) | Verdict |
|:---|:---|:---|:---:|
| **Total Rows in Upgrades** | 6 rows | 5 rows | **PASS** |
| **Machete Row Status** | **Present** (Row 2)<br>• Name: `Machete`<br>• Tag: `replaces the knife`<br>• Desc: `A heavier blade for F: 2.45m reach and 69 damage (knife: 2.4m, 26). Narrower swing, up to 3 targets, slightly quicker recovery.`<br>• Button: `$85` (Enabled) | **Completely Absent**<br>• 0 occurrences across all `#shopList` rows.<br>• Filtered out by `!STORY_GATES_ON` runtime condition. | **PASS** |
| **Other Upgrade Rows** | 1. Field Intel ($120)<br>2. Machete ($85)<br>3. Pistol pair (akimbo, $120)<br>4. Pistol extended mag ($45)<br>5. Pistol suppressor ($40)<br>6. Pistol auto sear ($70) | 1. Field Intel ($120)<br>2. Pistol pair (akimbo, $120)<br>3. Pistol extended mag ($45)<br>4. Pistol suppressor ($40)<br>5. Pistol auto sear ($70) | **PASS** |
| **Direct Purchase Guard** | N/A (purchasable) | `T.buyMachete()` tested:<br>• Initial cash: $1040<br>• Final cash: $1040 (unchanged)<br>• `macheteOwned`: false (not granted) | **PASS** |
| **Visual Reflow & Layout** | Clean vertical stacking; scroll height fits without clipping. | Clean vertical stacking; no blank spaces, orphan dividers, or displaced scroll position. | **PASS** |

### Weapons Tab Verification in Gated Play (Day 4)

| Metric / Check | Gated Play (`?gates=1&chaingates=1`) | Verdict |
|:---|:---|:---:|
| **Chainsaw Row Status** | **Present** (Stocked Night 4)<br>• Name: `Chainsaw`<br>• Tag: `new tonight`<br>• Desc: `No ammo, just gas. Hold to cut.`<br>• Price: `$190`<br>• Element: `[data-weapon="chainsaw"]` | **PASS** |
| **Purchasability** | Fully interactive button enabled with $1000 bank. | **PASS** |

---

## 3. Visual & Interaction Audit

1. **Reflow & Alignment**: When the machete row is omitted under gated mode, the subsequent item (`Pistol pair akimbo`) shifts up seamlessly. The list height adjusts without leaving an empty slot or awkward gap.
2. **Navigation & Tab State**: Switching between the `loadout` groups (`weapons` and `upgrades`) via `setShopTabDbg` operates without console errors or visual flickering.
3. **Responsive Box Model**: Bounding box for `#shop .card` measures consistently (~720px width on 1920x1080 display) in both configurations.
4. **Artifacts Produced**:
   - Composite Contact Sheet: `qa/2026-11-06-GP-20034/kiosk-comparison-sheet.jpg` (also copied to `review/GP-20034/kiosk-comparison-sheet.jpg`).
   - Detailed DOM Telemetry: `qa/2026-11-06-GP-20034/telemetry.json`.
   - Full 1080p and card crop PNGs for both runs in `qa/2026-11-06-GP-20034/`.
