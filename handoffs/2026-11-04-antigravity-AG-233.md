# Handoff: AG-233 — `t189` Real-Renderer Sling Reds Bisection (`report; no bar moves`)

- **Date:** 2026-11-04
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-233` — Bisect `t189`'s real-renderer sling reds (`31 pass / 16 fail`, all 16 `sling+`/`sling-` checks failing on `4.6–16.1 cm` gap with `0.000 m` clipping) through the shared game-test slot in an isolated git worktree (`no bar moves`).
- **Full Report & Data:**
  - [`qa/2026-11-04-AG-233/report.md`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-233/report.md)
  - [`qa/2026-11-04-AG-233/bisect-results.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-233/bisect-results.json)
  - [`qa/2026-11-04-AG-233/verify-culprit-results.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-233/verify-culprit-results.json)
  - [`qa/2026-11-04-AG-233/post-5adede46-breakdown.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-233/post-5adede46-breakdown.json)

---

## 1. Root Cause Summary

### A. Primary Culprit (Why all 16 `sling+`/`sling-` checks flipped to `4.6–16.1 cm` gap / `0.000 m` clipping)

- **Commit:** `5adede46` (`Checkpoint: 2026-11-03 evening`), specifically **`AG-200`** in [`index.html`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/index.html#L21316-L21337) (`lines 21316` and `21336` in the current tree; `lines 21315` and `21335` in `5adede46`).
- **Exact 2-line change in `index.html`:**
  ```js
  chapelHalo.visible = false;   // AG-200: drawn only while it glows (at opacity 0 it was a sphere drawn every frame)
  ```
  and inside `updateChapelBless(dt)`:
  ```js
  chapelHalo.visible = chapelGlowT > 0;
  ```
- **Why this flipped every slung gun in `t189`:**
  1. `chapelHalo` (`name: 'chapel-glow'`, added in `CU-103` at `index.html:21309-21317`) is a `THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), ...)` attached directly to `marine` (`marine.add(chapelHalo)`) at `position (0, 1.05, 0)`, `scale (0.72, 1.2, 0.48)` — an invisible ellipsoid **`0.893 m` wide (`x = ±0.446 m`), `1.488 m` tall (`y = 0.306..1.794 m`), and `0.595 m` deep (`z = ±0.298 m`)** with `opacity: 0`.
  2. In [`tools/tests/t189.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/tools/tests/t189.js#L74-L75):
     ```js
     const skip = new Set([ud.weaponMount, ud.armLG, ud.armRG, ud.headG].filter(Boolean)); for (const [, s2] of spots) skip.add(s2.g);
     const body = []; marine.traverse((o) => { if (!o.isMesh || !o.visible || o.isInstancedMesh) return; for (let q = o; q; q = q.parent) { if (skip.has(q) || !q.visible) return; } body.push(o); });
     ```
     `t189.js` collects every visible `Mesh` under `marine` into `body` without skipping `chapel-glow` or checking `o.material.opacity === 0`.
  3. Before `AG-200` (from `82d75118` when `GB-220` recorded `SHOT_BAR` through `f645ba77`), `chapelHalo.visible` was always `true` even at `opacity: 0`. Because `clearCarryPack(THREE, s, true)` pushes the primary sling spots outboard to `x ≈ ±0.35..0.46 m` (`z = -0.255 m`), `t189`'s horizontal inward rays from every slung gun were hitting the invisible `chapel-glow` ellipsoid (`gap 0.000–0.059 m`, `clipping 0.000–0.085 m`), and `GB-220`'s `SHOT_BAR` recorded those `chapel-glow` hits. (This also explains the `GB-220` note at `t189.js:111`: *"this measure does not read the drawn copy as drawn (moving a -side row did not move its reading)"*.)
  4. Once `AG-200` set `chapelHalo.visible = false` when `chapelGlowT <= 0`, `chapelHalo` was no longer included in `body`. Every slung gun's inward rays bypassed the invisible sphere and measured the true `0.046–0.161 m` horizontal gap from the outboard-pushed sling mounts to the marine's actual torso/pack, with `0.000 m` clipping (`31 pass / 16 fail`).
- **Proof:** Reverting **only** those two `chapelHalo.visible` lines in `index.html` at `5adede46` restores `t189` from **`31 pass / 16 fail`** to **`47 pass / 0 fail`**.

### B. Secondary Post-`5adede46` Delta on Current Working Tree (`GP-20022`)

Between `5adede46` and the current working tree, two `GP-20022` changes (`index.html:23299` `WEAPON_SIZE.chainsaw.len: 1.376 -> 1.715` and `studio/weapon-heavy.js` `makeChainsawModel` / `makeMinigunModel`) alter the cumulative outboard `spot.g.position.x` offset in [`ui/marine-kit-fit.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/ui/marine-kit-fit.js#L14-L27) (`clearCarryPack` adds `spot.g.position.x += side * Math.max(0, 0.265 - inner)` without resetting `spot.g.position.x` between loadouts):
- In `5adede46`, `sling0.g.position.x` ends at `+0.4580` and `sling1.g.position.x` reaches `-0.4477` in Loadout 4 (`chainsaw@sling-`) and stays there for Loadouts 5–8.
- In the current working tree, `WEAPON_SIZE.chainsaw.len = 1.715` shrinks `chainsaw`'s `sizeK` by ~20%, so `sling0.g.position.x` ends at `+0.4149` and `sling1.g.position.x` only reaches `-0.4085` (`3.9 cm` further inboard for Loadouts 6–8).
- With `chapelHalo.visible` reverted to `true` on the current working tree, `t189` is **`42 pass / 5 fail`** (`sniper@sling+`, `flamer@sling+`, `aa12@sling-`, `sniper@sling-`, `chainsaw@sling+`). With `chapelHalo.visible = false` (current tree), `t189` is **`31 pass / 16 fail`**, with `aa12@sling-`, `sniper@sling-`, `chainsaw@sling+`, `chainsaw@sling-`, and `flamer@sling-` gaps `3.6–4.3 cm` smaller than in `5adede46`.

---

## 2. Bisection Summary Table

| Tree / Worktree State | Pass / Fail | End `sling0.x` / `sling1.x` |
| :--- | :---: | :---: |
| `82d75118` (`GB-220` calibration, 23 Oct) .. `f645ba77` (2 Nov morning) | **47 / 0 PASS** | `+0.4580` / `-0.4477` |
| `5adede46` (3 Nov evening checkpoint, clean) | **31 / 16 FAIL** | `+0.4580` / `-0.4477` |
| **`5adede46` + revert ONLY `chapelHalo.visible` (2 lines in `index.html`)** | **47 / 0 PASS** | `+0.4580` / `-0.4477` |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/weapon-sidearms.js` | **47 / 0 PASS** | `+0.4580` / `-0.4477` |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/motion.js` | **47 / 0 PASS** | `+0.4580` / `-0.4477` |
| `5adede46` (`chapelHalo.visible=true`) + working `index.html` (`WEAPON_SIZE.chainsaw.len`) | **45 / 2 FAIL** | `+0.4192` / `-0.4089` |
| `5adede46` (`chapelHalo.visible=true`) + working `studio/weapon-heavy.js` (`GP-20022`) | **44 / 3 FAIL** | `+0.4520` / `-0.4473` |
| `WORKING_TREE` + revert ONLY `chapelHalo.visible` (2 lines in `index.html`) | **42 / 5 FAIL** | `+0.4149` / `-0.4085` |
| `WORKING_TREE` (current unmodified) | **31 / 16 FAIL** | `+0.4149` / `-0.4085` |

---

Changed: `qa/2026-11-04-AG-233/run-bisect.mjs`, `qa/2026-11-04-AG-233/verify-culprit.mjs`, `qa/2026-11-04-AG-233/bisect-results.json`, `qa/2026-11-04-AG-233/verify-culprit-results.json`, `qa/2026-11-04-AG-233/post-5adede46-breakdown.json`, `qa/2026-11-04-AG-233/report.md`, `handoffs/2026-11-04-antigravity-AG-233.md` (report only; zero changes to `index.html`, `tools/tests/t189.js`, or any production/test files).
Tests: Ran `tools/tests/t189.js` on the real WebGPU renderer through `node crew/crew.mjs slot run antigravity AG-233` across 14 commit/file states in an isolated detached git worktree (`wt-ag233`, subsequently removed via `git worktree remove --force`).
Not verified: No fix or bar adjustment applied (`AG-233` specifies `report; no bar moves`, Claude decides the fix).
