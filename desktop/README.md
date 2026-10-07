# Dead-Wave, the desktop game (CU-57, P-89)

A Tauri shell (Rust + the WebView2 that comes with Windows 10/11) round the packaged game. The game itself has no
dependencies and no build step; this folder is the one place with any, and it only makes the `.exe` and the installer.

    cd desktop
    npm install              once: the Tauri CLI
    npm run build            stage the game (tools/package.mjs), build the exe and the installer
    npm run build:exe        the exe only, no installer
    node smoke.mjs           start the built exe and check it (WebGPU, the title, a match, the profile file, Quit)

- The installer: `src-tauri/target/release/bundle/nsis/Dead-Wave_<version>_x64-setup.exe` (about 226 MB, per-user, no admin).
  It is not signed, so Windows SmartScreen will ask before the first run ("More info", "Run anyway").
- The game's files are installed next to the exe in `game/` and served by the `dw:` protocol (`http://dw.localhost/`).
  `tools/package.mjs` decides what ships (no qa/, review/, handoffs/, tests, the WAV originals) and checks the copy by booting it.
- The version is `package.json`'s: the installer's name, the exe's properties and the title all read it.
- The profile (every `tt_*` key the game keeps in localStorage) is `Documents\Dead-Wave\profile.json`; edit or copy it freely.
  `DW_PROFILE_DIR` points it elsewhere (the smoke check does); `DW_DEBUG=1` opens the game's `?debug=1` hooks.
- F11 toggles fullscreen; the window opens fullscreen. The icon is the PGB patch on a dark square (`npm run icon` redoes it
  from `assets/insignia/pgb-patch.png`; put real art in `src-tauri/icons/source.png` and run `tauri icon` instead).
- The browser build is unchanged: `Play Dead-Wave.bat`.
