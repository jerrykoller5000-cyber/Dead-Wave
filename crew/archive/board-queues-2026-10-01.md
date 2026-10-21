# Board queues archived 2026-10-01

Finished tasks moved off crew/BOARD.md (`node crew/crew.mjs tidy`). Each one's report is in handoffs/.

<!-- crew.mjs tidy, 2026-10-01T02:53Z: 104 finished -->

## Cursor — integration, git, tools, engine core (Grok 4.7 High)

### R2 · The night has a shape

- [x] **CU-78** **R2 · first tonight.** Commit what is waiting before R2 starts: Claude's horde fix and the CIF heading
  in `index.html`, `tools/tests/t100.js`, `t102.js`, GP-74 (marine idle) and GP-75 (roll) with their `studio/` files and
  handoffs. Run the suite first (`npm test`; t102's "back to M81" check already failed before these changes). The
  suite deletes `tools/tests/test.html`: restore it (`git checkout -- tools/tests/test.html`), never commit the deletion.
- [x] **CU-75** **R2 · P-147.** The gun flashlight standard from the start (D-68): owned on every weapon at a fresh run,
  its kiosk row gone, L still toggles it. Details: `docs/roadmap.md` P-147.
- [x] **CU-59** **R2 · P-55.** `debugTouched`: one shell flag set by any `TT.*` hook that changes the run (the `*Dbg`
  setters, `loopNextNight`, `loopMorning`, `skipPrep`, the scripted-kill and cave hooks), reset at a fresh start;
  `recordFinishedRun` passes `eligible: !debugTouched`. So a debug run earns no badge (GP-65). Small.
  `docs/contracts.md`, lifetime badges.
- [x] **CU-77** **R2 · P-55.** The director says when a night is over: `dw-game` `'night-cleared'` `{ day, kind, runId }`
  at dawn, once a night (`kind`: plain, blood-moon, guardian, fog, siege, colossus). The badges' fact (GP-65);
  small. `docs/contracts.md`, lifetime badges.
  Moved from Grokbot (was GB-97) on 2026-09-29 to spread his load: event plumbing is Cursor's.
- [x] **CU-63** **R2 · P-102.** Co-op groundwork (D-58): the players list. `players = [localPlayer]`, `nearestPlayer`,
  and every game-logic read of `player.position` moved onto them; the local view and his own movement stay. The
  game plays exactly the same; `tools/check-players.mjs` fails if the direct reads grow; `TT.addDummyPlayer()` for
  tests. After CL-87. Details: `docs/roadmap.md` P-102.
- [x] **CU-51** **R2 · P-13.** R2 measured: nightsim medians for the new shape, bench fps with 48 and 8 reacting.
  After GB-73; after GB-66. Details: `docs/roadmap.md` P-13.

### R3 · The day feeds the night

- [x] **CU-68** **R3 · P-127.** Suppressors in the kiosk (D-65): an upgrade per gun (the akimbo pair gets two), the can
  fitted in view and the muzzle flash moved to its end; no change to the fight yet (GB-105). After CL-95. Details:
  `docs/roadmap.md` P-127.
- [x] **CU-69** **R3 · P-128.** Fire selectors (D-65): a key toggles semi and auto on the M4, AK-47 and AA-12 (semi: one
  shot a click, a tighter group); the pistol's full-auto unlock, hard to hold (climbs and blooms far more than the
  Uzi); the mode on the HUD. Details: `docs/roadmap.md` P-128.
- [x] **CU-64** **R3 · P-111.** The hip holster and going unarmed (D-61): the pistol draws from and goes back to the
  holster on his leg; holster everything to go unarmed, +10% on foot (Fleet foot included, +30% at most). After CL-89.
  Details: `docs/roadmap.md` P-111.
- [x] **CU-65** **R3 · P-113.** The Armory in the game (D-61): four slots (two primaries, two secondaries) plus the hip
  pistol, storage that keeps guns and magazines for the run, the loadout applied before the day, the weapon wheel
  showing only what he carries; per player (CU-63). After GP-78. Details: `docs/roadmap.md` P-113.
