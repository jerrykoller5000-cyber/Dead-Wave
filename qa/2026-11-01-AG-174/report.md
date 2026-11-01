# AG-174 Visual Verification Report — CU-200 & CU-201 on the GPU

- **Reviewer**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-11-01
- **Renderer**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, `1280×720`) via shared game-test slot
- **Status**: **VERIFIED & SCORED — 2 Structural Defects & 2 Visual Read Improvements Flagged**
- **Test Results**:
  - `node tools/realtest.mjs t313 --all`: **19 pass, 0 fail (26.9s)** on real WebGPU renderer.
  - `node tools/realtest.mjs t314 --all`: **24 pass, 0 fail (26.8s)** on real WebGPU renderer.
- **Artifacts Directory**: `qa/2026-11-01-AG-174/`
  - Contact sheet: `qa/2026-11-01-AG-174/ag174-sheet.png` (4×4 grid of all 16 captures at noon and dusk)
  - Quantitative dataset: `qa/2026-11-01-AG-174/ag174-summary.json`
  - 16 individual screenshots:
    - `fuel-shed-padlocked-noon.png`, `fuel-shed-padlocked-dusk.png`
    - `fuel-shed-open-noon.png`, `fuel-shed-open-dusk.png`
    - `price-clipboard-key-noon.png`, `price-clipboard-key-dusk.png`
    - `spare-key-dutyboard-noon.png`, `spare-key-dutyboard-dusk.png`
    - `hq-pump-tank-dry-noon.png`, `hq-pump-tank-dry-dusk.png`
    - `hq-pump-tank-filling-noon.png`, `hq-pump-tank-filling-dusk.png`
    - `armory-workbench-battery-noon.png`, `armory-workbench-battery-dusk.png`
    - `roof-siren-wave-noon.png`, `roof-siren-wave-dusk.png`

---

## 1. Executive Summary & Scoring Table

All six objects and spots from Cursor's CU-200 (chain gates) and CU-201 (HQ utilities) were inspected and scored across noon (`0.42`) and dusk (`0.74`) lighting on Jerry's RTX 5080 GPU:

| Prop / Feature | Read (1-5) | Sits (1-5) | Scale (1-5) | Ground / Anchor Y | Defects & Findings |
|---|:---:|:---:|:---:|:---:|---|
| **1. Fuel Depot Padlocked Shed Door** | **2.5** | **3.5** | **4.0** | `yDelta = 0.00` | **DEFECT**: Door axes inverted (`w=0.08, d=0.90` instead of `w=0.90, d=0.08`). Sits edge-on to approach; padlock facing sideways. |
| **1b. Fuel Depot Shed Door (Open)** | **4.8** | **5.0** | **4.8** | — | Cleanly animated opening (lock falls for 0.45s, then door disappears); doorway completely clear to pump. |
| **2. Price's Clipboard & Key** | **4.0** | **4.0** | **4.5** | `yDelta = 0.00` | Lies flat on the dirt ground at generator base; paper/gold key read well, but vulnerable to tall grass clipping. |
| **3. Spare Key on Duty Board** | **3.0** | **2.0** | **4.0** | `y = -1.809` | **DEFECT**: Unrotated horizontal clipboard mesh placed on vertical south board; clips 18 cm into concrete wall. |
| **4. HQ Pump & Water Tank (Dry)** | **4.2** | **4.2** | **4.5** | `yDelta = 0.00` | Industrial silhouette reads clearly on north wall beside sealed door. Sits flush with ground. |
| **4b. HQ Water Tank (Filling)** | **2.8** | **4.2** | **4.5** | `yDelta = 0.00` | **READ ISSUE**: Tank shell is 100% opaque solid box (`0x3a4048`); rising blue water mesh is enclosed inside and invisible from yard. |
| **5. Armory Workbench & Battery** | **4.4** | **4.8** | **4.5** | Counter sill | Battery sits cleanly on armory hatch shelf with brass terminal; reads well as workshop power source. |
| **6. Roof Siren Beside Ladder** | **4.7** | **4.8** | **4.6** | Roof deck | Excellent red cone horn on steel base; swivels properly to track horde bearing when alarm triggers. |

---

## 2. Detailed Findings & What to Move

### 1. Fuel Depot Shed Door (`depot-shed`)
- **Inspection**:
  - Located at `x = -45.29, z = -17.17, y = -3.009` between the trail approach and the pump.
  - Mesh construction (`index.html:32341-32344`):
    ```js
    chainBox(g, 0.08, 1.7, 0.9, 0x6a5a48, -0.42, 0.85, 0, 0.9, 0);
    chainBox(g, 0.04, 0.16, 0.08, 0x8a9096, 0.02, 1.05, 0.46, 0.45, 0.7);
    const lock = chainBox(g, 0.09, 0.12, 0.04, 0xc4a15a, 0.02, 0.98, 0.5, 0.4, 0.75);
    ```
  - `mesh.rotation.y = Math.atan2(dx, dz)`.
- **Defect Identified**:
  - The vector `(dx, dz)` points along the player's approach toward the pump. Setting `rotation.y = Math.atan2(dx, dz)` aligns local `+Z` with the approach path.
  - However, the door geometry was constructed with `w = 0.08, d = 0.90` (width 8 cm, depth 90 cm)!
  - As a result, the door is oriented **edge-on** (like a thin vertical blade pointing toward the pump) rather than spanning across the doorway.
  - The hasp (`z = 0.46`) and padlock (`z = 0.50`) are attached to the side edge of the door, facing perpendicular to the player and partially clipping into the corrugated side wall.
