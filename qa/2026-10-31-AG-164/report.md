# AG-164: First-Person Weapon Baseline & GPU Visual Audit (CL-281 Foundation)

**Agent:** Antigravity  
**Task:** AG-164 (Every weapon in first person, the baseline for CL-281 — Jerry J14, J15)  
**Date:** 2026-10-31  
**Hardware Platform:** NVIDIA GeForce RTX 5080 (`ANGLE Direct3D11 vs_5_0 ps_5_0, D3D11`), 1600×900  
**Capture Suite:** `qa/2026-10-31-AG-164/run-ag164.mjs`  
**Master Contact Sheet:** `qa/2026-10-31-AG-164/sheet.jpg` (`1780×3425`, `964,930 bytes`, 60 weapon states)  
**Reference Specification Cards:** `qa/2026-10-31-AG-164/references/` (`ref-rifles.png`, `ref-sidearms.png`, `ref-shotguns.png`, `ref-heavy.png`, `ref-akimbo.png`)  
**Captured Shots:** 60 PNG images in `qa/2026-10-31-AG-164/shots/` (`shots-manifest.json`)

---

## 1. Executive Summary & Context

Jerry's 1.1 playthrough (2026-10-31, `docs/jerry/2026-10-31-1.1-notes.md`) established a critical directive for 1.2:
> **J14:** *"Someone who knows what they are doing needs to do a complete revamp of how weapons look and are handled in first person: the aim, the hand placement and movement, the reloads, how the weapons look up close, and the FOV."*  
> **J15:** *"My God the hands. It's the bane of my existence in first person. They look so wrong and always in the wrong spots."*  
> **J22:** *"If someone doesn't figure out how to get these hands and wrists to look good I'm going to implode."*

Previous passes attempted to patch third-person body IK / arm solves into the first-person camera (`FP_HIP`, `FP_HIP_HAND`, `FP_RELIEF`). As documented across 17 of Jerry's notes (**J3–J16, J18–J25**), this architecture creates fundamental visual defects:
1. **Third-Person Projection Distortion:** Weapons sit high and to the left (J12), eating up 30–45% of central screen space instead of resting in a traditional lower-right FPS viewmodel pocket.
2. **Hand & Wrist Anatomy Failure:** Hands clip through grips and magwells (J3); wrists break at unnatural 70–90° right angles or float disconnected from sleeve cuffs (J11, J15, J22).
3. **Camera Plane Clipping:** Reloads and FOV zooms clip directly through the camera near-plane (J4, J5, J10, J13, J20).
4. **Akimbo Breakage:** Offhand weapons pop out of hands when looking down, sit asymmetrically, and lack a contracted crosshair (J6).

This baseline audit captures all 15 weapon loadouts (12 base weapons + 3 akimbo variants) across all 4 mandatory states on Jerry's actual RTX 5080 GPU:
1. **First-Person Hip (`fp-hip`)**
2. **First-Person Aim / ADS (`fp-aim`)**
3. **First-Person Mid-Reload (`fp-reload`)**
4. **Third-Person Model Pose (`tp`)**

This report directly establishes the empirical requirements and quantitative scoring baseline for **Claude's CL-281** dedicated viewmodel pass.

---

## 2. Master Scoring Matrix (D-89 Standard, 0–5 Scale)

*Scoring criteria based on Universal Asset & Animation Principles (AGENTS.md rules 18–19):*
* **Hands:** Grip contact, finger curling, trigger finger indexing, support hand placement, lack of geometry clipping.
* **Wrists:** Forearm alignment, natural ergonomic wrist angles (10–20°), forearm tension, sleeve grounding.
* **Placement:** Screen quadrant (traditional FPS lower-right vs awkward center-left), FOV perspective distortion, visual balance.
* **FOV & Sights:** ADS reticle/sight alignment, front post/notch visibility, eye relief, clear view without camera clipping.

