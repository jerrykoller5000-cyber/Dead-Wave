# The fidelity upgrade: the guns, blades and grenade (D-121, Jerry 7 Nov)

Jerry, 7 Nov: "I want the same methodology and attention to care now given to updating the models themselves. Let's do a
Fidelity upgrade." Scope: the twelve guns, the knife, machete and katana, the grenade. Target: real-gun detail, still our
style (his choice): every part a real gun has, the proportions of his references, three to six times today's triangles
where it shows, within the 5080's budget. The Sketchfab references in Claude outputs/refs/models/ are REFERENCE ONLY (D,
3 Nov): measured and looked at, never copied, traced, imported or shipped.

The method is docs/fps/signoff.md's (D-119): one row per model, a column per agent, nothing complete until every agent has
looked at the pictures and agreed, Claude has the final say, and a verdict says only what the picture shows.

## Our style, said plainly
Clean shapes with real parts. Detail by geometry (bevels, panel lines, screws, pins, ribs, serrations, vents, the checkering
and stippling we already cut) and by materials (steel, parkerized steel, polymer, wood, rubber, brass: each its own colour,
roughness and sheen, with the edges a shade lighter where a gun wears), not by photo textures; the camo and the checkering
canvases we have stay. Nothing pretends to be a photograph; everything is the thing it is.

## The yardstick (a model passes when every line holds, judged on the sheet)
1. Proportions: length, height, width, bore-over-grip and grip rake within 5 % of the reference's (tools/refview metrics;
   AG-229 has the numbers for ten of them). Where ours is a different gun on purpose (the shotgun is a tactical pump, the
   revolver a magnum, the launcher an M32) the proportions are a real gun of that kind, measured from its reference or a
   published figure, and the handoff says which.
2. Every real control and part present and in its place (the list per gun below), at a real size (a screw head 3-5 mm,
   a pin 2-3 mm, a rib 1-2 mm proud, a trigger 10-12 mm wide).
3. No flat slab: in the first-person hip and ADS close-ups no untextured face wider than 3 cm shows without a bevel, a
   panel line, a part on it or a material change. Edges bevelled (gunKit bevel) on everything the eye gets near.
4. Nothing floats (J14, GB-297): every screw, pin, rail and rivet's base is inside its parent by at least 0.5 mm; a part
   that moves (slide, pump, bolt, cylinder, mag, drum, hinge, cap, cans) is one node with its rest pose recorded.
5. Materials: at least four distinct materials on a long gun (receiver, barrel/metal, furniture, grips/rubber) and three on
   a handgun; roughness 0.35-0.6 on steel, 0.75-0.95 on polymer, wood with the grain canvas; edge wear on the steel.
6. The sights unchanged in their datum (GB-259/MU-29's sight points, tcl281's bars hold) unless the card says the sight
   moves, and then the sight-points file moves with it.
7. The budget: the first-person copy under 15 k triangles for a handgun or the Wasp, 25 k for a long gun, 35 k for a heavy;
   the whole held set no more than 2.5x today's. The fps at GB-299's HQ dusk sample and GB-279's night 20 are within 2 of
   today's (D-99 holds). tools/refview prints the triangle count; the handoff records before and after.
8. The hands still fit: VM_SOCKETS/WEAPON_HOLD grip, support and work points land on the new geometry (tcl281, the hip and
   ADS stills with the hands: no finger through metal, no gap under the palm). A builder who moves a grip says so and the
   hold owner (Claude: game/viewmodel-poses.js; Grokbot: WEAPON_HOLD) moves the point in the same card.
9. The moving parts still move and the reloads still read (docs/fps/reloads-audit.md): tcl281's reload checks, the
   viewmodel's part names (GB-302's) unchanged or the handoff lists the renames.
10. The camo (Jerry, 7 Nov, J20): "Gun camo needs to look painted on and cover the whole gun. When a camo is selected
   for a gun, the suppressor put on the gun needs to adopt that selected camo." A selected camo paints every surface of
   the gun (receiver, barrel, furniture, magazine, the moving parts, the mods: the suppressor, a sight's body) with one
   continuous projection (world-size pattern, GP-20031's 2.38 repeats/m, no seams at the part joins, no part left in its
   base colour), as spray paint sits on a gun: the paint's roughness over the metal's, the edges worn through to the
   metal a little; the glass, the lights, the bore, the brass and the rubber of the grips stay bare. The suppressor and
   every mod a gun can carry take the gun's camo the moment they are fitted. GP-20045 (ChatGPT, GP-20031's owner) with
   every builder keeping their materials camo-able (one material per part, nothing baked in the vertex colours).
