# Board queues archived 2026-10-05

Finished tasks moved off crew/BOARD.md in Claude's board clear for Jerry (2026-10-05: "clear finished tasks and reorganize so that the agents can get their tasks easily"). Each one's report is in handoffs/.

<!-- board clear, 2026-10-05T22:40Z -->

## Cursor — integration, git, tools, engine core (Grok 4.7 High)

### R5 · Named nights and bigger systems

- [x] **CU-71** **R5 · P-136.** The Hollows' runtime (D-67): going down and coming up, topside frozen and hidden, the
  ground, colliders and a nav grid switched to the warren, building refused, players list aware. After CL-98; after
  CU-63. Details: `docs/roadmap.md` P-136.
- [x] **CU-80** **R5 · P-140.** The Hollows' haul goes live (contracts: the Hollows' haul, GP-83): an atomic grant
  hook `grantHaul(items) -> { ok, rejected }` that gives all of a strongbox's items or none (blueprint, gun, mod,
  camo, ammo, med pack, grenade) through the inventory's own adders, and the E adapters below: open a strongbox, take
  a crate, pick up a tag (`createHollowLoot`, `createTagCollection`). After CU-71.
- [x] **CU-79** **R5 · Story v2.** A ladder up the HQ's side (`docs/story.md` §5): the marine climbs it and stands on
  the roof; the roof is walkable ground with an edge; the HQ's door stays shut (sealed). Players list aware (co-op).
  For GB-116 and CL-75.
- [x] **CU-81** **Jerry, 2026-10-01.** Overhaul every gun's look (Claude okayed; Grokbot stays on GB-92): the same
  names, grips, moving parts and furniture materials, so camo, the rune finish and the survivors' M4s still work.
  Re-run t102, t159, t165; before-and-after shots of each gun (review/guns).
- [x] **CU-82** **Jerry, 2026-10-01.** The night lockdown: from the alarm to the morning no kiosk, Armory, CIF, HQ
  panel or skull window, and no build menu (B, the wheel, a picked piece); a build in hand is put away; every light
  on the HQ turns red. t179, review/night-lockdown.

## Grokbot — combat (Grokbot)

### R5 · Named nights and bigger systems

- [x] **GB-92** **R5 · P-97.** The secret's fight: on a silenced day the guardian falls back to the heart in the
  Marrow, and only there can it die (`docs/story.md` §9). After GP-70; after CL-78. Details: `docs/roadmap.md` P-97.
- [x] **GB-93** **R5 · P-98.** Swarm Night on 17: runners from every cave, faster pushes. After CL-76. Details:
  `docs/roadmap.md` P-98.
- [x] **GB-107** **R5 · P-138.** Fighting below: sleepers that wake to noise and light, nests to blow up, each Deep's
  set piece, cave roles, 24 awake at most. After CU-71; after CL-99; after CL-91. Details: `docs/roadmap.md` P-138.
- [x] **GB-108** **R5 · P-139.** The stir: noise fills a meter (suppressed much less), the Hush holds it; full or flat,
  the guardian comes through the rock; bolt-holes, the kick-free, else the cave death. After GB-107; after GB-106;
  after GB-105. Details: `docs/roadmap.md` P-139.
