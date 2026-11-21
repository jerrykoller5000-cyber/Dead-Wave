Completed **AH-4** live native WebGPU replay of all Training Area menus & panels at `1920x1080` and `1366x768` (`qa/2026-11-21-AH-4.md`, screenshots in `qa/AH-4/`).

### FIXED
- **#2 [FIXED — GP-20169] `qa/AH-4/item12-armory-settled-1920.png`, `item12-armory-settled-1366.png`:** Armory `WORKBENCH` now shows the selected gun's silhouette immediately (`1920`) and swaps cleanly to the 3D weapon render (`1366`).
- **Scrollbars, stray `▮`, `CALL IN ZOMBIES` stencil header & HUD dimming [FIXED across #10, #11, #12, #17, #18, #19, #20]:** Bright white OS scrollbars are replaced by thin dark-olive themed scrollbars across `Range Console`, `CIF`, `Armory`, `Settings`, `Tips`, and `Supply Terminal`; stray `▮` block chars on `RESUPPLY` / `SUPPLY TERMINAL` are gone; `CALL IN ZOMBIES` now uses the gold stencil `Black Ops One` font; and background HUD cards + top `TRAINING GROUND` bar are dimmed behind modals.

### STILL THERE on Menu Items
1. **#10 Range Console (`qa/AH-4/item10-range-console-1920.png`, `item10-range-console-1366.png`):** Drill #2 still says `"draw with Tab"` (`4` draws; `Tab` opens Map — copy with ChatGPT), bottom metadata clips at the fold (`1920`), and at `1366x768` the `VOID` result banner pushes `2. Drill` completely off-screen while modal corners overlap the dimmed HUD cards.
2. **#11 CIF (`qa/AH-4/item11-cif-1920.png`, `item11-cif-1366.png`):** Night vision still says `"N toggles it"` (`1` toggles NVG — copy with ChatGPT), `PATTERNS` camo swatches are cut in half at `1920x1080` and clipped to a 2px sliver above the footer at `1366x768`, and `1366x768` corners overlap the dimmed HUD.
3. **#12 Armory (`qa/AH-4/item12-armory-settled-1366.png`):** At `1366x768`, the pinned `MOVE TO SHELF / DONE` footer still cuts across `SECONDARY 2`, `STORED GUNS`, and `BUY AMMO`; `ARMORY` / `RESUPPLY` still render in white `Impact` fallback instead of the gold stencil header style; and `Hip holster · Pistol` thumbnail is near-invisible dark-on-dark.
4. **#15b Active Drill HUD (`qa/AH-4/item15b-drill-active-hud-1p.png`):** `#rangeDrillHud` still instructs `"Watch the overhead board. Wait for the beep."` while aiming downrange at the bench in 1P where the overhead board is off-screen overhead.
5. **#17 Settings `1366x768` (`qa/AH-4/item17a-settings-1366.png`):** Still slightly taller than `768px` (requiring a scrollbar for a few pixels and touching the dimmed top bar), and `FIRST-PERSON FOV` wraps onto two lines.
6. **#18 Supply Terminal (`qa/AH-4/item18a-kiosk-supplies-1920.png`, `item18b-kiosk-builds-1920.png`):** `UPGRADE BLUEPRINT` still says `"the kiosk's Fortify tab"` (tab is `BUILDS` — copy with ChatGPT), `FIELD INTEL` (`Buy — 120 Cash`) is still sold in Training (`$∞`, no night waves), and `[E] SUPPLY TERMINAL` stays visible behind the modal.
7. **#19 HQ Zombie Panel (`qa/AH-4/item19-hq-zombie-panel-1920.png`):** `Cave Guard` is still missing from `ZOMBIE KIND` (`13/14` zombie types listed).
8. **#20 Pause in Training (`qa/AH-4/item20-pause-1920.png`):** Still says `"Quitting ends this run"` / `"END RUN & QUIT TO MENU"` in Training.

### NEW UI Item
- **NEW #24b [P3] `qa/AH-4/item18a-kiosk-supplies-1920.png` (and `item10/11-1920.png`):** After Infirmary recovery, the top-left `#youreBack` `"YOU'RE BACK"` toast has a higher `z-index` than modal backdrops, staying bright undimmed over `Range Console`, `CIF`, and `Supply Terminal`.
