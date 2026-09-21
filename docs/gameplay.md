# Gameplay systems

## Loadout and the kiosk

You start with a pistol, a knife and $40, at the foot of your cabin's porch steps. Everything else
is bought at the kiosk: a steel supply hatch built into the east wall of the cabin (a yellow
square on the maps).

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

## The cabin

The log cabin stands in the spawn clearing in **both** modes. In Hunted it is just a building — no
health bar, the horde doesn't go for it and blasts don't hurt it — with the kiosk in its east wall.
In Defend the House it is the objective, with a health bar floating over the roof; it smokes and
loses its window boards as it takes damage, and no zombies rise within about 100 ft of it.

It sits on the build lattice: its stone plinth is exactly 6 m square, three 2 m build cells a side,
centred on a cell, and it collides as that square (it used to be a 3 m circle round a square
house). So a wall you build beside it lands flush against it, and you can run your defences
straight off its corners. The porch and its two steps are walkable, the porch posts and the
sandbag lines are solid, and its walls stop bullets — yours and anything else's.

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
- **Demons** (from day 6; one, a second from day 9, a third from day 12, and two more on every
  blood moon): red, horned, spined and cracked with glowing embers — a brute from somewhere
  worse. They plod in, then stop, lower their heads and roar (about half a second, and the ember
  cracks flare) before charging in a straight line at about 9 m/s. A charge that connects hits
  for about 30 and throws you roughly 3 m; one that hits a build batters it. The line is locked at
  the wind-up, so a sidestep or a roll makes it charge straight past. Fire barely touches them
  (a fifth of normal burn). Unlike brutes, bullets work — they have 130 HP and light armour.
- **Brutes** only go down to explosives. **The Colossus** is the boss, and ignores decoy beacons.
- **Pathfinding.** The horde finds its way to you round obstacles rather than walking a
  straight line into them. A few times a second a flow field is built outward from you over the
  160 m around you: trees, rocks, buildings, the house and your builds are walls, slopes too steep
  to climb are cut, bridges are flat walkways with their rails as sides, deep water costs extra.
  A zombie chasing you walks downhill on it — round the end of your wall line, through the gap,
  along the valley. If there is no way to you at all (you have walled yourself in), they come
  straight at you and tear into whatever is in the way. A body that is still pinned for over a
  second gets a sidestep, unless it is standing at one of your builds chewing on it.
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

**Fire spreads.** A patch of burning ground creeps outward while it is young, a little
more readily uphill than down, and will not cross water, the stream or bare map edge. A
shower damps it right down, and there is a hard ceiling on how much of the map can be
alight at once. Anything wooden standing in it catches: a burning tree drops its canopy,
throws embers, keeps the ground at its foot alight so the blaze walks on, and eventually
goes over. Burnt ground stays burnt — scorch marks are laid as the flame dies and remain
for the rest of the match — and a zombie that dies on fire leaves a charred body behind.

## Builds

Everything you place lands in a 2 m cell on one fixed lattice covering the map, and `R` turns it
a quarter turn at a time. Condition bars show on every structure while a build ghost is up, not
only on ones already damaged.

**Your own weapons never hurt what you built.** A round that meets your wall stops there and
leaves it alone; your grenades and your fuel drums spare your defences. Only the horde and what it
throws wears them down. Builds do block your fire, so leave yourself a window.

The ground within 20 m of the spawn clearing is levelled flat (blended back into the real terrain
over the 28 m beyond), so the area you build in first does not refuse half its cells for being too
rough. The river is left alone and the blend eases into its banks rather than cutting a cliff.

### Levels and stacking

A cell is a column up to three storeys high (2 m each). Every piece has one rule saying what it
may stand on, and the game reads that one table for placing, for the ghost, for the refusal
message and for what falls when something breaks — so the pieces fit together the same way
everywhere:

| Piece | Stands on | Notes |
| --- | --- | --- |
| Wall | ground, wall, platform, floor | At most two walls stacked in one column |
| Sandbag wall | ground, wall, platform, floor | Half height. On a wall it adds to the wall's condition |
| Barricade, spikes, mine, fuel drum | ground | Nothing stands on a barricade |
| Platform | wall | A walkable deck on the wall's cap |
| Floor | wall, platform, or a neighbouring wall/floor | Spans open space up to 2 cells from support, so it roofs a room |
| Stairs | ground, platform, floor | Take the whole cell; you and the horde both climb them. The sides are solid |
| Barbed wire | ground, wall, sandbags, platform, floor | Half height, shoot over it. Blocks the way, and cuts whatever tears at it |
| Railing | platform, floor | Runs along the deck edge `R` picks |
| Turrets, mortar, decoy | ground, platform, floor | Sit on the deck, not a storey above it |
| Window, door | an existing wall | Cut an opening in it; see below |

