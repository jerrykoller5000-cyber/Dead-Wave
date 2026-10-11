# More sounds for ElevenLabs (CL-155)

179 prompts for everything that isn't a zombie: what the game is **silent** for now, and what it **synthesizes** now that a recording would make better. Each prompt gives four takes; drop them in the folder named under it, inside `z-sounds/`. Same settings as before: Sound Effects, Duration as shown (or Auto), Prompt influence about 0.6, Loop only where it says LOOP.

- **MISSING** (35): the game makes no sound there now.
- **UPGRADE** (127): the game makes it from synthesis now; a recording should be better.
- **TRY** (17): the gunfire, synthesized and already decent (CL-135). Record it, compare, keep whichever hits harder.

**Start with the ★ ones** (39): heard all the time, or silent where it matters most.

These folders aren't wired into the game yet. When takes are in, tell Claude and each one goes in the way the zombie sounds did (a folder with no takes keeps the game's own sound).

## The Gravewalker (his body, his gear)

**1. `player/footstep-dirt`** ★ · UPGRADE · 0.5 s  
Now: footstep(dry)

```
A single soldier's combat boot footstep on packed dirt and short grass, outdoors, close. No music, no voice.
```

**2. `player/footstep-run-dirt`** ★ · UPGRADE · 0.4 s  
Now: footstep(dry, running)

```
A single fast running combat boot footstep on dirt, a heavier scuffing impact, close. No music, no voice.
```

**3. `player/footstep-wood`** ★ · UPGRADE · 0.5 s  
Now: footstepWood()

```
A single combat boot footstep on hollow wooden floorboards, a deep knock with a small creak. No music, no voice.
```

**4. `player/footstep-water`** · UPGRADE · 0.6 s  
Now: footstep(wet)

```
A single footstep wading through shallow water, a splash and a drip. No music, no voice.
```

**5. `player/footstep-tile`** ★ · UPGRADE · 0.4 s  
Now: trainingCue('step') (a tone now)

```
A single combat boot footstep on a smooth tiled concrete floor indoors, a crisp tap with a short room echo. No music, no voice.
```

**6. `player/jump`** · UPGRADE · 0.5 s  
Now: jump()

```
A soldier jumping: a short effort exhale and the rustle and clink of gear and webbing. No music, no voice.
```

**7. `player/land`** ★ · MISSING · 0.5 s  
Now: (silent)

```
A soldier landing from a jump onto dirt: a heavy boot thud and a rattle of gear. No music, no voice.
```

**8. `player/dodge-roll`** · UPGRADE · 0.8 s  
Now: dodgeRoll()

```
A soldier diving and rolling on the ground: cloth and gear thumping on dirt, a grunt-free tumble. No music, no voice.
```

**9. `player/vault`** · MISSING · 0.8 s  
Now: (silent)

```
A soldier vaulting over a low wall: hands slapping concrete, gear scraping, boots landing. No music, no voice.
```

**10. `player/ladder-climb`** · MISSING · 0.6 s  
Now: (silent: the HQ ladder, the tower)

```
A single step climbing a metal ladder: a boot on a steel rung and a hand gripping the rail. No music, no voice.
```

**11. `player/swim-stroke`** · MISSING · 1 s  
Now: (silent)

```
A single swimming stroke in a lake: an arm pulling through water and a soft splash. No music, no voice.
```

**12. `player/hurt`** ★ · UPGRADE · 0.6 s  
Now: playerHurt()

```
A short pained grunt from a tough male soldier who has just been hit, through clenched teeth. No words.
```

**13. `player/hurt-heavy`** · MISSING · 0.8 s  
Now: (playerHurt for every hit)

```
A male soldier's sharp cry of pain from a heavy blow, winded. No words.
```

**14. `player/death`** · MISSING · 1.5 s  
Now: (silent)

```
A male soldier's last choked gasp as he collapses, and his body and gear hitting the ground. No words.
```

**15. `player/breath-tired`** · UPGRADE · 2 s  
Now: playerBreath()

```
A tired male soldier's heavy breathing after sprinting, three hard breaths. No words.
```

**16. `player/heartbeat-low`** · UPGRADE · 1.2 s · LOOP  
Now: heartbeat()

```
A slow, heavy, muffled heartbeat heard from inside the body, two beats, for low health. No music, no voice.
```

**17. `player/armor-hit`** ★ · UPGRADE · 0.4 s  
Now: armorHit()

```
A blow landing on a soldier's ballistic body armor plate: a dull hard thump with a ceramic crack. No music, no voice.
```

**18. `player/armor-don`** · UPGRADE · 1.2 s  
Now: armorDon()

```
A soldier strapping on a plate carrier: velcro ripping and straps cinching tight. No music, no voice.
```

