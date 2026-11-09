# The manual pass (D-122) — every weapon rebuilt from its operating manual, ChatGPT first, Claude second

Jerry, 8 Nov 2026 ~04:10Z: "I do not want Grok Bot to work on these weapons for now. He's too prone to mistakes to get
them right when it needs to be this detailed, he can do rough mockups. I want ChatGPT to do a first-round fix of all the
weapons that I provide links to the operating manuals and then you do a second round of polish. ... Read the manuals be
thorough. Use imagination for rest of weapons." Then, ~04:30Z: "For optic upgrades." (a 3x prism, an RMR red dot, a 4x
ACOG, a Nightforce NX8), and his answers: the optics are ARMORY UPGRADES (an optic slot, bought and fitted like the
suppressor); he will UPLOAD the manuals that could not be read (the Colt M4 and Python scans, the Micro UZI and Glock on
Scribd, FM 23-90, the Spitfire article).

## Who does what
- ChatGPT: the first round on every weapon below, one card each (GP-20053 to GP-20065), in the order given. You own the
  weapon builders for these cards (studio/weapon-longarms.js, weapon-sidearms.js, weapon-heavy.js, weapon-optics.js,
  frag-grenade.js, katana.js's builder) and the weapon's hold numbers (WEAPON_HOLD in index.html, VM_SOCKETS in
  game/viewmodel-poses.js) when your change moves a grip, a support point, a sight or a moving part.
- Claude: the second round (CL-322) on each weapon after your handoff: polish, the hands and first-person view, the
  reload and cycle animations against the manual, then the sheet to Jerry IN THE CHAT (he has no PC access). Claude has
  the final say (D-119).
- Grokbot: no detailed weapon work (models, grips, hand anchors) until Jerry says otherwise; rough mock-ups when asked;
  his other work (combat in index.html, commits D-113, benches, tests) goes on.

## The method, per weapon
1. Read docs/fps/manuals/<file>.md (Claude's paraphrased digest) and, if you can reach it, the linked PDF's figures
   (the parts drawings are images the digests could not see). Don't copy text or logos; part names are fine.
2. Rebuild the builder to the manual: every externally visible part it names, at the real proportions (docs/fps/
   fidelity.md's yardstick; lengths kept where the hold depends on them unless the card says otherwise), every control on
   its real side (the mirror convention: the gun's real RIGHT is +x, which the mirrored first-person view shows on the
   right), the moving parts the manual operates as separate named parts where the game animates them (the existing
   userData names), and the manual's operating sequence noted for Claude's animation round (what moves, which way, how
   far, in what order).
3. Keep every contract: the bore and muzzle (gunEffects, the laser), the sight point (game/sight-points.js SIGHT), the
   grip and support (VM_SOCKETS, WEAPON_HOLD: move them with the part and say so), the part names (mag, work, slide,
   pump, bolt, cylinder, fpStock, reloadParts, ammoBox, chainTeeth...), the camo (no new transparent or emissive
   materials on the body), D-99 (say the triangle count), t333 (nothing floats), t281, tcl281, t334.
4. Jerry's notes stay (docs/jerry/2026-11-07-weapon-notes.md J21-J37): e.g. the shotgun's stock shape and black (J34),
   the sniper's open receiver and bolt cycle (J32, J35) and its scope on the rail (J33), the revolver's look from his
   S&W picture (J37) with the rod two inches short (J36). Jerry's attachment photos (J38-J43) show only where the optic and the
   laser/light sit and the unit's style; every gun keeps its look (J44: "Keep the looks I'm just showing attachment points and laser/light combo styles for each gun.").
5. Proof: tools/gunshot sheets (side, quarter, close, sideR; --pose for the moving parts open) before and after in
   review/<card>/, the tests, a handoff; then request Claude's round.

## The order and the cards
| # | Card | Weapon (builder) | Manual digest | Notes |
| --- | --- | --- | --- | --- |
| 1 | GP-20053 | Shotgun (makeShotgunModel) | stevens-320.md | Security grade; the cross-bolt safety in the guard, the slide-lock lever, the tube cap nut, the barrel's lug ring, the loading port; keep J34's stock |
| 2 | GP-20056 | KR-7 (makeAkModel) | ak47.md | the safety lever's travel and stop, the cam button, the mag's rock-in, the gas tube lock arm, the compensator and detent, the front sight block |
| 3 | GP-20059 | Sniper (makeSniperModel) | mrad.md | toward the MRAD (the upper with its long rail, the two barrel screws, the squared lower, the receiver latch, the folding stock to the right, the cheek piece, the brake); keep CL-319's bolt mechanics and J33 |
| 4 | GP-20060 | Launcher (makeLauncherModel) | m32a1.md | the M32A1 (the quad rail, the stainless receiver, the M2A1-style sight on the rail, the angle-adjustable stock, the cylinder and its spring housing, the frame's hinge) |
| 5 | GP-20062 | M240 (makeM240Model) | m240b.md | the M240B (the barrel's carrying/changing handle, the gas plug, the cover and feed tray, the rear sight leaf, the trigger housing and safety, the bipod, the M122 tripod's T&E for the mounted mode); the folded mode stays |
| 6 | GP-20055 | GW-4 (makeM4Model) | m4.md (TM 9-1015-319-10, read) | the M4/M4A1 callouts both sides, the slip ring, the BUIS, the stock's four positions; the QUAD RAIL with covers in place of the handguard (J49); its optic the ACOG |
| 7 | GP-20054 | Wasp (makeUziModel) | uzi.md (the FN UZI manual, read) + micro-uzi.md (the Micro's size) | the cover and its catch, the cocking lever, the grip safety, the S/R/A lever on the left, the butt folding under, the barrel nut and catch |
| 8 | GP-20057 | Pistol (makePistolModel) | glock17.md (Glock's manual, read) | no logos |
| 9 | GP-20058 | Revolver (makeRevolverModel) | python.md | the look STAYS J37's S&W (CL-320; J44 "Keep the looks"): the manual's operation where it fits that look; the rod two inches short (J36); the RMR's top-strap plate and the under-barrel rail for the laser/light shown only when fitted |
| 10 | GP-20061 | Mortar (makeMortarModel) | m29a1.md (TM 9-1015-200-10, read) | CHANGED (Jerry): the 81-mm M29A1: cannon with its barrel ring and base cap, the M23A1 bipod, the round M3 baseplate, the M53 sight; the 81-mm round (index.html's makeMortarRoundMesh); carried and emplaced by one marine; gameplay numbers unchanged |
| 11 | GP-20063 | Breacher-12 (aa12.md: the AA-12 articles Jerry linked), then the rotary gun, flamer, chainsaw (imagination) | aa12.md; fidelity.md's lists | GP-20048/49/50/52's proportion calls fold in |
| 12 | GP-20064 | Knife, machete, katana, grenade | none: imagination | |
| 14 | GP-20066 | The laser/light attachment | laser-light.md | one kiosk item replacing the laser and flashlight gear; fitted per gun in the armory; modelled on each gun where it belongs; the beam and cone from its lens |
| 13 | GP-20065 | The optic upgrades | optics.md | four optic models (an RMR-style red dot, a 3x prism, a 4x ACOG with an RMR on top, an NX8-style scope) in studio/weapon-optics.js; the armory's optic slot (bought and fitted like the suppressor): which gun takes which is optics.md's J50 table (GW-4 and KR-7 all three; sniper its scope only; pistol RMR; revolver prism, RMR; Wasp RMR; shotgun prism, RMR; Breacher RMR; rotary gun RMR; the rest none); the NX8 look for the sniper's scope. Claude does the sight pictures (the reticles, the zoom) in CL-323 |

Jerry's later links (8 Nov ~05:00Z) made the GW-4, pistol, Wasp, prism and mortar readable; the revolver has only the Umarex replica's manual (python.md).
