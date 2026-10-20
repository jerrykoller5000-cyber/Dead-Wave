# AG-96 — CL-218 HQ House `foldStatic` Visual Comparison (`?fold=0` vs Folded) + 3× Night 20 Benchmark (2026-10-19)

## 1. `TT.house.folded` & HQ Scene Graph Summary

| Metric (`TT.house`) | Before (`?fold=0`) | After (`CL-218` Folded) | Delta |
| --- | --- | --- | --- |
| **`TT.house.baked`** | `{ merged: 39, removed: 430 }` | `{ merged: 39, removed: 430 }` | unchanged |
| **`TT.house.folded`** | `null` | **`{ folded: 9, removed: 62 }`** | **62 plain-colour meshes folded into 9** |
| **HQ `T.house.group` nodes** | `201` | **`148`** | **`-53` (`-26.4%`)** |
| **HQ `T.house.group` meshes** | `169` | **`116`** | **`-53` (`-31.4%`)** |
| **Night 20 HQ (`Group>tag-wall`) draws** | `145` | **`92`** | **`-53` draws/frame (`-36.6%`)** |

---

## 2. Visual Comparison (`?fold=0` vs Folded — 18 Paired Angles)

Every angle was captured at the exact same world time (`0.32` day, `0.78` Night 20) and camera pose (`setShotView`) with `?fold=0` (`*-before.png`) and default folded (`*-after.png`).

| # | Subject | Before (`?fold=0`) | After (Folded) | Visual Verdict |
| --- | --- | --- | --- | --- |
| **01** | **South face (Day)** — mural, designation sign, alarm cabinet, damaged terminal, tag wall, roof klaxon & strobes | `01-south-day-before.png` (`1,490` draws) | `01-south-day-after.png` (`1,202` draws, `-288`) | **PASS** — identical colour, roughness/metalness shine, and shadows |
| **02** | **East face (Day)** — CIF hatch, Armory hatch & sign, slit lamps, roof plant | `02-east-day-before.png` (`1,293` draws) | `02-east-day-after.png` (`1,116` draws, `-177`) | **PASS** — identical colour, shine, and shadows |
| **03** | **North face (Day)** — lockdown door, motto, slit lamps, exhaust stacks | `03-north-day-before.png` (`956` draws) | `03-north-day-after.png` (`1,075` draws) | **PASS** — identical colour, shine, and shadows |
| **04** | **West face (Day)** — skull intake bay, kiosk bay, concrete hoods, hazard chevron headers, bay lamps | `04-west-day-before.png` (`1,414` draws) | `04-west-day-after.png` (`1,206` draws, `-208`) | **PASS** — identical colour, shine, and shadows |
| **05** | **South face (Night 20)** — slit glow, strobes, designation sign, alarm screen & button glow | `05-south-night-before.png` (`734` draws) | `05-south-night-after.png` (`851` draws) | **PASS** — all emissive glows, signs, and screens preserved identically |
| **06** | **East face (Night 20)** — CIF warm strip, Armory sign glow, slit glow, strobes | `06-east-night-before.png` (`859` draws) | `06-east-night-after.png` (`637` draws, `-222`) | **PASS** — identical night lighting and glows |
| **07** | **North face (Night 20)** — slit glow, lockdown door, strobes | `07-north-night-before.png` (`706` draws) | `07-north-night-after.png` (`421` draws, `-285`) | **PASS** — identical night lighting and glows |
| **08** | **West face (Night 20)** — bay lamps, skull intake readout & red status lamp, specimen skull eye glows, kiosk screen | `08-west-night-before.png` (`798` draws) | `08-west-night-after.png` (`595` draws, `-203`) | **PASS** — identical night lighting and glows |
| **09** | **CIF close-up** — 3 hanging uniforms, seams, buttons, 3 folded bundles, laced boots, warm strip, signs | `09-cif-closeup-before.png` | `09-cif-closeup-after.png` | **PASS** — cloth colours, seams, leather/rubber boot sheen, and shadows match 1:1 (`15 → 4` draws) |
| **10** | **Armory close-up (with populated weapon rack)** — cabinet, security mesh, frame bolts, sign, full gun rack | `10-armory-closeup-before.png` | `10-armory-closeup-after.png` | **PASS** — cabinet, rack weapons, mesh, and sign match 1:1 |
| **11** | **Skull intake close-up** — tray, shutter slats, readout, status lamp, shambler `01` & demon `02` skulls | `11-skull-intake-closeup-before.png` | `11-skull-intake-closeup-after.png` | **PASS** — shutter, tray, plates, readout, and mounted skulls match 1:1 (`23 → 13` draws) |
| **12** | **Alarm cabinet close-up** — fascia, green `PERIMETER` ECG screen, red mushroom button, hazard collar | `12-alarm-cabinet-closeup-before.png` | `12-alarm-cabinet-closeup-after.png` | **PASS** — cabinet, screen, button, and bolts match 1:1 (`8 → 5` draws) |
| **13** | **Damaged terminal close-up** — bent steel frame, cracked glass, PCB board & copper traces, 3 bent cables | `13-damaged-terminal-closeup-before.png` (`1,028` draws) | `13-damaged-terminal-closeup-after.png` (`764` draws, `-264`) | **PASS** — PCB green, copper traces, steel frame, cracked glass, and cables match 1:1 (`25 → 1` draw!) |
| **14** | **Tag wall close-up** — 9 nails and 9 hanging dog tags under the mural | `14-tag-wall-closeup-before.png` (`862` draws) | `14-tag-wall-closeup-after.png` (`713` draws, `-149`) | **PASS** — nails and dog tags intact and identical |
| **15** | **Training Ground CIF copy (`training-cif`)** | `15-training-cif-before.png` (`103` draws) | `15-training-cif-after.png` (`92` draws, `-11`) | **PASS** — cloned folded mesh renders identically in Training Ground |
| **16** | **Training Ground Armory copy (`training-armory` with rack)** | `16-training-armory-before.png` | `16-training-armory-after.png` | **PASS** — cloned folded mesh + mirrored weapon rack render identically |
| **17** | **Training Ground Skull Intake copy (`training-skullWindow`)** | `17-training-skull-intake-before.png` (`122` draws) | `17-training-skull-intake-after.png` (`110` draws, `-12`) | **PASS** — cloned folded mesh renders identically |
| **18** | **Training Ground Alarm Cabinet copy (`training-hqPanel`)** | `18-training-alarm-cabinet-before.png` | `18-training-alarm-cabinet-after.png` | **PASS** — cloned folded mesh renders identically |