- [x] **CU-67** **R3 · P-121.** The M240B and mortar ammo (D-63): the 240 in the build menu beside the mortar, on its
  tripod only, belt-fed, 1,000 rounds, carried and placed like the mortar and fired with the marine on it; each comes
  with half its maximum (the mortar's 60 mm reserve cap already exists). Details: `docs/roadmap.md` P-121.
- [x] **CU-52** **R3 · P-44.** Vault your own barricades: Space beside a sandbag, wire, barricade or open window hops
  you over in 0.5 s. Player physics is Cursor's (lead call). Details: `docs/roadmap.md` P-44.

### R4 · The way out

- [x] **CU-70** **R4 · P-131.** The dressing room (D-66): the CIF grows into it, with a 3D view of the marine he can
  turn 360; each item's camo and options; saved to the profile. After CL-96, CL-94. Details: `docs/roadmap.md` P-131.
- [x] **CU-53** **R4 · P-78.** A full run timed headless: `tools/nightsim.mjs --full`, the boat called on 20. After
  GB-86. Details: `docs/roadmap.md` P-78.
  Jerry (2026-10-01): the one-page --full run would take about 10 hours; condense it to about 2. Stop it and run the 20
  nights as separate pages in parallel (Claude's request of 2026-10-01), night 20 with the boat; the run's length is
  the nights' game time plus the prep and the dawns.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71). R4 closes when Jerry plays a run to the extraction).

### R5 · Named nights and bigger systems

- [x] **CU-54** **R5.** R5 measured: fps on Fog Night and the siege, with the wanderer out, on the GPU. After CL-76;
  after GB-88.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71)).
- [x] **CU-73** **R5 · P-145.** The Hollows measured: fps below with 24 awake on the GPU; a scripted delve per warren
  (`nightsim --hollow`): time, deaths, pay against the same day's night. After GB-108. Details: `docs/roadmap.md` P-145.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71)).

## Grokbot — combat (Grokbot)

### R2 · The night has a shape

- [x] **GB-71** **R2 · P-16.** Test nights: early pushes run straight on, then one real breather with the cave eyes
  dimmed; a `wave-push` event. After CU-48. Details: `docs/roadmap.md` P-16.
- [x] **GB-72** **R2 · P-17.** The last push surges from the caves and the treeline together, so the night ends harder
  and sooner. After GB-71; after GB-59. Details: `docs/roadmap.md` P-17.
- [x] **GB-73** **R2 · P-18.** Headline packs as set pieces: six brutes side by side, the demon and bomber packs;
  night 19's short breathers made true. After GB-72. Details: `docs/roadmap.md` P-18.
- [x] **GB-78** **R2 · P-32.** The first guardian catch of a run can be escaped: five E presses, 50 HP and the
  unbanked skulls (D-46). After GB-67. Details: `docs/roadmap.md` P-32.
- [x] **GB-75** **R2 · P-26.** Brutes wear plates: bullets and blades cut to 0.55, fire and blasts full (the unused
  `armored` flag). Matches the brute's reaction preset. Details: `docs/roadmap.md` P-26.
- [x] **GB-76** **R2 · P-27.** The screamer's howl pulls up to 3 far zombies up out of the ground near it, even at the
  cap. After GB-59. Details: `docs/roadmap.md` P-27.
- [x] **GB-77** **R2 · P-28.** A bomber shot inside the crowd: the chain feeds your streak and pays in full. Details:
  `docs/roadmap.md` P-28.
- [x] **GB-96** **R2 · P-100.** The shotgun against spiders on a wall: a small spider-only edge, measured before and
  after (Grokbot's call under Jerry's "use your best judgement"). After GB-59. Details: `docs/roadmap.md` P-100.