**19. `player/medpen`** ★ · UPGRADE · 0.8 s  
Now: medPen()

```
An auto-injector pen jabbed into a thigh: a sharp click, a hiss of the spring, a quick relieved exhale. No music, no voice.
```

**20. `player/nvg-on`** · UPGRADE · 0.8 s  
Now: nvgToggle(on)

```
Night vision goggles flipping down and powering on: a mechanical click and a rising high-pitched electronic whine. No music, no voice.
```

**21. `player/nvg-off`** · UPGRADE · 0.6 s  
Now: nvgToggle(off)

```
Night vision goggles flipping up and powering off: a click and a falling electronic whine. No music, no voice.
```

**22. `player/nvg-hum`** · UPGRADE · 4 s · LOOP  
Now: nvgHum()

```
A very quiet, steady high electronic hum of night vision goggles running, seamless. No music, no voice.
```

**23. `player/flashlight-click`** · UPGRADE · 0.3 s  
Now: nvgClick()

```
A weapon-mounted flashlight's tactical tail switch clicking on, a crisp plastic click. No music, no voice.
```

**24. `player/chute-land`** · MISSING · 1.2 s  
Now: (silent)

```
A paratrooper landing on grass: boots thumping down, a stumble and the parachute canopy collapsing with a flutter. No music, no voice.
```

**25. `player/burial-dig`** · UPGRADE · 1 s  
Now: gravePat()

```
A shovel pushing into dirt and patting a grave mound flat, two pats. No music, no voice.
```

**26. `player/burial-chisel`** · UPGRADE · 0.8 s  
Now: chisel()

```
A hammer striking a chisel on a stone grave marker, two ringing strikes with stone chips. No music, no voice.
```

**27. `player/burial-heave`** · UPGRADE · 1 s  
Now: heave()

```
A male soldier straining to lift something heavy, a deep effort grunt. No words.
```

## Weapon handling: reloads, actions, blades, the chainsaw

**28. `weapon-foley/mag-out`** ★ · UPGRADE · 0.5 s  
Now: foley magOut

```
A rifle magazine being pulled out of the magazine well, a metallic slide and click. No music, no voice.
```

**29. `weapon-foley/mag-in`** ★ · UPGRADE · 0.5 s  
Now: foley magIn

```
A rifle magazine being inserted and locked into the magazine well, a solid metal click. No music, no voice.
```

**30. `weapon-foley/mag-slap`** · UPGRADE · 0.4 s  
Now: foley magSlap

```
A palm slapping the bottom of a seated rifle magazine, a firm plastic and metal thump. No music, no voice.
```

**31. `weapon-foley/mag-release`** · UPGRADE · 0.3 s  
Now: foley magRelease

```
A pistol magazine release button pressed, a small sharp click. No music, no voice.
```

**32. `weapon-foley/mag-drop`** · UPGRADE · 0.6 s  
Now: foley magDrop

```
An empty metal magazine dropping onto dirt and bouncing once. No music, no voice.
```

**33. `weapon-foley/slide-back`** ★ · UPGRADE · 0.4 s  
Now: foley slideBack

```
A pistol slide racked back, a crisp metallic scrape. No music, no voice.
```

**34. `weapon-foley/slide-forward`** ★ · UPGRADE · 0.4 s  
Now: foley slideFwd

```
A pistol slide snapping forward into battery, a sharp metallic clack. No music, no voice.
```

**35. `weapon-foley/charging-handle`** · MISSING · 0.6 s  
Now: (slide sounds now)

```
An assault rifle charging handle pulled back and released, a springy metallic clack. No music, no voice.
```

**36. `weapon-foley/bolt-cycle`** · UPGRADE · 1.2 s  
Now: foley boltUp/Back/Fwd/Down

```
A bolt-action sniper rifle cycled: bolt lifted, pulled back, pushed forward and locked down, four crisp metallic motions. No music, no voice.
```

**37. `weapon-foley/pump-back`** ★ · UPGRADE · 0.4 s  
Now: foley pumpBack

```
A pump shotgun's fore-end pulled back, a rough metallic clack. No music, no voice.
```

**38. `weapon-foley/pump-forward`** ★ · UPGRADE · 0.4 s  
Now: foley pumpFwd

```
A pump shotgun's fore-end pushed forward, a solid metallic clack. No music, no voice.
```

**39. `weapon-foley/shell-insert`** · UPGRADE · 0.4 s  
Now: foley shell

```
A single shotgun shell pushed into the loading port, a short brass and spring click. No music, no voice.
```

**40. `weapon-foley/cylinder-open`** · UPGRADE · 0.5 s  
Now: foley cylinderOpen

