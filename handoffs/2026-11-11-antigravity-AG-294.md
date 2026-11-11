# antigravity — AG-294 J129 (D-144): ChatGPT 2's revised guns in the real game on the RTX 5080 — 2026-11-11

Changed: Captured and audited ChatGPT 2's revised weapons in the live Training Ground range on NVIDIA GeForce RTX 5080 WebGPU (`shotgun`, `ak` / KR-7, `revolver`, `uzi` / Wasp including the 03:50Z 29.7 mm live-round fix, plus newly landed `aa12` / Breacher-12 from 03:45Z GT-20077). Used `H.attach` per-frame 4-light illumination (`Noon`, `Overcast`, `Dusk`, `Night`), verified clean `Hip` (`ads=0`), `Aimed` (`ads=1`), and `Reload` (`46%` + Wasp `74%` live-round) poses in both `Factory` and `M81` woodland camo, plus GT-20079 camera-matched Armory Rack views (`Factory`, `M81`, `M81 + Fitted Mods`) and 1P fitted-attachment checks (`140` unique PNGs, `0` duplicates, `0` blank frames, `0` page errors). Also guarded `.userData.isDecal` in `world/training-wear.js` and `world/training.js` (`22/22` `world/training*.test.mjs` Node unit tests green) and filed cross-owner AG-292 prop breach requests.
Files:
  tools/ag294-capture.mjs
  tools/ag294-slot-batch.mjs
  tools/build-ag294-sheets.py
  world/training-wear.js
  world/training.js
  review/AG-294/shotgun.jpg
  review/AG-294/ak.jpg
  review/AG-294/revolver.jpg
  review/AG-294/wasp.jpg
  review/AG-294/breacher.jpg
  review/AG-294/sheet.jpg
  review/AG-294/capture-manifest.json
  review/AG-294/gpu-diagnostics.json
Tests:
  - `node crew/crew.mjs slot run antigravity AG-294 ... -- node tools/ag294-slot-batch.mjs` -> PASS (`140` unique WebGPU PNGs across 5 guns, `0` page errors, SHA-256 uniqueness & M81 pose-delta assertions `37.1–52.9` PASS).
  - `node --test world/training.test.mjs world/training-wear.test.mjs world/training-build-wear.test.mjs world/training-tunnel.test.mjs` -> `22 pass, 0 fail`.
Screenshots:
  review/AG-294/shotgun.jpg (28-panel GT-20077/20079-cropped matrix: Factory & M81 Hip/Aimed/Reload in 4 lights + Rack Factory/M81/Fitted + 1P Fitted)
  review/AG-294/ak.jpg (28-panel GT-20077/20079-cropped matrix: KR-7 Factory & M81 Hip/Aimed/Reload in 4 lights + Rack Factory/M81/Fitted + 1P Fitted)
  review/AG-294/revolver.jpg (28-panel GT-20077/20079-cropped matrix: Revolver Factory & M81 Hip/Aimed/Reload in 4 lights + Rack Factory/M81/Fitted + 1P Fitted)
  review/AG-294/wasp.jpg (28-panel GT-20077/20079-cropped matrix: Wasp Factory & M81 Hip/Aimed/Reload in 4 lights + Rack Factory/M81/Fitted + 74% Reload 29.7mm Round)
  review/AG-294/breacher.jpg (28-panel GT-20077/20079-cropped matrix: Breacher-12 Factory & M81 Hip/Aimed/Reload in 4 lights + Rack Factory/M81/Fitted + 1P Fitted)
  review/AG-294/sheet.jpg (Master 5-gun RTX 5080 comparison sheet)
Not verified: Sniper, minigun, launcher, and M240/flamer GT-20077/20079 passes (not yet landed by ChatGPT 2).
Requests:
  - ChatGPT 2: `AG-294 RTX 5080 findings on shotgun, KR-7, revolver, Wasp, and Breacher` (specular highlights on revolver topstrap & KR-7/Breacher rear faces under Noon sun, KR-7 ACOG bare-post mount J116 & side-offset silhouette on rack, Breacher pre-GT-20079 M81 over-painting 25/28 meshes including drum/muzzle).
  - ChatGPT & Claude 2: AG-292 cross-owner Training Ground prop breach requests sent with proof plates in `review/AG-292/cross-owner/`.
Contract changes: none

---

### Gun-by-Gun RTX 5080 Evaluation & GPU Findings (J129 / D-144)

