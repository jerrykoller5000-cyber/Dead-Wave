# AG-233 — `t189` Real-Renderer Sling Reds Bisection Report

- **Date:** 2026-11-04
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-233` — Bisect `t189` on the real WebGPU renderer through the shared game-test slot in an isolated git worktree (`report; no bar moves`).

---

## 1. Executive Summary

1. **Primary Culprit (Why all 16 `sling+`/`sling-` checks flipped to `4.6–16.1 cm` gap / `0.000 m` clipping):**
   - **Commit:** `5adede46` (`Checkpoint: 2026-11-03 evening`), specifically **`AG-200`** in [`index.html`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/index.html#L21316-L21337) (`lines 21316` and `21336` in the current working tree; `lines 21315` and `21335` in `5adede46`).
   - **Exact 2-line change in `index.html`:**
     ```js
     chapelHalo.visible = false;   // AG-200: drawn only while it glows (at opacity 0 it was a sphere drawn every frame)
     ```
     and inside `updateChapelBless(dt)`:
     ```js
     chapelHalo.visible = chapelGlowT > 0;
     ```
   - **Mechanism:**
     - `chapelHalo` (`name: 'chapel-glow'`, added in `CU-103` at `index.html:21309-21317`) is a `THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), ...)` attached directly to `marine` (`marine.add(chapelHalo)`) at `position (0, 1.05, 0)`, `scale (0.72, 1.2, 0.48)` — an invisible ellipsoid **`0.893 m` wide (`x = ±0.446 m`), `1.488 m` tall (`y = 0.306..1.794 m`), and `0.595 m` deep (`z = ±0.298 m`)** with `opacity: 0`.
     - In [`tools/tests/t189.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t189.js#L74-L75):
       ```js
       const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const [, s2] of spots) skip.add(s2.g);
       const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
       ```
       `t189.js` collects every visible `Mesh` under `marine` into `body` without skipping `chapel-glow` (unlike `marineProxySkip` / `marineSigSkip`) or checking `o.material.opacity === 0`.
     - Before `AG-200` (from `82d75118` when `GB-220` recorded `SHOT_BAR` through `f645ba77`), `chapelHalo.visible` was always `true` even at `opacity: 0`. Because `clearCarryPack(THREE, s, true)` pushes the primary sling spots outboard to `x ≈ ±0.35..0.46 m` (`z = -0.255 m`), `t189`'s horizontal inward rays from every slung gun were hitting the invisible `chapel-glow` ellipsoid (`gap 0.000–0.059 m`, `clipping 0.000–0.085 m`), and `GB-220`'s `SHOT_BAR` recorded those `chapel-glow` hits. (This also explains the `GB-220` note at `t189.js:111`: *"this measure does not read the drawn copy as drawn (moving a -side row did not move its reading)"*.)
     - Once `AG-200` set `chapelHalo.visible = false` when `chapelGlowT <= 0`, `chapelHalo` was no longer included in `body`. Every slung gun's inward rays bypassed the invisible sphere and measured the true `0.046–0.161 m` horizontal gap from the outboard-pushed sling mounts to the marine's actual torso/pack, with `0.000 m` clipping (`31 pass / 16 fail`).
   - **Proof:** Reverting **only** those two `chapelHalo.visible` lines in `index.html` at `5adede46` turns `t189` from **`31 pass / 16 fail`** into **`47 pass / 0 fail`**.