```
A revolver cylinder swung open, a metallic click and swing. No music, no voice.
```

**41. `weapon-foley/cylinder-spin`** · UPGRADE · 0.8 s  
Now: foley cylinderSpin

```
A revolver cylinder spun and snapped closed, a ratcheting whir and a click. No music, no voice.
```

**42. `weapon-foley/drum-out`** · UPGRADE · 0.6 s  
Now: foley drumOut

```
A heavy drum magazine unlatched and pulled off a shotgun, a clunky metal release. No music, no voice.
```

**43. `weapon-foley/drum-in`** · UPGRADE · 0.6 s  
Now: foley drumIn

```
A heavy drum magazine seated onto a shotgun, a deep metal clunk and latch. No music, no voice.
```

**44. `weapon-foley/belt-feed`** · UPGRADE · 1.2 s  
Now: foley belt, boxLatch, boxSeat

```
A machine gun feed tray cover opened, an ammunition belt laid in with rattling links, the cover slammed shut. No music, no voice.
```

**45. `weapon-foley/launcher-open`** · UPGRADE · 0.6 s  
Now: foley tubeOpen

```
A grenade launcher breech opened, a heavy metal hinge clack. No music, no voice.
```

**46. `weapon-foley/launcher-shell`** · UPGRADE · 0.6 s  
Now: foley tubeShell

```
A 40mm grenade round pushed into a launcher tube and the breech snapped shut. No music, no voice.
```

**47. `weapon-foley/dry-fire`** ★ · UPGRADE · 0.3 s  
Now: foley dryFire

```
A gun's hammer falling on an empty chamber, a hollow dry click. No music, no voice.
```

**48. `weapon-foley/brass`** ★ · UPGRADE · 0.6 s  
Now: foley brass

```
A single spent brass rifle casing falling on dirt and a stone, a small tinkling bounce. No music, no voice.
```

**49. `weapon-foley/brass-concrete`** · MISSING · 0.6 s  
Now: (foley brass everywhere)

```
A single spent brass casing bouncing on a concrete floor, a bright tinkling ring. No music, no voice.
```

**50. `weapon-foley/weapon-switch`** · UPGRADE · 0.6 s  
Now: foley weaponSwitch

```
A soldier swapping weapons: a rifle sling shifting and a pistol drawn from a holster, quick gear rustle. No music, no voice.
```

**51. `weapon-foley/wheel-tick`** · UPGRADE · 0.15 s  
Now: foley wheelTick

```
A tiny soft mechanical tick, like a selection dial clicking one notch. No music, no voice.
```

**52. `weapon-foley/grenade-pin`** · UPGRADE · 0.8 s  
Now: foley grenadePin

```
A hand grenade pin pulled and the spoon flying off with a metallic ping. No music, no voice.
```

**53. `weapon-foley/grenade-bounce`** · UPGRADE · 0.5 s  
Now: foley grenadeBounce

```
A hand grenade bouncing once on dirt, a heavy metallic thunk. No music, no voice.
```

**54. `weapon-foley/knife-swing`** · UPGRADE · 0.4 s  
Now: foley knifeSwing

```
A combat knife slashing fast through the air, a short sharp whoosh. No music, no voice.
```

**55. `weapon-foley/knife-hit`** · UPGRADE · 0.4 s  
Now: foley knifeHit

```
A combat knife stabbing into flesh, a wet thick thud. No music, no voice.
```

**56. `weapon-foley/machete-swing`** · UPGRADE · 0.5 s  
Now: foley macheteSwing

```
A heavy machete swung hard through the air, a deep whoosh. No music, no voice.
```

**57. `weapon-foley/machete-chop`** · UPGRADE · 0.5 s  
Now: foley macheteChop

```
A machete chopping into a body, a heavy wet crunch. No music, no voice.
```

**58. `weapon-foley/chainsaw-start`** · UPGRADE · 1.5 s  
Now: chainsawStart()

```
A chainsaw pull-started: a cord yank, the engine catching and sputtering into idle. No music, no voice.
```

**59. `weapon-foley/chainsaw-idle`** · UPGRADE · 3 s · LOOP  
Now: chainsawEngine (synth loop)

```
A chainsaw idling, a steady rattling two-stroke engine, seamless. No music, no voice.
```

**60. `weapon-foley/chainsaw-rev`** · UPGRADE · 2 s  
Now: chainsawSetRev (synth)

```
A chainsaw revving to full throttle and holding, a loud screaming two-stroke engine. No music, no voice.
```

**61. `weapon-foley/chainsaw-cut`** · UPGRADE · 2 s  
Now: chainsawGrit()

```
A chainsaw at full throttle cutting through flesh and bone, a grinding wet bite. No music, no voice.
```

