# Gameplay systems

## Loadout and the kiosk

You start with a pistol, a knife and $40. Everything else is bought at the kiosk: the yellow
terminal a few strides from the spawn clearing (a yellow square on the minimap).

| Tab | What it sells |
| --- | --- |
| Weapons | One-time unlocks, each arriving loaded |
| Ammo | Held by calibre, not by gun. Only sold here. "Restock everything" tops up every calibre you are short of, cheapest first |
| Gear | Night vision, laser, flashlight, and armor |
| Upgrades | Extended mags (+50%, except revolver and launcher), bigger chainsaw tank, machete, and a second gun for the pistol, Uzi or revolver |
| Perks | Vitality, Stopping power, Quick hands, Fleet foot, Scavenger, Grenadier. 5 ranks each |
| Blueprints | A build type only appears in the `B` menu once its plans are bought |

The ammo HUD reads `loaded / mag · N spare`. Out of spares mid-wave means out of ammo, so plan for it.

### Calibres

Ammunition belongs to the round, not the gun: one box of 9mm feeds the pistol and the Uzi, one of
12ga feeds the pump and the AA-12. The minigun keeps its own line as 7.62 belt rather than sharing
the AK's box magazines. An extended magazine is still bought per gun, but the deeper reserve it
buys applies to everything eating that calibre.

| Calibre | Feeds |
| --- | --- |
| 9mm | Pistol, Uzi |
| 5.56mm | M4 |
| 7.62mm | AK-47 |
| .44 | Revolver |
| .338 | Sniper |
| 12ga | Shotgun, AA-12 |
| 40mm | Launcher |
| 7.62 belt | Minigun |
| Fuel | Flamethrower |
| 60mm | Mortar |

## Waves, days and prep

- **Prep** is 2 minutes between waves, with a countdown under the clock at the top of the screen:
  green, amber under 30 s, red and pulsing under 10 s. It reads "grace period - clock held" while
  the opening no-zombie grace is running. `Enter` starts the wave immediately (ending the grace
  too). Settings > "Skip prep time" makes every prep 5 seconds.
- **Blood Moon** every 4th day: red sky, faster horde, x1.5 cash.
- **Horde pace.** Every zombie type runs 15% faster than it used to, and the Shambler another 25%
  on top (2.55 to 3.19 m/s), so the fodder keeps up with you.
- **Horde size.** Every wave carries 10x the bodies. The extra nine tenths are all Shamblers; the
  specialist counts are unchanged, spread through a much longer wave. Day 7 goes from 30 bodies to
  300, still with 2 bombers, 4 brutes, 2 spiders, 2 spitters and 1 screamer. Spawn cadence is
  about 3.5 a second, and `MAX_ZOMBIES` (how many stand on the field at once) went 36 to 48. That
  constant is the density knob if a machine cannot hold it; see its comment in `index.html` for
  what was measured and why the numbers are soft.
- **Kill streaks.** Chain kills within 2.6 s: 5 / 10 / 20 / 30 in a row pay x1.5 / x2 / x3 / x4 cash.
- **Cash drops** last 30 seconds, and small payouts pool until they are worth the walk rather than every body leaving its own stack. They pulse slowly, then faster as the clock runs down, then shrink away.
- **Airdrops** are rare (every 4-7 minutes) and money only, a bounty for walking out to them.

## Defending the base

The base is a log cabin, 1.65x bigger than it used to be, with a health bar floating over the
roof. It smokes and loses its window boards as it takes damage. No zombies rise within about
100 ft of it, so the fight comes to you from outside the clearing.

## Enemies

- **Shamblers** are the fodder.
- **Leapers** (from day 2-3): pale, run on all fours, jump 5-14 m onto you. Sidestep the landing.
- **The Drowned**: fish-people that only ever surface from the river. Fast in the water, sluggish on land.
- **Spiders** (from day 4-5): a pale zombie crawling on six human limbs, with its head out front.
  They hang back at 7-15 m and shoot webbing that slows you. Kill them first.
- **Bombers** (from day 5): fat, with a glowing gut. 20% quicker (3.6 to 4.32 m/s) before a
  close-range sprint, then they detonate on contact with a bigger blast radius, and they
  chain-react with other zombies.
- **Spitters** no longer throw acid, since lobbing things is the Spider's job. They walk in and
  then crawl the last 15 m at a quarter speed.
- **Brutes** only go down to explosives. **The Colossus** is the boss, and ignores decoy beacons.
- **Knockdowns.** An explosion floors anything short of a colossus; a point-blank shotgun blast
  floors the small types. They topple, lie helpless for a moment and get back up. This cannot be chained.
- **Headshots.** Bullets in the top of the body do bonus damage and usually take the head off.

## Health and armor

- **Health** regenerates slowly (after 5 s without a hit) but only ever back up to 40% of max.
  Past that you need a medkit: `H` uses a carried one (kiosk, $55, carry 3, heals 60%). Enemies
  rarely drop a medpack that heals 50% on touch; brutes and the colossus are the best odds.