| # | Weapon / Loadout | Hands | Wrists | Placement | FOV & Sights | Overall | Status / Primary Defect | Jerry Notes |
|---|---|:---:|:---:|:---:|:---:|:---:|---|---|
| 01 | **GW-4 Carbine (M4)** | 2.5 | 2.0 | 2.5 | 3.0 | **2.5** | FLAG: Pushed high-left; wrist twists on reload; red dot clunky | J10, J11, J12, J14 |
| 02 | **AK Assault Rifle** | 2.5 | 2.0 | 2.5 | 3.0 | **2.5** | FLAG: High ready blocks center view; support hand slips on forend | J11, J12, J15 |
| 03 | **M9 Service Pistol** | 1.5 | 2.0 | 2.5 | 3.0 | **2.25** | FAIL: Severe hand clipping through grip; unnatural cup grip | J3, J7, J11, J15 |
| 04 | **Wasp SMG (Uzi)** | 2.0 | 2.0 | 2.0 | 1.5 | **1.88** | FAIL: Zoom FOV too close; reload clips camera plane; charging handle blocks sight | J4, J5, J12, D-91 |
| 05 | **Magnum Revolver** | 2.0 | 2.0 | 2.5 | 1.5 | **2.0** | FAIL: Hammer directly obstructs sight notch on aim; rigid reload | J13, J15 |
| 06 | **Pump Shotgun** | 2.5 | 2.5 | 2.5 | 3.0 | **2.63** | FLAG: Receiver eats screen center; pump hand slips on slide | J11, J12 |
| 07 | **Breacher-12 (AA-12)** | 2.5 | 2.0 | 2.0 | 2.5 | **2.25** | FLAG: Violent recoil kick; sights inaccurate; drum blocks lower view | J20, J21 |
| 08 | **Sniper Rifle** | 2.5 | 3.0 | 3.0 | 4.0 | **3.13** | PASS-: Scope overlay clean, but bolt cycle clips; hip carry low | J11, J14 |
| 09 | **Minigun** | 2.0 | 2.5 | 4.0 | 3.5 | **3.0** | FLAG: Great placement, but hands completely detached from spade handles | J18 |
| 10 | **Grenade Launcher** | 3.0 | 2.5 | 2.5 | 2.5 | **2.63** | FLAG: Lacks leaf/ladder sight for trajectory arc; break action rigid | J16 |
| 11 | **Flamethrower** | 2.0 | 2.0 | 2.5 | 2.5 | **2.25** | FLAG: Support arm hidden leaves floating hand; violent screen shake | J19 |
| 12 | **Chainsaw** | 2.5 | 2.5 | 3.0 | 3.0 | **2.75** | FLAG: Third-person solve leaves hands misaligned on top handle | J14, J15 |
| 13 | **Akimbo Pistols** | 1.5 | 1.5 | 1.5 | 2.0 | **1.63** | FAIL: Left gun misaligned; guns pop out of hands when looking down | J6, J15, J22 |
| 14 | **Akimbo Wasps** | 1.5 | 1.5 | 1.0 | 1.5 | **1.38** | FAIL: Left gun invisible at normal pitch; pops out of hands; bad crosshair | J6, J14, J15 |
| 15 | **Akimbo Revolvers** | 1.5 | 1.5 | 1.5 | 2.0 | **1.63** | FAIL: Severe wrist breaks; asymmetrical framing; cylinder clipping | J6, J13, J22 |