**62. `weapon-foley/chainsaw-stop`** · UPGRADE · 1 s  
Now: chainsawStop()

```
A chainsaw engine cut off, winding down and the chain rattling to a stop. No music, no voice.
```

## Gunfire and blasts (synthesized now and decent: record, compare, keep the better)

**63. `weapons/pistol`** · TRY · 1 s  
Now: GUN pistol

```
A single 9mm handgun shot outdoors, sharp crack with a short natural echo. No music, no voice.
```

**64. `weapons/revolver`** · TRY · 1.2 s  
Now: GUN revolver

```
A single .357 revolver shot outdoors, a loud booming crack with echo. No music, no voice.
```

**65. `weapons/smg`** · TRY · 0.8 s  
Now: GUN uzi (Wasp SMG)

```
A single submachine gun shot outdoors, a fast snappy crack, short echo. No music, no voice.
```

**66. `weapons/carbine`** · TRY · 1 s  
Now: GUN m4 (GW-4 Carbine)

```
A single 5.56 assault rifle shot outdoors, a punchy crack with a rolling echo. No music, no voice.
```

**67. `weapons/rifle`** · TRY · 1 s  
Now: GUN ak (KR-7 Rifle)

```
A single 7.62 battle rifle shot outdoors, a deep heavy crack with a rolling echo. No music, no voice.
```

**68. `weapons/shotgun`** · TRY · 1.2 s  
Now: GUN shotgun (Breacher-12)

```
A single 12 gauge pump shotgun blast outdoors, a huge deep boom with echo. No music, no voice.
```

**69. `weapons/auto-shotgun`** · TRY · 1 s  
Now: GUN aa12

```
A single automatic shotgun blast outdoors, a thick punchy boom. No music, no voice.
```

**70. `weapons/sniper`** · TRY · 2 s  
Now: GUN sniper

```
A single high-powered sniper rifle shot outdoors, a massive crack echoing across a valley. No music, no voice.
```

**71. `weapons/machine-gun`** · TRY · 1 s  
Now: GUN m240 (Watchman MG)

```
A short burst of three shots from a belt-fed machine gun outdoors, heavy and rhythmic, with echo. No music, no voice.
```

**72. `weapons/rotary-gun`** · TRY · 2 s  
Now: GUN minigun (Rotary Gun)

```
A rotary machine gun firing a two second burst, a continuous ripping roar. No music, no voice.
```

**73. `weapons/rotary-spin`** · TRY · 1.5 s  
Now: minigunSpin()

```
A rotary machine gun's barrels spinning up from rest with an electric motor whine, no shooting. No music, no voice.
```

**74. `weapons/grenade-launcher`** · TRY · 1.2 s  
Now: GUN launcher

```
A 40mm grenade launcher firing, a hollow deep thump. No music, no voice.
```

**75. `weapons/mortar-launch`** · TRY · 1.5 s  
Now: GUN mortar

```
A 60mm mortar round firing from its tube, a loud hollow whump. No music, no voice.
```

**76. `weapons/explosion`** · TRY · 2.5 s  
Now: GUN boom (grenadeBoom)

```
A hand grenade exploding outdoors, a sharp deep blast with dirt and debris raining down. No music, no voice.
```

**77. `weapons/flamethrower`** · TRY · 3 s · LOOP  
Now: flameOn / flameBurst / fireHiss

```
A flamethrower spraying a jet of fire, a roaring whoosh with a hissing gas jet, seamless. No music, no voice.
```

## Bullets meeting the world

**78. `bullet-impacts/dirt`** ★ · UPGRADE · 0.5 s  
Now: impactDirt

```
A bullet hitting dirt, a short thud with a spray of earth. No music, no voice.
```

**79. `bullet-impacts/rock`** · UPGRADE · 0.5 s  
Now: impactRock

```
A bullet hitting rock, a sharp crack with stone chips. No music, no voice.
```

**80. `bullet-impacts/metal`** ★ · UPGRADE · 0.5 s  
Now: impactMetal

```
A bullet hitting a steel plate, a loud bright clang. No music, no voice.
```

**81. `bullet-impacts/wood`** · UPGRADE · 0.5 s  
Now: impactWood

```
A bullet hitting thick wood, a hard thock with splinters. No music, no voice.
```

**82. `bullet-impacts/water`** · UPGRADE · 0.5 s  
Now: impactWater

```
A bullet hitting water, a quick sharp splash. No music, no voice.
```

**83. `bullet-impacts/sand`** · UPGRADE · 0.5 s  
Now: impactSand

```
A bullet hitting sandbags, a muffled punch and a hiss of sand. No music, no voice.
```

**84. `bullet-impacts/ricochet`** ★ · UPGRADE · 0.8 s  
Now: ricochet