- **What to Move**:
  - Swap width and depth: make door `w = 0.90, h = 1.7, d = 0.08`, centered at `x = 0, y = 0.85, z = 0`.
  - Place hasp at `x = 0.38, y = 1.05, z = 0.05` and padlock at `x = 0.38, y = 0.98, z = 0.07` so they face front and center toward the player on approach.

### 2. Price's Clipboard & Key by HQ Generator
- **Inspection**:
  - Located at `kx = F.gen.x + 0.55 = -2.45, kz = F.gen.z + 0.35 = 7.05, ky = sampleHeight = -3.169`.
  - Sits flush on the ground (`yDelta = 0.00`).
  - Model: Pale paper board (`0.28m × 0.36m`, `0xd7c6a4`) with brass key (`0.09m`, `0xc4a15a`) on top.
- **Assessment**:
  - The clipboard reads well with high-contrast parchment paper and gold metallic key.
  - However, lying flat on the ground makes it vulnerable to ground grass / foliage clipping, and feels slightly out of place for a generator mechanic's log.
- **What to Move (Recommendation)**:
  - Move the clipboard up onto the yellow generator frame / top casing at `y = gen.y + 0.72` (or onto a small wooden crate next to the generator), elevating it above ground dirt and grass.

### 3. Spare Key on Duty Board
- **Inspection**:
  - Duty board is mounted on the South exterior wall of HQ at `x = -1.62, y = -1.609, z = -5.08` with `rotation.y = Math.PI`.
  - When `chainSpareArrived` triggers (`index.html:32470-32479`):
    ```js
    const mesh = chainKeyMesh();
    mesh.position.set(p.x, p.y - 0.2, p.z);
    scene.add(mesh);
    ```
- **Defect Identified**:
  - `chainKeyMesh()` is modeled as a horizontal board lying flat on the XZ plane (`w = 0.28, h = 0.02, d = 0.36`).
  - No rotation is applied to `mesh`. Because `d = 0.36`, the clipboard extends 18 cm forward into the air and 18 cm backward **straight through the duty board and into the concrete wall**!
  - It reads as an awkward horizontal shelf protruding from the corkboard rather than a clipboard hanging on the wall.
- **What to Move**:
  - Apply rotation to match the wall board: `mesh.rotation.x = Math.PI / 2; mesh.rotation.y = Math.PI;`
  - Offset `z` by `-0.025m` (`p.z - 0.025`) so the clipboard sits flat against the cork surface of the duty board as if pinned or hanging from a peg.

### 4. HQ Pump and Water Tank (Dry & Filling)
- **Inspection**:
  - Located at `spots.pump` (`x = 1.6, z = 6.7, y = -3.169`) on the North side of HQ beside the sealed door.
  - Pump unit (`0.55 × 0.7 × 0.4m`) and Tank (`0.7 × 1.5 × 0.7m`) sit squarely on the ground with a solid collider (`r = 0.45`).
- **Read Issue Identified**:
  - `utilityProps.water` (`0.5 × 1.2 × 0.5m`, `0x3a6f8a`) scales vertically with `utilityFill` (`scale.y = 0.08 + 0.92 * fill`).
  - However, the outer tank shell (`0.7 × 1.5 × 0.7m`) is a solid opaque mesh (`MeshStandardMaterial({ color: 0x3a4048 })`).
  - The water volume is completely enclosed inside the opaque tank box and is 100% invisible to the player standing in the yard!
- **What to Move**:
  - Open the top of the tank or add an external sight-glass tube (`CylinderGeometry(0.04, 0.04, 1.2)`) on the side of the tank facing the yard with a water level indicator, so the player can actually see the tank filling without climbing on top.

### 5. Armory Front as Workbench with Battery Fitted
- **Inspection**:
  - Located at `HQ_ARMORY_FRONT` (`x = 5.9, z = 3.3, y = -2.269`).
  - The battery (`0.28 × 0.16 × 0.16m`, `0x2a2e28`) sits on the armory hatch sill counter.
  - Sits flush on the counter shelf; no clipping or floating.
- **Recommendation**:
  - Add a negative terminal post (`x = -0.10`) and a black/red jumper wire lead going into the armory hatch frame to make the connection to the workbench unmistakable.

### 6. Roof Siren Beside Ladder Head
- **Inspection**:
  - Located at `x = -3.75, z = 0.8, y = 2.231` on the HQ roof deck beside the ladder head railing.
  - Sits firmly on the steel roof deck.
  - Red cone horn on swivel turret swivels cleanly (`siren.rotation.y = bearing`) to point toward the wave origin when the klaxon sounds.
- **Verdict**:
  - **4.7/5 PASS**. Proportions, color, positioning, and wave-tracking swivel are clean and effective.

---

## 3. Test Suite Verification
- `tools/realtest.mjs t313 --all`: **19 pass, 0 fail** (CU-200 padlocked shed, key pickup, opening, spare key generation).
- `tools/realtest.mjs t314 --all`: **24 pass, 0 fail** (CU-201 utilities earn/install/power chain, plumbing, workshop, alarm, iron).

All test checks and visual GPU verifications are complete.