---

## 3. Night 20 High Benchmark (`3× node tools/bench.mjs --night 20 --gfx high --prof --cpu`)

All 3 raw JSON lines are saved in `qa/2026-10-19-AG-96/bench3.jsonl` and appended to `qa/2026-10-19-AG-86/prof-lines.jsonl` (lines 14–16).

| Run | FPS | 1% Low | Worst (ms) | Hitches | Draws | Triangles | `frameMs` | `tickMs` | `r:render` | `zombies` | `r:matrices` | `gpuMs` | HQ (`Group>tag-wall`) Draws |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Run 1 (Median)** | **`47.7`** | **`27.8`** | `38.5` | `2` | **`334`** | `660,600` | **`20.96`** | `17.03` | **`9.24`** | `2.49` | `1.84` | `0.33` | **`92`** (was `145`, **`-53`**) |
| **Run 2** | `47.2` | `27.2` | `35.5` | `0` | `346` | `663,259` | `21.19` | `17.62` | `9.55` | `2.59` | `1.82` | `0.27` | **`92`** |
| **Run 3** | `48.3` | `28.0` | `28.9` | `3` | `347` | `676,151` | `20.70` | `17.89` | `9.63` | `2.81` | `1.93` | `0.26` | **`92`** |

### Median Run (`Run 1`) `census.draws.byGroup`
| Group (`k`) | Draws (`n`) | vs Pre-`CL-218` (`AG-92`) |
| --- | --- | --- |
| **`Group>tag-wall` (HQ house)** | **`92`** | **`145 → 92` (`-53`)** |
| `Mesh` (loose world meshes) | `58` | `54.5` |
| `Group>fitted-pelvis` (marine) | `54` | `52` |
| `ground-sectors` | `39` | `39` |
| `zombie (Group>zombie-eyes)` | `38` | `44` |
| `zombie (Group>demon-fire-fist)` | `32` | `32` |
| `Group` (unnamed groups) | `10` | `10` |
| `feral-motion-echo` | `9.5` | `9.5` |
| `rock-batch` | `4` | `4` |
| `zombie (Group>concept-surface)` | `4` | `4` |

### Median Run (`Run 1`) `census.draws.byPart` (Top HQ & Scene Parts)
| Part (`k`) | Draws (`n`) | vs Pre-`CL-218` (`AG-92`) | Note |
| --- | --- | --- | --- |
| `Mesh / (unnamed)` | `58` | `54.5` | Loose world meshes |
| `ground-sectors / (unnamed)` | `39` | `39` | Terrain sectors |
| **`Group>tag-wall / (unnamed)`** | **`25`** | `28` (`-3`) | Main HQ folded meshes + slit glows, strobes, flare caps, mural, hazard stripes |
| `Group>fitted-pelvis / (unnamed)` | `24` | `24` | Marine rig |
| `zombie (Group>zombie-eyes) / zombie-skin` | `21` | `24` | Common zombies skin |
| **`Group>tag-wall / hq-armory`** | **`18`** | `20` (`-2`) | Includes `armory-wall-surround` (named group, skipped unless in `enter`) + `armoryRack` + `armory-security-mesh` + `armory-frame-bolts` + `armory-sign` |
| `zombie (Group>zombie-eyes) / zombie-eyes` | `17` | `20` | Common zombies eyes |
| **`Group>tag-wall / fob-lockdown-door`** | **`16`** | `16` (`0`) | Named `'fob-lockdown-door'` in `dressHqStory` (`index.html:8319`), so `foldStatic` stops at its name unless `enter` includes `'fob-lockdown-door'` |
| **`Group>tag-wall / hq-skull-intake`** | **`13`** | `23` (`-10`) | Includes the 2 mounted specimen skulls (`makeSkullMesh` sets `.name` on skull children) + canvas plates + readout + status lamp + shutter + tray |
| `Group / (unnamed)` | `10` | `10` | Unnamed groups |
| `feral-motion-echo / feral-motion-echo` | `9.5` | `9.5` | Feral echo pool |
| **`Group>tag-wall / tag-wall`** | **`9`** | `9` (`0`) | The 9 nail `CylinderGeometry` meshes under `tag-wall` (`index.html:23795`; `tag-wall` is named so skipped unless entered) |
| `Group>fitted-pelvis / rig-skin` | `8` | `8` | Marine cloth skin |
| **`Group>tag-wall / hq-alarm-cabinet`** | **`5`** | `8` (`-3`) | Folded cabinet + fascia + screen + button + repeater |
| **`Group>tag-wall / hq-cif`** | **`4`** | `15` (`-11`) | All uniforms, bundles, boots, and frame folded into 1 mesh + 2 signs + 1 lamp strip |
| **`Group>tag-wall / hq-damaged-terminal`** | **`1`** | `25` (`-24`) | 24 plain parts folded into house; only `hq-damaged-screen` left |
| **`Group>tag-wall / hq-designation`** | **`1`** | `1` (`0`) | Canvas plate |
