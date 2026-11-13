# J151 (D-179): Jerry's playtest notes, 13 Nov 2026 ~00:35Z (6:35 PM his time)

Jerry played build 3d2b9a623 from 23:04Z to 00:24Z. His 62 notes are below in his words (lightly typo-fixed), each with an owner and a priority.
Screenshots are in review/J151-playtest/. The file names carry the note numbers.

Reference photos he showed are LOOK-ONLY and are not saved here:
- **Pistol (2 stock photos):** the slide is locked back. The barrel's chamber hood tilts up into the ejection port and the barrel stays inside the slide. A short length of barrel shows past the slide's front, with the recoil spring guide rod under it. Nothing passes through the frame or the slide.
- **AK:** a classic wood lower handguard, thick and rounded so the hand wraps it, plus a wood pistol grip.

## Priority (D-179)
- **P1, bugs he hits all the time** (first): 1, 4, 8, 10, 12, 13, 14, 30, 31, 34, 38, 45, 53
- **P2, hands and clipping:** 3, 5, 16, 17, 23, 28, 29, 37, 39, 40, 41, 43, 46, 54, 58
- **P3, model changes:** 2, 7, 11, 20, 21, 22, 24, 25, 26, 42, 44, 52, 56
- **P4, effects:** 18, 32, 33, 35, 36, 49, 51, 57
- **P5, features:** 6, 9, 15, 19, 27, 47, 48, 50, 55, 59, 60, 61, 62

The pump shotgun's can (CF-7) stays as is: Jerry is testing it.

## Owners
Owner codes:
- C1 = Claude 1 (hands)
- C2 = Claude 2 (shell)
- C3 = Claude 3 (body, kit, GW-4, sniper, pump)
- C5 = Claude 5 (motion)
- C6 = Claude 6 (KR-7, chainsaw, flamer, launcher, Watchman)
- GP = ChatGPT (Training, UI)
- GT = ChatGPT 2 (sidearms, Breacher, effects)

