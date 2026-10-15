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

(Nothing right now.)


## Orders from Jerry

Newest first, the ones still in force. Older ones: `crew/archive/board-2026-10-15.md` and the archives it names.

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

1. **Steady the ground** (now): the suite, every red owned, everything committed; frame budgets.
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

- [>] **CL-202** **Health check, part 1: the suite, the reds, the commit.** The full suite on an exact copy of Jerry's files in Claude's cloud (one instance, `--jobs 1`), every red sorted by cause and owner (tasks below), then everything checked out committed and pushed. Replaces CU-110.
- [ ] **CL-203** **Health check, part 2: frame budgets.** Draw calls and triangles per subject and on a busy night (cloud counts), frame time on Jerry's GPU (AG-82); a budget per owner in `docs/budgets.md`; a task for each owner over budget.
- [ ] **CL-204** **The orders card at the drop, after GP-19925.** In the insertion, the card in his hand for about 4 s (story.md §3; skippable), then pinned on the HQ board: the goal (hold 20 nights, Heron comes for him) on day 1.
- [ ] **CL-205** **The survivors bury him, after GP-19925.** The death cine (story.md §5): rescued survivors hold the shovels (none rescued: nobody, the earth settles), recovered tags go in the grave; the two MARPAT marines go.
- [ ] **CL-206** **The wall of tags, after GP-19925.** Nine nails on the HQ wall; each recovered tag hangs there the next dawn; the end card says "Brought home: n of 9".
- [ ] **CL-207** **The true ending, after GP-19925.** The guardian in the heart dies, then he walks to the dock as the card says (now it ends at once); "Warm." on a Pit stone afterwards (story.md §12).
- [ ] **CL-208** **Orphans out.** world/boat.js (Heron replaced it) and its imports; the house game-over code (house.active is always false).

### Cursor

