# Co-op: what a player is (D-58)

Owner: Claude (CL-87, P-101). For: Jerry to read; Cursor to build CU-63 from, Grokbot GB-100 after it.
Written 2026-09-29 against `index.html` as it stood that morning (40,866 lines). Line numbers drift; the
function names are what to search for.

## The short version

- Up to 4 players. One of them **hosts**: his game runs everything it runs today (the zombies, the waves, the
  director, Cash, the builds). The others send what they do and draw what the host sends back (D-58).
- The networking is **R7, after 1.0**, through the desktop app (D-57). Nothing in R2 talks to a network.
- **R2 only teaches the game to hold a list of players instead of one marine**, and it must play exactly the
  same with one. That is three tasks: this document (CL-87), the list (CU-63), the zombies going for the
  nearest player (GB-100).
- From CU-63 on, the rule for everyone: **new game logic asks the players list, never `player.position`.**
  `tools/check-players.mjs` holds the line.

## 1. What each player owns, and what is shared

Each player has his own of everything he carries and everything that happens to his body. The team shares
the money, the base and the night.

| Each player has his own | Today in `index.html` | In R2 | In R7 |
| --- | --- | --- | --- |
| Body: position, facing, velocity, on the ground, crouch, roll, swim, tower climb | `player` (the marine `THREE.Group`), `velX`, `velZ`, `vy`, `grounded`, `crouching`, `rollT` and friends, `climbingTower` | stays | moves onto the player |
| Aim and camera | `aimYaw`, `camYawCurrent`, `aimTarget`, the camera | stays (the camera is always local) | aim moves onto the player; the camera stays local |
| Health and being hit | `playerHp`, `PLAYER_MAX_HP`, `sinceHurt`, `hurtFlash`, `hitStumble`, `hitReaction`, `marineBodyV` | stays | moves onto the player |
| Guns, ammo, reloads | `currentWeapon`, `weaponIndex`, `ammoByWeapon`, `akimboHand`, `reloading` | stays | moves onto the player (D-61 makes it his loadout) |
| Grenades, MedPens | `grenades`, `medkits` | stays | moves onto the player |
| Light, NVG, laser | `flashlightOn`, the NVG state, `lasersEnabled` | stays | his own |
| His skull bag (skulls not yet banked) | `skullBag` | stays | his own: he banks it at the HQ window like today |
| His kill streak and its heal (D-52) | `combo`, `streakHealHp` | stays | his own |
| Skills (D-59), loadout and Armory storage (D-61), wardrobe and camo (D-66) | built in R3 and R4 | built per player from the start (CU-62, CU-65, CU-70) | already his |
| Being caught (a cave grab, the pit) | `scriptedKill` | stays | one per player: the victim is a player |

| Shared by the team | Today | Notes |
| --- | --- | --- |
| Cash and the bank | `bank`, `cashPool`, `skullLedger` | One purse. Each player banks his own bag into it; anyone spends it at the kiosk. |
| Builds, turrets, the mortar, the 240 | `builds` | Anyone can build, repair or use them. The mortar and the 240 still take one gunner at a time. |
| The night: waves, the director, the zombies, the guardian | `zombies`, the director state | Only the host runs them. |
| The world, its seeds and the caves | `POI`, the terrain, the seeds | Every machine builds the same world from the same seed (rule 10), so it is never sent. |
| The relay, Tonight's call, the kiosk's stock and prices | the relay and kiosk state | One per run. |
| Drops on the ground (skulls, cash, crates, MedPens) | `cashDrops`, `supplyDrops`, med drops | The first player to touch one gets it. |
| Lifetime records and badges, Ways to Die | `tt_best_run` and the profile | Each machine keeps its own profile. |

Calls made here (Jerry can overrule any of them): one shared purse; each player has his own skull bag; drops go
to whoever touches them first.

## 2. The players list (CU-63 builds this)