- **Burning zombies hurt you** if you brush them. Stand back, or roll.
- **Armor.** The marine starts in a field cap, shirt and H-harness chest rig. The Helmet ($70, +25),
  Plate carrier ($120, +50) and Knee & elbow pads ($50, +15) are bought in the Gear tab. Each
  appears on the model when bought and adds to the ARMOR bar under health. Armor soaks 65% of
  every hit while it lasts (sparks instead of blood), is repaired at the kiosk ("Repair armor")
  and comes back to full at the start of each day. Pads also get you up from a dodge roll sooner.
  The NVG mount, helmet, vest and pads are hidden on the marine until owned.

## Weapons

**Holds.** Every gun has a proper two-handed hold (`WEAPON_HOLD` in `index.html`): rifles and
the shotgun shouldered with the stock at the shoulder and the support hand ahead of the mag or on
the pump; pistols held out two-handed; the minigun, flamethrower and chainsaw braced at the hip.
The gun is placed with its grip at the hold and pointed at the reticle, and both arms are solved
onto it with a two-bone IK, with a bladed torso twist for the long guns so the support arm can
reach. On a reload the support hand goes foregrip, mag well, belt pouch, mag well, foregrip.

**AK-47** (kiosk, $195). Hits harder than the M4 — 27 a round against 19 — and reaches about as
far, but it cycles slower, takes a second longer to reload and throws a looser group. Per-shot
weight traded against rate and precision.

**AA-12** (kiosk, $340). A full-auto shotgun off a 20-round drum: five pellets a shell against the
pump's seven, but no pump to work between them. It hoses a corridor.

**Dual wield** (kiosk, Upgrades: pistol $120, Uzi $155, revolver $185). Buys a second gun for the
off hand; `Y` switches between one and two. Two guns alternate, so the pair puts rounds out twice
as fast and carries twice the loaded ammunition — against a noticeably wider group, a reload half
again as long, and no free hand, so no grenades and no blade until you switch back.

**Flamethrower** (kiosk, $210). Hold to hose fire. Fuel tanks are the ammo (60 units, about 10 s
of flame; the "bigger tank" upgrade adds 50%). The fire is a stream of burning fuel blobs
(about 72 a second): they leave the nozzle at about 17 m/s plus your own speed, slow under drag,
sag while liquid and rise as they burn, turning white-hot, then orange, then red, then smoke.
Reach is about 7 m. The nozzle follows your aim but is held between about 7 degrees down and 34
up, so aiming at your own boots still throws the fire out ahead of you (and spray-back never
lights the ground within 1.8 m of you). Blobs splash and spread along the ground and light it
(it keeps burning for a few seconds, and burns you too), hiss out to steam on water, and cling to
zombies they hit, igniting them. A body in front shields the ones behind; burning zombies still
light whatever they are pressed against. Damage per zombie is capped at one hit per weapon tick.
Nozzle flare, a firelight on the surroundings and a faint rumble while firing.

## Builds

Everything you place lands in a 2 m cell on one fixed lattice covering the map, one piece per
cell, and `R` turns it a quarter turn at a time. Condition bars show on every structure while a
build ghost is up, not only on ones already damaged.

Zombies attack structures. The player always comes first — one that can reach you hits you — but
anything that cannot get to you turns on whatever of yours is in the way, turrets included.
Brutes and the colossus put their weight behind it and go through a wall fast. Spikes and mines
are not targets: they are meant to be walked over, which is their whole job.

- **Fuel drums** are a blueprint: place one, shoot it with the pack beside it, stand back. They chain.
- **Mines** go off under the first zombie on them.
- **Decoy beacon**: 20 s of flashing and screaming that the horde chases instead of you (the colossus ignores it).
- **Sandbags**: cheap low cover.
- **Mortar**: see [Controls](controls.md). Shells are sold under the Ammo tab.
- **Felled trees.** A tree you chop or shoot down falls with real weight: it accelerates, hits the
  ground with a thump, crushes anything under the trunk (you included, so watch where they fall),
  and lies there for about 20 s before sinking away.

## Minimap

North-up, east on the right (the same handedness as the view). White arrow: where you face. Pale
wedge: what the camera shows. Zombies: big red dots that flash (about 2 Hz) with a glow behind
them, the colossus larger. Yellow square: the kiosk. Cyan: your builds. Red arcs on the rim: where
the wave is coming from.

## Ambience

Wind through the trees (louder in the forest, gusting), the river when you are near it, birds by
day, crickets and owls at night, thunder in the rain, and a far-off groan now and then after
dark. Gunshots and explosions run through a short outdoor reverb so they roll off the treeline
instead of stopping dead. Grass bends away from you and from the nearest few zombies (on the
GPU, at no CPU cost).