```
A bullet ricocheting off stone, a whining zing flying away. No music, no voice.
```

**85. `bullet-impacts/leaves`** · UPGRADE · 0.5 s  
Now: leafHit

```
A bullet ripping through tree leaves and twigs, a quick rustle and snap. No music, no voice.
```

## His builds

**86. `builds/place-wood`** ★ · UPGRADE · 0.8 s  
Now: place() / buildSound

```
Hammering a wooden barricade together, three quick hammer blows on planks. No music, no voice.
```

**87. `builds/place-sandbag`** · UPGRADE · 0.8 s  
Now: place()

```
A heavy sandbag dropped and patted into place, a soft heavy thump. No music, no voice.
```

**88. `builds/place-metal`** · UPGRADE · 0.8 s  
Now: place()

```
A steel plate wall bolted into place, a clank and a power drill burst. No music, no voice.
```

**89. `builds/place-wire`** · UPGRADE · 1 s  
Now: place()

```
Barbed wire unrolled and stretched on posts, a metallic twang and creak. No music, no voice.
```

**90. `builds/place-turret`** · UPGRADE · 1 s  
Now: place()

```
An automated gun turret set down and powering on, a heavy clunk and a rising servo whir. No music, no voice.
```

**91. `builds/upgrade`** ★ · MISSING · 1.2 s  
Now: (silent: upgradeTarget)

```
Reinforcing a fortification: a power drill, a wrench tightening, a satisfying final clank. No music, no voice.
```

**92. `builds/repair`** · UPGRADE · 1 s  
Now: repairClank()

```
Repairing a damaged barricade: two hammer blows and a wrench ratchet. No music, no voice.
```

**93. `builds/sell`** · UPGRADE · 0.8 s  
Now: sellChime()

```
Dismantling a fortification and pocketing scrap: a crowbar pry, planks clattering and a coin jingle. No music, no voice.
```

**94. `builds/invalid`** · UPGRADE · 0.4 s  
Now: invalid()

```
A short low dull buzz, a 'no' sound for an action that is not allowed, game interface. No music, no voice.
```

**95. `builds/door-open`** · UPGRADE · 0.8 s  
Now: doorSound(open)

```
A heavy reinforced wooden door swinging open, a creaking hinge. No music, no voice.
```

**96. `builds/door-close`** · UPGRADE · 0.8 s  
Now: doorSound(close)

```
A heavy reinforced wooden door slamming shut, a solid thump and latch. No music, no voice.
```

**97. `builds/stairs-fold`** · UPGRADE · 1 s  
Now: toggleStairs / buildSound

```
A folding wooden stair ladder swinging down and thumping into place. No music, no voice.
```

**98. `builds/mine-beep`** · UPGRADE · 0.4 s  
Now: mineBeep()

```
A landmine arming, a short high electronic beep. No music, no voice.
```

**99. `builds/spike-snap`** · UPGRADE · 0.6 s  
Now: spikeSnap()

```
A spike trap snapping shut on something, a sharp spring and a wet crunch. No music, no voice.
```

**100. `builds/lure`** ★ · MISSING · 4 s · LOOP  
Now: (silent: the lure build)

```
A battery-powered noise lure: a loud repeating electronic siren chirp meant to attract attention, seamless. No music, no voice.
```

## Turrets and crewed guns

**101. `turrets/light-turret-fire`** · TRY · 0.6 s  
Now: turretShot (GUN turret)

```
An automated sentry gun firing a short burst, a fast mechanical rattle of small caliber shots. No music, no voice.
```

**102. `turrets/heavy-turret-fire`** · TRY · 0.8 s  
Now: turretShot (GUN turretHeavy)

```
A heavy automated turret firing two big shots, deep thumping booms. No music, no voice.
```

**103. `turrets/servo`** · UPGRADE · 0.6 s  
Now: turretServos()

```
A gun turret's servo motors swiveling to track a target, a short electric whir. No music, no voice.
```

**104. `turrets/mortar-mount`** ★ · MISSING · 1 s  
Now: (silent: mountMortar)

```
A soldier kneeling down behind a mortar tube, gear settling and a hand grabbing the metal tube. No music, no voice.
```

**105. `turrets/mortar-round-drop`** ★ · MISSING · 0.8 s  
Now: (the shot only)

```
A mortar round slid into the mortar tube by hand, a metallic scrape sliding down the tube. No music, no voice.
```

**106. `turrets/mortar-incoming`** · MISSING · 2 s  
Now: (silent)

```
A mortar shell whistling down through the air before impact, a falling whistle. No music, no voice.
```

**107. `turrets/mortar-dismount`** · MISSING · 0.8 s  
Now: (silent: dismountMortar)