*Average Baseline Score: **2.30 / 5.0** (All weapons fail the D-89 threshold of ≥ 4.0 / 5.0, validating Jerry's call for a complete ground-up revamp).*

---

## 3. Weapon-by-Weapon Baseline Analysis & Findings

### 01. GW-4 Carbine (M4) — `shots/m4-*.png`
* **Hip (`m4-fp-hip.png`):** Pushed high and to the left (Jerry J12). The weapon occupies 35% of the viewport and extends into the upper-left quadrant. Support hand fingers slide into the barrel handguard seam.
* **Aim (`m4-fp-aim.png`):** Red dot sight housing is thick, slightly misaligned with bore axis, and lacks crisp optical glass depth (Jerry J10). Eye relief is too close to carry handle.
* **Reload (`m4-fp-reload.png`):** Left hand drops down to magwell; wrist bends sharply at ~75° causing the glove cuff to separate from sleeve geometry.
* **Third Person (`m4-tp.png`):** Stock sits 4 cm below the marine's shoulder pocket, floating in air rather than firmly tucked.

### 02. AK Assault Rifle — `shots/ak-*.png`
* **Hip (`ak-fp-hip.png`):** High-ready carry positions the curved 30-round magazine directly in front of the lower-left screen boundary.
* **Aim (`ak-fp-aim.png`):** Front sight post is visible, but rear sight leaf rests too close to the camera near-clipping plane.
* **Reload (`ak-fp-reload.png`):** Rock-and-lock magazine motion is linear; wrist snaps abruptly without realistic wrist rotation around the mag catch.
* **Third Person (`ak-tp.png`):** Support hand fingers clip through lower wooden handguard.

### 03. M9 Service Pistol — `shots/pistol-*.png`
* **Hip (`pistol-fp-hip.png`):** Jerry J3 confirmed: Fingers clip directly through the polymer/steel grip frame. The support hand attempts a "tea-cup" hold under the magazine baseplate instead of a modern two-handed thumbs-forward combat grip.
* **Aim (`pistol-fp-aim.png`):** Sight alignment is acceptable, but the hands clip into the slide and beaver-tail. Both wrists are bent downward unnaturally.
* **Reload (`pistol-fp-reload.png`):** Magazine drops from bottom, but hand movement occurs partially off-screen. Extended mag model is tiny and doesn't match standard 9mm extended basepads (Jerry J7).
* **Third Person (`pistol-tp.png`):** Single-handed to two-handed blend causes twitching when rotating.

### 04. Wasp SMG (Uzi) — `shots/uzi-*.png`
* **Hip (`uzi-fp-hip.png`):** Held too close to chest; only upper receiver and sights peek into the bottom edge (Jerry J4, J12).
* **Aim (`uzi-fp-aim.png`):** Severe issue: Zoom FOV is extremely claustrophobic (Jerry J4). Top charging handle obstructs clear sight picture (D-91).
* **Reload (`uzi-fp-reload.png`):** Critical defect: The weapon rotates upward and directly intersects the camera near-clipping plane, clipping through the player's view (Jerry J5).
* **Third Person (`uzi-tp.png`):** Support hand clips into trigger guard.

### 05. Magnum Revolver — `shots/revolver-*.png`
* **Hip (`revolver-fp-hip.png`):** Two-handed hold sits off-center to the left.
* **Aim (`revolver-fp-aim.png`):** Severe gameplay bug: The hammer sits upright and directly obstructs the rear notch and front blade (Jerry J13), making precision aim impossible.
* **Reload (`revolver-fp-reload.png`):** Cylinder swing-out lacks smooth wrist rotation; speedloader animation is rigid.
* **Third Person (`revolver-tp.png`):** Heavy barrel pulls wrists up at an exaggerated angle.

### 06. Pump Shotgun — `shots/shotgun-*.png`
* **Hip (`shotgun-fp-hip.png`):** Long receiver occupies entire lower-left quadrant.
* **Aim (`shotgun-fp-aim.png`):** Bead sight sits low on rib; perspective foreshortening makes barrel look disproportionately short.
* **Reload (`shotgun-fp-reload.png`):** Shell loading into bottom gate uses rigid linear vector transitions; support wrist doesn't rotate.
* **Third Person (`shotgun-tp.png`):** Hand sits too far forward on the magazine tube instead of the pump forend.

### 07. Breacher-12 (AA-12) — `shots/aa12-*.png`
* **Hip (`aa12-fp-hip.png`):** Heavy drum shotgun sits high and to the left.
* **Aim (`aa12-fp-aim.png`):** Ghost ring sights are inaccurate and clunky (Jerry J20); firing causes violent camera shaking that disorients tracking (Jerry J20).
* **Reload (`aa12-fp-reload.png`):** Drum mag intersects the lower camera plane.
* **Third Person (`aa12-tp.png`):** Drum magazine clips into the marine's tactical vest.

### 08. Sniper Rifle — `shots/sniper-*.png`
* **Hip (`sniper-fp-hip.png`):** Barrel extends far forward; scope housing sits prominent in right view.
* **Aim (`sniper-fp-aim.png`):** Full-screen scope overlay functions well, but scope raise transition snaps abruptly.
* **Reload (`sniper-fp-reload.png`):** Bolt pull animation has fingers floating off the bolt handle.
* **Third Person (`sniper-tp.png`):** Shoulder tuck and sling look grounded.

### 09. Minigun — `shots/minigun-*.png`
* **Hip (`minigun-fp-hip.png`):** Placement is good (Jerry J18), but hands are completely disconnected from the top carry handle and rear spade trigger (Jerry J18: *"Placement is great. Hands not even close"*).
* **Aim (`minigun-fp-aim.png`):** Firing tightens spread, but lacks an aiming reticle or mini red dot (Jerry J18).
* **Reload (`minigun-fp-reload.png`):** Continuous belt feed; no reload cycle.
* **Third Person (`minigun-tp.png`):** Marine torso twists unnaturally to support weight.

### 10. Grenade Launcher (M79) — `shots/launcher-*.png`
* **Hip (`launcher-fp-hip.png`):** Fat 40mm barrel points toward center-left.
* **Aim (`launcher-fp-aim.png`):** Lacks an authored flip-up leaf / ladder sight for arcing grenades (Jerry J16: *"Launcher needs better first-person sights: the ability to arc rounds a little, maybe a leaf sight"*).
* **Reload (`launcher-fp-reload.png`):** Break action snaps open without smooth latch release.
* **Third Person (`launcher-tp.png`):** Grip is stable.

### 11. Flamethrower — `shots/flamer-*.png`
* **Hip (`flamer-fp-hip.png`):** Front wand nozzle sits in lower-right; screen shakes violently when ignited (Jerry J19).
* **Aim (`flamer-fp-aim.png`):** `FP_HIDE_SUPPORT` hides the left arm to prevent clipping, leaving a disconnected right hand floating in space.
* **Reload (`flamer-fp-reload.png`):** No articulated canister swap.
* **Third Person (`flamer-tp.png`):** Fuel tanks and hose look great.

### 12. Chainsaw — `shots/chainsaw-*.png`
* **Hip (`chainsaw-fp-hip.png`):** Engine housing and guide bar dominate view.
* **Aim (`chainsaw-fp-aim.png`):** Braced cutting stance jerks forward.
* **Reload (`chainsaw-fp-reload.png`):** Pull cord starter is only partially animated in first person.
* **Third Person (`chainsaw-tp.png`):** Hands misaligned with wrap-around handle.

### 13–15. Akimbo Weapons (Pistol, Wasp, Revolver) — `shots/*-akimbo-*.png`
* **Hip:** Severe failure confirming Jerry J6: Left gun is almost completely off-screen at normal pitch; when looking down, both guns detach and pop out of hands entirely.
* **Aim:** Zoom expands crosshairs rather than contracting them; no dedicated dual crosshair (Jerry J6).
* **Reload:** Both weapons dip simultaneously with impossible magazine reloading without free hands.
* **Third Person:** Dual pistols look passable from behind, but dual revolvers display extreme inward wrist angles.

---

## 4. Architectural Root Cause & Solution Blueprint for CL-281

### The Root Cause: Third-Person Body IK in View Space
Dead-Wave currently calculates first-person weapon positioning by moving the camera to `firstPersonEye()` and solving the 3rd-person character's arm bones (`holdWeapon()`, `FP_HIP`, `FP_HIP_HAND`).
Because human arm joints solved for an isometric/chase camera cannot satisfy the visual projection of a 90° first-person camera, every adjustment to fix third-person breaks first-person, and vice-versa.

### The Shipped Shooter Standard: Dedicated Viewmodel Rig (CL-281)
All modern shipped shooters (Call of Duty, Battlefield, CS2, Left 4 Dead) separate first-person rendering entirely:
1. **Separate Viewmodel Pass:** Author dedicated first-person viewmodel arms and weapons rendered in their own view pass with fixed FOV (65–70°), independent of world camera FOV.
2. **Traditional FPS Framing:** Place all weapons in the lower-right quadrant (NDC X: 0.25 to 0.65, Y: -0.75 to -0.15) tilted 6–8° inward.
3. **Authored Grip Sockets:** Each weapon model features authored bone sockets:
   * `socket_grip_main`: Right hand fingers wrapped naturally, trigger finger indexed.
   * `socket_grip_support`: Left hand in authentic C-clamp, forend cup, or thumbs-forward pistol grip.
   * `socket_sight_ads`: Exact sight line aligned with camera center (0, 0, -z).
   * `socket_magwell`: Ejection/insertion alignment for magazines.
4. **View-Space Reload Animations:** Reload clips authored specifically inside the view frustum, ensuring magazines and hands never clip the near plane (z < 0.1m).
5. **Spring-Based Dynamics:** Bob, sway, jump, ADS transitions, and recoil modeled with second-order spring dynamics rather than hard lerps or violent screen shakes.
6. **Dedicated Akimbo Rig:** Symmetrical left and right viewmodel hands anchored to screen corners with a dedicated contracting dual reticle.

---

## 5. Artifacts & Deliverables Summary

* **Master Contact Sheet:** `qa/2026-10-31-AG-164/sheet.jpg` (1780×3425, 60 tiles, complete arsenal matrix).
* **Reference Baseline Cards:** `qa/2026-10-31-AG-164/references/`:
  - `ref-rifles.png` (Assault Rifles: GW-4 & AK)
  - `ref-sidearms.png` (Sidearms & SMGs: M9, Wasp, Revolver)
  - `ref-shotguns.png` (Shotguns: Pump & AA-12)
  - `ref-heavy.png` (Heavy: Minigun, Launcher, Flamer)
  - `ref-akimbo.png` (Dual Wield: Pistols, Wasps, Revolvers)
* **Raw GPU Captures & Sidecars:** 60 PNG images and 60 JSON sidecars in `qa/2026-10-31-AG-164/shots/`.
* **Manifest:** `qa/2026-10-31-AG-164/shots-manifest.json`.

---

## 6. Recommendations for Claude (CL-281) & Grokbot

1. **CL-281 (Claude):** Use `qa/2026-10-31-AG-164/sheet.jpg` and `report.md` as the baseline. Begin with the dedicated first-person viewmodel pass spec (`docs/specs/first-person-1.2.md`). Target the M9 pistol first (Jerry J3) to establish the viewmodel pipeline before rolling out across longarms and heavy weapons.
2. **GB-256 (Grokbot):** Update authored weapon sockets and fix weapon shaking during right-click hold (J31, J32).
3. **GP-19986 (ChatGPT):** Re-size pistol extended magazines and suppressors (J7, J21) to match real magwell dimensions before Claude binds them to the viewmodel reload sockets.
