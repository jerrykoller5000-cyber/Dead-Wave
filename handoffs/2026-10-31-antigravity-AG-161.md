# antigravity — AG-161 The 1.1.0 installer (after CL-279's version bump) — 2026-10-31
Changed:          Built the 1.1.0 desktop release (`npm run build` in `desktop/` -> `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_1.1.0_x64-setup.exe`, `407,533,135 bytes` / `388.65 MiB` / `407.53 MB`), passed all 13 `node smoke.mjs` checks (`47.7s`), installed the per-user NSIS setup to `C:\Users\Zero\AppData\Local\Grave Shift`, verified `NOTICES.txt` (`3,014 bytes`) and `NOTICES-desktop.txt` (`212,624 bytes`) in the installed `game/` folder, and launched from the Start menu shortcut (`Grave Shift.lnk`) to verify `"v1.1.0"` on the Title screen, studio intro + AI disclosure playback, music/ambience, Night 1 gameplay, and `0` failed loads / `0` page errors (Rule 16 observed).
Files:            qa/2026-10-31-AG-161/run-ag161.mjs, qa/2026-10-31-AG-161/build.log, qa/2026-10-31-AG-161/smoke.log, qa/2026-10-31-AG-161/ag161-summary.json, qa/2026-10-31-AG-161/01-title-v1.1.0.png, qa/2026-10-31-AG-161/02-night-1.png, handoffs/2026-10-31-antigravity-AG-161.md
Tests:            node crew/crew.mjs slot run antigravity AG-161 --checks "desktop npm run build + smoke.mjs + Start menu install & Night 1 play" -- node qa/2026-10-31-AG-161/run-ag161.mjs → desktop `npm run build` PASS (1,742 files, 407.9 MB staged, 1,223 `z-sounds` takes, 250 files fetched, title version `"v1.1.0"`, `357.0s`); `node smoke.mjs` → 13/13 PASS (`desktop smoke: all passed`, `47.7s`); Start menu launch (`Grave Shift.lnk`) → Title `"v1.1.0"`, `WebGPURenderer` `2560x1440` fullscreen, studio intro & AI disclosure `readyState: 4`, music & ambience active, Night 1 wave active, 250 resources fetched, `0` failed loads, `0` page errors
Screenshots:      qa/2026-10-31-AG-161/01-title-v1.1.0.png (2560x1440 Title screen showing v1.1.0), qa/2026-10-31-AG-161/02-night-1.png (2560x1440 Night 1 wave at FOB Threshold)
Not verified:     Nothing — `npm run build`, `node smoke.mjs`, per-user NSIS installation, Start menu launch, Title (`v1.1.0`) & Night 1 screenshots, disclosure/music playback, 0 failed loads, and `NOTICES.txt` / `NOTICES-desktop.txt` were all verified on Jerry's PC through the game-test slot (installer not committed and nothing uploaded, per D-84).
Requests:         Replied DONE to claude on "AG-161: the 1.1.0 installer".
Contract changes: none

## 1. 1.1.0 Installer Details (D-84 / CL-279)

| Property | Value |
| --- | --- |
| **Installer file name** | `Grave Shift_1.1.0_x64-setup.exe` |
| **Relative path** | `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_1.1.0_x64-setup.exe` |
| **Absolute path** | `C:\Users\Zero\Desktop\Tiny Trek\desktop\src-tauri\target\release\bundle\nsis\Grave Shift_1.1.0_x64-setup.exe` |
| **Exact size** | `407,533,135 bytes` (`388.65 MiB` / `407.53 MB`) |
| **Built executable** | `desktop/src-tauri/target/release/dead-wave.exe` (`3,243,520 bytes`) |
| **Staged game copy** | `dist/dead-wave` (`1,742 files`, `407.9 MB`, `1,223` `z-sounds` takes including `pk-*` sound packs, `58` unplayed backup files / `167.0 MB` excluded) |