- [x] **CU-153** Fix verified defects from Antigravity model audits
- [x] **CU-152** Review and improve Antigravity model upgrade batches
- [x] **CU-147** **The smoking pose (Jerry, in chat)**: the cigarette the right way round, the glove off the face. Finish it, then the tasks below in order.
- [ ] **CU-148** **Bench numbers for budgets.** `tools/bench.mjs`: add draw calls and triangles (`renderer.info`, as scene-counts.mjs reads them) to every scenario, and a `--night N` scenario that jumps to night N's last push with the horde out (`devJumpToNight`, then start it). Prints one JSON line per scenario. Antigravity runs it on Jerry's GPU (AG-82).
- [ ] **CU-149** **The desktop build boots.** `tools/package.mjs`: add `combat/`; keep the `.wav`s the game loads (core/audio.js, ui/range-start-audio.js); copy `z-sounds/`; `npm run build` must run the boot check, not `--no-check`. desktop/src-tauri: a reload (F5) must not refill localStorage from the launch snapshot over newer values. One product name in what the player sees (Grave Shift); file names may stay Dead-Wave (D-79).
- [ ] **CU-150** **Don't lose a run by accident.** A confirm before Quit to menu ends a run; on closing or reloading the tab mid-run, the browser's leave-page prompt, and the run recorded either way. A "Reset profile" button in Settings with a confirm (D-31).
- [ ] **CU-151** **End-of-day commit (standing).** At the end of each working day, after Claude's suite (or the day's targeted checks), commit and push everything checked out; a one-line summary in the log. Claude does it when you're not on.
- [~] **CU-110** **The full suite, then commit and push.** Claude does it in CL-202 (in the cloud, so the slot on Jerry's PC stays free).

### ChatGPT

- [ ] **GP-19924** **Zombie joints (Jerry, in chat).** Check it out with `--done`: the full suite it waited for is Claude's CL-202 (in the cloud); nothing more to run.
- [ ] **GP-19922** **All zombies smoothed.** The same: check out with `--done`.
- [ ] **GP-19923** **The demon's fire.** The same.
- [ ] **GP-19925** **Story v3 words, one pass** (story.md is the text; Claude's 2026-10-07 cards say where): Ridgeline lines 8, 12 and 15 as story.md §4, and the Hush-origin line; the orders card's lines (`story.orders.*`, for CL-204); the three road notes, each its own text and signature (`story.prop.convoy`, `utilityTruck`, `fuel`); the guardian "driven back", never "defeated" (`reward.guardianFirstBlood`, `scouting.trick.guardian`, the "GUARDIAN DOWN" banner); `world.cabin`/`map.cabin`/`build.obstacle.cabin` say FOB Threshold or HQ; the objective titles from v1 (`medicalConvoy`, `hikersCache`) reworded; the `story.survivor.reyes/voss/kettle` keys renamed `pike/brandt/okafor` with every reader. Fix the tests that hold the old words (ui/briefing.browser.mjs "Call the boat", ui/survivors.browser.mjs fixtures).
- [ ] **GP-19926** **One name for the night.** "Night N" everywhere the player reads it: the night banner ("DAY N — HORDE INBOUND", "DAY N CLEARED"), Ember Night's banner, the briefing, the prep box, the wave strings; and the night's own name from tools/nights.py on the scouting card ("Night 6 · Chalk"), with Swarm Night warned like Fog and the siege. One table in JS that both read.
- [ ] **GP-19927** **What a new player reads.** The pause Tips lose the "Testing" section (dev cheats); the kiosk's hard-coded English (index.html 24700s: 'Bigger gas tank', ' pair', ' suppressor', 'Repair armor', 'Nothing to upgrade yet') and the "Training Ground" button and win-screen defaults go to strings; "gear kiosk" vs "supply terminal" and "Supply locker" vs "vault": one name each; `objectives.holdRepair`'s stale "Hold E for 6 seconds". The upgrades tab's `let any = true` (it can never say "Nothing to upgrade yet").
- [ ] **GP-19928** **The first run.** The first time Play is pressed on a profile with no runs, one card offers the Training Ground first ("New here? Ten minutes on the range"), Play anyway or Training; never again after. And read every `// <task id>` string block other agents added (see above) once, for voice.
- Later (1.x): the hood's soft ear bulge and the strap rims (Claude's request).

### Grokbot

- [>] **GB-180** **The weapon redo (Jerry, in chat).** Finish this pass and check out; the guns are frozen for 1.0 after it (bugs only).
- [ ] **GB-181** **t221 and t252**: new reds after GB-177 (a casing thrown to the gun's right). Fix the game or the test, rule 13.
- [ ] **GB-182** **Heron needs the relay: say so.** Today night 20 quietly doesn't end the run if the relay was never repaired. From the morning of night 15, while the relay is down: the scouting card and a radio-less line on the HQ board say Heron can't find him without it, and the relay cabinet is marked on the map. On the prep before night 20 with the relay down, the prompt says why Heron isn't on offer.
- [ ] **GB-183** **The silenced night.** docs/specs/secret-quest.md §70: the night after a silenced day has half-size pushes, no guardian and no Ember Night. The director (`startPrep`) doesn't check it today.
- [ ] **GB-184** **The director's leftovers.** `pickZombieType` (relay-called spawns) can never pick a spitter or screamer: use the night plan's kinds; remove the unused `trimGuardianFodder`, `swellWithFodder`/`HORDE_MULT` and their stale comments; docs/specs/difficulty.md row 13 (`ground:40`).
- [~] **GB-156** **The mortar and Watchman crew.** t244's four "no jump" limits, by a hair. After GB-184.

### Antigravity

- [ ] **AG-79** **Buildables, part 1.** Changes ready: queue its game checks (`slot run`) and check out. Buildable visuals are frozen for 1.0 after AG-80 (bugs only).
- [ ] **AG-80** **Buildables, part 2.** The same; include Cursor's two findings (the mine's buried LED, the missing tier variants in the camera job).
- [ ] **AG-81** **Eyes on CL-198 (the marine's fabric)** in the inspector, in the same slot batch: crouch, run, reload, aim, grenade and dive in issue, hot-weather and full kit; the four hats.
- [ ] **AG-82** **Frame time on Jerry's GPU, after CU-148.** Through the slot: `bench.mjs --night N` for nights 5, 10, 14, 18 and 20, and the megaswarm (48), at Jerry's graphics preset and at High; the JSON lines and a two-line summary in the report. Claude sets the budgets from them (CL-203).
- [ ] **AG-83** **The installer on a clean profile, after CU-149.** Build it, install it as a fresh Windows user (no Node, no repo), start a run, play the first night, quit, reopen: settings and the best run are kept; note anything that fails or looks wrong.
- [~] **AG-76** **Eyes on the inspector (CL-196).** 1.x.

## Waiting on Jerry

- **Night packs** come after stage 2 (the board will say when): five 20-30 minute sessions, nights picked with the `~` console (`docs/road-to-1.0.md`).

## The 1.x list (after 1.0)

Ideas and polish that are not 1.0. Claude adds them here when you send them (`--fyi`, title starting "1.x:").
- The ears under the balaclava (CL-200), the strap rims; the lighter in the campfire kneel (CL-201).
- Story v3 waves 2-4: the tally, 02:14, the valley getting worse, Heron's contrail, crate slips, Report, the knocks, Brandt's notebook, the Cordon fence, the rangers' radio, the hikers' camera, the photo of the twelve.
- Key rebinding; master, ambience and voice volume.
- The inspector's eyes pass (AG-76); the mortar crew's limits if GB-156 doesn't land first.
- Lower-detail zombie meshes (if CL-203's budgets don't need them for 1.0).

## Decisions

One line each; the full text is in `docs/decisions.md`. D-0 to D-69: `crew/archive/board-2026-10-15.md`.

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
