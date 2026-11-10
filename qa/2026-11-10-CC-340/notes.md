# CC-340 Visual Verification & Frame-Time Report (RTX 5080 WebGPU)

- **Agent:** Antigravity (Gemini 4 Carbon)
- **Date:** 2026-11-10
- **Status:** DONE
- **Hardware:** NVIDIA GeForce RTX 5080 (WebGPU Direct3D11)
- **Output Directories:** `review/CC-340/` and `qa/2026-11-10-CC-340/`

## 1. Marine Inspector Verification (48 PNGs)
- **Presets Tested:**
  - `issue` kit (fatigues, boonie hat, belt/pouches, combat boots)
  - `full` kit (MICH helmet with NVG mount/straps, tactical vest, plate carrier, elbow/knee pads)
- **Cameras:**
  - Close on Head (`FOV 34°`, `dist 0.70 m`, `pitch 4°` centered on head pivot)
  - Gameplay Scale (`FOV 42°`, `dist 4.30 m`, `pitch 8°` centered on mid-body)
- **Angles:** Front (`yaw 0°`), Three-Quarter (`yaw 38°`), Side (`yaw 90°`)
- **Lighting Conditions (all 4 lights verified non-blank, mean luma >= 54):**
  - `noon` (sun intensity 2.1, warm 0xfff3dc, luma ~84)
  - `overcast` (sun 0.65, cool diffuse 0xd4d7de, luma ~88)
  - `dusk` (sun 1.45 low angle, golden amber 0xffb07a, luma ~71)
  - `night` (ambient + directional moonlight, luma ~54, zero blackout)

### Visual Findings:
1. **Head & Neck Anatomy:** The 7.5-head anatomical proportions read cleanly. The neck cylinder connects seamlessly to the trapezius line without floating seams or disjointed collars across all yaw angles.
2. **Helmet & Boonie Hat Seating:** The MICH helmet sits squarely on the cranium without slicing through the brow or ear cavities. The chinstrap wraps flush along the jawline. The boonie hat brim maintains natural clearance above the eyebrows.
3. **Third-Person Stance:** In the standard idle/stand pose (`y = 0 m`), boot soles contact the studio grid plane evenly (no sunken ankles or floating toe caps).

## 2. HQ Roof Survivors at Gameplay Distance (7 PNGs)
- **Overview in 4 Lights:** `roof-all-three-noon.png`, `roof-all-three-overcast.png`, `roof-all-three-dusk.png`, `roof-all-three-night.png`
- **Per-Survivor Gameplay Distance Shots:**
  - `roof-okafor-gameplay-noon.png` (Okafor alert at north sandbag parapet)
  - `roof-brandt-m240-gameplay-noon.png` (Brandt manned behind M240 sandbag mount)
  - `roof-pike-gameplay-noon.png` (Pike watchful at west perimeter)
- **Visual Findings:** All three roof survivors render with correct anatomical proportions at distance, standing upright at their posts. Sandbag parapet contact is clean with zero floating bodies or geometry penetration into the roof deck.

## 3. 48-Zombie Night 20 Benchmark (`tools/bench.mjs --night 20 --gfx high --seconds 25 --prof`)
- **Mean FPS:** `51.2 fps` (window of last 10s under full 48-zombie combat push)
- **1% Low:** `37.6 fps`
- **Worst Frame:** `34.0 ms`
- **Hitches (>50ms):** `0`
- **Draw Calls:** `208`
- **Triangles:** `525,342`
- **GPU Frame Time:** `0.22 ms` (RTX 5080 WebGPU)
- **Comparison:** Clean performance well within 1.0 budgets; 0 pipeline compilation spikes, 0 new texture builds.