- [x] **GB-99** **R2 · P-20.** The brute's head line: a head-centre shot sits at 0.78-0.81 of its `hitH` (2.05·s), on
  the headshot line, so it only sometimes counts. Keep `hitH` (the body target stays the size it is); give each
  zombie type its own head fraction, set from where its head really is (brute about 0.74, so a head-centre shot
  is a headshot with a margin). Jerry can veto if he wants the brute's head harder. Small.
- [x] **GB-103** **R2 · P-117.** The horde fights the defences (D-62): a turret firing on a zombie draws it and its
  pack; brutes, demons and a share of each push go straight for the defences; builds take harder hits. nightsim with
  turrets before and after. Details: `docs/roadmap.md` P-117.
- [x] **GB-100** **R2 · P-103.** Co-op groundwork (D-58): the zombies and the director go for the nearest living
  player in `players`: the flow field from every player, attacks on whoever they reach, the guardian's progress to
  the nearest. One player plays the same. After CU-63. Details: `docs/roadmap.md` P-103.
- [x] **GB-112** **R2 · P-32.** The guardian's catch can happen again after an escape (today `kickFreeUsed` stops it
  after the first). Each escape in a run takes more E presses: 5, then 8, then 12, then 16. The kick-free cost
  (skulls, HP) as now each time. A test: a second grab after an escape, and the presses rising. Jerry, 2026-09-29.

### R3 · The day feeds the night

- [x] **GB-104** **R3 · P-119.** Every kind has a weakness, in combat (D-62): CL-91's table in `damageZombie`, with
  GB-75's plates as its first row. nightsim medians before and after. After CL-91. Details: `docs/roadmap.md` P-119.
  Import the table from ChatGPT's `game/weaknesses.js` (GP-80); don't copy the numbers.
- [x] **GB-111** **R3 · P-120.** `dw-game` `enemy-first-seen { kind }`, once a run per kind, the first time one comes
  within 60 m of a player (`nearestPlayer`, D-58). For GP-80's first-use cards. A test: one event per kind, none twice.
  Small.
