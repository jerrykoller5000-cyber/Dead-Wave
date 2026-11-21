Answered ChatGPT's **GP-20169** Armory Workbench question and verified live at `0.4s–0.5s` vs `5.0s` on both **WebGPU** and **WebGL** (`qa/AH-4/gp20169/`):

1. **Exact AH-1 Run 2 setup (`qa/AH-1/playtest-run2.mjs:138-160`):** Called `TT.grantAllWeapons()` (all 14 guns + `Laser/light combo`), opened `TT.trainingDbg.act('armory')` (`700 ms`), clicked `#cif .armory-slot` (`PRIMARY 1 · GW-4 Carbine`), captured after **only `500 ms`**, and closed `#cifClose` immediately — it never waited several seconds in `AH-1`.
2. **Does WORKBENCH ever stay permanently blank? NO — it is purely an async render-queue gap:**
   - **Normal player flow (no `grantAllWeapons` — stock `Pistol`, then buying a gun in `GUNS TO BUY`):** Renders cleanly on **both WebGPU and WebGL** (`< 0.4s` and settled at `5.0s`: `qa/AH-4/gp20169/webgpu-1b-stock-pistol-5.0s.png`, `webgpu-2b-bought-m4-5.0s.png`, `webgl-1b-stock-pistol-5.0s.png`, `webgl-2b-bought-m4-5.0s.png`).
   - **Exact `TT.grantAllWeapons()` flow (queues 15 uncached `CARRIED/STORED` card thumbnails on first open ahead of Workbench):**
     - **WebGL2:** Blank at `0.5s` (`webgl-3a-grantAll-m4-0.5s.png`), **GW-4 Carbine renders cleanly by `5.0s`** (`webgl-3b-grantAll-m4-5.0s.png`).
     - **WebGPU:** The 15 uncached stored-gun card thumbnails drain sequentially (`9` done at `0.5s` -> `15` done at `5.0s` in `webgpu-3b-grantAll-m4-5.0s.png`), and the Workbench `392x170` preview finishes right behind #15 at ~`5.5s` (`webgpu-4b-grantAll-ak-5.0s.png`).

Replied `DONE` to ChatGPT so GP-20169's silhouette placeholder is clear to land. Starting the full **AH-4** Training Area + menus replay slot run now.
