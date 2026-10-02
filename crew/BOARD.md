# Dead-Wave crew board

Lead: Claude. Last updated 2026-10-01 03:30Z by Claude (the story, v2; the crew back at work; D-70, D-71).

This is the one place to look before you work. `AGENTS.md` has the rules and the check-in
steps; this board has what to work on and what has been decided. **Claude (lead) and Jerry
edit this file.** The one exception: each agent ticks the box of its *own* tasks, which
`crew.mjs in` (▶) and `crew.mjs out --done` (✓) do for you. Everyone else reports through
their check-in card, `crew.mjs note`, their handoff note, and `handoffs/requests.md`.

**The work from here to 1.0 is the roadmap (D-43):** six phases, R1 to R6, below and in `docs/roadmap.md`
(every task's details: what the player gets, how it's built, what proves it). Your queue lists your tasks
phase by phase; the current phase is the Mission.

Live view for Jerry: double-click `crew/Open Crew Panel.bat`. In a terminal:
`node crew/crew.mjs`. The motion lab (D-42): `Open Motion Lab.bat`.

**Told to "check in with the crew work board and complete your tasks"?** This is the board.
1. Read `AGENTS.md` if you haven't this session. It has the rules, and its "Every session"
   steps say exactly how to check in, post notes and check out.
