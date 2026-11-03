# AG-201 — The Camo That Changes Size (`J63`)

**Date:** 2026-11-02
**Tester:** Antigravity (`Gemini 4 Argon (High)`)
**Hardware:** NVIDIA GeForce RTX 5080 (WebGPU / Dawn)
**Contact Sheet:** `qa/2026-11-02-AG-201/sheet.jpg`
**Raw Audit Data:** `qa/2026-11-02-AG-201/camo-audit.json` (`115` camo-textured draws inspected in live scene)

---

## 1. Executive Summary — What Switches & Which Material Owns Each Pop

In the Training Ground (`applyCamo('urban_digital', 'urban_digital')` or any camo swatch), **all 115 camo-mapped draws share the exact same `256×256` `CanvasTexture` (`uuid: 8216c92c-615e-407d-8b7e-f17e6dd0f119`, `repeat: [1, 1]`, `offset: [0, 0]`, `generateMipmaps: true`, `minFilter: LinearMipmapLinearFilter`, `magFilter: LinearFilter`)**.

The camo texture size does **not** pop from a mipmap switch, texture repeat mutation, or LOD swap. Instead, it pops between **two (and on the body, three) distinct world-space UV projection scales (`repeats/m`)** across four mechanisms:

| # | Pop Mechanism | What Triggers the Switch in 1P Training Ground | Materials Involved | World Camo Tile Size Before -> After (`repeats/m`) | Owner |
|---|---|---|---|---|---|
| **1** | **1P Viewmodel Sleeves vs 3P Body Sleeves & Viewmodel Gloves** | Switching between **Unarmed (`U`, Training Ground spawn) / Heavy (`minigun`, `launcher`, `flamer`, `chainsaw`) / Akimbo / Workbench UI** (`viewmodel` off -> 3P `live-sleeve` visible at `camera.fov = 60°`) and **1P Viewmodel Guns** (`pistol`, `revolver`, `m4`, `ak`, `uzi`, `shotgun`, `aa12`, `sniper` -> `vm-forearm` + `vm-cuff` visible at `VM.fov = 50°`), **OR** aiming down sights on `sniper` (`ads >= 0.82`), where `game/viewmodel.js:167` calls `setEyeHide(false)` and pops `live-sleeve` + `bodyGun` into the scope view (`05-sniper-ads-before-pop-1p.jpg` -> `06-sniper-ads-after-pop-1p.jpg`). Plus `live-sleeve-live` is **never hidden** by `setEyeHide` (`layers.mask = 1`). | `vm:wear:shirt` (`MeshStandardMaterial#bd07c220` on `vm-forearm` & `vm-cuff`), `wear:shirt` (`MeshStandardMaterial#314d89c0` on `live-sleeve`), `vm:wear:gloves` (`MeshStandardMaterial#ef263db0` on `vm-hand-glove-main`) | **`live-sleeve`**: `0.431 m` tile (`2.323 rep/m`)<br>**`vm-forearm`**: `0.334 m` tile (`2.993 rep/m`, `U = 3.405 rep/m`)<br>**`vm-cuff`**: `0.264 m` tile (`3.789 rep/m`, `U = 4.637 rep/m`)<br>**`vm-hand-glove-main`**: `0.496 m` tile (`2.017 rep/m`) | **Claude** (`studio/fp-arms.js`, `game/viewmodel.js`, `index.html`) |
| **2** | **Weapon `boxProjectUV` Applied BEFORE `weaponSizeFactor(k)` + Viewmodel `FOV 50°` vs `rackGunCopy` / 3P Body Gun `FOV 60°`** | `registerGunFurniture` (`index.html:20679-20683`) runs `boxProjectUV(P.array, uv)` (`0.42 m` tile = `2.381 rep/m` in local gun-builder space) **before** `weaponSizeFactor(k)` scales the gun down (`0.5296` on `uzi` to `0.8800` on `minigun`). Every gun gets a different world camo scale (`0.223 m` to `0.370 m`), AND `rackGunCopy` (`index.html:27248`) bakes `weaponSizeFactor(k)` into vertex positions and re-runs `if (mat.map) boxProjectUV(pos, uv)`, giving Armory Rack guns a **`0.420 m` (`2.381 rep/m`)** tile while the gun in his hands has a **`0.223–0.326 m` (`3.07–4.48 rep/m`)** tile! Furthermore, stowing `minigun` on the pack (`wScale = 0.4638`) shrinks its camo from **`0.370 m` (`2.706 rep/m`)** in hand to **`0.195 m` (`5.134 rep/m`)** on pack. | `furniture:<gun>` & `vm:furniture:<gun>` (`furniture:uzi` `#7ee80491`, `furniture:pistol` `#b31bdd9d`, `furniture:m4` `#fb3154d7` / `vm:furniture:m4` `#0e1e5e7d`, `furniture:ak` `#bf3f1ef7` / `vm:furniture:ak` `#a12a620e`, `furniture:sniper` `#a7796d1a` / `vm:furniture:sniper` `#0556631d`, `furniture:revolver` `#d2e0f2cc` / `vm:furniture:revolver` `#7cc33984`, `furniture:minigun` `#fedd7ec4` / `#bd4e92be`, etc.) | **Armory Rack Gun** (`rackGunCopy` after camo applied): `0.420 m` tile (`2.381 rep/m`)<br>**`minigun` (in hand)**: `0.370 m` (`2.706 rep/m`) vs **`minigun` (pack)**: `0.195 m` (`5.134 rep/m`)<br>**`shotgun`**: `0.333 m` (`3.000 rep/m`)<br>**`revolver`**: `0.326 m` (`3.070 rep/m`)<br>**`sniper`**: `0.304 m` (`3.291 rep/m`)<br>**`ak` / `aa12`**: `0.288 m` (`3.469 rep/m`)<br>**`m4`**: `0.284 m` (`3.525 rep/m`)<br>**`pistol`**: `0.266 m` (`3.756 rep/m`)<br>**`uzi`**: `0.223 m` (`4.479 rep/m`) | **ChatGPT** (`game/viewmodel.js` / FPS pass) & **Claude** (`index.html:20679` `registerGunFurniture`, `index.html:27248` `rackGunCopy`) |
| **3** | **Unmerged / Single-Mesh Uniform Parts & Scaled Child Meshes on Marine Body** | `mergeRigidMeshes` (`index.html:20568-20574`) only runs `boxProjectUV` when `list.length > 1` (`"leave lone meshes untouched"`), and runs in mesh-local space before child scales (`wScale = 0.0565` on two `wear:shirt` child meshes) are baked. As a result, adjacent uniform parts on the same body (and visible at the CIF mirror / workbench or when looking down in 1P) have wildly different camo scales from `0.431 m` down to `0.025 m` (**16× smaller**). | `wear:shirt` (`#314d89c0`), `wear:trousers` (`#e1179871`), `wear:carrier` (`#517acda1`), `wear:pack` (`#cf428d40`), `wear:pads` (`#34db3b24`), `wear:gloves` (`#84c2d79b`), `wear:boots` (`#876cf8db`) | **`fitted-uniform` / `live-sleeve` / `live-trouser-leg`**: `0.422–0.433 m` (`2.31–2.37 rep/m`)<br>**`wear:pack` (main)**: `0.312 m` (`3.20 rep/m`) vs **sub-pouches**: `0.092–0.101 m` (`9.85–10.83 rep/m`)<br>**`wear:carrier`**: `0.177 m` (`5.65 rep/m`) & `0.074 m` (`13.53 rep/m`)<br>**`wear:pads`**: `0.110–0.151 m` (`6.62–9.11 rep/m`)<br>**`wear:shirt` (`1980`-vert scaled children, `wScale=0.0565`)**: `0.027 m` (`36.99 rep/m` — **16× smaller!**) | **Claude** (`index.html:20568` `mergeRigidMeshes`, `studio/marine-body.js`) |
| **4** | **Shadow-Caster Proxy (`rig-skin`) vs Live Deforming Body Parts** | `bakeRigSkin` (`studio/marine-skin.js:132`) copies raw source UVs from before `mergeRigidMeshes` / world scaling into the 11 `rig-skin` SkinnedMeshes (`layers.mask = 2`). While `rig-skin` only renders into the shadow map (`layers.mask = 2`), its `wear:shirt` (`5640` verts, `39.91 rep/m`), `wear:belt` (`1572` verts `11.76 rep/m` & `144` verts `41.67 rep/m`), and `wear:holster` (`72` verts `13.38 rep/m`) carry raw unprojected UVs. | `wear:shirt` (`#314d89c0`), `wear:belt` (`#ab12c822`), `wear:holster` (`#de61975e`) on `rig-skin` | **`rig-skin` `wear:shirt`**: `0.025 m` (`39.91 rep/m`)<br>**`rig-skin` `wear:belt`**: `0.024–0.085 m` (`11.76–41.67 rep/m`)<br>**`rig-skin` `wear:holster`**: `0.075 m` (`13.38 rep/m`) | **Claude** (`studio/marine-skin.js`) |