```
A soldier standing up from a mortar, gear rattling. No music, no voice.
```

**108. `turrets/machine-gun-mount`** · MISSING · 0.8 s  
Now: (silent)

```
A soldier grabbing a tripod-mounted machine gun, the tripod legs creaking and a charging handle pulled. No music, no voice.
```

## FOB Threshold and the day's business

**109. `hq/alarm-klaxon`** ★ · UPGRADE · 2 s  
Now: klaxon()

```
A military base alarm klaxon, one long loud blaring blast, echoing. No music, no voice.
```

**110. `hq/alarm-rumble`** · UPGRADE · 3 s  
Now: alarmRumble()

```
A deep distant rumble rolling across a valley at night, the ground trembling. No music, no voice.
```

**111. `hq/flare-launch`** · UPGRADE · 1.5 s  
Now: flareWhistle()

```
A signal flare fired into the sky, a pop and a rising whistle. No music, no voice.
```

**112. `hq/flare-burst`** · UPGRADE · 2 s  
Now: flareBurst()

```
A signal flare bursting high in the sky, a soft pop and a crackling fizz. No music, no voice.
```

**113. `hq/kiosk-shutter-open`** · UPGRADE · 1.2 s  
Now: shutter(open)

```
A metal roll-up shutter rattling open on a supply kiosk. No music, no voice.
```

**114. `hq/kiosk-shutter-close`** · UPGRADE · 1.2 s  
Now: shutter(close)

```
A metal roll-up shutter rattling closed and hitting the bottom. No music, no voice.
```

**115. `hq/kiosk-buy`** ★ · UPGRADE · 0.8 s  
Now: kioskBuy()

```
A military supply terminal purchase: an electronic confirmation beep and a crate clunk. No music, no voice.
```

**116. `hq/kiosk-tab`** · UPGRADE · 0.2 s  
Now: kioskTab()

```
A short soft electronic interface tick, a terminal tab changing. No music, no voice.
```

**117. `hq/cash`** · UPGRADE · 0.6 s  
Now: coin()

```
A few coins and dog tags jingling into a pouch. No music, no voice.
```

**118. `hq/skull-pickup`** · UPGRADE · 0.6 s  
Now: skullPickup()

```
Picking up a zombie skull: a hollow bony knock and a wet squelch. No music, no voice.
```

**119. `hq/bag-throw`** · UPGRADE · 1 s  
Now: bagThrow()

```
A heavy sack full of skulls thrown onto a counter, a rattling bony thud. No music, no voice.
```

**120. `hq/hq-machine`** · UPGRADE · 1.5 s  
Now: hqMachine()

```
An old military intake machine grinding and clanking as it processes something. No music, no voice.
```

**121. `hq/hq-ding`** · UPGRADE · 0.8 s  
Now: hqDing()

```
A single old mechanical service bell ding. No music, no voice.
```

**122. `hq/pickup`** · UPGRADE · 0.5 s  
Now: pickup()

```
Picking up supplies: a quick rustle of a pouch and a click. No music, no voice.
```

**123. `hq/crate-land`** · UPGRADE · 1.5 s  
Now: crateLand()

```
A heavy supply crate on a parachute landing on dirt, a big wooden thud and a canopy flutter. No music, no voice.
```

**124. `hq/radio-call`** ★ · MISSING · 2 s  
Now: (silent: the radio calls are text)

```
A military field radio crackling on with static and a squelch beep, no voice.
```

**125. `hq/radio-off`** · MISSING · 0.6 s  
Now: (silent)

```
A military field radio clicking off with a short squelch. No music, no voice.
```

**126. `hq/armory-bench`** · MISSING · 1.2 s  
Now: (silent: the Armory)

```
A gunsmith working on a rifle on a workbench: a part sliding on, a screw tightened, a click. No music, no voice.
```

**127. `hq/cif-locker`** · MISSING · 1 s  
Now: (shutter now)

```
A metal equipment locker door opening and gear being taken off a hook. No music, no voice.
```

## The valley: weather, water, fire, wildlife

**128. `world/wind-day`** ★ · UPGRADE · 10 s · LOOP  
Now: ambience (synth)

```
Gentle daytime wind through a pine forest valley, rustling needles, calm, seamless. No music, no voice.
```

**129. `world/wind-night`** ★ · UPGRADE · 10 s · LOOP  
Now: ambience (synth)

```
Cold night wind in a forest valley, low and eerie, distant creaking trees, seamless. No music, no voice.
```

**130. `world/crickets-night`** ★ · UPGRADE · 10 s · LOOP  
Now: ambience crickets (synth)

```
Crickets and night insects in a forest clearing, steady, seamless. No music, no voice.
```

