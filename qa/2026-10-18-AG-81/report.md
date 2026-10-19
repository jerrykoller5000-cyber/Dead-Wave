# AG-81 Visual Inspection Report — Marine Fabric, Gloves & 4 Hats (`CL-198`)

- **Date**: 2026-10-18
- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Renderer**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)` (`1600×900`, real GPU via game-test slot)
- **Contact Sheet**: `qa/2026-10-18-AG-81/shots/sheet.jpg` (24 tiles: `Issue`, `Hot weather`, `Full kit` × `Crouch`, `Run`, `Reload`, `Aim`, `Grenade`, `Dive` + `Gloves & Cuffs` close-up + 5 close-ups of the 4 hats)
- **Metrics & Errors**: `qa/2026-10-18-AG-81/shots/summary.json` (`0` runtime/inspector errors across all 24 captures)

---

## 1. Summary of Findings

### What Works Well
1. **Blouse, Trousers, Cuffs & Rolled Sleeves (`studio/marine-cloth.js`, `studio/marine-body.js`)**:
   - **Issue (`m81`, sleeves down, trousers, gloves worn)**: `87,314` tris / `190` meshes (`89,774` tris in grenade hold). Wrist cuffs overlap the glove gauntlets cleanly in all 6 moves (`crouch`, `run`, `reload`, `aim`, `grenade`, `dive`) with no wrist gap or forearm poke-through.
   - **Hot weather (`coyoteBrown`, rolled sleeves, shorts, bare hands, boonie + aviators)**: `93,218` tris / `196` meshes. Rolled sleeve rings sit snugly on the biceps across high-arm moves (`reload`, `grenade`, `dive`), and shorts cuffs track the upper thighs cleanly.
   - **Full kit (helmet, vest, pads, NVG, laser, flashlight)**: `95,318` tris / `221` meshes. Carrier vest, shoulder/knee pads, belt pouches, and drop-leg holsters track the torso and legs cleanly without fighting the underlying blouse/trousers loft.
   - **Tactical Gloves (`gloves-and-cuffs-closeup.png`)**: Articulated finger segments, knuckle plate ribs, and wrist cuffs read sharply in shouldered aim (`M4`).
2. **8-Point Utility Cover (`hat-cover.png`, `studio/marine-hats.js` lines 74–84)**:
   - The octagonal crown flare (`oct` in `loft`), self-camo sweatband seam tube (`y = 1.507`), drooped bill, and front EGA block read naturally and no longer look like a cylindrical drum.

### Visual Issues Spotted (for Claude — `studio/marine-hats.js` & `studio/marine-cloth.js`)
1. **Boonie hat side grommets float ~4–6 mm outside the crown (`hat-boonie.png`, `studio/marine-hats.js` lines 96–99)**:
   - `ringAt(boonieRings, 1.55)` returns the half-width `w` at `z = 0`, and places all four grommets at `x = sx * (w + 0.001)` with `z = ±0.05`. Because `planPoint(w, f, b, a)` narrows away from `z = 0` and the upper crown tapers inward from `y = 1.55` to `1.58`, the grommet cylinders visibly float in mid-air off the side of the crown.
   - **Suggested fix**: Sample `planPoint(w, f, b, a)` at the grommet's actual azimuth angle (and tilt `rz` slightly to match the crown slope between `1.55` and `1.58`).
2. **Ball cap (forward & backwards) 6-panel seam tubes bow outside the crown silhouette (`hat-ballcap.png`, `hat-ballcap-back-front.png`, `hat-ballcap-back-rear.png`, `studio/marine-hats.js` lines 108–113)**:
   - Because `ballRings` has a long straight segment between `y = 1.52` and `y = 1.55` followed by tighter top rings, the `CatmullRomCurve3(pts)` splines overshoot radially outward between `y = 1.52` and `1.575`, leaving a visible gap between the seam tubes and the lofted dome on the silhouette.
   - Also, on `ballcapBack` (`hat-ballcap-back-front.png`), the straight 7 cm rear strap box (`rmesh(.07, .03, .012, ...)`) stands slightly proud at its left/right corners against the curved forehead.
3. **Minor inner-thigh / pelvis shadow gap at extreme hip flexion (`hot-run.png`)**:
   - In `hot-run.png` (`hold('run', 0.25)` with shorts), a dark seam line is briefly visible at the groin crease where the forward-swinging right thigh meets the lower pelvis hem.

---

## 2. Captured Files (`qa/2026-10-18-AG-81/shots/`)

| File | Preset / Subject | Move / View | Tris | Meshes | Status |
| --- | --- | --- | ---: | ---: | --- |
| `sheet.jpg` | All 24 tiles | 6×4 contact sheet | — | — | Verified |
| `issue-crouch.png` | Issue | Crouch | 87,314 | 190 | Clean |
| `issue-run.png` | Issue | Run (`u=0.25`) | 87,314 | 190 | Clean |
| `issue-reload.png` | Issue | Reload (`u=0.45`) | 87,314 | 190 | Clean |
| `issue-aim.png` | Issue | Aim (M4) | 87,314 | 190 | Clean |
| `issue-grenade.png` | Issue | Grenade (`cocked`) | 89,774 | 197 | Clean |
| `issue-dive.png` | Issue | Dive forward | 87,314 | 190 | Clean |
| `hot-crouch.png` | Hot weather | Crouch | 93,218 | 196 | Clean |
| `hot-run.png` | Hot weather | Run (`u=0.25`) | 93,218 | 196 | Minor groin crease seam |
| `hot-reload.png` | Hot weather | Reload (`u=0.45`) | 93,218 | 196 | Clean |
| `hot-aim.png` | Hot weather | Aim (M4) | 93,218 | 196 | Clean |
| `hot-grenade.png` | Hot weather | Grenade (`cocked`) | 95,678 | 203 | Clean |
| `hot-dive.png` | Hot weather | Dive forward | 93,218 | 196 | Clean |
| `full-crouch.png` | Full kit | Crouch | 95,318 | 221 | Clean |
| `full-run.png` | Full kit | Run (`u=0.25`) | 95,318 | 221 | Clean |
| `full-reload.png` | Full kit | Reload (`u=0.45`) | 95,318 | 221 | Clean |
| `full-aim.png` | Full kit | Aim (M4) | 95,318 | 221 | Clean |
| `full-grenade.png` | Full kit | Grenade (`cocked`) | 97,778 | 228 | Clean |
| `full-dive.png` | Full kit | Dive forward | 95,318 | 221 | Clean |
| `gloves-and-cuffs-closeup.png` | Issue | Hands close-up (Aim) | 87,314 | 190 | Clean |
| `hat-cover.png` | Issue (`cover`) | Head front-3/4 | 87,314 | 190 | Clean |
| `hat-boonie.png` | Issue (`boonie`) | Head front-3/4 | 88,250 | 196 | Side grommets float off crown |
| `hat-ballcap.png` | Issue (`ballcap`) | Head front-3/4 | 87,906 | 197 | Seam tubes bow outside crown |
| `hat-ballcap-back-front.png` | Issue (`ballcapBack`) | Head front-3/4 | 87,906 | 197 | Seam tubes bow; strap corners proud |
| `hat-ballcap-back-rear.png` | Issue (`ballcapBack`) | Head rear-3/4 | 87,906 | 197 | Seam tubes bow slightly |
