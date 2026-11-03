Changed:
- Completed `AG-201` (`J63`: *The camo that changes size*) in the Training Ground on Jerry's RTX 5080 WebGPU PC, capturing the camo scale pops in frames (`qa/2026-11-02-AG-201/sheet.jpg`, `01`–`08`) and auditing all `115` camo-textured draws in the live scene (`qa/2026-11-02-AG-201/camo-audit.json`, `qa/2026-11-02-AG-201/report.md`).
- Verified that all `115` camo-mapped draws share the exact same `256×256` `CanvasTexture` (`uuid: 8216c92c-615e-407d-8b7e-f17e6dd0f119`, `repeat: [1, 1]`, `generateMipmaps: true`, `minFilter: LinearMipmapLinearFilter`). The pop is not a mip or LOD change — it is caused by mismatched world-space UV projection density (`repeats/m`) across meshes and materials that swap visibility in first person:
  1. **Uniform Sleeve & Glove Pop (Owner: Claude — `studio/fp-arms.js`, `index.html`; ChatGPT — `game/viewmodel.js`)**:
     - On the 3P marine body, `live-sleeve` (`wear:shirt` `MeshStandardMaterial#314d89c0`, `5238` verts) has `boxProjectUV` applied (`2.310–2.323 rep/m`, **`0.431–0.433 m` tile**), matching `fitted-uniform` (`2.369 rep/m`, **`0.422 m` tile**).
     - On the 1P viewmodel (`studio/fp-arms.js:18-32, 62-63`), `vm-forearm` (`528` verts) and `vm-cuff` (`126` verts, `vm:wear:shirt` `MeshStandardMaterial#bd07c220`) use cylindrical `0..1` `loftRings` UVs without `boxProjectUV`, compressing the camo to **`2.993 rep/m` (`0.334 m` tile, `U = 3.405 rep/m`) on `vm-forearm`** and **`3.789 rep/m` (`0.264 m` tile, `U = 4.637 rep/m`) on `vm-cuff`**, right beside `vm-hand-glove-main` (`vm:wear:gloves` `#ef263db0`, `wScale = -1.18`, **`2.017 rep/m`, `0.496 m` tile**).
     - Whenever the player switches between `viewmodel` off (unarmed `U` on spawn in Training Ground, heavy weapons `minigun`/`launcher`/`flamer`/`chainsaw`, akimbo, Workbench/CIF UI) and `viewmodel` on (`pistol`, `revolver`, `m4`, `ak`, `uzi`, `shotgun`, `aa12`, `sniper`), OR crosses `sniper` ADS `ads >= 0.82` where `game/viewmodel.js:167` calls `setEyeHide(false)` (`05-sniper-ads-before-pop-1p.jpg` -> `06-sniper-ads-after-pop-1p.jpg`), the sleeve pops between `live-sleeve` (`2.323 rep/m` at `camera.fov = 60°`) and `vm-forearm`/`vm-cuff` (`2.993–3.789 rep/m` at `VM.fov = 50°`). In addition, `live-sleeve-live` is not inside `armLG`/`armRG` and is never hidden by `setEyeHide(true)`.
  2. **Weapon Camo Scale Pop Across Guns & Against Rack / Uniform (Owner: Claude — `index.html:20679` `registerGunFurniture`, `index.html:27248` `rackGunCopy`; ChatGPT — `game/viewmodel.js`)**:
     - `registerGunFurniture` (`index.html:20679-20683`) runs `boxProjectUV(P.array, uv)` (`0.42 m` tile = `2.381 rep/m` in gun-builder local space) **before** `weaponSizeFactor(k)` scales each weapon down (`0.5296` to `0.8800`), and `viewmodel.js:88-90` copies that scale (`[-s, s, s]`) to `vm-gun`. Every weapon therefore gets a shrunk world-space camo tile proportional to `weaponSizeFactor(k)`:
       - `uzi` (`wScale = 0.5296`, `furniture:uzi` `#7ee80491`): **`4.479 rep/m` (`0.223 m` tile)**
       - `pistol` (`wScale = 0.6333`, `furniture:pistol` `#b31bdd9d`): **`3.756 rep/m` (`0.266 m` tile)**
       - `m4` (`wScale = 0.6741`, `furniture:m4` `#fb3154d7` / `vm:furniture:m4` `#0e1e5e7d`): **`3.525 rep/m` (`0.284 m` tile)**
       - `ak` / `aa12` (`wScale = 0.6864` / `0.6843`): **`3.469–3.478 rep/m` (`0.288 m` tile)**
       - `launcher` (`wScale = 0.6978`): **`3.409 rep/m` (`0.293 m` tile)**
       - `sniper` (`wScale = 0.7233`): **`3.291 rep/m` (`0.304 m` tile)**
       - `revolver` (`wScale = 0.7755`): **`3.070 rep/m` (`0.326 m` tile)**
       - `shotgun` (`wScale = 0.7935`): **`3.000 rep/m` (`0.333 m` tile)**
       - `minigun` (`wScale = 0.8800` in hand vs `0.4638` stowed on pack): **`2.706 rep/m` (`0.370 m` tile) in hand vs `5.134 rep/m` (`0.195 m` tile) stowed on pack**!
     - Meanwhile, `rackGunCopy` (`index.html:27248`) bakes `weaponSizeFactor(k)` into vertex positions first and then re-runs `if (mat.map) boxProjectUV(pos, uv)`, giving Armory Rack guns a **`2.381 rep/m` (`0.420 m`)** tile while the gun in his hands has a **`3.00–4.48 rep/m` (`0.223–0.333 m`)** tile.
  3. **Unmerged / Scaled Child Uniform Parts & `rig-skin` Shadow Proxy on the Marine Body (Owner: Claude — `index.html:20568` `mergeRigidMeshes`, `studio/marine-skin.js`)**:
     - `mergeRigidMeshes` skips `list.length <= 1` buckets and runs before child scales are baked, leaving two `1980`-vert `wear:shirt` child meshes (`wScale = 0.0565`) at **`36.994 rep/m` (`0.027 m` tile — 16× smaller)**, `wear:carrier` (`#517acda1`) at **`5.649` & `13.532 rep/m` (`0.177 m` & `0.074 m`)**, `wear:pack` (`#cf428d40`) at **`3.204` & `9.853–10.830 rep/m` (`0.312 m` & `0.092 m`)**, `wear:pads` (`#34db3b24`) at **`6.620–9.106 rep/m` (`0.110–0.151 m`)**, and `rig-skin` (`layers.mask = 2`) `wear:shirt` / `wear:belt` / `wear:holster` at **`11.76–41.67 rep/m` (`0.024–0.085 m`)**.

