# antigravity — AG-125 The duty board, the radio set and the six posters — 2026-10-26
Changed:          Built the HQ's outside South-Wall Duty Board (`hq-duty-board` at `x = -1.62, y = 1.56`) and HQ Radio Set (`hq-radio-set` at `x = +1.62, y = 1.46`) in the military family (`docs/specs/story-chain.md` §2, `docs/story.md` §11), exported `house.storyStations` (`{ duty, radio }` with `centre`, `approach`, `reach`) for ChatGPT's `GP-19969` `E` wiring, and expanded `buildTrailheadBoard` in `world/history-props.js` to six framed missing-person posters (`Maya Costa, 27`, `Theo Marsh, 31`, `Sam Marsh, 22`, `Priya Raman, 24`, `Jonas Weber, 29`, `Ellis Byrne, 34`) with portrait hooks for `GP-19968`. Verified in four lights (`noon`, `overcast`, `dusk`, `night`) and gameplay `1P`/`3P` views on the RTX 5080, plus `t301`, `t167`, `t258`, and `t215` (`72 pass, 0 fail`).
Files:            index.html, world/history-props.js, qa/2026-10-26-AG-125/capture-ag125.mjs, qa/2026-10-26-AG-125/ag125-hq-props-sheet.jpg, qa/2026-10-26-AG-125/ag125-posters-sheet.jpg, qa/2026-10-26-AG-125/ag125-telemetry.json, qa/2026-10-26-AG-125/*.png, handoffs/2026-10-26-antigravity-AG-125.md
Tests:            node crew/crew.mjs slot run antigravity AG-125 --checks "AG-125 four-light & 1P/3P shots + t301, t167, t258, t215" -- node qa/2026-10-26-AG-125/capture-ag125.mjs → 4 checks: 72 pass, 0 fail (t301: 44/44, t167: 20/20, t258: 4/4, t215: 4/4); new tests: none
Screenshots:      qa/2026-10-26-AG-125/ag125-hq-props-sheet.jpg, qa/2026-10-26-AG-125/ag125-posters-sheet.jpg, qa/2026-10-26-AG-125/south-facade-overview.png, qa/2026-10-26-AG-125/duty-noon.png, qa/2026-10-26-AG-125/duty-overcast.png, qa/2026-10-26-AG-125/duty-dusk.png, qa/2026-10-26-AG-125/duty-night.png, qa/2026-10-26-AG-125/radio-noon.png, qa/2026-10-26-AG-125/radio-overcast.png, qa/2026-10-26-AG-125/radio-dusk.png, qa/2026-10-26-AG-125/radio-night.png, qa/2026-10-26-AG-125/posters-closeup.png, qa/2026-10-26-AG-125/posters-angled.png
Not verified:     ChatGPT's GP-19968 painted hiker portraits will plug into `poster.userData.drawPortrait(paintFn)` / `poster.userData.portraitBox` when GP-19968 lands; CL-263's story gate activation is Claude's next step after GP-19969/AG-125.
Requests:         FYI sent to ChatGPT and Claude that `house.storyStations`, `hq-duty-board`, `hq-radio-set`, and the six trailhead poster frames are live and verified.
Contract changes: Fulfilled the world side of the `house.storyStations` contract (`docs/contracts.md` §Story entry stations, approved by Claude for GP-19969 / CL-263 / AG-125 on 2026-10-26).

---

## 1. Exported Interaction Centres, Approach Positions & Reach (`house.storyStations`)

Both South-Wall story entry props export their world-space station records on `house.storyStations` right after `makeHouse()` seats `house.group.position.y`, plus debug constants on `window.TT`:

| Station Key | Mesh Name | `centre` (World `{ x, y, z }`) | `approach` (World `{ x, y, z }`) | `reach` | `window.TT` Exports |
| --- | --- | --- | --- | --- | --- |
| `house.storyStations.duty` | `hq-duty-board` | `{ x: -1.62, y: hy + 1.56, z: -5.22 }` | `{ x: -1.62, y: sampleHeight(-1.62, -5.9), z: -5.9 }` | `1.45 m` | `HQ_DUTY_BOARD_FRONT = { x: -1.62, z: -5.9 }`, `HQ_DUTY_BOARD_REACH = 1.45` |
| `house.storyStations.radio` | `hq-radio-set` | `{ x: +1.62, y: hy + 1.46, z: -5.22 }` | `{ x: +1.62, y: sampleHeight(+1.62, -5.9), z: -5.9 }` | `1.25 m` | `HQ_RADIO_FRONT = { x: +1.62, z: -5.9 }`, `HQ_RADIO_REACH = 1.25` |

- **Unambiguous Separation & Reach (`docs/world-design.md` Rule 9 & Rule 5):**
  - `duty.approach` (`x = -1.62, z = -5.9`) and `radio.approach` (`x = +1.62, z = -5.9`) are `3.24 m` apart (`> 1.45 + 1.25 = 2.70 m`), so their interaction cones never overlap.
  - `radio.approach` (`x = +1.62, z = -5.9`) is separated from the East-Bay alarm panel (`HQ_PANEL_FRONT` at `x = +3.20, z = -5.9`) by the full `+2.20` concrete pilaster (`1.58 m > 1.25 m` reach), so standing at `HQ_PANEL_FRONT` never triggers `nearHQStation('radio')`.
  - Both stations sit on the clear South Apron with an unobstructed `> 2.5 m` approach cone in both `1P` and `3P`.

---

## 2. Prop Construction & Art Direction (`docs/art-direction.md`, `docs/asset-principles.md`, Rule 19)

### A. HQ Duty Board (`hq-duty-board` — Military Family)
- **Location:** Mounted on the HQ's outside South Wall inside the Center Bay (`x = -1.62, y = 1.56, z = -5.08`, `0.68 m × 0.66 m`), immediately west of the wall of tags (`house.tagWall`) and clear of the `-2.20` concrete pilaster and the mural's motto.
- **Geometry & Narrative Detail (`docs/story.md` §11, `docs/specs/story-chain.md` §2):**
  - Heavy welded angle-iron border (`#2c3036`), corner gusset plates with brass hex bolts (`#b5954a`), sloped olive-drab rain hood (`#3d4636`), and a warm sodium-amber tubular map lamp (`0xffcc77` / `0xffaa38`) under the hood.
  - Lower chalk/pencil ledge with a white chalk stub, red carpenter's pencil, and a **pulled-out empty spare-fuse drawer** on the right (`docs/story.md` §11: *"Relay check: daily. Radio fuse: spare in the drawer."* — empty because the last spare fuse was already used).
  - Cork board face with stenciled header (`PGB DET. 4 · DUTY & VALLEY LEADS`), **Hale's tally marks** (`||||` + unfinished 5th chalk stroke, `HALE · ROTATION`), **the twelve's handwritten standing notes** (`"Sample window 02:00-02:30. Bring a friend. —V.K."` and `"Relay check: daily. Radio fuse: spare in the drawer. [NONE LEFT — CH-09 ONLY]"`), the 12-name watch roll (`01 HALE .. 12 BELL`), the Hollow Valley contour sketch map with 3D red string (`#98241d`), and **8 pinned lead cards** with 3D brass and red pushpins.

### B. HQ Radio Set (`hq-radio-set` — Military Family)
- **Location:** Mounted on the HQ's outside South Wall inside the Center Bay (`x = +1.62, y = 1.46, z = -5.12`, `0.50 m` wide), immediately east of the wall of tags (`house.tagWall`) and west of the `+2.20` pilaster.
- **Geometry & Narrative Detail (`docs/specs/story-chain.md` §2):**
  - Bolted steel wall shelf (`#2c3036`) with diagonal angle-iron knee struts, under-shelf 24V field battery pack (`#2e3628`) with braided power lead, olive-drab transceiver cabinet (`#3d4636`, `RT-524 / AN-VRC` silhouette) with top cooling fins, upper auxiliary squelch monitor unit, and front steel grab handles.
  - Warm amber-backlit frequency drum window (`148.625 MHz / CH 09 · RIDGELINE`) with red cursor, illuminated `SIG / SQUELCH` VU meter, louvered circular speaker grille, taped callsign strip (`CALLSIGN: HERON · CH-09 GUARD`), green power LED, 4 3D bakelite rotary selector knobs (`MODE`, `CHAN`, `VOL`, `SQL`) with white indicator ridges, brass handset connector, side-cradled **H-250 field handset** with 3D coiled cord, and right-side **whip antenna** with heavy coil spring base.

### C. Six Trailhead Missing Posters (`trailhead-board` in `world/history-props.js` — Civilian Family)
- **Location:** Cordon Trailhead (`historyProps.parts['trailhead-board']`).
- **Geometry & Narrative Detail (`docs/specs/story-chain.md` §5):**
  - Expanded timber frame (`1.94 m × 1.32 m`) holding **6 individual weathered wooden poster frames** (`missing-poster-frame`) with brass corner tacks and **6 weathered missing-person sheets** in a `2 × 3` grid for all six hikers:
    1. `MAYA COSTA, 27` (`LAST SEEN: COLDWATER RIDGE`)
    2. `THEO MARSH, 31` (`LAST SEEN: COLDWATER MINE`)
    3. `SAM MARSH, 22` (`LAST SEEN: COLDWATER MINE`)
    4. `PRIYA RAMAN, 24` (`LAST SEEN: SWITCHBACK TRAIL`)
    5. `JONAS WEBER, 29` (`LAST SEEN: NORTH CREEK SPUR`)
    6. `ELLIS BYRNE, 34` (`LAST SEEN: OLD MILL SPUR`)
  - Exposes all 6 poster meshes on `board.userData.posters` with `poster.userData = { index, hiker, portraitBox: { x: 34, y: 50, w: 124, h: 112 }, canvas, tex, drawPortrait(paintFn) }` ready for ChatGPT's `GP-19968` portraits, while keeping 3 direct `'missing-poster'` children on `board` (`k = 0..2`) and 3 in `missing-poster-row` (`k = 3..5`) so legacy checks (`t167.js`) continue to pass (`20/20`).

---

## 3. Rule 19 Asset Evaluation Table (0–5 Scores)

| Category | `hq-duty-board` (Military) | `hq-radio-set` (Military) | `trailhead-board` 6 Posters (Civilian) | Notes |
| --- | :---: | :---: | :---: | --- |
| **1. Silhouette & Proportions** | **5 / 5** | **5 / 5** | **5 / 5** | Rain hood, map lamp, and pulled-out drawer give the duty board a distinct profile; whip antenna, handset cradle, shelf struts, and battery box read unmistakably as a military radio; 2×3 framed posters read cleanly at the trailhead. |
| **2. Family & Palette Discipline** | **5 / 5** | **5 / 5** | **5 / 5** | Strictly uses Military olive drab (`#3d4636`), gunmetal (`#2c3036`), stencil brass (`#b5954a`), sodium-amber lamp/dial (`#f5ae42`), and Civilian weathered timber (`#6b5034`) + aged cream paper (`#efe9d4`). No reserved uncanny colors touched. |
| **3. Material & Light Response (4 Lights)** | **5 / 5** | **5 / 5** | **5 / 5** | Verified across `noon`, `overcast`, `dusk`, and `night`. Warm emissive map lamp on the duty board and backlit `148.625 MHz / CH 09` dial + VU meter on the radio keep both stations readable at dusk and night. |
| **4. Narrative & World Fit (Rule 17)** | **5 / 5** | **5 / 5** | **5 / 5** | Carries Hale's tally marks, the twelve's exact handwritten notes (`story.md` §11), the empty spare-fuse drawer, the 8 lead cards, and all 6 named hikers (`story-chain.md` §5). |
| **5. Gameplay Scale, Reach & Performance** | **5 / 5** | **5 / 5** | **5 / 5** | Both HQ stations fold into `house.folded` (`1` folded vertex-color mesh + `1` textured face each), keeping draw calls flat while `t301` (`44/44`) and `t167` (`20/20`) pass in `1P` and `3P`. |

---

## 4. Independent UI Principles Review of `GP-19969` (`handoffs/GP-19969/after/*`, `docs/ui-principles.md`)

Inspected ChatGPT's live station captures in `handoffs/GP-19969/after/` (`duty-tp-day-1280.png`, `duty-tp-day-390.png`, `duty-fp-night-1280.png`, `radio-tp-day-1280.png`, `radio-choices-1280.png`, `heron-confirm-1280.png`, `alarm-tp-day-1280.png`, `dawn-lead-1280.png`, and `result.json`) opened via `E` at the real `AG-125` stations (`[-1.62, y, -5.9]`, `[+1.62, y, -5.9]`, `[+3.20, y, -5.9]`):

| UI Principle (`docs/ui-principles.md`) | Score | Verdict & Visual Notes |
| --- | :---: | --- |
| **1. Readability** | **5 / 5** | Crisp contrast on both the Duty Board's warm index cards (`OPEN LEAD` vs `✓ DONE` with red/grey pin dots) and the Radio's dark comms cards (`Ridgeline · Relay`, `Tonight's call`). |
| **2. Hierarchy** | **5 / 5** | Unambiguous station title (`DUTY BOARD` / `RADIO` / `ALARM CONTROL`), status bar (`THE TWELVE'S UNFINISHED BUSINESS` / `RIDGELINE / SIGNAL RESTORED` / `READY TO SOUND`), and primary action buttons (`Track`, `Call Heron`, `SOUND ALARM`). |
| **3. Consistency** | **5 / 5** | Unified PGB Threshold modal frame and `Close` control across all three stations while each station's interior styling matches its physical prop on the South Wall. |
| **4. Placement & Layout (`1280` & `390`)** | **5 / 5** | `overflow: false` across all 24 views (`1280×720` 2-column grid and `390×844` single-column stack). In `dawn-lead-1280.png`, the `NEW LEAD` toast sits cleanly beneath the top-left HUD block without colliding with the minimap, right-side objective tracker, or bottom-left ammo HUD. |
| **5. Safety & Confirmation** | **5 / 5** | `heron-confirm-1280.png` gates the Day 20 final-night call behind an explicit confirmation (`"Call Heron and begin the final night?"`) with `Keep preparing` focused by default beside `Call Heron`. |
| **6. Both Views (`1P` & `3P`, Day & Night)** | **5 / 5** | Verified in `1P` and `3P`, day and night (`pointerLocked: false` when open, `t301` `44/44`). |

---

## 5. Verification Proof (Rule 15 & Rule 16)

All browser captures and test runs were executed through the machine-wide game-test slot (`node crew/crew.mjs slot run`) with `--jobs 1`:

```text
$ node crew/crew.mjs slot run antigravity AG-125 --checks "AG-125 four-light & 1P/3P shots + t301, t167, t258, t215" -- node qa/2026-10-26-AG-125/capture-ag125.mjs
GRANT antigravity AG-125: starting one game-test command
check-players: 307 player.position reads, all in the allowed places
ok    t167    20 pass   0 fail  23.7s
ok    t215     4 pass   0 fail  42.4s
ok    t258     4 pass   0 fail  25.8s
ok    t301    44 pass   0 fail  49.8s

4 checks: 72 pass, 0 fail
```