1. **Pump Shotgun (`shotgun` — `review/AG-294/shotgun.jpg`):**
   - **What reads right on RTX 5080:** Rebuilt smooth comb (no stepped comb pads), receiver top serrations, and brass front bead align cleanly in `Aimed` with zero z-fighting or moire. M81 camo tile width is exact `[0.42, 0.42, 0.42] m` across `held`, `eye`, and `rack` (`3,276` painted tris; `3` painted / `13` bare meshes — bolt, lifter, slide lock, trigger, safety, barrel stay bare; fitted suppressor & RMR housing take M81 cleanly).
   - **GPU flags:**
     - *Night sight readability:* At `Night` (`mean_luma = 12.5–14.8`, `deep_dark_pct = 29–39%`), the unlit brass bead blends into the dark range backstop without flashlight fill.
     - *Fitted suppressor on Armory Rack (`Row 7 Col 3`):* With the long suppressor fitted on the vertical rack hang, the suppressor tip reaches into the upper horizontal rack bar (`y = 1.55 m`).

2. **KR-7 Rifle (`ak` — `review/AG-294/ak.jpg`):**
   - **What reads right on RTX 5080:** Walnut handguard and buttstock keep warm wood grain while receiver, dust cover, suppressor, and ACOG housing take M81 at exact `[0.42, 0.42, 0.42] m` (`1,772` painted tris; `2` painted / `11` bare meshes on bare gun), zero z-fighting.
   - **GPU flags:**
     - *Rear recoil-spring guide ring glare in `Aimed · Noon` (`Row 2 Col 1`, ChatGPT 2):* The flat circular button/ring at the rear of the dust cover catches a bright grey specular highlight directly below the rear sight notch, pulling the eye down from the front post.
     - *ACOG bare posts & Rack silhouette (`Row 7 Cols 3–4`, ChatGPT 2 J116):* On `1P Eye · M81 + Fitted Mods` (`Col 4`), the ACOG still sits on two thin vertical posts (`GT-20075` send-back J116), and on `Rack · M81 + Fitted Mods` (`Col 3`) the side-mounted optic projects far left off the vertical receiver silhouette.

3. **Service Revolver (`revolver` — `review/AG-294/revolver.jpg`):**
   - **What reads right on RTX 5080:** `CB-299` / `GT-20079` rack reload-brass leak is **completely gone** on the real GPU across `Factory`, `M81`, and `M81 + Fitted Mods` (`Row 7`). Frame and under-barrel light paint cleanly at `[0.42, 0.42, 0.42] m` (`880` painted tris; `1` painted / `16` bare meshes — fluted cylinder, hammer, trigger, crane, and walnut grip stay bare), zero z-fighting.
   - **GPU flags:**
     - *Factory topstrap/rear-frame Noon shine (`Row 2 Col 1`, ChatGPT 2):* Under direct Noon sun, the smooth rounded rear frame above the walnut grip produces a wide bright horizontal specular band (`luma ~205`) that washes out the rear sight channel (matte M81 in `Row 5 Col 1` suppresses this glare).
     - *Support-hand overlap (`Rows 1, 3, 4, 6`, Claude 1 / Claude 4 `CD-1`):* Support glove clips slightly into the firing hand around the walnut grip (already active under `CD-1`).

4. **Wasp SMG (`uzi` — `review/AG-294/wasp.jpg`):**
   - **What reads right on RTX 5080:** ChatGPT 2's `03:50Z` **29.7 mm copper-nose live round** (`Row 7 Col 4`, `74%` reload) is verified on the RTX 5080 pointing forward toward the muzzle inside the feed lips. Receiver, top cover, polymer grip panels, suppressor, and RMR paint cleanly at `[0.42, 0.42, 0.42] m` (`2,616` painted tris; `4` painted / `13` bare meshes — grip safety, magazine, barrel, and 5 controls stay bare), zero z-fighting.
   - **GPU flags:**
     - *Aimed view framing & Night sight blackout (`Rows 2 & 5`, Claude 1 `CD-4` / ChatGPT 2):* The flat rear receiver block occupies ~45% of the center sight crop (`CD-4`), and at `Night` (`Col 4`) the dark iron peep/post sights drop to `mean_luma ~11` with near-zero contrast against the range floor.

5. **Breacher-12 (`aa12` — `review/AG-294/breacher.jpg`, landed `03:45Z` in `GT-20077`):**
   - **What reads right on RTX 5080:** ChatGPT 2's `03:45Z` receiver-cover seam repair and issued/extended drum + light seating render cleanly on the RTX 5080 — the old 17.1 mm floating side strip in `Aimed` is completely gone, zero z-fighting.
   - **GPU flags:**
     - *Pre-GT-20079 M81 over-painting (`Rows 4–7`, ChatGPT 2 `GT-20079` queue):* Before `aa12`'s `GT-20079` finish pass runs, M81 coats `25` of `28` visible meshes (`12,708` tris, tile `[0.402, 0.42, 0.42] m`), painting the entire extended drum magazine, muzzle brake, and small hardware green/brown.
     - *Missing stock in `Aimed` & bright Noon rear endplate (`Rows 2 & 5`, Claude 3 `CC-342` / ChatGPT 2):* `fpStock` hides in `Aimed` (`CC-342`), exposing a flat rectangular rear receiver face that catches bright Noon sun (`rgb ~185`) right below the carry-handle sight ring.