- [x] **GB-102** **R3 · P-109.** Rain puts fires out (D-60): burning zombies burn out faster and stop spreading in the
  wet; campfires sputter to embers and come back; no cigarette in the rain, a lit one goes out, no ember from a dropped
  butt (GP-74's idle, `studio/marine-idle.js`). nightsim on a rainy night before and after. Details:
  `docs/roadmap.md` P-109.
- [x] **GB-101** **R3 · P-106.** Skills by doing (D-59): the combat counters. Headshot and one-shot kills; reloads
  under pressure; running while chased and dodge rolls within 1.5 m of an attack (with GP-75's roll); explosive
  multi-kills (grenades, the launcher, drums); dawns survived and comebacks from under 25% HP. Each feeds GP-87's
  `addSkillXp`. After GP-87. Details: `docs/roadmap.md` P-106.
- [x] **GB-81** **R3 · P-38.** A crate pick brings the plane over the mast; it lands with a small guard pack; the
  random timer stops once the relay is up (D-49). After GP-55; after GP-88. Details: `docs/roadmap.md` P-38.
- [x] **GB-82** **R3 · P-39.** The Lights out dare: the HQ lamp stays dark tonight, kills pay 25% more. After GP-55.
  Details: `docs/roadmap.md` P-39.
- [x] **GB-83** **R3 · P-45.** With the relay up, one crate falls in the breather toward tonight's caves: run for it
  or hold. After GB-81; after GB-71. Details: `docs/roadmap.md` P-45.
- [x] **GB-84** **R3 · P-48.** One mod per gun: the extended mag (slower reload) or a heavy barrel (steadier, slower
  swap). After GP-60. Details: `docs/roadmap.md` P-48.

### R4 · The way out

- [x] **GB-85** **R4 · P-50.** From night 20, with the relay up, the boat can be called; not calling it is "stay"
  (D-45). After GP-54; after GB-72. Details: `docs/roadmap.md` P-50.
- [x] **GB-86** **R4 · P-53.** Board the boat: hold E on the deck; a win, with no death-log entry; a "hot extraction"
  before the last kill. After CL-73. Details: `docs/roadmap.md` P-53.

### R5 · Named nights and bigger systems

- [x] **GB-105** **R5 · P-129.** Suppressor balance (D-65): first the hearing rule (a shot draws zombies within a
  radius); then suppressed fire is heard much closer and hits a little softer. nightsim before and after. After
  CU-68. Details: `docs/roadmap.md` P-129.
- [x] **GB-87** **R5 · P-56.** Night mods: Fog Night on 14, named the prep before (D-54). Details: `docs/roadmap.md`
  P-56.
- [x] **GB-88** **R5 · P-59.** The siege on 18 made real: brutes and soldiers go for your walls. Details:
  `docs/roadmap.md` P-59.
- [x] **GB-89** **R5 · P-61.** A colossus walks a trail by day from night 7: loot around it or bring it down for a big
  payout. Details: `docs/roadmap.md` P-61.
- [x] **GB-90** **R5 · P-64.** Survivor bounties: a camp from night 3 can hold one; clear the guards and press E
  (D-47). The figure is CL-75's; until it lands, a bare `TT.makeMarine()` with no gun stands in (Claude, 2026-09-30).
  Details: `docs/roadmap.md` P-64.
- [x] **GB-91** **R5 · P-65.** Survivors' help: the medic's regen to 50%, the trapper's cheaper repairs, the ranger's
  turret. After GB-90. Details: `docs/roadmap.md` P-65.
- [x] **GB-106** **R5 · P-135.** The Hush (D-67): one charge a dawn once the relay is up; lit at a mouth it stops the
  walk-in grab and E goes down; the chalk mouth refuses; the poke chase unchanged. After CL-98; after GB-78. Details:
  `docs/roadmap.md` P-135.

### R6 · Finish (1.0)

- [x] **GB-95** **R6 · P-80.** The blades as D-51 says: measured, then the machete if melee is still over 40%. After
  CU-48. Details: `docs/roadmap.md` P-80.

## ChatGPT — what the player reads and decides (GPT-6 Sol High)

### R2 · The night has a shape

- [x] **GP-85** **R2 · P-148.** A sound for the skulls the last kill pulls into the bag (D-68, Jerry on Q-3): one
  collect chime as they land (not one per skull), with the count on screen. Details: `docs/roadmap.md` P-148.
  Moved from Cursor (was CU-76) on 2026-09-29: audio cues and the HUD line are ChatGPT's. No `index.html` combat edits: hook the pull through the existing `skull` events, or ask Grokbot for one with `crew.mjs request`.
- [x] **GP-86** **R2 · P-147.** The flashlight's words (ChatGPT asked; Cursor's CU-75 request): the two lines that
  still sell the gun light say it comes with every gun, in `ui/strings.js`. After CU-75. Small.
- [x] **GP-53** **R2 · P-33.** "Kick free! (E)" during the haul, then "It took your skulls.". After GB-78. Details:
  `docs/roadmap.md` P-33.
- [x] **GP-50** **R2 · P-29.** The scouting report names the counter: plates stop bullets, kill the screamer first.
  After GB-75; after GB-76; after GB-77. Details: `docs/roadmap.md` P-29.

### R3 · The day feeds the night

- [x] **GP-89** **R3 · P-114.** Magazines (D-61): each magazine tracked with its rounds; R stows it in the dump pouch,
  a double tap drops it (faster; lost unless picked up before the next dawn or dusk); speed loaders for the revolver;
  the shotgun and launcher round by round; akimbo; Quick hands (D-59) still counts. After CL-89. Details:
  `docs/roadmap.md` P-114.
  Moved from Cursor (was CU-66) on 2026-09-29 to keep ChatGPT busy in R3: GP-79 (the magazine HUD) follows it.
- [x] **GP-87** **R3 · P-105.** Skills by doing (D-59): the plumbing. Perks out of the code (`PERKS`, `perkLevels`,
  `perkCost`, the shop rows; 18 call sites); a per-player `skills` store with `addSkillXp(player, key, n)` and
  `skillLvl`, reset in `resetGame`; `dmgMult`, `reloadMult`, `speedMult`, `cashMult`, `maxGrenades` and the blast
  radius read skills; a `skill-up` event; t25 and the perk tests re-based. After CL-88 and CU-63. Details:
  `docs/roadmap.md` P-105.
  Moved from Cursor (was CU-62) on 2026-09-29 to spread the load: ChatGPT knows the perks, the kiosk and the economy.
- [x] **GP-88** **R3 · P-34.** `spawnSupplyDrop({x, z, contents, source})` and a `supply-drop` event; the airdrop cue
  plays. Moved from Grokbot (integration plumbing). Details: `docs/roadmap.md` P-34.
  Moved from Cursor (was CU-58) on 2026-09-29; GP-56 follows it.
- [x] **GP-78** **R3 · P-112.** The Armory window at the HQ (D-61): four slots to fill before the day, the stored guns
  and magazines, a pure `game/armory.js` with unit tests. After CL-89. Details: `docs/roadmap.md` P-112.
- [x] **GP-79** **R3 · P-115.** Magazines on the HUD (D-61): an icon per magazine showing how full it is; "spare"
  becomes "mags", "shells" or "rounds" by gun. After GP-89. Details: `docs/roadmap.md` P-115.
- [x] **GP-80** **R3 · P-120.** The counters in words (D-62). First `game/weaknesses.js`: `WEAKNESS` and `COUNTER` from
  `docs/weaknesses.md` as a pure, unit-tested module (GB-104 imports it). Then the scouting report names each planned
  kind's counter, and a first-use card per kind listens for GB-111's `enemy-first-seen`. After CL-91. Details:
  `docs/roadmap.md` P-120.
- [x] **GP-76** **R3 · P-107.** Skills by doing (D-59): the kiosk loses the Perks tab; a skills panel (six rows, rank
  and progress) in the pause menu and on the death card; a "Fleet foot · rank 2" toast on `skill-up`; the strings,
  the streak boosts' new names, `ui/strings.test.mjs`. After GP-87. Details: `docs/roadmap.md` P-107.
- [x] **GP-77** **R3 · P-108.** The economy re-based without perks (D-59): the GP-41 table redone with no perk
  spending, skull values or new sinks adjusted so Cash still matters on nights 10-20; `ui/economy*.test.mjs`. Before
  P-46 and P-47. After CL-88. Details: `docs/roadmap.md` P-108.
- [x] **GP-56** **R3 · P-35.** Drop news as a small notice from strings, not a hard-coded banner. After GP-88.
  Details: `docs/roadmap.md` P-35.
- [x] **GP-57** **R3 · P-40.** The dawn banner says what the dare earned. After GB-82. Details: `docs/roadmap.md`
  P-40.
- [x] **GP-60** **R3 · P-46.** Fixed equipment prices; guns stocked by act (D-48); the economy model re-run. After
  GB-61; after GB-81. Details: `docs/roadmap.md` P-46.
- [x] **GP-61** **R3 · P-47.** "Arrives night N" on unstocked guns; "New at the kiosk: AA-12" at dawn. After GP-60.
  Details: `docs/roadmap.md` P-47.
- [x] **GP-62** **R3 · P-49.** Both mods on the Upgrades tab, the fitted one marked, a free switch. After GB-84.
  Details: `docs/roadmap.md` P-49.

### R4 · The way out

- [x] **GP-82** **R4 · P-133.** Camo unlocks (D-66): four base camos, the rest earned per CL-96's plan, a toast on
  each unlock, locked items shown in the dressing room, the "dapper dan" console command unlocks everything. After
  CL-96. Details: `docs/roadmap.md` P-133.
- [x] **GP-63** **R4 · P-51.** "Call the boat" beside "Sound the alarm"; the dock blinks on the minimap once it's due.
  After GB-85. Details: `docs/roadmap.md` P-51.
- [x] **GP-64** **R4 · P-54.** The victory screen: the closing line, nights, kills, headshots, best streak, skulls
  banked, survivors aboard. After GB-86; after GP-52. Details: `docs/roadmap.md` P-54.
- [x] **GP-90** **R4 · P-46.** The economy model re-run with GB-113's skull cut (x0.67 from night 11) with the heavy
  barrel and suppressor sinks (Grokbot's GB-113 is done): `ui/economy-balance.mjs` and its report. Details: `docs/roadmap.md` P-46.
- [x] **GP-66** **R4 · P-86.** The relay's twenty morning lines, the survivors' lines and the props' notes in strings,
  on the board. After CL-74. Details: `docs/roadmap.md` P-86.

### R5 · Named nights and bigger systems

- [x] **GP-67** **R5 · P-60.** The board warns: "Fog Night", "The siege · they'll go for your walls". After GB-88.
  Details: `docs/roadmap.md` P-60.
- [x] **GP-68** **R5 · P-62.** "A colossus is walking the east trail" on the board; COLOSSUS DOWN from strings. After
  GB-89. Details: `docs/roadmap.md` P-62.
- [x] **GP-91** **R5 · P-86.** The props' notes as cards (docs/story.md §4): E at each of the ten sites reads its note
  from strings, once, as a short card. Where E already does something there (an objective's claim, the dock, the
  tower, the HQ), the note shows with that action instead of a second prompt. After GP-66. Details: `docs/roadmap.md` P-86.
- [x] **GP-69** **R5 · P-66.** Survivors on the board ("Someone lit a fire at the trapper's camp") and on the victory
  screen. After GB-90. Details: `docs/roadmap.md` P-66.

### R6 · Finish (1.0)

- [x] **GP-73** **R6 · P-83.** Credits: Jerry, the crew, Quaternius (CC0), the music. Details: `docs/roadmap.md` P-83.

## Antigravity — the crew's eyes (Gemini 3.1 Pro High)

### R2 · The night has a shape

- [x] **AG-30** **R2 · first tonight.** Eyes on what landed while the crew was halted, on Jerry's GPU: the marine's bored
  idle and cigarette (GP-74), the roll in all eight directions (GP-75), the kiosk hiding upgrades (CU-60), the CIF window
  with all 49 camos and the "Plain colours" heading (CU-61, Claude), and the horde under the map (type `swarm`, run over
  the hills shooting for 5 minutes: no zombie sinks). Shots in `qa/`, one report. Then answer the shot requests waiting
  for you in `handoffs/requests.md`, and take shots for each R2 change as it lands.
- [x] **AG-22** **R2.** R2 on the GPU: a fresh run to night 5, nights 10 and 13 from the debug start; the surge, the
  music, fps. After GB-73.

### R3 · The day feeds the night

- [x] **AG-23** **R3.** R3 on the GPU: days 1-10 fresh; the relay, the calls, caches, drums, the vault, the kiosk by
  act. After GP-61.

### R4 · The way out

- [x] **AG-24** **R4 · P-78.** A full run on Jerry's GPU to the boat: time it, win it, shots of the ending. After
  GB-86; after GP-64. Details: `docs/roadmap.md` P-78.

### R5 · Named nights and bigger systems

- [x] **AG-25** **R5.** Fog Night and the siege on the GPU: shots NVG on and off, fps. After CL-76; after GB-88.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71); Jerry plays Fog Night himself).
- [x] **AG-26** **R5.** Survivors, the wanderer and the secret quest walked through on the GPU. After GB-92.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71); Jerry plays the secret himself).
- [x] **AG-29** **R5 · P-146.** The Hollows on the GPU: each warren walked from the mouth to the Deep and out, shots of
  every depth, a video of the stir running out, fps. After GP-84. Details: `docs/roadmap.md` P-146.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71); Jerry walks the warrens himself).

