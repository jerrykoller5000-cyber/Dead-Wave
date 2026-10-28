# antigravity — AG-134 The Hollows on the GPU in third person, and the spare board (CL-259) — 2026-10-26
Changed:          Walked the rebuilt iron warren (`CL-259`) from the mouth through the galleries, narrows, ramps, and the Deep in third- and first-person on Jerry's RTX 5080 WebGPU renderer (`117–174 fps`), modeled the relay's spare board as a belt-carried prop (`hush.board === 'carried'`, folded to 1 draw, `proxySkip = true`) and wired atop the HQ radio set (`hush.board === 'wired' || hush.owned`, folded to 2 draws with its cyan phase-lock LED), and verified `CL-263-world` (Night 2 unpowered dark HQ vs poured generator can, and Clarke's truck headlamp at night).
Files:            index.html, qa/2026-10-26-AG-134/capture-ag134.mjs, qa/2026-10-26-AG-134/report.json, qa/2026-10-26-AG-134/cl259-warren-3p-1p-sheet.jpg, qa/2026-10-26-AG-134/ag134-hush-props-and-cl263-sheet.jpg
Tests:            node crew/crew.mjs slot run antigravity AG-134 → t302 (17 pass, 0 fail), t303 (13 pass, 0 fail), t215 (4 pass, 0 fail); 0 page errors
Screenshots:      qa/2026-10-26-AG-134/cl259-warren-3p-1p-sheet.jpg, qa/2026-10-26-AG-134/ag134-hush-props-and-cl263-sheet.jpg, qa/2026-10-26-AG-134/hush-radio-before-none-noon.png, qa/2026-10-26-AG-134/hush-carried-belt-noon.png, qa/2026-10-26-AG-134/hush-carried-belt-overcast.png, qa/2026-10-26-AG-134/hush-carried-belt-dusk.png, qa/2026-10-26-AG-134/hush-carried-belt-night.png, qa/2026-10-26-AG-134/hush-wired-radio-noon.png, qa/2026-10-26-AG-134/hush-wired-radio-overcast.png, qa/2026-10-26-AG-134/hush-wired-radio-dusk.png, qa/2026-10-26-AG-134/hush-wired-radio-night.png, qa/2026-10-26-AG-134/warren-3p-1-mouth-entry.png, qa/2026-10-26-AG-134/warren-1p-1-mouth-entry.png, qa/2026-10-26-AG-134/warren-3p-2-tunnel-nearwall.png, qa/2026-10-26-AG-134/warren-1p-2-tunnel-nearwall.png, qa/2026-10-26-AG-134/warren-3p-3-gallery-chamber.png, qa/2026-10-26-AG-134/warren-1p-3-gallery-chamber.png, qa/2026-10-26-AG-134/warren-3p-4-ramp-d1-d2.png, qa/2026-10-26-AG-134/warren-1p-4-ramp-d1-d2.png, qa/2026-10-26-AG-134/warren-3p-5-narrows-chamber.png, qa/2026-10-26-AG-134/warren-1p-5-narrows-chamber.png, qa/2026-10-26-AG-134/warren-3p-6-ramp-d2-d3.png, qa/2026-10-26-AG-134/warren-1p-6-ramp-d2-d3.png, qa/2026-10-26-AG-134/warren-3p-7-deep-chamber.png, qa/2026-10-26-AG-134/warren-1p-7-deep-chamber.png, qa/2026-10-26-AG-134/cl263-night2-hq-unpowered.png, qa/2026-10-26-AG-134/cl263-night2-hq-powered.png, qa/2026-10-26-AG-134/cl263-truck-night-chained-dark.png, qa/2026-10-26-AG-134/cl263-truck-night-cut-headlamp.png
Not verified:     None.
Requests:         Replied DONE to Claude's "The Hollows on the GPU, and the spare board (AG-134, from CL-259)" request.
Contract changes: none

## 1. Hush Spare Board Props (`carried-hush-board` & `hq-hush-board`, `CL-259`)

- **Art Direction Family (`docs/art-direction.md`, Rule 19):** Military family (`0x46523c` anodized olive card tray, `0x2d4a2b` dark fiberglass PCB, `0xc49a42` brass standoffs and edge pins, `0xb86f38` copper-wound toroidal phase-inversion coil, `0x8a9094` twin silver HC-49 crystal oscillator cans, `0x1d2022` ceramic DIP ICs, and `0x9a7836` axial filter capacitors).
- **Carried Spare Board (`carried-hush-board` on `marine.userData.lowerBody`):**
  - Clipped at the marine's left utility belt (`(0.215, 0.77, -0.045)`, rotated to sit flush beside the frag grenades and canteen).
  - Folded via `foldStatic(THREE, TSL, hushCarriedBoard)` into **1 draw call** (`carriedDraws: 1`) and excluded from the marine shadow proxy (`proxySkip = true`).
  - Visible only while `hush.board === 'carried'` (`noneState.carriedVis = false`, `carriedState.carriedVis = true`, `wiredState.carriedVis = false`).
- **Wired Spare Board (`hq-hush-board` on `hq-radio-set`):**
  - Mounted on a dark steel L-bracket atop the right deck of `hq-radio-set` (`(0.125, 0.195, 0.118)`), with a red phase-inversion jumper lead routed along the left bezel rim down into the front signal jack (`-0.162, -0.072, 0.246`), a black power lead routed into the 24V battery box, and a cyan phase-lock indicator LED (`0x7fd4ff`, emissive `0x4bb8ff` at `1.35`).
  - Baked and folded inside `makeHouse` into **2 draw calls** (`wiredDraws: 2`: 1 vertex-color folded mesh + 1 emissive LED mesh).
  - Visible when `hush.board === 'wired' || hush.owned` (`noneState.wiredVis = false`, `carriedState.wiredVis = false`, `wiredState.wiredVis = true`).

### Rule 19 Asset Score Table (0–5)

| Asset | Family | Silhouette | Material Contrast | Context & Scale | 4-Light Readability | Draw Budget | Score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `carried-hush-board` (belt prop) | Military | **5/5** (distinctive angled PCB tray + toroid ring + crystal cans on left hip) | **5/5** (matte fiberglass PCB vs specular copper coil, silver cans, and brass pins) | **5/5** (sits naturally on left utility belt beside frag grenades without clipping) | **5/5** (`noon`, `overcast`, `dusk`, `night`) | **5/5** (`1` draw, `proxySkip`) | **5/5** |
| `hq-hush-board` (wired on `hq-radio-set`) | Military | **5/5** (L-bracket daughterboard + perimeter red jumper lead + cyan LED) | **5/5** (copper toroid, olive tray, red insulation, and cyan phase-lock LED) | **5/5** (leaves the `148.625 MHz / CALLSIGN: HERON` dial glass 100% unobstructed) | **5/5** (`noon`, `overcast`, `dusk`, `night`) | **5/5** (`2` draws) | **5/5** |

---

## 2. The Hollows Iron Warren in 3P & 1P on RTX 5080 (`CL-259`)

Walked all 17 route cells from the Depth 1 Mouth (`y = -400 m`) through the Galleries, Ramp 1 (`-400 → -404 m`), the Depth 2 Narrows, Ramp 2 (`-404 → -408 m`), and the Depth 3 Deep chamber (`y = -408 m`, ore cart, strongbox, and rune door) on Jerry's NVIDIA GeForce RTX 5080 (`117–174 fps`, `214–371 draws`).

### Answers to Claude's Three Questions (`AG-134`)
1. **Does the warren read in the dark?**
   - **Yes (`5/5` for corridors, props, and chambers; `4/5` for the unlit rune door slab):** The `3.4 m`-high tunnels (`6.5 m` in chambers) with timbered sets (`0x443222`), floor planes (`0x26211e`), PGB `FOB THRESHOLD` crates (`0x3e4a35`), iron rails, ore cart, iron ramp gates, strongbox on its stone plinth, and sleeping zombies/cocoons read clearly in both 3P and 1P.
   - **One minor visual note:** In `warren-3p-7-deep-chamber.png`, the sealed rune door slab (`78, -408, 41.3`) is dark stone/iron against the dark rear chamber wall (`0x1b1614`), so from `4 m` back in 3P without the flashlight or active rune glow it blends closely into the wall behind the ore cart.
2. **Does the marine crowd the frame when he's near a wall?**
   - **Only right at the entry mouth back wall (`camDist = 0.83 m`); clear everywhere else (`4/5`):**
     - At the entry spawn (`51, -400, 1.2`, with the mouth's rear rock wall at `z = 0`), `belowCamOpen` pulls the 3P camera in to `camDist = 0.83 m`, `camAboveFloor = 1.82 m` (`warren-3p-1-mouth-entry.png`). There his upper back and cap occupy ~45% of the center frame height while looking down at ~28° pitch, though the timbered portal ahead remains visible.
     - Stepping `1–2 m` forward or hugging a tunnel side wall (`warren-3p-2-tunnel-nearwall.png`, `x = 52.05`), the 3P camera stays at `camDist = 3.61–4.15 m` (`camAboveFloor = 2.60–2.62 m`) and the marine takes ~22% of frame height with zero wall clipping.
3. **Does the camera pull in smoothly when he turns a corner?**
   - **Yes (`5/5`):** Across 204 continuous 3P walk steps through all 17 cells (`mouth → tunnels → chambers → ramps → deep`) and a 60-step 360° corner orbit sweep (`warrenWalk.walk3P` in `report.json`), `outOfOpenCount = 0` (`belowCamOpen` stayed `true` on 100% of frames), `poppedUpCount = 0` (the player never popped up to the surface), `minRoofMargin = 0.70 m` (always at least `70 cm` below the tunnel/chamber ceiling), and the 10-step binary search in `OTS` (`belowCamOpen`) pulls the camera in and out smoothly without ever clipping outside rock walls or above the roof.

### Rule 18 Camera & Motion Score Table (0–5)

| Check | Readability | Wall / Roof Clearance | Corner Pull-In Smoothness | Gameplay Framing (3P & 1P) | Score | Defects Named |
| --- | --- | --- | --- | --- | --- | --- |
| Iron Warren 3P Walk (`CL-259`) | **5/5** | **5/5** (`outOfOpen = 0`, `minRoofMargin = 0.70 m`) | **5/5** (binary search pull-in, no wall/roof pop) | **4/5** | **4.5/5** | At entry spawn (`z = 1.2`, `0.83 m` from rear wall), marine fills ~45% of center frame until he steps forward; unlit rune door slab in Deep is low-contrast against rear wall from `4 m`. |
| Iron Warren 1P Walk (`CL-259`) | **5/5** | **5/5** (`camAboveFloor = 1.44–1.62 m`, `open = true`) | **5/5** | **5/5** | **5/5** | None. |

---

## 3. `CL-263-world` GPU Verification (`t303`)

- **Night 2 HQ Power (`cl263-night2-hq-unpowered.png` vs `cl263-night2-hq-powered.png`):**
  - Unpowered (`powered = false`): `flood = 0`, `beacon = 0`, `bay = 0.04` (in prep; `0.28` dim red battery fallback during alarm lockdown), and roof exhaust fans stand still.
  - Fuel Can Poured (`powered = true`): lamps stutter (`1.27 s` flicker window verified in `t303`), then `flood = 2.4` and `bay = 1.64` bathe the `DEADWALKERS` facade and HQ yard in warm sodium-amber light.
- **Clarke's Truck Headlamp at Night (`cl263-truck-night-chained-dark.png` vs `cl263-truck-night-cut-headlamp.png`):**
  - Chained (`unlocked = false`): `truckLamp = false`, right headlamp lens is dark.
  - Chain Cut (`unlocked = true`): `truckLamp = true`, the right headlamp lens (`0xfff0c2`) glows brightly and casts its warm light pool (`0xffe6b0`) across the road and grass ahead of the wreck.

## 4. Rule 16 Queue Compliance
All browser captures and test runs (`t302`, `t303`, `t215`) were executed in a single headless session through `node crew/crew.mjs slot run antigravity AG-134`.
