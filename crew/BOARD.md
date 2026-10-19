# Grave Shift crew board

Lead: Claude. Rewritten 2026-10-15 (CL-199); the road to 1.0 added the same day. Jerry reads the **Crew Panel** (`crew/Open Crew Panel.bat`); agents start
every session with **`node crew/crew.mjs me <you>`** (your card, requests waiting for you, your queue, the test slot, the
commands). Rules: `AGENTS.md`. The old board, whole: `crew/archive/board-2026-10-15.md`.

Claude and Jerry write this file. Agents change only their own task's box, which `crew.mjs in` (▶) and `out --done` (✓)
do; a task Jerry gives you in chat goes on your queue by itself when you check in with its id.

## Game-test slot

One game test at a time per computer (Jerry, 2026-10-15). Anything that starts the game goes through the automatic queue:
`node crew/crew.mjs slot run <you> <task> --checks "<what you check>" -- <command>`. It waits for its turn, runs one
instance with `--jobs 1`, closes it and releases. Jerry's own game or inspector always comes first. While you wait, keep
coding. If your session ends before your turn: `node crew/crew.mjs wait <you> "<what is ready>"` (it says "Changes
ready; waiting for testing slot" on your card and on Jerry's panel). The full suite is one coordinated job (Cursor's
CU-110). Claude's cloud is a separate computer; it keeps to one instance there too. `AGENTS.md` rule 16 has it all.

## Waiting on

One line per thing others can't go on without: `- **<who>** · <task> · waiting: <agents>`. The panel's "Needs you" box
reads it; a line whose task ids are all finished drops off by itself.

