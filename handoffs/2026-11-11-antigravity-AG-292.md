# antigravity — AG-292 J128 (D-140): Training Ground props seating on RTX 5080 — 2026-11-11

Changed: Audited every prop in owned files across all five Training Ground areas (the range, the Armory room, the CIF, the corridors, the yard), eliminating all floating gaps and wall/floor penetrations down to 0.0000m (under 0.5 mm tolerance). Fixed locker base seating, wall vents, conduit wall brackets, firing line kick rail, and back-wall weapon rack rails.
Files:
  world/training-wear.js
  world/training-firing-line.js
  tools/tests/tag292.js
  tools/ag292-props-sweep.mjs
  tools/ag292-capture.mjs
  tools/build-ag292-sheet.py
Tests: node tools/realtest.mjs tag292 → 45 pass, 0 fail (real WebGPU renderer on NVIDIA GeForce RTX 5080); dynamic contact audit node tools/ag292-props-sweep.mjs → 0 findings across all 5 areas.
Screenshots:
  review/AG-292/before-after-props.jpg (4 matched same-camera Before/After pairs at the eye on RTX 5080)
  review/AG-292/sheet.jpg (Master review sheet: 12 prop seating plates across Range, Armory, CIF, Corridors, and Yard)
  review/AG-292/before-01-range-lockers.png
  review/AG-292/after-01-range-lockers.png
  review/AG-292/before-02-range-vents.png
  review/AG-292/after-02-range-vents.png
  review/AG-292/before-03-range-conduits.png
  review/AG-292/after-03-range-conduits.png
  review/AG-292/before-04-range-firingline.png
  review/AG-292/after-04-range-firingline.png
  review/AG-292/01-range-lockers-floor.png
  review/AG-292/02-range-vents-wall.png
  review/AG-292/03-range-conduits-bracket.png
  review/AG-292/04-range-firingline-base.png
  review/AG-292/05-armory-rack-wall.png
  review/AG-292/06-armory-station-counter.png
  review/AG-292/07-cif-station-counter.png
  review/AG-292/08-corridors-doorway-keypad.png
  review/AG-292/09-yard-containment-gate.png
  review/AG-292/10-yard-infirmary-stretcher.png
  review/AG-292/11-yard-infirmary-cabinet.png
  review/AG-292/12-yard-hangar-columns.png
Not verified: Claude 2's CB-292 covers index.html and core/*; ChatGPT's GP-20085 makes its stations solid.
Requests: none
Contract changes: none

### Area-by-Area Props Seating Audit Summary (J128 / D-140)
1. **The Range:**
   - Locker bank base: Lowered center y from 0.93m to 0.925m (h=1.85m), base minY seated flush on floor tiles at y=0.0000m (was floating 5.0mm).
   - Wall vent frames: Adjusted center x offset from 0.03m to 0.025m (w=0.05m), back face seated flush on east and west wall tiles at x=±7.975m (was floating 5.0mm).
   - Conduit wall brackets: Extended base mounting plate geometry to span flush from wall faces (x=±7.9925m, 0.0mm gap) and clamp conduit pipes firmly (was floating 35.0mm).
   - Firing line bench kick rail: Adjusted height to 0.090m and center y to 0.045m, bottom edge seated flush on floor tiles at y=0.0000m (was floating 17.5mm).
2. **The Armory Room:**
   - Weapon rack rails: Adjusted center z offset from BZ + 0.03m to BZ + 0.02m (depth 0.04m), seating rear face flush against back wall BZ at z=-12.0000m (was floating 10.0mm).
   - Incident whiteboard: Set center z offset to BZ + 0.015m (depth 0.03m), seating rear face flush against back wall BZ at z=-12.0000m (was floating 5.0mm).
   - Armory counter station: Solid counter, floor kickboard, and wall brackets verified flush.
3. **The CIF (Central Issue Facility):**
   - CIF counter & issue grille: Counter unit and approach floor mat verified seated flush at y=0.0000m.
4. **The Corridors:**
   - Security doorway: Steel frame, hazard stripe trim posts, and overhead roll-up shutter housing verified seated flush on floor and wall.
   - Keypad: Mounted flush to doorway jamb (0.0mm gap).
5. **The Yard (Build Room / Hangar):**
   - Containment gate threshold plate & hazard nosing: Seated flush on concrete floor at y=0.0000m.
   - Field infirmary floor mat: Base mat seated flush at y=0.0000m (thickness 0.020m).
   - Medical furniture: Wheeled stretcher (4 casters), steel cabinet (4 legs), oxygen bottle, and IV stand all seated flush on mat at y=0.0200m.
   - Hangar columns: Steel base footplates seated flush on floor at y=0.0000m.
