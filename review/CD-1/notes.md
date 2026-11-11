# CD-1 (AG-286) — First-Person Hands on 9 Weapons in 4 Lights (RTX 5080 WebGPU)

**Agent:** `antigravity` (`Gemini 4 Carbon`)  
**Task:** `AG-286` (verification for Claude 1's `CD-1` / `CL-334`)  
**Date:** `2026-11-10`  
**Renderer:** `WebGPURenderer` on `NVIDIA GeForce RTX 5080` (`1280x720`)  
**Sheets:**
- `review/CD-1/sheet.jpg` (`2102x1730` — Master 9x6 matrix: 9 weapons across Noon, Overcast, Dusk, Night, Aimed Noon, Aimed Night)
- `review/CD-1/hands-detail.jpg` (`1234x1418` — Zoomed handguard wrap & grip finger detail crops across 9 weapons)

---

## Redo & Verification Protocol

1. **Clean View & Menu State:**
   - Script triggers `#modeTraining` button click and waits for `TT.trainingDbg.state().active === true` and blackout overlay clearance.
   - All DOM HUDs, menus (`#menu`, `#title`), crosshairs, and banners are stripped via injected CSS: `body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important} #menu,#title,#hud,#crosshair{display:none!important;visibility:hidden!important}`.
   - Script enforces assertion checks before *every* shot:
     - `menu` element is strictly hidden / non-rendered (`offsetParent === null` or `visibility: hidden`).
     - `TT.viewmodelDbg().info.active === true`.
     - `TT.viewmodelDbg().info.key === gunKey`.
     - `TT.viewmodelDbg().root.visible === true` (except for sniper ADS where `game/viewmodel.js:958` deliberately replaces viewmodel with full-screen scope mask at `>= 0.82` ADS).
   - Confirmed 0 title menu captures; every frame shows the actual rendered viewmodel hands, gloves, and weapons in the Training Ground.

---

## Visual Observations Across 9 Weapons

### 1. GW-4 Carbine (`m4`)
- **Support Hand Wrap:** Left hand securely wraps the underside of the ribbed handguard with fingers curled cleanly around the lower rail. Marked visual improvement over the flat cradle.
- **Thumb Position:** Left thumb extends forward along the left side of the handguard below the top rail.
- **Lighting & Details:** In Noon and Overcast, glove folds and individual finger pads are distinct. In Dusk, warm directional light creates defined rim highlights on the knuckles. Night renders show clean silhouette with tactical laser/light module fitted.
- **ADS:** Sights align cleanly down the bore; support hand remains positioned below the sightline.

### 2. KR-7 Rifle (`ak`)
- **Support Hand Wrap:** Left hand fingers curl tightly around the wooden lower handguard.
- **Grip & Receiver:** Firing hand firmly holds the pistol grip with index finger seated in the trigger guard.
- **Lights:** Hand textures and wood grain interact realistically across all 4 lighting conditions.

### 3. Pump-Action Shotgun (`shotgun`)
- **Pump Wrap:** Support hand wraps around the ribbed pump slide, thumb resting along the left side.
- **ADS:** Down the sights, the bead sight is clear and the support arm geometry remains naturally positioned below.

### 4. Marksman Sniper Rifle (`sniper`)
- **Forend Hold:** Support hand wraps the sleek sniper forend with realistic finger curl.
- **Clearance:** Zero visual clipping through the barrel or receiver top.

### 5. AA-12 Combat Shotgun (`aa12`)
- **Bulky Handguard Grip:** Wide support hand wrap accommodates the AA-12's boxy forend without stretching.
- **Clearance:** Drum magazine clears both wrists and arms.

### 6. Uzi Submachine Gun (`uzi`)
- **Support Hand Forward:** Support hand firmly grasps the front of the receiver shroud forward of the trigger guard.
- **Laser-Light Unit:** Tactical unit fits cleanly on the forward rail without interfering with the support hand grip.

### 7. Microgun / Minigun (`minigun`)
- **Rear Grip:** Firing hand wraps cleanly around the rear handle/spade grip, knuckles aligned.
- **Support Carry:** Forward top carrying handle is gripped securely.

### 8. Issue Sidearm Pistol (`pistol`)
- **Firing Grip:** Right hand wraps the checkered pistol grip, thumb along the slide.
- **Two-Hand Hold:** Support hand cradles and wraps the base of the firing hand. (Matches Claude 1's CD-1 handoff note: 23.8 mm two-hand overlap is known and scheduled for the two-hand hold pass).
- **Tactical Unit:** Underside tactical laser/light module fitted cleanly under dust cover.

### 9. .44 Magnum Revolver (`revolver`)
- **Revolver Hold:** Firing hand firmly grips the textured wood/rubber handle, hammer accessible.
- **Two-Hand Hold:** Support hand cupped underneath. (Matches Claude 1's CD-1 note: 9.1 mm overlap known).

---

## Summary Table

| Weapon | Key | Laser Fitted | Support Hand Wrap | Firing Grip | 4-Light Check | ADS Check |
|---|---|---|---|---|---|---|
| Uzi | `uzi` | Yes | Wraps front shroud | Clean | Verified | Verified |
| GW-4 Carbine | `m4` | Yes | Wraps handguard | Clean | Verified | Verified |
| KR-7 Rifle | `ak` | No | Wraps fore-end | Clean | Verified | Verified |
| Shotgun | `shotgun` | No | Wraps pump slide | Clean | Verified | Verified |
| Sniper | `sniper` | No | Wraps fore-end | Clean | Verified | Verified |
| AA-12 | `aa12` | No | Wraps wide fore-end | Clean | Verified | Verified |
| Minigun | `minigun` | No | Top carry handle | Rear grip wrapped | Verified | Verified |
| Pistol | `pistol` | Yes | Cupped two-hand | Checkered grip | Verified | Verified |
| Revolver | `revolver` | No | Cupped two-hand | Revolver grip | Verified | Verified |

- **Total Screenshots:** 54 PNGs (`1280x720`, WebGPU RTX 5080)
- **Sheets:** `review/CD-1/sheet.jpg` and `review/CD-1/hands-detail.jpg`