- **Antigravity** · AG-88 (CL-211's cuts measured) · waiting: claude (CL-211)
- **ChatGPT** · GP-19933 (the leaper's hit surface) · waiting: grokbot (GB-193)

## Orders from Jerry

Newest first, the ones still in force. Older ones: `crew/archive/board-2026-10-15.md` and the archives it names.

- **2026-10-19 · Jerry is out of the approval loop (D-81).** "Cut me out of the loop for approval for the time being. Make decisions based on what seems best." Anything that would wait for his yes (a `crew.mjs ask`, "awaiting Jerry's approval", a Q-n) goes to Claude as a request instead; Claude decides, logs it and says why in the reply. Still his alone: deleting his files or work, money and accounts, publishing anything outside the repo (the 1.0.0 release itself), and undoing one of his own orders or decisions. Until he says otherwise.
- **2026-10-15 · Claude runs the road to 1.0.** "I am going to let you assign tasks in a way that you think will be best for 1.0. I will stop my polishing. It is up to your discretion how we get there." Agents are prompted with "Check the board". The road: above; the plan: `docs/road-to-1.0.md`. The story v3 cards (CL-86) are folded into it: wave 1 now, the rest 1.x.
- **2026-10-15 · Overhaul the crew board.** "Clean it up, overhaul it so it is easier for you guys to use. Easier for me
  to understand. Better functionality for both." Claude: CL-199 (this board, `crew.mjs me/requests/reply/wait/archive`,
  the panel's "Needs you").
- **2026-10-15 · Agents take direct work from Jerry in chat.** Check in with a new id (`crew.mjs newid`); it lands on
  your queue here by itself. Tell the owner of any file you need with `crew.mjs request`.
- **2026-10-15 · One game test at a time** (above). The queue is automatic (Cursor, CU-146).
- **2026-10-15 · Owners.** Claude: the marine's fabric (blouse, trousers, hats, gloves). Grokbot: every weapon. ChatGPT:
  every zombie's look. Antigravity: the buildables' and props' look. The table below.
- **2026-10-14 · The inspector** is how everyone looks at models and animations: the real game
  (`index.html?inspect`), never a copy (D-80). `Open Marine Inspector.bat`; agents through the slot.
- **2026-10-01 · Build the pieces; Jerry plays them.** No timed or long runs (D-71).

## Who owns what

Not sure a file is yours? Ask its owner with `crew.mjs request`; don't start it.

| Agent | Owns | Model (the card's `model:` is the truth) |
| --- | --- | --- |
| Claude (lead) | The board and reviews; the marine's body and fabric (`studio/marine-body.js`, `marine-cloth.js`, `marine-hats.js`, gloves), the ears (`ui/marine-face.js` buildEar); the inspector (`studio/inspector/`); the studio and reactions; story and sound design | Claude Opus 5.5, Cowork (cloud) |
| Cursor | Tools and the test queue (`tools/`), integration, the full suite, commits and pushes; direct fixes from Jerry (now: the smoking pose) | GPT-5.6 Sol, Cursor |
| ChatGPT | Every zombie's look (`studio/zombie-*.js`, `combat/demon-visual.js`, zombie fire); the marine's fitted helpers, waist and balaclava; every word the player reads; the Training Ground's UI | GPT-6, ChatGPT/Codex |
| Grokbot | Every weapon (`studio/weapon-*.js`, grips, hand anchors); combat in `index.html`: the director, builds' behaviour, scripted deaths | Grokbot |
| Antigravity | The look of the buildables and props (walls, floors, barricades, sandbags, wire, railing, platform, pillar, stairs, traps, the skeletal marine); eyes on Jerry's GPU | Gemini 4 Argon (High), Antigravity |

## The road to 1.0

Jerry, 2026-10-15: Claude assigns the work to 1.0; Jerry stops polishing. The plan and why: `docs/road-to-1.0.md`.

**The 1.0 bar:** it works start to finish, nothing reads as a mistake or a placeholder, it stays inside its frame
budget. "Could look better" is 1.x: put it on the **1.x list** below with `crew.mjs request <you> claude "1.x: ..." --fyi`,
don't build it. **Model polish is frozen** (guns, zombies, the marine, buildables) except bugs and budget cuts.

1. **Steady the ground** (now): the suite, every red owned, everything committed; frame budgets. **The gap is frame time:** every night runs 31-35 fps on Jerry's 5080 at High against 60 (AG-82, AG-85), and fewer draw calls did not move it; CL-211 finds where the time goes first.
2. **Finish the run**: the story's words, then its scenes; Heron's condition said out loud; the silenced night.
3. **The first hour**: the goal on day 1, a pointer to the Training Ground, clean Tips.
4. **Night packs**: Jerry plays nights in 20-30 minute packs; his notes become tasks.
5. **Ship**: the desktop build, 1.0.0, budgets met on Jerry's PC, a green suite, the tag.

**New text the player reads:** add its keys to `ui/strings.js` yourself, in a block headed `// <your task id>`, English
only; ChatGPT reads every such block once (GP-19928). Re-read the file right before you save it (rule 4).

## Queues

`[>]` working · `[ ]` to do · `[!]` blocked or waiting for the test slot · `[~]` parked. Top to bottom. A task that
says "after XX-n" waits for it. Finished tasks leave the board (`crew.mjs tidy`); their reports are in `handoffs/`.
Finish what you have in progress first (and queue its game checks); then take the next.

### Claude

- [x] **CL-213** **bench --prof (CU-156, taken over, Claude, 10-19 19:50Z).** Cursor has been idle on it since 18:18Z and can't be prompted while Jerry is away (D-81). The same spec as CU-156: `tools/bench.mjs --prof`, the top PROF sections, the time outside them, the GPU ms where WebGPU gives it. Cursor: if you come back first, tell me with a reply and take it back.
- [>] **CL-211** **Where the night's 30 ms go, after AG-86.** Every night's last push runs 31-35 fps on Jerry's 5080 at High (the budget is 60 mean, ≥ 50 low), and CL-210/AG-84 took 32-120 draws off without moving it (`docs/budgets.md`, 2026-10-19). From CU-156's profile on his GPU: which systems take the time, the budgets reset to match, and each owner's cut on this board. GB-189 and GP-19930 carry on meanwhile (triangles still count on the GPU side); nobody starts new budget work until this lands. **10-19 21:00Z, from AG-86's --cpu run** (`docs/budgets.md`, "where the night's frame goes"): render() is 19.5 of a 30.4 ms frame: the sun's shadow pass 7.8 ms, the matrices 6.9 (walked twice), the render lists 4.0; the GPU 0.3. **Cuts 1 and 2 landed** (renderFrame): one matrix walk a frame; the night's shadow map every 4th frame. **Measured (AG-86, 21:08Z): night 20 High 32.5 to 44.8 fps, 1% low 23.2 to 32.3, hitches 8 to 0; frame 30.8 to 22.3 ms.** Left: render() 10.4, the dead 3.6 (GP-19934), the matrices 3.1 (9,768 nodes). Next cuts from the census. **Cut 3 (21:17Z):** `updateSceneMatrices` skips the tops sceneCull hid (matrices 3.1 to 2.5 ms); keeping nothing off-screen at night for the shadows bought nothing and worse lows (AG-89: 43.7 fps, low 28.4), so that half is undone (21:24Z). **Cut 4 (21:24Z):** bees and butterflies shelter at night as in rain, and the walk skips them hidden (930 of 9,900 nodes). Night 10 45.4 fps, megaswarm 60.0 (AG-88).
- [ ] **CL-212** **The full suite again, after GB-193.** In the cloud (one instance), as CL-202: every red sorted to an owner, the list on this board; then Cursor commits.

### Cursor

- [~] **CU-156** **bench --prof: where each frame's time goes. First.** `tools/bench.mjs --prof`: over the measured seconds, TT.profDbg (PROF) on; each scenario's JSON line gets `prof`: the mean ms per frame of the top 12 PROF sections, their sum, the ms outside them, and the GPU ms per frame where WebGPU can give it (timestamp queries; `unavailable` if not). And why AG-85's megaswarm (count 48) counted 65 dead and 730 draws against AG-82's 48 and 342. Antigravity runs it (AG-86). **Parked: Claude took it as CL-213 (10-19 19:50Z) while you were idle.**
- [~] **CU-154** **Your reds** (CL-202's list): t225 (the grenade hold), t228 (the support hand in a reload), t241 (the gold glow at the parish cross), t246 (the M4 aim's shoulder pose), t255 (red on the 09:25 copy; CU-147 landed after: re-run it), t222 after GB-185. Through the slot, one at a time; rule 13. **Only t222 waits on GB-185; the rest can go now, after CU-156.** **Split (Claude, 10-19): the weapon holds and aims (t222, t225, t228, t246) are Grokbot's GB-191; t241 and t255 go into CL-212's triage.**
- Standing (CU-151): at the end of each working day, commit and push everything checked out, one line in the log. **Owed now:** everything checked out since the 14:32Z commit on 10-18 (GB-182 to GB-188, GP-19925 to GP-19928, CL-210, AG-84, CU-155, today's board): do it first when you check in.

### ChatGPT

- [>] **GP-19935** **The dead's draws at night 20 (CL-211). Next.** GP-19934 took the `zombies` mark 3.61 to 2.77 ms (thank you; one run read 53.9 fps). Now the renderer: it costs about 10 µs of CPU per draw, and the night's frame has 430-620 of them. First measure: `node tools/bench.mjs --night 20 --gfx high --prof --cpu` prints the camera's draws by owner (`census.draws.byGroup`; the dead are `zombie (...)` rows). **If the dead take more than 100 draws a frame, the common kinds go to ≤ 2 draws each** (the budget changes here, lead call: docs/budgets.md follows): one body draw, one glow draw at most; merge what shares a material, eyes and glow into one emissive part where the look allows. Bosses ≤ 4. Under 100: say so and check out; nothing to cut. No visible change: Antigravity looks after. Bench before and after.
- [x] **GP-19934** **The dead's share of the night's frame (CL-211). Next.** CL-211's two cuts took night 20 at High from 32.5 to 44.8 fps (30.8 to 22.3 ms); the `zombies` mark is now 3.6 ms of it (max 9.4) for 48 dead, the biggest thing left outside render(). Through the slot: `node tools/bench.mjs --night 20 --gfx high --prof --cpu`: its JSON line's `cpu.callees` lists where `updateZombies` spends its time, and `census` counts the dead's nodes (the renderer walks each one a frame). Your motion and look modules (`game/*-motion.js`, `zombie-feet`, the appearance updaters) and anything that runs per zombie per frame: cut what can't be seen: pose work for dead behind the camera and past the shadow's reach, a lower pose rate past about 35 m; fewer nodes per zombie where parts can merge. No visible change up close (Antigravity looks after). **Target: `zombies` ≤ 2 ms at night 20.** The AI itself (updateZombies' own logic, the leap) is Grokbot's: send him what you find there. Report the bench lines before and after.
- [x] **GP-19933** **The leaper's body and its hit surface agree (Grokbot's GB-192 finding). Next.** In the real renderer a still leaper (speed 0, riseT 0) draws its head about 2.9 m above its root (head y 6.15, root y 3.24, hitH 1.10), so the cursor on its visible head or chest lands on the ground behind it: 2 of 6 headshots, 4 of 6 chest shots into the ground (`node tools/realtest.mjs t222 --all`, the leaper cases). Your pose (`game/leaper-motion.js`, GP-19856) or the leap visual against `zombieSurface`: find which, and make what the player sees the thing the round hits. Check a still leaper in the real game through the slot; then ask Grokbot to re-run t222 (GB-193). Inside its budget.
- [x] **GP-19929** **With Grokbot on GB-185**: your zombie bodies since GP-19922 and GP-19924 (the smoothing, the joins in `skinZombieMesh`) against the round's hit test (`zombieSurface`, GP-19885); and t93's feet (a feral's foot 2 cm into the ground). Then `ui/quest.browser.mjs`: the true ending is a walk to Heron now (CL-207). **Claude, 10-19:** the hit test is cleared (the suite's fakethree, CU-155). t93: the screamer's glide is authored, so she gets her own band (≤ 0.30 m up, never under -0.05 m); the pellet dip keeps its 8 cm (bend the knee); the headshot line is Grokbot's (GB-185). Re-run your 23:42Z batch: the page did not load 20:22Z-23:43Z. **Claude, 10-19 01:50Z: nothing to wait for.** The feet in t93 are yours (the whole contract is in my request: game-time sampling; 5 cm floor; 0.20 m ceiling, 0.30 m for the feral's run and the screamer's glide; pellets 8 cm). Antigravity's foot look is done. Then `--done`. **Claude, 10-19 17:50Z:** while you are in t93, paste the headshot line too (Grokbot's hook: `T.damageZombie(z, dmg, { kind: 'bullet', ...T.roundInfoDbg(z, 'head') })`), so one agent edits the file.
- [x] **GP-19930** **The dead inside their budget, after GP-19929** (`docs/budgets.md`): every common kind ≤ 6 k triangles and ≤ 4 draws (now 10.4-17.5 k), the bosses ≤ 14 k (now 16-20 k). Fewer sides on the smoothed profiles is the big one (16 to 8-10 reads the same at 10 m). Count with `DWInspect.show('zombie.<kind>').info` before and after; the joins and the hit test (GB-185) must still pass.
- [x] **GP-19932** **GP-19930's live regressions (Antigravity, AG-86 part 1).** In live mode the screamer's upper head reads pale grey and her eyes black, not glowing (`prepareScreamerAppearance` doesn't keep `u.eyeBatch` out of mergeEyes), and the spitter's chin drips read dark brown, a wound rather than ooze. Shots: `qa/2026-10-19-AG-86/shots/gp19930-screamer-front.png`, `gp19930-spitter-front.png`. Put the look back, inside the same budget; Antigravity looks again.
- [x] **GP-19931** **t80: the spider closes to 1.1-3.3 m while it rounds the house** (Grokbot's GB-190 finding; t80 wants it to stay at 4 m or more). Its back-off only fires with a clear line, so the close pass happens while it is blind round the corner. GP-19857's steering (`steerSpider`): yours. A real AI fix, not a test change.
- Later (1.x): the hood's soft ear bulge and the strap rims (Claude's request).

### Grokbot

- [>] **GB-193** **t222 on the real renderer, part 2 (Claude's calls on GB-192). Next.** Your settle (1.5 s, real only) stands. (1) The leg point: aim at a leg, not the column centre: since GP-19885 the pick is the model's surface, and between the legs is a correct miss. Take the point from the zombie's own leg (a thigh or shin's world centre near 0.2 x hitH), every kind and bearing. (2) The runner crossing: move its trace onto `zombieRoundHit` like the rest, then diagnose (the lead, or the test). (3) The leaper: ChatGPT found it (21:06Z): a speed-0 leaper still leaps (leapT .56 after the settle), so it's your leap AI in updateZombies, not her pose. An immobilized zombie (speed or baseSpeed 0) doesn't leap; then re-run. Through the slot: `node tools/realtest.mjs t222 --all`. Real aim error left after that is yours to fix; report the numbers.
- [x] **GB-189** **The guns inside their budget, after GB-188** (`docs/budgets.md`): each held gun ≤ 12 draws and ≤ 8 k triangles. Over: m240 11.4 k, flamer 10.5 k (18 draws), minigun 9.6 k (16), sniper 9.3 k (16), aa12 8.8 k, m4 8.3 k; the katana 64 draws (83 sheathed), the chainsaw 33. Merge each gun's parts by material; no visible change.
- [x] **GB-185** **Headshots in the suite, after GB-189.** Rounds land in the suite again (CU-155: fakethree raycasts; the real game was always fine, GB-185's probe). Left: since GP-19885 a headshot needs `headHit` from the round's ray (`confirmedHead`), and t93 and others pass only `hitY`, so head = belly for every kind. Put `zombieRoundHit` on TT, score each headshot check through it (t93's once GP-19929 is out of it), play one headshot in the real game (`matchStats.headshots`), then re-run the list: t63, t80, t90, t91, t107, t111, t119, t128, t155, t156, t164, t211, t222, t248. Then t224's pistol rows (Claude's reply: the check is stale). t93's headshot line after ChatGPT replies she is out of t93 (she is in it for the feet since 01:45Z).
- [x] **GB-190** **GB-185's leftovers.** t224's pistol rows (the check is stale since GP-19894's two handgun rows: accept fit.y - tp plus the row, keep the rest); one headshot in the real game through the slot (`matchStats.headshots`); and the reds GB-185 left: t63 (blade swing), t80 (ranges), t107 (pellet/blade/saw body values), t119 (the screamer's share), t211 (Watchman HUD). Game or test, rule 13; a fix in another owner's file goes to them. Leave t93 to ChatGPT.
- [x] **GB-191** **CU-154's weapon reds, taken from Cursor (Claude, 10-19).** t222 (the aim, after GB-185), t225 (the grenade hold), t228 (the support hand in a reload), t246 (the M4 aim's shoulder pose). Your grips and hand anchors; one at a time through the slot; the game or the test, rule 13. Then CL-212 runs the full suite.
- [x] **GB-192** **t222 on the real renderer (Claude's call on your question).** Through the slot: `node tools/realtest.mjs t222` (the suite's own check, real three, the game's index.html). Green there: the suite page can't measure aim (no arm IK in fake three), so t222's accuracy lines become `realOk` (SKIP on the test page, the reason in the line, as t224 does) and realtest is their check. Red there too: real aim error, yours to fix. Report the numbers either way.
- [ ] **GB-194** **The dead's AI at night 20, after GB-193 (with ChatGPT's GP-19934).** After CL-211 the `zombies` mark is 3.6 ms of night 20's 22.3 ms; `updateZombies` is 2.3 of it (self 0.84; resolveStaticProps 0.18, updateFlowFields 0.13, entityGroundY 0.07; ChatGPT's request has the profile). A cheaper tick for the dead that are far or off-camera and not in a fight (every 2nd or 3rd frame with dt summed, or batched world queries), the near and attacking dead every frame as now. No change in how a fight plays: t-tests that cover the director and the dead green. Together with GP-19934, **the mark ≤ 2 ms**. Bench before and after: `node tools/bench.mjs --night 20 --gfx high --prof --cpu`.
- [~] **GB-156** **The mortar and Watchman crew.** t244's four "no jump" limits, by a hair. After GB-184.

### Antigravity

- [x] **AG-86** **Now: the two GPU looks ChatGPT asked for, then the profile.** (1) Now, through the slot: GP-19929's feet (brute, drowned, spitter, military, colossus walking, side views) and GP-19930's budget models (military, bomber, screamer, demon, spitter: anything that reads as a mistake), and one `bench.mjs --night 20 --gfx high` as it is today (the dead are inside their budget now: did the night move from 33 fps?). Reply to ChatGPT with what you saw. (2) **Ready now (CL-213 landed 10-19 20:25Z, add `--prof`):** `bench.mjs --prof` for `--night 10` and `--night 20` at `--gfx high`, and the megaswarm; then night 20 at high once more with `?rigskin=0`. The JSON lines in the report and two lines: which sections take the most, and how much is the GPU. Also correct AG-85's report: its megaswarm rows are AG-82's numbers (its own lines: 23.7 and 25.5 fps, 65 dead). Check every number against its raw line before "Not verified: none". Part 1 done 20:17Z: night 20 High 32.4 fps after GP-19930, so not triangles either. **Part 2 (20:40Z):** r:render 20.6-22.1 ms of a 28.7-34.1 ms frame, GPU 0.2-0.3 ms; r:rigSkin 0.10 ms. **Last:** one `--night 20 --gfx high --prof --cpu` (tools/bench.mjs has `--cpu` again, 20:56Z), its `cpu` block in the report.
- [x] **AG-87** **GP-19932's live recheck (ChatGPT's request), after AG-86.** Live mode on Jerry's GPU: does the screamer read with a dark upper head and pink glowing eyes, and the spitter's chin drips as glowing yellow-green ooze? Against your `qa/2026-10-19-AG-86/shots/gp19930-*-front.png` and ChatGPT's `review/zombie-look-GP19932/after/`. Reply to ChatGPT.
- [x] **AG-88** **CL-211's two cuts on Jerry's GPU, after AG-87.** (Your 21:01Z night 20 `--cpu` run under AG-86 counts as its first line; run it again for the census if it printed none.) Through the slot, one at a time: `node tools/bench.mjs --night 20 --gfx high --prof --cpu` (now also prints the scene census), then `--night 10 --gfx high --prof` and the megaswarm `--count 48 --prof`. Append each JSON line to `qa/2026-10-19-AG-86/prof-lines.jsonl` (keep the old lines), and in the report: the frame before and after for each (AG-86's 30.4/28.7/16.95 ms), r:matrices and r:render, and the census's top groups. Look at night 20 for a minute too: anything wrong with the shadows (stale or jumping) or anything that stopped moving? Shots if so.
- [x] **AG-89** **CL-211's cut 3, after AG-88.** Landed 21:17Z in index.html (sceneCull, renderFrame): at night (the sun under 0.12) nothing off-screen is kept visible for the sun's shadows, and the matrix walk skips what sceneCull hid. Through the slot: `node tools/bench.mjs --night 20 --gfx high --prof --cpu` (tools/bench.mjs now 21,679 bytes: the census names the unnamed groups and counts culled nodes; the cpu block has `callers` and `callees`). Append the line to `qa/2026-10-19-AG-86/prof-lines.jsonl`; in the report: fps, low, frame, r:matrices, r:render against your 21:08Z line (44.8 fps, 22.3 ms), and the census top 15. Then a night look: night 20, turn the camera a full circle slowly and quickly, walk backwards past houses and props: anything that pops in late, flickers, or shows in the wrong place? Shots if so.
- [>] **AG-90** **Who the scene's unnamed things are (CL-211's census). Next.** At night 20 the renderer walks 9,900 nodes a frame; AG-89's census can't name 493 top-level groups (2,398 nodes, 1,422 meshes) and 1,166 loose meshes. In the live game through the slot (night 20, the last push; `TT.scene.children`), sort them into kinds: by material and geometry (names, colours, vertex counts), position (on the map: which house, the camp, the road), userData, and what's in index.html that makes them (search the material or geometry names). For each kind: how many, nodes and meshes, whether it ever moves, and whether it could be one merged mesh or an InstancedMesh (props, your look: say how; the world's: Claude's). A table in the report, biggest first, and the kinds you'd merge yourself as your next task. Nothing changed in the game for this one.
- [ ] **AG-91** **GP-19934's live look (ChatGPT's request), after AG-90.** At night 20 on Jerry's GPU: close dead walking and attacking, then turn the camera to the dead behind the player: any pose that pops, a frozen flame or foot, a stale feral echo? And the bees and butterflies: gone at night, back at dawn (`night` then wait for dawn, or the dev time skip). Shots of anything wrong; reply to ChatGPT.
- [~] **AG-76** **Eyes on the inspector (CL-196).** 1.x.

## Waiting on Jerry

- **Night packs** can start whenever Jerry wants: stages 2 and 3 are in (the story's words and scenes, Heron's condition, the silenced night, the night names, the first-run card, the Tips). Five 20-30 minute sessions, nights picked with the `~` console (`docs/road-to-1.0.md`). The frame rate is still 30-35 fps at night (CL-211), which does not stop a pack.

## The 1.x list (after 1.0)

Ideas and polish that are not 1.0. Claude adds them here when you send them (`--fyi`, title starting "1.x:").
- The ears under the balaclava (CL-200), the strap rims; the lighter in the campfire kneel (CL-201); the orphans (world/boat.js, the house game-over code); "Warm." on a Pit stone after the true ending.
- Story v3 waves 2-4: the tally, 02:14, the valley getting worse, Heron's contrail, crate slips, Report, the knocks, Brandt's notebook, the Cordon fence, the rangers' radio, the hikers' camera, the photo of the twelve.
- Key rebinding; master, ambience and voice volume.
- The inspector's eyes pass (AG-76); the mortar crew's limits if GB-156 doesn't land first.
- Lower-detail zombie meshes (if CL-203's budgets don't need them for 1.0).

## Decisions

One line each; the full text is in `docs/decisions.md`. D-0 to D-69: `crew/archive/board-2026-10-15.md`.

- **D-81** · Jerry is out of the approval loop for now: Claude decides what would wait for his yes, except his files, money, publishing and his own orders (Jerry, 2026-10-19)
- **D-80** · Models and animations are looked at in the inspector, the game itself (`index.html?inspect`), never a copy (Jerry, 2026-10-14)
- **D-79** · The game is Grave Shift in everything read; file names, the repo, save keys and ids keep Dead-Wave (Jerry, 2026-10-09)
- **D-77** · The dead: up to 90% of his sprint, sprinters outrun him; 70% close in, 30% flank (Jerry, 2026-10-06)
- **D-75** · The marine stays left-handed (Jerry, 2026-10-05)
- **D-74** · Nothing the player reads names a real brand or product (Jerry, 2026-10-02)
- **D-73** · Keys: 1 to 4 and X. **D-72** · Full auto by default (Jerry, 2026-10-02)
- **D-71** · Build the pieces; Jerry plays them; no timed or long runs (Jerry, 2026-10-01)
- **D-70** · The story, v2 (`docs/story.md`): the valley, the PGB, FOB Threshold, Heron on night 20 (Jerry, 2026-10-01)

**Where the game is:** R1 to R5 of the roadmap are done; R6 (finish, 1.0) is Jerry's direct work, agent by agent; R7 is
co-op for up to 4 after 1.0 (D-58). Every task in full: `docs/roadmap.md`.

## Where things live

| What | Where |
| --- | --- |
| Your briefing / everyone at a glance | `node crew/crew.mjs me <you>` / `node crew/crew.mjs` |
| Rules and the session steps | `AGENTS.md` |
| Your card (only you write it; keep its notes short) | `crew/status/<you>.md` |
| What happened, in order (append only) | `crew/LOG.md`; older in `crew/archive/log-YYYY-MM.md` |
| Asking another owner; answering | `crew.mjs request` / `crew.mjs requests <you>` and `reply`; the file is `handoffs/requests.md`, older in `handoffs/archive/` |
| Questions only Jerry can answer | `crew.mjs ask` → `crew/QUESTIONS.md` |
| Reports | `handoffs/YYYY-MM-DD-<agent>-<task>.md` (Changed, Tests, Not verified) |
| Looking at a model or animation | the inspector, through the slot (`studio/inspector/README.md`) |
| Finished tasks, old boards | `crew/archive/` |
