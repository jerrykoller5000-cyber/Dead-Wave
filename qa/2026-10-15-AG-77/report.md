# QA & Model Fix Report — AG-77 (Jerry's 10 Weapon Fixes)

Date: 2026-10-15
Agent: Antigravity (`Gemini 4 Argon (High)`)

## Summary of 10 Fixes

1. **Flamer pistol grip (`makeFlamerModel` in `studio/weapon-heavy.js`)**:
   - **Root Cause**: The main fuel tank (`z = -0.20..0.16, y = -0.09`) occupied the exact same space as the rear pistol grip (`z = -0.16, y = -0.09`), trigger guard (`z = -0.068..-0.112`), and trigger (`z = -0.09`), burying the rear grip and trigger inside the red tank.
   - **Fix**: Shifted the under-slung fuel tanks forward (`z = -0.048..0.205` main, `z = -0.038..0.175` side) so the entire rear pistol grip, closed trigger guard loop, and curved trigger sit cleanly exposed under the rear receiver (`z = -0.208..-0.064`). Upgraded both the rear pistol grip and the front foregrip (`z = 0.242..0.312`) with contoured backstraps, finger grooves, inset side panels, upper mounting blocks, and flared baseplates.
   - **Before / After**: `qa/2026-10-15-AG-77/before/flamer-right-close.png` → `qa/2026-10-15-AG-77/after/flamer-right-close.png`

2. **Flamer hoses (`makeFlamerModel` in `studio/weapon-heavy.js`)**:
   - **Root Cause**: The rear hose collar (`y = 0.091`) hung half-off the top edge of the rear housing and terminated in mid-air (`x = 0.07`) between the two tanks; the front hose was a floating half-torus (`K.tor` at `z = 0.20, y = -0.02`) unconnected to either tank valve or the receiver.
   - **Fix**: Seated the rear hose into a hex/brass bulkhead fitting centered on the rear face of the upper receiver (`[0, 0.044, -0.178]`) and routed it smoothly into a rear dome valve boss on the side tank (`[0.11, -0.05, -0.042]`), with a secondary crossover hose connecting into the main tank's rear dome (`[0.018, -0.09, -0.05]`). Replaced the floating front half-torus with two continuous segmented `rod` hoses and brass fittings connecting the main tank front cap and side tank yellow regulator valve directly into a receiver underside manifold block (`z = 0.215`), plus upper saddle brackets bolting the tank straps to the receiver.
   - **Before / After**: `qa/2026-10-15-AG-77/before/flamer-rear3-close.png` → `qa/2026-10-15-AG-77/after/flamer-rear3-close.png`

3. **Chainsaw pistol grip and trigger (`makeChainsawModel` in `studio/weapon-heavy.js`)**:
   - **Root Cause**: The rear grip slab had `d = 0.10` (`z = -0.23..-0.115`), which completely swallowed the tiny trigger at `z = -0.11..-0.124` and left a disjoint step against the rear loop guard (`z = -0.215, y = -0.185`).
   - **Fix**: Contoured the rear pistol grip (`z = -0.222..-0.142`) with inset rubber grip panels, leaving an open trigger window in front (`z = -0.142..-0.084`). Wrapped a continuous molded hand-guard and lower base loop from the rear engine housing (`z = -0.262`) around the rear (`z = -0.304`), across the grip base (`y = -0.172`), and up the front (`z = -0.082`) into the underside of the crankcase. Added a prominent yellow curved throttle trigger (`z = -0.108..-0.134`) and rear safety lockout lever.
   - **Before / After**: `qa/2026-10-15-AG-77/before/chainsaw-side-close.png` → `qa/2026-10-15-AG-77/after/chainsaw-side-close.png`

4. **Chainsaw carry handle (`makeChainsawModel` in `studio/weapon-heavy.js`)**:
   - **Root Cause**: The carry handle torus (`K.tor(0.11, 0.016, ..., 0, 0.07, 0.02)`) only reached `y = 0.18` and `x = ±0.11`, burying it inside the yellow top cover (`y = 0.177..0.18, x = ±0.11`) and colliding with the spark-plug boot at `[0.04, 0.18, 0.02]`.
   - **Fix**: Relocated the spark-plug boot to the rear of the cowling (`z = -0.232`), stepped the front of the yellow cowling slightly (`y = 0.148..0.154` at `z = -0.01..0.073`), and built a full wrap-around tubular carry handle (`x = ±0.132, y = 0.201` across the top) with a ribbed rubber top grip sleeve and bolted side mounting brackets, leaving a clean air gap above the cowling while keeping the grip sleeve within `5 mm` of `H.fore = [0, 0.18, 0.02]`.
   - **Before / After**: `qa/2026-10-15-AG-77/before/chainsaw-top-close.png` → `qa/2026-10-15-AG-77/after/chainsaw-top-close.png`

