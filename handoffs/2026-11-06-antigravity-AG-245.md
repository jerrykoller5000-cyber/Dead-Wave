# antigravity — AG-245 Mast Yard Chain-Link Ring and Vine-Grown Gate (D-116) — 2026-11-06
Changed:          Built the modular world fence kit `world/story-fence.js` implementing `buildChainLinkRing(THREE, { pts, gates, heightAt })` and `buildVines(THREE, L)`. Designed for extreme draw efficiency (1.2 speed rule): the entire fence ring merges into exactly 2 draw calls (1 draw for all chain-link fabric using procedural galvanized steel diamond weave texture with alpha cutout, and 1 draw for all tubular steel posts, base footings, dome caps, top rail, bottom tension rail, 45° outrigger barbed arms, and continuous concertina razor ribbon with stamped barbs). Accurately clears gate openings and connects seamlessly to terminal posts. `buildVines` implements the 2-draw per state architecture: `userData.shut` (visible by default) covers the double gate leaves in heavy climbing woody creepers and dense ivy foliage clusters locking the leaves together; `userData.cut` (activated upon 3 machete chops) clears the central corridor for passage with exposed pale sapwood cut cores, dangling limp tendrils, and chopped ground debris. Swapped into `index.html` replacing placeholder builders. Verified with unit tests, headless test suite `tcl303` (44/44 pass), and real WebGPU hardware capture on Jerry's RTX 5080 (4 full-HD 1080p stills and composite contact sheet).
Files:            world/story-fence.js, world/story-fence.test.mjs, index.html, qa/2026-11-06-AG-245/run-ag245.mjs, qa/2026-11-06-AG-245/build-sheets.py, qa/2026-11-06-AG-245/telemetry.json, qa/2026-11-06-AG-245/mast-fence-01-wide.jpg, qa/2026-11-06-AG-245/mast-fence-02-shut.jpg, qa/2026-11-06-AG-245/mast-fence-03-cut.jpg, qa/2026-11-06-AG-245/mast-fence-04-open.jpg, qa/2026-11-06-AG-245/mast-fence-sheet.jpg, handoffs/2026-11-06-antigravity-AG-245.md
Tests:            1. Unit tests (`node world/story-fence.test.mjs`): 3/3 pass in 20ms (verifying material properties, 2-draw ring mesh structure, gate clearance, and vines shut/cut toggle).
                  2. Headless suite (`tcl303`): 44 pass, 0 fail in 51.6s through shared game-test slot (`node tools/tests/run-all.mjs tcl303 --agent antigravity --task AG-245`).
                  3. Real WebGPU hardware verification on RTX 5080 (`qa/2026-11-06-AG-245/run-ag245.mjs`): exit code 0, 0 browser console errors, 4 full-HD 1080p stills captured at noon daylight in first person.
                  4. Python composite generator (`python qa/2026-11-06-AG-245/build-sheets.py`): exit code 0, generated `qa/2026-11-06-AG-245/mast-fence-sheet.jpg` (1968x1424).
Screenshots:      qa/2026-11-06-AG-245/mast-fence-sheet.jpg (1968x1424 4-panel composite contact sheet), qa/2026-11-06-AG-245/mast-fence-01-wide.jpg (1920x1080 wide view at 11.5m), qa/2026-11-06-AG-245/mast-fence-02-shut.jpg (1920x1080 close-up at 2.4m, gate shut with vines), qa/2026-11-06-AG-245/mast-fence-03-cut.jpg (1920x1080 close-up at 2.4m, vines severed), qa/2026-11-06-AG-245/mast-fence-04-open.jpg (1920x1080 close-up at 2.4m, leaves swung open)
Not verified:     Jerry's physical mouse and keyboard feel when running into the mast yard with the machete on Monday (9 November).
Requests:         Claude: `world/story-fence.js` is live and verified on Jerry's RTX 5080. Ready for CL-303 review and GB-288 machete combat animation hookup.
Contract changes: none. Conforms strictly to `buildChainLinkRing(THREE, { pts, gates, heightAt }) -> THREE.Group` and `buildVines(THREE, L) -> THREE.Group with userData.shut and userData.cut`.

---

## 1. Executive Summary & Verification Overview