---

## 2. Detailed Breakdown & Code Locations

### 2.1 Why the Uniform Sleeve & Glove Camo Pops in First Person (Owner: Claude)

1. **1P Viewmodel Arms (`studio/fp-arms.js:18-32, 62-63`) Use Raw Loft UVs Instead of `boxProjectUV`**:
   - On the 3P marine body, `live-sleeve` (`5238` verts, `wear:shirt` `MeshStandardMaterial#314d89c0`) and `marine-flexible-shirt` (`6720` verts, `wear:shirt`) have `boxProjectUV` applied (`0.42 m` tile), yielding **`medUVRepeatsPerM = 2.310–2.358 rep/m` (`tileMetersUV = 0.424–0.433 m`)**.
   - On the 1P viewmodel (`studio/fp-arms.js`), `buildOneArm` builds `vm-forearm` (`528` verts) and `vm-cuff` (`126` verts) via `loftRings(T, rings, 24)`. `loftRings` assigns cylindrical `0..1` UVs (`u = j / segs`, `v = i / (rings.length - 1)`) and **never runs `boxProjectUV`**.
   - Because `vm-forearm` is only `~0.29 m` around (`r = 0.036..0.052 m`) and `~0.34 m` long, a `0..1` UV wrap compresses the `256×256` camo texture to:
     - **`vm-forearm`**: `medU = 3.405 rep/m`, `medV = 2.963 rep/m`, **`medUV = 2.993 rep/m` (`tileMetersUV = 0.334 m`)**.
     - **`vm-cuff`**: `medU = 4.637 rep/m`, `medV = 2.746 rep/m`, **`medUV = 3.789 rep/m` (`tileMetersUV = 0.264 m`)**.
   - Directly attached to `vm-cuff` is `vm-hand-glove-main` (`4774` verts, `vm:wear:gloves` `MeshStandardMaterial#ef263db0`, `wScale = -1.18`), which has **`medUV = 2.017 rep/m` (`tileMetersUV = 0.496 m`)** — making the cuff camo **1.88× denser (`2.29×` along `U`)** than the glove right beside it!