**131. `world/river`** · UPGRADE · 10 s · LOOP  
Now: ambience water (synth)

```
A small rocky river flowing steadily, close, seamless. No music, no voice.
```

**132. `world/lake-shore`** · MISSING · 10 s · LOOP  
Now: (ambience water)

```
Small waves lapping on a lake shore and a wooden dock, gentle, seamless. No music, no voice.
```

**133. `world/rain`** ★ · UPGRADE · 10 s · LOOP  
Now: rainStart() (synth loop)

```
Steady rain falling on a forest and on canvas and metal roofs, seamless. No music, no voice.
```

**134. `world/thunder`** ★ · UPGRADE · 6 s  
Now: thunder()

```
A distant rolling thunder clap rumbling across mountains. No music, no voice.
```

**135. `world/lightning-strike`** · UPGRADE · 4 s  
Now: lightningStrike()

```
A close lightning strike: a sharp crackling snap and an immediate huge thunder crack. No music, no voice.
```

**136. `world/birds-day`** · UPGRADE · 4 s  
Now: birdChirp()

```
A few forest songbirds chirping in the morning, distant, sparse. No music, no voice.
```

**137. `world/owl`** · UPGRADE · 2 s  
Now: owlHoot()

```
A single owl hooting twice at night in a forest, distant. No music, no voice.
```

**138. `world/campfire`** · UPGRADE · 8 s · LOOP  
Now: fireCrackle() (synth)

```
A campfire crackling and popping, close, seamless. No music, no voice.
```

**139. `world/fire-burning`** · UPGRADE · 6 s · LOOP  
Now: fireHiss()

```
A large fire burning, roaring and hissing, seamless. No music, no voice.
```

**140. `world/tree-fall`** ★ · UPGRADE · 3 s  
Now: treeFell()

```
A large pine tree cracking at the base and crashing down through branches to the ground. No music, no voice.
```

**141. `world/tree-thud`** · UPGRADE · 1 s  
Now: treeThud()

```
A bullet or blade striking a thick tree trunk, a solid woody thunk. No music, no voice.
```

**142. `world/rock-break`** · UPGRADE · 1.5 s  
Now: rockBreak()

```
A boulder cracking apart, stone breaking and rubble tumbling. No music, no voice.
```

**143. `world/big-splash`** · UPGRADE · 1.5 s  
Now: bigSplash()

```
A person falling into a lake, a big deep splash. No music, no voice.
```

**144. `world/surface-gasp`** · UPGRADE · 1.2 s  
Now: surface()

```
A man bursting up out of water and gasping for air, dripping. No words.
```

**145. `world/rabbit-screech`** · UPGRADE · 1 s  
Now: rabbitScreech()

```
A rabid rabbit's shrill, unnatural screech, small and nasty. No music, no voice.
```

**146. `world/cave-mouth`** · MISSING · 8 s · LOOP  
Now: (caveGroan now and then)

```
Wind breathing in and out of a dark cave mouth, hollow and low, with faint drips, seamless. No music, no voice.
```

**147. `world/pit-rumble`** · UPGRADE · 4 s  
Now: pitRumble()

```
A deep rumble from under a lake, with large bubbles breaking the surface. No music, no voice.
```

**148. `world/barrel-explode`** · UPGRADE · 2.5 s  
Now: grenadeBoom (barrel)

```
A fuel drum exploding: a heavy whoomp of a fireball and metal shrapnel. No music, no voice.
```

## The Hollows under the caves

**149. `below/warren-ambience`** · UPGRADE · 10 s · LOOP  
Now: belowState ambience (synth)

```
An underground tunnel network: low distant rumbles, water dripping, stale air, oppressive, seamless. No music, no voice.
```

**150. `below/drip`** · MISSING · 1 s  
Now: (silent)

```
A single water drop falling into a puddle in a stone cave, with echo. No music, no voice.
```

**151. `below/rock-groan`** · UPGRADE · 3 s  
Now: rockGroan()

```
Deep stone groaning and shifting in a cave ceiling, a few grains falling. No music, no voice.
```

## Aircraft and the way out

**152. `vehicles/cargo-plane-flyover`** ★ · UPGRADE · 6 s  
Now: planeFlyover()

```
A four-engine military propeller cargo plane flying low overhead and away. No music, no voice.
```

**153. `vehicles/cargo-plane-interior`** · MISSING · 10 s · LOOP  
Now: (silent: the drop-in)

```
The inside of a military propeller cargo plane in flight: loud engine drone and wind roar through an open ramp, seamless. No music, no voice.
```

**154. `vehicles/chute-open`** · UPGRADE · 1.2 s  
Now: chuteOpen()

```
A parachute canopy deploying with a loud whoosh and a snap of lines. No music, no voice.
```

