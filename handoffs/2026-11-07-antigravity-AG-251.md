# antigravity — AG-251 Diagnostic & Audit Report: The First-Person Look of Every Gun, His Way (D-118) — 2026-11-07

Changed:          Completed comprehensive live first-person visual audit on Jerry's RTX 5080 WebGPU PC across all 15 weapon configurations (12 standard weapons + 3 akimbo pairs) in outdoor high-noon daylight against a marked 20.0 m silhouette target plate. Captured 30 native 1920x1080 screenshots (hip resting stance at `ads = 0.00` and full aimed ADS at `ads = 1.00`), collected full scene/viewmodel telemetry into `telemetry.json`, and assembled a master 1920x9030 composite contact sheet (`qa/2026-11-07-AG-251/all-guns-fps-sheet.jpg`, mirrored to `review/AG-251/all-guns-fps-sheet.jpg`). Documented strictly what each picture shows across the four required review axes: (1) The hands, (2) What fills the view, (3) The stock (J9 check: verified zero buttstock intrusion into the sight picture during full ADS), and (4) The sights (alignment, notch/post/ring/optic clarity downrange). Flagged active defects for the weekend pass: Wasp SMG left hand c-grip clipping receiver wall (J3 -> GB-294), and Wasp Akimbo sharp ~23° convergent inward barrel cant (J11 -> GB-294). Confirmed fixes holding: Chainsaw J1 grip controls (GB-292), Revolver J13/J57 lowered hammer & visible front post (GP-20014), Breacher-12 J20 aperture alignment (GB-259), Launcher J4 pistol grip and J2 tucked stock (GP-20037), and Sniper scope overlay.
Files:            qa/2026-11-07-AG-251/run-ag251.mjs, qa/2026-11-07-AG-251/build-sheets.py, qa/2026-11-07-AG-251/telemetry.json, qa/2026-11-07-AG-251/all-guns-fps-sheet.jpg, review/AG-251/all-guns-fps-sheet.jpg, qa/2026-11-07-AG-251/01-pistol-hip.jpg, qa/2026-11-07-AG-251/01-pistol-aimed.jpg, qa/2026-11-07-AG-251/02-revolver-hip.jpg, qa/2026-11-07-AG-251/02-revolver-aimed.jpg, qa/2026-11-07-AG-251/03-uzi-hip.jpg, qa/2026-11-07-AG-251/03-uzi-aimed.jpg, qa/2026-11-07-AG-251/04-m4-hip.jpg, qa/2026-11-07-AG-251/04-m4-aimed.jpg, qa/2026-11-07-AG-251/05-ak-hip.jpg, qa/2026-11-07-AG-251/05-ak-aimed.jpg, qa/2026-11-07-AG-251/06-shotgun-hip.jpg, qa/2026-11-07-AG-251/06-shotgun-aimed.jpg, qa/2026-11-07-AG-251/07-aa12-hip.jpg, qa/2026-11-07-AG-251/07-aa12-aimed.jpg, qa/2026-11-07-AG-251/08-sniper-hip.jpg, qa/2026-11-07-AG-251/08-sniper-aimed.jpg, qa/2026-11-07-AG-251/09-launcher-hip.jpg, qa/2026-11-07-AG-251/09-launcher-aimed.jpg, qa/2026-11-07-AG-251/10-flamer-hip.jpg, qa/2026-11-07-AG-251/10-flamer-aimed.jpg, qa/2026-11-07-AG-251/11-chainsaw-hip.jpg, qa/2026-11-07-AG-251/11-chainsaw-aimed.jpg, qa/2026-11-07-AG-251/12-minigun-hip.jpg, qa/2026-11-07-AG-251/12-minigun-aimed.jpg, qa/2026-11-07-AG-251/13-pistol-pair-hip.jpg, qa/2026-11-07-AG-251/13-pistol-pair-aimed.jpg, qa/2026-11-07-AG-251/14-uzi-pair-hip.jpg, qa/2026-11-07-AG-251/14-uzi-pair-aimed.jpg, qa/2026-11-07-AG-251/15-revolver-pair-hip.jpg, qa/2026-11-07-AG-251/15-revolver-pair-aimed.jpg, handoffs/2026-11-07-antigravity-AG-251.md
Tests:            Executed via shared game-test slot queue (`node crew/crew.mjs slot run antigravity AG-251 --checks "Capture all 15 guns at hip and aimed in daylight for AG-251" -- node qa/2026-11-07-AG-251/run-ag251.mjs`): exit code 0, 0 browser console errors, 30 native HD frames captured, all telemetry logged to `telemetry.json`. Composite contact sheet generation (`python qa/2026-11-07-AG-251/build-sheets.py`): exit code 0.
Screenshots:      qa/2026-11-07-AG-251/all-guns-fps-sheet.jpg (1920x9030 master 15-row composite), review/AG-251/all-guns-fps-sheet.jpg, and 30 individual 1080p frame files in `qa/2026-11-07-AG-251/`.
Not verified:     Jerry's physical gamepad/mouse tactile feedback during live match play.
Requests:         Grokbot (GB-294): Visual confirmation of J3 (Wasp left hand grip) and J11 (Wasp akimbo inward cant) provided below. Claude (CL-305 / CL-306): Full 15-gun baseline established for motion and reload reviews.
Contract changes: none