2. Run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`, `grokbot`,
   `antigravity`) for your first task, or read your queue below.
3. Work the queue top to bottom, one check-in and one handoff per task, until it's empty or
   you're blocked. Don't stop to ask Jerry whether to continue. A task that says "after XX-n"
   waits for it; take the next one meanwhile.

## Who runs on what (current)

Jerry moves agents between models; this table is the current truth (2026-09-29, from Jerry, for tonight's R2 run).
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

**The roadmap, phase R5, with the story, v2 (D-70).** Jerry rewrote the story with Claude on 2026-10-01:
`docs/story.md` is the bible now (a valley, not an island; the PGB, the Gravewalkers; FOB Threshold; Ridgeline;
Heron; the Marrow; three survivors on the roof). **Read it before any task that touches words, props, survivors,
the extraction or the Hollows.** Jerry's rule (D-71): build the pieces and put them in place; no timed runs, no long
sims, no measurement passes; each piece gets its own quick test, and Jerry plays and makes the connections.
**Go (Jerry, 2026-10-01 ~03:00Z): "check the board and let's get to work!"** Take your queue top to bottom; the
Story v2 tasks are in R5 with the rest. Tick your box with `crew.mjs`; never save this board or the LOG from a copy.
- Claude: CL-106 (the docs follow the story), CL-107 to CL-110 (the valley's history, the stencils, Heron), CL-75 (the
  survivors), CL-99 v3, CL-100; then CL-76, CL-92, CL-93, CL-78, CL-81.
- Cursor: CU-71 (the Hollows' runtime: most of the Hollows wait on it), CU-79 (the ladder); then R6.
- Grokbot: GB-116 (the roof), GB-117 (Heron), GB-107 and GB-108 after CU-71; GB-92, GB-93.
- ChatGPT: GP-94 (the story's words), GP-70 (the radio), GP-95 (the survivors' words), GP-83, GP-81, GP-84.
- Antigravity: AG-28 later; shots only when someone asks.
- **Claude** · CL-106 · handoffs/claude-CL-106.md
- **Claude** · CL-107 · handoffs/claude-CL-107.md
- **Claude** · CL-110 · handoffs/claude-CL-110.md
- **Claude** · CL-75 · handoffs/claude-CL-75.md
- **Cursor** · CU-71 · handoffs/cursor-CU-71.md
- **Cursor** · CU-79 · handoffs/cursor-CU-79.md
- **Grokbot** · GB-116 · handoffs/grokbot-GB-116.md
- **Grokbot** · GB-117 · handoffs/grokbot-GB-117.md
- **ChatGPT** · GP-94 · handoffs/chatgpt-GP-94.md
- **ChatGPT** · GP-70 · handoffs/chatgpt-GP-70.md
Then: the rest of R5, then R6.

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
| **R5 · Named nights and bigger systems** | ▶ Now | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret, the Hollows under the caves by day (D-67). | Nights 12-20 from the debug start; the secret; a delve in each warren. | GB-87, GB-88, GB-89, GB-90, GB-91, GB-92, GB-93, GP-67, GP-68, GP-69, GP-70, CL-75, CL-76, CL-77, CL-78, CL-79, CL-80, CL-81, CU-54, AG-25, AG-26, CL-92, CL-93, GP-81, GB-105, CL-98, GB-106, CU-71, CL-99, GB-107, GB-108, GP-83, GP-84, CL-100, CU-72, CL-101, CU-73, AG-29, GP-91, CL-106, CL-107, CL-108, CL-109, CL-110, CU-79, GB-116, GB-117, GP-94, GP-95, CL-111, GB-119, CU-80 |
| **R6 · Finish (1.0)** | Later | Balance from medians, the first hour teaching itself, sound and readability, green tests, the budgets, the package. | Three full runs; the release. | GB-94, GB-95, GP-71, GP-72, GP-73, CL-82, CL-83, CL-84, CL-85, CL-86, CU-55, CU-56, CU-57, AG-27, AG-28 |
| **R7 · Co-op, up to 4 players** | After 1.0 | Up to 4 players, one hosting, through the desktop app (D-58). | A night with friends. | Written when R6 closes. |

**The story it tells (D-44, "The Signal").** The relay on the mast went silent three weeks ago; the convoy never
came; the camps stopped answering. One marine parachutes in to hold the HQ and get the relay talking. The dead
answer a signal from the runes under the lake, louder every night. Act 1 teaches the loop; in Act 2 the repaired
relay speaks each morning and offers one call a day, and the supply planes fly in new guns; Act 3 is the wave,
with Fog Night, the siege and a colossus walking by day. On night 20 the boat comes: hold the dock and board it.
For players who look, the relay's static and the pit stones hide a way to silence the signal and fight the
guardian for the true ending. `docs/roadmap.md` has it in full.

## Orders from Jerry

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

- **2026-10-01, ~00:20Z · CU-53: about 2 hours, not 10.** "It's running but we probably don't need it to do 10 hours worth. We need
  to condense that down to about 2." The full-run timing goes parallel (Claude's request to Cursor).

- **2026-09-30, ~23:25Z · The Hollows and the secret: Claude's judgement.** "For the hollows and the secret, use your best
  judgement." Q-5 closed: both specs stand (docs/specs/hollows.md, docs/specs/secret-quest.md); build them as written.

- **2026-09-30, ~22:20Z · On to R5.** "Great work please continue. If you guys get done with R4 move to R5." R4's
  tasks are done but CU-53 (running), so the mission is R5 now; R4 closes when Jerry has played a run to the boat.

- **2026-09-30, ~07:20Z · The fidelity pass is good; the crew works the night.** "Fidelity pass looks good to me nice
  work. I am going to go to sleep so you got the work for the rest of the night." CL-94 closed. R3's tasks are done, so
  the mission is R4 (his standing order).

- **2026-09-30, ~04:45Z · One stage after another.** "If you guys finish R3 continue to R4. Same as before once one
  mission is done, clear it and move to the next." Standing order: when a stage's tasks are all done, Claude clears
  the mission and writes the next stage's (R4, then R5, R6); nobody waits for the stage to close before taking the
  next stage's tasks whose "after" is met.

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

Newest first. Claude writes these down when Jerry gives them in chat. The older ones (the showcase and
before) are in `crew/archive/board-queues-2026-09-26.md`.

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

## Decisions

Claude's calls as lead. They stand unless Jerry overrides them. Newest first. **One line each here; the full text
of every decision is in `docs/decisions.md`.** Read the full text of any decision your task names before you start.
Claude adds each new decision in both places.

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

## The split freeze

**Off** until Cursor starts the carve. Cursor turns it on by checking in with
`--touch "index.html (SPLIT FREEZE)"`. The panel then shows **SPLIT FREEZE ON**, and every other
check-in on `index.html` is refused until Cursor checks out. Until then, `index.html` is open to everyone, **one agent per
part**. Say `index.html (<which part>)` in your `--touch`. If someone else is in that part, or
checked in on the whole file, wait or pick another task. Re-read before you save, and merge
(AGENTS.md rule 4).

## Queues

Each agent's work, phase by phase, top to bottom. `[ ]` to do, `[>]` in progress, `[!]` blocked, `[~]` parked.
A finished task (`[x]`) leaves the board: `node crew/crew.mjs tidy` moves it to `crew/archive/` (Claude runs it).
A task whose "after XX-n" names a task no longer on the board can start: that task is done. New task ids come
from `node crew/crew.mjs newid <agent>`, never by guessing. R1 is finished (`crew/archive/board-queues-2026-09-29.md`).

### Cursor — integration, git, tools, engine core (Grok 4.7 High)

#### R5 · Named nights and bigger systems

- [x] **CU-71** **R5 · P-136.** The Hollows' runtime (D-67): going down and coming up, topside frozen and hidden, the
  ground, colliders and a nav grid switched to the warren, building refused, players list aware. After CL-98; after
  CU-63. Details: `docs/roadmap.md` P-136.
- [x] **CU-80** **R5 · P-140.** The Hollows' haul goes live (contracts: the Hollows' haul, GP-83): an atomic grant
  hook `grantHaul(items) -> { ok, rejected }` that gives all of a strongbox's items or none (blueprint, gun, mod,
  camo, ammo, med pack, grenade) through the inventory's own adders, and the E adapters below: open a strongbox, take
  a crate, pick up a tag (`createHollowLoot`, `createTagCollection`). After CU-71.
- [ ] **CU-72** **R5 · P-143.** Passages: a cleared warren's Deep opens a tunnel to the next cave round the compass,
  for the run. After CU-71; after CL-99. Details: `docs/roadmap.md` P-143.
- [x] **CU-79** **R5 · Story v2.** A ladder up the HQ's side (`docs/story.md` §5): the marine climbs it and stands on
  the roof; the roof is walkable ground with an edge; the HQ's door stays shut (sealed). Players list aware (co-op).
  For GB-116 and CL-75.
- [x] **CU-81** **Jerry, 2026-10-01.** Overhaul every gun's look (Claude okayed; Grokbot stays on GB-92): the same
  names, grips, moving parts and furniture materials, so camo, the rune finish and the survivors' M4s still work.
  Re-run t102, t159, t165; before-and-after shots of each gun (review/guns).
- [x] **CU-82** **Jerry, 2026-10-01.** The night lockdown: from the alarm to the morning no kiosk, Armory, CIF, HQ
  panel or skull window, and no build menu (B, the wheel, a picked piece); a build in hand is put away; every light
  on the HQ turns red. t179, review/night-lockdown.

#### R6 · Finish (1.0)

- [ ] **CU-55** **R6 · P-87.** Every test green: t41 and friends onto startMatch; `npm test` passes. (No full runs:
  D-71.) Details: `docs/roadmap.md` P-87.
- [ ] **CU-56** **R6 · P-88.** One quick check on Jerry's GPU: the title loads in about 15 s cold, 5 s warm; a night
  with 48 holds about 60 fps. A single look, not a measurement campaign (D-71). Details: `docs/roadmap.md` P-88.
- [ ] **CU-57** **R6 · P-89.** The 1.0 package as a desktop app (D-57): a Tauri or Electron shell round the folder
  (a custom protocol for the module imports, saves in a real folder, an icon, fullscreen, an installer), a version
  on the title, and the browser build kept for the crew. After CU-55; after CU-56. Details: `docs/roadmap.md` P-89.

### Grokbot — combat (Grokbot)

#### R5 · Named nights and bigger systems

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

#### R6 · Finish (1.0)

- [ ] **GB-94** **R6 · P-79.** Balance by Jerry's notes (D-71): he plays, says which nights or prices feel off, and
  Grokbot tunes skull value and packs (never horde size). No medians, no long sims. Takes a list from Jerry when he
  has one.

### ChatGPT — what the player reads and decides (GPT-6 Sol High)

#### R5 · Named nights and bigger systems

- [!] **GP-81** **R5 · P-124.** Two new deaths on the tombstone (D-63): `lightning` and `rabbit` in the death catalogue,
  their lines and their unlock; the names and pickup lines for the boots and the grenade; a badge for killing the
  rabbit. After CL-92, CL-93. Details: `docs/roadmap.md` P-124.
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
- [!] **GP-84** **R5 · P-141.** The words and the HUD below: the Hush's battery, the stir, the depth, "No building down
  here", pickups; the board's warrens and passages; the Marrow cave's sealed door (story v2). After GB-108; after GP-83. Details:
  `docs/roadmap.md` P-141.
- [x] **GP-94** **R5 · Story v2.** The story's words (D-70, `docs/story.md` §3-4, §6, §9): Ridgeline's twenty morning
  lines (replacing Harbor Nine's), the field notes as E cards where CL-109 puts them, the ending lines (Heron, the
  true ending), and the names everywhere in strings: Ridgeline, Heron, FOB Threshold, the PGB, the Marrow; no
  "island", no "boat", no Medic-4. The sample window and the supply terminal's labels (skulls are samples, Cash is
  requisition credit).
- [!] **GP-95** **R5 · Story v2.** The survivors' words and their badge (`docs/story.md` §5): found, on-the-roof and
  aboard lines for Okafor, Brandt and Pike; the talk card on the roof; the victory screen's "Survivors aboard: 3"; the
  lifetime badge "Nobody left behind" (all three aboard); the motto "Against What Should Not Be." on the title. After
  GB-116 for the talk hook.

#### R6 · Finish (1.0)

- [!] **GP-72** **R6 · P-82.** One voice: every line read once, the same words for the same things. Details:
  `docs/roadmap.md` P-82.

### Antigravity — the crew's eyes (Gemini 3.1 Pro High)

#### R6 · Finish (1.0)

- [ ] **AG-28** **R6 · P-91.** The showcase shots and a trailer's worth of clips. After CU-57. Details:
  `docs/roadmap.md` P-91.

### Claude — lead; the world, the studio and the reactions (Opus 5.5 High)

#### R5 · Named nights and bigger systems

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

#### R6 · Finish (1.0)

- [x] **CL-82** **R6 · P-84.** The caves and the pit sound alive: the screech, cave groans, the pit's rumble. Details:
  `docs/roadmap.md` P-84.
- [x] **CL-83** **R6 · P-85.** Night dark but readable: threats, attack sides and hurt builds picked out (after Jerry
  answers CL-11). Details: `docs/roadmap.md` P-85.
- [>] **CL-84** **R6 · P-93.** The marine's own animation through the studio: walk, run, reload. After CL-62. Details:
  `docs/roadmap.md` P-93.
- [x] **CL-85** **R6 · P-99.** The guardian's final fight gets its own music. After GB-92. Details: `docs/roadmap.md`
  P-99.
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
