# antigravity — AG-204b the stone kit at the hedge's triangle budget — 2026-11-02

Changed:
- Re-engineered `world/stone-wall-kit.js` to drastically reduce triangle count under the hedge bands' triangle budget:
  - Fewer, larger stones in courses: reduced from 6-7 courses of multi-segmented boxes to 2 large courses (foundation + upper bond course) using single-segment box geometry (12 triangles per block), with silhouette and flat coping carrying the visual read.
  - Replaced 60-triangle dodecahedron moss rocks with 2-triangle horizontal plane cards flat on coping capstones.
  - Replaced high-poly cylinder vines + icosahedron leaf clusters with 2-triangle vertical plane cards hugging wall faces (`side: THREE.DoubleSide`).
  - Added far LOD textured slabs (12 triangles) past ~48 m for deep woods wall bands.
  - Increased station step length from 1.35 m to 2.10 m, reducing total world stations by ~36% while preserving unbroken occlusion.
  - Studio arc triangle count reduced from 55,176 triangles (165k coords) to **1,428 triangles (4,284 coords)** — a **97.4% reduction**, well below the hedge bands' triangle budget.
  - Exactly 3 draw calls preserved: `stone-wall-masonry` (1,368 tris), `stone-wall-moss` (36 tris), `stone-wall-ivy` (24 tris), with `castShadow = true, receiveShadow = true`.
- Fixed GP-20016 view gun capture in `qa/2026-11-02-AG-204/run-ag204.mjs`:
  - Added async wait loop and strict assertions before every capture ensuring `TT.getCurrentWeapon() === wKey` and `TT.viewmodelDbg().info.key === wKey` with `raise >= 0.99`.
  - Recaptured all 5 guns (Revolver, Chainsaw, Minigun, Flamer, Launcher) across 4 lights (Noon, Overcast, Dusk, Night) at Hip, ADS, and Reload.
  - Verified actual named models and HUD indicators in screenshots; confirmed chainsaw bar centeredness defect and minigun under-housing palm bearing.
  - Rebuilt all contact sheets via `build-sheets.py`: `sheet-gp20016.jpg`, `sheet-stone-wall.jpg`, `sheet-j52-j63.jpg`, and composite `sheet.jpg`.
- Verified `t329` corridor clearances: 10 PASS / 0 FAIL under standard mode, and 10 PASS / 0 FAIL under `?walls=stone` (24.1s).

Files:
- `world/stone-wall-kit.js`
- `qa/2026-11-02-AG-204/run-ag204.mjs`
- `qa/2026-11-02-AG-204/stone-wall/stone-wall-stats.json`
- `qa/2026-11-02-AG-204/gp20016/gp20016-scores.json`
- `qa/2026-11-02-AG-204/sheet-gp20016.jpg`
- `qa/2026-11-02-AG-204/sheet-stone-wall.jpg`
- `qa/2026-11-02-AG-204/sheet.jpg`
- `handoffs/2026-11-02-antigravity-AG-204b.md`

Tests:
- Real WebGPU runner on Jerry's RTX 5080 PC via `crew.mjs slot run`:
  - Full AG-204 batch run (J52, J63, GP-20016, Stone Wall Studio) exited 0.
  - GP-20016: 5 guns x 4 lights x (Hip, ADS, Reload) verified with strict key assertions.
  - Stone Wall Kit: 3 spots x 4 lights x 2 modes (hedge, stone) rendered to `qa/2026-11-02-AG-204/stone-wall/`.
- Suite tests:
  - `t329`: 10 pass, 0 fail (corridor clearance).
  - `t329` with `?walls=stone`: 10 pass, 0 fail (corridor clearance with stone wall bands active).
  - `tcl295`: 9 pass, 0 fail (hunt ground step audio).
  - `tcl295b`: 10 pass, 0 fail (training ground audio).

Screenshots:
- `qa/2026-11-02-AG-204/sheet-stone-wall.jpg`
- `qa/2026-11-02-AG-204/sheet-gp20016.jpg`
- `qa/2026-11-02-AG-204/sheet-j52-j63.jpg`
- `qa/2026-11-02-AG-204/sheet.jpg`

Not verified:
- Cursor's upcoming A/B re-run on the two seats (waits on Cursor).

Requests:
- To `cursor`: AG-204b is complete. `world/stone-wall-kit.js` is cut to 1,428 triangles (97.4% reduction, well under hedge bands' budget). Ready for your two-seat A/B re-run (night 20 & noon woods) under CU-232.
- To `chatgpt`: Recaptured all 5 guns in 4 lights with strict real-time weapon and vm.info.key assertions; valid actual weapon models and HUDs confirmed in `qa/2026-11-02-AG-204/gp20016/` and `sheet-gp20016.jpg`.
- To `claude`: `CL-295` INFO lines reported (tcl295 9/0, tcl295b 10/0); `AG-204b` kit triangle budget resolved.

Contract changes:
- None.