Files:
- `qa/2026-11-02-AG-201/report.md`
- `qa/2026-11-02-AG-201/sheet.jpg`
- `qa/2026-11-02-AG-201/camo-audit.json`
- `qa/2026-11-02-AG-201/01-uniform-body-unarmed-1p.jpg`
- `qa/2026-11-02-AG-201/02-pistol-vm-1p.jpg`
- `qa/2026-11-02-AG-201/03-m4-vm-1p.jpg`
- `qa/2026-11-02-AG-201/04-uzi-vm-1p.jpg`
- `qa/2026-11-02-AG-201/05-sniper-ads-before-pop-1p.jpg`
- `qa/2026-11-02-AG-201/06-sniper-ads-after-pop-1p.jpg`
- `qa/2026-11-02-AG-201/07-cif-mirror-body-uniform-parts.jpg`
- `qa/2026-11-02-AG-201/08-heavy-launcher-body-sleeve-1p.jpg`
- `handoffs/2026-11-02-antigravity-AG-201.md`

Tests:
- Booted `index.html` in headless Chrome with hardware WebGPU on NVIDIA GeForce RTX 5080, entered Training Ground in 1P (`cameraMode = 'first'`), applied `urban_digital` camo to uniform + weapons, and ran a live triangle-by-triangle world-vs-UV edge ratio probe across all `115` camo-mapped meshes (`qa/2026-11-02-AG-201/camo-audit.json`).
- Captured all 8 comparison frames and assembled `qa/2026-11-02-AG-201/sheet.jpg`, visually inspecting the contact sheet to verify every pop is clearly framed and readable.

Screenshots:
- `qa/2026-11-02-AG-201/sheet.jpg`
- `qa/2026-11-02-AG-201/01-uniform-body-unarmed-1p.jpg`
- `qa/2026-11-02-AG-201/02-pistol-vm-1p.jpg`
- `qa/2026-11-02-AG-201/03-m4-vm-1p.jpg`
- `qa/2026-11-02-AG-201/04-uzi-vm-1p.jpg`
- `qa/2026-11-02-AG-201/05-sniper-ads-before-pop-1p.jpg`
- `qa/2026-11-02-AG-201/06-sniper-ads-after-pop-1p.jpg`
- `qa/2026-11-02-AG-201/07-cif-mirror-body-uniform-parts.jpg`
- `qa/2026-11-02-AG-201/08-heavy-launcher-body-sleeve-1p.jpg`

Not verified:
- Diagnostic and visual QA task only; no production code was modified.

Requests:
- To `claude`: Fix uniform and weapon UV projection density (`studio/fp-arms.js` `vm-forearm`/`vm-cuff` `boxProjectUV`, `index.html:20679` `registerGunFurniture` `0.42 / weaponSizeFactor(k)` scaling, and `index.html:20568` `mergeRigidMeshes` lone-mesh & scaled-child `boxProjectUV`).
- To `chatgpt`: In `game/viewmodel.js` (`D-111` FPS pass), hide `live-sleeve-live` in `setEyeHide(true)` and prevent `sniper` ADS (`ads >= 0.82`) from popping `live-sleeve` / `weaponMount` into the 1P scope view.

Contract changes:
- None.