2. **When It Pops in the Training Ground**:
   - **Spawn Unarmed (`U`) -> Equip Pistol (`1`) or Rifle (`3`)**: On spawn in the Training Ground (`currentWeapon === 'unarmed'`), `viewmodel.js:158` (`const on = G.firstPerson && !G.UI_OPEN && !G.akimbo && G.VM[G.w] !== undefined`) evaluates `on = false`. The player sees his 3P `live-sleeve` (`2.323 rep/m`, `0.431 m` tile) at `camera.fov = 60°` (`01-uniform-body-unarmed-1p.jpg`). Pressing `1` (`pistol`) or `3` (`m4`) activates the 1P viewmodel (`VM.fov = 50°`), popping the sleeve to `vm-forearm` (`2.993 rep/m`) + `vm-cuff` (`3.789 rep/m`) (`02-pistol-vm-1p.jpg`, `03-m4-vm-1p.jpg`).
   - **Equip Heavy Weapon (`minigun`, `launcher`, `flamer`, `chainsaw`) or Akimbo**: `G.VM[G.w]` is `undefined` for heavy weapons (`viewmodel.js:24-33`), so switching from `m4` (`03-m4-vm-1p.jpg`) to `launcher` (`08-heavy-launcher-body-sleeve-1p.jpg`) drops out of `viewmodel` and pops back to the 3P `live-sleeve` (`2.323 rep/m`) and 3P `weaponMount`.
   - **Sniper ADS Scope Threshold (`ads = 0.81 -> 0.82`)**: In `game/viewmodel.js:167`, `const scope = G.w === 'sniper' && G.ads >= 0.82; setEyeHide(!scope); rig.visible = !scope;`. At `ads = 0.80` (`05-sniper-ads-before-pop-1p.jpg`), the player sees the 1P viewmodel `vm-gun` + `vm-forearm`/`vm-cuff`. The instant `ads` crosses `0.82` (`06-sniper-ads-after-pop-1p.jpg`), `setEyeHide(false)` un-hides the 3P body arms and `weaponMount` right inside the camera frustum while hiding `vm-rig`, causing a jarring mid-ADS pop in both mesh position and camo scale.
   - **`live-sleeve-live` Is Never Hidden by `setEyeHide`**: As also noted in `AG-200`, `live-sleeve-live` is a direct child of `marine` (`live-sleeve > live-sleeve-live > marine`), not `armLG`/`armRG`, so `setEyeHide(true)` leaves `live-sleeve` (`2.323 rep/m`) on `layers.mask = 1` simultaneously with `vm-forearm` (`2.993 rep/m`).