Wire, railings, sandbags, platforms and floors all strengthen the wall under them while they are
there, and give that back when they are sold or destroyed.

**Windows and doors** are not pieces of their own: they cut an opening into a wall that is already
standing. A window leaves a sill — rounds fired above it pass, and the horde still cannot climb
through. A door lets you walk through and nothing else. Both weaken the wall, a door more.

**If something breaks, what it was holding comes down.** Destroy a wall and the platform, turret
or wall stacked on it falls with it. A floor spanning open space falls when the wall it rests on
goes, and the floors leaning on that one follow, from the broken edge inward.

Selling (`X`) and repair (`T`) act on the top piece of the cell you point at. Selling refunds
the opening too if you had cut a window or door into it.

**Panels** — walls, sandbag walls and barricades — are a post at the cell centre with up to four
arms reaching out to the cell edges, and only the arms facing a neighbour are shown. Two panels
side by side each grow an arm toward the other and meet exactly on the shared edge; a corner grows
two arms at right angles out of the same hub, so it is welded rather than two ends almost
touching. Tees and crossroads fall out of the same rule, and four walls around a room close up
into a house. A run takes the height of the
piece it is laid against and the buried skirt swallows the ground falling away underneath, so a
wall reads as one wall rather than a staircase; only a drop deeper than the skirt breaks the run.
Walls carry a flat capping strip at a fixed height — that is the surface platforms will stand on.
Barricades get the span and the posts but no cap: nothing will ever stand on one.

Panels collide as an oriented box rather than a circle, so neighbouring pieces share an edge and a
run has no slot in it.

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

## Maps

**Minimap** (top right) shows only the 50 m around you, with a faint ring at 25 m. It turns
with the camera, so map-up is always screen-up — `W` walks you up the map whichever way you have
swung the view — and the compass letters ride the rim so north is always findable. White arrow:
where you face. Pale wedge: what the camera shows. Zombies: big red dots that flash (about 2 Hz)
with a glow behind them; brutes, demons and the colossus larger. Yellow square: the kiosk. Green:
the house. Cyan: your builds. Red arcs on the rim: the bearing the wave is coming from — those are
directions, so they stay on the rim however far out the horde is.

**`Tab`** opens the full map: the whole world, north-up, with the minimap's reach drawn as a
dashed ring around you. `Tab` or `Esc` closes it. It does not pause the game.

## Sound

**The mix.** Gunfire and what it hits sit on top. Sound runs on three buses — weapons (guns,
impacts, reloads, blades, explosions), effects (zombies, the marine, UI) and ambience (wind, rain,
river, crickets, birds, thunder) — into the SFX volume and a gentle compressor that glues them and
keeps a grenade in a crowd from clipping. The weapons bus is lifted and the ambience bus is pulled
well down; rain in particular used to be a wall of noise in exactly the band a gunshot's crack
lives in. Every shot also ducks the ambience and the music for a moment — a pistol a little, a
shotgun or sniper a lot, an explosion hardest — and they ease back over about half a second, so a
fight in a storm still leads with the guns. The music sits a little lower during waves.

**What you hear.** Each gun has its own voice (the AK-47 and AA-12 used to share a generic crack).
Bullets sound off whatever they hit: a thud and patter in dirt, a knock in wood (trees, your
walls, the cabin), a tick and the odd ricochet whine off rock, a ping off metal turrets, a soft
thump in sandbags, a plip in water. Hits on zombies have a proper flesh thump, heavier for
brutes, demons, the colossus and shotgun pellets; limbs and heads coming off squelch, bodies
bursting more so; a death ends with the body hitting the ground. The knife has its own stab (the
heavy chop is the machete's). Brutes, demons and the colossus have footfalls you hear coming —
demons' quicken into a gallop when they charge — and zombies clawing out of the ground nearby
tear the earth up audibly. Grenades have a pin and a throw and clink when they bounce. The kiosk
hatch rattles its shutter open and shut; a medkit is velcro and a hiss. Everything positional is
panned left/right as the screen sees it and fades with distance.

## Ambience

Wind through the trees (louder in the forest, gusting), the river when you are near it, birds by
day, crickets and owls at night, thunder in the rain, and a far-off groan now and then after
dark. Gunshots and explosions run through a short outdoor reverb so they roll off the treeline
instead of stopping dead. Grass bends away from you and from the nearest few zombies (on the
GPU, at no CPU cost).
