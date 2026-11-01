# AG-174: CU-200 and CU-201 on the GPU — the shed, the clipboard, the three spots

- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-11-01
- **Renderer**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, `1280×720`) via shared game-test slot
- **Status**: **DONE — Tests passed 100%, visual captures & contact sheet produced, findings & defects filed**

---

## 1. Automated Test Suite Results
Ran against the real WebGPU renderer on RTX 5080:
- `node tools/realtest.mjs t313 --all`: **19 pass, 0 fail (26.9s)** — CU-200 fuel depot shed, padlocked door blocker, key pickup, opening animation, spare key generation.
- `node tools/realtest.mjs t314 --all`: **24 pass, 0 fail (26.8s)** — CU-201 HQ utilities system (power, plumbing, workshop, alarm, iron), earn/install/power progression.

---

## 2. Visual GPU Verification & Scoring Table

All 6 spots and props were inspected and captured at **Noon** (`timeOfDay = 0.42`) and **Dusk** (`timeOfDay = 0.74`):

| Prop / Feature | Read (1-5) | Sits (1-5) | Scale (1-5) | Ground / Anchor Y | Status & Summary Findings |
|---|:---:|:---:|:---:|:---:|---|
| **1. Fuel Depot Padlocked Shed Door** | **2.5** | **3.5** | **4.0** | `yDelta = 0.00` | **DEFECT**: Door geometry axes inverted (`w=0.08, d=0.90`). Sits edge-on to approach; padlock faces sideways into corrugated wall. |
| **1b. Fuel Depot Shed Door (Open)** | **4.8** | **5.0** | **4.8** | — | Clean opening transition; padlock falls 0.45s and door disappears; pump doorway completely clear. |
| **2. Price's Clipboard & Key** | **4.0** | **4.0** | **4.5** | `yDelta = 0.00` | High-contrast parchment and brass key read well on ground at generator; recommend elevating onto generator housing. |
| **3. Spare Key on Duty Board** | **3.0** | **2.0** | **4.0** | `y = -1.809` | **DEFECT**: Unrotated horizontal clipboard mesh placed on vertical south board; clips 18 cm into concrete wall. |
| **4. HQ Pump & Water Tank (Dry)** | **4.2** | **4.2** | **4.5** | `yDelta = 0.00` | Crisp industrial silhouette on north yard wall; flush with ground. |
| **4b. HQ Water Tank (Filling)** | **2.8** | **4.2** | **4.5** | `yDelta = 0.00` | **READ DEFECT**: Outer tank shell is 100% opaque (`0x3a4048`); rising water mesh inside is invisible from yard. |
| **5. Armory Workbench & Battery** | **4.4** | **4.8** | **4.5** | Counter sill | Lead-acid battery sits cleanly on armory hatch sill; reads well as workshop power source. |
| **6. Roof Siren Beside Ladder Head** | **4.7** | **4.8** | **4.6** | Roof deck | Red cone horn on swivel turret sits flush on roof deck; cleanly swivels to track wave attack bearing. |

---

## 3. Defects & What to Move (For Cursor)

### Defect 1: Fuel Depot Padlocked Shed Door Orientation (`index.html:32341-32344`)
- **Issue**: `chainBlockerMesh('padlock')` constructs the door as `w = 0.08, h = 1.7, d = 0.90` and rotates it with `rotation.y = Math.atan2(dx, dz)`. Because local `+Z` aligns with player approach direction `(dx, dz)`, the 0.08m dimension is placed across the opening and the 0.90m dimension extends along the path. The door appears as a thin vertical fin/blade facing the player, and the hasp/padlock face sideways into the shed wall.
- **Fix**: Swap dimensions to `w = 0.90, h = 1.7, d = 0.08`, centered at `x = 0, y = 0.85, z = 0`. Place the hasp at `x = 0.38, y = 1.05, z = 0.05` and padlock at `x = 0.38, y = 0.98, z = 0.07` so they face front and center toward the player on approach.

### Defect 2: Spare Key on Duty Board Wall Penetration (`index.html:32470-32479`)
- **Issue**: `chainSpareArrived` places `chainKeyMesh()` unrotated at `(p.x, p.y - 0.2, p.z)`. Because `chainKeyMesh` is a flat horizontal clipboard lying in the XZ plane (`d = 0.36`), placing it on the vertical south duty board (`rotation.y = Math.PI`) causes half of the board (18 cm) to penetrate directly into the concrete wall behind the corkboard, protruding forward like an awkward small shelf.
- **Fix**: Apply `mesh.rotation.x = Math.PI / 2; mesh.rotation.y = Math.PI;` and offset `z` by `-0.025m` (`p.z - 0.025`) so the clipboard hangs flat against the cork surface of the duty board.

### Defect 3: Water Tank Level Visibility (`index.html:32585-32610`)
- **Issue**: `utilityProps.water` scales vertically with `utilityFill`, but the outer tank mesh (`0.7 × 1.5 × 0.7m`) is completely opaque (`0x3a4048`). The rising water volume cannot be seen from outside.
- **Fix**: Add an external sight-glass level tube (`CylinderGeometry(0.04, 0.04, 1.2)`) on the side facing the yard or open the top of the tank so the player can see water rising.

### Polish Recommendations
- **Price's Clipboard**: Raise from ground dirt (`y = -3.169`) to top of generator housing (`y = gen.y + 0.72`) or onto an adjacent crate.
- **Armory Battery**: Add negative terminal post (`x = -0.10`) and a black/red jumper wire lead into the hatch frame.

---

## 4. Visual Artifacts
- **Contact Sheet**: `qa/2026-11-01-AG-174/ag174-sheet.png` (4×4 grid of all 16 captures)
- **Detailed Report**: `qa/2026-11-01-AG-174/report.md`
- **Quantitative Dataset**: `qa/2026-11-01-AG-174/ag174-summary.json`
- **Screenshots**:
  - `qa/2026-11-01-AG-174/fuel-shed-padlocked-noon.png`
  - `qa/2026-11-01-AG-174/fuel-shed-padlocked-dusk.png`
  - `qa/2026-11-01-AG-174/fuel-shed-open-noon.png`
  - `qa/2026-11-01-AG-174/fuel-shed-open-dusk.png`
  - `qa/2026-11-01-AG-174/price-clipboard-key-noon.png`
  - `qa/2026-11-01-AG-174/price-clipboard-key-dusk.png`
  - `qa/2026-11-01-AG-174/spare-key-dutyboard-noon.png`
  - `qa/2026-11-01-AG-174/spare-key-dutyboard-dusk.png`
  - `qa/2026-11-01-AG-174/hq-pump-tank-dry-noon.png`
  - `qa/2026-11-01-AG-174/hq-pump-tank-dry-dusk.png`
  - `qa/2026-11-01-AG-174/hq-pump-tank-filling-noon.png`
  - `qa/2026-11-01-AG-174/hq-pump-tank-filling-dusk.png`
  - `qa/2026-11-01-AG-174/armory-workbench-battery-noon.png`
  - `qa/2026-11-01-AG-174/armory-workbench-battery-dusk.png`
  - `qa/2026-11-01-AG-174/roof-siren-wave-noon.png`
  - `qa/2026-11-01-AG-174/roof-siren-wave-dusk.png`
