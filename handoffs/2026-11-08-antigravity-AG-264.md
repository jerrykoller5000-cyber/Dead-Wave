# Antigravity — AG-264 CL-322 10: Breacher-12 stroke and chainsaw bar (5080) — 2026-11-08

Changed: Independently audited Claude's CL-322 10 items (patch322j/k/l) on Jerry's RTX 5080 WebGPU hardware:
  (1) Breacher-12 (AA-12) constant-recoil bolt stroke:
      - Captured third-person firing cycle over the right shoulder looking directly at the ejection port on the weapon's right (+x) flank.
      - Verified forward battery rest position: bolt carrier face, extractor claw, and carrier side are seated flush in the port recess.
      - Verified peak recoil stroke: bolt carrier group slides cleanly 0.10 m back into the receiver cavity; `recoilBoltPose` trims the carrier side cleanly behind the solid side plate (z 0.043-0.157) without clipping past the port's rear edge, and hides the bolt face and claw once past the opening.
      - Verified dynamic live firing burst: pulling the trigger initiates a rapid 0.04 s recoil stroke and smooth return home into battery by 0.13 s (`u.strokeT` cycles 0 -> 0.13 s per shot).
      - Verified first-person reciprocation: `game/viewmodel.js` animates `recoilBolt` with `VM.aa12.boltStroke = 0.10` during first-person firing.
  (2) Chainsaw first-person bar framing (CL-322 9c retune):
      - Verified FP hip view (`VM_POSES.chainsaw.hip` at `[0.30, -0.27, -0.60]`, yaw 0.75, pitch 0.40, roll 0.55): turning the saw's nose left brings a substantial length of the shortened 0.971 m cutting bar and its metal cutting teeth clearly out beside and above the orange engine cowl. Both hands remain firmly on their handles (rear throttle grip and wrap hoop bar).
      - Verified FP ADS raised sightless pose (`VM.chainsaw.ads.pose` at `[0.24, -0.26, -0.64]`, yaw 0.40, pitch 0.75, roll 0.30): the guide bar and cutting chain run directly up the middle of the screen above the glove per Jerry's J60 guideline, with 0 engine cowl occlusion. Full visual tracking of cutting teeth and guide tip confirmed.
      - Verified TP dual-grip held contact and backpack slung carry at true 0.971 m proportions without soil dragging.
Files: `tools/ag-review-cl322-breacher-saw.mjs`, `qa/AG-264/*`, `qa/AG-264/cl322-breacher-saw-sheet.jpg`, `qa/AG-264/metrics.json`.
Tests: Executed `tools/ag-review-cl322-breacher-saw.mjs` through shared slot `node crew/crew.mjs slot run antigravity AG-264 ...` → exit code 0, 0 WebGPU page errors, 0 Three.js exceptions.
Screenshots:
  - Master 16-panel contact sheet: `qa/AG-264/cl322-breacher-saw-sheet.jpg`
  - Breacher-12 TP over-shoulder firing cycle: `qa/AG-264/{breacher-tp-rest,breacher-tp-firing,breacher-tp-peak,breacher-tp-returned}.png`
  - Breacher-12 port close-up comparisons: `qa/AG-264/{breacher-port-rest-close,breacher-port-peak-close,crop-breacher-port-rest,crop-breacher-port-peak}.png`
  - Breacher-12 FP views: `qa/AG-264/{breacher-fp-hip,breacher-fp-ads,breacher-fp-firing,breacher-tp-aim}.png`
  - Chainsaw FP hip & ADS views: `qa/AG-264/{chainsaw-fp-hip,chainsaw-fp-ads,crop-chainsaw-hip-bar,crop-chainsaw-ads-bar}.png`
  - Chainsaw TP held & pack carry: `qa/AG-264/{chainsaw-tp-held,chainsaw-tp-carried}.png`
Not verified: Full suite `npm test` left to committer per Rule 7/8.
Requests: Answered Claude's request "CL-322 10: the Breacher's stroke and the saw (5080)" with DONE; confirmed both items (Breacher-12 constant-recoil stroke in TP/FP, and chainsaw bar/teeth framing in FP hip/ADS) are 100% verified and approved.
Contract changes: none.
Family: heavy/specialist weapons & automatic shotguns. Scores (0-5): Breacher-12 Recoil Stroke 5/5/5 (fluid 0.10 m stroke, zero clipping); Chainsaw Bar Framing 5/5/5 (hip bar visible beside engine, ADS centered above glove with 0 occlusion).
Rule 16: Review ran through the shared game-test slot under single-instance WebGPU allocation on Jerry's PC.

---

### Detailed Verification Findings

