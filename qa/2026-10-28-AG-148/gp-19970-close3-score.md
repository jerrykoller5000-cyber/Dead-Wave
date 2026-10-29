# AG-148 — Visual Score: GP-19970 Seven-Face Maxilla Close3 (`face-close3-after`) — 2026-10-28

- **Agent**: Antigravity (`Gemini 3.1 Pro`)
- **Task**: `AG-148` (ChatGPT request: `GP-19970 seven-face maxilla close3 score`)
- **Images Compared**:
  - **Before (`close2`)**: `handoffs/GP-19970/face-close2-after/{shambler,feral,leaper,drowned,military,spitter,bomber}-noon-head-side.png`
  - **After (`close3`)**: `handoffs/GP-19970/face-close3-after/{shambler,feral,leaper,drowned,military,spitter,bomber,brute,colossus}-noon-head-side.png` and `-noon-front.png` (`18` PNGs)

---

## 1. Per-Type Scoped Close3 Scores (`docs/asset-principles.md`)

| Zombie Type | Close2 Construction (Before) | Close3 Construction (After) | Close3 Integration | Daylight Behind Nose / Upper Teeth? | New Front Silhouette Issue? | Verdict |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| **`shambler`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`feral`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`leaper`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`drowned`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`military`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`spitter`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`bomber`** | `3/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS** |
| **`brute` (control)** | `4.5/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS (Unchanged)** |
| **`colossus` (control)** | `4.5/5` | **4.5/5** | **4.5/5** | **None (`0 px`)** | None | **PASS (Unchanged)** |

---

## 2. Summary of Findings

1. **Zero Daylight Behind Nose & Upper Teeth (`7/7` PASS)**:
   - Embedding the nose wedge deeper into the anterior skull loft, adding the recessed maxilla block underneath it, and drawing the cheek struts back into the jaw completely closed the `~2–3 cm` vertical daylight seam that was visible in `face-close2-after/{kind}-noon-head-side.png`.
   - From pure side profile (`-noon-head-side.png`), all seven non-heavy faces (`shambler`, `feral`, `leaper`, `drowned`, `military`, `spitter`, `bomber`) now form a continuous, watertight anatomical profile from brow ridge → nose bridge → maxilla/upper lip → upper teeth → mandible → skull underside.
2. **Front Silhouette & Readability (`7/7` PASS)**:
   - In `-noon-front.png`, the recessed maxilla reads cleanly as an upper-jaw shelf above the open maw without crowding the nose bridge, cyan eyes, or upper teeth.
3. **Regression Controls (`brute`, `colossus`)**:
   - Both heavy types remain intact at `4.5/5` Construction and `4.5/5` Integration with zero regressions.


---

## 3. Scoped Close2 Score: Front Crown Hair Ribbon (`face-hair-close2-after`)

- **Images Compared**: `handoffs/GP-19970/face-trim-after/{shambler,feral,drowned,spitter}-head-side.png` vs `handoffs/GP-19970/face-hair-close2-after/{shambler,feral,drowned,spitter}-head-side.png`, `-head-back.png`, 4-light side, and gameplay shots (`28` PNGs).

| Zombie Type | Anterior Hair Ribbon Construction (Before) | Anterior Hair Ribbon Construction (After) | Anterior Hair Ribbon Integration | Detached Tip or New Forehead Intersection? | Verdict |
| --- | :---: | :---: | :---: | :---: | --- |
| **`shambler`** | `3/5` | **4.5/5** | **4.5/5** | **None** | **PASS** |
| **`feral`** | `3/5` | **4.5/5** | **4.5/5** | **None** | **PASS** |
| **`drowned`** | `3/5` | **4.5/5** | **4.5/5** | **None** | **PASS** |
| **`spitter`** | `3/5` | **4.5/5** | **4.5/5** | **None** | **PASS** |

- **Findings**: Moving the anterior hair ribbon down the head loft completely removed the high inverted-V wireframe loop above the forehead on all four types (`shambler`, `feral`, `drowned`, `spitter`), leaving zero detached anterior tips and zero awkward forehead intersections. (As scoped, the mid/rear crown peaks and horizontal back-view crossbar remain for the rear crown pass.)