It sits beside the existing `player`, in the `index.html` shell, just after the marine is built. Nothing moves
out of `index.html` for it.

```js
// One entry per player. In R2 there is only the local one (plus test dummies).
const localPlayer = {
  id: 0, local: true, dummy: false,
  obj: player,                                  // the marine's THREE.Group
  get position() { return player.position; },  // the same Vector3 everyone reads today
  get hp() { return playerHp; },
};
const players = [localPlayer];

// The player nearest to (x, z), or null when there is none. With no options it looks at every player,
// so with one player it always returns localPlayer: the game plays exactly as before.
// { alive: true } skips players who are dead or caught (for GB-100 and R7, not needed with one player).
// { y, dy } skips players more than dy above or below y (storeys, decks).
function nearestPlayer(x, z, { alive = false, y, dy = Infinity } = {}) { ... }

// Every player within r of (x, z), same options. For damage in an area, pickups and triggers.
function playersNear(x, z, r, opts) { ... }

function playerById(id) { ... }
function playerAlive(p) { ... }  // hp > 0, not gameOver, not the victim of a scripted kill
```

**Test dummies.** `TT.addDummyPlayer(x, z)` adds a player that stands still: its own `THREE.Vector3`
position, a plain marine mesh (no input, no camera, no HUD), `hp` 100, `dummy: true`. It returns the id;
`TT.removeDummyPlayer(id)` takes it out and `resetGame` clears them all. A dummy:

- trips world triggers like a player (a cave mouth, the pit's warning, a ground fire's burn check);
- can be hit (its hits are counted on it, `p.hits`; it never dies and never ends the run);
- collects nothing: pickups skip dummies, so a dummy standing on a skull leaves it for the marine.

**`damagePlayer`** gains the player it hurts: `damagePlayer(amount, cause, attackerPos, p = localPlayer)`.
Every caller today passes nothing and hurts the marine, as now. World code that reaches a player passes the
one it reached. A dummy's damage only counts `p.hits`.

## 3. The three kinds of `player.position` read

A scan on 2026-09-29 found **533 reads on 319 lines in 123 functions.** Each read is one of three kinds.

| Kind | What it is | In CU-63 | Reads | Functions |
| --- | --- | --- | --- | --- |
| **1. The local view** | What this machine draws and plays for the person at the keyboard: the camera, the sun's shadow box, the HUD, the minimap, the sound listener, culling and LOD, rain and puddles round him, screen shake. | **Stays** `player.position` (allowed in `check-players`). In R7 it is the local player on each machine. | 61 + most of `tick` | 25 |
| **2. The world asking about players** | Zombies, the director, spawns, damage in an area, pickups, triggers, the caves, the guardian, objectives, supply drops, anything that must work for every player. | **Moves onto the list**: `nearestPlayer`, `playersNear`, or a loop over `players`. | 135 | 28 |
| **3. What one player does** | His own movement and everything he does: shooting, melee, throwing, building, the kiosk and HQ prompts, the mortar, climbing, being hit, being caught. | **Stays** `player.position` in R2 (allowed in `check-players`). In R7 these functions take the acting player, `p`. | 243 + the movement half of `tick` | 60 |

Plus 18 reads in 9 debug and warm-up helpers (`TT.*`, the pre-roll and the effect warm-up): they stay, and are
allowed.

### Kind 2: what CU-63 moves (28 functions, 135 reads)

`updateZombies` (42), `spawnWaveBatch` (8), `placeRefusal` (7), `updateCashDrops` (6), `updateCaveChase` (6),
`updateAcid` (6), `treeImpact` (5), `collapseTower` (4), `spawnSupplyDrop` (4), `updateSupplyDrops` (4),
`updateWildlife` (3), `onStairsRamp` (3), `playerInCaveGrabBand` (3), `playerInCavePokeLos` (3),
`checkScriptedKillTriggers` (3), `updateGroundFires` (3), `explodeGrenade` (3), `overlapsBlocked` (2), `inTheWay` (2),
`bomberBlast` (2), `isOutsideImmediateView` (2), `pickRadioDefenderSeat` (2), `tickObjectiveCombat` (2),
`groundRiseSpotOk` (2), `updateMedDrops` (2), `caveWarningBeat` (2), `caveChaseSmash` (2), `updateFlowFields` (2).

