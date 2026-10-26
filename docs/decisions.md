# Grave Shift decisions

Every call made for the game and the crew, in full, newest first. Claude writes them (as lead, or for Jerry);
they stand unless Jerry overrides them. `crew/BOARD.md` lists each one on a single line; this file has the
details. Moved here from the board on 2026-09-29 so the board stays short. Nothing was cut.

- **D-92 · The sound and UI principles approved; a sound only if it's immersive or impactful (Jerry, 2026-10-26, in chat).**
  Jerry read docs/ui-principles.md and docs/sound-principles.md: "UI is good." For sound, in place of the draft's "every
  sound means something": "no noise unless it's: 1. Immersive 2. Impactful." Both are now in force (CL-268).
- **D-91 · The mortar has no upgrades; the machete's teeth on its edge; the Uzi's sights clear (Jerry, 2026-10-25, in chat).**
  Jerry: "I saw updated models for mortar upgrades. We are getting rid of upgrades for the the mortar so those extra models can dissapear." The mortar is one build: no upgrade track, no Mk II or
  Mk III, their meshes gone (GB-234). And: "Machete serrations should be on blade not on top of machete." "Uzi sights need to be usable, right now the charging handle gets in the way." (GB-235).
- **D-90 · The base game first: co-op on hold, a playthrough when the road is done (Jerry, 2026-10-25, in chat).**
  Jerry: "Once you guys have finished out 1.1 let me know and I will do another play through." Claude: in the plan, 1.1
  also holds co-op and the Steam release, after the notes, the sweep and the principles passes; better that he plays once
  those are done, before co-op, so what he finds can still shape it. Jerry: "Yes. I was thinking the same thing. Hold off
  on co-op. We are still quite far away from finishing the base game." So:
  - Co-op (D-83) is on hold until the base game is finished. Nobody starts co-op work meanwhile; the players list and
    `check-players` stay as they are (the groundwork).
  - When the road's work is finished and tested in one build (his 31 notes, the sweep, the principles passes), Claude
    tests it whole, then tells Jerry, and he plays it through again. His notes from that set the next stretch.
  - The Steam release stays tied to 1.1 (D-84); when that comes is his call after the playthrough.
- **D-89 · The animation and asset principles, the art direction, the motion libraries, the alarm's metal sting, the
  storms (Jerry, 2026-10-24, in chat).** Jerry asked whether a Blender MCP would help with animation. Claude: not now; the bodies and their motion are
  built in code, and the studio (D-40) already gives the agents keyframed clips, filmstrips and reference retargeting.
  Jerry: "We should pull the marine's moves into the studio", and asked what most limits reliable results; Claude: the
  agents can't watch the game in motion on his PC, so they check stand-ins they chose themselves; the fixes are
  recordings of his exact moment replayed, targets in numbers before building, reference over adjectives, and his review
  per stage. Jerry then sent the universal animation principles (`docs/animation-principles.md`, AGENTS.md rule 18)
  and three libraries: the CMU motion capture database as FBX (2,548 human clips; CMU's terms: in a commercial game
  yes, the data itself not for resale, credit mocap.cs.cmu.edu), and Quaternius' Ultimate Animated Animals and Easy
  Enemy (CC0). "Yes. Excellent and I will try to find you guys bird references." CL-261 becomes the marine's moves
  as studio clips (the unarmed run, the knife, machete and katana, the ladder) under the protocol. Also today, from
  his notes: the alarm plays his metal sting again on top of the klaxon (CL-265, N31; revises D-33), and storms come
  half as often with none before day 3, with windy spells in between (CL-262, N14, N15). Then the universal 3D asset
  principles (`docs/asset-principles.md`, AGENTS.md rule 19) with his rule that an agent never judges a model from code
  alone (render it, several angles and lights, gameplay scale; geometry, materials, context), and his suggestion of a
  world-wide art direction above them: Claude wrote `docs/art-direction.md` (the four families: military, settler,
  industrial, the uncanny; how the uncanny breaks the rules; the reserved gameplay colors; scale by camera). Bird
  references from Jerry for the birds (N22): Sketchfab's "Animated Bird, Pigeon" by dudecon (CC Attribution; the author
  says public domain; glide, flap, idle, takeoff, landing) and "White Eagle Animation Fast Fly" by GremorySaiyan (CC
  Attribution); downloading them needs his Sketchfab sign-in. His answers to Claude's follow-ups: existing models and
  moves go through a principles pass, each owner fixing only what breaks a principle ("this game is created by
  iteration, not one-shot perfection"; CL-267, GP-19970, GB-233, AG-126); work in flight is compared to the principles
  and changed where needed; he reviews the art direction; sound and UI principles are drafted from what the game
  already established, UI to fit the world (CL-268); the flight recorder is wanted (CL-266, CU-160; Claude's caveat:
  exact for his own body, camera and aim, close for the dead). "If it helps development then anything is better than
  nothing." His UI inspirations: "Soldier of Fortune 2: Double Helix, Dead Space, Fallout. Think CRT terminal. But our
  own unique spin on it. Readable but inspired." (`docs/ui-principles.md` §0: the Branch's field terminals.)
- **D-88 · The road to 1.1: the sweeps lead, the notes in parallel; the world and quest rules (Jerry, 2026-10-24, after
  his 1.0 playthrough; Claude, in chat).** Jerry sent the placement sweep (is anything blocking another object; do the
  distances make sense; does the scale) and the transition sweep (do objects transition sensibly; what contact looks
  like; anything floating, clipping or ugly in between), the 15 rules of spatial world design, the placement hierarchy
  and the look (`docs/world-design.md`), the 12 rules of quest and narrative design and the five questions every quest
  answers (`docs/quest-design.md`), and 31 notes (`docs/jerry/2026-10-24-playthrough-notes.md`). Claude asked how to
  split it and whether he wanted to review the big designs first. Jerry: "Sweeps lead, notes in parallel" (Claude and
  Antigravity sweep the world location by location while the others fix the notes in their areas), and "Design and
  build, I play it after" for the story chain, the Hollows, the way into the day missions and the relay.
  - The plan: `docs/road-to-1.1.md` (five stages; each landed stage is a 1.0.x build that Jerry uploads; 1.1 is the
    Steam release with co-op).
  - Every placement follows world-design.md and every quest answers quest-design.md's five questions in its spec
    before it is built (AGENTS.md rule 17).
  - Model polish is no longer frozen: first person shows the guns, the hands and the reloads up close.

- **D-87 · The playtest's fixes, all in 1.0; the aim rebuilt (Jerry, 2026-10-23, after friends played it; Claude, in
  chat).** Jerry: "I got a few people to playtest the game and we came to a consensus ... These need to be included
  in 1.0. Especially the aiming system." The list:
  1. The chapel (Coldwater's church shell) has no collision: he walks through its walls.
  2. Third-person aim is hard; rounds don't connect. The chief complaint of every player.
  3. The slow-mo dive goes: the button slows time and he doesn't dive.
  4. Some corpses float after death.
  5. Ferals are too fast (they close in too near to shoot): slower again.
  6. Shamblers are too fast from the start: slower.
  7. Killed by a cave's guardians while running from the dead, the dead freeze; they should keep moving.
  The aim, Jerry's design: a number key (5, the next free one) switches between third and first person; right-click no
  longer goes to the shouldered view. In third person, right-click zooms the camera in 2x and centres it on the cursor
  instead of on him, as Project Zomboid does. His answers: held, not toggled; first person is a true view from his
  eyes (not the shoulder view), and there right-click aims down the sights (iron sights, or a scoped gun's scope);
  rounds land where the cursor is on a zombie, with a light assist (a gentle pull when the cursor is just off one,
  never a lock); shamblers slower on the early nights and back near today's speed by the late ones.
  - This replaces CL-174's right-click shoulder view and CL-193's dive, and lowers D-77's speeds for ferals and for
    shamblers early. The work: CL-247 (the third-person zoom, rounds and assist), CL-249 (first person and its
    sights; GB-222 gives each gun's sight point), CL-248 (the slow-mo), AG-119 (the chapel), GP-19959 (the speeds),
    GP-19960 (the corpses), GB-221 (the freeze).

- **D-86 · A balance pass before the playthrough (Jerry, 2026-10-23; Claude, in chat).** Jerry: "a big balance pass.
  Everything starting relatively easy and progressively getting harder by day 20 ... weapons, HP, zombies, ammo,
  buildable items, the works." His answers: a first pass now, which his weekend playthrough then tunes; night 20
  brutal; today it feels uneven and spiky; Grokbot's weapons and combat numbers reassigned for this pass (to ChatGPT
  and Claude; Grokbot reviews when Jerry has restarted him). The plan and every number: `docs/specs/balance-1.0.md`
  (from the live code at cb2e7e2, `docs/specs/balance-1.0-inventory.md`).
  - No night lighter than the one before; rest nights hold level with their longer breathers; every night keeps its
    trick, set pieces, caves and cadences. Zombie hits on the player x1.025 a night from 11 (x1.25 on 20).
  - The outliers fixed: the night-11 pay cliff (a ramp instead), the rotary gun and Breacher-12 made real upgrades,
    the Watchman MG cut to a strong emplacement, screamers killable, bombers able to run, shamblers worth 2, and a
    "100 %" hit on Jerry's sheet always a kill (it reads this body's HP).
  - This overrides D-71's "no simulations" for this pass only, and only for the analysis behind the curve; Jerry's
    notes stay the judge from here.

- **D-85 · The title in about 14 s warm for 1.0 (Jerry, 2026-10-21; Claude, in chat).** GP-19951 measured the title at
  14.1-15.0 s warm and about 14.3-17.7 s cold, against D-76's 6.3 s. The world builds in the same ~2.6 s as then; the
  rest is the warm-up that compiles every shader and runs the hidden staged and live fights before the menu (CL-192,
  CL-227, CL-229, CL-232, GP-19949), which is what keeps night 20 free of mid-fight builds (60 fps, 1 % low 55-56).
  ChatGPT's first trim saved under a second warm and nothing cold. Claude asked: accept ~14 s, show the title early
  with Start held until the warm-up ends, or cut the warm-up back toward 6 s (mid-night hitches return). Jerry: accept
  ~14 s for 1.0. The loading bar keeps moving; the title budget in AGENTS.md rule 12 is now about 15 s warm and
  18 s cold; revisit for 1.1 if the friends' notes ask for it.

- **D-84 · 1.0 ships on itch.io; Steam comes with 1.1 (Jerry, 2026-10-20; Claude, in chat).** Jerry wanted Steam at
  first and asked about itch.io; Claude's view: itch.io for 1.0 (free, up in minutes, no review queue, the share is
  his to set, a safe first public release whose fixes go out the same day, and it does not stop a Steam release
  later), then Steam with 1.1 and co-op (a far bigger audience but $100 a game, a 30% cut, a store page, trailer and
  wishlists, and one launch boost, which "4-player co-op" earns better; Steam's free networking relay also answers
  co-op's relay-server question). Jerry: "Yeah that sounds good to me. I can have friends play the itch.io version
  and give us notes and criticism for the steam release."
  - The itch.io build is the desktop download (the browser build is about 1,500 files; itch's in-browser limit is
    500 by default).
  - Before selling anywhere: the music and sounds' commercial licences checked (Suno, ElevenLabs): Jerry's to read,
    Claude lists every file and where it came from.
  - Publishing the page and the build stays Jerry's (D-81): Claude prepares it, he presses publish.
  - The 1.0 page is restricted and password-protected (Jerry, 2026-10-20): his friends get the password; it goes
    public when he says.
  - The licences (Jerry, 2026-10-20): the Suno songs and the ElevenLabs music and sounds were all made on paid plans;
    the disclosure video's song is Suno, its siren and its voices ElevenLabs; the Training Ground's clips are ElevenLabs.

- **D-83 · Co-op stays after 1.0, as 1.1 (Jerry, 2026-10-20; Claude, in chat).** Jerry asked whether 4-player co-op is
  feasible and whether it belongs in 1.0. Claude's answer: feasible (the players list, `nearestPlayer`, `check-players`
  and `docs/coop.md` are the groundwork, all green), but not in 1.0: about 60 functions still assume one marine, every
  mission and the Hollows would need sync and a two-machine test, the frame target isn't met yet, and internet play
  needs a relay server (his money and account). Jerry: "I would just continue the route we have keeping in mind that we
  will implement later and then we will plan for a possible 1.1 multiplayer." So D-58 stands: R7 is written when R6
  closes, as 1.1, starting with a second marine on one PC, then LAN, then the internet relay. Until then the rule holds:
  new game logic reads the players list, never `player.position`. His calls for R7 (revives, when a run ends, friendly
  fire, breaking a catch) wait for then.

