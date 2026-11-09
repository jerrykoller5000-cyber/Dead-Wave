# Antigravity — AG-263 CL-322 heavies post-integration review on RTX 5080 — 2026-11-08

Changed: Independently audited Claude's CL-322 heavies integration (patch322g/h/i) on Jerry's RTX 5080 WebGPU hardware:
  (1) Rotary Gun (minigun): Scaled support socket [-0.2128, 0.0084, 0.112] placing left glove squarely on the side peg (offset delta 0.0 mm vs 103.2 mm miss in AG-261); FP ADS reflex dot centering; TP held grip [0, -0.0119, -0.364] & peg fore [-0.2128, 0.0084, 0.112]; TP unscaled 1.040 m carry.
  (2) Chainsaw (chainsaw): FP hip pitch 0.58 rad with 0.971 m bar raised above forearm; FP ADS sightless pose `VM.chainsaw.ads.pose` ([0.08, -0.17, -0.55], pitch 0.95, roll 0.1) centering guide bar & cutting teeth up the middle of the view (J60) with 0 engine cowl occlusion (resolved AG-261 100% occlusion); TP dual handle contact alignment; TP slung backpack carry sized at `WEAPON_SIZE.chainsaw` (len 1.425, look 1.24, factor 0.6801) holding true 0.971 m held length (resolved AG-261 0.531 m miniature shrink).
  (3) M32A1 Launcher (launcher): Live WebGPU 5-phase drum-open reload sequence on narrowed 0.156 m drum: cylinder swing open with palm cupping drum underside at y = -0.122 m (drumOut); grenade 1 & 2 insertions with palm at chamber mouth y = -0.105 m, z = -0.145 m (load); winder key contact at drum axle (wind); and battery latch lock (fore).
Files: `tools/ag-review-cl322-heavies.mjs`, `qa/AG-263/*`, `qa/AG-263/cl322-heavies-sheet.jpg`, `qa/AG-263/metrics.json`.
Tests: Executed `tools/ag-review-cl322-heavies.mjs` through shared slot `node crew/crew.mjs slot run antigravity AG-263 ...` → exit code 0, 0 WebGPU page errors, 0 Three.js exceptions.
Screenshots: Master 16-panel contact sheet `qa/AG-263/cl322-heavies-sheet.jpg`; Minigun views `qa/AG-263/{minigun-fp-hip,minigun-fp-ads,minigun-tp-held,minigun-tp-hands,minigun-tp-carried}.png`; Chainsaw views `qa/AG-263/{chainsaw-fp-hip,chainsaw-fp-ads,chainsaw-tp-held,chainsaw-tp-hands,chainsaw-tp-carried}.png`; Launcher drum reload sequence `qa/AG-263/{launcher-reload-swing,launcher-reload-insert1,launcher-reload-insert2,launcher-reload-wind,launcher-reload-close}.png`.
Not verified: Full suite `npm test` left to committer per Rule 7/8.
Requests: Answered Claude's CL-322 heavies request with DONE; confirmed all three items (rotary gun peg contacts, chainsaw ADS pose & pack carry, launcher reload contacts) are 100% verified and approved.
Contract changes: none.
Family: heavy/specialist weapons. Scores (0-5): Rotary Gun 5/5/5 (LH float fully resolved); Chainsaw 5/5/5 (ADS blade framing & pack size fully resolved); Launcher 5/5/5 (narrowed drum reload contacts clean).
Rule 16: Review ran through the shared game-test slot under single-instance WebGPU allocation on Jerry's PC.

---

### Detailed Verification Findings

#### 1. Rotary Gun (`minigun`)
- **First-Person Hip View**:
  - `VM_SOCKETS.minigun.support` updated to `[-0.2128, 0.0084, 0.112]`.
  - Side peg anchor is at `[-0.2128, 0.0084, 0.112]`.
  - Offset delta between left glove socket and side peg is **0.0 mm** (eliminating the previous 103.2 mm float into thin air found in AG-261).
  - Rear firing hand tang contact firmly planted at `[0, -0.0119, -0.364]`.
  - View offset shifted 4 cm up and 2 cm forward (`at: [0.215, -0.395, -0.43]`), centering the barrel cluster cleanly in the viewport.
- **First-Person ADS View**:
  - Aim sightline down `SIGHT.minigun` (0.231 @ 0.0249) centers the reflex dot. Support glove maintains solid wrap around side peg during zoom.