### 2.2 Why the Weapon Camo Pops Across Guns & Against the Uniform / Rack (Owner: ChatGPT & Claude)

1. **`registerGunFurniture` (`index.html:20679-20683`) Projects `0.42 m` UVs Before `weaponSizeFactor(k)`**:
   - In `index.html:20679-20683`:
     ```js
     const P = m.geometry && m.geometry.attributes && m.geometry.attributes.position;
     const uv = m.geometry && m.geometry.attributes && m.geometry.attributes.uv;
     if (P && uv && P.count === uv.count) boxProjectUV(P.array, uv);
     ```
   - `boxProjectUV` (`index.html:20554-20566`) divides local vertex coordinates by `0.42` (`const s = 0.42; uv.setXY(i, x / s, y / s);`), which produces `1 / 0.42 = 2.381 rep/m` **only if the mesh world scale is `1.0`**.
   - Immediately afterward (`index.html:21401` and `23978`), every weapon group is scaled by `weaponSizeFactor(k)` (`0.5296` to `0.8800`), and `viewmodel.js:88-90` copies that scale (`[-s, s, s]`) onto `vm-gun`. Because the UVs were baked at scale `1.0`, the world-space camo tile on every weapon is multiplied by `weaponSizeFactor(k)`:

| Weapon (`k`) | `weaponSizeFactor(k)` (`wScale`) | Material Name (`uuid` prefix) | Measured World `repeats/m` (`medUV`) | Measured World Camo Tile (`m`) | Ratio vs Uniform (`0.428 m`) |
|---|---:|---|---:|---:|---:|
| **Uniform (`fitted-uniform` / `live-sleeve`)** | `1.0000` | `wear:shirt` (`314d89c0`) | `2.323–2.369` | **`0.422–0.431 m`** | `1.00×` |
| **`minigun` (in hand)** | `0.8800` | `furniture:minigun` (`fedd7ec4`) | `2.531–2.706` | **`0.370–0.395 m`** | `0.86×` |
| **`flamer`** | `0.8383` | `furniture:flamer` (`0c014a30`) | `2.814–2.840` | **`0.352–0.355 m`** | `0.82×` |
| **`chainsaw`** | `0.8042` | `furniture:chainsaw` (`27167d19`) | `2.955–2.957` | **`0.338 m`** | `0.79×` |
| **`shotgun`** | `0.7935` | `furniture:shotgun` (`83b9d489`) | `2.989–3.000` | **`0.333–0.335 m`** | `0.78×` |
| **`revolver`** | `0.7755` | `furniture:revolver` (`d2e0f2cc` / `vm` `7cc33984`) | `3.066–3.070` | **`0.326 m`** | `0.76×` |
| **`sniper`** | `0.7233` | `furniture:sniper` (`a7796d1a` / `vm` `0556631d`) | `3.256–3.291` | **`0.304–0.307 m`** | `0.71×` |
| **`launcher`** | `0.6978` | `furniture:launcher` (`748b6d94` / `25402a68`) | `3.310–3.409` | **`0.293–0.302 m`** | `0.69×` |
| **`ak`** | `0.6864` | `furniture:ak` (`bf3f1ef7` / `vm` `a12a620e`) | `3.448–3.469` | **`0.288–0.290 m`** | `0.67×` |
| **`aa12`** | `0.6843` | `furniture:aa12` (`6ed0f3b0`) | `3.472–3.478` | **`0.288 m`** | `0.67×` |
| **`m4`** | `0.6741` | `furniture:m4` (`fb3154d7` / `vm` `0e1e5e7d`) | `3.513–3.525` | **`0.284–0.285 m`** | `0.66×` |
| **`pistol`** | `0.6333` | `furniture:pistol` (`b31bdd9d`) | `3.739–3.756` | **`0.266–0.267 m`** | `0.62×` |
| **`uzi`** | `0.5296` | `furniture:uzi` (`7ee80491`) | `4.479` | **`0.223 m`** | `0.52×` |
| **`minigun` (stowed on pack)** | `0.4638` | `furniture:minigun` (`bd4e92be`) | `4.802–5.134` | **`0.195–0.208 m`** | `0.45×` |

