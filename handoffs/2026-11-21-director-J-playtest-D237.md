# D-237: Jerry's Training playtest notes (2026-11-21 ~22:14Z)

Jerry tested many weapons and fought 10 zombies at a time (10 of each type) in the Training area. His 13 notes, in his words, with owners.

## P1 (start now, small and clear)
1. "Hitches, hitches everywhere. There was a lot of frame hitching." -> Claude 2 lead (CB-373). Antigravity 2 (AH) records native traces: 10 of each kind, weapon swaps, first shots per gun, kills, decals, smoke. Find every hitch > 33 ms and its cause (shader compile, GC, first-use, decal/particle spikes).
2. "Lag ... fighting ten of each zombie type." -> Claude 2 (CB-373) with item 1: native per-kind frame cost at 10 alive (shambler, brute, spider, each other kind); fix the top costs. 60 fps bar (D-216).
3. "Too many slomo effects after killing a zombie ... From now on lets save the slow-mo for only when the user uses their slo-mo or the final zombie is killed." -> ChatGPT (GP): the kill slow-mo cam plays ONLY (a) when the player uses his own slow-mo, or (b) on the final zombie of a wave/exercise. No other kill triggers it. Standing rule.
5. "Ak bolt manipulation clips through gun on reload." -> ChatGPT 2 (GT) with Claude 5 (motion): the AK charging handle/bolt + the hand on it, no clipping through the gun.
6. "Weird arm bend and elbow thing whenever slapping the bolt on M4" -> Claude 1 (CD-22) with Claude 5: M4 bolt-release slap, natural arm/elbow.
9. "Smoke effect from hot guns looks great when player is static but as soon as you run around the illusion breaks down." -> ChatGPT 2 (GT): barrel smoke must live in the world (spawned at the muzzle, drifting, left behind when moving), not glued to the view.
10. "Decals hanging out where they should not ... zombie door, security door, chain-link fence of the infirmary ... the door retracts. The decals hangs out in empty space." -> ChatGPT (GP): bullet decals parent to the object they hit (moving doors, shutters, fences, props) and move/hide with it; none on see-through fence holes.

## P2 (big, design first, Jerry sees the plan)
4. "Player movement in third person looks bad. Need an overhaul of how all the movements look in 3rd person. The knife and machete look good in first person, but in third they suck. Player still looks a little funny proportionally in third person." -> Claude 9 lead (CI-3, 3P motion overhaul: walk/run/sprint/crouch/jump/land/turn/strafe, weapon holds, knife + machete swings) + Claude 3 (marine body proportions check against real human ratios) + Claude 6 (scale numbers). Plan + side-by-side sheet first.
7. "It's still not satisfying to kill zombies yet. They do not react with enough variation ... fighting a bunch of clones ... Hit reactions unsatisfying. They need to look and act just different enough from each other to feel like you are fighting individuals ... as a part of a horde instead of a horde of clones." -> Claude 5 lead motion (per-zombie gait seed: speed, limp, lean, arm swing, head tilt, timing offsets; directional hit reactions by body part and gun power: flinch, stagger, knockdown, limb hits) + Claude 3 (per-zombie looks: height/build/skin/clothes/damage variation, cheap) + Claude 10 after skulls.
8. "Fighting gameplay not smooth enough to get into." -> ChatGPT (GP) game-feel review: input-to-shot latency, recoil/recovery, aim, hit feedback (marker, sound, blood, impact), weapon swap/reload times, ammo flow; a written list of fixes ranked. Items 1-3 and 7 feed this.
11. "Not enough destructible or damageable props around. Need more effects to feel like you are really shooting the place up." -> Claude 7 (CG-7 widened): more props breakable + surface effects (sparks on steel, dust/chips on concrete, splinters on wood, glass, sheet-metal dents/holes, paper), capped and pooled.
12. "Zombie motion. This is a big one ... I want to see some real personality when it comes to the way that they move and are animated." -> Claude 5 lead (CE-24, after CE-23 death poses), with item 7. Design-first: a motion-personality plan per kind (shambler, brute, spider, ...) with reference clips described in words, then prototypes on one kind, Jerry sees it.
13. "Consistent quality on visual fidelity all around ... the guns look awesome but a prop or texture in another spot breaks the illusion." -> Claude 8 lead (CH-3 fidelity audit): Antigravity walks the Training area natively, Claude 8 ranks every prop/texture/model below the gun bar, with the owner and a fix size; then the owners fix the worst first.

## Rules
- Review copies first, Director LOOK, small landings (D-211). Jerry sees finished zombies and the P2 plans.
- 60 fps bar (D-216) holds for everything.