How each group moves:

- **Distance checks and "is he near"** (spawns, `groundRiseSpotOk`, `isOutsideImmediateView`,
  `pickRadioDefenderSeat`, `tickObjectiveCombat`, `caveWarningBeat`): use `nearestPlayer`. "Out of view" means
  out of every player's view: loop `players`.
- **Damage in an area** (`bomberBlast`, `explodeGrenade`, `updateAcid`, `updateGroundFires`, `treeImpact`,
  `collapseTower`): `playersNear`, and `damagePlayer(..., p)` for each. Screen shake stays kind 1.
- **Pickups** (`updateCashDrops`, `updateMedDrops`, `updateSupplyDrops`): the first player who touches it,
  skipping dummies, gets it (his bag, his MedPens).
- **Builds and bodies** (`placeRefusal`, `overlapsBlocked`, `inTheWay`, `onStairsRamp`): a build can't go on any
  player, and stairs won't fold under any player.
- **Caves and the guardian** (`playerInCaveGrabBand`, `playerInCavePokeLos`, `checkScriptedKillTriggers`,
  `updateCaveChase`, `caveChaseSmash`): they return or act on the player who is there; the catch that follows
  is kind 3 for that player.
- **Supply drops** (`spawnSupplyDrop`): the crate lands near a living player (the one who called it, when there
  is one); the "coming down to the north of you" line is kind 1.
- **The horde** (`updateZombies`, `updateFlowFields`, `updateWildlife`): in CU-63 they only read through
  `nearestPlayer` (still one player, so the same). Going for the nearest of several, the flow field from every
  player and melee on whoever is reached are GB-100's.

### Kind 3: what stays in R2 (60 functions, 243 reads)

His movement (`tick`'s movement half, `resolveTreeCollisions`, `updateTowerClimb`, `updateSlopeSlide`, `tryRoll`, `tryVault`, `updateVault`,
`inLot`, `sendMarineToSpawn`, `resetGame`, `startMode`, `tipAt`, the insertion `smooth`); his body and hits
(`updateMarineBody`, `marineBody`, `marineHit`, `damagePlayer`); his weapons (`updateMouseAim`, `raycastTerrain`,
`triggerMuzzleFlash`, `knifeAttack`, `chainsawTick`, `updateFlameStream`, `throwGrenade`, `meleeBugs`,
`meleeWildlife`, `updateMedPenUse`, `cycleWeapon`); building and using things (`getPlacePoint`, `updateGhostPreview`,
`cancelPlaceMode`, `buildReachable`, `pickBuildOnRay`, `upgradeTarget`, `scrapTarget`, `nearestOnMyStorey`,
`storeyBand`, `playerUpstairs`, `ok`, `nearestDoor`, `toggleDoor`, `nearestFoldStairs`, `canReachMortar`,
`nearestMortar`, `mountMortar`, `updateMortar`, `onBoards`, `nearestGrave`); the HQ and kiosk (`nearHQWindow`,
`nearHQPanel`, `nearCIF`, `nearKiosk`, `updateKioskPrompt`, `actionTarget`, `objectiveReach`); being caught
(`beginScriptedKill`, `updateCaveKill`, `setupCaveDrag`, `toScene`, `updateGrabScene`, `updateCaveDrag`,
`finishScriptedKill`, `snd`).

### Kind 1: the local view (25 functions, 61 reads, plus `tick`'s camera and sun)

