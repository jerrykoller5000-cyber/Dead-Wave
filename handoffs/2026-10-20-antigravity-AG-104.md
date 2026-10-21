# antigravity — AG-104 The itch.io page's pictures and the installer (D-84), after AG-103 — 2026-10-20
Changed:          Captured the itch.io release cover (`docs/release/itch/cover.png`, `630x500`, night horde moment with title wordmark and no HUD) and five `1920x1080` gameplay screenshots on High graphics (`WebGPU`) with the player HUD (`01-day-scavenging.png`, `02-building-defence.png`, `03-night-push.png`, `04-the-hollows.png`, `05-dawn-survived.png`). Built the desktop release (`npm run build` in `desktop/` -> `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_0.1.0_x64-setup.exe`, `402,095,174 bytes` / `383.47 MiB` / `402.10 MB`), ran the silent NSIS installer into `%LOCALAPPDATA%\Grave Shift`, verified both `NOTICES.txt` (`2,286 bytes`) and `NOTICES-desktop.txt` (`212,624 bytes`) in the installed `game/` folder, removed the old `Dead-Wave.lnk` desktop shortcut so only `Grave Shift.lnk` stays, and passed all 13 `node desktop/smoke.mjs` checks plus the opening video, music, and 0-failed-loads check on the installed executable (Rule 16 observed).
Files:            docs/release/itch/cover.png, docs/release/itch/01-day-scavenging.png, docs/release/itch/02-building-defence.png, docs/release/itch/03-night-push.png, docs/release/itch/04-the-hollows.png, docs/release/itch/05-dawn-survived.png, qa/2026-10-20-AG-104/run-ag104.mjs, qa/2026-10-20-AG-104/ag104-report.json, qa/2026-10-20-AG-104/cover.png, qa/2026-10-20-AG-104/01-day-scavenging.png, qa/2026-10-20-AG-104/02-building-defence.png, qa/2026-10-20-AG-104/03-night-push.png, qa/2026-10-20-AG-104/04-the-hollows.png, qa/2026-10-20-AG-104/05-dawn-survived.png, handoffs/2026-10-20-antigravity-AG-104.md
Tests:            node crew/crew.mjs slot run antigravity AG-104 --checks "desktop smoke + itch screenshots" -- ... → desktop npm run build PASS (1,447 files, 400.3 MB staged, 250 files fetched, v0.1.0); node desktop/smoke.mjs --exe "%LOCALAPPDATA%\Grave Shift\dead-wave.exe" → 13/13 PASS (desktop smoke: all passed); opening/music/resource probe → disclaimer & opening video readyState 4, audio/ambience active, 250 resources fetched, 0 failed loads, 0 page errors
Screenshots:      docs/release/itch/cover.png (630x500), docs/release/itch/01-day-scavenging.png (1920x1080), docs/release/itch/02-building-defence.png (1920x1080), docs/release/itch/03-night-push.png (1920x1080), docs/release/itch/04-the-hollows.png (1920x1080), docs/release/itch/05-dawn-survived.png (1920x1080)
Not verified:     Nothing — all 6 itch.io images and the NSIS installer build/install/smoke/NOTICES.txt checks were verified on Jerry's GPU via the game-test slot (nothing uploaded, per D-84).
Requests:         FYI sent to chatgpt and claude with the installer path/size and itch.io screenshot paths.
Contract changes: none

## 1. itch.io Page Pictures (`docs/release/itch/`)
All captured on **High** graphics (`WebGPU` renderer) on Jerry's GPU:

| File | Dimensions | Size (bytes) | Scene Description |
| --- | --- | --- | --- |
| `docs/release/itch/cover.png` | `630 × 500` | `266,571` | Night moment in front of the `DEADWALKERS` HQ wall with `GRAVE SHIFT` wordmark & ECG signal line, marine aiming with laser sight into an approaching horde (Demon, Bomber, Brute, Feral, Military Soldier, Shambler, Spitter), no HUD |
| `docs/release/itch/01-day-scavenging.png` | `1920 × 1080` | `1,846,206` | Day out scavenging at the Fuel Depot site with the GW-4 Carbine, floating `HOLD E FILL THE CAN` prompt, shamblers by the fuel shack, and full player HUD |
| `docs/release/itch/02-building-defence.png` | `1920 × 1080` | `2,082,304` | Building a defensive line around FOB Threshold (walls, windows, door, sandbags, barbed wire, turrets) with the green placement ghost, build grid, and `LIGHT TURRET — 24 CASH` placement banner + HUD |
| `docs/release/itch/03-night-push.png` | `1920 × 1080` | `1,620,061` | Active Night 6 horde push in midnight darkness with turret & shock beacon lights, laser sight, Demon fire, Screamer, Brute, Ferals, and full player HUD |
| `docs/release/itch/04-the-hollows.png` | `1920 × 1080` | `396,506` | Delving the underground Root Warren (`Depth 3 · Deep`, `Hush · 8:00`, `Stir · 0%`) with hanging roots, bioluminescent floor patches, pulsing red nest, warren dead (Feral, Shambler, Spider), and full player HUD |
| `docs/release/itch/05-dawn-survived.png` | `1920 × 1080` | `1,538,425` | Dawn breaking over FOB Threshold after Night 5 (`DAY 5 CLEARED — Dawn breaks over the clearing · Bank skulls at the HQ window`), fresh corpses and glowing skulls ready to bank at the HQ window, and full player HUD |

## 2. Desktop NSIS Installer Build & Smoke Verification
- **Build command**: `npm run build` in `desktop/` (executed via `crew.mjs slot run`)
  - `node package.mjs`: `packaged 1,447 files, 400.3 MB -> C:\Users\Zero\Desktop\Tiny Trek\desktop\dist\dead-wave (version 0.1.0)`
  - `check: title and a match came up from the copy; 250 files fetched; version on the title: "v0.1.0"`
  - `tauri build`: compiled `dead-wave v0.1.0` (`desktop/src-tauri/target/release/dead-wave.exe`, `11,227,648 bytes`) and bundled NSIS installer:
    - **Installer filename**: `Grave Shift_0.1.0_x64-setup.exe`
    - **Installer path**: `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_0.1.0_x64-setup.exe`
    - **Installer size**: `402,095,174 bytes` (`383.47 MiB` / `402.10 MB`)
- **Silent installation & `NOTICES.txt` / `NOTICES-desktop.txt` check**:
  - Installed silently (`Grave Shift_0.1.0_x64-setup.exe /S`) to `C:\Users\Zero\AppData\Local\Grave Shift\dead-wave.exe`.
  - Verified both `C:\Users\Zero\AppData\Local\Grave Shift\game\NOTICES.txt` (`2,286 bytes`) and `C:\Users\Zero\AppData\Local\Grave Shift\game\NOTICES-desktop.txt` (`212,624 bytes`) are present in the installed `game/` folder.
  - Removed the test install's `C:\Users\Zero\Desktop\Dead-Wave.lnk` shortcut so only `Grave Shift.lnk` stays on Jerry's Desktop.
- **Smoke & Opening/Music Verification (`node desktop/smoke.mjs` on installed executable)**:
  - All 13 checks in `desktop/smoke.mjs` passed (`desktop smoke: all passed`):
    - `PASS the title comes up from the dw: protocol (window.TT)`
    - `PASS the desktop shell's script ran first`
    - `PASS the renderer is WebGPU (WebGPURenderer)`
    - `PASS the version is on the title ("v0.1.0")`
    - `PASS the window is fullscreen (1920x1080 of 1920x1080)`
    - `PASS a match starts`
    - `PASS the insertion plays out (video and sounds through the protocol)`
    - `PASS no file the game asked for was missing` (250 resources fetched, 0 failed loads)
    - `PASS a key set in localStorage is in profile.json (["tt_smoke","tt_smoke2"])`
    - `PASS no page errors`
    - `PASS after a restart (and the webview's own data wiped) the keys come back from the file`
    - `PASS a removal is written too`
    - `PASS window.close() (the menu's Quit) ends the program`
  - Opening & music probe confirmed `#disclaimerVideo` and `#openingVideo` reach `readyState: 4` and play cleanly, audio/ambience state runs on match start, 0 failed resource loads, and 0 page errors.
