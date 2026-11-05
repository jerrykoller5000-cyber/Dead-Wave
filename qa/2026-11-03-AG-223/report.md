# AG-223 (AG-221 Follow-Up) — All 13 First-Person Weapons at Hip Rest (Post-CL-293 Arms/Stocks/Elbows & GP-20020 Poses)

- **Date:** 2026-11-03
- **Author:** Antigravity (`Gemini 4 Argon (High)`)
- **Requested by:** Claude (`AG-221: every weapon again, after the arms and stocks change; fix the labels`)
- **Hardware:** NVIDIA GeForce RTX 5080 (real WebGPU via `tools/cdp.mjs`, `1920x1080`, `devicePixelRatio: 1`)
- **Seat:** `AG-219` Woods-Trail Seat (`[42.0, -7.5468, -20.0]`, `yaw: 0.000148`, `worldTime: 0.50` / `12:00 Noon`)
- **Contact Sheets:**
  - `qa/2026-11-03-AG-221/all-weapons-fp.jpg` (`2640x1764`, 4 across)
  - `qa/2026-11-03-AG-223/all-weapons-fp.jpg` (`2640x1764`, identical copy in `AG-223` folder)
- **Single 1080p Stills:** `pistol.jpg`, `revolver.jpg`, `uzi.jpg`, `m4.jpg`, `ak.jpg`, `shotgun.jpg`, `aa12.jpg`, `sniper.jpg`, `launcher.jpg`, `minigun.jpg`, `flamer.jpg`, `chainsaw.jpg`, `akimbo-pistol.jpg` (saved in both `qa/2026-11-03-AG-221/` and `qa/2026-11-03-AG-223/`)
- **Raw Telemetry:** `qa/2026-11-03-AG-223/telemetry.json` and `qa/2026-11-03-AG-221/all-weapons-fp-telemetry.json`

---

## 1. Assertions & Verification Summary