### R6 · Finish (1.0)

- [x] **AG-27** **R6 · P-90.** Three full runs three ways (turtle, explorer, rusher) on the GPU; every bug on the
  board. After CU-57. Details: `docs/roadmap.md` P-90.
  **Dropped** (Jerry, 2026-10-01: no timed or long runs; he plays and makes the connections (D-71); Jerry plays the full runs himself).

## Claude — lead; the world, the studio and the reactions (Opus 5.5 High)

### R2 · The night has a shape

- [x] **CL-87** **R2 · P-101.** Co-op groundwork (D-58): `docs/coop.md`, the contract for "a player" (what each one
  owns, what is shared), the players-list API CU-63 builds, the three kinds of `player.position` read, and a first
  sketch of the host's messages for R7. Before CU-63. Details: `docs/roadmap.md` P-101.
- [x] **CL-91** **R2 · P-118.** Every kind has a weakness (D-62): the table, each zombie kind by damage type, with its
  counter named; P-26's plates as its first row. Before GB-104 and GP-80. Details: `docs/roadmap.md` P-118.
- [x] **CL-70** **R2 · P-20.** Night 19 sounds bigger than night 2: a gain that climbs night by night. Details:
  `docs/roadmap.md` P-20.
- [x] **CL-71** **R2 · P-21.** Late Ember and Guardian tiers, so nights 16 and 18 stop reusing nights 4 and 6. After
  CL-70. Details: `docs/roadmap.md` P-21.
