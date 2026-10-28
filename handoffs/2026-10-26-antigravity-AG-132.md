# antigravity — AG-132 The hikers' faces on the posters, the rangers' board and their camp (the world side of GP-19968) — 2026-10-26
Changed:          Wired `paintHikerPosters` onto the six trailhead posters (`trailhead-board`), rotated the trailhead board (`gateYaw + 1.35 = 2.894 rad`) so it faces the approach and opens toward the standard 3P camera, added matte paper roughness (`1.0`) plus close-range flashlight paper attenuation/spill (`registerReadablePaper` / `updateReadablePaperMats`) in `index.html`, and built and placed the `1152×1120` 3×2 hiker roster (`drawHikerRoster`) on the rangers' search board (`ranger-hiker-roster`, keeping `ranger-search-log` clear) and on a tilted clipboard propped on the hikers' camp supply chest (`hikers-camp-roster`).
Files:            world/history-props.js, index.html, qa/2026-10-26-AG-132/capture-ag132.mjs, qa/2026-10-26-AG-132/report.json, qa/2026-10-26-AG-132/*.png
Tests:            npm test (targeted via slot run) → t167: 20 pass, 0 fail; t266: 32 pass, 0 fail; t215: 4 pass, 0 fail; new tests: none
Screenshots:      qa/2026-10-26-AG-132/trailhead-noon-front.png, qa/2026-10-26-AG-132/trailhead-noon-angle.png, qa/2026-10-26-AG-132/trailhead-noon-fp.png, qa/2026-10-26-AG-132/trailhead-noon-tp.png, qa/2026-10-26-AG-132/trailhead-overcast-front.png, qa/2026-10-26-AG-132/trailhead-overcast-angle.png, qa/2026-10-26-AG-132/trailhead-overcast-fp.png, qa/2026-10-26-AG-132/trailhead-overcast-tp.png, qa/2026-10-26-AG-132/trailhead-dusk-front.png, qa/2026-10-26-AG-132/trailhead-dusk-angle.png, qa/2026-10-26-AG-132/trailhead-dusk-fp.png, qa/2026-10-26-AG-132/trailhead-dusk-tp.png, qa/2026-10-26-AG-132/trailhead-night-front.png, qa/2026-10-26-AG-132/trailhead-night-angle.png, qa/2026-10-26-AG-132/trailhead-night-fp.png, qa/2026-10-26-AG-132/trailhead-night-tp.png, qa/2026-10-26-AG-132/ranger-noon-front.png, qa/2026-10-26-AG-132/ranger-noon-fp.png, qa/2026-10-26-AG-132/ranger-noon-tp.png, qa/2026-10-26-AG-132/ranger-overcast-front.png, qa/2026-10-26-AG-132/ranger-overcast-fp.png, qa/2026-10-26-AG-132/ranger-overcast-tp.png, qa/2026-10-26-AG-132/ranger-dusk-front.png, qa/2026-10-26-AG-132/ranger-dusk-fp.png, qa/2026-10-26-AG-132/ranger-dusk-tp.png, qa/2026-10-26-AG-132/ranger-night-front.png, qa/2026-10-26-AG-132/ranger-night-fp.png, qa/2026-10-26-AG-132/ranger-night-tp.png, qa/2026-10-26-AG-132/hikers-noon-front.png, qa/2026-10-26-AG-132/hikers-noon-fp.png, qa/2026-10-26-AG-132/hikers-noon-tp.png, qa/2026-10-26-AG-132/hikers-overcast-front.png, qa/2026-10-26-AG-132/hikers-overcast-fp.png, qa/2026-10-26-AG-132/hikers-overcast-tp.png, qa/2026-10-26-AG-132/hikers-dusk-front.png, qa/2026-10-26-AG-132/hikers-dusk-fp.png, qa/2026-10-26-AG-132/hikers-dusk-tp.png, qa/2026-10-26-AG-132/hikers-night-front.png, qa/2026-10-26-AG-132/hikers-night-fp.png, qa/2026-10-26-AG-132/hikers-night-tp.png
Not verified:     none
Requests:         Replied DONE to ChatGPT's "GP-19968: shared poster painter ready to consume" and "GP-19968: native preview readability blockers", and to Claude's "AG-132: the hikers' faces on the posters, the rangers' board and their camp (for GP-19968)".
Contract changes: none

---

## 1. Summary of Changes (`AG-132` / World Side of `GP-19968`)

1. **The Trailhead's Six Posters (`trailhead-board` in `world/history-props.js` & `index.html`):**
   - Wired `paintHikerPosters(posters)` directly inside `buildTrailheadBoard(T, doc)` (`world/history-props.js`) and exposed `g.userData.portraitsReady` so the six trailhead posters (`Maya Costa, 27`, `Theo Marsh, 31`, `Sam Marsh, 22`, `Priya Raman, 24`, `Jonas Weber, 29`, `Ellis Byrne, 34`) paint their photocopied portraits (`ui/assets/hikers/*.jpg`) and canonical strings (`ui/strings.js`) onto their existing `192 × 256` canvases without ever resizing a canvas after WebGPU texture creation.
   - Set poster paper material to matte (`roughness: 1.0, metalness: 0.0`) with `emissiveMap: tex` and `userData.readablePaper` so `updateReadablePaperMats()` in `index.html` smoothly attenuates diffuse hotspots (`0xffffff → 0x5c5850`) near the flashlight beam center while adding subtle warm flashlight paper bounce (`emissiveIntensity` up to `0.15`) to the outer corners. In `trailhead-night-fp.png` (at `2.5 m` with the `1P` flashlight on), all six faces and text blocks remain legible without center whiteout or top-corner (`Maya Costa` / `Sam Marsh`) shadow cutoff.
   - Rotated `trailhead-board` in `index.html` from `gateYaw - 0.35` (`1.194 rad`) to `gateYaw + 1.35` (`2.894 rad`, `position: (-35.2, 1.33, -72.8)`), facing the trail approach and opening toward the standard `3P` camera (`trailhead-overcast-tp.png`, `trailhead-night-tp.png`).

2. **The Rangers' Search Board (`ranger-hiker-roster` in `world/history-props.js` & `index.html`):**
   - Built `ensureHikerRosterTexture(T, doc)` and `buildRangerHikerRoster(T, doc)` in `world/history-props.js`, creating the shared `1152 × 1120` canvas at its final dimensions before constructing `new T.CanvasTexture(canvas)` and painting it via `drawHikerRoster(ctx, canvas.width, canvas.height)`.
   - Mounted `ranger-hiker-roster` (`0.72 × 0.695 m` sheet over a `0.76 × 0.72 m` weathered backing board with four corner brass pins, plus a darkened `0x3b2e20`/`0x3e4236` weathered field-card cover over the upper-right board patch) at `rCampW(0.13, -4.805), y = sampleHeight(bx, bz) + 1.28` (`(40.09, -5.88, -24.73)`).
   - Preserved `ranger-search-log` (`(40.66, -6.02, -24.37)`, `0.687 m` center-to-center separation) completely unobstructed on the lower-right side of the search board (`t266: 32 pass, 0 fail`), and registered `ranger-search-log` with `registerReadablePaper(log)` so both the `3×2` roster and the red-ringed `DAY 6 Quarry` search log read side-by-side under the night flashlight (`ranger-night-fp.png`, `ranger-night-front.png`).

3. **The Hikers' Camp Supply Chest Roster (`hikers-camp-roster` in `world/history-props.js` & `index.html`):**
   - Built `buildHikerCampRoster(T, doc)` in `world/history-props.js`: a `0.42 × 0.405 m` physical paper copy of the `3×2` hiker roster (`1152 × 1120` shared `CanvasTexture`) clipped to a hardboard clipboard (`0.46 × 0.45 m`) tilted at `16°` against a rolled map tube on a `0.75 × 0.49 m` dark oilskin mat (`0x484234`) atop the hikers' camp supply chest (`campW(2.9, 1.7), y = sampleHeight(hx, hz) + 0.49`, `(1.35, 1.82, -82.20)`), oriented toward the camp approach (`rotation.y = hYaw - 0.2 + Math.PI`).

---

## 2. Rule 16, Rule 17 & Rule 19 Compliance

- **Rule 16 (Game-Test Slot):** All browser/GPU captures and test runs were executed through `node crew/crew.mjs slot run antigravity AG-132 --checks "AG-132 final 4-light 1P/3P shots + t167, t266, t215" -- node qa/2026-10-26-AG-132/capture-ag132.mjs` with a single instance (`--jobs 1`).
- **Rule 17 (`docs/world-design.md` Spatial World Design Rules):**
  - **Rule 8 (Functional Accessibility):** `trailhead-board` is angled toward the trail approach and standard `3P` camera (`yaw = 2.894 rad`); `ranger-hiker-roster` sits on the left half of the rangers' search board leaving a clear `0.687 m` center-to-center separation from `ranger-search-log` and its `[E] LOOK` prompt; `hikers-camp-roster` sits on the flat supply chest lid facing the campfire approach.
  - **Rule 12 (Spatial Storytelling):** Connects the three narrative beats of `GP-19968` across the mountain: the six missing-person flyers pinned at the trailhead gate (`trailhead-board`), the consolidated `3×2` search roster pinned beside the rangers' 6-day search log (`ranger-hiker-roster`), and the hikers' own trip sheet clipped to their camp supply chest (`hikers-camp-roster`).
  - **Rule 13 (Ecological & Structural Dependence):** Every paper sheet rests on a physical backing structure with visible fasteners — brass pushpins on the roofed timber trailhead board and rangers' search board, and a metal spring clip on a hardboard clipboard propped against a map tube over an oilskin mat on the hikers' supply chest lid.
- **Rule 19 (`docs/art-direction.md` & `docs/asset-principles.md` 0–5 Asset Score Table):**
  - **Art Direction Family:** **Family 1 — Soldier / Timber & Paper** (matte newsprint `#d8ceb8`, aged fiberboard `#4e3d2a`, dark brass pins `#b59a5b`, oxidized steel clip `#3b3f42`, weathered oilskin mat `#484234`; zero reserved colors).

| Category | `trailhead-board` (6 Posters) | `ranger-hiker-roster` (Search Board) | `hikers-camp-roster` (Supply Chest) | Notes / Evidence Across 4 Lights (`noon`, `overcast`, `dusk`, `night`) & `1P`/`3P` |
| :--- | :---: | :---: | :---: | :--- |
| **1. Silhouette** | 5 / 5 | 4 / 5 | 4 / 5 | Roofed timber frame, 2×3 flyer grid, search-board backing + field card, and tilted clipboard + map tube read clearly at gameplay distance. |
| **2. Proportions** | 5 / 5 | 5 / 5 | 5 / 5 | `192×256` individual flyers (`0.34×0.44 m`) and `1152×1120` 3×2 sheets (`0.72×0.695 m` on search board, `0.42×0.405 m` on clipboard) match human and furniture scale. |
| **3. Material Read** | 5 / 5 | 5 / 5 | 5 / 5 | Matte newsprint (`roughness: 1.0, metalness: 0.0`) with close-range flashlight attenuation prevents specular/diffuse blowout at `2.5 m` in `night-fp`. |
| **4. Color & Value** | 5 / 5 | 5 / 5 | 5 / 5 | Warm newsprint (`#d8ceb8`), faded rust headers (`#5e3429`), and halftoned portraits hold midtone separation in noon, overcast, dusk, and night flashlight. |
| **5. Edge & Construction** | 5 / 5 | 4 / 5 | 5 / 5 | Brass pushpins, backing boards, spring clip, and map-tube prop ground every paper sheet physically (`docs/world-design.md` Rule 13). |
| **6. Context Fit** | 5 / 5 | 5 / 5 | 5 / 5 | Sits naturally at the trailhead gate, alongside `ranger-search-log` at `POI.campsites[0]`, and on the supply chest at `POI.campsites[1]`. |
| **7. Performance** | 5 / 5 | 5 / 5 | 5 / 5 | Shares a single `1152×1120` `CanvasTexture` between the two rosters; zero canvas resizes after WebGPU upload; `85–90 fps` on RTX 5080 WebGPU. |

---

## 3. Verification Output (`qa/2026-10-26-AG-132/report.json`)

```text
GRANT antigravity AG-132: starting one game-test command
Production check:
  boardPainted: 6, rangerPainted: 6, hikersPainted: 6, boardYaw: 2.894
  posters (6): sameTexture: true, sameCanvas: true, liveSize: [192, 256], canvasSize: [192, 256], roughness: 1, metalness: 0, readablePaper: true
  rangerRoster: pos: [40.09, -5.88, -24.73], liveSize: [1152, 1120], canvasSize: [1152, 1120], sameTexture: true, sameCanvas: true, searchLogPresent: true, searchLogDist: 0.687
  hikersRoster: pos: [1.35, 1.82, -82.2], liveSize: [1152, 1120], canvasSize: [1152, 1120], sameTexture: true, sameCanvas: true
t167: 20 pass, 0 fail
t266: 32 pass, 0 fail
t215: 4 pass, 0 fail
```