| # | Jerry's note | Owner | P |
|---|---|---|---|
| 1 | The 3D camera for third person is practically useless right now. It gets stuck on things and doesn't behave anything like it did before. | C2 | P1 |
| 2 | The pistol chamber on reload doesn't look real: it clips through the gun instead of opening like a real pistol's. The chamber and barrel on reload need to look more realistic. | GT model, C5 motion | P3 |
| 3 | The right hand and palm need to be tighter around the pistol. The left thumb is in the right spot, but its top half needs to wrap around more. | C1 | P2 |
| 4 | Camo glitch again and again! | GP (+C3), details asked | P1 |
| 5 | Wasp (single): the left thumb points downward instead of gripping around the back. | C1 | P2 |
| 6 | Workbench gun 3D rotate is extremely laggy. | GP | P5 |
| 7 | Revolver oversized. Its grip is too large to grip properly, looks bad and isn't up to spec. A weird artifact hangs off the top of the hammer. The inside of the cylinder could use more detail. | GT | P3 |
| 8 | Gear was floating off the player on a fresh reload. Holsters and gear hang, floaty and not properly secured, depending on the weapon and gear configuration. | C3 | P1 |
| 9 | I like the flashlight switch-on animation. I want the same one used when turning on the laser. | C5 | P5 |
| 10 | A random red dot floats off to the left of the screen with the shotgun (screenshot 02: a red-dot optic hanging in the air). | C2 (+GT) | P1 |
| 11 | The shotgun is undersized and needs to be bigger. The pump needs to be thicker so the hand can get a proper grip. | C3 | P3 |
| 12 | The trigger gets pulled each time the player ejects rounds to switch shotgun ammo types. | C2 logic, C5 pose | P1 |
| 13 | Birdshot needs more pellets hitting the target than buck. Right now both have 8. | C2 | P1 |
| 14 | The red dot appears to slide while firing the shotgun ADS. | C5 (+C2) | P1 |
| 15 | Need to see the player physically collecting the ejected shotgun ammo when switching. | C5 | P5 |
| 16 | GW-4: the left thumb doesn't wrap around the quad rail. | C1 | P2 |
| 17 | GW-4: the arm clips throughout the reload and when working the flashlight. | C5 | P2 |
| 18 | We need bigger, more varied bullet impacts on walls and objects. The copy-paste one doesn't look believable. | GT | P4 |
| 19 | Move the dummy between the shooting table and range control, a foot or two off the wall, facing the player. Give him more reaction to being shot or hit with melee. | GP | P5 |
| 20 | The GW-4 suppressor needs to be bigger and able to take camo. | C3 | P3 |
| 21 | The KR-7 needs a fat fore end like a Draco's so the left hand fits and grips it. | C6 | P3 |
| 22 | The KR-7 has a rectangle on its left side that looks like an ejection port. Remove it, or if it's the ACOG mount point, make it more detailed and obvious. | C6 | P3 |
| 23 | The player's forearm sticks through the KR-7 extended magazine. | C5 (+C1) | P2 |
| 24 | The KR-7 suppressor needs to be bigger and able to take camo. | C6 | P3 |
| 25 | The KR-7 magazine should get camo. | C6 | P3 |
| 26 | Fill the small gaps between the KR-7 grip and the trigger guard (screenshot 03). | C6 | P3 |
| 27 | Let the player switch the KR-7 furniture between wood and synthetic; synthetic can take camo. | C6 model, GP armory | P5 |
| 28 | The arm clips on the KR-7 reload. | C5 | P2 |
| 29 | KR-7: the left thumb doesn't wrap around the grip. | C1 | P2 |
| 30 | Sometimes objects and text, like the floor text, draw over the laser (screenshot 06). | C2 | P1 |
| 31 | Sometimes lasers clip through things they should stop on, like pieces of the armory (screenshot 05). | C2 | P1 |
| 32 | The chainsaw should vibrate slightly when running. | C5 | P4 |
| 33 | The sound is still wrong when the chainsaw is running and the trigger is pulled with no contact. | C2 | P4 |
| 34 | The chainsaw glows when the trigger is pulled. | C6 | P1 |
| 35 | Need a gas fumes effect while it runs. | C6 | P4 |
| 36 | The teeth need to spin faster. | C6 | P4 |
| 37 | In third person, the chainsaw goes above the player's head when cutting the dummy (screenshot 04). | C2 hold (+C1) | P2 |
| 38 | The chainsaw teeth and sound shouldn't start until the player has fully pulled the start cord. | C2 logic, C5 timing | P1 |
| 39 | Chainsaw right hand: pull the trigger with three fingers in the guard, with the index finger resting naturally against the guard. | C1 (+C5 trigger) | P2 |
| 40 | Sniper: the left hand isn't fully around the grip. | C1 | P2 |
| 41 | Sniper: the trigger finger sticks out too much and doesn't pull naturally. | C5 | P2 |
| 42 | The bolt animation looks great, but the moving part clips through the gun instead of moving the metal it should be connected to. | C3 model (+C5) | P3 |
| 43 | Sniper: the left hand does something weird when reloading. | C5 | P2 |
| 44 | The top part of the sniper stock needs camo like the rest of the gun. | C3 | P3 |
| 45 | Weird collision detection and floaty impact decals on some objects in the Training area. | C2 (+GP meshes) | P1 |
| 46 | The thumb clips through the sniper when working the flashlight. | C5 | P2 |
| 47 | The machete and restock all move into the main Armory menu. Another Armory menu overhaul. | GP | P5 |
| 48 | Gun icons need better, more accurate pictures in the Armory and the weapon wheel. | GP | P5 |
| 49 | Bad flamethrower burn decals on some objects, such as the dummy (screenshots 07-09). | GT | P4 |
| 50 | The flamethrower gauge needs to show how much fuel is left in the tank, and the dials and notches need to be tritium. | C6 | P5 |
| 51 | The flames are cool, but could look more believable and less like sprites. | C6 | P4 |
| 52 | The tank needs to be able to take camo. | C6 | P3 |
| 53 | The flame sizzle effect sometimes lingers well after the flames are out. | C6 | P1 |
| 54 | Flamethrower hand and grip issues. | C1 | P2 |
| 55 | Launcher projectiles could be a bit faster. | C6 | P5 |
| 56 | The launcher hinge is cool but physically impossible. Without disturbing the reload animation (it looks good), design a hinge that obviously doesn't clip through the center of the cylinder (screenshot 10). | C6 | P3 |
| 57 | Updated muzzle flash effects. | GT | P4 |
| 58 | Breacher 12: the left thumb doesn't wrap around the fore end. | C1 | P2 |
| 59 | The security door keypads look bad (screenshot 11). | GP | P5 |
| 60 | The Watchman MG needs first person, but not the mortar. | C6 model, C5 motion | P5 |
| 61 | Environmental effects, like shooting out the lights. | GP (+C2) | P5 |
| 62 | Shooting or grenading a Training terminal destroys it with an animation, and the player can't use it anymore. The build-room terminals get covered by a bulletproof metal blast shield when the alarm goes off. The infirmary fence also turns into a bulletproof blast shield. A grenade thrown into the infirmary is instantly tossed back out at the player. | GP (+C2) | P5 |