- **Third-Person Held & Carried**:
  - Stance twist is 1.0 rad. Right hand holds rear grip `[0, -0.0119, -0.364]`; left hand wraps side peg `[-0.2128, 0.0084, 0.112]`.
  - Close-up inspection (`qa/AG-263/minigun-tp-hands.png`) confirms natural hand-grip closure on both points.
  - Carried slung gear on back maintains 1.040 m scale without soil clipping or body interpenetration.

#### 2. Chainsaw (`chainsaw`)
- **First-Person Hip View**:
  - `VM_POSES.chainsaw.hip` pitch tuned from 0.45 to 0.58 rad (`yaw: 0.25, pitch: 0.58, roll: 0.4`).
  - Shorter 0.971 m guide bar points up and forward, extending cleanly above the left forearm.
  - Both rear throttle and top hoop handles are visible and firmly gripped.
- **First-Person ADS View (Raised Sightless Pose)**:
  - In AG-261, the guide bar was 100% occluded behind the bulky engine cowl.
  - Claude implemented `VM.chainsaw.ads.pose: { at: [0.08, -0.17, -0.55], yaw: 0, pitch: 0.95, roll: 0.1 }`.
  - Verified: The saw raises into a centered combat posture, bringing the shortened guide bar and cutting chain directly up the middle of the screen per Jerry's J60 guideline. Zero engine cowl occlusion; full visual tracking of teeth and guide tip.
- **Third-Person Held & Pack Carry**:
  - Dual handle grip contacts aligned on rear throttle grip `[0, -0.014, -0.46]` and front wrap bar `[-0.01, 0.246, -0.035]`.
  - In AG-261, stale `WEAPON_SIZE.chainsaw.len: 1.715` shrank the slung saw down to 0.531 m on the pack.
  - In CL-322, `WEAPON_SIZE.chainsaw` is `{ len: 1.425, m: 0.85, look: 1.24 }`. Size factor computes to $0.6801$.
  - Verified: Carried saw on the backpack holds true 0.971 m proportions matching the held model (`qa/AG-263/chainsaw-tp-carried.png`), clearing the vest, bedroll, and terrain cleanly.

#### 3. M32A1 Revolver Launcher (`launcher`)
- **Drum Reload Sequence Contacts on Narrowed Drum**:
  - Drum radius narrowed from 0.14 m to 0.112 m, chamber orbit narrowed from 0.075 m to 0.065 m.
  - Phase 1 (`u = 0.18`, `handPlace: "drumOut"`): Support palm cups the swung drum underside at $y = -0.122$ m with generous 18 mm frame clearance.
  - Phase 2 (`u = 0.44`, `handPlace: "load"`): Support pinch inserts first 40 mm round into bottom chamber; palm contacts drum back face at $y = -0.105$ m, $z = -0.145$ m, directly aligned with narrowed 0.065 m orbit chamber mouth.
  - Phase 3 (`u = 0.61`, `handPlace: "load"`): Second 40 mm round pushed home into next chamber; palm alignment maintained.
  - Phase 4 (`u = 0.83`, `handPlace: "wind"`): Support fingers grip rear winder key on cylinder axle.
  - Phase 5 (`u = 0.96`, `handPlace: "fore"`): Cylinder latches shut into battery (`drumHinge.rotation.z` returns to 0); support hand returns smoothly to vertical foregrip.
- Zero mesh clipping, zero glove interpenetration into drum cylinder, natural ergonomic flow.

---

### Master 16-Panel Composite Sheet
All captures composited into high-resolution contact sheet `qa/AG-263/cl322-heavies-sheet.jpg`:
- **Row 1**: Minigun FP Hip (offset 0.0 mm), FP ADS (reflex dot), TP Held (high-low stance), TP Slung (1.040 m).
- **Row 2**: Chainsaw FP Hip (pitch 0.58 rad), FP ADS (raised pose, bar up middle), TP Held (dual grips), TP Pack Carry (0.971 m).
- **Row 3**: Launcher Drum Reload: Swing Open (y = -0.122 m), Round 1 Insert (y = -0.105 m), Round 2 Insert, Drum Winder Contact.
- **Row 4**: Details: Minigun TP Hands Close-up, Chainsaw TP Handles Close-up, Launcher Battery Lock, Chainsaw Pack Stowed Detail.

### Verdict
All three items requested by Claude for CL-322 heavies post-integration are **100% VERIFIED AND APPROVED**.
