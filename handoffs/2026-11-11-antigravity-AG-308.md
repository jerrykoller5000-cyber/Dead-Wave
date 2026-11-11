# AG-308 — Melee Practice Striking Dummy for the Training Ground (Model, Decals, Wobble & 4-Light 5080 Retake)

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Card:** `AG-308` — *J137 (Jerry, 11 Nov / D-156): A melee practice dummy for the Training Ground, the model. Next after AG-307.*
- **Requesters:** `CLAUDE DIRECTOR` & `ChatGPT` (`GP-20101`)

---

## Retake Status (CLAUDE DIRECTOR 15:36Z Re-shoot Order):
- **Completed successfully in the live Training Ground** on NVIDIA GeForce RTX 5080 WebGPU (`WebGPUBackend`).
- Dummy mounted at world coordinates `(x = -5.000, y = -200.000, z = -642.800, yaw = 0)` on the tiled apron behind the firing bench (matching GP-20101's placement).
- **Exact NDC Framing Assertions:** Every shot asserts dummy crown, chest, and base are fully bounded within viewport NDC (chest centered at $|x| < 0.42$, crown $< 0.95$, base $> -0.98$). Zero clipping, zero missed framing.
- **Both composite review sheets regenerated:**
  - `review/AG-308/sheet-ag308-4lights.jpg` (`2400x1318`, luma mean `67.6`, std `47.7`): 4 Lights (`noon`, `overcast`, `dusk`, `night`+flashlight) $\times$ (1P Eye ~2.1m Pristine, 1P Eye After Real Hits, 3P Scale Beside 1.80m Marine).
  - `review/AG-308/dummy-details.jpg` (`2420x1398`, luma mean `81.8`, std `54.7`):
    - Row 1: 6 isolated close-ups (0.88m) of EACH decal kind after REAL in-game weapon hits (Combat Knife, Machete, Katana, Chainsaw, Scorch, Gun Bullet).
    - Row 2: Front, Side, and Back turnaround + live effect sorting proofs (live flamethrower fire `renderOrder = 3` and chainsaw sparks/dust `renderOrder = 0` sorted strictly over decals `renderOrder = -0.5`).
    - Row 3: 6-frame sprung wobble filmstrip ($t=0.00\text{s}$ rest, $0.09\text{s}$ peak lean $+16.0^\circ$, $0.21\text{s}$ $+3.7^\circ$, $0.33\text{s}$ rebound $-8.2^\circ$, $0.56\text{s}$ $+4.1^\circ$, $1.30\text{s}$ settled $-0.5^\circ$) with dashed cyan upright plumb line.

---

## Changed:
- `world/training-dummy.js`:
  - **Human-Scale Striking Dummy Model:** Full striking dummy (`1.79 m` total height, human-scale matching marine eye height, `0.32 m` base radius seated flush at $y = \text{floorY}$). Heavy cast-iron base, sprung mast, and anatomical torso/neck/head sculpted with smooth superellipse cross-sections.
  - **Tactical Combat Vinyl & Canvas:** Muted olive-drab tactical vinyl canvas (`#343b31`), rubbed canvas wear on chin/chest/ribs, surface scuffs, double perimeter stitching. Zero logos or brand markings (D-74).
  - **Dynamic Multi-Weapon Hit Decal Atlas:** Surface-conforming 3x3 curved decals with `renderOrder = -0.5`, `depthWrite = false`, `polygonOffset = true` parented directly to `pivot`. Correctly supports knife slit, machete chop, katana cleave, chainsaw tear, thermal scorch, and bullet punctures.
  - **Damped Harmonic Spring Wobble Physics:** 2-axis + spine torsion oscillator ($\omega_0 = 13.5\text{ rad/s}, \zeta = 0.28$) with height torque leverage. Settles over ~1.3 s.
  - **GP-20101 Integration Contract:**
    - `dummy.solid`: `{ minX, maxX, minY, maxY, minZ, maxZ, solid: true, prop: true, dummy: true }`.
    - `dummy.traceSegment(a, b, pad)`: Exact ray/capsule intersection against dummy anatomical slices.
    - `dummy.strike({ kind, point, normal, direction, damage })`: Surface strike with decals and spring impulse.
    - `dummy.pushOut(pos, radius)`: Dynamic player collision constraint.
    - `dummy.reset()`, `dummy.clearMarks()`, `dummy.state()`, `dummy.prepareWarmup()`.
- `qa/2026-11-11-AG-308/ag308-dummy-verify.mjs`: Complete automated verification harness with NDC framing assertions, 29 capture shots across 4 lights, real weapon hits, and filmstrip.
- `qa/2026-11-11-AG-308/build-ag308-sheets.py`: Contact sheet generator.
- `review/AG-308/`: Regenerated review sheets (`sheet-ag308-4lights.jpg`, `dummy-details.jpg`, `ag308-summary.json`, 29 shots).

---

## Tests:
- `node world/training-dummy.test.mjs` -> PASS (3 pass, 0 fail, 76 ms).
- `node qa/2026-11-11-AG-308/smoke-test.mjs` -> PASS (LF line endings, bounds, warmup draws 4->6->4, raycasts, pushOut, 6 strikes, wobble curve, reset).
- `node crew/crew.mjs slot run antigravity AG-308 --checks "Retake dummy look 4-lights turnaround and decals" -- node qa/2026-11-11-AG-308/ag308-dummy-verify.mjs` -> PASS (WebGPUBackend on RTX 5080, 29 shots captured, 0 page errors, 0 GPU warnings).
- `python qa/2026-11-11-AG-308/build-ag308-sheets.py` -> PASS.

---

## Not verified:
- Live survival mode integration (dummy is exclusive to Training Ground per D-156).

---

## Next:
- Hand off AG-308 review sheets to CLAUDE DIRECTOR.
- Proceed to **AG-309** Training Ground entry optimization (~9s -> ~5s).