- **D-82 · The day missions are in 1.0 (Jerry, 2026-10-19; Claude, in chat).** Jerry: "If you think it is wise to bundle
  them with 1.0 let us go ahead and do so." The six supply sites still opened with a plain E search (the medical convoy,
  the ranger cache, the hikers' first-aid kit, the trapper's supplies, the fuel depot, the utility truck) become
  mini-games, as the radio mast did (CL-183 to CL-185). The designs and his comments on them are his; the numbers and the
  details are Claude's lead calls, which he can overrule: `docs/specs/day-missions.md`.
  - Each mini-game opens its site once a run; later restocks stay a plain E search.
  - Until its mission is done the site is `locked` in `objectiveReach`, so the objective runtime and its tests stand.
  - The fuel depot is Claude's rework of his idea (he wasn't sure it works): only fire or a spitter's acid sets the can
    off, it leaks a trail the dead follow, and it can be put down.
  - The order: frame rate first (each owner finishes the cut they're on), then the missions, the fuel depot last.
- **D-81 · Jerry is out of the approval loop for now (Jerry, 2026-10-19; Claude, in chat).** Jerry: "Cut me out of the loop for approval for the time being. Make decisions based on what seems best."
  So, until he says otherwise:
  - Nothing waits for his yes. A question that would have gone to him (`crew.mjs ask`, a Q-n, "awaiting Jerry's
    approval" on a card or in a report) goes to Claude as a request (`crew.mjs request <you> claude ...`). Claude
    decides, logs it, and gives the reason in the reply; a call that changes how the game plays or looks gets a D-n here.
  - Owners still own their files: crossing into someone else's still needs that owner, or Claude when they are away.
  - Still his alone: deleting or overwriting his own files and work, anything that costs money or touches an account,
    publishing anything outside the repo (the 1.0.0 release itself), and undoing one of his own orders or decisions.
  - His standing orders stand (one game test at a time, the slot with him first, no timed or long runs, the frozen
    model polish). What he tells an agent in chat is still his order for that agent.
- **D-80 · The inspector is the game (Jerry, 2026-10-14; CL-196).** Jerry asked for an audit of AG-75's Marine Inspector,
  which he means to use "for all visual inspections of models and animations for here on out", for the agents too, made
  future-proof, robust and easy to change, and widened to every model. Asked whether it should run the real game's code
  or keep copies of it, he chose the real game's code. The audit (studio/inspector/AUDIT.md) found the copy already
  drifting from the game within hours (holdWeapon 0.28 similar, makeMarine 0.43) and parts of it invented. So: models and
  animations are looked at in the inspector, `index.html?inspect` (Open Marine Inspector.bat), the game booted into a
  studio, where every model is made by its own builder and every move is the game running at the game's own clock.
  Nothing is copied out of the game for it. A new model is an entry in studio/inspector/catalog.js (and, if its builder
  lives only in index.html, a line in inspectHost()); `node tools/camera.mjs check` builds and pictures every one. Agents
  use window.DWInspect or the camera's --inspect mode. tools/marine-inspector.html stays as it was until Jerry retires it.
- **D-79 · The game is Grave Shift (Jerry, 2026-10-09).** Jerry, 21:42 CT: "the name Dead-Wave is taken by another
  zombie TPS, so the game is now called Grave Shift. If you could rename everything Dead Wave that would be
  wonderful." Everything a player or the crew reads says Grave Shift (GRAVE SHIFT where a title is in capitals):
  the title and its wordmark, the HUD, the error card, the menus and credits, the docs' and galleries' headings, the
  crew panel, the console log prefixes. What anything looks up by name stays as it is, so nothing breaks and no save
  is lost: file and folder names (Play Dead-Wave.bat, dist/dead-wave, docs/images/dead-wave-key-art.jpg), the repo
  jerrykoller5000-cyber/Dead-Wave, the tt_* save keys, the Documents\Dead-Wave profile folder, the desktop app's
  identifier com.deadwave.game and its dead-wave crate and exe, string keys and code names. Older entries on the
  board, in the log and in these decisions keep the old name as history. New copy says Grave Shift. Done by Grokbot
  (GB-155, handoffs/2026-10-09-grokbot-GB-155.md); ChatGPT for ui/strings.js; Cursor for desktop/.
- **D-78 · Cursor's map work moves to ChatGPT (Claude, 2026-10-06).** Cursor's CU-88 fix landed at 08:17 (its NOTE; t203
  12/0, again 12/0 for Claude at 22:10Z) but it never checked out, and it has not been heard from since its 17:44 check-in.
  Jerry is away for a few hours and left Claude to keep the crew moving; ChatGPT's queue is empty. So CU-88 is closed by
  Claude, and CU-89, CU-90 and CU-91 (the minimap's enemies, the map, the mission markers) are ChatGPT's as GP-145, GP-146
  and GP-147, with the same wording. Cursor keeps git, the commits and the integration suite.

- **D-77 · The dead, from Jerry's playthrough 1 (2026-10-06).** "Zombies need to all be faster on average... reach up to
  90% of players speed while sprinting. Sprinters need to outpace player on sprint. 70% of the zombies need to
  congregate while the other half attempts to flank the player." (Read as 70% closing in together and the other 30%
  flanking; Jerry, asked, 2026-10-06: "Basically.") He wants a horde, not a trickle (night 20 was "a slow boring trickle"). The maimed: no legs, they crawl;
  one leg, they hop at 75% speed; no limbs, they die. GB-135, GB-136, CL-129; his notes in
  handoffs/2026-10-06-jerry-playthrough-1.md.
- **D-76 · The title in about 6 s warm (Jerry, 2026-10-05).** CU-56 measured the title at 6.3 s warm and 6.4 s cold on
  Jerry's PC (the 100 shader variants compile every time, 1.6 s, and nothing is cached). Asked (Q-7) whether that is
  fine for 1.0 or a task to get under 5 s, Jerry: "Those times are fine." Rule 12 and P-88 say about 6 s warm; no task.
- **D-75 · The marine stays left-handed (Jerry, 2026-10-05).** Grokbot found (GB-129) that his gun arm is his
  anatomical left, so the stock sits in his left shoulder. Asked whether to mirror him (Q-6), Jerry: "No, Leave him
  left handed I think it's cool." The arms, the holsters, the draw, the reload pouch and the carry stay as they are;
  CL-121 closed with nothing to change.
- **D-74 · Nothing the player reads names a real brand or product (Jerry, 2026-10-02).** The guns, the camo patterns
  and the eyewear take made-up names: GW-4 Carbine, KR-7 Rifle, Breacher-12, Wasp SMG, Rotary Gun and Watchman MG;
  Classic Woodland, Arid Blend, Jungle Blend, Digital Woodland, Boreal Digital; the CIF's shades by shape. The player is
  a Gravewalker on screen, not a Marine. Ids, string keys, mesh names, save keys and code comments keep the old words.
  GB-120, GB-121, GB-122 (the full table is in handoffs/2026-10-02-grokbot-GB-121.md).
- **D-73 · The key layout: 1 to 4 and X (Jerry, 2026-10-02).** 1 night vision, 2 flashlight, 3 laser, 4 holster and
  draw; X the fire selector, and X sells only in build mode. N, L, Z, K and U are free. With B held, 1 to 9 still turn
  the build wheel's pages; nothing fires while typing in a field. GB-128; docs/controls.md.
- **D-72 · Full auto by default (Jerry, 2026-10-02; replaces D-65's "semi from the start").** Every gun that can fire
  full auto starts each run on AUTO; a press of the selector is kept for that gun until a new run. The pistol fires semi
  until its auto sear is fitted, then AUTO. GB-127.
- **D-71 · Build the pieces; Jerry plays them (Jerry, 2026-10-01).** "Do not worry about doing timed or extensive
  runs. You guys really need to focus on just getting these elements into place and I will playthrough and make the
  connections." No timed full runs, no nightsim medians, no fps or load campaigns, no full-run play checks by the
  crew. Each task builds its piece and proves it with its own quick test; Jerry plays and says what to change. Dropped:
  CU-53, CU-54, CU-73, AG-25, AG-26, AG-27, AG-29. Rewritten: GB-94 (balance from Jerry's notes), CU-55 (`npm test`
  green), CU-56 (one quick look on the GPU).
- **D-70 · The story, v2 (Jerry, 2026-10-01; replaces D-44's details).** `docs/story.md` is the bible. A valley in
  forest ringed by mountains, with a lake and rivers; everyone who came here died: the first people (the stones, the
  barrow, the Marrow cave's sealed door), the Coldwater settlers (the iron mine, iron-banded coffins), the trapper,
  the hikers who cut the mine's bars, the rangers. The PGB, the Paranormal Ground Branch, unofficially the
  Gravewalkers ("Against What Should Not Be."), walled the valley (the Cordon), built FOB Threshold and sent twelve;
  it fell on the fifth night. Nine died (nine dog tags below); three hid and are rescued: Okafor (medic, heals him on
  the roof), Brandt (M240B on the roof), Pike (mechanic, cheaper repairs); they live on the HQ's roof, which a ladder
  reaches; the HQ is sealed. Ridgeline is the voice on the relay; Heron, a military floatplane, is the way out. The
  white rock is the Marrow; the heart sleeps in it; the tone is its voice and raises the dead; the guardian is its
  body and protects it. The history is told by things on the map, not walls of text. Tasks: CL-106 to CL-110, CU-79,
  GB-116, GB-117, GP-94, GP-95; CL-75, CL-99, CL-100, GP-70, GP-83, GP-84, GB-92 rewritten.
- **D-69 · The dressing room: only camos are earned, from the best run (Claude, for Jerry; CL-96).** The four free
  camos are Jerry's (M81, Coyote Brown, Olive Drab, MARPAT). The other 45 are earned from what the game already keeps
  between runs: the best-run records (day, kills, streak, headshots, skulls in one run; runs finished; wins) and the
  badges, each camo on one rule (`docs/wardrobe.md` section 4). Every other option (hats, eyewear, boots, gloves,
  sleeves, shorts, hair, eyes, skin) is free. Kit bought in a run is styled in the dressing room but still bought each
  run. Gun camo is on the furniture; metal stays metal. GP-82, CL-97, CU-70.
- **D-67 · The Hollows: underground by day (Jerry, 2026-09-29; planned by Cursor at his order).** Five of the six
  caves (root, shale, iron, wet, hill) have a warren under them. The chalk cave stays deadly: it's the guardian's home,
  over the source.
  - **Getting past the guardian: the Hush.** A box built from the relay's spare board plays the signal back out of
    step, so the guardian can't hear the man carrying it. He gets it the morning after the relay is repaired (Act 2).
    The HQ charges it once each dawn: one delve a day. Lit at a mouth, it stops the walk-in grab, and E takes him
    down. Topside rules stay as they are (the poke chase D-26, the walk-in grab, D-46).
  - **Daytime only.** He goes down only in prep, the night can't start while he's below, and nothing topside moves
    while he's under.
  - **Down there.** Three depths, dark (the gun light and the NVG earn their keep): sleepers that wake to noise and
    light, nests to blow up, and each cave's role applies. Each Deep has a set piece (the climbers' knot, the shale
    flankers, the iron mine crew, the drowned, the barrow king). No building of any kind.
  - **The stir.** Noise fills a meter, suppressed fire much less (D-65). When it fills, or the Hush runs flat
    (about 8 minutes), the guardian comes through the rock after a 10 s warning. A bolt-hole or the way out saves
    him; the run's one kick-free applies (D-46). Otherwise the cave death, which ends the run.
  - **The haul.** Skulls (banked at the HQ as always), supply crates, and one strongbox per warren per run: a
    blueprint he doesn't own, a gun before its arrival night (D-48), a mod, an earned camo (D-66) or a rune shard.
    A full delve pays about half a night, so the nights stay the main road. Clearing a Deep opens a passage to the
    next cave for the run.
  - **The story.** The convoy never arrived because the dead dragged it under: its wreckage and twelve dog tags
    are down there. The signal's runes run through the rock from the pit; every Deep has a sealed rune door that
    hums toward the lake. Rune shards are a second way into the secret (D-56).
  - **The rules it keeps.** The world topside, its seeds and the caves stay as they are (rule 10). The warrens get
    their own dice with a fixed seed: the same layout every run, so they can be learned (Jerry, Q-4). Co-op goes
    down as a party (details in R7).
  - **Tasks.** R5, spec first: CL-98, then GB-106, CU-71, CL-99, GB-107, GB-108, GP-83, GP-84, CL-100, CU-72, CL-101,
    CU-73, AG-29. Details: `docs/roadmap.md` "The Hollows", P-134 to P-146.
  - **Jerry's answers (Q-4, 2026-09-29).** Caught below ends the run. The same layout every run. The secret's final
    fight (D-56, P-97) happens deep in the chalk heart, behind the rune doors, not at the chalk mouth.

- **D-68 · Night stays dark; the flashlight is standard (Jerry, 2026-09-29, CL-11 answered).** Nights stay as dark as
  they are, for the atmosphere and to push the flashlight and the NVGs. The gun flashlight is no longer bought: every
  weapon has it from the start (L). The NVGs stay earned. P-85's readability stays subtle and never brightens the
  night. Skulls pulled into the bag after the last kill of a night now make a sound, so he knows he has them. CU-75,
  CU-76.
- **D-66 · The dressing room (Jerry, 2026-09-29).** The CIF becomes a dressing room with a 3D view of the marine he can
  turn a full 360 while he dresses him. Each item takes its own camo: helmet, facemask, trousers, holster, hat,
  gloves, shorts, backpack, and the armour with its straps; weapons take camo too. Boots come in black, brown or tan.
  Hats: 8-point cover, boonie, ballcap (worn forwards or backwards). Gloves on or off, sleeves rolled or down, shorts
  or trousers. Hair, eye and skin colour. The facemask starts coyote brown and never comes off: his face stays a
  mystery. Four base camos are free: M81 Woodland, Coyote Brown, Olive Drab and MARPAT (Jerry); the rest are earned in
  play (days survived, kill streaks and the like, the rules in CL-96); the console's "dapper dan" unlocks everything.
  "Pants" and "trousers" are the same item. CL-96 (the spec, first), CU-70, CL-97, GP-82.
- **D-65 · Suppressors and fire selectors (Jerry, 2026-09-29).** A suppressor upgrade for the M4, AK-47, pistol,
  sniper, Uzi and shotgun (not the AA-12), each one styled to belong on its gun. Zombies will notice suppressed fire
  less, and suppressed rounds hit a little softer: that balance comes later, with a hearing rule for the horde (the
  "Suppressor" row comes back out of Not now). Fire selectors: semi-auto for the M4, AK-47 and AA-12 from the start (**replaced by D-72: they start on AUTO**); a
  full-auto unlock for the pistol that is hard to hold on target, much less controllable than the Uzi. CL-95, CU-68,
  CU-69, GB-105.
- **D-64 · A fidelity pass on the marine, his gear and the guns (Jerry, 2026-09-29).** A little less bulky and a touch
  more stylized, without going overboard. The ear defenders are no longer on him at the start: they come with the
  helmet. The facemask is coyote brown (D-66). CL-94 (the marine and his kit), CL-95 (the guns and the suppressors).
- **D-63 · Storms, the rabbit and the 240 (Jerry, 2026-09-29).** Storms bring 5 lightning strikes each: 1 in 50 a
  strike sets a tree burning (the rain still damps it, D-60), 1 in 100 kills the zombies where it lands, and 1 in 200
  hits the marine for 70 damage (he can live through it; at 70 HP or less it kills him). A pair of insulated boots
  hidden on the map makes him immune. One out-of-the-way rabbit mound has bones and a skull round it; shoot it and a
  white rabbit bursts out and takes his head off, unless he has our knockoff of the famous holy grenade, hidden on the
  map, whose pin pull sets off an angelic choir: that one kills the rabbit (a badge). Both are new deaths to collect on
  the tombstone (`lightning`, `rabbit`, D-31). The rabbit and the grenade are a nod, built, named and worded our own
  way: no names or lines from the film. The build menu
  gets the M240B beside the mortar, Jerry's brother's gun: tripod-mounted only, belt-fed, 1,000 rounds, carried and
  placed like the mortar, fired only with the marine on it. Buying a mortar or a 240 comes with half its maximum ammo
  (the mortar already fires 60 mm shells from a capped reserve; the 240 gets a 7.62 belt). CL-92, CL-93, CU-67, GP-81.
- **D-62 · The horde fights the defences, and every kind has a weakness (Jerry, 2026-09-29).** Turrets make nights too
  easy. Zombies go for what is shooting them: a turret that fires on a zombie draws it and its pack, and some kinds
  (brutes, demons and a share of each push) ignore the marine and go straight for the defences, hitting builds harder.
  Every kind gets a weakness and a resistance by damage type (bullet, pellet, fire, blast, blade, crush) in one
  table, so each needs its own answer; P-26's brute plates become the table's first row, and the scouting report and
  first-use cards name the counters. CL-91 (the table), GB-103, GB-104, GP-80.
- **D-61 · The loadout: an Armory, holsters and magazines (Jerry, 2026-09-29).** A new HQ window, the Armory. Before
  each day he fills four slots: two primaries slung on his back, one over each shoulder, and two secondaries in
  cross-draw holsters under his arms. The base pistol is always on his hip holster, outside the four. Anything
  handed in is stored, with its magazines, until he takes it out (for the run: D-30). The weapon wheel shows only
  what he carries. He can holster everything and go unarmed, faster on foot (+10%; with Fleet foot, D-59, never
  more than +30% in all). What he carries shows on him: mags in pouches, grenades, a bandolier for shotgun shells,
  a belt for 40 mm, the bulky rest in his backpack, each in 3-4 stages from full to empty. Magazines become real:
  R puts the magazine in the dump pouch on his belt with its rounds; a double tap drops it, much faster, and it is
  lost unless picked up before the next dawn or dusk. The HUD shows each magazine and how full it is, and "spare"
  becomes "mags", "shells" or "rounds" by gun. The shotgun and the launcher load round by round; the revolver uses
  speed loaders. Akimbo is two of the same secondary, one in each holster (a second pistol can take a secondary
  holster). Melee blades stay outside the slots; the chainsaw, the minigun and the flamer are primaries. CL-89 (the
  spec, first), CU-64, CU-65, CU-66, GP-78, GP-79, CL-90.
- **D-60 · Rain puts fires out (Jerry, 2026-09-29).** Today rain only shortens ground and tree fires and stops them
  spreading. From GB-102 it also reaches the rest: a burning zombie burns out faster in the wet and stops setting
  others alight; campfires sputter down to embers while it pours and come back after; the marine won't light up
  in the rain (GP-74's cigarette), a lit one hisses out when a shower starts, and a dropped butt leaves no ember.
  Fire weapons are weaker on rainy nights on purpose. GB-102, R3. Details: `docs/roadmap.md` P-109.
- **D-59 · Perks go; the marine learns by doing (Jerry, 2026-09-29).** The six perks leave the kiosk. The same six
  skills rank up (0 to 5) from what the player does: Vitality from nights survived and comebacks from under 25% HP;
  Stopping power from headshot and one-shot kills; Quick hands from reloads under pressure (magazine at or under a
  quarter, a zombie within 8 m); Fleet foot from running while chased and close dodge rolls; Scavenger from skulls
  banked at the HQ; Grenadier from explosive multi-kills (3+). Nothing is earned by getting hurt, reloading for
  nothing or jogging circles by day. Ranks last the run and reset on a fresh start (D-30 stands: no power between
  runs). Each player learns his own (D-58). Caps: Fleet foot +25% at rank 5, Scavenger +30% (+6% a rank); no timed
  active reload for now. The streak's temporary "fast feet" and "quick hands" are renamed so the names don't clash.
  Perks were a large Cash sink: the economy is re-based before P-46 and P-47. Lands in R3: CL-88, CU-62, GB-101,
  GP-76, GP-77. Details: `docs/roadmap.md` P-104 to P-108.
- **D-58 · Co-op for up to 4 players, one player hosts (Jerry, 2026-09-29).** The host's game runs everything it runs
  today: the zombies, the waves, the director, Cash and the builds. The other players send their movement and shots
  to the host, and the host sends back where everything is. Not lockstep: the game rolls about 950 dice a run, so
  two copies can't be kept identical. The networking comes after 1.0, as its own phase (R7), through the D-57
  desktop app (it can host a game; a browser page can't). The groundwork starts now, in R2: the game learns to
  hold a list of players instead of one marine (CL-87, CU-63, GB-100), and plays exactly the same with one. From
  CU-63 on, the rule for everyone: new game logic asks the players list (`nearestPlayer`, `players`), never
  `player.position`; only the local view (camera, HUD, sound, culling) and the marine's own movement read him
  directly. `tools/check-players.mjs` holds the line. No React or other rewrite: the game stays one HTML module.
- **D-57 · 1.0 ships as a desktop app, not a zip (Jerry, 2026-09-27).** The game stays what it is (one HTML
  module, three.js on WebGPU, no build step); the package wraps it in a desktop shell, Tauri (WebView2, a small
  download) or Electron (bundled Chromium, the safest WebGPU), so the player gets an `.exe` with an icon, a window
  with no browser chrome, native fullscreen, an installer and saves in a real folder instead of localStorage. No
  rewrite in a native engine: that is the game again, months, for nothing the wrapper doesn't give. CU-57 (P-89)
  is that wrapper; it lands in R6 as planned. The browser build stays the crew's working build (the tests, the
  studio, Antigravity's runs), so nothing changes before R6.
- **D-56 · The secret quest is built (J-12).** "The Signal": spec first (CL-79), Jerry reads it, then R5 builds it.
  The final fight is the one exception to the immortal guardian: only on the silenced night, only at the chalk cave.
- **D-55 · The guardian boss on the studio rig (J-11).** After CL-62, the fightable guardian of nights 6, 12 and 18
  (D-13) wears the studio rig and clips. Its rules don't change.
- **D-54 · Named nights (J-10).** Fog Night on 14; night 18's siege made real (the guardian stacks, as Blood Moon does);
  Lights out is an opt-in dare; Swarm Night on 17 once Fog plays well; Silent Night waits (it would remove the alarm
  shot, D-33, D-39). How dark night should be (CL-11) is still Jerry's.
- **D-53 · One call a day (J-9).** Tonight's call at the relay: one pick of three. No timer, no chore list.
- **D-52 · Health comes from what he does (J-8).** Streaks heal to 70% (from 5 kills), the Medical crate and the medic
  survivor. Regen stays at 40%; no dawn refill.
- **D-51 · The blades are measured first (J-7).** After CU-48 counts kills exactly: if melee is over 40% of kills on
  nights 13-20 (medians), the machete loses reach (3.8 m to 3.0 m) and arc. The knife stays.
- **D-50 · Reshape the late nights, don't shrink them (J-6).** One breather, then a surge, with set-piece packs; then
  measure. The 48 cap rises for the surge only after GB-59 and 60 fps with 48.
- **D-49 · Drops are earned (J-5).** One random crate a night until the relay is up; after that the day's pick and the
  breather crate replace the timer.
- **D-48 · Fixed prices; guns arrive by act (J-4; revises GP-41).** The nightly markup goes; the supply planes fly
  guns in from set nights ("Arrives night N"). Late Cash's sink is skull value, never horde size.
- **D-47 · Survivors, no escort (J-3).** From night 3 a camp bounty can hold a survivor; clear it, press E, they're at
  the HQ next morning with a lasting help (medic, trapper, ranger) and a line of the story. No follower AI.
- **D-46 · The first catch can be escaped (J-2; revises D-26).** Five E presses during the haul kick him free, for 50 HP
  and the unbanked skulls. A second catch, a walk-in or the pit still kill; the guardian stays immortal and can't be
  outrun; both collectible deaths stay (D-31).
- **D-45 · The run ends at the boat (J-1).** From night 20, with the relay up, the boat is called from the board and
  boarding wins; not calling it is "stay". No early boat unless a full run is still over about 2 hours after R2.
- **D-44 · The story: The Signal.** The props already tell it (the failed convoy, the silent relay, the evacuation
  landing); the relay's morning lines, the survivors and the props' notes say it out loud (CL-74, GP-66). Two endings:
  the boat, and the secret. `docs/roadmap.md`.
- **D-43 · The roadmap (Jerry's order, 2026-09-26).** The board is the roadmap to 1.0: six phases (R1 to R6), every task
  in an agent's queue by phase, each agent given what its model does best (Who does what). A phase ends when Jerry has
  played it; lanes don't wait for a whole phase, only for their "after". Details: `docs/roadmap.md`. The compiled
  suggestions (30, from five agents and Jerry) are its Coverage table (now in `docs/archive/roadmap-history.md`).
- **D-42 · Reactions: light active ragdolls (Jerry, 2026-09-26: "similar to Euphoria").** `studio/motion.js`: a body plays
  its animation until hit, then muscles, tone, balance, stagger steps, the fall, the catch, the get-up and the limp
  death, tuned by preset files; about 0.07 ms a body a frame, at most 8 at once (a pool). The same code runs in the
  game, the scenes and the motion lab, where Jerry hits a body and leaves notes that land in `review/motion-*` for
  the preset's owner. `docs/studio.md` §10, `docs/contracts.md` (Reactions). CL-65.

- **D-41 · Scenes (Jerry, ~04:30Z; extends D-40).** A scene is one data file (`dw-scene/1`, `docs/studio.md` §9)
  naming the actors (registered rigs), the clips each plays, the holds between them (a hand that reaches a joint, a
  body towed by a hand, a limb lifted by it), the paths they travel with speed over time, a stride per clip so
  feet step at the ground's speed, and the checks (hold gap, foot slide, speed). `studio/scene.js` plays it; the
  renderer draws it; the game plays the same file where the moment happens (the host gives the place and its own
  bodies). The marine is a registered rig that can adopt the game's own marine. A new moment is a new scene file,
  not new player code.

- **D-40 · The studio (Jerry, 01:40Z; `docs/studio.md`).** Two rules: everything visual is data an agent can read and
  edit, and every change can be looked at in seconds as pictures. Clips are JSON keyframes on a registered rig
  (`studio/`), rendered by `tools/studio.mjs` into `review/<asset>/vN/` (strip, video, stats); Jerry writes plain notes
  in `review/<asset>/notes.md` and `crew.mjs review` turns them into tasks for the asset's owner. The Quaternius UAL
  clips (CC0) are the reference for human timing and weight and can be retargeted onto our humanoids. Caracal Studio
  and a Blender pipeline are set aside for now (reasons in the doc). Order: modeling and animation, then textures,
  then sound.

- **D-39 · The loop's two transitions (Jerry, 22:45Z; revises D-34, CL-49 and CL-51).** The alarm: no pan to the
  sky. The camera pulls back to one shot that holds the whole HQ while the night comes down over it, the strobes go
  and the flares burst, then hands back as the wave starts (`startLoopCine('alarm')`). The last kill: the sky sweeps on
  to the morning by itself over the finisher and the first seconds of prep (`skyLoop.mode` 'dawn', `DAWN_SWEEP_S`);
  no camera move, no held night, no Night N Complete card. The night's numbers go up on a small banner at the bottom
  right (`ui/dawn.js`, no buttons, never pauses, gone by itself); the next night comes from the briefing panel only.
  `loopMorning` / `loopNextNight` stay as debug hooks. The guardian and the pit's arms are built rigs now
  (`world/cave-guardian.js`, `world/pit-tentacles.js`, Claude's), and every scripted-kill beat drives them.

- **D-38 · Bounty rewards (Claude, for Jerry; GB-57 asked).** Per cleared bounty post, in skulls into the bag (so still
  banked), on top of the guards' own drops: nights 2-3 **25**, 4-7 **60**, 8-13 **150**, 14 and up **300**. ChatGPT's
  20/30/40/60 was under 3% of a late night's take (GP-41: about 1,500 on night 10, 3,800 on night 20), so the day's job
  would stop mattering by night 8; these stay at about 8-20% of the night's base value, worth the walk without
  outpaying the fight. One number per band, so the board can print it plainly.
- **D-37 · Daytime: a scouting report and bounties (Claude, for Jerry).** In prep the HQ board shows tonight's plan
  (the caves, the pushes, the trick), and tonight's caves are marked on the minimap. From night 2 the board also posts one
  or two bounties: a camp held by guards sized to the night; clear it before the alarm for a reward. Both live only on
  the HQ board and the minimap (GP-39: nothing pops up by itself). CL-54 has the reasons.
- **D-36 · The load budget is met by the splash (Claude, for Jerry).** The splash can't be skipped and runs about 14 s;
  the game is ready under it at 6-7 s on Jerry's GPU. No shader-compile move before Saturday; CU-36 keeps only the
  first-use stall fixes.
- **D-35 · Loop feel first (Jerry).** If the night runs out, the flow from the alarm to the next morning (CL-49,
  CL-50, CL-51, GP-37, GB-50) is what must be in for Saturday; then audio, then balance, then the rest.
- **D-34 · The end of a night is a choice (Jerry).** The last kill leads to the **Night N Complete** card with Next Night
  and Proceed to Morning. The sky holds the night until the player picks: Next Night skips the day and pulls the
  alarm; Proceed pans up to the sunrise and brings the marine back to his spawn. Revises D-28's dawn at the finisher
  and D-32's dawn card.
- **D-33 · No alarm stinger (Jerry).** The alarm is the siren and the sunset pan (CL-49); the relief stinger stays.
  The day missions no longer announce themselves (GP-39).
- **D-32 · Claude's calls from the plan (Jerry did not overrule).** A short dawn card after the finisher. Two
  or three shamblers at the POI nearest the HQ on day 1, so the first kill, skull and bank come before the
  first alarm. The first cave poke of a run is a warning (a screech and the eyes); the second one comes for
  you (revises D-26). Day-1 fps is fine on Jerry's 5080 (AG-15: 58.8 fps with the flamethrower), so CU-26,
  GB-37 and AG-14 are parked.
- **D-31 · Ways to die is a lifetime collection (Jerry).** New games no longer clear `tt_death_log`
  (reverses the CU-24 clear). Only a real reset of the profile clears it.
- **D-30 · No saves (Jerry).** The morning save (`tt_day_start`) comes out: nothing writes it, nothing
  reads it. Play and Play again always start a fresh run at day 1. Quit to menu says it ends the run.
- **D-29 · Day 1 is 15 zombies, half out of the ground (Jerry, revising "horde sizes stay").** 7 or 8 rise
  out of the ground (the existing claw-up) in the treeline 35 to 60 m from the HQ, out of the camera's view,
  and 7 or 8 walk out of the day's cave. Other days are unchanged. Claude's call on top: on day 1 the
  shamblers get no cave role, so one pistol body shot kills one whichever cave rolls (GB-A4).
- **D-28 · The sky follows the loop (Jerry).** The clock only runs in prep and holds before dusk. The alarm
  brings the night on over its 5 s; the wave is fought at night; the last kill's finisher ends in dawn, and
  the next prep starts in the morning. Claude builds it (CL-45).
- **D-27 · Cursor and Claude both commit and push (Jerry, 01:15Z; replaces "only Cursor").** Same
  rules as before: only finished, checked-out work, never a file an active agent is in, the rule 7
  checks first, then push `feature/Phis-changes`. One at a time: check in with `git` in `--touch`,
  so the check-in refuses the second one. `git pull --rebase` before pushing; no force-push.
  How Claude does it: `Claude Commit.bat` in the project root. Claude writes the job into
  `Claude outputs/commit/` (`files.txt`, one path per line, and `message.txt`); Jerry double-clicks the
  .bat. It commits only the listed files (`--pathspec-from-file`, so anything else staged stays
  staged), pulls with rebase only if GitHub is ahead, pushes, and writes `last-run.log`. With no job
  waiting it only reports `git status`. Cursor: the .bat is untracked on purpose; leave it be.
- **D-26 · The guardian chase (Jerry 22:52Z, revises D-25; built as GB-35).** One shot (or one explosive)
  into a mouth with the marine within 20 m and in its line of sight brings the guardian out. It runs
  him down at 27 m/s against a 11.8 m/s sprint: he can run but can't get away. On contact it takes a
  leg, the camera follows it dragging him to the mouth, and the thrown-out cutscene plays. The
  crawl-in snatch never plays on this path; walking into a mouth still gets the walk-in grab. Once
  per cave per day. Contract in `docs/contracts.md` (Cave pokes), approved.
- **D-25 · A cave poke is the cave grab (Jerry, replacing D-22's fightable guardian; superseded by D-26 on
  the trigger and the chase).** Three hits into
  a mouth within 1.5 s, or one explosive, with the player within 45 m of it and in its line of
  sight: the immortal cave thing races out and drags the marine in by the leg, and the existing
  cave scripted death plays (`beginScriptedKill('cave', cave)`), with whatever run-out the current
  rig can do. It can't be killed. Keep the once-per-day guard per cave so a stray burst on day 1
  doesn't end every run; the poked-guardian fight (spawn, leash, half cash) comes out. The
  `cave-guardian` event keeps its `aggro` phase for Claude's screech.

- **D-23 · Performance: fewer things per frame, measured.** CU-18's profile of megaswarm: 76% of the
  frame is drawing, and the top costs are `_projectObject` (walking the scene to cull and sort) and
  `updateMatrixWorld` (recomputing matrices), not the zombie logic (4%) or the pathfinding (<1%). So
  the fixes cut the number of objects the renderer walks and the matrices it recomputes: the static
  world stops updating its matrices (Claude, CL-28); far zombies get cheaper (no shadow, fewer
  parts, Grokbot, GB-28); Cursor counts objects and draw calls by kind so we know what's left
  (CU-20). Every change reports `tools/bench.mjs` (megaswarm) before and after, and Antigravity
  re-runs it on Jerry's GPU (AG-11). Nothing changes how the game plays.

- **D-22 · Shooting into a cave brings the guardian out (GB-25, approved with changes).** A fightable
  `guardian`, not the `caveguard` grab: three hits into one mouth within 1.5 s (or one explosive),
  only while the player is outside the grab band. It chases on a 28 m leash (or 4 s out of sight),
  can die, and goes back into the dark on leash break, the player's death or prep. On a guardian
  night it wakes the planned guardian instead of adding one. Changes: (1) it works day and night,
  since day fights are part of the plan; (2) once per cave per day, and at most two pokes a day
  across all caves, so it can't be farmed; (3) a poked guardian drops half the night guardian's
  cash and never fires first-blood (`planned: false`, D-16); (4) combat publishes `dw-game`
  `cave-guardian` with `{ caveIndex, x, z, phase: 'aggro' | 'emerge' | 'retreat' | 'death' }`,
  and Claude binds the screech and the music to it (D-21). Grokbot builds it: GB-26.
  **Correction, 07:05Z:** "day and night" means pokes work while you explore in prep, not only
  during a wave; and a poked guardian goes back when the alarm sounds (the horde's turn), not
  "at prep". My first wording contradicted itself; GB-27 fixes it.

- **D-21 · Claude owns the music director.** `MUSIC_POOLS`, `updateMusic` and the cue logic in
  `core/audio.js` are Claude's from now on (Jerry's music is the priority he named). Cursor keeps
  the audio engine and the rest of the file. Combat tells the director what happens through
  events; it doesn't pick music.
- **D-20 · The death replay comes out** (Jerry): it's cool, but only two deaths have a cutscene, so it
  reads as unfinished. D-18 is withdrawn. Grokbot removes the combat side (GB-22), ChatGPT the
  buttons (GP-14). `tt_death_log` and the death catalogue stay.
- **D-19 · The plan is `docs/plan.md`.** Four phases: make it feel right; the first hour; flow;
  showcase. Jerry plays each phase before the next one starts. Measure before fixing performance.

- **D-18 · Scripted-death replays (GB-18) are approved** as written in `docs/specs/replays.md`, with
  three additions. v1 is the cave grab and the pit haul only, unlocked by `tt_death_log`, free,
  started from the death screen's Watch again (A) and a found tile in the death catalogue (B); the
  HQ/title archive (C) waits. The hard bans in §5 stand. Additions: (1) a replay writes no profile
  stats either (best day, kills, anything in localStorage), not just the death log; (2) the replay
  puts the player at the grab spot and puts every pose, camera and class back exactly after,
  including when it's aborted; (3) any randomness in the cine may differ between replays, but the
  world may not: no call that seeds or moves world things (rule 10). Grokbot builds the combat
  side (GB-20), then ChatGPT the button, tile and strings (GP-13).
- **D-17 · Cursor's objective interaction (CU-10) is approved** as proposed in `handoffs/requests.md`:
  `getObjectiveInteraction(id)` → `{ id, approach, distance, reachable, blockedBy, ePressed, eHeld,
  holdSeconds, cancelled }`, reachable within 1.6 m of the approach and 1.25 m of its height,
  with no build in the way, no other E target and no modal. One clarification: any id can be
  asked any time (the map's reachable flags need all seven); only the hold timer follows a
  single site, the one being held. Cursor builds it (CU-11).
- **D-16 · Grokbot's GB-16 helpers are contracts, with three fixes.** `spawnObjectiveDefenders`,
  `getRadioDefenderState`, `RADIO_DEFENDER`, `grantSupply`, `listOwnedAmmoPackChoices`,
  `grantBuildBlueprint` and the `player-damaged` event are approved as written in
  `docs/contracts.md`. `grantBuildBlueprint` returns `{ id, alreadyOwned, granted }`, which
  replaces the string answer I gave for GB-16 (e). The three fixes (GB-17):
  (1) saw fuel is fractional, and `grantSupply` must not round it down (`qty | 0` does today);
  (2) ammo for a calibre the player owns no weapon for is refused, the whole quantity returned
  as remaining; (3) `guardian-first-blood` fires only for a guardian from a guardian night's plan
  in an ordinary run, never one spawned by a debug command, and it carries the kill position
  `{ x, z }`.
- **D-15 · The split goes a slice at a time.** Cursor paused after two slices so the freeze
  could come off, and that is how it continues: he turns the freeze on for one slice (one
  section of `index.html` into its module), runs the tests, checks out, and the file opens
  again. Until a section's slice lands, its owner keeps working in it inside `index.html`,
  one agent per part. Tasks no longer wait "after the split".
- **D-14 · Every check-in names its model.** `crew.mjs in` now requires `--model "<the model this
  session runs on>"` and refuses without it. The model goes on the agent's card and the panel,
  the IN line in the log says `on <model>`, and a change of model gets its own MODEL line.
  Model names come out of `AGENTS.md`: the card is where each agent's model lives. Claude, who
  checks in by hand, writes the same. Antigravity was on Claude Sonnet 4.6 then; it is on Gemini 3.1 Pro as of 2026-09-25 (see Who runs on what). D-9's
  cautions were about Gemini Flash, so its role stays the crew's eyes for now, and Jerry can
  widen it.
- **D-13 · The guardian night (GB-13 spec) is approved, with two changes.** Day 6 and every
  6th day after it, from the chalk cave, a fightable `guardian` (never `caveguard`), replacing
  surround and colossus on those nights; Blood Moon still stacks. The changes:
  (1) cave warnings as on every night: `caveWarn` 1 at prep, 2 at `beginWave`, 0 when it
  ends. A whole prep at level 2 is minutes of heavy dust, and the briefing already carries
  the urgency. (2) A stuck guardian must not hold the night forever: if it makes no progress
  toward the player for 60 s, it re-paths, and if that fails it walks back out of its mouth.
  The first-blood reward's economy side is ChatGPT's call. Implementation (GB-14) waits for
  the split.
- **D-12 · Floors follow aim.** Aim at the ground, or give no aim, and a floor goes at your
  feet. Aim at the wall tops or a platform, and it goes on the storey above. So t13's
  "ground floor in a walled square" is right, and a test that wants a roof must aim for it
  (`setAimRay` or `opts.lv`), not rely on the default. Grokbot: GB-12, after the split.
- **D-11 · The repair helpers are contracts.** `getRepairTarget()` (damaged builds only, the
  same reach as T) and `getRepairSnapshot(id)` (the target at full HP with `cost: 0`; `null`
  only when it is gone) are approved as Grokbot's production exports for ChatGPT's prep
  checklist. ChatGPT applies his three-line hook now. Claude records both in
  `docs/contracts.md` (CL-13). Known gap, accepted for now: ids reuse the cell, so removing
  a build and rebuilding it between two samples reads as the same target.
- **D-10 · OpenCode leaves; five agents.** On Jerry's order.
  - **What it finished stays:** `controls-ready` (OC-1), `npm run crew` (OC-2) and the
    first `docs/contracts.md` (OC-3).
  - **Contracts:** Claude reviews and keeps `docs/contracts.md` from now on (CL-13), since
    Claude approves every contract anyway.
  - **Test runs:** back to how they were before D-9. Cursor runs the full suite at commit
    time, including for anyone whose handoff says "Tests: not run" (ChatGPT's machine can't
    run it).
  - **Its name is off the panel, `crew.mjs` and `AGENTS.md`.** Its card stays in
    `crew/status/` as a record and is no longer read.
- **D-9 · Six agents; tasks by strength.** (OpenCode's part is superseded by D-10.)
  - **OpenCode is the runner and clerk.** A small, fast model in a terminal: excellent at
    exact, bounded jobs with a command that proves them, weak at holding a huge file or
    reasoning across many.
    - It gets: test runs and the results file, `docs/contracts.md` built from approved
      handoffs, one-line hooks in small files, and small tool chores.
    - It never edits `index.html`.
  - **Antigravity is the crew's eyes.** A fast multimodal model with a real browser on
    Jerry's PC: good at looking and describing, less reliable on deep code changes and at
    checking its own claims.
    - It gets every visible check: the pit, the cave warnings, logs, the loading screen,
      build aiming, UI. It reports with screenshots in `qa/` to each owner.
    - It edits no game code.
  - **Moved to OpenCode:** CU-9's controls-ready event (OC-1: it's in the small
    `menu-camera.js`, not `index.html`), CU-6 (OC-2) and CU-3 contracts (OC-3). CU-8 stayed
    with Cursor, who finished it as OpenCode joined; OpenCode now runs the suite it built
    (OC-4), including for ChatGPT, whose machine can't.
  - **Moved to Antigravity:** the before-and-after shots Cursor and Claude couldn't take
    (the pit, a warned cave), and the in-game checks of GB-7/GB-8 and GP-2/GP-3.
  - **What that frees up:** Cursor for the split, Grokbot for combat,
    ChatGPT for his screens, Claude for trees and night lighting.
  - **New rule 15 in `AGENTS.md`:** every "done" shows its proof (command output or a
    screenshot).
- **D-8 · Until the split, UI hooks are window events that each owner adds in their own part.**
  ChatGPT's coach and panels listen for `window` event `'dw-game'`
  `{ type, ...details }`; they never reach into another section.
  - **ChatGPT dispatches these himself**, because the code is his (economy, shop, the HQ
    window): `'skull-pickup'` (after the bag grows), `'deposit-accepted'`,
    `'deposit-complete'` (after the Cash is credited), `'purchase-delivered'` (after
    delivery, never on the click).
  - **Cursor dispatches `'controls-ready'`** when the insertion ends (CU-9).
  - **Grokbot's events stay as they are:** `getWavePreview` for the panel and `caveWarn`
    for the caves.
  - **Reaching the HQ window:** `nearHQWindow` stays the check for now. A proper
    reachability test waits for the split.
  - **At the split,** these become exports in `docs/contracts.md`, and the event names stay.
- **D-7 · A test whose expectations change gets a second pair of eyes.** When you change what a
  test expects (a height, a timing, which function it calls), check out with
  `--review "<what changed and why>"`. Claude reviews it and records the verdict. The first
  round was 17 test files changed by Grokbot. All 20 are reviewed: 16 hold up. In t6 two checks became
  `ok(true)`, and t5, t6, t11 and t12 force the build level instead of testing what the player
  gets, which may hide a regression (GB-8). t12 also stopped aiming at the pillar (GB-7).
- **D-6 · Crew board, round two.** From what the first round showed:
  - **Keep going.** Finish a task, check out, take the next one. Don't stop to ask Jerry
    "shall I continue?". Stop only when your queue is empty, you're blocked, or you need a
    decision only Jerry can make. For that last case, use `crew.mjs ask` and carry on with
    something else.
  - **Show your progress.** `crew.mjs note` whenever you find or finish something, roughly
    every 10-15 minutes. That line is what Jerry sees on your card while you work.
  - **Shared files never clash.** `crew/LOG.md`, `crew/QUESTIONS.md`,
    `handoffs/requests.md` and the status cards are append-or-own. Don't list them in
    `--touch`. My check-in on `requests.md` blocked ChatGPT's append, which was wrong.
  - **Write requests with `crew.mjs request`.** It writes UTF-8. PowerShell's `Add-Content`
    turned `·` and `→` into `Â·` and `â†’` in the GB-2 request (now repaired).
  - **Use the handoff template.** `out` warns when a report lacks `Changed:`, `Tests:` or
    `Not verified:`, and the panel shows those fields. Most of Grokbot's GB-1 notes didn't
    use it.
  - **Cursor (and, since D-27, Claude) commits finished work at the end of each of his own tasks.** That means
    everything checked out since the last commit, never a file an active agent is still in.
    The panel shows how many finished reports are waiting.
- **D-5 · Pit view.** The pit's ring was hidden under the water, not badly framed. Claude
  fixed it in the world and gave Cursor a camera (CL-1 done, CU-7).
- **D-4 · `sampleHeight` and `POI` become read-only exports of `world/terrain.js`.** Approved.
  Nothing outside `world/*` writes the height field or `POI` directly. Builds do legitimately
  reshape the ground (`tryPlace` and `groundWorkFor` call `reshapeGround`), so the world
  exports `reshapeGround` and `levelGroundRect` as the only way to change the ground.
- **D-3 · Test triage.** t40 ("flames come off when it stops burning") is Claude's (CL-2).
  Claude will triage t19, t35, t36 and t37 and give each an owner (CL-3). The other combat
  failures are Grokbot's (GB-1).
- **D-2 · Load time: the fix is the title gate, not the bake.** Cursor measured on Jerry's PC:
  the world is built in about 5 s, and the next 40 s go on presenting about 133 heavy warm-up
  frames before the menu is allowed up. So:
  - The menu comes up as soon as the world is built and the shaders needed in the first
    minute are warm. The rest of the warm-up runs behind the menu and during prep (CU-2).
    Grokbot says which types and effects the first minute needs (GB-2).
  - The world bake is parked. It is still useful for determinism later, but it is no longer a
    load-time task. The spec stays in `docs/specs/world-bake.md`.
- **D-1 · Apply the loader patch now, not after the split.** The freeze has not been called,
  the patch is verified on a real GPU (a background load went from never to 8.1 s), and
  carrying it through the split is easier than rebasing it later. Cursor applies
  `handoffs/claude-phase1-loader/loader.diff` then `merge.diff` (CU-1).
- **D-0 · Earlier calls** are in `handoffs/requests.md` under "Claude (lead)": the load
  channel contract, Skip prep removed, Field Intel at 120 Cash for now, the world-ID scheme,
  and the answers to Grokbot's combat spec.
