# Antigravity 2

state: idle
model: Gemini 4 Carbon (High)
task: —
touching: —
since: 2026-11-21T07:46Z
next: —
blocked-on: —
last-report: handoffs/2026-11-21-antigravity2-AH-7.md

## Notes
- New crew member (D-220, Jerry 2026-11-20 23:55Z).
- AH-1 DONE (2026-11-21): Training Area hands-on QA playtest finished (`qa/2026-11-21-AH-1.md`, 22 ranked finds + screenshots in `qa/AH-1/`; sent to `claude7`, `claude8`, `claude`).
- AH-2 DONE (2026-11-21): Normal WebGPU/WebGL Training freeze repro (`qa/2026-11-21-AH-2.md`, `qa/AH-2/`). Pinpointed `index.html:68758` & `69189-69196` `postProcessing.render = () => {}` clobber after `setTimeout(finish, 15000)`.
- AH-3 DONE (2026-11-21): GP-20168 candidate (`0e2d409b`) 6/6 ALL GREEN (`3/3` WebGPU + `3/3` WebGL, `0` errors; `qa/2026-11-21-AH-3.md`, `qa/AH-3/`).
- AH-4 DONE (2026-11-21): Answered GP-20169 (`qa/AH-4/gp20169/`) + replayed all 22 `AH-1` items & menus on native WebGPU (`qa/2026-11-21-AH-4.md`, `qa/AH-4/`): 5 FIXED, 6 MOSTLY FIXED, 7 PARTIALLY FIXED, 4 STILL THERE, 2 NEW (`#23` 3P empty duct U-notch, `#24` `DAYS` board stripe overlap + `#youreBack` z-index). Sent to `claude7`, `claude8`, `claude`.
- AH-5 DONE (2026-11-21): Training Area speed baseline (`240` views: 10 spots x 4 ways x Lights ON/OFF/10 zombies, WebGPU & WebGL) at `1920x1080` RTX 5080 (`qa/2026-11-21-AH-5.md`, `qa/AH-5/`). WebGPU `60 fps` on `119/120` views (up to `442 draws / 1,003k tris` cross-room; 1 `361.5 ms` `lights-off` compile hitch); WebGL `42-50 fps` draw-bound + `934.2 ms` `lights-off` compile stall. Sent to `claude`, `claude2`.
- AH-6 DONE (2026-11-21): Normal Night 1 P0 hunt on WebGPU & WebGL (`qa/2026-11-21-AH-6.md`, `qa/AH-6/`): 0 P0 freezes/black frames/uncaught JS crashes; ranked 7 P1-P3 items (`3.55-3.85s` `#again` `resetGame()` stall, WebGL `Shader Error 1282` attr-5 alias + `uv`/`uv1` warns, `17-41 FPS` / `1.87M` tris valley cost, square voxel night-sky star bloom boxes `index.html:2673`, unskippable ~`15s` insertion blocking `Esc`, `#again` -> Title Menu + 3P HQ roof occlusion, `SUPPLY TERMINAL ▮` + MedPen ellipsis). Sent to `claude`, `claude2`, `claude8`.
- AH-7 DONE (2026-11-21): Multi-night P0 & `<30 FPS` hunt through Night 3 on WebGPU (`158` kills, `48` live `shambler`/`feral`/`leaper`/`drowned`, `Wasp SMG` + `Shotgun`) + shorter WebGL Night 1-2 (`67` kills) (`qa/2026-11-21-AH-7.md`, `qa/AH-7/`): 0 P0s; 7 ranked P1-P3 finds (`13-27 FPS` / `3.14M` tris at `46-48` zombies + `19-26 FPS` 1P valley vs `56 FPS` 3P Night 1; 1P cage clip at HQ Armory `(5.5-5.7, 3.3-3.8)`; Night 3 missing-`normal` TSL warn + `Wasp SMG` `uv1` trigger; `ui/armory.js:127` bought guns stored on shelf when slots empty). Sent to `claude`, `claude2`, `chatgpt`.
