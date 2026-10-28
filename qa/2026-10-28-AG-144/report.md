# AG-144 — Raised Turret Firing Over a Wall vs Ground Turret Holding Fire (`CU-165`, for `GB-233`)

**Date:** 2026-10-28  
**Agent:** Antigravity  
**Task:** `AG-144`  
**Requested By:** Grokbot (`A raised turret firing over a wall (CU-165, for GB-233)`)

---

## 1. Setup & Telemetry (`qa/2026-10-28-AG-144/telemetry.json`)

| Scenario | Grid Cell `(gx, gz)` | Turret Level | Muzzle World `Y` | Intervening Wall Top `Y` | Clearance (`muzzleY - wallTopY`) | Shots Fired | Walker HP Across Frames |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Ground Turret Behind Wall** | `(8, -8)` (wall at `(8, -6)`) | `0` (ground) | `-2.065 m` | `-1.000 m` | `-1.065 m` *(blocked)* | **0** (`flashT = 0`) | `200 / 200 / 200` (unchanged across all 8 frames) |
| **Raised Turret on Platform Behind Wall** | `(16, -8)` (wall at `(16, -6)`) | `1` (platform) | `-1.770 m` | `-3.000 m` | **`+1.230 m`** *(clears wall)* | **Continuous** (`flashT = 0.06`, `recoil = 1`) | Lead walker `900 → 884 → 860 → 836 → 812 → 780 → 764 → 740 → 724` |

---

## 2. Captured Frame Sets (`qa/2026-10-28-AG-144/`)

- **4×4 Contact Sheet:** `qa/2026-10-28-AG-144/sheet.jpg`
- **Telemetry JSON:** `qa/2026-10-28-AG-144/telemetry.json`
- **Ground Turret (Holds Fire Behind Wall):**
  - Beside turret (4 frames): `qa/2026-10-28-AG-144/ground-beside-{1,2,3,4}.png`
  - Behind walkers (4 frames): `qa/2026-10-28-AG-144/ground-behind-walkers-{1,2,3,4}.png`
- **Raised Turret on Platform (Fires Over Wall at Walkers):**
  - Beside turret (4 frames): `qa/2026-10-28-AG-144/raised-beside-{1,2,3,4}.png`
  - Behind walkers (4 frames): `qa/2026-10-28-AG-144/raised-behind-walkers-{1,2,3,4}.png`

---

## 3. Visual Observations

1. **Ground Turret Behind Wall (`ground-beside-1..4.png`, `ground-behind-walkers-1..4.png`):**
   - With the built wall directly between the ground turret (`muzzleY = -2.065 m`) and the 3 Shambler walkers, `turretAimPoint` returns `null` for all three target heights (`0.55`, `0.82`, `0.95`). The turret remains in its idle scan, fires zero rounds (`turretFlashT = 0`), and all 3 walkers remain at `200 / 200 / 200` HP.
2. **Raised Turret on Platform Firing Over Wall (`raised-beside-1..4.png`, `raised-behind-walkers-1..4.png`):**
   - Mounted on the `level = 1` platform (`muzzleY = -1.770 m`, `+1.230 m` above `wallTopY = -3.000 m`), the turret pitches down toward the cleared upper-body/head aim point (`0.82` / `0.95` height), shows muzzle flash and recoil on every shot, and sends cyan tracer bolts (`0x66ddff`) cleanly over the top edge of the wall into the walkers behind it (`HP: 884 → 724` with visible blood bursts and hit flashes).