11. The pistol grips (Jerry, 7 Nov, on the shotgun's: "Looks skinny and ugly", then "Check and fix all pistol grips"):
   a grip is a real grip's size (a handgun's 30 mm wide x 50 deep at the palm swell, a long gun's 32-36 x 50-55), with
   a backstrap swell, a flat or capped base (never a point), 8-12 mm bevels on its edges and something on every face
   (finger grooves or ridges on the front strap, checkering, stippling or panels on the sides); where it meets the
   receiver or the stock nothing pokes out (the shotgun's old wedge). The centre line, h and rake stay (shapedGrip on
   gripOutline's line) so the palm point and the hold do not move. Looked at in tools/gunshot's grip views
   (--at the grip point, --d 0.3-0.42), side and quarter, before and after; the sweep's befores are in
   Claude outputs/cl312b/grips-before-side.jpg and -quarter.jpg.

## The sheet each card delivers (AG shoots it; the builder may shoot a draft)
tools/refview side, top and 3/4 at 1 m (ours vs the reference, the metrics line), before and after; first-person hip and
ADS stills at 1280 on the 5080 at noon and at night with the hands; a 2x crop of the receiver and of the grip; the
triangle count before and after; the fps line. Composite: qa/fidelity/<gun>/<gun>-fidelity-sheet.jpg, the stills beside it.

## The parts, per model (what a real one has; the builder ticks each in the handoff)
- Pistol (a Glock-19 kind): slide with front and rear serrations, the extractor, the ejection port with the barrel hood
  in it, the slide stop, the takedown lever, the trigger with its safety blade, the undercut trigger guard, grip
  stippling and the finger grooves, the magazine with baseplate and witness holes, front sight dot and rear notch with
  the two dots, the accessory rail under the dust cover, the muzzle crown, the backstrap texture.
- Revolver (our magnum): fluted cylinder with six chambers front and back, the crane and the thumb latch, the ejector rod
  in its shroud, the hammer spur and the trigger, the frame's side-plate screws, grip panels with checkering and the
  medallion-less wood, the ramp front sight and the adjustable rear, the top strap's serrations, the full underlug and
  rib, the forcing cone in the gap. (GB-173-180, GB-233 did much of this: check each, finish the rest.)
- Wasp (a MAC-10 kind): the stamped receiver's horizontal ribs and spot welds, the top cocking knob with its slot between
  the sight ears, the mag release in the grip, the selector, the trigger, the strap loop, the threaded muzzle with its
  thread protector, the magazine in the grip, the front sight post, the lower's seam line.
- GW-4 (an M4 kind): the upper and lower receivers with the mag well's flare and the seam, the charging handle's T and
  latch, the forward assist, the brass deflector, the ejection port and its cover, the bolt release, the selector, the mag
  release button and its fence, the trigger and guard, the pistol grip with its ribs, the buffer tube with the castle nut,
  the stock with its sling slot and buttplate, the handguard's rails with slots and the gas block, the flash hider's slots,
  the magazine's ribs and baseplate, the front sight or rail cut.
- KR-7 (an AK kind): the stamped receiver with its dimples and rivets, the dust cover's ribs, the gas tube and the upper
  handguard's vents, the lower handguard's wood with its finger swell, the charging handle, the long selector lever with
  its notches, the trigger and guard, the curved magazine with its ribs, the rear tangent sight with the leaf, the front
  sight tower, the gas block, the slant muzzle brake, the wood stock with the steel buttplate and sling loop, the grip's
  ribs.
- Shotgun (a tactical pump): the receiver with the ejection port and the loading port, the action bars, the pump forend's
  ribs, the barrel with its rib and bead, the magazine tube with its cap and the clamp, the trigger guard with the safety
  button, the pistol grip and stock, the sling swivel, the shell latch in the port, the extension tube.
- Breacher-12 (an AA-12 kind): the polymer monoblock flowing into the trigger guard, the drum with its winding cover and
  rim, the charging handle in its slot, the selector, the receiver's vents, the muzzle, the top rail, the seam lines of
  the shell, the grip's texture.
- Sniper (an L96 kind): the chassis with the thumbhole, the bolt with its handle and knob on the gun's left (+x, CL-306 k),
  the scope on two rings with its turrets and caps, the magazine, the trigger and guard, the muzzle brake, the cheekpiece
  and the buttplate spacers, the forend's vents, the bipod stud, the bolt shroud.
- Launcher (an M32 kind; GP-20039's drum, latch, winder, loose round): the quadrant sight, the stock, the forward grip,
  the rails, the cylinder's flutes and the chambers' mouths, the grip's texture, the trigger and guard.
- Flamethrower: the two tanks with their straps, valves and gauge, the hose with its couplings, the wand with the pilot
  light's cage, the two grips, the trigger, the ignition box, the regulator.
- Rotary Gun: the barrel cluster with its clamps front and rear, the motor housing with its vents, the feed chute and the
  ammo box with its lid and latch, the rear trigger grip and the top post (GP-20022), the side peg (GP-20024), the
  delinker's cover.
- Chainsaw: the engine housing with its pull-starter, the air-filter cover and its knob, the chain brake and the hand
  guard, the bar with the chain's teeth and the bar nuts, the throttle and its lock, the rear handle in line, the hoop,
  the muffler, the oil and fuel caps (GB-302's fuelCap), orange (GP-20022).
- Knife, machete, katana: the knife's clip point, fuller, guard, ridged grip and pommel; the machete's teeth along the
  edge (GB-235), the pins, the polymer grip; the katana's tsuba, the ito wrap over the same, the habaki, the hamon line,
  the saya when worn.
- Grenade (an M67): the sphere's seam, the spoon with its spring tab, the pull ring and pin, the fuze head, the olive paint
  with the yellow band and the stencil.

## Who builds what (rule 2: own files)
- studio/weapon-sidearms.js (pistol, revolver, Wasp, knife and machete): Grokbot. GB-307..GB-310.
- studio/weapon-heavy.js (minigun, chainsaw, launcher, flamer): ChatGPT. GP-20041..GP-20044.
- studio/weapon-longarms.js (GW-4, KR-7, shotgun, Breacher-12, sniper), studio/katana.js, the grenade (makeFragGrenade):
  Claude. CL-310..CL-315 (CL-309 the helpers).
- The shared helpers (screws, pins, ribs, panel lines, vents, edge-wear materials): studio/gun-detail.js, Claude's; ask
  for a helper rather than copying one.
- The camo painted over the whole gun and the mods (J20): studio camo projection and the armory's mods: ChatGPT, GP-20045.
- The sheets and the metrics: Antigravity (AG-256, a card per model as it lands, the refview run through the slot).
- Reviews: every agent on every row, from the sheet. Claude's verdict closes a row.

## Order
The guns the player sees most first: pistol, GW-4, KR-7, shotgun; then the Wasp, revolver, sniper, Breacher; then the
heavies and the launcher; then the blades and the grenade. One model per builder at a time; the PC's load stays light
(D-114): a builder's own look is tools/refview (fast); the sheets are AG's, one at a time through the slot.

## The sheet
| Model | State | Claude | ChatGPT | Grokbot | Antigravity | Jerry |
|---|---|---|---|---|---|---|
| Pistol | open (GB-307) | | | | OK (qa/fidelity/pistol/pistol-fidelity-sheet.jpg: 7,152t / +1,920, 11 mats, 0 floats, Glock-19 proportions hold, serrations/crown/slide stop/extractor/finger grooves crisp, noon/night FP hip & ADS clean, HQ dusk 59.7 fps) | |
| Revolver | open (GB-308) | | | | | |
| Wasp SMG | open (GB-309) | | | | | |
| GW-4 Carbine | in review (CL-310 on disk 18:20Z: the receivers at 30/32 mm, the 40 mm handguard, the port, cover and deflector on +x, the selector and bolt catch on -x, the A2 grip; 11.9 k tris) | | | | | |
| KR-7 Rifle | in review (CL-311) | OK on AG's 5080 stills (hip and ADS, noon and night: the slim receiver, the knob on the right, the leaf and post on the line); open: the curls' refit (GB), the pull's hand at the nearer knob, the cover's lighter finish | | | OK (qa/fidelity/ak/ak-fidelity-sheet.jpg: 8,184t / +2,752, 8 mats, 0 floats, slim receiver 56x271mm, AKM 8 ribs & tangent leaf & right charging knob, noon/night FP hip & ADS clean, HQ dusk 61.2 fps) | |
| Shotgun | in review (CL-312, b) | OK on AG's 5080 stills (hip: the wrist into the grip, the pump; ADS: the bead on the rib); open: the forend's and grip's curl refit (GB) | | | OK (qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg: 5,680t / +1,084, 7 mats, 0 floats, slim 49mm receiver, 44mm 12-rib forend + CL-312b flush stock wrist & tactical grip, noon/night FP hip & ADS clean, HQ dusk 60.8 fps) | |
| Breacher-12 | in review (CL-313 on disk 18:20Z: the receiver 62 mm with a rounded top, the plates and vents, the port on +x, the handle in its slot on -x, the drum 89 mm thick with its rim and key; 13.2 k tris) | | | | | |
| Sniper | in review (CL-314 on disk 18:20Z: the chassis 51 mm, the action 39, the barrel 38 to 27, the 34 mm scope on 40 mm rings, the bolt's knob kept at x 0.13; 10.8 k tris) | | | | | |
| Launcher | open (GP-20043) | | | | | |
| Flamethrower | open (GP-20044) | | | | | |
| Rotary Gun | open (GP-20041) | | | | | |
| Chainsaw | open (GP-20042) | | | | | |
| Knife and machete | open (GB-310) | | | | | |
| Katana | open (CL-315) | | | | | |
| Grenade | open (CL-315) | | | | | |
| The camo over the whole gun and the suppressor (J20) | open (GP-20045) | | | | | |
