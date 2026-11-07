# First-person weapons: the sign-off (D-119)

Jerry, 7 Nov: "We need to get all the FPS stuff down pat. And move towards it being more like an FPS feel. That means top to
bottom checks and reviews from all agents until we nail it. No one agent can call an FPS weapon complete until all agree that
it looks finished."

## How a weapon gets finished
1. Its fixes land (the owner's task), with before/after pictures.
2. Antigravity shoots the review set on Jerry's PC (his launcher, first person, daylight; the list below), one sheet per weapon
   and a short clip of the moves, into qa/fps/<weapon>/.
3. Every crew member looks at that set and writes their line here: OK, or what is wrong (what the picture shows, nothing else).
   Claude, ChatGPT, Grokbot and Antigravity now; Cursor and Muse add theirs when they are back.
4. Anything wrong goes back to its owner as a task; then the set is shot again and everyone looks again.
5. A weapon is "agreed" only when every line is OK on the same set. Nobody marks a weapon done on their own. Claude has the
   final say (Jerry, 7 Nov: "I want you to be the final say on each fps. If something is wrong, anything is wrong, send it
   back through to be fixed"): Claude looks at every picture and frame of the set itself and sends a weapon back for anything,
   however small (a rivet or screw floating off the model, a finger through the grip, one frame that jumps). Jerry has the last word.

## Reloads, every configuration (Jerry, 7 Nov: "Go through each reload in all of its various configurations. Akimbo too.")
Each weapon's reload is reviewed in every configuration it has: single and pair (akimbo), tactical (rounds left) and empty,
at the hip and from ADS, standing, walking and running, and after a switch. The mechanism must be the gun's real one, seen:
the revolver's cylinder swings out and the rounds go in (the pair too, each gun in turn); the launcher's cylinder opens and
turns the way a real break-open or swing-out launcher does; the sniper's bolt is worked by the hand after every shot and on
the reload; the shotgun takes shells one by one; magazines come out and go in by hand; the chainsaw's cap and can; the flamer's
can. Holds: at the hip and in ADS the hands sit where a real shooter's do, and every weapon with a stock shows it against the
shoulder (the stock out of frame or just at the bottom edge), never standing out in the view.

## What Claude looks for, on top of the set
- The model: every part attached (rivets, screws, pins, sights, rails: nothing floating off or inside the body), no gaps at
  the joints, the magazine seated, nothing poking through the hands.
- The arms and hands in every movement, every variation (idle, walk, run, aim, fire, both reloads, switch, pairs): the hands
  on their grips the whole way, fingers round what they hold, wrists at human angles, elbows following the hands, nothing
  snapping, nothing clipping the gun or the view's edge.
- Fluid: no frame where a part jumps; the springs settle; the bob and sway continuous through every change of state.
- The laser (Jerry: "Lasers were jacked up as well in FPS"): from the gun's laser emitter along the barrel line to the hit,
  in first person at the hip and aimed, steady with the gun, not from the eye or the body's gun.

## The review set (each weapon, and each of the hands' actions: the knife, the grenade, the mortar, building, climbing)
Hip idle; walking; running (sprint); aimed (ADS), still and moving; firing at the hip and aimed (the shot from the muzzle);
reloading, both a tactical and an empty reload (the arms' whole movement, for realism); switching to it and away; for pairs, both hands. Look for: the hands on the right places, nothing filling the
view, no stock in frame when aimed, the sight lined up, no popping or jumping in the arms or the gun, no texture popping,
the motion smooth. The yardstick is docs/fps/feel.md.

## The weapons
| Weapon | State | Claude | ChatGPT | Grokbot | Antigravity | Jerry |
|---|---|---|---|---|---|---|
| Pistol | in review (set 2, 7 Nov) | hip, run, ADS OK (J7 0.2 s, J8 no pop); awaiting review on reshoot set 2 | J7/J8 verified; awaiting review on reshoot set 2 | GB-295's muzzle origin in | OK (reshoot set 2: mid-action hip & ADS fire with gold tracer & muzzle flash; reloads tactical and empty at u=0.3, 0.6, 0.8; target backing board updated eliminating white glare; invalid projected sight offsets removed from telemetry) | |
| Revolver | in work (CL-306 b, 7 Nov) | the six empties and the speedloader drive on the cylinder reload (filmed on the wiped build: parts move; re-filming on the restored one) | | | | |
| Wasp SMG | in review (set 1, 7 Nov) | hip/walk/run/ADS frames fine; the set's reload frames (u=.62) show no hand and no magazine (both below the frame on a handgun) and no flash in 06/07: not evidence either way. Reloads judged on my filmstrips: tactical swap OK; the empty one's charging pull still a forearm log low in the view (design choice pending with Jerry). J3 fore-end grip: GB-294 open. | | | OK (set 1: stockless MAC-10 framing, J11 canted, sights centered on 20m plate, mid-action hip & ADS fire with tracer & flash, tactical and empty reloads at u=0.3, 0.6, 0.8 with CL-306 charging pull) | |
| GW-4 Carbine | open | | | | | |
| KR-7 Rifle | open | | | | | |
| Shotgun | in work (CL-306, 7 Nov) | the gun rolls left and lifts for the shell; the port still behind the receiver from the eye (partly) | | | | |
| Breacher-12 | open | | | | | |
| Sniper | in work (GB-301 done; the mirror, 7 Nov 13:20Z) | the firing hand works the bolt after the mag seats and between shots (filmed: right). Not OK yet: the bolt reads on the LEFT in first person (the view mirrors the lefty's hold; all asymmetric parts do): CL-309 proposed to Jerry. | | | | |
| Launcher | reload OK, hold open (7 Nov 15:20Z) | the swing-out reload (GP-20039 + CL-306's hands + the loose round): OK on AG's 5080 sheet (latch, drum out, round between the fingers at .42, seated, key, shut). Open: the hip hold's receiver filling the lower centre as a flat block (GP-20037). | | | OK (4-light, 11-shot set, reload beats) | |
| Flamethrower | in work (CL-306 b, 7 Nov) | the can comes off in the palm, goes to the belt, a fresh one on (re-filming) | | | | |
| Chainsaw | sent back x2 (Claude, 7 Nov 08:30Z) | NOT OK: the redo puts the hands on the right handles (J1 met) but the left forearm lies across the lower-left of the view as a log in every frame of the set; the saw too close. Back to GB-292. | NOT OK (the first set); the redo: not yet reviewed | OK from Grokbot's side (its own fix) | OK ("J1 hands verified"); the forearm not mentioned | |
| Rotary Gun | in work (CL-306 b, 7 Nov) | the box comes off in the palm, to the pouch, a fresh one on (re-filming) | | | | |
| Pistol pair | in work (CL-306 b, 7 Nov) | one gun at a time: the right drops out of the view to its pouch (.06-.50) and comes back loaded, then the left (.48-.92); filmed OK | | | | |
| Wasp pair | in work (CL-306 b, 7 Nov) | as the pistol pair; a sliver of the muzzle at the bottom edge at u .68 (tuned, re-film). The cant: GB-294. | | | | |
| Revolver pair | in work (CL-306 b, 7 Nov) | each gun in turn, up, rolled in, with its cylinder out (GB-300); no empties/loader on the pair yet (no free hand) | | | | |
| Knife / machete / katana | in work (CL-307 a-e, 7 Nov) | the view's own swing: the gun put away, the blade in the firing hand (machete chop filmed in the cloud: raised, swept across with the flat to the eye, follow-through, back); the knife's thrust and the katana's cut authored, not filmed | | | | |
| Grenade throw | in work (CL-307 c/f, 7 Nov) | the support hand to the pouch, cocked beside the head while G is held, the whip, the open hand's follow-through, back (filmed in the cloud; the grenade in the fist hard to see: hold offset raised) | | | | |
| Mortar (carry, set, fire) | open | | | | | |
| Building and E (the hands on walls, doors, crates) | open | | | | | |
| Ladders and the mast climb | open | | | | | |
| Empty hands, the flashlight, the torch | open | | | | | |
