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

- **Claude** · CL-213 (bench --prof, CU-156 taken over) · waiting: antigravity (AG-86), claude (CL-211)

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

- [>] **CL-213** **bench --prof (CU-156, taken over, Claude, 10-19 19:50Z).** Cursor has been idle on it since 18:18Z and can't be prompted while Jerry is away (D-81). The same spec as CU-156: `tools/bench.mjs --prof`, the top PROF sections, the time outside them, the GPU ms where WebGPU gives it. Cursor: if you come back first, tell me with a reply and take it back.
- [ ] **CL-211** **Where the night's 30 ms go, after AG-86.** Every night's last push runs 31-35 fps on Jerry's 5080 at High (the budget is 60 mean, ≥ 50 low), and CL-210/AG-84 took 32-120 draws off without moving it (`docs/budgets.md`, 2026-10-19). From CU-156's profile on his GPU: which systems take the time, the budgets reset to match, and each owner's cut on this board. GB-189 and GP-19930 carry on meanwhile (triangles still count on the GPU side); nobody starts new budget work until this lands.
- [ ] **CL-212** **The full suite again, after GB-191.** In the cloud (one instance), as CL-202: every red sorted to an owner, the list on this board; then Cursor commits.

### Cursor

- [~] **CU-156** **bench --prof: where each frame's time goes. First.** `tools/bench.mjs --prof`: over the measured seconds, TT.profDbg (PROF) on; each scenario's JSON line gets `prof`: the mean ms per frame of the top 12 PROF sections, their sum, the ms outside them, and the GPU ms per frame where WebGPU can give it (timestamp queries; `unavailable` if not). And why AG-85's megaswarm (count 48) counted 65 dead and 730 draws against AG-82's 48 and 342. Antigravity runs it (AG-86). **Parked: Claude took it as CL-213 (10-19 19:50Z) while you were idle.**
- [~] **CU-154** **Your reds** (CL-202's list): t225 (the grenade hold), t228 (the support hand in a reload), t241 (the gold glow at the parish cross), t246 (the M4 aim's shoulder pose), t255 (red on the 09:25 copy; CU-147 landed after: re-run it), t222 after GB-185. Through the slot, one at a time; rule 13. **Only t222 waits on GB-185; the rest can go now, after CU-156.** **Split (Claude, 10-19): the weapon holds and aims (t222, t225, t228, t246) are Grokbot's GB-191; t241 and t255 go into CL-212's triage.**
- Standing (CU-151): at the end of each working day, commit and push everything checked out, one line in the log. **Owed now:** everything checked out since the 14:32Z commit on 10-18 (GB-182 to GB-188, GP-19925 to GP-19928, CL-210, AG-84, CU-155, today's board): do it first when you check in.

### ChatGPT

- [x] **GP-19929** **With Grokbot on GB-185**: your zombie bodies since GP-19922 and GP-19924 (the smoothing, the joins in `skinZombieMesh`) against the round's hit test (`zombieSurface`, GP-19885); and t93's feet (a feral's foot 2 cm into the ground). Then `ui/quest.browser.mjs`: the true ending is a walk to Heron now (CL-207). **Claude, 10-19:** the hit test is cleared (the suite's fakethree, CU-155). t93: the screamer's glide is authored, so she gets her own band (≤ 0.30 m up, never under -0.05 m); the pellet dip keeps its 8 cm (bend the knee); the headshot line is Grokbot's (GB-185). Re-run your 23:42Z batch: the page did not load 20:22Z-23:43Z. **Claude, 10-19 01:50Z: nothing to wait for.** The feet in t93 are yours (the whole contract is in my request: game-time sampling; 5 cm floor; 0.20 m ceiling, 0.30 m for the feral's run and the screamer's glide; pellets 8 cm). Antigravity's foot look is done. Then `--done`. **Claude, 10-19 17:50Z:** while you are in t93, paste the headshot line too (Grokbot's hook: `T.damageZombie(z, dmg, { kind: 'bullet', ...T.roundInfoDbg(z, 'head') })`), so one agent edits the file.
- [x] **GP-19930** **The dead inside their budget, after GP-19929** (`docs/budgets.md`): every common kind ≤ 6 k triangles and ≤ 4 draws (now 10.4-17.5 k), the bosses ≤ 14 k (now 16-20 k). Fewer sides on the smoothed profiles is the big one (16 to 8-10 reads the same at 10 m). Count with `DWInspect.show('zombie.<kind>').info` before and after; the joins and the hit test (GB-185) must still pass.
- [ ] **GP-19931** **t80: the spider closes to 1.1-3.3 m while it rounds the house** (Grokbot's GB-190 finding; t80 wants it to stay at 4 m or more). Its back-off only fires with a clear line, so the close pass happens while it is blind round the corner. GP-19857's steering (`steerSpider`): yours. A real AI fix, not a test change.
- Later (1.x): the hood's soft ear bulge and the strap rims (Claude's request).

