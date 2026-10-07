# Dead-Wave crew board

Lead: Claude. Last updated 2026-10-07T02:22Z by Claude (CL-131 done).

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
| Cursor | commit everything waiting since the last push, then the integration suite (GP-84, GP-138 to GP-144 wait on it) | — | — |
| Claude | — (lead: reviews, the crew while Jerry is away) | — | — |
| ChatGPT | GP-148 (GB-137's reload banners); GP-84, GP-138 to GP-147 wait on Grokbot's GB-140 run and Antigravity | — | — |
| Grokbot | GB-140 (the integration run while Cursor is away) | — | — |
| Antigravity | AG-52 (eyes on the fixes as they land) | — | — |

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

**Jerry's playthrough 1 (2026-10-06): fix what he found.** His notes, verbatim: `handoffs/2026-10-06-jerry-playthrough-1.md`. Bugs first (CU-88, GB-133),
then each agent's list in the Start here order above. D-71 still holds: build the pieces,
a quick test each, and Jerry plays. The zombie rules are D-77. Antigravity looks at each piece as it lands (AG-52).
- **Cursor** · CU-88 · handoffs/cursor-CU-88.md
- **Grokbot** · GB-133 · handoffs/grokbot-GB-133.md
- **ChatGPT** · GP-84 · handoffs/chatgpt-GP-84.md
- **Antigravity** · AG-52 · handoffs/antigravity-AG-52.md
Then: GP-84 closes R5; these close Jerry's first run (P-90); then his next runs and the release.
After 1.0: R7, co-op for up to 4 (D-58, `docs/coop.md`), written as tasks once Jerry has played R6.

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
| **R5 · Named nights and bigger systems** | ▶ Closing: GP-84 left | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret, the Hollows under the caves by day (D-67). | Nights 12-20 from the debug start; the secret; a delve in each warren. | GB-87, GB-88, GB-89, GB-90, GB-91, GB-92, GB-93, GP-67, GP-68, GP-69, GP-70, CL-75, CL-76, CL-77, CL-78, CL-79, CL-80, CL-81, CU-54, AG-25, AG-26, CL-92, CL-93, GP-81, GB-105, CL-98, GB-106, CU-71, CL-99, GB-107, GB-108, GP-83, GP-84, CL-100, CU-72, CL-101, CU-73, AG-29, GP-91, CL-106, CL-107, CL-108, CL-109, CL-110, CU-79, GB-116, GB-117, GP-94, GP-95, CL-111, GB-119, CU-80, CU-86 |
| **R6 · Finish (1.0)** | ▶ Jerry's playthrough 1: 21 fixes | Balance from medians, the first hour teaching itself, sound and readability, green tests, the budgets, the package. | Three full runs; the release. | GB-94, GB-95, GP-71, GP-72, GP-73, CL-82, CL-83, CL-84, CL-85, CL-86, CU-55, CU-56, CU-57, AG-27, AG-28, CU-84, CU-85, GB-131, AG-50, CL-119, CL-120, CL-121, CL-122, CL-123, CU-87, CU-88, CU-89, CU-90, CU-91, GB-133, GB-134, GB-135, GB-136, GB-137, GB-138, GP-138, GP-139, GP-140, GP-141, CL-125, CL-126, CL-127, CL-128, CL-129, CL-130, CL-131, AG-52 |
| **R7 · Co-op, up to 4 players** | After 1.0 | Up to 4 players, one hosting, through the desktop app (D-58). | A night with friends. | Written when R6 closes. |

**The story (D-70, story v2).** `docs/story.md` is the bible: a valley in the forest ringed by mountains, with a lake and
rivers, not an island; the PGB (the Gravewalkers), FOB Threshold, Ridgeline on the relay, Heron the floatplane on night 20,
the Marrow, three survivors on the roof. Read it before any task that touches words, props, survivors, the extraction or
the Hollows. D-44's outline (the relay, one call a day, the three acts, the secret) still holds where story.md doesn't
change it.

## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat. Older ones: `crew/archive/board-queues-2026-10-05.md`
(2026-09-25 to 09-30) and `crew/archive/board-queues-2026-09-26.md` (before that).

- **2026-10-06 · Playthrough 1.** "Tons of stuff for the board on the playthorugh": the CIF, the minimap, the map,
  notifications, the grenade and launcher arcs, the Gravewalker's walk, the terminal's tabs, the Armory, mission markers,
  the radio mast, the music, a Hush/warrens bug, the zombies (speed, the horde, the maimed, models, sounds), two bugs, and
  the magazines and the Watchman MG still missing. Verbatim in `handoffs/2026-10-06-jerry-playthrough-1.md`. Done by Claude: CU-88 to CU-91, GB-133 to GB-138,
  GP-138 to GP-141, CL-125 to CL-130, AG-52; D-77 (the zombies).

- **2026-10-06 · Clear every finished task.** "I want every task that is already completed completely cleared from the
  board." Done by Claude: `crew.mjs tidy` moved the last 18 finished tasks to `crew/archive/board-queues-2026-10-06.md`
  (CU-55 to CU-57, CU-72, CU-84 to CU-87, GB-94, GB-131, AG-28, AG-50, CL-84, CL-119 to CL-123); the Start here table,
  the mission and the queues now show only what is open: GP-84, GP-72 and CL-86.

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

- **D-78** · Cursor's CU-89 to CU-91 move to ChatGPT as GP-145 to GP-147; CU-88 closed for Cursor (Claude, 2026-10-06)
- **D-77** · The dead: faster, up to 90% of his sprint, sprinters outrun him; 70% close in, 30% flank; no legs crawl, one leg hops at 75%, no limbs dies (Jerry, 2026-10-06)
- **D-76** · The title in about 6 s warm is fine (Jerry, 2026-10-05; Q-7, CU-56)
- **D-75** · The marine stays left-handed (Jerry, 2026-10-05; Q-6, CL-121)
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

- [x] **CU-88** **Bug: the Hush and the warrens.** Jerry: charge the Hush, go to a cave, press E to go down: nothing happens, and
  after that the alarm can't be sounded. Find it, fix it, and a test that walks that path (handoffs/2026-10-06-jerry-playthrough-1.md).
- [~] **CU-89** Moved to ChatGPT as GP-145 (D-78). **The minimap's enemy indicator.** True direction every time, including after the camera turns (it lies now);
  several directions at once; smaller. By day it shows only the dead he has been near or seen; at night, the direction of
  any within 50 m.
- [~] **CU-90** Moved to ChatGPT as GP-146 (D-78). **The map.** His facing and the camera's facing, as on the minimap. Every place a `?` until he has found it
  (FOB Threshold always shown); the caves by their real names once found (Root Warren...); the HQ is FOB Threshold on both
  maps. The words through ChatGPT's catalogue.
- [~] **CU-91** Moved to ChatGPT as GP-147 (D-78). **Mission indicators** on the minimap and the map: where the current objectives are.

### Grokbot — combat

#### Now

- [x] **GB-133** **Bugs.** (1) Reloading the 40 mm launcher throws six casings for every one. (2) Jerry found no way to upgrade
  a build: the Upgrade slot on the build wheel exists, so make it findable (the prompt, the wheel, the first-use card) or
  say what's missing (handoffs/2026-10-06-jerry-playthrough-1.md).
- [x] **GB-134** **The grenade's arc, and the launcher's.** Hold G: an arc grows from a short lob (a tap) to the longest throw at 3 s;
  where terrain cuts it, the arc shows that. The 40 mm launcher gets an arc like the mortar's.
- [x] **GB-135** **The horde (D-77).** Faster dead on average, up to 90% of his sprint; sprinters outrun his sprint. 70% close in
  together, 30% flank. A mass, not single fights: Jerry never felt a horde, and night 20 was "a slow boring trickle". Look
  at the waves' pacing and sizes as well as the walk.
- [x] **GB-136** **The maimed dead (D-77).** No legs: they crawl. One leg: they hop at 75% of their speed. No limbs at all: they
  die (no more crawling torsos). Claude makes the crawl and the hop in CL-129; the rules and the speeds here.
- [x] **GB-137** **The true magazine and reload system.** Jerry: it never got implemented. `game/magazines.js` (D-61) keeps each
  magazine's rounds; find what of it the game and the HUD don't use yet and finish it, so a reload swaps a real magazine.
- [>] **GB-140** **The integration run while Cursor is away** (Claude, 2026-10-07). `npm test` twice on Jerry's PC (check-players
  passes again), the real-renderer smoke run, each red to its owner with the failing lines; flaky ones listed apart. GP-84,
  GP-138 to GP-147 and GB-137 wait on this. No git: Cursor still commits when it is back.
