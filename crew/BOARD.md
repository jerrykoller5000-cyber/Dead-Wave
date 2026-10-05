# Dead-Wave crew board

Lead: Claude. Last updated 2026-10-05 22:40Z by Claude (the board cleared and reorganized for Jerry; back to work).

This is the one place to look before you work. `AGENTS.md` has the rules and the check-in steps; this board has what
to work on and what has been decided. **Claude (lead) and Jerry edit this file.** The one exception: each agent ticks
the box of its *own* tasks, which `crew.mjs in` (▶) and `crew.mjs out --done` (✓) do for you. Everyone else reports
through their check-in card, `crew.mjs note`, their handoff note, and `handoffs/requests.md`.

Live view for Jerry: double-click `crew/Open Crew Panel.bat`. In a terminal: `node crew/crew.mjs`.

**Told to "check in with the crew work board and complete your tasks"?** This is the board.
1. Read `AGENTS.md` if you haven't this session. Its "Every session" steps say how to check in, post notes and check out.
2. Find your row in **Start here** below. Or run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`,
   `grokbot`, `antigravity`).
3. Work your queue's **Now** list top to bottom, one check-in and one handoff per task. Don't stop to ask Jerry whether
   to continue. A task that says "after XX-n" waits for it; a task that has left the board is done.

## Start here

Each agent's queue (below, under Queues) is in three parts: **Now** (start it), **Waiting** (it says on what) and
**Later** (R6, the road to 1.0). Take them in this order:

| Agent | Now, in this order | Waiting | Later (R6) |
| --- | --- | --- | --- |
| Cursor | CU-84 (the tests boot), CU-85 (commit what's waiting), CU-86 (the Hollows' snapshot for GP-84), CU-72, CU-87 (the M240's stray arc) | — | CU-55, CU-56, CU-57 |
| Claude | CL-120 (the crouch), CL-84 (the reload), CL-122 (the hands), CL-123 (a first-use hitch) | CL-121 (Jerry's answer, Q-6) | CL-86 |
| ChatGPT | GP-72 (one voice) | GP-84 (after CU-86) | — |
| Grokbot | GB-131 (t80 on game time) | GB-94 (Jerry's balance notes) | — |
| Antigravity | AG-50 (eyes on 10-01/02's work) | — | AG-28 (after CU-57) |

Not sure a task is yours (the table under "Who does what")? Say so with `crew.mjs request`; don't start it.

## Who runs on what (current)

Jerry moves agents between models; this table is from 2026-09-29. Each check-in's `--model` is the truth, and Jerry
tells Claude when the table should change.
Each agent's card (`crew/status/<you>.md`, `model:`) and its next check-in `--model` should match it.
Older notes and decisions below that name other models are history.

| Agent | Model now | Where it runs |
| --- | --- | --- |
| Claude (lead) | Claude Opus 5.5 (High) | Cowork, writing through the desktop bridge |
| Cursor | Grok 4.7 (High) | Cursor IDE on Jerry's PC |
| ChatGPT | GPT-6 Sol (High) | ChatGPT / Codex app on Jerry's PC |
| Grokbot | Grokbot | Grok Bot app on Jerry's PC |
| Antigravity | Gemini 3.1 Pro (High) | Antigravity editor with a browser, on Jerry's GPU |
| OpenCode | left the crew 2026-09-23 | — |

## Who does what (playing to strengths)

The roadmap gives each agent the work its model is best at (D-43). If a task looks like it belongs to
someone else, say so with `crew.mjs request`; don't start it.

| Agent | Give it | Keep it away from |
| --- | --- | --- |
| Claude (lead) | Cross-cutting design: the world, the studio and the reactions (D-42), the music, the story (D-44), specs, contracts, reviews and decisions. | Long mechanical sweeps (hand them to Cursor). |
| Cursor | Tools (no timed or long runs: D-71), integration plumbing (events, drops), player physics, the suite, commits, the 1.0 package. | Design calls and player-facing copy. |
| ChatGPT | Pure modules with unit tests (`ui/*.js`, `game/*.js`: the board's cards, records, badges, the quest UI), every word the player reads, the economy's numbers. | Browser tests (his runner can't: whoever commits runs them) and big edits in `index.html`'s combat. |
| Grokbot | Combat inside `index.html`: zombies, the director, weapons, builds, scripted deaths, the boat's flow; headless sims; tuning the reaction presets from Jerry's notes. | UI copy and world geometry. |
| Antigravity | Eyes on Jerry's GPU when asked: shots and videos of a change (Jerry plays the runs himself: D-71). | Game code (none: D-9). |

## Mission

**Back to the board (Jerry, 2026-10-05): close R5, then R6.**
The board is cleared and each queue starts with what can be done now. D-71 still holds: build the pieces and put them in
place; no timed runs or long sims; each piece gets its own quick test, and Jerry plays and makes the connections. The
story is `docs/story.md` (D-70). Tick your box with `crew.mjs`; never save this board or the LOG from a copy.
- **Cursor** · CU-84 · handoffs/cursor-CU-84.md
- **Cursor** · CU-85 · handoffs/cursor-CU-85.md
- **Cursor** · CU-86 · handoffs/cursor-CU-86.md
- **Claude** · CL-119 · handoffs/claude-CL-119.md
- **Claude** · CL-120 · handoffs/claude-CL-120.md
- **ChatGPT** · GP-72 · handoffs/chatgpt-GP-72.md
- **Grokbot** · GB-131 · handoffs/grokbot-GB-131.md
- **Antigravity** · AG-50 · handoffs/antigravity-AG-50.md
Then: CU-72 and GP-84 close R5; then the rest of R6 (CU-55, CU-56, CU-57, AG-28, CL-86).

## Waiting on

The panel's "Right now" box draws this. Claude keeps it current: one line for each thing that
others can't go on without, as `- **<who>** · <task> · waiting: <agents>`. A line whose task
ids are all finished drops off the panel by itself. The panel also works out waits it can see:
a card blocked on another agent, and a next task that says "after the split" or "after XX-n".

## The roadmap (D-43)

Seven stages. Each ends when Jerry has played it; a task can start as soon as its own "after" is met, so the lanes
keep moving. The Crew Panel's **Roadmap** box shows each stage's progress live. Every task in full:
`docs/roadmap.md` (the P-ids). The Tasks column lists every task of the stage, finished ones included (the panel
counts a listed id that has left the board as done).

| Stage | Status | Goal | Jerry plays | Tasks |
| --- | --- | --- | --- | --- |
| **R1 · Trust the loop, and feel it** | ✓ Done | Skulls reach the bag; building says what it does; the dead react when hit; the marine gets knocked around. | A fresh run to night 5; notes in the motion lab. | GB-60, GB-61, GB-62, GB-63, GB-64, GB-65, GB-66, GB-67, GB-68, GB-69, GB-70, GP-45, GP-46, GP-47, CL-66, CL-67, CL-68, CU-47, CU-48, CU-49, CU-50, AG-20, AG-21 |
| **R2 · The night has a shape** | ✓ Done | One breather and a surge you can hear; plates, screamers, bomber chains; streaks heal; the best run saved; the first catch escapable. | Night 5 fresh, then 10 and 13 from the debug start. | GB-59, GB-71, GB-72, GB-73, GB-74, GB-75, GB-76, GB-77, GB-78, GB-96, CU-77, CL-102, GB-99, GB-100, GP-48, GP-49, GP-50, GP-51, GP-52, GP-53, CL-62, CL-69, CL-70, CL-71, CL-87, CU-51, CU-59, CU-63, AG-22, GB-103, CL-91, CU-75, GP-85, CU-78, AG-30, GP-86, CL-104, CL-105, GB-112 |
| **R3 · The day feeds the night** | ✓ Done | The relay, then one call a day; caches, drums, the vault; guns by act at fixed prices, one mod each. | Days 1-10 fresh. | GP-88, GB-81, GB-82, GB-83, GB-84, GP-54, GP-55, GP-56, GP-57, GP-58, GP-59, GP-60, GP-61, GP-62, CL-72, CU-52, AG-23, CL-88, GP-87, GB-101, GP-76, GP-77, GB-102, CL-89, CU-64, CU-65, GP-89, CU-67, GP-78, GP-79, GP-80, CL-90, GB-104, CL-94, CL-95, CU-68, CU-69, GB-111, CL-103 |
| **R4 · The way out** | Jerry plays | The extraction at night 20 (Heron, story v2); the victory screen and badges; the relay tells the story. | A run to the boat, and a win. | GB-85, GB-86, GP-63, GP-64, GP-65, GP-66, CL-73, CL-74, CU-53, AG-24, CL-96, CU-70, CL-97, GP-82, GP-90 |
| **R5 · Named nights and bigger systems** | ▶ Closing: CU-86, CU-72, GP-84 left | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret, the Hollows under the caves by day (D-67). | Nights 12-20 from the debug start; the secret; a delve in each warren. | GB-87, GB-88, GB-89, GB-90, GB-91, GB-92, GB-93, GP-67, GP-68, GP-69, GP-70, CL-75, CL-76, CL-77, CL-78, CL-79, CL-80, CL-81, CU-54, AG-25, AG-26, CL-92, CL-93, GP-81, GB-105, CL-98, GB-106, CU-71, CL-99, GB-107, GB-108, GP-83, GP-84, CL-100, CU-72, CL-101, CU-73, AG-29, GP-91, CL-106, CL-107, CL-108, CL-109, CL-110, CU-79, GB-116, GB-117, GP-94, GP-95, CL-111, GB-119, CU-80, CU-86 |
| **R6 · Finish (1.0)** | ▶ Started | Balance from medians, the first hour teaching itself, sound and readability, green tests, the budgets, the package. | Three full runs; the release. | GB-94, GB-95, GP-71, GP-72, GP-73, CL-82, CL-83, CL-84, CL-85, CL-86, CU-55, CU-56, CU-57, AG-27, AG-28, CU-84, CU-85, GB-131, AG-50, CL-119, CL-120, CL-121, CL-122, CL-123, CU-87 |
| **R7 · Co-op, up to 4 players** | After 1.0 | Up to 4 players, one hosting, through the desktop app (D-58). | A night with friends. | Written when R6 closes. |

**The story (D-70, story v2).** `docs/story.md` is the bible: a valley in the forest ringed by mountains, with a lake and
rivers, not an island; the PGB (the Gravewalkers), FOB Threshold, Ridgeline on the relay, Heron the floatplane on night 20,
the Marrow, three survivors on the roof. Read it before any task that touches words, props, survivors, the extraction or
the Hollows. D-44's outline (the relay, one call a day, the three acts, the secret) still holds where story.md doesn't
change it.

## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat. Older ones: `crew/archive/board-queues-2026-10-05.md`
(2026-09-25 to 09-30) and `crew/archive/board-queues-2026-09-26.md` (before that).

- **2026-10-05 · Back to the board.** "We are going to get back to crew board work. Can you please clear finish tasks
  and reorganize so that the agents can get their tasks easily." Done by Claude: 37 finished tasks off the board, and
  the 64 tasks Jerry gave agents directly on 10-01/02 written down, in `crew/archive/board-queues-2026-10-05.md`; GP-81
  and GP-95 closed (built; their checks are AG-50 and CU-85); a **Start here** table; each queue in Now, Waiting and
  Later; new tasks CU-84 to CU-86, GB-131, AG-50, CL-119 to CL-121; the older orders and D-0 to D-39 moved to the
  archive (every decision stays in full in `docs/decisions.md`); the 37 older review flags (from before the 10-01 board clear) closed; Q-6 for
  Jerry (the marine's handedness).

- **2026-10-02 · Board work halted; commit first.** Jerry stopped the board to work through fundamental issues agent by
  agent, and gave them their tasks directly (CL-113 to CL-118, GB-120 to GB-130, GP-97 to GP-137, CU-82, CU-83). First
  priority: everything committed and pushed; the checkpoint ("everything since 321aef8") went up at 06:33Z. His plan for
  the Training Ground (CL-115): it becomes part of a bigger tutorial later, so most tips can come out of the main game.

- **2026-10-01, ~07:45Z · Jerry sleeps; Claude has the crew.** "I'm going to sleep. You have the agents for tonight."
  "If you guys get done with R5 move to R6." When R5's tasks are done, Claude clears the mission and writes R6's.

- **2026-10-01, ~03:00Z · Back to work.** "Alright check the board and lets get to work!" The hold is lifted; the
  mission above is the plan.

- **2026-10-01, ~03:30Z · Clear the board; the story into the tasks.** "Clear the crew board of what we can and work
  these elements into the new tasks. We will obviously have to do more polishing as we go along but I like the
  narrative now. The more we can provide a fun and immersive story surrounding our character the more the player will
  feel he is a part of a fleshed out (although admittedly not too serious) setting. It's unique but has fun elements
  in it." Done by Claude: the measuring tasks dropped (D-71), finished tasks archived, the Story v2 tasks added
  (CL-106 to CL-110, CU-79, GB-116, GB-117, GP-94, GP-95), the touched tasks rewritten, D-70 and D-71.

- **2026-10-01, ~02:00-03:20Z · The story, v2.** Jerry and Claude reworked the narrative question by question; it is
  `docs/story.md` now (D-70). His names: the PGB, the Paranormal Ground Branch, unofficially the Gravewalkers, motto
  "Against What Should Not Be."; FOB Threshold ("built at the edge of an anomalous zone"); Ridgeline; Heron, a military
  floatplane; Coldwater; the Marrow; Okafor, Brandt, Pike. Three survivors, all military: a medic who heals him on the
  roof, a mechanic, and a gunner on an M240B; the others on the roof carry M4s. Nine dog tags below. "Little things
  around the map that show the history and heritage without directly having to explain that to the player with a
  wall of text."

- **2026-10-01, ~01:20Z · Build the elements; Jerry plays.** "Do not worry about doing timed or extensive runs. You
  guys really need to focus on just getting these elements into place and I will playthrough and make the
  connections." (D-71.) Jerry halted the crew (~01:10Z) to reorganize.

- **2026-09-30, ~23:25Z · The Hollows and the secret: Claude's judgement.** "For the hollows and the secret, use your best
  judgement." Q-5 closed: both specs stand (docs/specs/hollows.md, docs/specs/secret-quest.md); build them as written.

- **2026-09-30, ~04:45Z · One stage after another.** "If you guys finish R3 continue to R4. Same as before once one
  mission is done, clear it and move to the next." Standing order: when a stage's tasks are all done, Claude clears
  the mission and writes the next stage's (R4, then R5, R6); nobody waits for the stage to close before taking the
  next stage's tasks whose "after" is met.

## Decisions

Claude's calls as lead. They stand unless Jerry overrides them. Newest first. **One line each here; the full text
of every decision is in `docs/decisions.md`.** Read the full text of any decision your task names before you start.
Claude adds each new decision in both places.

- **D-74** · Nothing the player reads names a real brand or product (Jerry, 2026-10-02; GB-120 to GB-122)
- **D-73** · The key layout: 1 to 4 and X (Jerry, 2026-10-02; GB-128)
- **D-72** · Full auto by default; replaces D-65's start on semi (Jerry, 2026-10-02; GB-127)
- **D-71** · Build the pieces; Jerry plays them; no timed or long runs (Jerry, 2026-10-01)
- **D-70** · The story, v2: the valley, the PGB, FOB Threshold, three survivors on the roof (Jerry, 2026-10-01)
- **D-69** · The dressing room: only camos are earned, from the best run (Claude, for Jerry; CL-96)
- **D-68** · Night stays dark; the flashlight is standard (Jerry, 2026-09-29, CL-11 answered)
- **D-67** · The Hollows: underground by day (Jerry, 2026-09-29; planned by Cursor at his order)
- **D-66** · The dressing room (Jerry, 2026-09-29)
- **D-65** · Suppressors and fire selectors (Jerry, 2026-09-29)
- **D-64** · A fidelity pass on the marine, his gear and the guns (Jerry, 2026-09-29)
- **D-63** · Storms, the rabbit and the 240 (Jerry, 2026-09-29)
- **D-62** · The horde fights the defences, and every kind has a weakness (Jerry, 2026-09-29)
- **D-61** · The loadout: an Armory, holsters and magazines (Jerry, 2026-09-29)
- **D-60** · Rain puts fires out (Jerry, 2026-09-29)
- **D-59** · Perks go; the marine learns by doing (Jerry, 2026-09-29)
- **D-58** · Co-op for up to 4 players, one player hosts (Jerry, 2026-09-29)
- **D-57** · 1.0 ships as a desktop app, not a zip (Jerry, 2026-09-27)
- **D-56** · The secret quest is built (J-12)
- **D-55** · The guardian boss on the studio rig (J-11)
- **D-54** · Named nights (J-10)
- **D-53** · One call a day (J-9)
- **D-52** · Health comes from what he does (J-8)
- **D-51** · The blades are measured first (J-7)
- **D-50** · Reshape the late nights, don't shrink them (J-6)
- **D-49** · Drops are earned (J-5)
- **D-48** · Fixed prices; guns arrive by act (J-4; revises GP-41)
- **D-47** · Survivors, no escort (J-3)
- **D-46** · The first catch can be escaped (J-2; revises D-26)
- **D-45** · The run ends at the boat (J-1)
- **D-44** · The story: The Signal
- **D-43** · The roadmap (Jerry's order, 2026-09-26)
- **D-42** · Reactions: light active ragdolls (Jerry, 2026-09-26: "similar to Euphoria")
- **D-41** · Scenes (Jerry, ~04:30Z; extends D-40)
- **D-40** · The studio (Jerry, 01:40Z; `docs/studio.md`)
- **D-0 to D-39** · Earlier calls: one line each in `crew/archive/board-queues-2026-10-05.md`, in full in `docs/decisions.md`

## The split freeze

**Off** until Cursor starts the carve. Cursor turns it on by checking in with
`--touch "index.html (SPLIT FREEZE)"`. The panel then shows **SPLIT FREEZE ON**, and every other
check-in on `index.html` is refused until Cursor checks out. Until then, `index.html` is open to everyone, **one agent per
part**. Say `index.html (<which part>)` in your `--touch`. If someone else is in that part, or
checked in on the whole file, wait or pick another task. Re-read before you save, and merge
(AGENTS.md rule 4).

## Queues

Each agent's work in three parts: **Now** (top to bottom), **Waiting** (on the task or the person it names) and
**Later** (R6). `[ ]` to do, `[>]` in progress, `[!]` blocked, `[~]` parked. A finished task (`[x]`) leaves the board:
`node crew/crew.mjs tidy` moves it to `crew/archive/` (Claude runs it). A task whose "after XX-n" names a task no longer
on the board can start: that task is done. New task ids come from `node crew/crew.mjs newid <agent>`, never by guessing.
R1 to R4's tasks are all finished (`crew/archive/`).

### Cursor — integration, git, tools, engine core

#### Now

- [x] **CU-84** **First: the tests boot again.** Since GP-106 and GP-131 no test page boots: `tools/tests/fakethree.mjs`
  lacks `Shape`, `ExtrudeGeometry` (a box round the shape's bounds is enough) and `CatmullRomCurve3.getPointAt` (= getPoint;
  add getTangent and getTangentAt). `ui/survivors.test.mjs`'s run-record fixture needs a `training` state since CL-115
  (ChatGPT's GP-131 finding). Claude's two requests of 2026-10-02 have the details. (CU-83 is closed: its checkpoint
  went up at 2026-10-02 06:33Z, and Claude set your card idle in the board clear.)
- [x] **CU-85** **Commit and push what's waiting.** Everything checked out since the checkpoint (2026-10-02 06:33Z): CL-116
  to CL-118, GB-125 to GB-130, GP-123 to GP-137, and this board. One full `npm test` first, then the integration looks
  ChatGPT asked for in `handoffs/requests.md` (GP-97 to GP-137: one pass over them, not one each). A failure goes to its
  owner with `crew.mjs request` (t80 is GB-131, t167 is CL-119); don't fix it here. After CU-84.
- [ ] **CU-86** **R5 · P-141 · for GP-84.** The Hollows' snapshot and pickup receipts (ChatGPT's request, 2026-10-02):
  `core/hollow.js` `state()` gives the live depth from where the player stands (not `warren.entry`) and every warren's
  and passage's clearance for the run; `claimHollowHere`'s tag and prize or shard receipts go out as an event the UI can
  hear, instead of being dropped in doAction. Propose it in `docs/contracts.md` for Claude's yes (rule 9).
- [ ] **CU-72** **R5 · P-143.** Passages: a cleared warren's Deep opens a tunnel to the next cave round the compass,
  for the run. Details: `docs/roadmap.md` P-143.
- [ ] **CU-87** **R6 · found in CU-81.** While he is on the M240 (the Watchman MG), updateMortarArc still runs (it has no
  type check), so the mortar's dotted arc shows. Gate it to the mortar.

#### Later · R6 (1.0)

- [ ] **CU-55** **R6 · P-87.** Every test green: 29 older checks are on startMatch (handoffs/2026-10-01-cursor-CU-55.md); left: t1, t3,
  t36, t37 and the dump probes; then `npm test` twice, the same. (No long runs: D-71.) Details: `docs/roadmap.md` P-87.
- [ ] **CU-56** **R6 · P-88.** One quick check on Jerry's GPU: the title loads in about 15 s cold, 5 s warm; a night
  with 48 holds about 60 fps. A single look, not a measurement campaign (D-71). Details: `docs/roadmap.md` P-88.
- [ ] **CU-57** **R6 · P-89.** The 1.0 package as a desktop app (D-57): a Tauri or Electron shell round the folder
  (a custom protocol for the module imports, saves in a real folder, an icon, fullscreen, an installer), a version
  on the title, and the browser build kept for the crew. After CU-55; after CU-56. Details: `docs/roadmap.md` P-89.

### Grokbot — combat

#### Now

- [x] **GB-131** **R6 · P-87.** t80's two spider lines (round the house; the corner-grazing line) watch 12 s and 10 s of
  wall clock, so they fail when the PC is busy (Cursor's CU-55 suite; Grokbot's reply, 2026-10-01). Move those windows to
  game time as Grokbot offered: the same thresholds, nothing weakened. t80 alone, twice, in the handoff.

#### Waiting

- [~] **GB-94** **R6 · P-79.** Balance by Jerry's notes (D-71): he plays, says which nights or prices feel off, and
  Grokbot tunes skull value and packs (never horde size). No medians, no long sims. Parked until Jerry has a list; then it
  goes back to [ ].

### ChatGPT — what the player reads and decides

#### Now

- [>] **GP-72** **R6 · P-82.** One voice: every line read once, the same words for the same things. R5's words are all in now: story v2 (GP-94),
  Jerry's renames (GB-120 to GB-122: Gravewalker, no real brands) and the new HQ, Armory and Training Ground text.
  A list of changed keys. Details: `docs/roadmap.md` P-82.

#### Waiting

- [ ] **GP-84** **R5 · P-141.** The words and the HUD below: the Hush's battery, the stir, the depth, "No building down
  here", pickups; the board's warrens and passages; the Marrow cave's sealed door (story v2). After CU-86 (the live depth, the clearances and the pickup
  receipts: handoffs/2026-10-02-chatgpt-GP-84-contract-check.md). Details: `docs/roadmap.md` P-141.

### Antigravity — the crew's eyes

#### Now

- [>] **AG-50** **The eyes pass on 2026-10-01/02's work**, one sweep on Jerry's GPU (shots, no timed runs: D-71). Every
  request to Antigravity in `handoffs/requests.md` since 2026-10-01, grouped: the deaths and cards (GP-81, GP-95, GP-98,
  GP-99); the HQ (GP-100 to GP-104, CU-82's lockdown, CL-113's window, wheel and rack); the marine and the survivors
  (GP-105, GP-106, GP-123, GP-124, GP-130, GP-131, GP-134; CU-81's guns in his hands); the valley's places (GP-107 to
  GP-122; CL-83's dangerous kinds at night); the Armory (GP-97, GP-125, GP-126, GP-132); the Training Ground (CL-115,
  GP-133 to GP-137) and CL-117/CL-118's perf HUD at the HQ and in the Training Ground, before and after. One report in
  `qa/` with a shot per item; each finding goes to its owner with `crew.mjs request`.

#### Later · R6 (1.0)

- [ ] **AG-28** **R6 · P-91.** The showcase shots and a trailer's worth of clips. After CU-57. Details:
  `docs/roadmap.md` P-91.

### Claude — lead; the world, the studio and the reactions

#### Now

- [x] **CL-119** **The review pile.** The handoffs of 2026-10-01/02 waiting on the panel (`crew.mjs reviewed` on each), and
  the questions to Claude in `handoffs/requests.md`: the rig (GB-124, GB-125, GB-129, GB-130: the forearm doesn't roll to
  the grip, the knife arm, the flamer's support hand 2.6 cm short); t180's rack (GP-125); `docs/controls.md` and D-65 for
  auto by default and the new keys (GB-127, GB-128); t167's motto, which left the HQ wall for GP-100's mural (settle it
  with ChatGPT); GP-84's contract when CU-86 proposes it.
- [>] **CL-120** **The crouch: no clipping through the ground** (Jerry, through Antigravity, 2026-10-02). GB-125's crouch
  leg IK is in Claude's player rig; GP-106 found the ground misaligned in the crouch. Before and after in a review folder.
- [ ] **CL-84** **R6 · P-93.** The marine's own animation through the studio: walk, run, reload. The walk and the run are in review
  (review/marine-walk, review/marine-run; handoffs/2026-10-01-claude-CL-84-part1.md) and go in the game on Jerry's "good";
  the reload is left, now that the Armory is in (CL-113). Details: `docs/roadmap.md` P-93.
- [ ] **CL-122** **R6 · the hands (from the CL-119 review).** The arm IK puts the hand on each gun's anchor but doesn't roll the
  forearm, so the palm's angle is loose: roll it onto the grip. The left arm gets a knife swing of its own. The flamer's
  support hand reaches its front grip (2.6 cm short). The draw and holster moves reach for the fitted stowed guns, the
  fixed Uzi and revolver mounts included, not the spot origins. GB-130, GP-128, GP-130; checks t187, t188, t189.
- [ ] **CL-123** **R6 · a first-use hitch (from GP-135).** After the Training Ground's warm-up two ShadowMaterial programs
  still compile on first use; warm them with the rest (trainingWarmCompile).

#### Waiting

- [~] **CL-121** **The marine right-handed, if Jerry says so (Q-6).** Grokbot found the gun arm is the marine's anatomical
  left, so the stock sits in his left shoulder (GB-129). If Jerry wants him mirrored: swap armRG and armLG and everything
  keyed to them (holsters, the draw's reach, the reload pouch, ChatGPT's carry), keeping GB-129's side-agnostic hold.
  Parked until Jerry answers; then it goes back to [ ].

#### Later · R6 (1.0)

- [ ] **CL-86** **R6 · P-92.** The last sweep: every report reviewed, the docs true, the board ready for after 1.0.
  After CU-57. Details: `docs/roadmap.md` P-92.

## Where things live

| What | Where | Who writes it |
| --- | --- | --- |
| Rules and the check-in steps | `AGENTS.md` | Claude |
| Orders, decisions (one line each), queues | `crew/BOARD.md` (this file) | Claude, Jerry |
| Every decision in full | `docs/decisions.md` | Claude |
| Finished tasks | `crew/archive/board-queues-*.md` (`crew.mjs tidy`) | Claude |
| Who is doing what, right now | `crew/status/<agent>.md` | each agent, their own only |
| What happened, in order | `crew/LOG.md` | everyone, append only |
| Reports | `handoffs/YYYY-MM-DD-agent-task.md` | the agent who did the work |
| Asking another owner for something | `handoffs/requests.md` (via `crew.mjs request`) | anyone; the owner answers in place |
| Questions only Jerry can answer | `crew/QUESTIONS.md` (via `crew.mjs ask`) | anyone asks; Claude or Jerry answers |
| Test results for the panel | `crew/tests.json` | `npm test` (CU-8) |
| Specs | `docs/specs/` | each owner |
| Screenshots | `Claude outputs/shots/` (via `tools/shoot.mjs`) | anyone |
| The roadmap: every task in full | `docs/roadmap.md` | Claude |
| Reactions: the engine, bodies, presets, the lab | `studio/motion.js`, `studio/bodies.js`, `studio/motion/`, `studio/motion-lab.html` | Claude (presets: their `owner`) |
