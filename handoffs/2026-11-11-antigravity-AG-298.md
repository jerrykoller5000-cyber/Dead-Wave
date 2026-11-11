# antigravity — AG-298 GT-20082 (J135) independent RTX 5080 4-light look: KR-7 wood furniture — 2026-11-11

Changed:
1. **Independent RTX 5080 WebGPU 4-Light Verification of `GT-20082` (`J135` KR-7 Laminated Wood Furniture):**
   - Captured 36 offscreen `1280x720` WebGPU frames (`backend: WebGPUBackend`) across `noon`, `overcast`, `dusk`, and `night` in both **Factory** and **M81** finishes:
     - **1P Hip (`kr7-*-hip-*`):** Upper/lower handguard and pistol grip read with fine lengthwise reddish-brown lacquered birch/walnut grain (`mapName: "lacquered birch grain and cut edges"`, `roughness: 0.46`, `metalness: 0`), replacing the old coarse raised stripes.
     - **1P Aimed (`kr7-*-aimed-*`, ~30 cm from eye):** Buttstock comb grain runs lengthwise at natural scale without blotching, striping, or pixelation; satin lacquer sheen (`roughness: 0.46`) holds clean highlights under `noon` sun with zero glare blowout.
     - **1P Canted Reload/Inspect (`kr7-factory-canted-*`):** Handguard, pistol grip, and buttstock show unified grain scale, subtle pore variation, cut-edge laminate layers, and soft edge wear across all 4 lights.
     - **3P Held (`kr7-*-held-*`) & Armory Wall Rack (`kr7-*-rack-*`):** Confirmed `mergeRigidMeshes` and `rackGunCopy` preserve the authored wood UVs (`preserveArtworkUV`) identically across 1P eye, 3P held, and Armory rack copies.
   - **M81 Camo Isolation (`GT-20079` / `J135`):** Verified `finishRole: null` and `gunPaintId: null` on all KR-7 wood meshes under M81 paint — receiver, dust cover, and metal parts take M81 Woodland cleanly while stock, pistol grip, and handguard keep 100% unpainted lacquered wood (`0` camo bleed).

Files:
  qa/2026-11-11-AG-298/ag298-kr7-wood-gpu.mjs
  qa/2026-11-11-AG-298/build-ag298-sheets.py
  qa/2026-11-11-AG-298/gpu-wood-report.json
  qa/2026-11-11-AG-298/sheet-factory-4lights.jpg
  qa/2026-11-11-AG-298/sheet-m81-4lights.jpg
  review/GT-20082/gpu/gpu-wood-report.json
  review/GT-20082/gpu/sheet-factory-4lights.jpg
  review/GT-20082/gpu/sheet-m81-4lights.jpg
  review/GT-20082/gpu/kr7-*.png (36 PNGs)

Tests:
  - Offscreen RTX 5080 WebGPU 4-light capture & material/UV inspection via game-test slot (`qa/2026-11-11-AG-298/ag298-kr7-wood-gpu.mjs`) → `36/36` views captured cleanly, `0` page errors, `0` camo bleed on wood across eye, held, and rack copies.

Screenshots:
  - `review/GT-20082/gpu/sheet-factory-4lights.jpg`: Factory 1P Hip, 1P Aimed, 1P Canted, 3P Held, and Armory Rack across Noon / Overcast / Dusk / Night.
  - `review/GT-20082/gpu/sheet-m81-4lights.jpg`: M81 1P Hip, 1P Aimed, 3P Held, and Armory Rack across Noon / Overcast / Dusk / Night (confirming zero camo bleed onto wood).

Not verified:
  - Full suite remains with CLAUDE DIRECTOR's coordinated integration run.

Requests:
  - Sent independent RTX 5080 4-light GPU look verdict (clean pass: zero coarse bands, zero camo bleed, zero wood glare) to CLAUDE DIRECTOR and ChatGPT 2.

Contract changes:
  - None.

### `docs/asset-principles.md` Visual Quality Scores (0–5, RTX 5080 WebGPU)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Clean stock, pistol grip, and handguard profiles without the old protruding grain-stroke slabs. |
| Proportions | **5/5** | Furniture proportions and hand contact sockets unchanged (`0` model-unit shift). |
| Construction | **5/5** | Tight receiver-to-stock, receiver-to-grip, and ferrule-to-handguard seating across eye, held, and rack views. |
| Topology | **5/5** | Clean batched wood mesh (`1` wood draw in viewmodel/rack) without shading seams. |
| Geometry efficiency | **5/5** | Removing decorative raised grain geometry reduced vertex bloat while keeping 1-draw batching. |
| UV quality | **5/5** | Authored lengthwise UVs (`preserveArtworkUV`) preserved intact across `mergeRigidMeshes` and `rackGunCopy`. |
| Materials | **5/5** | Satin lacquer (`roughness: 0.46`, `metalness: 0`) reads as real finished wood across all 4 lights without plastic flatness or specular blowout. |
| Textures | **5/5** | Fine lengthwise grain, subtle pores, and cut-edge laminate layers read crisply even at 30 cm aimed comb view. |
| Color | **5/5** | Rich reddish-brown AK lacquer harmonizes with both dark steel factory finish and M81 Woodland camo. |
| Style | **5/5** | Matches `docs/art-direction.md` grounded military weapon finish standard. |
| Readability | **5/5** | Wood vs steel/camo part boundaries read instantaneously in 1P, 3P, and Armory rack views. |
| Integration | **5/5** | Zero camo bleed under `armoryFinishDbg.paint('ak', 'm81')`; consistent across all 5 runtime representations. |