---

## 1. Executive Summary & Audit Setup

Per **D-118** (Jerry, 2026-11-07: *"I want everyone on FPS weapons for this weekend. The FPS views on all of them look weak."*), we established the complete visual **before set** for all weapons in first person prior to the weekend polish passes.

### Evaluation Conditions (Jerry's Seat)
- **Renderer / Hardware:** Real WebGPU hardware on Jerry's `RTX 5080` via shared test slot queue.
- **Launcher Configuration:** `index.html?solid=1&debug=1&raf=timer` (Jerry's launcher).
- **Camera View:** First person (`TT.setViewFirstDbg(true)`, `fpFov = 60°`, `aimFov = 38°`).
- **Lighting / Environment:** High noon daylight (`worldTime = 0.50`), FOB yard facing straight +Z (`yaw = 0`, `pitch = 0`).
- **Downrange Reference:** High-visibility silhouette target plate with center 10-ring bullseye at exactly `20.0 m` down the bore axis.
- **Configurations Evaluated (15 Total):**
  1. Pistol (`pistol`)
  2. Revolver (`revolver`)
  3. Wasp SMG (`uzi`)
  4. GW-4 Carbine (`m4`)
  5. KR-7 Rifle (`ak`)
  6. Shotgun (`shotgun`)
  7. Breacher-12 (`aa12`)
  8. Sniper Rifle (`sniper`)
  9. Grenade Launcher (`launcher`)
  10. Flamethrower (`flamer`)
  11. Chainsaw (`chainsaw`)
  12. Rotary Gun (`minigun`)
  13. Pistol Pair (`pistol` akimbo)
  14. Wasp Pair (`uzi` akimbo)
  15. Revolver Pair (`revolver` akimbo)

For every configuration, we captured two states:
- **HIP:** Neutral resting hip-fire stance (`ads = 0.00`).
- **AIMED:** Full aim down sights / bring-up (`ads = 1.00`).

---

## 2. Comprehensive 15-Weapon Visual Findings Table

Strictly reporting what the pictures show across the four mandated axes:
1. **The hands** (grip placement, fingers, wrists, arm stumps)
2. **What fills the view** (screen real estate, peripheral blockage, downrange corridor)
3. **The stock** (presence, positioning, and **J9 compliance**: zero stock in frame during ADS)
4. **The sights** (notch/post/ring/crosshair alignment, sightline obstructions)

| # | Weapon Config | 1. The Hands | 2. What Fills the View | 3. The Stock (J9 Check) | 4. The Sights | Overall Verdict & Notes |
|:---|:---|:---|:---|:---|:---|:---|
| **01** | **Pistol (M9)** | Strong hand high on backstrap; left support hand cupping frame base; thumbs forward; straight wrists; no stumps. | Sits low-right; ~12% fill at hip, ~18% at ADS; wide open downrange view. | **N/A (Handgun):** Zero stock obstruction in hip or ADS. | Square rear notch with front blade post; blade tip cleanly aligns with 20m target bullseye. | **PASS:** Clean, responsive, traditional sidearm picture. |
| **02** | **Revolver (.44 Mag)** | Both hands wrapped around large spur grip; thumbs stacked forward; left wrist supporting cylinder mass. | Heavy barrel & cylinder dominate lower-right; top-strap sits low, keeping target visible. | **N/A (Handgun):** Frame terminates at grip spur; clear of view. | **POST-FIX PASS:** GP-20014 lowered idle hammer 6.3 mm under notch channel (J13); red-ramp front post frames target bullseye (J57). | **PASS:** Post-fix sights clear; no hammer obstruction. |
| **03** | **Wasp SMG (Uzi)** | Right hand on pistol grip / trigger. **J3 FLAW:** Left hand is c-gripping through the left receiver wall rather than forward on the handguard. | Boxy square receiver sits tall and forward; extended 32-rd stick mag extends downward; ~20% hip, ~28% ADS. | **FOLDED (CLEAR):** Wire stock folded flush over receiver; zero rear projection into viewport. | High-profile protective sight ears frame front blade; post tip touches 20m target center ring. | **J3 FLAG:** Left hand grip needs relocation to forward fore-end (Grokbot GB-294). |
| **04** | **GW-4 Carbine (M4)** | Right hand on pistol grip with straight trigger finger; left hand on ribbed handguard; athletic carbine posture. | Diagonal profile across lower-right quadrant; ~25% hip, ~30% ADS; optics rail sits above bore axis. | **J9 VERIFIED:** Buffer tube and stock group (`fp-stock`) cleanly hidden via `viewmodel.js:760` in ADS; zero intrusion into sight picture. | Circular rear aperture ring with F-marked front post; protective ears outline 20m target silhouette center. | **PASS:** Classic carbine sightline; J9 stock check clean. |
| **05** | **KR-7 Rifle (AK-47)** | Right hand firmly around wood grip; left hand supporting lower wood handguard; fingers wrapped under gas block. | Distinct curved 30-rd banana magazine arcs downward; heavy stamped receiver; ~28% hip, ~32% ADS. | **J9 VERIFIED:** Wood buttstock comb is part of `fp-stock` group and hidden in ADS; zero stock intrusion. | Rear tangent open notch over hooded front post; hood cleanly frames target chest. | **PASS:** Solid battle rifle presentation; clear sightline. |
| **06** | **Shotgun (870)** | Right hand on semi-pistol stock wrist; left hand grasping ribbed pump fore-end; wrist angles natural. | Long tubular receiver and barrel rib; low visual clutter (~20% hip, ~24% ADS); 75% landscape clear. | **J9 VERIFIED:** Wood buttstock hidden in ADS (`gun.stock.visible = false`); zero edge intrusion. | Ventilated receiver top rib terminating in front brass bead; bead sits on target chest. | **PASS:** Clean, open field of view down barrel rib. |
| **07** | **Breacher-12 (AA-12)** | Right hand on lower pistol grip; left hand cupping underside fore-end; fingers completely clear of drum. | Massive 20-rd drum magazine dominates lower-right; ~32% hip, ~38% ADS; tall carry handle. | **PASS:** Straight-line composite stock housing; flush chassis; zero sight obstruction. | **POST-FIX PASS:** GB-259 carry-handle aperture ring centered; hooded front post tip aligns at `y=0.168` on 20m bullseye (J20). | **PASS:** Heavy automatic shotgun reads powerful; aperture clear. |
| **08** | **Sniper Rifle** | Right hand on contoured thumbhole grip; left hand under flat benchrest fore-end. | At hip: fluted heavy barrel & optic turret (~26% fill). In ADS: Full-screen optical scope view (8x magnification simulation). | **PASS:** Optical scope overlay masks entire 3D model; zero stock in frame during ADS. | Full-screen precision mil-dot crosshair; circular black vignette ring; crosshair locked on 20m bullseye. | **PASS:** Optical scope transition and presentation functioning as designed. |
| **09** | **Grenade Launcher** | Right hand around rear pistol grip (confirms J4); left hand on ribbed forward fore-grip. | Huge 40mm cylindrical cylinder and barrel dominate lower-right (~35% hip, ~40% ADS); high screen presence. | **J2/J9 VERIFIED:** Stock clone is tucked behind camera plane (GP-20037); zero stock protrusion into viewport. | Folding leaf ladder sight; GP-20033 opened center channel; front post tip visible through 25m notch on target plate. | **PASS:** J2 and J4 verified; launcher looks formidable and unobstructed. |
| **10** | **Flamethrower** | Right hand on rear spade/trigger grip; left hand forward on insulated barrel shroud; full glove contact. | Twin fuel cylinders and burner shroud occupy lower horizontal band (~35% hip, ~40% ADS); pilot flame active. | **N/A (Bullpup):** Chassis has no shoulder stock; fuel feed line drops down. | Open notch heat bracket above nozzle; active pilot flame wand establishes forward bore line to target base. | **PASS:** Heavy industrial napalm projector appearance verified. |
| **11** | **Chainsaw** | Right hand on rear throttle trigger grip; left hand on top wrap-around handle (GB-292 J1 fix confirmed). | Long cutting guide bar and spiked bumper dogs; centered low with cutter bar angling upward (~30% hip, ~35% ADS). | **N/A (Tool):** Power tool chassis: no shoulder stock. | No iron sights; guide bar cutter line serves as point-of-aim; ADS raises cutter bar straight ahead to target center. | **POST-FIX PASS:** J1 hand positions verified; cutter bar centered. |
| **12** | **Rotary Gun (Minigun)** | Right hand on top rear spade grip; left hand on forward carry handle; poses prevent support hand clipping barrel (J61). | 6-barrel rotor cluster and drive motor fill lower-right (~40% hip, ~45% ADS); largest footprint of all weapons. | **N/A (Heavy):** Vehicle/hip weapon: no shoulder stock; rear motor assembly tucked. | Suppressive heavy weapon: no iron sights; aimed pose tightens rotor cluster axis onto target plate center. | **PASS:** Massive screen presence; barrel cluster alignment verified. |
| **13** | **Pistol Pair (Akimbo)** | Independent grip on each pistol; right hand right gun, left hand left gun; forearms rise from lower screen corners (CL-301). | Symmetrically frames lower-left and lower-right corners (~22% combined fill); wide open downrange corridor. | **N/A (Handguns):** Zero stock intrusion. | Akimbo bring-up pose; both slides angle parallel forward downrange; target plate framed between muzzles. | **PASS:** Balanced, high-mobility combat stance. |
| **14** | **Wasp Pair (Akimbo)** | Both hands on independent SMG pistol grips; left and right forearms enter from corners; fingers on triggers. | Dual boxy SMG receivers with extended sticks flank the view (~30% combined fill); high screen presence. | **FOLDED (CLEAR):** Wire stocks folded flush; zero rear intrusion. | **J11 FLAW:** Barrels canted inward sharply (`yaw = 0.40 rad` = ~23° cant); muzzles converge severely instead of aiming parallel downrange. | **J11 FLAG:** Akimbo aim angle must be straightened out (Grokbot GB-294). |
| **15** | **Revolver Pair (Akimbo)** | Strong one-handed hold on each revolver grip; symmetric presentation; wrist joints stable. | Twin .44 Magnum cylinders and heavy barrels flank lower view (~26% combined fill); impressive firepower. | **N/A (Handguns):** Zero stock intrusion. | Both front sight red ramps clearly visible; muzzles point forward along parallel tracks; target plate framed squarely between guns. | **PASS:** Clean dual magnum ready posture. |

---

## 3. Jerry Notes (J1–J16 / D-118) Status Matrix

| Jerry Note | Weapon / Area | What Jerry Said | Current Status from Pictures | Downstream Action |
|:---|:---|:---|:---|:---|
| **J1** | Chainsaw | *"left hand should be on the handle and right hand on the trigger of the chainsaw."* | **VERIFIED FIXED (GB-292):** Left hand is wrapped firmly on top handle; right hand is on rear throttle grip. | None; fix confirmed. |
| **J2** | Launcher | *"stock should appear like it is fitted against players' shoulder not sticking out in the view."* | **VERIFIED FIXED (GP-20037):** Stock is cleanly tucked behind camera plane; zero stock protrusion into viewport. | None; fix confirmed. |
| **J3** | Wasp SMG | *"left hand grip wrong. Should hold the fore end of the weapon. Not c gripping through the side like it is now."* | **ACTIVE DEFECT:** Left hand fingers visibly wrap around the left receiver wall plate instead of forward handguard. | Grokbot (GB-294): Re-anchor support socket forward onto handguard. |
| **J4** | Launcher | *"make sure that right hand is around the pistol grip."* | **VERIFIED FIXED:** Right hand fingers securely wrap around the contoured pistol grip behind the trigger guard. | None; confirmed. |
| **J9** | All Weapons | *"All weapons: in ADS the stock should not be in frame."* | **VERIFIED ACROSS ALL 15 WEAPONS:** Telemetry and visuals confirm zero buttstock meshes inside viewport during full ADS (`ads = 1.00`). `viewmodel.js:760` cleanly hides `fpStock` groups for M4, AK, Shotgun, AA-12, Launcher, and Sniper. | None; standing rule verified. |
| **J11** | Wasp Akimbo | *"The Wasp akimbo angled inward too much: redo it."* | **ACTIVE DEFECT:** Twin Wasp SMGs are canted inward at `yaw = 0.40 rad` (~23°), causing barrels to point cross-eyed toward each other. | Grokbot (GB-294): Reduce `VM.akimbo.uzi.yaw` to ~0.08–0.12 rad. |
| **J13** | Revolver | *"Sights unusable: hammer in the way on aim."* | **VERIFIED FIXED (GP-20014):** Idle hammer sits 6.3 mm below top-strap notch; front blade post visible and aligned with bullseye. | None; confirmed. |
| **J20** | Breacher-12 | *"Sights unusable and inaccurate."* | **VERIFIED FIXED (GB-259):** Carry-handle circular aperture ring cleanly frames hooded front post tip onto target at `y = 0.168`. | None; confirmed. |

---

## 4. Master Composite Contact Sheet

The complete 15-weapon before set has been generated at high resolution:
- **Repository QA Artifact:** [`qa/2026-11-07-AG-251/all-guns-fps-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-251/all-guns-fps-sheet.jpg) (3.7 MB, 1920x9030 px)
- **Review Folder Mirror:** [`review/AG-251/all-guns-fps-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/AG-251/all-guns-fps-sheet.jpg)
- **Raw Telemetry JSON:** [`qa/2026-11-07-AG-251/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-251/telemetry.json)
- **30 Individual 1080p Screenshots:** In [`qa/2026-11-07-AG-251/`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-07-AG-251/) (from `01-pistol-hip.jpg` to `15-revolver-pair-aimed.jpg`).

Task AG-251 is complete and ready for check-out.