`updateWater`, `updateAmbientLife`, `updateAudioDirection`, `updateWindSway`, `updateRoofCutaway`, `ease`,
`warmEffectPools`, `finishEffectWarmup`, `updateCaveEyes`, `destroyLandmark`, `campsiteMapName`, `drawMinimap`,
`toFull`, `updateCampfires`, `updateRainDroplets`, `updatePuddles`, `cullFoliageByDistance`,
`updateTreeBatchesInner`, `updatePitBubbles`, `updateWorldVoices`, `flushShotHits`, `sndAt`, `damageZombie` (the
blood on the screen), `updateTreeFade`, `updateShadowLOD`.

A few names above are small helpers inside bigger functions (`ok`, `snd`, `smooth`, `ease`); the scan names
the nearest function it found. `tick` holds 76 reads: its movement is kind 3, its camera and sun kind 1, and
none of it is kind 2.

## 4. `tools/check-players.mjs`

- Counts `player.position` reads in `index.html` and in the modules, by function.
- Allowed: the kind 1, kind 3 and debug functions above, listed by name in the tool.
- Anything else fails, with the file, the line and the function, and a line saying: "Game logic reads the
  players list: nearestPlayer, playersNear or players (docs/coop.md)."
- A new function that really is kind 1 or 3 is added to the allowed list in the same handoff, and says so under
  `Contract changes:` so Claude sees it.
- `npm test` runs it. It must fail on a planted read (a test proves it).

## 5. R7, a first sketch (not for now)

**Who runs what.** The host runs the game as it is today. Clients run their own copy of the world (built from
the same seed, so it is never sent), their own movement (predicted, so it feels instant), and everything
cosmetic: animation, the reaction engine's ragdolls (D-42), particles, sound, the camera. They never decide a
hit, a death, a drop or a payout. Not lockstep: the game rolls about 950 dice a run, so two copies can't be kept
identical (D-58).

**The link.** The desktop app hosts (a browser page can't listen for connections). Join by address on a LAN, or
through a small relay for friends over the internet. The game talks to it through one module, so the rest of the
code never sees the network.

**Messages, client to host.**
- `hello` { name, profile version } once; the host answers `welcome` { playerId, seed, the run so far }.
- `input` about 30 a second: { seq, move x/z, aim yaw/pitch, stance, buttons held }.
- `fire` { seq, weapon, origin, direction, time }: the host checks it against where that player was and
  applies the hit.
- `use` { seq, what, where }: E actions, building, buying, banking, the mortar.

**Messages, host to clients.**
- `snapshot` 10 to 20 a second, unreliable: { tick; each player's position, aim, hp, weapon, animation; each
  zombie's id, kind, position, facing, animation, health share }. Positions as 16-bit whole numbers in
  centimetres from the map's corner. About 48 zombies at 10 bytes each, 15 times a second: 7 KB a second per
  client.
- `event`, reliable and in order: a kill (with the hit's direction and power, so the client plays the same
  reaction), a drop appearing or taken, a build placed, hurt or gone, Cash, the night starting or ending, a
  banner, a catch starting, the boat.
- `ack` { seq }: the last input the host has used, so the client can correct its own movement.

Clients draw other players and zombies about 100 ms behind the newest snapshot, blending between two, so they
move smoothly.

**Calls for Jerry when R7 starts (not needed now).** When a player goes down: can a friend revive him, or does
he watch until dawn? Does the run end only when everyone is down? Can you shoot your friends? Can a friend break
a guardian's catch?

## 6. Done means (for CU-63 and GB-100)

- With one player the game plays exactly the same: every test unchanged, and a night 5 run looks the same to
  Antigravity.
- `check-players` passes, and fails on a planted read.
- CU-63's test: a dummy standing on a skull leaves it for the marine; a dummy standing in a cave mouth trips it.
- GB-100's test: with a dummy 40 m away, zombies spawned beside each go for that one; one player alone plays as
  before (t98, t99, t100 unchanged).
