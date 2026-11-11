# Handoff: AG-293 — Shotgun Ammo Types & The X Change by Eye on RTX 5080

- **Agent:** `antigravity` (`Gemini 4 Carbon`)
- **Date:** `2026-11-11`
- **Status:** `DONE`
- **Directives & Orders Addressed:** `J133` (Jerry, 10 Nov 2026: the ammo system), `J134` (Jerry, 10 Nov 2026: standing rule, no full-auto gun has ammo types; X remains shotgun ammo switch), `D-149`, `CB-294` (Claude 2), `GP-20083` (ChatGPT).

---

## Summary of Findings & Verified Visual Deliverables

Every requirement of AG-293 was tested and visually verified on the real WebGPU renderer on Jerry's NVIDIA GeForce RTX 5080 (16 GB):

### 1. The Three Shotgun Ammo Types Across 4 Lights (Strips 1, 2, 3)
In the Training Ground range (Lane 3 center, 10m from silhouette target):
- **Birdshot (Issued load):**
  - **Ballistics:** 7 pellets $\times$ 9 damage = 63 total damage; spread factor `0.14`.
  - **Spent Hull Thrown:** Red plastic (`0xa43e37`), short brass base (`0.12` head fraction), 0 moulded bands.
  - **4 Lights Verified:** Noon, Overcast, Dusk, Night in Strip 1 (`review/AG-293/ammo-strips.jpg` and `review/AG-293/sheet.jpg`).
- **Buckshot (00 Buck):**
  - **Ballistics:** 8 pellets $\times$ 10 damage = 80 total damage; spread factor `0.12`.
  - **Spent Hull Thrown:** Blue plastic (`0x497ba0`), tall brass base (`0.25` head fraction), 1 raised moulded band around body.
  - **4 Lights Verified:** Noon, Overcast, Dusk, Night in Strip 2 (`review/AG-293/ammo-strips.jpg` and `review/AG-293/sheet.jpg`).
- **Slug (1 oz Rifled Slug):**
  - **Ballistics:** 1 heavy projectile $\times$ 100 damage = 100 total damage; spread factor `0.02`.
  - **Spent Hull Thrown:** Ivory / cream plastic (`0xc9c3a2`), tall brass base (`0.25` head fraction), 2 raised moulded bands around body.
  - **4 Lights Verified:** Noon, Overcast, Dusk, Night in Strip 3 (`review/AG-293/ammo-strips.jpg` and `review/AG-293/sheet.jpg`).

### 2. The X Change Sequence (Strip 4 & Row 5)
Captures the five distinct stages of the manual type swap sequence:
1. **Ready:** 8/8 Birdshot loaded. HUD displays: `SHOTGUN · X CHANGE SHELLS | 8 / 8 · BIRD · 154 spare`.
2. **Unloading:** Pressing `KeyX` initiates shell extraction. Rounds are pumped out one at a time at `0.36 s / shell` into player reserve (no lost ammo). HUD displays: `7 SHOTGUN · X CHANGE SHELLS | Changing to BUCK · unloading 1/8`.
3. **Empty / Transition:** Tube completely cleared of old type (`0 inGun`). HUD displays: `0 SHOTGUN · X CHANGE SHELLS | Changing to BUCK · loading 0/8`.
4. **Loading:** Pushing new Buckshot rounds in from stock at `0.42 s / shell`. HUD displays: `4 SHOTGUN · X CHANGE SHELLS | Changing to BUCK · loading 4/8`.
5. **Settled:** All 8 Buckshot shells seated and pump locked forward (`0.25 s` settle). Total swap time: ~6.5 seconds. HUD displays: `8 SHOTGUN · X CHANGE SHELLS | 8 / 8 · BUCK · 72 spare`.

### 3. Downrange 10m Target Spread Comparison (Row 2)
Direct comparison against the Lane 3 steel silhouette target at exactly 10m:
- **Birdshot:** Wide, defensive dispersal across target chest, shoulders, and outer scoring rings.
- **Buckshot:** Dense, lethal pellet grouping concentrated tightly within the inner 10 and 5 chest rings.
- **Slug:** Single clean, devastating hole dead center in the bullseye.

### 4. Spent Hull High-Resolution Studio Plate (Row 1)
Dedicated macro inspection of all three spent cases rendered with real 70mm 12ga proportions:
- `review/AG-293/hull-birdshot.png`: Red hull, short brass base, 0 bands.
- `review/AG-293/hull-buckshot.png`: Blue hull, tall brass base, 1 moulded band.
- `review/AG-293/hull-slug.png`: Ivory hull, tall brass base, 2 moulded bands.
- `review/AG-293/hulls-comparison.png`: Side-by-side composite lineup.

---

## Verification Artifacts

- **Automated Unit Suite:** `combat/ammo-types.test.mjs` (11/11 pass).
- **Automated Integration Checks:**
  - `tools/realtest.mjs tcb294`: 39 pass, 0 fail (51.0s, real WebGPU renderer).
  - `tools/realtest.mjs tcb294b`: 25 pass, 0 fail (42.5s, real WebGPU renderer).
- **Master Review Sheet:** `review/AG-293/sheet.jpg` (`1496x1622`, 5 structured rows).
- **Ammo Strips Review Sheet:** `review/AG-293/ammo-strips.jpg` (`1604x1051`, 4 full strips).
- **Capture Log & Manifest:** `review/AG-293/capture-manifest.json`.
- **All Verified Raw Captures (36 images):**
  - `review/AG-293/*.png` and `qa/2026-11-11-AG-293/*.png`.