**155. `vehicles/floatplane-approach`** ★ · MISSING · 8 s  
Now: (silent: Heron)

```
A twin-engine propeller floatplane approaching and descending over a lake, engines rising then easing off. No music, no voice.
```

**156. `vehicles/floatplane-landing`** · MISSING · 4 s  
Now: (silent)

```
A floatplane touching down on a lake: floats skimming and spraying water, engines easing. No music, no voice.
```

**157. `vehicles/floatplane-idle`** · MISSING · 8 s · LOOP  
Now: (silent)

```
A twin-engine floatplane idling on the water at a dock, propellers ticking over, water lapping, seamless. No music, no voice.
```

**158. `vehicles/floatplane-takeoff`** · MISSING · 8 s  
Now: (silent)

```
A floatplane throttling up and taking off from a lake, engines roaring and spray, flying away. No music, no voice.
```

## Menus and the night's big moments

**159. `ui/click`** ★ · MISSING · 0.15 s  
Now: (silent: menu buttons)

```
A short crisp interface click, like a heavy military switch, game menu. No music.
```

**160. `ui/hover`** · MISSING · 0.1 s  
Now: (silent)

```
A very soft tiny interface tick for hovering over a menu button. No music.
```

**161. `ui/back`** · MISSING · 0.3 s  
Now: (silent)

```
A soft low interface click for closing a menu. No music.
```

**162. `ui/map-open`** · MISSING · 0.8 s  
Now: (silent: the map)

```
A paper map being unfolded, a quick crinkle and flap. No music.
```

**163. `ui/map-close`** · MISSING · 0.6 s  
Now: (silent)

```
A paper map being folded up. No music.
```

**164. `ui/wave-start`** ★ · UPGRADE · 2.5 s  
Now: waveStart()

```
A deep ominous horn blast signalling an attack, with a heavy drum hit under it.
```

**165. `ui/streak`** · UPGRADE · 0.8 s  
Now: streak()

```
A short rising punchy reward sound for a kill streak, gritty and military, not cute.
```

**166. `ui/day-cleared`** · UPGRADE · 3 s  
Now: dayCleared()

```
A short triumphant brass fanfare for surviving the night, four notes, military.
```

**167. `ui/game-over`** · UPGRADE · 3 s  
Now: gameOver()

```
A low mournful brass sting with a deep drum hit for a defeat.
```

**168. `ui/victory`** · UPGRADE · 4 s  
Now: win()

```
A swelling triumphant orchestral brass sting for a victory.
```

**169. `ui/objective`** · MISSING · 1 s  
Now: (the cue mp3 only in some places)

```
A short confident radio chirp and a soft chime for completing an objective. No music.
```

## The Training Ground (its cues are beeps now)

**170. `training/target-hit`** ★ · UPGRADE · 0.8 s  
Now: trainingCue('target')

```
A bullet hitting a steel shooting target plate, a loud bright ringing ping. No music, no voice.
```

**171. `training/target-fall`** · MISSING · 1 s  
Now: (silent)

```
A steel shooting target plate falling backwards and slamming flat on a concrete floor. No music, no voice.
```

**172. `training/target-rise`** · UPGRADE · 1.2 s  
Now: trainingCue('reset')

```
A spring-loaded steel target plate swinging back up, a mechanical clank. No music, no voice.
```

**173. `training/wall-impact`** · UPGRADE · 0.4 s  
Now: trainingCue('impact')

```
A bullet hitting a tiled concrete wall indoors, a sharp crack with dust. No music, no voice.
```

**174. `training/ventilation`** · UPGRADE · 10 s · LOOP  
Now: 60 Hz hum (synth)

```
An industrial building's ventilation system humming and blowing air, steady, seamless. No music, no voice.
```

**175. `training/light-switch`** · UPGRADE · 0.5 s  
Now: nvgClick()

```
A big industrial light switch thrown, a heavy clack, and large lights buzzing on. No music, no voice.
```

**176. `training/panel-beep`** · UPGRADE · 0.4 s  
Now: trainingCue('open')

```
A military control panel button beep, short and electronic. No music, no voice.
```

**177. `training/gate-open`** ★ · UPGRADE · 3 s  
Now: trainingCue('spawn') (beeps)

```
A heavy steel containment gate grinding open with a warning buzzer. No music, no voice.
```

**178. `training/clear-all`** · UPGRADE · 1 s  
Now: trainingCue('clear')

```
A control room confirmation tone and a short air hiss, a room being cleared. No music, no voice.
```

**179. `training/infirmary-wake`** · UPGRADE · 2 s  
Now: trainingCue('wake')

```
A hospital heart monitor beeping steadily and a man taking a deep waking breath. No words.
```