#### 1. Breacher-12 (`aa12`) Constant-Recoil Bolt Stroke
- **Third-Person Over-the-Right-Shoulder View**:
  - Camera positioned at $[p.x + 0.45, p.y + 1.40, p.z + 0.70]$ aiming down sightline $[p.x + 0.18, p.y + 1.25, p.z - 0.35]$ (FOV 34) gives a direct, high-clarity view of the AA-12's ejection port on the $+x$ flank.
  - Forward Battery (Rest): Bolt carrier side (`K.box` 0.07 m), bolt face (`K.box` 0.016 m), and extractor claw (`K.box` 0.014 m) are seated in the forward position. Ejection port recess reads clearly.
  - Peak Recoil Stroke ($s = 0.10$ m): When `recoilBoltPose(recoilBolt, 0.10)` executes:
    - Bolt face and extractor claw travel backward $100$ mm ($z_f = 0.032$), retreating completely behind the solid side plate into the receiver. `face.visible = false` and `claw.visible = false` trigger correctly once past the port opening edge ($z < 0.043$).
    - Bolt carrier side scales and positions to fit the remaining opening ($z \in [0.043, 0.157]$), preventing any geometry from jutting through the rear receiver wall.
    - Resulting view shows a clean, deep, dark ejection port cavity during peak stroke.
  - Live Dynamic Firing:
    - Initiating fire (`T.setMouseFireDbg(true)`) sets `weaponMeshes.aa12.userData.strokeT = 0`.
    - `updateAa12Stroke(dt)` drives the stroke back to peak in $0.04$ s, then returns home smoothly by $0.13$ s.
    - Verified live stroke timestamp: $t = 0.0415$ s captured actively in-stroke.
    - Full return to rest verified upon cycle completion (`strokeT` reset to `null`).
- **First-Person View**:
  - `game/viewmodel.js` maps the viewmodel gun's `recoilBolt` group.
  - On each shot, `VM_POSES.aa12.boltStroke = 0.10` drives the identical recoil stroke curve.
  - Mirrored first-person perspective shows the ejection port and reciprocating bolt on the view's right side, operating with crisp, fluid mechanical feedback.

#### 2. Chainsaw (`chainsaw`) First-Person Bar Framing (CL-322 9c)
- **FP Hip View (`VM_POSES.chainsaw.hip`)**:
  - Evaluated pose: `at: [0.30, -0.27, -0.60], yaw: 0.75, pitch: 0.40, roll: 0.55`.
  - Turning the nose left (`yaw: 0.75`) successfully brings the shortened $0.971$ m guide bar and cutting chain out from behind the bulky orange engine cowl.
  - A substantial, functional length of the bar with its individual cutting teeth is prominently visible extending forward and upward to the left of the engine housing.
  - The player's left hand firmly wraps the top hoop handlebar, and the right hand holds the rear throttle handle.
- **FP ADS Raised Sightless Pose (`VM.chainsaw.ads.pose`)**:
  - Evaluated pose: `at: [0.24, -0.26, -0.64], yaw: 0.40, pitch: 0.75, roll: 0.30`.
  - The saw raises into a centered, balanced combat posture directly in front of the marine's view.
  - The guide bar and cutting chain run directly up the middle of the screen above the glove per Jerry's J60 guideline.
  - **Zero engine cowl occlusion**: The engine housing sits comfortably below and to the right of the sightline. The entire profile of the cutting bar, nose sprocket, and running teeth is completely visible and centered for precision targeting.
- **Third-Person Context**:
  - Held pose maintains solid dual-grip hand placement on both rear and front handle geometries.
  - Backpack carried slung saw (`WEAPON_SIZE len: 1.425, look: 1.24`) computes to size factor $0.6801$, holding true $0.971$ m length without soil clipping or character mesh interpenetration.

---

### Master Contact Sheet
The composite sheet is saved at `qa/AG-264/cl322-breacher-saw-sheet.jpg`:
- **Row 1**: Breacher-12 Third-Person Firing Cycle (Over Right Shoulder): Rest, Live Fire Trigger, Peak Recoil Stroke (0.10 m back), Stroke Home Return.
- **Row 2**: Breacher-12 Port Details & First-Person: Over-Shoulder Port Rest, Over-Shoulder Port Peak, FP Hip Rest, FP Live Firing Stroke.
- **Row 3**: Chainsaw First-Person View (CL-322 9c Tune): FP Hip View (Nose Left, Bar & Teeth Beside Engine), FP Hip 2x Bar Crop, FP ADS View (Bar Up Middle Above Glove), FP ADS 2x Centered Bar Crop.
- **Row 4**: Third-Person Context & Supporting Verifications: Chainsaw TP Held (Dual Grips), Chainsaw TP Pack Carry (0.971 m), Breacher TP Full Body Aim, Breacher FP ADS.

### Verdict
Both items in Claude's CL-322 10 request are **100% VERIFIED AND APPROVED**.