2. **`rackGunCopy` (`index.html:27248`) Re-Projects UVs After Baking `weaponSizeFactor(k)`**:
   - In `index.html:27239-27248`:
     ```js
     const s = weaponSizeFactor(k);
     const S = new THREE.Matrix4().makeScale(s, s, s);
     ...
     if (mat.map && pos && uv && pos.count === uv.count) boxProjectUV(pos, uv);
     ```
   - Because `rackGunCopy` bakes `S` (`weaponSizeFactor(k)`) into `pos` first and then calls `boxProjectUV(pos, uv)` whenever `mat.map` is non-null, any rack gun built while a camo finish is active gets true `0.42 m` (`2.381 rep/m`) world-space camo tiles — while the exact same weapon in the player's hands (`weaponMeshes[k]` / `vm-gun`) has `0.223–0.335 m` (`3.00–4.48 rep/m`) tiles!
3. **1P Viewmodel `VM.fov = 50°` vs World Camera `camera.fov = 60°`**:
   - When `viewmodel` is active (`G.s = 1.0`), `viewmodel.js:184-187` renders `vm-rig` with `camera.fov = 50°` (`tan(25°) / tan(30°) = 0.808`, a `1.237×` screen-space magnification relative to `60°` world FOV). When the player opens the Workbench/CIF UI (`G.UI_OPEN = true`), switches to a heavy weapon, or enters Sniper ADS (`>= 0.82`), rendering switches from the `50°` `vm-gun` to the `60°` `weaponMount` body gun.

### 2.3 Why Uniform Parts on the Same Body Have 3 Different Camo Scales (Owner: Claude)

In `index.html:20568-20574`, `mergeRigidMeshes(root)`:
1. Skips any `(parent, material)` bucket with `list.length <= 1` (`"leave lone meshes untouched"`), so single-mesh uniform pieces keep their raw `0..1` lathe/extrude/tube UVs instead of `0.42 m` `boxProjectUV`.
2. Runs `boxProjectUV(pos, uv)` in `parent`-local space before ancestor scales are applied. Two `wear:shirt` meshes (`1980` vertices each) sit under a parent with world scale `wScale = 0.0565`, shrinking their `0.42 m` local UV projection to **`0.027 m` (`36.99 rep/m`, 16× smaller)** in world space (`07-cif-mirror-body-uniform-parts.jpg`).
3. Runs **after** `bakeRigSkin(g)` (`index.html:21259-21260`), so the `rig-skin` SkinnedMeshes (`layers.mask = 2`) retain unprojected local UVs (`39.91 rep/m` on `wear:shirt`, `11.76–41.67 rep/m` on `wear:belt`, `13.38 rep/m` on `wear:holster`).

