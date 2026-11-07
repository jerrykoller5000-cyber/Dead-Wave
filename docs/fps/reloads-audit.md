# First-person reloads and holds: Claude's audit (CL-308, J19; D-119)

Jerry, 7 Nov: "Go through each reload in all of its various configurations. Akimbo too. Check holds from the hip look accurate
and ads. Remember weapons with stocks should always appear to the player to be against the shoulder." And J18: "the akimbo
revolver cylinders never come out. The grenade launcher cylinder operates in a completely unrealistic and ugly way. The hand
never uses the bolt for sniper."

How: the cloud harness (fpshot steps-rl1/2/3) fires a shot, presses R, then steps the game 12 frames (0.2 s) at a time with
flightHold + stepFrame and screenshots each step, so every reload is a filmstrip at 1280x720; the holds from the AG-251 set and
the fp7 sheets. One line per configuration; "wrong" lines become tasks. Owners: VM_RELOADS/the hands (Claude), the gun's parts
(Grokbot; the launcher ChatGPT), the pairs (Claude CL-301 with Grokbot).

Today the game has ONE reload per gun: the same animation whether rounds are left or not (so a pistol racks the slide after a
tactical reload, which it shouldn't), and the pair reloads are the single's. Those are the first two things to build (CL-306).

| Weapon | Configuration | What the frames show | Verdict | Task |
|---|---|---|---|---|
| Pistol | single, hip, standing | Mag out to the pouch (out of view) and back, seated at the well; then the gun ROLLS 90 degrees to the left to "present the slide" and the support hand covers the whole rear half of the gun for the rack; at u .77 the hand is below the gun, not yet on the slide. | wrong: the roll (a 25-35 degree tilt, the hand pinching the slide's rear over the top); the hand's late arrival; no tactical variant | CL-306 |
| Revolver | single, hip | Cylinder swings out (good); ONE cartridge flies out instead of six empties; the support hand hovers open-palmed near the cylinder with no speedloader or rounds visible in it; closes and back. | wrong: the empties, the loader/rounds in hand | CL-306 (hands), GB-300 (cylinder/rounds parts) |
| Wasp SMG | single, hip | Mag out and in by the support hand (ok); at u .74 ('work') the support hand is nowhere on the gun; at u .88 the support FOREARM sweeps across the whole view from the left (a camo wall) on its way to the top charging knob. | wrong: the rack's arm path (over the top from the left, low, the hand on the knob) | CL-306 |
| GW-4 Carbine | single, hip | Mag leaves the well (good), returns, seats; the gun tilts left ~25 degrees (good); the charging-handle pull at the rear is not visible from the hip view. At the hip the STOCK's rear block stands out in the lower right of the view. | partly: the charging handle unseen; the stock in frame (J19) | CL-306; GB-296 (stock) |
| KR-7 Rifle | single, hip | The mag rocks out forward in the support hand (right, the AK way) and the fresh one rocks in (right); at u .41 the empty mag FLOATS loose below the gun at the lower left, held by nothing; the charging pull: the support forearm crosses the lower left of the view as a camo wall (close to the eye) on its way over the top to the right-side handle (the real move, but the arm passes 10 cm from the eye). | partly: the floating mag; the rack's forearm path (keep it low, the elbow down) | CL-306 |
| Shotgun | single, hip (one shell per cycle) | The gun lifts and tilts a little for ~0.3 s; NO support hand is seen anywhere, no shell, no port: the load happens unseen behind the receiver, which fills the lower centre as a flat grey block. | wrong: the shell load must be seen (the hand brings the shell under to the loading port, thumbs it in); the receiver's block | CL-306; GB-296 (the hold) |
| Breacher-12 | single, hip | The drum comes off downward (ok as a drum), rides the palm out of view and comes back; at u .32 a black box (the drum) FLOATS at the lower left corner of the view; the charging pull at u .78 is unseen. The gun fills ~40 % of the view at the hip, its receiver a flat grey block and its rear standing out at the right. | partly: the floating drum; the pull unseen; the hold too big, the rear in frame (J19) | CL-306; GB-296 (hold) |
| Sniper | single, hip | A box magazine out (floats loose at the lower left at u .18-.27), in and seated; then 'work' for a full second with the support hand clamped over the FOREND by the scope: the bolt, at the rear, is never touched. J18 confirmed: "The hand never uses the bolt for sniper". A bolt-action's firing hand works the bolt after every shot too, and never does. | wrong: the bolt by the firing hand (after each shot and on the reload), the support hand stays on the forend; the loose mag | CL-306 (hands), GB-301 (bolt part) |
| Launcher | single, hip | The whole reload lasts ~0.4 s: the gun pulls back and the drum LIFTS straight up out of the top of the receiver, then drops back; no hand touches it, nothing opens, nothing is loaded. J18 confirmed ("completely unrealistic and ugly"). At the hip the olive stock block fills the lower right (fixed since by GP-20037, to be re-checked). | wrong: the mechanism, the time, the hands | GP-20039 (parts + what the gun is), CL-306 (hands) |
| Flamethrower | single, hip | For 1.8 s the gun shifts right and the support hand leaves the view ('tank', then 'pouch'); the red can under the body never moves: no can comes off, none goes on, nothing is seen changing. Also seen in frame 01: the shot's fireball starts well ahead and LEFT of the nozzle (J10). | wrong: the can must come off (the hand pulls it down and away), a fresh one from the belt goes on with a twist; the can part moves (the burst's origin: GB-295) | CL-306 (hands), GB-295 (origin); the can part: Grokbot (studio/weapon-heavy.js) |
| Rotary Gun | single, hip | The support hand leaves the carry handle ('box', 'pouch') and comes back after 1 s; nothing on the gun changes: no ammo box is seen coming off or going on. | wrong: the box swap must be seen (the box part on the gun's side, the hand to it) | CL-306 (hands); the box part: Grokbot |
| Chainsaw | single, hip (the fuel) | No reload animation at all (reloadU stays null): the gas refill is instant and unseen. | wrong: a cap and a can (the hand unscrews the cap, pours, screws it back), even if short | CL-306; the cap part: Grokbot |
| Pistol pair | akimbo, hip | Both pistols tip down and inward, pointing at the ground in the middle, and sit there for the whole 1.6 s; no magazine leaves, no hand moves; then back up. | wrong: nothing is reloaded; needs the pair's own reload (one gun at a time: the mag out, the fresh one in, the slide; or the stylised akimbo one) | CL-306 (with CL-301's pair) |
| Wasp pair | akimbo, hip | The same: both guns tip down and in for 1.6 s, nothing else. In the frames the two Wasps are canted inward sharply (J11). | wrong: same as the pistol pair; the cant (GB-294) | CL-306; GB-294 |
| Revolver pair | akimbo, hip | The same: both revolvers tip down and in for 1.6 s; NO cylinder opens on either gun (J18 confirmed: "the akimbo revolver cylinders never come out"). | wrong: each cylinder out in turn, the empties, the rounds, closed | CL-306 (hands); GB-300 (the second gun's cylinder) |

## What this adds up to (CL-306's plan)
1. Two reloads per gun, chosen by rounds left: tactical (mag swap only) and empty (plus the slide/bolt/charging handle).
2. The pairs get their own reloads (today the single's is applied to neither gun).
3. The mechanisms that must be seen and aren't: the shotgun's shells, the sniper's bolt (by the firing hand, after each shot too),
   the launcher's cylinder (GP-20039), the flamer's can, the rotary gun's box, the revolver's six empties and the loader, the
   chainsaw's cap. The parts that move are the builders' (Grokbot; the launcher ChatGPT); the hands' paths are mine.
4. The hands' paths: a charging pull never brings the forearm within 15 cm of the eye (the Wasp's and KR-7's sweeps); a pistol's
   rack tilts 25-35 degrees, not 90; the mag never floats (the hand holds it until it is in the pouch).
5. ADS and moving: the same reloads from ADS drop to the hip first (as real), and keep the bob while walking.
Hip and ADS holds (J19): from the AG-251 set, the Breacher's, shotgun's and launcher's receivers fill the lower centre as flat
blocks and their rears stand into the view; the GW-4's stock block shows at the lower right at the hip. GB-296/GP-20037.