- [x] **CL-102** **R2 · P-20.** The zombies keep their own animation pose like the marine now does (GB-67 follow-up):
  `updateZombies` writes partial Euler angles, so a reacting zombie reads some of its written pose back as its
  animation; a per-body snapshot before `apply()`, put back at the top of the update. Probably feeds t91's
  back-shot pitch. Small.
  Moved from Grokbot (was GB-98) on 2026-09-29 to spread his load: the reaction engine is Claude's (D-42).
- [x] **CL-62** **R2.** The rest of the guardian through the studio: the chase, the walk-out and the throw as scenes
  and clips, until Jerry's notes say good. Carried over. After CL-64 (done).
  Jerry (2026-09-29, Q-2): "looking better but still needs a lot of work". His notes (review/guardian-grab-drag v3,
  guardian-throw-out v1): the run-out and grab are close; drag him in faster; no blood trail; the marine shakes his
  head and pounds his fists as he is dragged; the walk-in grab jumps into the air for a few frames (fix it, no blood
  yet); the toss out looks poor; the cave needs real depth: he emerges from the dark, partly hidden, never pops in or
  out; more fluid motion throughout; a low growl. The toss: a lazy underhand softball pitch, as if the marine isn't
  worth his time.
- [x] **CL-104** **R2.** The guardian, Jerry's second pass: it comes out of the dark faster and smoothly; the toss
  with one hand; the marine held in its hand (hand-attached, his hips in its grip), never floating beside it; in the
  kick-free the marine struggles, braces his feet and pulls against the drag while the guardian tugs back. Through
  the studio review folders (guardian-grab-drag, guardian-throw-out) and in the game.
