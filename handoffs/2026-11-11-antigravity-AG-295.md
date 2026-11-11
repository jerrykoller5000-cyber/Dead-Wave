# Handoff: AG-295 — CD-1 Pass 2 Hand Fits in 4 Lights across 8 Guns (RTX 5080 WebGPU)

- **Agent:** Antigravity (Gemini 4 Carbon)
- **Date:** 2026-11-11
- **Status:** DONE

## Changed:
- `tools/ag295-capture.mjs`: Automated capture tool for 8 weapons in first person across 4 lights + ADS on RTX 5080 WebGPU (1280x720).
- `tools/build-ag295-sheets.py`: Composite sheet generator for `sheet.jpg` (master 8x6 matrix), `hands-detail.jpg` (hand placement & grip detail crops), and `focus-checks.jpg` (dedicated plate answering Claude 1's specific queries).
- `tools/ag295-slot-batch.mjs`: Slot batch runner for sequential capture and PIL composite sheet generation.
- `review/CD-1/pass2/` & `qa/2026-11-11-CD-1-pass2/`: 48 WebGPU screenshots (1280x720), `sheet.jpg` (2102x1544), `hands-detail.jpg` (1234x1266), `focus-checks.jpg` (1248x736), `capture-manifest.json`, and `notes.md`.

## Tests:
- `tools/ag295-slot-batch.mjs`: Ran under shared game-test slot (exit code 0).
- Automated capture of 48/48 hash-unique 1280x720 PNGs on NVIDIA GeForce RTX 5080 WebGPU across 8 guns x 6 light/ADS conditions (exit code 0).
- Sight settling checks verified ADS alignment (`ndcX == 0` for pistol, revolver, launcher, shotgun, m4, ak; centered raised bar for chainsaw; `scopeActive == true` for sniper).
- Python PIL composite generator: `sheet.jpg`, `hands-detail.jpg`, and `focus-checks.jpg` generated with exit code 0.
- Multimodal visual inspection: Verified all 8 weapons across all 6 lighting and ADS columns.

## Visuals Verified (Claude 1 Pass 2 Queries):
1. **Launcher Firing Grip:** Firing hand cleanly wraps around the downward pistol grip; palm and heel of hand sit completely outside the receiver body (0 mm penetration, was 17.7 mm deep in pass 1).
2. **Two-Hand Holds on Pistol & Revolver:**
   - **Pistol:** Two-hand hold overlap resolved down to 0.1 mm (was 23.8 mm). Support hand cleanly cradles firing hand; middle finger clear of guard; index finger along frame outside guard.
   - **Revolver:** Overlap resolved to 1.1 mm (was 9.1 mm); hand seated high under spur; index pad ~10 mm from trigger face (was 29 mm). Zero visible tearing between gloves.
3. **Chainsaw Rear Grip & Glove Give:** Rear hand is completely out of the rubber grip block (was 20.9 mm deep). High-resolution zoom inspection confirms the ring finger's 3.3 mm press produces no visible dent, crease, or surface defect on the glove exterior. Top motorcycle grip remains clean.
4. **Pump Shotgun Aimed Bead Clearance:** Front brass/gold bead sight at y=362..363 px (center x=640 px) is completely clear and unobstructed above the support glove (top edge at y=366 px; was y=345 px occluding the bead in pass 1).
5. **GW-4 (M4) & KR-7 (AK) Reach:**
   - GW-4: Revised thumb (14 mm) and support (8 mm) handguard wraps clean; index pad 0.5 mm from trigger face.
   - KR-7: Support fore-end wrap clean; index pad 0.4 mm from trigger face.
6. **Sniper:** Sleek forend grip; index pad 5 mm from trigger face; viewmodel hides cleanly under full-screen optic at ADS 1.0.

## Not verified:
- Claude 5's VM_TRIGGER live trigger press animation solve on these refitted firing hands (requested from Claude 5 in `handoffs/requests.md`).
- Breacher and pump shotgun trigger reach improvement (kept per Claude 1 CD-1 handoff).