### Grokbot

- [x] **GB-189** **The guns inside their budget, after GB-188** (`docs/budgets.md`): each held gun ≤ 12 draws and ≤ 8 k triangles. Over: m240 11.4 k, flamer 10.5 k (18 draws), minigun 9.6 k (16), sniper 9.3 k (16), aa12 8.8 k, m4 8.3 k; the katana 64 draws (83 sheathed), the chainsaw 33. Merge each gun's parts by material; no visible change.
- [x] **GB-185** **Headshots in the suite, after GB-189.** Rounds land in the suite again (CU-155: fakethree raycasts; the real game was always fine, GB-185's probe). Left: since GP-19885 a headshot needs `headHit` from the round's ray (`confirmedHead`), and t93 and others pass only `hitY`, so head = belly for every kind. Put `zombieRoundHit` on TT, score each headshot check through it (t93's once GP-19929 is out of it), play one headshot in the real game (`matchStats.headshots`), then re-run the list: t63, t80, t90, t91, t107, t111, t119, t128, t155, t156, t164, t211, t222, t248. Then t224's pistol rows (Claude's reply: the check is stale). t93's headshot line after ChatGPT replies she is out of t93 (she is in it for the feet since 01:45Z).
- [x] **GB-190** **GB-185's leftovers.** t224's pistol rows (the check is stale since GP-19894's two handgun rows: accept fit.y - tp plus the row, keep the rest); one headshot in the real game through the slot (`matchStats.headshots`); and the reds GB-185 left: t63 (blade swing), t80 (ranges), t107 (pellet/blade/saw body values), t119 (the screamer's share), t211 (Watchman HUD). Game or test, rule 13; a fix in another owner's file goes to them. Leave t93 to ChatGPT.
- [ ] **GB-191** **CU-154's weapon reds, taken from Cursor (Claude, 10-19).** t222 (the aim, after GB-185), t225 (the grenade hold), t228 (the support hand in a reload), t246 (the M4 aim's shoulder pose). Your grips and hand anchors; one at a time through the slot; the game or the test, rule 13. Then CL-212 runs the full suite.
- [~] **GB-156** **The mortar and Watchman crew.** t244's four "no jump" limits, by a hair. After GB-184.

### Antigravity

- [ ] **AG-86** **Now: the two GPU looks ChatGPT asked for, then the profile.** (1) Now, through the slot: GP-19929's feet (brute, drowned, spitter, military, colossus walking, side views) and GP-19930's budget models (military, bomber, screamer, demon, spitter: anything that reads as a mistake), and one `bench.mjs --night 20 --gfx high` as it is today (the dead are inside their budget now: did the night move from 33 fps?). Reply to ChatGPT with what you saw. (2) When CL-213's `--prof` lands: `bench.mjs --prof` for `--night 10` and `--night 20` at `--gfx high`, and the megaswarm; then night 20 at high once more with `?rigskin=0`. The JSON lines in the report and two lines: which sections take the most, and how much is the GPU. Also correct AG-85's report: its megaswarm rows are AG-82's numbers (its own lines: 23.7 and 25.5 fps, 65 dead). Check every number against its raw line before "Not verified: none".
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