5. **Knife blade fatter to fill out the hilt (`makeKnifeModel` in `studio/weapon-sidearms.js`)**:
   - **Root Cause**: The knife blade stations had `top = 0.016, bottom = -0.018` (`0.034` total width), looking skinny against the `0.056` collar, `0.058` ridged grip, and `0.112` crossguard.
   - **Fix**: Widened the blade stations in `groundBlade` to `top = 0.0265, bottom = -0.0285` (`0.055` total width at the ricasso, with a subtle `-0.0295` belly before the clip-point taper), widened `edgeWidth` to `0.0135` and `fuller` to `0.0045`, and seated the ricasso at `z = 0.038` flush into the crossguard.
   - **Before / After**: `qa/2026-10-15-AG-77/before/knife-side.png` → `qa/2026-10-15-AG-77/after/knife-top.png`

6. **Machete serrated edge near the top (`makeKnifeModel` in `studio/weapon-sidearms.js`)**:
   - **Fix**: Added a 16-tooth raked double-bevelled sawback serrated edge mesh (`edgeMat`) along the upper spine of the machete (`z = 0.14..0.54`).
   - **Before / After**: `qa/2026-10-15-AG-77/before/machete-side.png` → `qa/2026-10-15-AG-77/after/machete-side.png`

7. **Katana blade not attaching to the hilt (`makeKatanaModel` / `bladeMesh` in `studio/katana.js`)**:
   - **Root Cause**: `bladeMesh` started at `z = 0.03`, `habaki` ended at `z = 0.020`, and `tsuba` ended at `z = 0.008`, leaving a `12 mm` empty air gap between the blade/habaki and the guard/hilt.
   - **Fix**: Rooted `bladeMesh` at `z = 0.006` inside the guard, added front and rear oval `seppa` washers (`z = 0.0095`, `-0.0045`, `-0.0085`), and built a two-stage grooved gold `habaki` (`z = 0.009..0.040`) and `fuchi` collar (`z = -0.024..-0.006`) so the blade, habaki, seppa, tsuba, fuchi, and tsuka form a 100% solid stack with zero gaps.
   - **Before / After**: `qa/2026-10-15-AG-77/before/katana-hilt-close.png` → `qa/2026-10-15-AG-77/after/katana-hilt-close.png`

8. **High-fidelity badass katana (`makeKatanaModel` in `studio/katana.js`)**:
   - **Fix**: Upgraded `bladeMesh` to a 48-station, 12-vertex cross-section with a deep recessed dark-crimson `bo-hi` (blood groove), crisp `shinogi` ridge, and a procedural wavy `gunome-midare` glowing `hamon` temper line along the razor edge; built a sculpted gold-and-iron `tsuba` with torus rims and alternating gold/crimson studs; added a `samegawa` ray-skin under-core, gold dragon `menuki` ornaments, X-crossed `tsuka-ito` diamond cord wrap with flush collars, and an ornate `kashira` pommel cap with gold `shitodome` eyelets and crimson pommel knot.
   - **Before / After**: `qa/2026-10-15-AG-77/before/katana-side.png` → `qa/2026-10-15-AG-77/after/katana-side.png`

9. **Decorative katana sheath (`makeSheathedKatana` in `studio/katana.js`)**:
   - **Root Cause**: The saya was built from 6 straight black boxes that stair-stepped visibly along the curve and had a gap behind the `koiguchi`.
   - **Fix**: Replaced the 6 boxes with a single continuous 36-station curved oval-section vertex-colored black-and-crimson urushi lacquered `saya` (`z = 0.008..0.686`), fitted with a sculpted gold `koiguchi` mouth collar flush against the `tsuba`, a gold `kurikata` knob, a 6-turn alternating crimson-and-gold braided `sageo` cord wrap with bow knot and twin hanging gold-tipped tassels, two gold-and-crimson `seme-gane` reinforcement bands, and a contoured rounded gold `kojiri` chape at the tip.
   - **Before / After**: `qa/2026-10-15-AG-77/before/katana-sheathed-side.png` → `qa/2026-10-15-AG-77/after/katana-sheathed-side.png`

10. **M240 trigger clipping on bipod/tripod mount (`makeM240Model` in `studio/weapon-heavy.js`)**:
    - **Root Cause**: The horizontal pintle cradle bar (`K.box(0.1, 0.03, 0.32, gunDark, 0, 0.8, 0.05)`) extended back to `z = -0.11`, slicing directly through the middle of the M240 trigger guard (`z = -0.07..-0.12, y = 0.778..0.82`).
    - **Fix**: Shortened and shifted the pintle cradle bar forward (`z = -0.048..0.202, y = 0.805`) well ahead of the trigger guard, and built a closed trigger guard (`z = -0.078..-0.135`) and curved trigger blade (`z = -0.098..-0.11`) cleanly behind the mount in front of the pistol grip (`z = -0.166`).
    - **Before / After**: `qa/2026-10-15-AG-77/before/m240-folded-side.png` → `qa/2026-10-15-AG-77/after/m240-folded-side.png`