## 2. `desktop/` Build & `node smoke.mjs` Output (`qa/2026-10-31-AG-161/build.log`, `smoke.log`)
- **`npm run build` in `desktop/` (`357.0s`, exit `0`)**:
  - `package: 1742 files, 407.9 MB -> dist\dead-wave (version 1.1.0)`
  - `check: title and a match came up from the copy; 250 files fetched; version on the title: "v1.1.0"`
  - `package: ok`
  - `Running makensis to produce C:\Users\Zero\Desktop\Tiny Trek\desktop\src-tauri\target\release\bundle\nsis\Grave Shift_1.1.0_x64-setup.exe`
  - `Finished 1 bundle at: C:\Users\Zero\Desktop\Tiny Trek\desktop\src-tauri\target\release\bundle\nsis\Grave Shift_1.1.0_x64-setup.exe (388.65 MiB)`
- **`node smoke.mjs` in `desktop/` (`47.7s`, exit `0`, 13/13 PASS)**:
  - `PASS the title comes up from the dw: protocol (window.TT)`
  - `PASS the desktop shell's script ran first`
  - `PASS the renderer is WebGPU (WebGPURenderer)`
  - `PASS the version is on the title ("v1.1.0")`
  - `PASS the window is fullscreen (2560x1440 of 2560x1440)`
  - `PASS a match starts`
  - `PASS the insertion plays out (video and sounds through the protocol)`
  - `PASS no file the game asked for was missing`
  - `PASS a key set in localStorage is in profile.json (["tt_smoke","tt_smoke2"])`
  - `PASS no page errors`
  - `PASS after a restart (and the webview's own data wiped) the keys come back from the file`
  - `PASS a removal is written too`
  - `PASS window.close() (the menu's Quit) ends the program`
  - `desktop smoke: all passed`

## 3. Player Installation, Notices & Start Menu Launch (`qa/2026-10-31-AG-161/ag161-summary.json`)
- **Per-user NSIS install (`C:\Users\Zero\AppData\Local\Grave Shift`)**:
  - `C:\Users\Zero\AppData\Local\Grave Shift\dead-wave.exe`: `3,243,520 bytes`
  - `C:\Users\Zero\AppData\Local\Grave Shift\game\version.json`: `{ "version": "1.1.0", "built": "2026-10-31T07:06:59.926Z" }`
  - `C:\Users\Zero\AppData\Local\Grave Shift\game\NOTICES.txt`: present (`3,014 bytes`)
  - `C:\Users\Zero\AppData\Local\Grave Shift\game\NOTICES-desktop.txt`: present (`212,624 bytes`)
  - **Start Menu shortcut**: `C:\Users\Zero\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Grave Shift.lnk` -> `C:\Users\Zero\AppData\Local\Grave Shift\dead-wave.exe`
- **Start Menu Launch & Runtime Checks**:
  - **Studio intro & AI disclosure**: `#openingVideo` (`http://dw.localhost/assets/intro/caracal.mp4`) played at boot (`readyState: 4`, `paused: false`, `currentTime: 1.38s`). At boot `disclaimer.js` has `ENABLED = false` per `CL-225`; invoking `DWDisclaimer.preview()` over the menu verified `http://dw.localhost/assets/disclaimer/disclaimer.mp4?v=cl191` loads and plays cleanly (`state: "playing"`, `readyState: 4`, `paused: false`, `duration: 21.83s`).
  - **Title screen (`qa/2026-10-31-AG-161/01-title-v1.1.0.png`)**: `2560×1440` fullscreen on `WebGPURenderer`, `#gameVersion` displays `"v1.1.0"`.
  - **Day 1 prep & Night 1 wave (`qa/2026-10-31-AG-161/02-night-1.png`)**: Started a Hunt run from the Title screen, completed the helicopter insertion into Day 1 prep (`audioState.started: true`, `ambState.started: true`), and played into Night 1 (`phase: "wave"`, `day: 1`, `night: true`, `waveTotal: 15`, `waveSpawned: 8`, active combat with HUD at `2560×1440`).
  - **Console & network audit**: `250` resources fetched over `http://dw.localhost/`, `0` failed loads (`failedLoadsCount: 0`), `0` page errors (`pageErrorsCount: 0`).
