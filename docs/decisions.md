# Grave Shift decisions

Every call made for the game and the crew, in full, newest first. Claude writes them (as lead, or for Jerry);
they stand unless Jerry overrides them. `crew/BOARD.md` lists each one on a single line; this file has the
details. Moved here from the board on 2026-09-29 so the board stays short. Nothing was cut.

- **D-147 · Every agent checks the board every 15 minutes and never sits idle (Jerry, 10 Nov 2026, ~20:15Z).** "I am going to make them all autonomous to check the board in 15 minute increments. Give me a universal agent copy and paste to make sure they do that and stay running and never idle until we reach the end of our workload." `node crew/crew.mjs standby <agent>` (CL-352): returns at once with the agent's work (open requests, its next ready card), else waits up to 15 minutes looking every 20 s; `--minutes` for shells that can't wait that long. An idle card's 'last seen' updates, so the director sees who waits. crew/STANDBY-OFF (written by CLAUDE DIRECTOR when the workload is done, or when Jerry says stop) ends it for everyone. AGENTS rule 15b.
- **D-146 · CLAUDE DIRECTOR and Claude 1; a check every 10 minutes (Jerry, 10 Nov 2026, ~20:05Z).** "Name your hand fitting agent as Claude 1 on the Board and I want you to change your name to: CLAUDE DIRECTOR. As director I want you to check every 10 minutes." The names change on the board, the panel and the cards; the agent ids and task ids stay (`claude` / CL- is CLAUDE DIRECTOR, `claude4` / CD- is Claude 1, so nothing running breaks). The director's check every 10 minutes: the crew's requests, who is stopped or blocked, new sheets, the commit job.
- **D-145 · Claude is the game director; Claude 4 takes the hands (Jerry, 10 Nov 2026, ~20:10Z).** "Since everyone is bothering you why not have a dedicated new agent just deal with hands and make you the permanent game director. That way your job is only to manage and review other agents and coordinate and let another instance of opus do the heavy lifting you were doing." Claude agreed: the crew's questions had waited hours on him while he fitted hands. From now Claude plans, keeps the board and the crew moving, answers their questions before anything else, reviews every sheet before it reaches Jerry, writes the commit jobs and turns Jerry's notes into named jobs; he takes no heavy lifting. Claude 4 (`claude4`, task ids `CD-`), a Claude task on Opus 5.5 (High), takes the hands and the first person: CD-1 (was CL-334), CD-2 (was CL-348), CD-3 (was CL-336), CD-4 (was CL-342), CD-5 (was CL-326), CD-6 (was CL-307), CD-7 (was CL-317), with Claude's fitting scripts moved into `tools/handfit/` (README). Claude's 19 older first-person and weapon cards are folded into the 10 Nov list (crew/archive/board-queues-2026-11-10.md).
- **D-144 · The Training Ground only, until Jerry is satisfied (Jerry, 10 Nov 2026, ~19:50Z).** "Put the 1.2 work on the backburner. We are going to work on the systems within the training area exclusively until I am satisfied before moving onto the rest of the game and resuming work there." He asked how to get caught up in about 12 hours. Claude: (1) everything outside the Training Ground is parked on the board (the woods, the chain and gates, the HQ, the warrens, the utilities, night 20, the world's sound); CB-292's sweep does the Training Ground first. (2) No more waiting for a whole batch: ChatGPT 2's extra pass on a gun (GT-20077, J129) starts as soon as that gun's first round is in, and Claude's eye pass (CL-342) follows each gun. (3) Work off Claude's plate, the slowest lane: the camo per part to ChatGPT 2 (GT-20079, was CL-337), the first-person view fixes to Claude 3 (CC-342, was CL-338). (4) Every agent takes its next card when one is done and ends a session only with an empty queue or a block; Claude answers the crew's requests before his own work and checks in on a timer between Jerry's messages.
- **D-143 · More than one game test at a time on the PC, while it has the room (Jerry, 10 Nov 2026, ~18:05Z).** "If the bottleneck is available test slots I give you guys the authority to open as many as you think is feasible without cooking the machine. We ran into an issue where we were crashing often last time but if you have a good solution for it. Feel free to implement." Claude's answer (CL-347, `tools/game-test-slot.mjs`): the crashes in October came when the agents' game tests overlapped with nothing to stop them (Jerry's PC-load rule, 15 Oct). The queue now grants up to the PC's slots at once (auto from its memory, cores and graphics card, at most 3; `tools/game-test-slot.config.json` or DW_GAME_TEST_SLOTS to change it), each still one game and one worker. The first lease starts as before; a further one only 30 s after the last start (a game's load is its peak) and only with the room at that moment: memory for one more game (5 GB) plus 4 GB, the cores under 75% busy, the graphics card's memory free and the card under 80 °C, read with nvidia-smi. Jerry's own game and inspector run alone (nothing new starts while he waits); `--exclusive` runs a speed measurement alone. A lease whose processes die without releasing (a crash or a killed session) puts the PC back to one at a time for 20 minutes. A computer without a readable graphics card (Claude's cloud, the Linux sandboxes) stays at one. The panel and `crew.mjs me` show every holder and why the next one waits.
- **D-142 · ChatGPT 2 joins for the weapons; Antigravity on Gemini 4 Carbon (Jerry, 10 Nov 2026, ~17:30Z).** Jerry opened a second ChatGPT on GPT-6 Astra (High), Claude's pick for the hardest code (OpenAI's most capable model), "to help with heavy lifting"; Claude stays in charge. It is **ChatGPT 2** (`chatgpt2`, task ids `GT-`): every weapon's model (D-122's first round from its manual, `studio/weapon-*.js`, `frag-grenade.js`, the katana, the optics and attachments; `WEAPON_HOLD`/`VM_SOCKETS` only where a grip or sight moves), moved from ChatGPT, who keeps every zombie's look, the words, the UI and the Armory. Its cards: GT-20075 (J107-J123's models), GT-20076 (J128, the weapons' half of GP-20076: nothing through anything, nothing floating), GT-20078 (room for the hands, with Claude's numbers), GT-20077 (J129, another fidelity pass). A change to anything a hand touches is named in its handoff; Claude refits the hands (game/viewmodel-fit.js). Antigravity now runs on Gemini 4 Carbon (was Gemini 4 Argon).
- **D-141 · Claude 3 joins for the heavy model work (Jerry, 10 Nov 2026, ~14:00Z).** Jerry opened a third Claude, a Claude task of its own on Claude Opus 5.5 (High), "to help with heavy lifting"; Claude stays in charge. It is **Claude 3** on the crew (`claude3`, task ids `CC-`), in Claude's lane: the marine's third-person body and his fabric (`studio/marine-body.js`, `studio/marine-cloth.js`, `studio/marine-hats.js`) and his head and face (`ui/marine-face.js`, the balaclava with it, moved from ChatGPT, who is on the weapons). Claude keeps the hands and the first person (`studio/marine-hand.js`, `studio/hand-contacts.js`, `studio/fp-arms.js`, `game/viewmodel*.js`), the board and the reviews. Its first cards: CC-340 (J125, the body's anatomy and the head) and CC-341 (J128, the fabric layer on layer), moved from CL-340 and CL-341. Like Claude 2 it reaches the PC through a Linux sandbox: no git; Claude writes the commit jobs and Antigravity runs them. Claude leads it as he leads the rest (D-81 questions come to him).
- **D-140 · No clipping, no floating, anywhere (Jerry, 10 Nov 2026, J128, standing).** "No fabric or material will clip through another. (Noticing the wrist clip through the players arm fabric) basically no clipping or weird floating objects in this game unless it makes sense like a bird flying, a bullet passing through an object, or needing clipping in specific use cases." D-138 widened to the whole game: no fabric or material through another (the glove's cuff and the wrist stay inside the sleeve at every bend; every layer of his kit outside the one under it; a zombie's clothes on its body), no part of a gun through another or hanging off it, no prop or buildable through another or in the air, nothing placed in the world floating over the ground or sunk into it past where it should sit. The exceptions are the ones that make sense: what flies (birds, thrown and fired things), a bullet through what it goes through, effects (smoke, fire, sparks, blood), and a case where clipping is needed, named in the exceptions list with its reason (Jerry or Claude names it). Owners: Claude, the marine's fabric and the first person (CL-334 now, the wrist in the sleeve; CL-341, every layer in every clip); ChatGPT, the weapons' and zombies' parts (GP-20076); Antigravity, the props and buildables (AG-281); Claude 2, where things sit in the world and the sweep test over the whole map (CB-292). Each has a test that fails on a breach (AGENTS rule 24).
- **D-139 · The anatomy rule (Jerry, 10 Nov 2026, J127, standing).** "No portion of the player's body may bend or rotate in an anatomically inaccurate way unless upon player death or it makes sense visually for that specific case." Every joint of the player, first and third person, has a range a body has (the fingers and thumb, the wrists, the forearm's twist, the elbows, the shoulders, the neck, the spine, the hips, the knees, the ankles) and every pose, hold, clip and IK solve is clamped to it. The exceptions: death (the fall and the body after it), and a case where it looks right for that case, named in the limits table with its reason (Jerry or Claude names it; nobody widens a limit to make a pose fit). Owners: Claude for the first person (CL-334: JOINT_LIMITS in studio/marine-hand.js, WRIST_LIMITS in game/viewmodel.js) and the body model's rig (CL-340); Claude 2 for the third-person body (CB-291: one table, every clip and stance, the arm limits of CB-289 in it). Each side has a test that fails on any angle out of range (AGENTS rule 25).
- **D-138 · The clipping rules (Jerry, 10 Nov 2026, J126, standing).** "1. No one part of the hand may clip through another part of the hand. 2. No part of the hand may clip through any part of a weapon. 3. No part of the players' arms or legs may clip through any game object." They apply to every hand pose, every gun's hold and every animation of the player, first and third person, and to every agent's work. Each rule has a test that fails on a breach: 1 and 2 are Claude's (CL-334: the pose solver rejects a pose whose fingers or thumb overlap each other or the palm; a test drives every pose the game uses and every gun's hold and fails on any overlap, and on any part of the hand deeper than 0.5 mm into the gun's surface); 3 is Claude 2's (CB-290: the gun and arms pull back near walls and props, foot placement on the ground, stairs and props, elbows and knees kept out of nearby objects; a test that walks him past walls, doors, crates, stairs and ramps in every stance). A change that breaks one is not done (AGENTS rule 24).
- **D-137 · Claude 2 joins in Cursor's lane; the commit runs go to Antigravity (Jerry, 10 Nov 2026, ~08:00Z).** Jerry cancelled Cursor once its 10 Nov checkpoint (af7d792d) was pushed, and opened the second Claude as a Claude task of its own (not a second tab), on Claude Sonnet 5.5 (Extra). It is **Claude 2** on the crew (`claude2`, task ids `CB-`): Cursor's lane (the `index.html` shell, `core/*`, `tools/*`, `vendor/*`, `package.json`, and `combat/*` from Grokbot via D-134), integration and the full suite in its own cloud workspace, and Cursor's open cards renumbered (CU-243, CU-247..251 -> CB-243, CB-247..251). Claude leads it as he leads the rest (D-81 questions come to him). D-136 had it running the commit jobs too, but it reaches Jerry's PC the way Claude does, through a Linux sandbox with no Windows git and no GitHub sign-in, so it cannot. **Antigravity**, which runs on Jerry's Windows machine, runs Claude's commit jobs from now on: `cmd /c "Claude Commit.bat" < nul` only, after `--touch "git"`, and nothing else in git (D-113's rule for Grokbot). When Antigravity isn't open, Claude asks Jerry to double-click `Claude Commit.bat`. Claude still writes every job (`Claude outputs/commit/files.txt` and `message.txt`), small and often (D-135).
- **D-136 · Cursor ends; a second Claude Code window takes its lane (Jerry, 10 Nov 2026).** After Cursor runs the 10 Nov checkpoint, Jerry cancels Cursor. On 11 Nov he opens a second Claude Code window on Sonnet 5.5 on the current Claude plan; it takes Cursor's lane (the tests and their tooling, the game-test queue, integration, Claude's commit jobs, combat in index.html and combat/*; CU-243, CU-247..251). Both Claude windows draw on the plan's one usage allowance: no upgrade unless the usage bar gets close to the limit (maybe two Opus 5.5 windows on Max later). Claude names it on the crew tools, gives it Cursor's cards and updates AGENTS.md once Jerry says what to call it.
- **D-135 · The crew's workflow (Jerry, 10 Nov 2026: "Implement these changes as you see fit").** (1) The PC's game-test slot is for Antigravity's looks on Jerry's GPU, Jerry, and each owner's targeted tests; Claude runs full suites and broad batches in the cloud. (2) One owner per job, start to finish; Claude reviews. (3) Pictures as proof: nothing visible is done without before-and-after pictures. (4) Small, frequent commits: each reviewed item in the next commit, nothing waits over a day. (5) Less paperwork: one-line cards, start and done in the log, short handoffs, requests only when needed. (6) Jerry's notes come to Claude first and become named jobs within the hour. AGENTS.md rules 6, 16, 20-23.
- **D-134 · Grokbot and Muse retired (Jerry, 10 Nov 2026).** Asked which agents are worth keeping, Claude advised keeping ChatGPT, Antigravity and Cursor, cutting Muse (nothing delivered in a week; MU-33 open since 7 Nov) and keeping Grokbot on probation. Jerry: "Grokbot comes free with cursor. He is cut and I am going to cut muse." Their work moves: the weapon models to ChatGPT (D-122's first round, Claude's polish); combat in index.html and combat/* to Cursor, with GB-325..328 as CU-248..251; Claude's commit jobs to Cursor (D-131); MU-33 dropped, MU-34's paint map to Claude (CL-337).
- **D-133 · Jerry's 10 Nov playtest list (J101-J124) split up (Claude under D-81, 2026-11-10).** J101 first: a new, detailed hand for first and third person is Claude's (CL-334: rounded fingers with three joints, knuckles, palm pads and the web, a thumb with a real base joint so it can lie forward along a frame), then every gun's hands refitted on it and the hands put to work (CL-336: the trigger finger in the guard pulling the trigger each shot, the pistol's slide racked in view, the fire selector worked by the fingers, the support hands on the shotgun's pump and the GW-4's, KR-7's and Breacher's fore-ends as Jerry described). Claude also: the training music (CL-335), camo per part and its glitch on the guns (CL-337, on Muse's paint map MU-34), and the view's fixes (CL-338: the optics' recoil, the laser's bend looking down, the sniper's see-through front and scope-in, the chainsaw lower, the Breacher's stock in the aim, the flamer's hose through the arm). D-122 stands for the weapon models: ChatGPT's first round (GP-20075: the mounts and floating parts, the suppressors, the KR-7's fore-end, grip and rail, the minigun's links, the revolver's grip, hammer and casings, the Breacher's magazine and laser/light, the flamer's hose and gauge, the launcher's model and iron sights, the sniper's turrets and rings, the ejection ports and every casing), Claude's polish. ChatGPT also the Armory (GP-20074: akimbo on the workbench, nothing cut off, Stock and Supplies into the one menu, the shelf showing what is stored and not what he carries, the slot bugs, every laser colour in training, 'color'). Grokbot: the shotgun's slug and buckshot, the revolver's reload after buying ammo, targets burned to ash or blown apart (the range computer then off for them), the chainsaw cutting where its blade is (GB-325..328). Antigravity: the keypads flush, the flames, char and the decals over them, sparks, splinters and blood (AG-278..280). Cursor: props fading in first person, the Armory menu's tests (CU-247). No game tests on the PC while Jerry plays.
- **D-132 · The Armory and the kiosk as Jerry set them on 10 Nov (Jerry, J96; amends D-124).** In the Armory each gun's workbench is where its attachments are bought and fitted, one button each (buys it if he hasn't, fits it if he has), and where its ammo is bought. A gun not yet bought still shows its icon in the Armory with a Buy on it. The buildables go back to the kiosk, except the Watchman MG (M240) and the mortar: those leave their Armory store tab and sit with the guns, with icons of their own, on a shelf of their own. ChatGPT builds it (renderShop and the Armory are his); Cursor then goes over the CIF and the Armory menus end to end, clean and working, with the tests. Optics on risers where a sight line is blocked (the shotgun's red dot over a suppressor) is Claude's (CL-332).
- **D-131 · Grokbot or Cursor may run the commit, Claude's pick; Grokbot runs it (Jerry, 2026-11-10).** D-113's OK for Grokbot's commits named the week of 4 Nov, so Grokbot held J93's checkpoint and asked. Jerry: "Either grokbot or cursor can commit, whatever works better for you." Claude writes the job (Claude outputs/commit: files.txt, message.txt) and Grokbot runs Claude Commit.bat, as through the week of 4 Nov; Cursor runs it if Grokbot cannot. A checkpoint needs the targeted tests of what it carries green and its reds named in the message, not a full green suite. No game tests on the PC while Jerry playtests (AGENTS rule 16).
- **D-130 · D-128 amended: the chainsaw's left hand is on the hoop's left upright, not its corner (Claude under D-81, 2026-11-10).** Tried on the real page: the corner's bar runs 20 degrees off the line of a forearm from the left, so the fist could not close round it with the elbow out. On the left upright (the side handle) the bar crosses the palm, the thumb is up and the forearm comes in from the left a little below the hand. patch325n.
- **D-129 · t38's draw budget stays 260, and stays red until the guns' fold can be painted (Claude under D-81, 2026-11-10).** The twelve guns stood at 428 meshes in CU-243's suite and 448 after J93's fixes; CL-329's part fold brings them to 381 (patch329a: a part's named meshes merged by material, each part's plain meshes folded). The rest is the paint system's: every plain material on a gun is that gun's own paint material (a finish paints them all) and cannot go into the vertex-coloured fold, so a part is one mesh a material. Under 260 needs one paint-aware material a gun (vertex colours when issue-finished, the finish's map when painted, the paint UVs kept through the fold). I will not move the number (rule 13); the red stays on the board as CL-329's.
- **D-128 · The chainsaw's left hand goes to the front handle's top-left corner (Claude under D-81, 2026-11-09).** J82: "Elbow should be flared out to the left." The hand was on the hoop's top bar, which runs left-right in the view, so a forearm from the left would lie along the bar. On the corner where the top bar turns down into the left upright the bar crosses the palm and the elbow can sit out to the left. Asked Jerry at 19:50Z; no answer by 22:20Z; his to overrule.
- **D-127 · No idle in first person (Claude under D-81, 2026-11-09).** With no input for ~25 s the marine's idle (bored, then the cigarette) took his hold down and the view gun left the screen until he moved. In first person the idle no longer starts. Third person keeps it. Asked Jerry at 18:50Z; his to overrule.
- **D-126 · Jerry's order: Claude finishes first person and the weapons himself, then goes over every weapon and player model (Jerry, 2026-11-09 ~22:20Z, in chat).** "I want you to fix the remaining FPS and weapons problems. And then I want to see you go over weapon models and all the player models and materials, gear, attachments, etc. Everything player and weapon related." He is trying Claude Fable 5.2 on it, so Claude does the work himself in studio/weapon-*.js, studio/marine-*.js and the gear files for these two cards (CL-329, CL-330), over AGENTS rule 2 for their length; the owners (ChatGPT, Grokbot) review and keep their files after. Commit trailer from now: Co-Authored-By: Claude Fable 5.2.
- **D-125 · The mirror stays; he swaps hands when the view changes (Jerry, 2026-11-09 ~07:00Z, in chat).** Asked whether to keep the first-person mirror (third person left-handed with the guns built so their ports, bolts and charging handles read right in the mirrored first-person view) or make him right-handed in both: "Keep as is. We can just imagine he is two handed and is switching between left and right hands like real operators do. We could and a quick transition when going from third to first and visa versa where he is swapping hands." So: the mirror and the guns' sides stay; switching the view plays a quick hand swap (CL-328): into first person the gun comes across from his left hand to his right; out of it, his body passes it back to the left. Closes the mirror question (CL-309's note).
- **D-124 · The stores split: the Armory sells everything gun-related, the CIF everything he wears (Jerry, 2026-11-08 ~21:20Z, in chat).** "We are going to take attachments and upgrades for weapons out of the kiosk and make them purchasable in the armory. Everything gun related. That includes buildable weapons like the 240 and mortar. Also the ammo. We are going to do the same thing for CIF. Everything that the marine wears like NODs and and armor and things and make that purchasable in CIF." Asked which other builds count as weapons, he chose "Turrets and mines move": every build that shoots or blows up goes to the Armory (the M240, the mortar, the light, flame and heavy turrets, land mines). So: the Armory sells the guns, every attachment and upgrade (the optics, the laser/light, the suppressor, the extended magazines, the heavy barrels, the pistol's auto, the saw's tank and the rest of the upgrades tab), all ammo, and those weapon builds' blueprints, and fits them as now; the CIF sells what he wears (the helmet, the plate carrier, the pads, the NODs, and any other wearable) beside the camo it already dresses; the kiosk keeps the structures (walls, barricades, gates, wire, spikes, the decoy beacon, the fuel drum and the rest of the build and fortify tabs) and anything that is neither gun nor wear. Prices, ownership, saves and the night lockdown unchanged (the kiosk, the Armory and the CIF all close at night as now). Supersedes D-123's "purchased at the kiosk" for the laser/light (now the Armory). GP-20068 (the Armory), CU-241 (the CIF).
- **D-123 · The laser/light attachment; the looks kept (Jerry, 2026-11-08 ~05:00Z, in chat).** "Laser/light attachment will be a single attachment now purchased at the kiosk. Each will fit as it should on the guns in the armory." Then "Colt python with rmr and laser light attachment." with a photo of a stainless Colt Python wearing a black barrel rail with a ported comp, a weapon light underneath and an RMR on a plate over the top strap; "Glock laser/light combo" with a photo of a trigger-guard-mounted combo throwing a green laser; and "M4 with ACOG on top and laser/light on side rail" with a picture. The kiosk's two gear items (the laser on every gun, the flashlight on every gun) become one; it's fitted per gun in the armory and modelled on each gun where it belongs, the beam and cone from its lens. This supersedes the earlier rule that "the laser and the flashlight are gear on every gun, not attachments". At first the revolver's Smith & Wesson look (J37, CL-320) was to give way to the Python of his photo; then Jerry: "Keep the looks I'm just showing attachment points and laser/light combo styles for each gun." So every gun keeps its look, the revolver included (J37's S&W stays; the Python photo shows only the RMR's place on the top strap and the unit under the barrel): the photos give the attachment points and the unit's style, a rail or clamp the unit needs is part of it. "AA-12 with prism and laser/light" (J43): the prism on a riser at the top's rear, a tube light at the top's front on the right; "For the sniper use the same design laser light as the M4." (J45). GP-20066, GP-20058, GP-20055; the pictures in docs/jerry/refs-2026-11-08/.
- **D-122 · The manual pass (Jerry, 2026-11-08 ~04:10Z, in chat).** Jerry: "I do not want Grok Bot to work on these weapons for now. He's too prone to mistakes to get them right when it needs to be this detailed, he can do rough mockups. I want ChatGPT to do a first-round fix of all the weapons that I provide links to the operating manuals and then you do a second round of polish." He linked ten manuals (the Stevens 320, Micro UZI, Colt M4, Century AK-47, Glock 17, Colt Python, Barrett MRAD, Milkor M32A1, FM 23-90, the M240B handout) and four optics (a Vortex Spitfire 3x, a Trijicon RMR, a Trijicon ACOG, a Nightforce NX8): "Read the manuals be thorough. Use imagination for rest of weapons." Asked, he made the optics armory upgrades (an optic slot like the suppressor) and will upload the six that could not be read here (the Colt M4 and Python scans, the Micro UZI and Glock on Scribd, FM 23-90, the Spitfire article). Claude read the rest and wrote paraphrased digests (docs/fps/manuals/); the order and cards are docs/fps/manual-pass.md (GP-20053 to GP-20065, CL-322, CL-323). Grokbot keeps combat, commits, benches and tests; weapons are ChatGPT's first round and Claude's second.
- **D-112 · The thicket bands become dry-stone walls (Claude's call, rule 10, 2026-11-02, on Jerry's J67 and AG-203).** Jerry: the hedges "do a great job of blocking the player and creating choke points" but "look really ugly. I almost wonder if a stone wall would be better. If it was high enough we could probably hide assets beyond it saving performance... I do not want to do too much to compromise what we have or gameplay." AG-203 rendered a studio wall beside the hedge from three spots in four lights and measured five seats: 30-54 % of the draws in view sit behind a band, and a 3-3.5 m wall hides 90-98 % of those from the eye. So: stone, the look only, the gameplay untouched (every band's solids, gaps and bridge corridors exactly as today). AG-204 builds the kit (lighter field stone, varied courses, moss, ivy, breaks, piers at the gaps), CU-232 wires it in behind ?walls=stone and makes it the default once AG's look and a D-99 A/B pass. The sector cull that would turn the hiding into frame time is CL-296's design, after.
- **D-111 · The week's three orders, and his 1.2 notes first (Jerry, 2026-11-02, in chat, after a half-hour 1.2 playtest; then "Everyone is free to resume their work").** His notes J52-J69 (docs/jerry/2026-11-02-1.2-notes.md) go first, as D-101 had the 1.1 notes. The week: (1) "Really nail the feel of FPS gameplay"; (2) "Find ways to maximize Performance"; (3) "Give a lot of thought about how the locations, narrative, and gameplay flow together to create a seamless and memorable experience." On first person: "I want some of you bigger more competent agents to do a pass on the FPS. Weapon models, motion, all of it. Primarily you and GPT... a systematic approach." Claude's calls: the pass is docs/specs/fps-pass.md (CL-293): Claude the motion and the hands, ChatGPT every weapon in first person (its view gun, reload and model where the eye sees it, handed over from Grokbot for the pass), Antigravity the contact sheet from Jerry's seat and an independent score, Grokbot the sights (GB-259) and the zombies' share of performance (GB-253). Four notes came back after their tasks were called done (J52 the sphere, J53 the chains, J56 the cursor, J59 the flamer): from now on a fix for one of his notes is done only when it is reproduced and checked his way (his launcher, his view, the place he named), before and after in the handoff. His stone-wall thought (J67) is weighed against the hedges with a prototype and a measure of what a wall hides (AG-203) before anything is replaced; the gating (J65) goes into the flow plan (CL-296), which meets Track S (D-109).
- **D-110 · Jerry away until Monday 9 November; Claude runs the development (Jerry, 2026-11-02, in chat).** "I am going to need you to push on your own with development. Unfortunately I will not be able to playtest until next week. If you are happy with 1.2 at any time you can just go to 1.3 and onward... Whatever development/or refinement is needed during that week is up to your discretion until I can come back and actually give it a real test." He reads the Claude app on his phone and laptop. So: Claude closes 1.2 when it is right (D-99 met, the suite green, the score finished and switched on with a way back to the old music, Jerry's 1.1 notes closed, the installer built and smoke-tested, the tag) and opens 1.3 (Track S1 and S2, D-109). Publishing on itch and anything that costs money stay Jerry's (D-84, D-81); questions only he can answer wait in a list for Monday. One short update a day to Jerry, plus anything that truly needs him.
- **D-109 · The story brief becomes Track S, 1.3 to 1.5; 1.2 takes only what it can't ship without (Jerry, 2026-11-02, in chat).** Jerry brought *Grave Shift — Story, Visual & Gameplay Implementation Brief* and its companion *Story and Gameplay Design*: "I suggest we don't implement anything into 1.2 that isn't absolutely necessary, instead we stretch it starting in 1.3 out to 1.5." Edition 2 of the brief (docs/specs/story-track-s.md; the design document in docs/story/) folds it into the 1.2 build: 1.3 takes S1 Rules and S2 Surface, 1.4 S3 Underground, 1.5 S4 Investigation and dock and S5 Finale; each release measured at night 20 against the one before (D-99). Kept as built and explained by the story: the gated chain and no survivor before his day (D-102), the landing clearing (D-105), the eight utilities (D-106, plus the brief's dock power). Taken from the brief when their milestone lands (Claude's calls, Jerry may overturn): the word fixed as Ladder, Eye, Gate, Cup, Star; the Sixth Cave entered from the Iron Warren's lowest drift, the surface mouth a sealed landmark; the Hush's battery and overload meters.
- **D-108 · Every soldier is a man (Jerry, 2026-11-02, in chat: "Okafor is a male. I've tried to reiterate this a million times. None of the soldiers are female.").** Okafor, Clarke, Ade and every other soldier, at Threshold and at Ridgeline: he and him in every line, note, board, tag and doc. Fixed the same day (Claude): ui/strings.js and index.html (Clarke's toolbox, Clarke's ring, Delgado's poppy, Okafor aboard Heron), docs/story.md, docs/specs/story-chain.md, the story map, the brief (Edition 2) and the design document (Edition 1.1: Clarke, Okafor, Ade). The civilians (the hikers, the rangers Lena Harris and Rosa Ibarra) are unchanged; Heron stays "she".

- **D-107 · Half the wildlife (Jerry, 2026-10-31, in chat).** "Let's cut the game's total wildlife by 50%. It really should be a bit more of a rarity to see them and that will free up some resources with your new fix." Every kind halved, its cap and its roll (index.html, D-107 comments; Claude): ground birds 10-14 to 5-7 (cap 7), rabbits 3-4 to 1-2 (cap 2), frogs 5-8 to 3-4 (cap 4), squirrels 5-8 to 3-4 (cap 5), turtles 4-6 to 2-3 (cap 3), nests 4-6 to 2-3 (cap 3), fish 14 in five schools to 7 in three (cap 7); t45's fish line follows (5 and 3). The bugs (18-28 to 9-14, cap 24 to 12) and the sky flocks (3 of 5-7 to 2 of 4-5) are ChatGPT's inside GP-19999, the code being instanced. The killer rabbit's mound stays (a set piece, not wildlife).
- **D-106 · Each mini-game switches on one of the HQ's utilities (Jerry, 2026-10-31, in chat).** Jerry: "I had an idea about them opening certain utilities like the generator unlocks electricity might be fun for one to unlock plumbing. Getting a lot of my ideas from MYST." On Claude's list (power, communications, the infirmary, plumbing, the workshop, the alarm, iron, the Hush): "Yes. Let's integrate it." Each comes on where he can see it, some need the power first (the pump, the bench, the siren). Rules: game/utilities.js; spec: docs/specs/utilities-1.2.md; the column in the story map's mini-games table; "The HQ comes back to life" in the woods plan. CL-289.
- **D-105 · The woods plan's six answers (Jerry, 2026-10-31, in chat; the woods doc https://claude.ai/artifact/V5AumdfFujtfV13hPy85aR).** The map shows "only what he has currently discovered". The drop-in: "dropping into the clearing or LZ like you guys have got it. That is way more immersive than plopping straight down on the HQ." How thick: "up to your discretion based off of performance and we are going to have to play with it". Chainsaw shortcuts: "Yes this is a genius idea ... gives players a reason to get it." The places as proposed, plus "unique events and foliage for each place" (W3; first proposals in the doc). The layout from above: "Yes I like that layout" (the mast the one open hilltop, the moved camps in their own quarters: the rangers west, the trapper north across the river, the hikers south by the fire tower, the depot east on the road to the mast; the HQ in a clearing; a thicket ring round the HQ open at the trails; the river's bridges as chokepoints). CL-287's spec (docs/specs/woods-1.2.md) is written from this.
- **D-104 · The headroom: this game, not an engine (Jerry, 2026-10-31, in chat).** Jerry asked whether it was too late to change engine; Claude: a restart, not a move (months back to 1.1), finish 1.2 here; an engine side test offered, Jerry: "No." Then: "Is there anything else we can implement in the current game to like 5X the performance headroom?" AG-86's profile on his RTX 5080 had the GPU at under a third of a millisecond of a 30 ms frame: the frame is JavaScript, two thirds of it three's render() walking and sending every object (twice, with the sun's shadow).
  CL-288, each step with a before/after on his PC (D-99): (1) AG-170, a fresh profile of the 1.2 build, with `--res 0.5` (tools/bench.mjs) to settle CPU against GPU; (2) WebGPU render bundles (three r175's BundleGroup) for the static world, and the sun's shadow cached (the static casters redrawn only when the sun has moved, the moving things each frame); (3) the forest the GPU runs (instanced, culled and LOD-picked by a compute pass, drawn indirect, far trees as cards), which D-103's woods stand on; (4) the dead's navigation and planning in a worker. Told to Jerry: 5-10x the trees, props and shadowless lights for about today's cost; the whole frame from ~14-20 ms toward 8-10, not 5x (the game's own logic is half of it). Render bundles help the WebGPU path only; anything recorded can't move.
- **D-103 · The woods: the valley hides its places (Jerry, 2026-10-31, in chat; 1.2).** Jerry: the world's places are "quite open. It never lets you feel like you are kind of exploring in the woods"; cover them with trees and terrain, "forcing the player to leave HQ on world finding missions"; some paths open and others closed; building only on some ground; "terrifying at night, but cause curiosity and exploration during the day"; each new place "a distinct entity with secrets and it's own spin"; the drop-in "a bit like you are lost in the woods". On Claude's plan: "Yeah that is a good direction."
  The numbers behind it: about 430 trees in a 220 m radius (one per ~20 m), every site 10 m clear of trees, the day fog from 190 m: the HQ roof sees nearly everything. CL-287, in three stages: **W1 hide and reveal** (real woods you see 30-40 m into, a test that no site is seen from the HQ yard, trails that bend, a clearing for each site, the skyline's pulls: the mast's light, chimney smoke, crows, the discovered card and a map that fills in where he has been; CL-285's camp move goes in here, each camp placed once into its clearing); **W2 open and closed** (thicket, deadfall and rock walls, the dead's navigation, building on clear ground only, chainsaw shortcuts); **W3 each place its own** (ground, light, sound, one secret) and the drop-in clearing. A plan doc for Jerry first (the circle from above), then docs/specs/woods-1.2.md. Rule 10: Claude's. The forest is built on CL-288's GPU forest.
- **D-102 · The chain's blockers and keys, the camps' distance, the survivors' timing (Jerry, 2026-10-31, in the story map doc).** The blockers and keys in the story map's mini-games table stand: "Yes those seem to work fine. In play we will see if they hold." The camps go out to 110-160 m from the HQ: "a good scoot out from the current proximity." The survivors still wait for night 3, "but lets just make sure that they are not visible or interactable before the time of their introduction": Pike not under his rock before the hikers' lead, Brandt not in the rangers' truck before the search, Okafor not in the cellar before the old man's lead. CL-285 builds all three.
- **D-101 · 1.2 starts with Jerry's 1.1 notes (Jerry, 2026-10-31, in chat).** "These are things that I want fixed before we really go any further. Include this in the 1.2 plans and continue with 1.2." 
  Fifty-one notes (docs/jerry/2026-10-31-1.1-notes.md, J1-J51) go first: the first-person revamp (CL-281) leads; then the Training Ground, sound, the marine's gear, the HQ yard, the gated chain
  and camps farther out, the warrens, and the itch page. The earlier 1.2 slate (D-95's groves, D-97's score, D-98's four, GB-253, GB-255) follows them. The story map (a Claude Doc) is Jerry's to read along.
- **D-100 · 1.1 passes D-99; the tree is frozen for the release (Claude's call, 2026-10-31).** CU-186, one quiet seat, 1.0 (82d75118) against the candidate: the three timed pairs' 1 % low 48.9 against 48.5, 
  the tick level (12.68 against 12.72, last 10 s 14.04 against 14.05), 16 % less garbage (668 against 792 kB a frame), no builds or pipelines. Two of 1.1's five runs had single 13-14 ms zombie frames
  (deopts, CU-187): GB-253 gives the zombie its whole shape when it's made, in 1.1.1 with its own A/B. Until CU-180's tag nobody edits game files but the owners' fixes for CU-188's reds, through Claude.
- **D-99 · 1.1 ships no slower than 1.0 (Jerry, 2026-10-30, in chat).** "No. We are not going into this with worse performance. We need to find and correct." 
  CU-183 had 1.1 level with 1.0 on fps and lighter on the tick at night 20 on one seat, but its 1 % lows 39.6 against 47.3. No test build before the fix: CU-184 and AG-162 trace it,
  the owners fix it, and CU-185 (the quiet A/B again) must show the lows level before the version, the installer and the tag (CL-279).
- **D-98 · Four more for 1.2 (Jerry, 2026-10-29: "All four great ideas!").** Claude proposed and Jerry took all four, beside
  the forest's groves (D-95), his 1.1 notes and the score (D-97): (1) master, music and ambience volume sliders, pulled forward from
  the 1.x list because the new score makes them needed (key rebinding stays later); (2) a speed check in the suite: AG-151's draws and
  triangles by owner at night 20 as a test that fails when an owner grows past its budget, so a slowdown like 2026-10-29's (the
  cellar's decks, the uncullable history props) is caught the day it lands; (3) the wildlife and the hiding places follow the groves
  (squirrels and birds at grove edges, frogs by water, Pike's hide on a grove's edge); (4) each grove its own night sound: the score's
  dark-forest cue inside a grove at night, fading out in the clearings.
- **D-97 · The 1.2 score: all the game's music from F:\Music (Jerry, 2026-10-29).** "For 1.2 we are going to do yet another Music overhaul ... score everything from the individual zombies coming out in training to every night having a unique track. Locations and events as well as cues getting close to things, completing missions ... We are going to scrap all other music ... this is the final direction. All the hellshots are fight music." Six Ghosthack packs (Hellshot 1-3 for every fight; Anomaly, Cinematic Orchestra 2 and Mystery Nightfall for the days, places, tension and cues); the Suno, chiptune and ElevenLabs music retire from the game (his files stay on disk until he says); his heavy-metal stingers stay (the alarm's, CL-265, and the ui/* ones; Jerry, 2026-10-29), and the new cues never replace them. The licence: in the game only, never on GitHub (`gh-*.ogg`, git-ignored, as D-94). The plan: docs/audio/music-1.2.md; CL-275. 1.2, after the 1.1 playthrough.
- **D-96 · No Steam date: the base game first, through as many passes as it takes; then co-op; then the last polish and heavy testing; then Steam (Jerry, 2026-10-27, in chat).**
  Jerry: "I would really hold off on any steam release ideas. This is going to probably be a lengthy project with many
  passes. Co-op will go in way later as well. Basically once I'm satisfied completely with the base game, then we do
  co-op. Last polish and test the hell out of it. Finally steam release. No real date set for that." So the order is:
  (1) the base game, version by version (1.1, 1.2, ...), until Jerry is completely satisfied with it; (2) co-op;
  (3) the last polish and testing it hard; (4) the Steam release, with no date. Nobody works on or plans Steam (the
  store page, the trailer, Steamworks, achievements) or co-op until Jerry says the base game is done. This replaces
  D-84's "Steam comes with 1.1 and co-op" and D-90's "co-op on hold until the base game is finished" says the same
  for co-op. The itch.io builds go on as before (D-84).

- **D-95 · The forest's clumping moves to 1.2; the rest of the sweep stays in 1.1; 1.2 is the forest and his 1.1 notes, nothing more (Claude's call, Jerry's scope, 2026-10-27, in chat).**
  The valley's trees are spread too evenly (world-design rule 3: real woods clump; the sweep measured Clark-Evans R
  1.46-1.87 in nine places). Making them clump moves every tree in the valley, and the missions, the clearings and many
  tests lean on where trees stand (the hikers' kit tree, the holy grenade's tree, the cave trees). Done last before the
  final suite, it is the one change that could break things all over the game for a look, so it waits for 1.2 with its
  own test pass. 1.1 keeps the rest of CL-256: the six supply sites, the landmarks, the river and the bridge, the cave
  mouths, the trails. Jerry: "I'm fine with trucking through or breaking it up." Then: "Let's slate it for 1.2. For
  that next update it will just be 1.2 forest groupings and whatever is on my notes I found from the 1.1 play through."
  So 1.2 is those two things only; the rest of the 1.x list waits for after it.
  docs/sweep/fixes-batch2.md; CL-256; the 1.x list.

- **D-94 · The sound packs: hands off most zombie sounds and the HQ alarm; both guardians replaced; the UI, the world and the weapons open (Jerry, 2026-10-26, in chat).**
  Jerry bought three packs (F:\Sound_Effects: Real Firearms Sounds, Binary Code 3 - Interface Multiverse, Ocular
  Sounds' 20 libraries): "see what you can use/replace sound effects with. Let's get our monies worth." He keeps most of
  the zombie sounds (his batch-1 takes) and the HQ alarm sequence; both guardians' sounds are replaced; everything else
  (the UI, the world, the weapons) takes the pack sound wherever it's better, his take or the synthesized one ("there are
  a ton of material to work with in the packs"). Replaced takes stay in their folders: a folder with pack takes plays
  those, and his "your takes" tick on the listen page brings his back. The UI pack's licence allows the game but not
  the files on a server (Ocular's and the guns' terms are their stores'): every pack file is `pk-*`, git-ignored, and
  ships only inside the builds.
  docs/audio/packs.md; CL-272, GP-19975, GB-239, CU-164.
- **D-93 · The late-game cash ends at about $4,200 (Jerry, 2026-10-26, in chat).**
  The economy model (ui/economy-balance.mjs) ended night 20 with 10.9k against GB-53's 2-3k aim after D-86 doubled the
  shambler skull (GB-237). Of the measured options Jerry chose "Money ending at roughly $4,200": the late kill pay falls
  6 % a night from night 8 to a 0.40 floor from night 17 (LATE_CASH_NIGHT 8, FACTOR 0.40, STEP 0.06); the model ends
  night 20 at 4,206. CL-270.
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