- [x] **GB-116** **R5 · Story v2.** The survivors on the roof (D-70, `docs/story.md` §5), in place of GB-91's three
  helps: the rescue (GB-90) brings Okafor, Brandt or Pike; on the roof they sleep by day and stand to at the alarm:
  Brandt fires the M240B, Okafor and Pike their M4s, at the dead near the HQ; Okafor heals him to full once a day (E
  beside her); Pike makes repairs cheaper (GB-91's cut, moved to her). Nothing targets them. Reset clears. After CL-75
  for the figures (stand-ins meanwhile); after CU-79 for the ladder.
- [x] **GB-119** **R5 · P-96 · Story v2.** The true ending in the world (`docs/specs/secret-quest.md` §6): on
  `'quest'` `{ kind: 'ending' }` every dead in the valley drops where it stands (no pay, no skulls); from the next run
  a rune-etched pistol lies on the dock planks by day (E to take it; the pistol, as good as the pistol, with the rune
  finish once CL-111 is in). After GB-92.
- [x] **GB-117** **R5 · Story v2.** Heron in the extraction (GB-86's flow): **CL-110 put Heron behind the boat's own API, so the flow already works (t145, t147, t158 pass); what is left is a check of GB-85/GB-86's wording and timings with Heron in, and anything that still says "boat" in combat code.** Called from the board as the boat was;
  Heron lands and taxis to the dock on CL-110's path and timing; boarding as before. After CL-110.

## ChatGPT — what the player reads and decides (GPT-6 Sol High)

### R5 · Named nights and bigger systems

- [x] **GP-81** **R5 · P-124.** Two new deaths on the tombstone (D-63): `lightning` and `rabbit` in the death catalogue,
  their lines and their unlock; the names and pickup lines for the boots and the grenade; a badge for killing the
  rabbit. After CL-92, CL-93. Details: `docs/roadmap.md` P-124.
  **Closed in the 2026-10-05 clear (Claude):** built and checked out (handoffs/2026-10-01-chatgpt-GP-81.md); what was left, the eyes on the GPU and the full suite, is AG-50 and CU-85.
- [x] **GP-70** **R5 · P-96.** The secret's UI: the glyphs at the radio, the silenced night on the board, the true
  ending, the rune pistol at the dock. Story v2 names: Ridgeline, Heron, the Marrow (`docs/story.md` §9). After CL-79.
  Details: `docs/roadmap.md` P-96.
  **Done as UI and model (Claude, 2026-10-01):** the radio, the board and the ending screen are live; the rune finish
  is CL-111, the rune pistol at the dock and every dead dropping at the ending are GB-119. GB-92 builds on
  `TT.getQuestState` now.
- [x] **GP-83** **R5 · P-140.** The Hollows' haul (D-67): `game/hollows-loot.js`: skulls, crates, one strongbox a
  warren a run (a blueprint, an early gun, a mod, a camo, a rune shard), **nine** dog tags (story v2: root 2, shale 2,
  iron 2, wet 2, hill 1); a delve pays about half a night. After CL-98; after GP-60. Details: `docs/roadmap.md` P-140,
  `docs/story.md` §8. **Claude (2026-10-01):** every strongbox holds its warren's shard and one gear prize (no repeats);
  the model is approved as written (contracts: the Hollows' haul); it goes live through CU-80's grant hook; skull pay
  below is GB-107's. Check it out done once the model and tests are in.
- [x] **GP-94** **R5 · Story v2.** The story's words (D-70, `docs/story.md` §3-4, §6, §9): Ridgeline's twenty morning
  lines (replacing Harbor Nine's), the field notes as E cards where CL-109 puts them, the ending lines (Heron, the
  true ending), and the names everywhere in strings: Ridgeline, Heron, FOB Threshold, the PGB, the Marrow; no
  "island", no "boat", no Medic-4. The sample window and the supply terminal's labels (skulls are samples, Cash is
  requisition credit).
- [x] **GP-95** **R5 · Story v2.** The survivors' words and their badge (`docs/story.md` §5): found, on-the-roof and
  aboard lines for Okafor, Brandt and Pike; the talk card on the roof; the victory screen's "Survivors aboard: 3"; the
  lifetime badge "Nobody left behind" (all three aboard); the motto "Against What Should Not Be." on the title. After
  GB-116 for the talk hook.
  **Closed in the 2026-10-05 clear (Claude):** built against GB-116's facts (handoffs/2026-10-01-chatgpt-GP-95.md); what was left, the eyes on the GPU and the full suite, is AG-50 and CU-85.

## Claude — lead; the world, the studio and the reactions (Opus 5.5 High)

### R5 · Named nights and bigger systems

- [x] **CL-92** **R5 · P-122.** Lightning in storms (D-63): 5 strikes a storm; 1 in 50 burns a tree, 1 in 100 kills the
  zombies where it lands, 1 in 200 hits the marine for 70 (never under godmode); insulated boots hidden on the map
  make him immune. Details: `docs/roadmap.md` P-122.
- [x] **CL-93** **R5 · P-123.** The rabbit mound (D-63): an out-of-the-way burrow with bones and a skull; shoot it and a
  white rabbit takes the marine's head off. The one answer: our knockoff holy grenade, hidden on the map, an angelic
  choir on the pin pull, and it kills the rabbit. Our own models, names, sounds and words. Details: `docs/roadmap.md`
  P-123.
- [x] **CL-75** **R5 · P-63 · Story v2.** The three survivors as PGB soldiers (D-70, `docs/story.md` §5): Okafor
  (medic), Brandt (M240B gunner), Pike (mechanic), each a marine-rig figure in PGB kit with their own look, hidden at
  their camp (the trapper's cellar, the watchtower and rangers' truck, the hikers' rock shelf); then on the HQ roof: a
  sleeping bag, a crate and a post each, the M240B on its mount, asleep by day, standing to at the alarm. TT shows
  each at the camp and on the roof.
- [x] **CL-76** **R5 · P-57.** Fog Night's fog: about 30 m, goggles or not; the night keeps its music arc. After
  GB-87. Details: `docs/roadmap.md` P-57.
- [x] **CL-112** **R5 · P-97 · Story v2.** The heart in the Marrow (`docs/specs/secret-quest.md` §5): one big round cave
  under the Marrow cave, the Pit's roots through its roof as rune-cut columns of white rock (they can come down in
  the fight's third phase), the source in the middle (a shaft of cold light going down, where the dead come up), the
  long tunnel from a warren's rune door. Built like a warren (`buildHeart`: group, groundAt, solids, nav, entry,
  columns, source). Unblocks GB-92 (Grokbot's request).
- [x] **CL-77** **R5 · P-58.** Fog Night's own sectioned score. After CL-76. Details: `docs/roadmap.md` P-58.
- [x] **CL-78** **R5 · P-67.** The guardian boss on the studio rig and clips (D-55). After CL-62. Details:
  `docs/roadmap.md` P-67.
- [x] **CL-81** **R5 · P-68.** The kick-free gets a real let-go beat in the studio. After GB-78; after CL-62. Details:
  `docs/roadmap.md` P-68.
- [x] **CL-99** **R5 · P-137.** The five warrens: a tile kit per theme (root, shale, iron, wet, hill), the set pieces,
  a sealed rune door in each Deep; nothing topside moves. v1 and v2 are in. **v3 (story v2, `docs/story.md` §8):** the
  husks (pale veined sacks on the roots, a hiker's boot or a ranger's jacket showing, some holding two or three bodies
  grown together); the iron warren's cut settler wall, the hikers' rope and lights; FOB Threshold's crates and kit for
  the dragged-down gear (no Medic-4). Then seen below on the GPU, after CU-71.
- [x] **CL-100** **R5 · P-142 · Story v2.** What the Hollows say (`docs/story.md` §8): nine dog tags of the nine
  Gravewalkers who died (Sato, signals, among them), a name and one last thing each; the rune doors' line; the shards;
  Ridgeline's "the Marrow" line after the first delve. In docs/story.md, for GP-83 and GP-84.
- [x] **CL-111** **R5 · P-96 · Story v2.** The rune finish (`docs/specs/secret-quest.md` §6): one more camo key,
  `rune`, for the gun furniture (CL-97's gun camo): dark wood or polymer etched with the Pit's glyphs, faintly lit at
  night; granted for good by the true ending (GP-70's flag). Review folder.
- [x] **CL-101** **R5 · P-144.** The Hollows sound alive: drips, the Hush's hum, the stir, the guardian in the walls,
  the music's underground state. After GB-108. Details: `docs/roadmap.md` P-144.
- [x] **CL-106** **R5 · Story v2.** The docs follow the story (D-70, `docs/story.md`): "island" becomes the valley,
  Harbor Nine becomes Ridgeline, the boat becomes Heron, the chalk cave and heart become the Marrow, Medic-4 goes; in
  `docs/roadmap.md` (its story section points to story.md), `docs/specs/secret-quest.md` (the clues are the twelve's;
  the Hush built with Ridgeline's help), `docs/specs/hollows.md` (nine tags, the husks, the Marrow cave's sealed
  door), `docs/contracts.md`. Words only; code ids like `chalk` stay.
- [x] **CL-107** **R5 · Story v2.** The valley's history, part 1, no words (`docs/story.md` §7): the first people: a
  few lichen-covered standing stones carved with the Pit's glyphs on high ground, a cliff carving of the ring of eight
  round a dark shape, offerings at the hill barrow; and **the Marrow cave's mouth sealed** by a carved stone door, its
  glyphs faintly lit at night. The door is cracked (the waking): the dead still squeeze out at night as they do now;
  only the marine can't go in or poke it (Grokbot is told). Review folder for
  Jerry.
- [x] **CL-108** **R5 · Story v2.** The valley's history, part 2 (`docs/story.md` §7): Coldwater, the ghost town: a
  few ruined foundations and a chimney, the parish church's stone shell by the cemetery, iron bands showing on the
  coffins where the ground has slumped, one grave open from below, horseshoes over the ruined doors; the iron cave as
  the old mine: timbering, the settlers' cut and bent iron bars, IRON BELOW boards; the trapper's camp: horseshoes,
  traps, the iron-ringed cellar hatch. Review folder.
- [x] **CL-109** **R5 · Story v2.** The recent dead and the PGB (`docs/story.md` §6-7): the hikers' missing-person
  posters at the Cordon's gate, their packs and rope at the mine mouth; the rangers' truck and radio; FOB Threshold's
  fall (sandbagged spots with brass, a dropped helmet, drag marks toward a cave); the stencils: the HQ door "FOB
  THRESHOLD · PGB · LOCKDOWN · DO NOT OPEN" with claw marks, the Cordon's gate "CORDON · PGB · NOTHING LEAVES", a PGB
  survey board at each of the five warren caves ("SURVEY · WARREN 3 · IRON · DO NOT ENTER"), the motto "AGAINST WHAT
  SHOULD NOT BE" on the HQ. The field-note props where §6 puts them (GP-94 writes the cards). Review folder.
- [x] **CL-110** **R5 · Story v2.** Heron, the floatplane (`docs/story.md` §1, §3): a military amphibious transport
  model, our own design; its arrival: in low over the trees, down on the lake, a taxi to the dock, engines idling
  while he holds; replaces the boat's model and path (CL-73's flares and the dock stay). Hand GB-117 the path and
  timing. Review folder.

### R6 · Finish (1.0)

- [x] **CL-82** **R6 · P-84.** The caves and the pit sound alive: the screech, cave groans, the pit's rumble. Details:
  `docs/roadmap.md` P-84.
- [x] **CL-83** **R6 · P-85.** Night dark but readable: threats, attack sides and hurt builds picked out (after Jerry
  answers CL-11). Details: `docs/roadmap.md` P-85.
- [x] **CL-85** **R6 · P-99.** The guardian's final fight gets its own music. After GB-92. Details: `docs/roadmap.md`
  P-99.

## Off the board: the tasks Jerry gave agents directly, 2026-10-01 to 10-02

Never on the board (each agent took an id with `crew.mjs newid`). Listed here so the record is in one place. All were checked out with a report, except CU-83, whose checkpoint commit went up at 2026-10-02 06:33Z.

### Cursor

- [x] **CU-83** Commit and push the crew's and Jerry's work since 321aef8 (Jerry)

### Claude

- [x] **CL-113** Jerry: overhaul the Armory (real guns on shelves with their attachments; mods bought at the kiosk, fitted in the Armory; a nicer menu; the weapon wheel never more than five spaces, Bigtex shooter excepted) · handoffs/2026-10-02-claude-CL-113.md
- [x] **CL-114** Jerry: gun camo moves from the CIF to the Armory; guns not yet stocked leave the kiosk and arrive on their night with a short unlock notice · handoffs/2026-10-02-claude-CL-114.md
- [x] **CL-115** Jerry: Training Ground — a title-menu entry to a white-tiled firing range (yellow line, five pop-up targets, the HQ's CIF/supply/Armory on the left wall) and a build room (HQ panel calls zombies in, skull window, infirmary bed; zombies stay there; death = blackout and wake on the bed) · handoffs/2026-10-02-claude-CL-115.md
- [x] **CL-116** Jerry: why the frame rate was so low (the Training Ground and the main game); the light budget · handoffs/2026-10-02-claude-CL-116.md
- [x] **CL-117** Jerry overnight: a performance pass on the main game and the Training Ground (fps and hitching) · handoffs/2026-10-02-claude-CL-117.md
- [x] **CL-118** The valley stays outside: the Training Ground's own frame of world updates; the terrain in wedges · handoffs/2026-10-02-claude-CL-118.md

### Grokbot

- [x] **GB-118** t98 ragdoll hops: a knocked-down body in a crowd ping-pongs (Cursor's CU-55 request) · handoffs/2026-09-30-grokbot-GB-118.md
- [x] **GB-120** Jerry: rename the CIF eyewear labels so none name a real brand or event (Teardrop shades, Wraparounds, Classic shades, B · handoffs/2026-10-02-grokbot-GB-120.md
- [x] **GB-121** Jerry: rename brand/model weapon names and trademarked camo names (display text only) · handoffs/2026-10-02-grokbot-GB-121.md
- [x] **GB-122** Jerry: rename MCCUU camo; player-facing Marine to Gravewalker · handoffs/2026-10-02-grokbot-GB-122.md
- [x] **GB-123** Jerry: PGB shoulder patch on the left shoulder of every soldier and military zombie · handoffs/2026-10-02-grokbot-GB-123.md
- [x] **GB-124** Jerry: relaxed unarmed stance (arms at sides, sway, walk/run swing) · handoffs/2026-10-02-grokbot-GB-124.md
- [x] **GB-125** Jerry: natural tactical crouch pose and crouch-walk (follow-up to GB-124) · handoffs/2026-10-02-grokbot-GB-125.md
- [x] **GB-126** Jerry: crouch speed 3.6 -> 2.2 m/s (no foot slide) · handoffs/2026-10-02-grokbot-GB-126.md
- [x] **GB-127** Jerry: full-auto by default on every auto-capable weapon · handoffs/2026-10-02-grokbot-GB-127.md
- [x] **GB-128** Jerry: new key layout 1/2/3/4 gear+holster, X fire mode · handoffs/2026-10-02-grokbot-GB-128.md
- [x] **GB-129** Jerry: shoulder long guns correctly (stock, cheek, hands) · handoffs/2026-10-02-grokbot-GB-129.md
- [x] **GB-130** Jerry: per-weapon hand anchors and true-to-marine weapon scale · handoffs/2026-10-02-grokbot-GB-130.md

### ChatGPT

- [x] **GP-96** Repair Story v2 and quest integration test fixtures · handoffs/2026-09-30-chatgpt-GP-96.md
- [x] **GP-97** CIF menu and panel overhaul requested by Jerry; preserve dressing and camo rules · handoffs/2026-10-01-chatgpt-GP-97.md
- [x] **GP-98** CL-111 follow-up: earned rune gun finish selectable in CIF · handoffs/2026-10-01-chatgpt-GP-98.md
- [x] **GP-99** CL-109 follow-up: Cordon gate and trailhead reading cards · handoffs/2026-10-01-chatgpt-GP-99.md
- [x] **GP-100** Jerry: HQ mural DEADWALKERS title and motto moved from menu · handoffs/2026-10-01-chatgpt-GP-100.md
- [x] **GP-101** Jerry: overhaul alarm panel menu and physical HQ alarm model · handoffs/2026-10-01-chatgpt-GP-101.md
- [x] **GP-102** Jerry: skull window intake hatch, deposit tray and live transaction display · handoffs/2026-10-01-chatgpt-GP-102.md
- [x] **GP-103** Jerry: Gravepost Threshold designation plate and layered legacy markings · handoffs/2026-10-01-chatgpt-GP-103.md
- [x] **GP-104** Jerry: smashed sparking front terminal and minimal rear HQ lettering · handoffs/2026-10-02-chatgpt-GP-104.md
- [x] **GP-105** Jerry: natural survivor faces and cloth balaclavas for the player · handoffs/2026-10-02-chatgpt-GP-105.md
- [x] **GP-106** Jerry: overhaul marine proportions uniform and equipment fit · handoffs/2026-10-02-chatgpt-GP-106.md
- [x] **GP-107** Jerry: ranger campsite and search-and-rescue truck overhaul · handoffs/2026-10-02-chatgpt-GP-107.md
- [x] **GP-108** Jerry: make ranger pickup visibly inoperable · handoffs/2026-10-02-chatgpt-GP-108.md
- [x] **GP-109** Jerry: photographed POI and set-dressing story review, excluding HQ · handoffs/2026-10-02-chatgpt-GP-109.md
- [x] **GP-110** Jerry: Coldwater church, house ruins and iron-banded cemetery overhaul · handoffs/2026-10-02-chatgpt-GP-110.md
- [x] **GP-111** Jerry: trapper homestead and reinforced root cellar visual overhaul · handoffs/2026-10-02-chatgpt-GP-111.md
- [x] **GP-112** Jerry: old mine breach and abandoned hikers gear overhaul · handoffs/2026-10-02-chatgpt-GP-112.md
- [x] **GP-113** Jerry: timber arch around mine mouth gaps · handoffs/2026-10-02-chatgpt-GP-113.md
- [x] **GP-114** Jerry: hikers campsite and Pike hiding place visual overhaul · handoffs/2026-10-02-chatgpt-GP-114.md
- [x] **GP-115** Jerry: male Pike and concealed natural rock refuge · handoffs/2026-10-02-chatgpt-GP-115.md
- [x] **GP-116** Jerry: weathered evacuation dock and ruined rowboat · handoffs/2026-10-02-chatgpt-GP-116.md
- [x] **GP-117** Jerry: Brandt watchtower observation-post art · handoffs/2026-10-02-chatgpt-GP-117.md
- [x] **GP-118** Jerry: resolve watchtower lake-stones sightline · handoffs/2026-10-02-chatgpt-GP-118.md
- [x] **GP-119** Jerry: Sato relay mast and repair station art · handoffs/2026-10-02-chatgpt-GP-119.md
- [x] **GP-120** Jerry: medical supply truck wreck art · handoffs/2026-10-02-chatgpt-GP-120.md
- [x] **GP-121** Jerry: Cordon checkpoint and convoy approaches · handoffs/2026-10-02-chatgpt-GP-121.md
- [x] **GP-122** Jerry: unclutter church and graveyard; keep burial plots clear · handoffs/2026-10-02-chatgpt-GP-122.md
- [x] **GP-123** Jerry: refine player and survivor anatomy · handoffs/2026-10-02-chatgpt-GP-123.md
- [x] **GP-124** Jerry: smaller shoulders with a natural chest connection · handoffs/2026-10-02-chatgpt-GP-124.md
- [x] **GP-125** Jerry: full-size armory firearm display and complete eligible lineup · handoffs/2026-10-02-chatgpt-GP-125.md
- [x] **GP-126** Jerry: integrate armory into wall with centered sign and mesh service screen · handoffs/2026-10-02-chatgpt-GP-126.md
- [x] **GP-127** Jerry overnight: lower armory hatch to marine height · handoffs/2026-10-02-chatgpt-GP-127.md
- [x] **GP-128** Jerry overnight: backpack carry layout and complete marine gear fidelity pass · handoffs/2026-10-02-chatgpt-GP-128.md
- [x] **GP-129** Jerry overnight: full weapon model and attachment fidelity pass · handoffs/2026-10-02-chatgpt-GP-129.md
- [x] **GP-130** Jerry reference pass: fixed Uzi/revolver mounts, fitted webbing, hats, boots, NVG headset and half mask · handoffs/2026-10-02-chatgpt-GP-130.md
- [x] **GP-131** Medium fade haircut, survivor rifle slings and existing unarmed stance · handoffs/2026-10-02-chatgpt-GP-131.md
- [x] **GP-132** Unarmed flashlight suppression and compact armory menu · handoffs/2026-10-02-chatgpt-GP-132.md
- [x] **GP-133** Training range target aiming and persistent impact marks · handoffs/2026-10-02-chatgpt-GP-133.md
- [x] **GP-134** Fit marine straps, bandoliers and equipment around the body · handoffs/2026-10-02-chatgpt-GP-134.md
- [x] **GP-135** Prewarm range impact marks and verify default renderer after CL-117 fix · handoffs/2026-10-02-chatgpt-GP-135.md
- [x] **GP-136** Keep sniper scope aligned to target while rifle raises · handoffs/2026-10-02-chatgpt-GP-136.md
- [x] **GP-137** Training facility soundscape and expiring bullet marks · handoffs/2026-10-02-chatgpt-GP-137.md

### Antigravity

- [x] **AG-47** shots: the stones from the tower at night (CL-80) · handoffs/2026-09-30-antigravity-AG-47.md
- [x] **AG-48** shots: GP-95 title motto (GP-95) · handoffs/2026-10-01-antigravity-AG-48.md
- [x] **AG-49** shots: GP-95 live survivor card and ending · handoffs/2026-10-01-antigravity-AG-49.md


## Orders from Jerry, 2026-09-25 to 2026-09-30 (moved off the board)

- **2026-10-01, ~00:20Z · CU-53: about 2 hours, not 10.** "It's running but we probably don't need it to do 10 hours worth. We need
  to condense that down to about 2." The full-run timing goes parallel (Claude's request to Cursor).

- **2026-09-30, ~22:20Z · On to R5.** "Great work please continue. If you guys get done with R4 move to R5." R4's
  tasks are done but CU-53 (running), so the mission is R5 now; R4 closes when Jerry has played a run to the boat.

- **2026-09-30, ~07:20Z · The fidelity pass is good; the crew works the night.** "Fidelity pass looks good to me nice
  work. I am going to go to sleep so you got the work for the rest of the night." CL-94 closed. R3's tasks are done, so
  the mission is R4 (his standing order).

- **2026-09-30, ~03:00Z · The mission is R3.** "Clear out the mission and change it to R3." Earlier (~02:30Z), after a
  short break: "Start them on their tasks please." R2's mission is cleared; the R3 mission above lists what is left.

- **2026-09-29, ~17:50Z · Jerry's review.** Suppressors good except the shotgun's: a big round can, "think No Country
  for Old Men" (Claude, CL-95). The CIF moves to the wall opposite the kiosk and skull window, with the Armory window
  beside it (CL-103). The guardian: comes out of the cave too slowly and not fluidly; the toss one-handed; the marine
  must sit in the guardian's hand, never off beside it; the kick-free needs the marine struggling and pulling against
  the drag (CL-104). After an escape the grab can happen again, and each escape takes more presses (GB-112). The
  burial detail always wears woodland MARPAT, whatever his camo (CL-105). Later, in the CIF: shades (aviators, a
  pit-viper style, a Wayfarer style) and the GWOT ballistic goggles (CL-97).

- **2026-09-29, ~08:15Z · R2 is go.** "Lift the hold and delegate tasks." Tonight: Cursor on Grok 4.7 High, Claude on
  Opus 5.5 High, Antigravity on Gemini 3.1 Pro High, Grokbot on Grokbot, ChatGPT on GPT-6 Sol High. Claude spread the
  load: GB-97 to Cursor (CU-77), GB-98 to Claude (CL-102), CU-76 to ChatGPT (GP-85); new CU-78 (commit what's waiting)
  and AG-30 (eyes on the work done during the halt).

- **2026-09-29, ~08:00Z · Clear the board, make the roadmap easy to see, improve the board.** "Clear the Board of all
  completed tasks. And make the roadmap easier to visualize all the stages. Clean it up." He picked all four board
  fixes Claude offered. Done by Claude: finished tasks to `crew/archive/board-queues-2026-09-29.md`; decisions one
  line each here, in full in `docs/decisions.md`; `docs/roadmap.md` cleaned (a stage map on top, history to
  `docs/archive/roadmap-history.md`); the Crew Panel's Roadmap box; `crew.mjs tidy` and `crew.mjs newid`.

- **2026-09-29, ~07:06Z · An underground cave system, on the board only.** "Someway to get past the cave Guardian.
  Underground cave system accessible through the cave entrances. Players can fight through underground caves during
  the daytime only... play underground for some extra cash... maybe they can unlock blueprints or weapons... They
  cannot build under there. We need to work it into the story... Don't actually do any work, just come up with a
  cohesive plan and put it on the board." Planned by Cursor as D-67 (the Hollows), R5, P-134 to P-146.

- **2026-09-27, ~18:00Z · Finish R1, then halt.** "After we finish Phase R1 we are going to halt work for a few days
  until some of the usage can reset." So: R1 closes (GB-70 and CL-68 once Jerry's lab notes are in; AG-20 and AG-21 on
  his GPU), everything waiting is committed, and then nobody starts anything until Jerry says so. R2 and R3 work
  already done stays; don't take new R2/R3 tasks once R1 is closed. The mission line says when the halt is on.

- **2026-09-26 · A reaction tool, the roadmap to finish the game, and the open calls.** "Create a hybrid
  animation/ragdoll tool similar to Euphoria, specifically tailored to be light enough to use in this game; work
  that into our current plan. The agents need to easily be able to use this tool and I need to be able to review
  and make notes on animation." Then the board as "a giant roadmap for the completion of this game with tasks for
  all the agents in each phase" that "plays to each model's strengths", and the plan's calls he'd left open:
  "use your best discretion to make it fun and tell a fun narrative." Done as CL-65 (D-42), the roadmap (D-43,
  `docs/roadmap.md`), the story (D-44) and D-45 to D-56. The compiled suggestions it grew from are its Coverage
  table (now `docs/archive/roadmap-history.md`).


- **2026-09-26, ~04:40Z · Face the prey, then turn and drag.** On the first scene preview: the guardian grabs the
  marine while facing away from him. A creature grabs facing its target, whatever way the target lies, aiming for the
  leg; then it turns round and heads for its cave, dragging him. Into CL-64. Also: other agents have suggested a
  ragdoll hybrid like the Euphoria engine; maybe some time in the future (Claude's view: as a layer on scenes, for the
  body being thrown about, after CL-64; `docs/studio.md` Later).

- **2026-09-26, ~04:30Z · Scenes: the grab is the problem, and build it to reuse.** After seeing the studio's guardian
  strips: "the problem may not have been as much with animation but the position of the two models' limbs (placement
  on grab) and the speed and movement. It's very hard to tell from the strips and video, but the tool is cool and
  works." He agreed to both steps (the studio shows the real moment with both bodies; then fix it in the game), and:
  "make sure we can reuse whatever we develop here for future development. Not a one-off thing but a robust tool we
  can transfer from scene to scene." D-41.

- **2026-09-26, 01:40Z · The studio (future development).** Jerry has his showcase copy and is happy with it. His
  long-held idea: bridge the gap between a human developer and a creation suite agents can understand. Jerry is the
  critic ("we need this or that"); the agents can see what they have to do instead of a million blind attempts. Start
  with modeling and animation for this game, then textures and sound. The guardian's model is great; its animation is
  poor; it is the first job once the tool exists and Jerry's part is explained. The marine's animation is fine for now.
  He linked the Quaternius Universal Animation Library 1 and 2 (`Desktop\Animation Assets`, CC0) as a guide for
  character animation, and his earlier Caracal Studio texturer. D-40, `docs/studio.md`.

- **2026-09-25, 01:15Z · Git is shared.** Jerry overrides AGENTS.md rule 6: Claude may now commit
  and push too, not only Cursor. D-27.

## Decisions D-0 to D-39 (one line each; in full in docs/decisions.md)

- **D-39** · The loop's two transitions (Jerry, 22:45Z; revises D-34, CL-49 and CL-51)
- **D-38** · Bounty rewards (Claude, for Jerry; GB-57 asked)
- **D-37** · Daytime: a scouting report and bounties (Claude, for Jerry)
- **D-36** · The load budget is met by the splash (Claude, for Jerry)
- **D-35** · Loop feel first (Jerry)
- **D-34** · The end of a night is a choice (Jerry)
- **D-33** · No alarm stinger (Jerry)
- **D-32** · Claude's calls from the plan (Jerry did not overrule)
- **D-31** · Ways to die is a lifetime collection (Jerry)
- **D-30** · No saves (Jerry)
- **D-29** · Day 1 is 15 zombies, half out of the ground (Jerry, revising "horde sizes stay")
- **D-28** · The sky follows the loop (Jerry)
- **D-27** · Cursor and Claude both commit and push (Jerry, 01:15Z; replaces "only Cursor")
- **D-26** · The guardian chase (Jerry 22:52Z, revises D-25; built as GB-35)
- **D-25** · A cave poke is the cave grab (superseded by D-26 on the trigger and the chase)
- **D-23** · Performance: fewer things per frame, measured
- **D-22** · Shooting into a cave brings the guardian out (GB-25, approved with changes)
- **D-21** · Claude owns the music director
- **D-20** · The death replay comes out
- **D-19** · The plan is `docs/plan.md`
- **D-18** · Scripted-death replays (GB-18) are approved
- **D-17** · Cursor's objective interaction (CU-10) is approved
- **D-16** · Grokbot's GB-16 helpers are contracts, with three fixes
- **D-15** · The split goes a slice at a time
- **D-14** · Every check-in names its model
- **D-13** · The guardian night (GB-13 spec) is approved, with two changes
- **D-12** · Floors follow aim
- **D-11** · The repair helpers are contracts
- **D-10** · OpenCode leaves; five agents
- **D-9** · Six agents; tasks by strength
- **D-8** · Until the split, UI hooks are window events that each owner adds in their own part
- **D-7** · A test whose expectations change gets a second pair of eyes
- **D-6** · Crew board, round two
- **D-5** · Pit view
- **D-4** · `sampleHeight` and `POI` become read-only exports of `world/terrain.js`
- **D-3** · Test triage
- **D-2** · Load time: the fix is the title gate, not the bake
- **D-1** · Apply the loader patch now, not after the split
- **D-0** · Earlier calls
