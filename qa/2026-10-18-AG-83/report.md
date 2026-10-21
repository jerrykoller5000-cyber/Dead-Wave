# AG-83 — The installer on a clean profile, after CU-149

- **Date:** 2026-10-18
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-83` — Build the installer, install it as a fresh Windows user (no Node, no repo), start a run, play the first night, quit, reopen: settings and the best run are kept; note anything that fails or looks wrong.

## 1. Build & Clean-Profile Installation
1. **Stage (`node tools/package.mjs --no-check`)**:
   - Staged `1,488` files (`566.8 MB`) into `dist/dead-wave` (`version 0.1.0`), including `combat/`, the 4 `.wav` files (`assets/audio/training/shot-timer-start.wav`, `assets/sfx/training/keypad-press.wav`, `assets/sfx/training/security-door-close.wav`, `assets/sfx/training/security-door-open.wav`), and `z-sounds/index.json` (`952` takes).
2. **Build (`npx tauri build` in `desktop/`)**:
   - Compiled `dead-wave v0.1.0` (`release` profile) in `1m 48s` (`desktop/src-tauri/target/release/dead-wave.exe`, `3,243,520` bytes) and produced NSIS installer:
     - `desktop/src-tauri/target/release/bundle/nsis/Grave Shift_0.1.0_x64-setup.exe` (`538.27 MiB`).
3. **Install (`Grave Shift_0.1.0_x64-setup.exe /S`)**:
   - Installed per-user to `%LOCALAPPDATA%\Grave Shift` (`C:\Users\Zero\AppData\Local\Grave Shift\dead-wave.exe`, `uninstall.exe`, and `game\`).
4. **Fresh Windows User Environment (`qa/2026-10-18-AG-83/run-ag83.mjs` via game-test slot)**:
   - Launched `%LOCALAPPDATA%\Grave Shift\dead-wave.exe` with:
     - `cwd` set to `%LOCALAPPDATA%\Grave Shift` (outside the repo).
     - `PATH` stripped to `C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0\` (no Node, no Git, no Cargo, no repo).
     - Clean `Documents\Dead-Wave` (no `profile.json` prior to launch) and clean WebView2 user-data directory.
     - No `DW_DEBUG` variable set, so the desktop shell loaded the production URL `http://dw.localhost/index.html`.

## 2. End-to-End Verification Results (32/32 Checks Passed)

