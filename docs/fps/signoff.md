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
| Pistol | open | | | | OK (AG-252): 11-shot review set shot in noon daylight at 20m target on RTX 5080 (qa/fps/pistol/); 01 hip hold shows both gloved hands on grip without view obstruction; 04 ADS sights aligned on target bullseye in 0.2s with zero stock in frame; 03 sprint and motion sequence show J8 fixed (no elbow pop, wrist twist smooth and rate-limited); 0 console errors. | |
| Revolver | open | | | | | |
| Wasp SMG | open | | | | | |
| GW-4 Carbine | open | | | | | |
| KR-7 Rifle | open | | | | | |
| Shotgun | open | | | | | |
| Breacher-12 | open | | | | | |
| Sniper | open | | | | | |
| Launcher | open | | | | | |
| Flamethrower | open | | | | | |
| Chainsaw | sent back (Claude, 7 Nov 06:25Z) | NOT OK: 01-hip-idle and 04-ads-still show one camo forearm filling the lower right, the saw small at the left, no hand on either handle; ADS is all sleeve. Back to GB-292. | NOT OK (same, at full size; a TypeError in the ADS frame's console) | | (struck: its OK conflicted with its own frames) | |
| Rotary Gun | open | | | | | |
| Pistol pair | open | | | | | |
| Wasp pair | open | | | | | |
| Revolver pair | open | | | | | |
| Knife / machete / katana | open | | | | | |
| Grenade throw | open | | | | | |
| Mortar (carry, set, fire) | open | | | | | |
| Building and E (the hands on walls, doors, crates) | open | | | | | |
| Ladders and the mast climb | open | | | | | |
| Empty hands, the flashlight, the torch | open | | | | | |
