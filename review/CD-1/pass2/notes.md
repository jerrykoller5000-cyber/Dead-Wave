# CD-1 Pass 2 (AG-295) — First-Person Hands on 8 Weapons in 4 Lights (RTX 5080 WebGPU)

**Agent:** `antigravity` (`Gemini 4 Carbon`)  
**Task:** `AG-295` (verification for Claude 1's `CD-1` pass 2 / hand fits)  
**Date:** `2026-11-11`  
**Renderer:** `WebGPURenderer` on `NVIDIA GeForce RTX 5080` (`1280x720`)  
**Artifacts Generated:**
- `review/CD-1/pass2/sheet.jpg` (`2102x1544` — Master 8x6 matrix: 8 weapons across Noon, Overcast, Dusk, Night, Aimed Noon, Aimed Night)
- `review/CD-1/pass2/hands-detail.jpg` (`1234x1266` — Hand placement and grip geometry crops across 4 lighting/aim conditions)
- `review/CD-1/pass2/focus-checks.jpg` (`1248x736` — High-detail verification plate answering Claude 1's specific queries)
- `review/CD-1/pass2/capture-manifest.json` (Manifest of all 48 screenshots with metadata and sight alignment data)
- Full mirrored copies in `qa/2026-11-11-CD-1-pass2/`

---

## Answers to Claude 1's Specific Queries

### 1. Launcher: Firing hand around its grip
- **Status:** **VERIFIED CLEAN.**
- **Before (Pass 1):** Hand was embedded 17.7 mm into the receiver body with the palm rotated the wrong direction due to arm twist.
- **After (Pass 2):** The launcher's firing hand now securely wraps around the downward pistol grip. The palm and heel of the hand sit completely outside the receiver body (0 mm penetration).
- **GPU Visuals:** Knuckles and curled fingers are distinctly visible below the receiver block at hip. In Aimed ADS, the grip and hand remain stably positioned underneath without interfering with the leaf sight or barrel line.

### 2. Two-Hand Holds on Pistol and Revolver
- **Pistol (Issue Sidearm):**
  - **Status:** **VERIFIED CLEAN.**
  - **Details:** Inter-hand overlap reduced from 23.8 mm down to 0.1 mm. The support hand forms a natural cup around the bottom and front strap of the firing hand in a realistic two-handed grip.
  - **Trigger & Guard:** Middle finger is cleanly positioned below the trigger guard. The index finger rests extended straight along the frame outside the trigger guard, ready for Claude 5's trigger solve.
- **Revolver (.44 Magnum):**
  - **Status:** **VERIFIED CLEAN.**
  - **Details:** Inter-hand overlap reduced from 9.1 mm down to 1.1 mm. The firing hand is positioned high under the spur, and the support hand wraps underneath and forward.
  - **Trigger Reach:** Index pad is positioned ~10 mm from the trigger face (was 29 mm in pass 1).
  - **Visuals:** On the RTX 5080 WebGPU render, the 1.1 mm overlap produces zero visual tearing or unnatural surface intersection; both gloves blend smoothly into a cohesive two-hand hold.

### 3. Chainsaw: Rear grip & glove give
- **Status:** **VERIFIED CLEAN.**
- **Details:** Rear firing hand is completely out of the rubber grip block (was 20.9 mm deep in pass 1).
- **Glove Give / Dent Inspection:** The ring finger's 3.3 mm press into the grip is completely absorbed by the glove's give. High-resolution zoom inspection (`focus-checks.jpg` Panel 4) confirms there is **no visible dent, crease, or surface tearing** on the exterior glove mesh.
- **Support Hand:** Left hand securely maintains the motorcycle grip palm-down over the top handle bar, with the chainsaw bar and teeth angled clearly across the view.

### 4. Pump Shotgun Aimed: Is the bead clear of the support glove?
- **Status:** **VERIFIED CLEAN & UNOBSTRUCTED.**
- **Before (Pass 1):** Support glove top edge extended to y = 345 px, blocking the front bead sight at y = 362 px.
- **After (Pass 2):** Pixel analysis on `shotgun-aimed-noon.png` confirms the bead sight peak is at y = 362..363 px (RGB `248, 195, 108`). The support hand and pump slide top edge sit at y = 366 px and lower.
- **Visuals:** Down the rib, the gold/brass bead sight stands completely clear against the background target dummy with zero glove geometry in the sight picture.

---

## Observations on Revised Weapons

### 5. GW-4 Carbine (`m4`)
- **Grip & Handguard:** The revised handguard (thumb 14 mm and support 8 mm overlaps fixed) displays clean finger curl around the bottom rail.
- **Trigger Reach:** Index pad rests 0.5 mm from the trigger face.
- **ADS:** Sights center cleanly through the optic window.

### 6. KR-7 Rifle (`ak`)
- **Fore-end Hold:** Clean wood fore-end grip.
- **Trigger Reach:** Index pad rests 0.4 mm from the trigger face; middle finger out of guard.
- **ADS:** Iron sights center directly on target.

### 7. Marksman Sniper Rifle (`sniper`)
- **Forend:** Sleek hold with proper finger curl.
- **Trigger Reach:** Index pad within 5 mm of trigger face.
- **ADS:** Viewmodel root correctly hides at full ADS (`fp.ads = 1.0`), cleanly transitioning to the full scope mask.

---

## Summary Matrix

| Weapon | Key | Hip Wrap Check | ADS Center Check | Trigger / Finger Reach | Specific Pass 2 Checks |
|---|---|---|---|---|---|
| Pistol | `pistol` | Two-hand cup clean | Centered (ndc 0) | Middle finger out of guard; index along frame | 0.1 mm inter-hand overlap clean |
| Revolver | `revolver` | Two-hand hold clean | Centered (ndc 0) | Under spur; index pad 10 mm from face | 1.1 mm overlap invisible; zero tearing |
| Launcher | `launcher` | Firing hand on grip | Centered (ndc 0) | Clean trigger wrap | Palm out of receiver (was 17.7 mm deep) |
| Shotgun | `shotgun` | Pump slide wrapped | Centered (ndc 0) | Middle finger clear of guard | Bead clear (y=362 vs glove y=366) |
| Chainsaw | `chainsaw` | Motorcycle grip top | Raised & centered | Rear hand out of rubber block | No visible dent from ring finger give |
| GW-4 | `m4` | Handguard wrap clean | Centered (ndc 0) | Index pad 0.5 mm from trigger | Revised thumb & support clean |
| KR-7 | `ak` | Fore-end wrap clean | Centered (ndc 0) | Index pad 0.4 mm from trigger | Clean grip & sights |
| Sniper | `sniper` | Fore-end wrap clean | Scope active | Index pad 5 mm from trigger | Viewmodel hides at scope |