- [x] **GB-138** **The Watchman MG.** Jerry: it never got created. Make the M240 on its tripod real: bought, placed, manned, with
  its own feed, and Brandt's on the roof.

### ChatGPT — what the player reads and decides

#### Now

- [!] **GP-84** **R5 · P-141.** The words and the HUD below: the Hush's battery, the stir, the depth, "No building down
  here", pickups; the board's warrens and passages; the Marrow cave's sealed door (story v2). After CU-86 (the live depth, the clearances and the pickup
  receipts: handoffs/2026-10-02-chatgpt-GP-84-contract-check.md). Details: `docs/roadmap.md` P-141.

- [!] **GP-138** **The CIF window** (Jerry's playthrough): "Your Gravewalker" starts with the turning paused; only items he has
  unlocked are listed; a new look for the window; the colour of the lightning-proof boots can be changed. Claude does the
  figure itself in CL-125.
- [!] **GP-139** **Notifications move left.** The new-gun unlock and the skulls processed drop down from the Dead-Wave/prep panel
  on the left, as part of it, not mid-screen. Every other notice that can go there goes there; the kill streaks stay.
- [!] **GP-140** **The supply terminal's tabs.** Each tab's sub-tabs named and coloured apart so they catch the eye (Jerry's
  example: Weapons in yellow over GUNS in green and UPGRADES in brown), on every tab.
- [!] **GP-141** **The Armory: the gun in 3D.** A small view of the selected gun that he can turn, like the CIF's figure.
- [!] **GP-145** **The minimap's enemy indicator** (was CU-89, D-78). True direction every time, including after the camera
  turns (it lies now); several directions at once; smaller. By day it shows only the dead he has been near or seen; at night,
  the direction of any within 50 m. index.html drawMinimap; check in on index.html (minimap).
- [!] **GP-146** **The map** (was CU-90, D-78). His facing and the camera's facing, as on the minimap. Every place a `?` until he
  has found it (FOB Threshold always shown); the caves by their real names once found (Root Warren...); the HQ is FOB
  Threshold on both maps.
- [!] **GP-147** **Mission indicators** (was CU-91, D-78) on the minimap and the map: where the current objectives are.
- [!] **GP-148** **GB-137's reload banners in the catalogue.** R with no fuller magazine now refuses with a banner through
  `sayText` and English fallbacks: `hud.ammo.noFullerMag` (NO FULLER MAGAZINE), `hud.ammo.noFullerLoader` (NO FULLER LOADER)
  and `hud.ammo.noFullerHelp`. Your wording, in ui/strings.js; no index.html change needed.

### Antigravity — the crew's eyes

#### Now

- [>] **AG-52** **Eyes on playthrough 1's fixes.** As each of CU-88 to CU-91, GB-133 to GB-138, GP-138 to GP-141 and CL-125 to
  CL-130 lands: shots (and a clip where it moves) on Jerry's GPU, one report per batch.

### Claude — lead; the world, the studio and the reactions

#### Now

- [x] **CL-125** **The CIF's Gravewalker.** Arms relaxed at his sides, not held out; the whole of him in view with a slight zoom on
  the part being changed (the boots can't be seen now); the NVGs on his head only when the helmet is worn and the NVGs are
  unlocked. With GP-138.
- [x] **CL-126** **The walk and the run.** He bobs side to side oddly; the legs and the body's turn look goofy and stiff. And he
  breathes hard at idle after a run.
- [x] **CL-127** **The radio mast.** How to repair it is obvious, the repair bar easy to see while repairing, and the supply pickup
  in its own spot away from the repair point.
- [x] **CL-128** **Music: each night its own.** A score that gives each night special attention. Jerry's inspiration:
  https://www.youtube.com/watch?v=zjyQWpJc6qk
- [x] **CL-129** **The dead look and move better.** Better models and animation for every kind, more engaging to look at; the
  crawl (no legs) and the hop (one leg) for GB-136.
- [x] **CL-130** **The dead sound like themselves.** Each kind its own sounds.
- [x] **CL-131** **The Watchman MG, carried and fired.** From GB-138: shouldered (T) it still shows the mortar; give it its own carried
  model, tip its barrel up and down with the aim, throw links and brass, and give it its own report if the AK's isn't right.

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