Every single frame (`13 / 13`) passed all assertions:
1. **`1.0 s` (`60` frames at `1/60 s`) Continuous `raise === 1` Hold Before Capture:** For all 12 viewmodel guns (`pistol` through `chainsaw`), after switching and reaching `vm.info.key === w.key && vm.info.raise === 1`, the harness stepped an additional **60 frames (`1.0 s`)** while asserting on *every single frame* that `vm.info.active === true`, `vm.info.key === w.key`, and `vm.info.raise === 1` (`holdFull1sVerified === true`), plus resetting `marineIdle` (`marineIdleDbg().reset()`) so the 20-second cigarette-pack idle never triggers on later weapons.
2. **CL-293 Arms & Upper Arm (`studio/fp-arms.js` & `game/viewmodel.js`):** Verified `SLIM = 1.0` full-girth sleeves and `vm.arms.r.upper` / `vm.arms.l.upper` (`upperArmR: true, upperArmL: true`) turning at the elbow toward `VM_SHOULDER` (`[0.19, -0.24, 0.08]`) on all 12 viewmodel weapons.
3. **CL-293 Elbows Below Wrists (`elbowRel`):** Verified `pistol` and `revolver` use `elbowRel: { r: [0.10, -0.30, 0.16], l: [-0.10, -0.30, 0.16] }` (both forearms entering cleanly from the bottom without inverted side-flared elbows), and long guns use `elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] }` (near-vertical support forearm from the bottom).
4. **CL-293 Stocks Visible at the Hip (`vm.gun.stock.visible === true`):** Verified `stockPresent: true, stockVisible: true` at hip rest (`ads = 0 < 0.35`) on all 6 stocked long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`, `launcher`).
5. **GP-20020 Hip Reference Placements (`game/viewmodel-poses.js`):** Verified new hip placements for `m4` (`muzzle NDC [+0.2104, -0.1562]`), `ak` (`muzzle NDC [+0.2050, -0.1363]`), and `shotgun` (`muzzle NDC [+0.2163, -0.1180]`).

---

## 2. Per-Weapon Telemetry Table (`1920x1080` Noon WebGPU)

| # | Weapon (`key`) | `vm.info.key` | `raise` (`1.0 s` Held) | `stockVisible` at Hip | `upperArm` (`R / L`) | Muzzle NDC `(x, y)` | Support Wrist NDC `(x, y)` | Strong Wrist NDC `(x, y)` | `gunPixels` (`%` of `1080p`) | `gunAndHandPixels` (`%` of `1080p`) | Status |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **Pistol** (`pistol`) | `pistol` | `1.00` (`true`) | `false` | `true / true` | `(+0.2436, -0.1911)` | `(+0.2138, -0.6605)` | `(+0.5097, -0.5727)` | **`36,012`** (`1.74%`) | **`197,604`** (`9.53%`) | **PASS** |
| **2** | **Revolver** (`revolver`) | `revolver` | `1.00` (`true`) | `false` | `true / true` | `(+0.1581, -0.1392)` | `(+0.2416, -0.7631)` | `(+0.5424, -0.6588)` | **`64,232`** (`3.10%`) | **`170,263`** (`8.21%`) | **PASS** |
| **3** | **Wasp (Uzi)** (`uzi`) | `uzi` | `1.00` (`true`) | `false` | `true / true` | `(+0.2311, -0.2660)` | `(+0.2118, -0.7636)` | `(+0.5666, -0.7799)` | **`98,851`** (`4.77%`) | **`197,666`** (`9.53%`) | **PASS** |
| **4** | **GW-4 (M4)** (`m4`) | `m4` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.2104, -0.1562)` | `(+0.2443, -0.4703)` | `(+0.6284, -0.9916)` | **`124,323`** (`6.00%`) | **`232,696`** (`11.22%`) | **PASS** |
| **5** | **KR-7 (AK)** (`ak`) | `ak` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.2050, -0.1363)` | `(+0.2389, -0.4391)` | `(+0.6305, -0.9936)` | **`138,452`** (`6.68%`) | **`230,182`** (`11.10%`) | **PASS** |
| **6** | **Shotgun** (`shotgun`) | `shotgun` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.2163, -0.1180)` | `(+0.2286, -0.5159)` | `(+0.6626, -0.9999)` | **`135,377`** (`6.53%`) | **`210,947`** (`10.17%`) | **PASS** |
| **7** | **Breacher-12** (`aa12`) | `aa12` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.1235, -0.0252)` | `(+0.0977, -0.3541)` | `(+0.5882, -0.9163)` | **`189,458`** (`9.14%`) | **`273,061`** (`13.17%`) | **PASS** |
| **8** | **Sniper** (`sniper`) | `sniper` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.0195, -0.0110)` | `(+0.0886, -0.2580)` | `(+0.4673, -0.6928)` | **`127,604`** (`6.15%`) | **`184,783`** (`8.91%`) | **PASS** |
| **9** | **Launcher** (`launcher`) | `launcher` | `1.00` (`true`) | **`true`** | `true / true` | `(+0.0725, -0.0968)` | `(+0.1160, -0.3578)` | `(+0.4910, -0.7888)` | **`183,020`** (`8.83%`) | **`267,629`** (`12.91%`) | **PASS** |
| **10** | **Minigun** (`minigun`) | `minigun` | `1.00` (`true`) | `false` | `true / true` | `(+0.0005, -0.2389)` | `(+0.0598, -0.5973)` | `(+0.4090, -0.4519)` | **`173,618`** (`8.37%`) | **`218,095`** (`10.52%`) | **PASS** |
| **11** | **Flamer** (`flamer`) | `flamer` | `1.00` (`true`) | `false` | `true / true` | `(+0.1045, -0.0442)` | `(+0.1213, -0.3585)` | `(+0.5818, -0.9096)` | **`147,368`** (`7.11%`) | **`306,310`** (`14.77%`) | **PASS** |
| **12** | **Chainsaw** (`chainsaw`) | `chainsaw` | `1.00` (`true`) | `false` | `true / true` | `(0.0000, +0.1108)` | `(-0.0529, -0.2296)` | `(+0.0811, -0.8827)` | **`138,774`** (`6.69%`) | **`238,742`** (`11.51%`) | **PASS** |
| **13** | **Akimbo Pistols** (`akimbo-pistol`) | `null` (`dual=true`) | `0.00` (`3P dual`) | `false` | `true / true` | `n/a` (`3P dual`) | `n/a` | `n/a` | **`31,478`** (`1.52%`) | **`33,168`** (`1.60%`) | **PASS** |

---

## 3. Contact Sheet (`qa/2026-11-03-AG-221/all-weapons-fp.jpg`)

![All 13 First-Person Weapons at Hip Rest](all-weapons-fp.jpg)
