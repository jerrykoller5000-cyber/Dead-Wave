# Handoff: AG-302 — Warm every gun's 1P view copy and arms during Training entry blackout

- **Agent:** Antigravity (`Gemini 4 Carbon`)
- **Date:** 2026-11-11
- **Card:** `AG-302` — *AG-301's hitches at the Training Ground's entry and on each gun's first draw. Now.*

## Changed:
- `game/viewmodel.js` (lent pre-build section only; `LF` line endings preserved, coexisting cleanly with `CD-1`):
  - Added `gunCache` / `gun2Cache` (`resetGunCopy`, `takeGunCopy`) inside `buildGun(key, pair)` so pre-built 1P weapon view copies (main and akimbo offhand) are cached and reused across equips, automatically rebuilding if `g.src !== src || g.nodes !== countNodes(src)` (e.g. when optics/suppressors change) and resetting moving reload parts + `mirrorParts(g)`. Cleared in `dispose()`.
  - Added `prepareWarmup()` (exposed on the viewmodel API): pre-builds `arms` (`syncArmMaterials()`), all 12 guns in `VM_POSES` (plus akimbo `offhand`, `bladeCopy()`, and `grenadeCopy()`), stages them in a temporary `warmGroup` at `(0, 0, -0.6)` under `space` with `root.visible = true` and `frustumCulled = false`, waits up to 200 ms for async `studio/fp-arms.js` detail maps (`ready`), and returns `restore()`, which restores all visibility/cull/instanced counts, removes `warmGroup`, sets `root.visible = false`, calls `dropGun()`, and resets `setEyeHide(false, null)` — leaving zero extra meshes or draws in play.
- `index.html` (lent `ensureViewmodel` + `trainingWarmCompile` section only; `CRLF` line endings preserved):
  - Extracted `ensureViewmodel()` so both `updateViewmodel` and `trainingWarmCompile` share the exact viewmodel initialization path.
  - Updated `trainingWarmCompile()` to sync rig skins, stage `viewmodel.prepareWarmup()`, temporarily show hidden 3P held weapons (`weaponMeshes`, `offhandMeshes`, `knife`, `grenadeHand`) and empty shadow-casting pouch `InstancedMesh`es (`emptyInst` + hidden parents), compile against the live MRT target via `compileForLiveTarget()` (`CL-192` — avoiding redundant canvas-format compiles), run `warmFrame('training-impacts')`, stage the Training fade warm-up pass (`tg.cutaway?.prepareWarmup`, `trainingMarineFade?.prepareWarmup`, and optional `perimeter`/`containment` hooks) with `compileForLiveTarget()` + `warmFrame('training-marine-fade')`, restore all warm-up props, render a clean `warmFrame('training-clean')`, and await `device.queue.onSubmittedWorkDone()` before lifting `#trainingBlackout`.
- `qa/2026-11-11-AG-302/ag302-warmup-trace.mjs` & `qa/2026-11-11-AG-302/build-ag302-sheet.py`:
  - Matched real-`rAF` RTX 5080 WebGPU cold-boot before/after harness (1P and 3P) measuring post-blackout frames, `R1_entry_stations_console`, first draw of all 12 weapons in `WEAPON_ORDER`, draw calls, and pipeline counts, plus visual sanity captures and contact sheet builder.

## Tests:
- **Matched RTX 5080 WebGPU Cold-Boot Before/After Trace (`review/AG-302/trace-before.json` vs `review/AG-302/trace-after.json`, sheet `review/AG-302/sheet-ag302-before-after-trace.jpg`):**
  - **Zero New Draws in Play:** Unarmed spawn `269 -> 269` draws (`155,855 -> 155,855` tris, `viewmodel.root.visible = false`); 1P `R1` entry walk `206 -> 206` draws; 3P `R1` entry walk `412 -> 394` draws.
  - **1P Post-Blackout & Entry Walk (`R1`):**
    - Post-blackout max frame: `885.0 ms -> 193.8 ms` (`0` new pipelines).
    - `R1` entry walk max frame: `823.1 ms` (`+8` spike / `+6` net pipelines) -> `64.4 ms` (`+1` pipeline; median `16.7 -> 16.6 ms`, p99 `31.1 -> 28.3 ms`).
  - **1P First Draw of All 12 Weapons (`+9` total new pipelines -> `0` across all 12 weapons):**
    - `pistol`: `28.5 -> 29.7 ms` (`0` pipes) · `revolver`: `73.6 -> 26.4 ms` (`+1 -> 0` pipes) · `uzi`: `31.5 -> 25.4 ms` (`0` pipes) · `shotgun`: `109.3 -> 24.4 ms` (`+2 -> 0` pipes)
    - `aa12`: `23.6 -> 19.8 ms` (`0` pipes) · `ak`: `81.3 -> 23.0 ms` (`+1 -> 0` pipes) · `m4`: `23.4 -> 23.6 ms` (`0` pipes) · `sniper`: `55.1 -> 26.2 ms` (`+1 -> 0` pipes)
    - `flamer`: `18.7 -> 19.7 ms` (`0` pipes) · `launcher`: `137.4 -> 18.3 ms` (`+2 -> 0` pipes) · `minigun`: `75.9 -> 32.2 ms` (`+1 -> 0` pipes) · `chainsaw`: `151.5 -> 20.8 ms` (`+1 -> 0` pipes)
  - **3P Post-Blackout, Entry Walk & All 12 Weapons (`+6` total new pipelines -> `0` across Entry + all 12 weapons):**
    - Post-blackout max frame: `1241.7 ms -> 128.9 ms` (`0` pipes); `R1` entry walk: `28.4 -> 32.8 ms` (`0` pipes, median `16.7 -> 16.7 ms`).
    - First draw max frames: `chainsaw` `183.5 -> 21.4 ms` (`0` pipes), `pistol` `150.9 -> 28.1 ms` (`0` pipes), `launcher` `126.3 -> 18.0 ms` (`0` pipes), `revolver` `94.9 -> 31.0 ms` (`0` pipes), `ak` `51.6 -> 22.9 ms` (`0` pipes), `shotgun` `48.2 -> 18.2 ms` (`0` pipes).
- **Visual Sanity & Neighbor Regression Check:**
  - Multimodally inspected `review/AG-302/sheet-ag302-before-after-trace.jpg` (clean Noon spawn after blackout with 0 warm-up props visible; clean 1P and 3P draws).
  - `node tools/tests/run-all.mjs tag296 --jobs 1 --agent antigravity --task AG-302` — `28 pass, 0 fail` (`69.6s`; `check-players: 313 player.position reads, all in the allowed places`).

## Not verified:
- Full cloud regression suite (`CB-243`, owned by Claude 2 in cloud).
- Attachment-swapped rebuild path during active Armory customization (logic preserves automatic rebuild whenever `g.src !== src || g.nodes !== countNodes(src)`).