Full measured table of uniform materials on the live marine (`qa/2026-11-02-AG-201/camo-audit.json`):

| Uniform Material (`uuid` prefix) | Mesh / Part | Vertices | `layers` | World Scale (`wScale`) | Measured `repeats/m` (`medUV`) | Measured World Tile (`m`) |
|---|---|---:|---:|---:|---:|---:|
| `wear:shirt` (`314d89c0`) | `fitted-uniform` (torso) | `7,584` | `1` | `1.000` | `2.369` | **`0.422 m`** |
| `wear:shirt` (`314d89c0`) | `marine-flexible-shirt` (waist) | `6,720` | `1` | `1.000` | `2.358` | **`0.424 m`** |
| `wear:shirt` (`314d89c0`) | `live-sleeve` (L & R 3P sleeves) | `5,238` ×2 | `1` | `1.000` | `2.310–2.323` | **`0.431–0.433 m`** |
| `vm:wear:shirt` (`bd07c220`) | `vm-forearm` (L & R 1P sleeves) | `528` ×2 | `1` | `1.000` | **`2.993`** (`U: 3.405`) | **`0.334 m`** (`U: 0.294 m`) |
| `vm:wear:shirt` (`bd07c220`) | `vm-cuff` (L & R 1P cuffs) | `126` ×2 | `1` | `1.000` | **`3.789`** (`U: 4.637`) | **`0.264 m`** (`U: 0.216 m`) |
| `wear:shirt` (`314d89c0`) | Scaled child shirt meshes (×2) | `1,980` ×2 | `1` | **`0.0565`** | **`36.994`** | **`0.027 m` (16× smaller!)** |
| `wear:shirt` (`314d89c0`) | `rig-skin` (shadow proxy) | `5,640` | `2` | `1.000` | **`39.908`** | **`0.025 m`** |
| `wear:trousers` (`e1179871`) | `live-trouser-leg` (L & R) / `live-seat` | `6,522` / `3,714` | `1` | `1.000` | `2.266–2.337` | **`0.428–0.441 m`** |
| `wear:carrier` (`517acda1`) | Plate carrier merged buckets (×2) | `2,448` / `3,264` | `1` | `1.000` | **`5.649` / `13.532`** | **`0.177 m` / `0.074 m`** |
| `wear:pack` (`cf428d40`) | Assault pack main & sub-buckets | `1,956` / `1,776` / `1,536` | `1` | `1.000` | **`3.204` / `9.853` / `10.830`** | **`0.312 m` / `0.101 m` / `0.092 m`** |
| `wear:pads` (`34db3b24`) | Knee/elbow pads (`live-trouser-leg` & `rig-skin`) | `264` / `34` | `1, 2` | `1.000` | **`6.620–9.106`** | **`0.110–0.151 m`** |
| `wear:gloves` (`84c2d79b`) | `gb152-hand` (3P L & R hands) | `4,774` ×2 | `1` | `0.785` | `2.999–3.005` | **`0.333 m`** |
| `vm:wear:gloves` (`ef263db0`) | `vm-hand-glove-main` (1P L & R hands) | `4,774` ×2 | `1` | `-1.180` | `2.017` | **`0.496 m`** |
| `wear:belt` (`ab12c822`) | `rig-skin` belt buckets | `1,572` / `144` | `2` | `1.000` | **`11.763` / `41.667`** | **`0.085 m` / `0.024 m`** |
| `wear:holster` (`de61975e`) | `rig-skin` holster | `72` | `2` | `1.000` | **`13.383`** | **`0.075 m`** |

---

## 3. Recommended Fixes by Owner