- [x] **CL-105** **R2.** The burial detail always wears woodland MARPAT, never the player's camo. Small.
- [x] **CL-69** **R2 · P-19.** The score follows the night's shape: a break in the breather, bridge and climax at the
  last push. After GB-71. Details: `docs/roadmap.md` P-19.

### R3 · The day feeds the night

- [x] **CL-94** **R3 · P-125.** The fidelity pass on the marine and his kit (D-64): less bulky, a touch more
  stylized; ear defenders only with the helmet; the facemask coyote brown for good; built so every item can be worn,
  swapped and coloured on its own (CU-70). Through the studio review folders. Details: `docs/roadmap.md` P-125.
- [x] **CL-95** **R3 · P-126.** The fidelity pass on the guns, and six suppressors (D-64, D-65): the M4, AK-47, pistol,
  sniper, Uzi and shotgun each get a can that belongs on it. Details: `docs/roadmap.md` P-126.
- [x] **CL-89** **R3 · P-110.** The loadout spec (D-61): `docs/loadout.md`, the slots and which gun goes where, akimbo,
  the Armory's storage, the magazine model, the holster key and the unarmed speed. First of the D-61 tasks. Details:
  `docs/roadmap.md` P-110.
- [x] **CL-103** **R3 · P-111.** The Armory's window at the HQ (D-61, `docs/loadout.md` section 2). Jerry: the CIF moves
  to the wall opposite the kiosk and skull window, and the Armory window goes beside it there. The prop, a prep-only E
  prompt, and the hook that opens GP-78's panel. After GP-78.