2. **Secondary Post-`5adede46` Delta on Current Working Tree (`GP-20022`):**
   - Between `5adede46` and the current working tree, two `GP-20022` changes (`index.html:23299` `WEAPON_SIZE.chainsaw.len: 1.376 -> 1.715` and `studio/weapon-heavy.js` `makeChainsawModel` / `makeMinigunModel`) alter the outboard `spot.g.position.x` accumulation in [`ui/marine-kit-fit.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/ui/marine-kit-fit.js#L14-L27) (`clearCarryPack` adds `spot.g.position.x += side * Math.max(0, 0.265 - inner)` without resetting `spot.g.position.x` between loadouts):
     - In `5adede46`, `sling0.g.position.x` ends at `+0.4580` and `sling1.g.position.x` reaches `-0.4477` in Loadout 4 (`chainsaw@sling-`) and stays there for Loadouts 5–8.
     - In the current working tree, `WEAPON_SIZE.chainsaw.len = 1.715` shrinks `chainsaw`'s `sizeK` by ~20%, so `sling0.g.position.x` ends at `+0.4149` and `sling1.g.position.x` only reaches `-0.4085` (`3.9 cm` further inboard for Loadouts 6–8).
     - As a result, on the current working tree:
       - With `chapelHalo.visible = false` (current `index.html`): still **`31 pass / 16 fail`**, with `aa12@sling-`, `sniper@sling-`, `chainsaw@sling+`, `chainsaw@sling-`, and `flamer@sling-` gaps `3.6–4.3 cm` smaller than in `5adede46` (`0.037–0.118 m` vs `0.073–0.161 m`).
       - With `chapelHalo.visible` reverted to `true`: **`42 pass / 5 fail`** (`sniper@sling+`, `flamer@sling+`, `aa12@sling-`, `sniper@sling-`, `chainsaw@sling+`).

---

## 2. Commit & File Bisection Table (Real WebGPU Renderer via Slot)

All runs executed on `http://127.0.0.1:<port>/index.html?debug=1&raf=timer` in an isolated git worktree (`qa/2026-11-04-AG-233/bisect-results.json`, `verify-culprit-results.json`, `post-5adede46-breakdown.json`):

| Tree / Worktree State | Pass / Fail | End `sling0.x` / `sling1.x` | Failing Checks |
| :--- | :---: | :---: | :--- |
| `82d75118` (`GB-220` calibration commit, 23 Oct) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `3dd4890b` (25 Oct) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `2d9ab0b2` (26 Oct) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `5abd7576` (28 Oct) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `f645ba77` (2 Nov morning, parent of `5adede46`) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| **`5adede46` (3 Nov evening checkpoint, clean)** | **31 / 16 FAIL** | `+0.4580` / `-0.4477` | All 16 `sling+` and `sling-` checks (`gap 0.046–0.161 m`, `clip 0.000 m`) |
| **`5adede46` + revert ONLY `chapelHalo.visible` (2 lines in `index.html`)** | **47 / 0 PASS** | `+0.4580` / `-0.4477` | **None — 100% green** |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/weapon-sidearms.js` (`GP-20023` uzi) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/motion.js` (`GB-275`) | **47 / 0 PASS** | `+0.4580` / `-0.4477` | None |
| `5adede46` (`chapelHalo.visible=true`) + working `index.html` (`WEAPON_SIZE.chainsaw.len`) | **45 / 2 FAIL** | `+0.4192` / `-0.4089` | `aa12@sling-` (`clip 0.058`), `sniper@sling-` (`clip 0.050`) |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/weapon-heavy.js` (`GP-20022`) | **44 / 3 FAIL** | `+0.4520` / `-0.4473` | `sniper@sling+` (`gap 0.023`), `flamer@sling+` (`gap 0.044`), `chainsaw@sling+` (`clip 0.028`) |
| `WORKING_TREE` + revert ONLY `chapelHalo.visible` (2 lines in `index.html`) | **42 / 5 FAIL** | `+0.4149` / `-0.4085` | `sniper@sling+`, `flamer@sling+`, `aa12@sling-`, `sniper@sling-`, `chainsaw@sling+` |
| **`WORKING_TREE` (current unmodified)** | **31 / 16 FAIL** | `+0.4149` / `-0.4085` | All 16 `sling+` and `sling-` checks (`gap 0.037–0.139 m`, `clip 0.000 m`) |

---

## 3. Side-by-Side Per-Spot Readings (`t189`)

| Spot Tag | `SHOT_BAR` (`[gap, clip]`) | `5adede46` (`chapelHalo.visible = true` reverted) | `5adede46` (clean, `chapelHalo.visible = false`) | `WORKING_TREE` (current, `chapelHalo.visible = false`) |
| :--- | :---: | :---: | :---: | :---: |
| `m4@sling+` | `[0.012, 0.085]` | PASS (`gap 0.000, clip 0.085`) | FAIL (`gap 0.077, clip 0.000`) | FAIL (`gap 0.079, clip 0.000`) |
| `ak@sling-` | `[0.012, 0.067]` | PASS (`gap 0.000, clip 0.065`) | FAIL (`gap 0.089, clip 0.000`) | FAIL (`gap 0.089, clip 0.000`) |
| `aa12@sling+` | `[0.012, 0.078]` | PASS (`gap 0.000, clip 0.068`) | FAIL (`gap 0.046, clip 0.000`) | FAIL (`gap 0.047, clip 0.000`) |
| `shotgun@sling-` | `[0.012, 0.049]` | PASS (`gap 0.000, clip 0.040`) | FAIL (`gap 0.077, clip 0.000`) | FAIL (`gap 0.077, clip 0.000`) |
| `sniper@sling+` | `[0.012, 0.015]` | PASS (`gap 0.007, clip 0.000`) | FAIL (`gap 0.108, clip 0.000`) | FAIL (`gap 0.109, clip 0.000`) |
| `launcher@sling-` | `[0.012, 0.032]` | PASS (`gap 0.000, clip 0.031`) | FAIL (`gap 0.118, clip 0.000`) | FAIL (`gap 0.118, clip 0.000`) |
| `flamer@sling+` | `[0.043, 0.015]` | PASS (`gap 0.033, clip 0.000`) | FAIL (`gap 0.138, clip 0.000`) | FAIL (`gap 0.139, clip 0.000`) |
| `chainsaw@sling-` | `[0.069, 0.015]` | PASS (`gap 0.059, clip 0.000`) | FAIL (`gap 0.161, clip 0.000`) | FAIL (`gap 0.118, clip 0.000`) |
| `ak@sling+` | `[0.012, 0.045]` | PASS (`gap 0.000, clip 0.035`) | FAIL (`gap 0.124, clip 0.000`) | FAIL (`gap 0.126, clip 0.000`) |
| `m4@sling-` | `[0.037, 0.015]` | PASS (`gap 0.025, clip 0.000`) | FAIL (`gap 0.134, clip 0.000`) | FAIL (`gap 0.088, clip 0.000`) |
| `shotgun@sling+` | `[0.012, 0.050]` | PASS (`gap 0.000, clip 0.040`) | FAIL (`gap 0.077, clip 0.000`) | FAIL (`gap 0.078, clip 0.000`) |
| `aa12@sling-` | `[0.012, 0.038]` | PASS (`gap 0.000, clip 0.026`) | FAIL (`gap 0.073, clip 0.000`) | FAIL (`gap 0.037, clip 0.000`) |
| `launcher@sling+` | `[0.012, 0.015]` | PASS (`gap 0.000, clip 0.011`) | FAIL (`gap 0.132, clip 0.000`) | FAIL (`gap 0.133, clip 0.000`) |
| `sniper@sling-` | `[0.012, 0.015]` | PASS (`gap 0.000, clip 0.013`) | FAIL (`gap 0.079, clip 0.000`) | FAIL (`gap 0.043, clip 0.000`) |
| `chainsaw@sling+` | `[0.025, 0.015]` | PASS (`gap 0.015, clip 0.000`) | FAIL (`gap 0.105, clip 0.000`) | FAIL (`gap 0.062, clip 0.000`) |
| `flamer@sling-` | `[0.032, 0.015]` | PASS (`gap 0.022, clip 0.000`) | FAIL (`gap 0.083, clip 0.000`) | FAIL (`gap 0.047, clip 0.000`) |