1. **Claude (`studio/fp-arms.js`, `index.html`, `studio/marine-body.js`, `studio/marine-skin.js`)**:
   - In `studio/fp-arms.js` (`buildOneArm`), apply `boxProjectUV` (at `0.42 m` world scale) to `vm-forearm` and `vm-cuff` (and normalize `vm-hand-glove-main` UV scale against its `1.18` scale) so 1P viewmodel sleeves and gloves match `live-sleeve` (`~2.35 rep/m`, `0.425 m` tile) without a seam at the wrist or a pop when toggling `viewmodel`.
   - In `index.html:20568` (`mergeRigidMeshes`), also run `boxProjectUV` on `list.length === 1` camo-slot meshes (`wear:*`) using their world-relative scale (fixing the `wScale = 0.0565` `36.99 rep/m` shirt pieces, `wear:carrier` `13.53 rep/m`, `wear:pack` `10.83 rep/m`, and `wear:pads` `9.11 rep/m`).
   - In `index.html:20679` (`registerGunFurniture`), divide the `boxProjectUV` scale `s = 0.42` by `weaponSizeFactor(k)` (`const s = 0.42 / weaponSizeFactor(gunKey)`) so every weapon's world-space camo tile is `0.42 m` (`2.381 rep/m`) after `weaponSizeFactor(k)` is applied, matching both the uniform and `rackGunCopy`.
2. **ChatGPT (`game/viewmodel.js` — `D-111` FPS Pass)**:
   - Include `live-sleeve-live` in `setEyeHide(hide)` so the 3P `live-sleeve` (`2.323 rep/m`) is hidden whenever the 1P viewmodel (`vm-forearm`/`vm-cuff`) is active.
   - Keep `viewmodel` active or smoothly transition during `sniper` ADS (`ads >= 0.82`) instead of calling `setEyeHide(false)` while looking straight ahead (`viewmodel.js:167`), eliminating the mid-ADS sleeve/gun pop caught in `05-sniper-ads-before-pop-1p.jpg` -> `06-sniper-ads-after-pop-1p.jpg`.

---

## 4. Captured Frames (`qa/2026-11-02-AG-201/`)

- `sheet.jpg`: 8-panel annotated comparison contact sheet (`2×4` grid).
- `01-uniform-body-unarmed-1p.jpg`: 1P unarmed (`U`) looking at 3P body sleeves (`live-sleeve`, `2.32 rep/m`, `0.431 m` tile) and torso (`fitted-uniform`, `2.37 rep/m`).
- `02-pistol-vm-1p.jpg`: 1P `pistol` viewmodel showing `vm-forearm` (`2.99 rep/m`), `vm-cuff` (`3.79 rep/m`), `vm-hand-glove-main` (`2.02 rep/m`), and `pistol` furniture (`3.76 rep/m`, `0.266 m` tile).
- `03-m4-vm-1p.jpg`: 1P `m4` viewmodel (`3.52 rep/m`, `0.284 m` tile) with `vm-forearm`/`vm-cuff` (`2.99–3.79 rep/m`).
- `04-uzi-vm-1p.jpg`: 1P `uzi` viewmodel (`4.48 rep/m`, `0.223 m` tile — finest weapon camo scale due to `weaponSizeFactor('uzi') = 0.5296`).
- `05-sniper-ads-before-pop-1p.jpg`: 1P `sniper` ADS just before threshold (`ads = 0.80`) — rendering 1P viewmodel `vm-gun` + `vm-forearm`/`vm-cuff` at `VM.fov = 50°`.
- `06-sniper-ads-after-pop-1p.jpg`: 1P `sniper` ADS right at threshold (`ads = 0.83`) — `setEyeHide(false)` pops 3P `live-sleeve` (`2.32 rep/m`) and 3P `weaponMount` into the view at `camera.fov = 60°`.
- `07-cif-mirror-body-uniform-parts.jpg`: CIF / uniform inspection showing adjacent `wear:shirt` (`2.37 rep/m` vs `36.99 rep/m` scaled child meshes), `wear:carrier` (`5.65` & `13.53 rep/m`), and `wear:pads` (`6.62–9.11 rep/m`).
- `08-heavy-launcher-body-sleeve-1p.jpg`: 1P `launcher` (no viewmodel entry -> falls back to 3P `live-sleeve` at `2.32 rep/m` + 3P `launcher` at `3.41 rep/m`).