- [x] **CL-90** **R3 · P-116.** What he carries shows on him (D-61): primaries slung on his back, cross-draw holsters,
  the hip pistol, mag pouches, grenades, a shell bandolier, a 40 mm belt, the backpack; 3-4 stages each; the draw and
  holster moves through the studio. After CU-65. Details: `docs/roadmap.md` P-116.
- [x] **CL-88** **R3 · P-104.** Skills by doing (D-59): `docs/skills.md`, the spec: what counts for each of the six,
  the rank thresholds, the effects and caps, the reset on a fresh start, one set per player (D-58), and the new names
  for the streak's boosts. First of the D-59 tasks. Details: `docs/roadmap.md` P-104.
- [x] **CL-72** **R3 · P-43.** Fuel drums back at the guarded wrecks, sheds and the mast: they chain, and they're back
  each morning. Rule 10 signed off. Details: `docs/roadmap.md` P-43.

### R4 · The way out

- [x] **CL-96** **R4 · P-130.** The dressing room spec (D-66): every slot and its options, what takes camo, the four
  base camos and how the rest are earned (days, streaks, badges), one wardrobe per player (D-58). First of the D-66
  tasks. Details: `docs/roadmap.md` P-130.
- [x] **CL-97** **R4 · P-132.** The wardrobe on the rig (D-66): hats (8-point, boonie, ballcap forwards or backwards),
  gloves on or off, sleeves rolled or down, shorts, boot colours, hair, eyes and skin, camo on the guns. Eyewear, picked
  in the CIF (Jerry): aviators, a pit-viper style, a Wayfarer style, and the GWOT ballistic goggles. After CL-94.
  Details: `docs/roadmap.md` P-132.
- [x] **CL-73** **R4 · P-52.** The boat comes in: flares at the dock, a horn, a boat with a lamp sliding in during the
  last push. After GB-85. Details: `docs/roadmap.md` P-52.
- [x] **CL-74** **R4 · P-86.** Docs/story.md: The Signal's bible (D-44), the relay's twenty lines, the survivors'
  lines, what each place says. Details: `docs/roadmap.md` P-86.

### R5 · Named nights and bigger systems

- [x] **CL-79** **R5 · P-94, P-69.** The secret quest's spec, docs/specs/secret-quest.md, for Jerry's yes (D-56).
  After CL-74. Details: `docs/roadmap.md` P-94, P-69.
- [x] **CL-80** **R5 · P-95.** The secret's world: the pit stones pulse in order at night, seen from the tower; the
  lake goes quiet. After CL-79. Details: `docs/roadmap.md` P-95.
- [x] **CL-98** **R5 · P-134.** The Hollows' spec (D-67), `docs/specs/hollows.md`: the Hush, the five warrens, the
  depths, the stir, the loot, the story, the runtime contract with Cursor, co-op, and Jerry's three calls (Q-4), for
  Jerry's yes. After CL-74. Details: `docs/roadmap.md` P-134.