| Step | What Was Checked | Result | Screenshot / Artifact |
| --- | --- | --- | --- |
| **1. First Boot (Clean Profile)** | `http://dw.localhost/index.html` loads over `dw:` protocol; `window.__DW_DESKTOP__ === true`; title `"Grave Shift"`, `#gameVersion` `"v0.1.0"`, fullscreen `1920x1080`, `#menuBestRecord` hidden, `WebGPURenderer` active, `0` missing files (`HTTP >= 400`), `0` page errors | **PASS** | `shots/01-title-clean-profile.png` |
| **2. Configure Settings** | Opened Settings from Title Screen; changed Music (`30` → `55`), SFX (`80` → `65`), Look (`1.0x` → `1.5x`), Aim FOV (`38°` → `45°`), Aim Tilt (`0°` → `8°`), Graphics (`high` → `medium`), Auto Tilt (`gentle` → `strong`), Overlay (`off` → `on`) | **PASS** | `shots/02-settings-configured.png` |
| **3. Start Run & Day 1 Prep** | Entered callsign `"FreshUser"`, clicked `Play`, completed helicopter insertion into Day 1 prep (`phase === 'prep'`) | **PASS** | `shots/03-day1-prep-orders.png` |
| **4. Play Night 1** | Sounded HQ alarm (`hqStartWave()`), fought Night 1 wave (`15` wave shamblers + `2` camp shamblers = `17` kills, `15` skulls collected), cleared Night 1 and transitioned to Day 2 prep | **PASS** | `shots/04-night1-combat.png`, `shots/05-night1-cleared-day2.png` |
| **5. Quit Run to Menu (CU-150)** | Clicked `Quit to menu`, verified `END RUN & QUIT TO MENU` confirmation modal (`#pauseQuitView.on`), confirmed `END THE RUN`, verified `tt_best_run` recorded (`day: 2, kills: 17, runs: 1`) and `#menuBestRecord` shows `"Best: Night 2 · 17 kills · streak 0"` | **PASS** | `shots/06-quit-confirm-modal.png` |
| **6. Real Reload (`F5`) in Rebuilt Exe (CU-149)** | Executed `location.reload()` inside the desktop session; verified `sessionStorage.getItem('dw_desktop_booted') === '1'` prevented the empty launch snapshot from overwriting `tt_best_run` or changed settings | **PASS** | `report.json` (`run1.afterReload`) |
| **7. Quit Desktop App & Disk Flush** | Clicked `#menuQuitBtn` (`window.close()` → Tauri `quit_game`), process exited cleanly (`code 0`); verified `C:\Users\Zero\Documents\Dead-Wave\profile.json` written to disk with `tt_best_run` and all settings (`tt_vol_music: "0.55"`, `tt_vol_sfx: "0.65"`, `tt_look_sens: "1.5"`, `tt_aim_fov: "45"`, `tt_aim_tilt: "8"`, `tt_gfx: "medium"`, `tt_auto_tilt: "strong"`, `tt_perf_hud: "1"`) | **PASS** | `profile-after-run1.json` |
| **8. Reopen on Fresh WebView2 Cache** | Launched `dead-wave.exe` again with a brand-new WebView2 user-data folder; verified `Documents\Dead-Wave\profile.json` seeded `localStorage` before game boot: `#menuBestRecord` displays `"Best: Night 2 · 17 kills · streak 0"`, Performance HUD is `on`, and all Settings controls match (`55`, `65`, `1.5x`, `45°`, `8°`, `medium`, `strong`, `FPS & HARDWARE: ON`) | **PASS** | `shots/07-reopened-title-best-run.png`, `shots/08-reopened-settings-kept.png` |

## 3. Findings (What Looked Wrong / Should Be Noted)

1. **Floating interaction prompt (`#hud > #kioskPrompt.floating`) renders on top of `#pause` modals (`shots/06-quit-confirm-modal.png`)**:
   - In `index.html` (lines 27504–27508), `hudEl.append(kioskPromptEl)` moves `#kioskPrompt` to the end of `#hud` (after `#pause` in DOM order), and both `#kioskPrompt.floating` (line 866) and `#pause` (line 319) have `z-index: 5`.
   - Furthermore, `updateKioskPrompt(dt)` (line 27574) checks `const a = shopOpen ? null : actionTarget();` without checking `paused` (and `setPaused(true)` does not hide `#kioskPrompt`).
   - As a result, when the player pauses or opens the Quit confirmation modal while standing near any station (e.g. the HQ skull window in `shots/06-quit-confirm-modal.png`), the floating prompt (`[E] TURN IN 15 SKULLS`) sits directly on top of the modal text (`END RUN & QUIT TO MENU`).
2. **`SCREEN: FULLSCREEN: OFF` in Settings inside the Tauri desktop app (`shots/02-settings-configured.png`, `shots/08-reopened-settings-kept.png`)**:
   - In `desktop/src-tauri/src/main.rs` (line 250), the native Tauri window opens fullscreen (`1920x1080`), and `F11` invokes Tauri's `toggle_fullscreen` command (`desktop/src-tauri/src/save-init.js` line 22).
   - However, `#fullscreenToggle` in Settings (`index.html` lines 1688–1722) reads `document.fullscreenElement || document.webkitFullscreenElement` (the browser DOM Fullscreen API) instead of Tauri's window state (`window.__DW_DESKTOP__`), so the button reads **`FULLSCREEN: OFF`** while the desktop window is actually fullscreen.
3. **Minor (`eraseProfile` in `index.html` line 52661 vs `dw.coach.v1`)**:
   - `profile-after-run1.json` shows `ui/coach.js` stores its state under `"dw.coach.v1"`, whereas `eraseProfile()` (CU-150) only removes keys starting with `tt_`. If `Reset profile` is meant to restore the first-minute coach along with `tt_` keys, it should also remove `dw.` keys (or `dw.coach.v1`).
