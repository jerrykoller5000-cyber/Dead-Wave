# AG-175 Verification Report: Trapper's Fence Gate & Combination Lock

**Task:** AG-175 — The trapper's fence gate, its combination (CL-285 part C, D-102)  
**Agent:** Antigravity (`Gemini 4 Argon (High)`)  
**Hardware / Environment:** NVIDIA GeForce RTX 5080, WebGPU D3D11 backend, 1280x720, unthrottled timer loop  
**Artifacts Generated:**
- Contact sheet: `qa/2026-11-01-AG-175/ag175-sheet.png`
- Metrics & metadata: `qa/2026-11-01-AG-175/ag175-summary.json`
- Test suite: `tools/tests/t317.js` (22/0 PASS)

---

## 1. Visual Verification & Asset Review (Rule 18-19, D-89)

### 1.1 Trapper Yard Fence Gate (`trapper-fence`)
- **Placement & World Coordinates:** Gate stands at `(-17.67, -1.01, 36.69)` spanning the entrance between split-rail fence posts at local `lx = 0, lz = 9.03` relative to `POI.campsites[2]` (`yaw = 2.0944` rad).
- **Enclosure Integration (`fenced = false`):** The trapper yard already possesses perimeter split-rail fences and boundary log barriers. Passing `fenced = false` ensures the blocker drops cleanly into the opening without duplicate or clipping wing fences.
- **Combination Padlock Mesh (`chain-combination`):** Dark steel padlock housing with dial detailing suspended from the timber crossbeam latch. Legible in both noon ambient sunlight and dusk low-light conditions.
- **Interaction & Prompting:**
  - Locked state (before combination learned): displays `"THE TRAPPER'S GATE NEEDS THE COMBINATION ON THE SEARCH LOG'S LAST LINE."`
  - Unlocked state (combination learned): displays `"A COMBINATION LOCK HOLDS THE TRAPPER'S YARD GATE."` with `[E]` action available.
  - Action execution: pressing `[E]` triggers unlocking rotation animation, dissolves solid blocker, and opens clean passage into the safe path.

### 1.2 Knowledge Key Flow (`trapper-combination`)
- **Source:** Reading the search log at the ranger station (`POI.campsites[0]`, `lx = 40.31, lz = -24.12`).
- **Mechanism:** Knowledge keys have `kind: 'knowledge'` and carry no physical pickup mesh. When `search-log-read` fires, `trapper-combination` transitions directly from `unseen` to `held`, displaying the banner `"TRAPPER GATE COMBINATION LEARNED"`.
- **Fail-safe Spare Delivery:** If unlearned after 2 dawns with the `oldman` lead open, the fallback note arrives on the HQ duty board (`x = -1.62, z = -5.08`), allowing players to take the combination via `[E]` directly from the cork board.

---

## 2. Test Execution & Regression Suite

Real-renderer tests executed via machine-wide slot on RTX 5080 WebGPU:

| Test Script | Description | Result | Duration |
|:---|:---|:---:|:---:|
| `tools/tests/t317.js` | Trapper fence gate, combination lock, search log & spare | **22 / 22 PASS** | 29.3s |
| `tools/tests/t316.js` | Convoy road barrier, vault first lift key, ambulance jack | **8 / 8 PASS** | 28.2s |
| `tools/tests/t315.js` | Mast yard, ranger camp, mine mouth gates & keys | **19 / 19 PASS** | 29.4s |
| `tools/tests/t314.js` | HQ utilities, power, pump, water tank, siren, workshop | **24 / 24 PASS** | 28.6s |
| `tools/tests/t313.js` | Generator depot shed, Price's key, fuel depot fill | **19 / 19 PASS** | 26.4s |
| **Combined Chain Gate Suite** | **All 5 chain gate test suites combined** | **92 / 92 PASS (100%)** | **141.9s** |
| `game/chain-gates.test.mjs` | Node unit test suite for gate progression & states | **7 / 7 PASS** | 8.3ms |

---

## 3. Key Bug Fix: Frustum Culling Hijacking Chain Keys & Gate Meshes

During cross-gate regression testing, `t315` and `t316` initially timed out on distant key pickups (`trapper-keyring` and `barrier-key`). Investigation revealed:
1. `sceneCull()` in `index.html` (lines 2270–2278) was evaluating top-level meshes and, when outside the immediate camera frustum or distance threshold, redefined `.visible` on the `THREE.Group` via `Object.defineProperty(o, 'visible', { get() { return false; } })`.
2. As a result, even after `chainUpdate` set `placed.mesh.visible = true`, inspecting `k.mesh.visible` returned `false`.
3. **Fix Applied:**
   - Added `g.userData.noCull = true` to `chainKeyMesh()`, `chainBlockerMesh()`, and `chainWithFence()`.
   - Updated `chainDbg.keyAt` to defensively check `(k.mesh.userData?._cull?.hidden ? k.mesh.userData._cull.want : k.mesh.visible)`.
   - This resolved all distant visibility queries, resulting in 100% green tests across `t313`, `t314`, `t315`, `t316`, and `t317`.