Under task **AG-245** (fulfilling lead task **CL-303** and Jerry's order **D-116**), we authored the production module `world/story-fence.js` and verified its visual quality and performance on Jerry's `RTX 5080` (WebGPU hardware renderer, 1920x1080, noon daylight `worldTime = 0.50`, Jerry's launcher in First Person).

All four required visual states (`D-114`: short pictures) were captured, audited, and compiled into the composite contact sheet `qa/2026-11-06-AG-245/mast-fence-sheet.jpg`:
1. **Wide Shot (`mast-fence-01-wide.jpg`)**: From 11.5 m back along the trail approach, framing the circular chain-link perimeter fence (`r = 18m`), posts with base plates and dome caps, 45° outrigger barbed arms, continuous helical concertina razor ribbon on top, the radio mast towering inside, and the shut vine-covered gate.
2. **Gate Shut (`mast-fence-02-shut.jpg`)**: Close-up at 2.4 m threshold, showing thick woody creepers and rich ivy leaf clusters overgrown across both gate leaves, firmly binding the double gate shut across `x = 0`. Prompt reads `"E — Cut the vines"`.
3. **Vines Cut (`mast-fence-03-cut.jpg`)**: Close-up at 2.4 m threshold following 3 machete chops. Central corridor (`|x| < 0.26m`) is cleanly severed, displaying pale sapwood cut cores, dangling limp vine tendrils on both leaves, and chopped leaf/wood debris on the ground. Banner reads `"THE MAST GATE OPENS. THE RELAY IS AHEAD."`.
4. **Gate Open (`mast-fence-04-open.jpg`)**: Gate leaves swung wide open inward (`w = 1.00`), path 100% clear into the mast yard with cut vines resting safely on the gate frames.

---

## 2. Technical Architecture & Performance (1.2 Speed Rule)

Per the 1.2 performance principles, scenery and perimeter structures must minimize draw calls and CPU overhead:

| Component | Target Architecture | Implementation Details | Draw Calls |
|:---|:---|:---|:---:|
| **Chain-Link Fence Ring** | Merged BufferGeometry | • `fence-link-mesh`: All chain-link fabric quads along the entire ring merged into a single BufferGeometry with procedural galvanized diamond weave texture (`alphaTest: 0.45`).<br>• `fence-steel-mesh`: All tubular posts, footing plates, dome caps, top rail, bottom tension rail, 45° outrigger arms, and concertina razor wire coils with stamped barbs merged into a single BufferGeometry. | **2 Draws** |
| **Vines: Shut State** | Merged BufferGeometry | • `vines-shut-wood`: All climbing trunks, sinuous branches, and crossing lock brambles merged into one mesh.<br>• `vines-shut-foliage`: All ivy leaf clusters and tendril quads merged into one mesh. | **2 Draws** |
| **Vines: Cut State** | Merged BufferGeometry | • `vines-cut-wood`: Severed woody collars with flat cut faces (pale sapwood cores), hanging limp strands, and ground debris chunks merged into one mesh.<br>• `vines-cut-foliage`: Draping foliage and chopped leaf bundles merged into one mesh. | **2 Draws** |

---

## 3. Telemetry & State Audit

| Shot | Perspective | Distance to Gate | Player Pos `[x, y, z]` | Gate State | Telemetry & Observables |
|:---|:---|:---:|:---:|:---:|:---|
| **1. Wide** | Trail approach | 11.50 m | `[-152.88, 1.53, 25.34]` | `open=false, w=0.00, chops=0` | Continuous fence ring visible; mast tower inside; concertina wire on top rail; gate shut across trail. |
| **2. Shut** | Threshold | 2.40 m | `[-153.03, 0.55, 16.24]` | `open=false, w=0.00, chops=0, vines=true` | Overgrown woody creepers and ivy locking double gate; prompt: `"E — Cut the vines"`; why: `"Vines block the mast gate..."`. |
| **3. Cut** | Threshold | 2.40 m | `[-153.03, 0.55, 16.24]` | `open=true, chops=3, vines=false` | 3 chops executed; center corridor severed; pale wood core cut faces; limp strands hanging; banner displayed. |
| **4. Open** | Threshold | 2.40 m | `[-153.03, 0.55, 16.24]` | `open=true, w=1.00, solids=0, blocks=0` | Double gate leaves swung wide open inward; 100% clear entry path into mast compound. |

---

## 4. Test Verification Summary

1. `world/story-fence.test.mjs`:
   - `getStoryFenceMaterials returns standard materials with valid properties` — PASS
   - `buildChainLinkRing builds a 2-draw merged fence group respecting gate openings` — PASS
   - `buildVines creates a group with userData.shut and userData.cut with merged draws` — PASS
2. `tools/tests/tcl303.js`:
   - 44 checks passed in 51.6s, 0 failures. Fully satisfies all CL-303 gate requirements, chain tools, vine chops, and lock states.
3. Real Hardware RTX 5080 Run:
   - 0 page errors, 60 fps smooth frame delivery, all 4 1080p stills captured cleanly.
