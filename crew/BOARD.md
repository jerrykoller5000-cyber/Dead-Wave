# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-30 22:25Z by Claude (the mission is R5, Jerry's order; CU-53 closes R4).

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
| Cursor | Tools and measurement (bench, nightsim medians, full-run timing), integration plumbing (events, drops), player physics, the suite, commits, the 1.0 package. | Design calls and player-facing copy. |
| ChatGPT | Pure modules with unit tests (`ui/*.js`, `game/*.js`: the board's cards, records, badges, the quest UI), every word the player reads, the economy's numbers. | Browser tests (his runner can't: whoever commits runs them) and big edits in `index.html`'s combat. |
| Grokbot | Combat inside `index.html`: zombies, the director, weapons, builds, scripted deaths, the boat's flow; headless sims; tuning the reaction presets from Jerry's notes. | UI copy and world geometry. |
| Antigravity | Eyes on Jerry's GPU: every visible change, each phase's play check, full runs timed, fps, shots and videos. | Game code (none: D-9). |

## Mission

**The roadmap, phase R5: named nights and bigger systems (D-43).**
R4's tasks are done but one: Cursor's CU-53 (a full run timed headless, running now). Jerry plays a run to the boat
and a win to close R4. R5: Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret
(The Signal) and the Hollows under the caves by day. Jerry plays nights 12-20 from the debug start, the secret, and a
delve in each warren to close it. **Claude's specs come first: nearly all of R5 waits on them** (CL-98 the Hollows,
CL-79 the secret, CL-76 Fog Night's fog). Until your R5 task's "after" is met, take R6 (GB-94, GP-71 to GP-73,
CU-55 to CU-57, AG-27). **Never save this board or `crew/LOG.md` from a copy you read earlier;** tick your box with
`crew.mjs out` (it reads the file fresh).
- **The Hollows' spec is in** (`docs/specs/hollows.md`, CL-98): GB-106, CU-71, GP-83 and CL-99 can start. Jerry left it to
  Claude's judgement (Q-5): it stands as written.
- **The secret's spec is in** (`docs/specs/secret-quest.md`, CL-79): GP-70 can start; CL-80 is Claude's. Jerry left both
  specs to Claude's judgement (Q-5): they stand as written.
- Claude: CL-99 v2 (the warrens' dressing, light and dark; v1 layouts are in), CL-76 (Fog Night's fog: CU-54 and AG-25 wait), then CL-92 and CL-93 (GP-81 waits), CL-75, CL-78, CL-81.
- Cursor: CU-53 (R4), then CU-71 (the Hollows' runtime, spec §2); R6 meanwhile; CU-54 after CL-76.
- Grokbot: GB-106 (the Hush, spec §1); then R6 (GB-94); GB-107 after CU-71 and CL-99.
- ChatGPT: GP-93 (the dressing room's words), GP-83 (the haul, hollows.md §6), GP-70 (the radio's Tune and the true ending, secret-quest.md §3, §6); R6 meanwhile.
- Antigravity: shots as they land; AG-25 after CL-76.
- **Claude** · CL-98 · handoffs/claude-CL-98.md
- **Claude** · CL-99 · handoffs/claude-CL-99.md
- **Claude** · CL-79 · handoffs/claude-CL-79.md
- **Claude** · CL-80 · handoffs/claude-CL-80.md
- **Claude** · CL-76 · handoffs/claude-CL-76.md
- **Claude** · CL-92 · handoffs/claude-CL-92.md
- **Claude** · CL-93 · handoffs/claude-CL-93.md
- **Cursor** · CU-53 · handoffs/cursor-CU-53.md
- **Cursor** · CU-71 · handoffs/cursor-CU-71.md
- **Grokbot** · GB-106 · handoffs/grokbot-GB-106.md
- **ChatGPT** · GP-83 · handoffs/chatgpt-GP-83.md
- **ChatGPT** · GP-70 · handoffs/chatgpt-GP-70.md
- **Antigravity** · AG-25 · handoffs/antigravity-AG-25.md
Then: R6.

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
| **R4 · The way out** | Jerry plays | The boat at night 20; the victory screen and badges; the relay tells the story. | A run to the boat, and a win. | GB-85, GB-86, GP-63, GP-64, GP-65, GP-66, CL-73, CL-74, CU-53, AG-24, CL-96, CU-70, CL-97, GP-82, GP-90 |
| **R5 · Named nights and bigger systems** | ▶ Now | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret, the Hollows under the caves by day (D-67). | Nights 12-20 from the debug start; the secret; a delve in each warren. | GB-87, GB-88, GB-89, GB-90, GB-91, GB-92, GB-93, GP-67, GP-68, GP-69, GP-70, CL-75, CL-76, CL-77, CL-78, CL-79, CL-80, CL-81, CU-54, AG-25, AG-26, CL-92, CL-93, GP-81, GB-105, CL-98, GB-106, CU-71, CL-99, GB-107, GB-108, GP-83, GP-84, CL-100, CU-72, CL-101, CU-73, AG-29, GP-91 |
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

#### R2 · The night has a shape

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

#### R3 · The day feeds the night

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

#### R4 · The way out

- [x] **CU-70** **R4 · P-131.** The dressing room (D-66): the CIF grows into it, with a 3D view of the marine he can
  turn 360; each item's camo and options; saved to the profile. After CL-96, CL-94. Details: `docs/roadmap.md` P-131.
- [>] **CU-53** **R4 · P-78.** A full run timed headless: `tools/nightsim.mjs --full`, the boat called on 20. After
  GB-86. Details: `docs/roadmap.md` P-78.

#### R5 · Named nights and bigger systems

- [ ] **CU-54** **R5.** R5 measured: fps on Fog Night and the siege, with the wanderer out, on the GPU. After CL-76;
  after GB-88.
- [ ] **CU-71** **R5 · P-136.** The Hollows' runtime (D-67): going down and coming up, topside frozen and hidden, the
  ground, colliders and a nav grid switched to the warren, building refused, players list aware. After CL-98; after
  CU-63. Details: `docs/roadmap.md` P-136.
- [ ] **CU-72** **R5 · P-143.** Passages: a cleared warren's Deep opens a tunnel to the next cave round the compass,
  for the run. After CU-71; after CL-99. Details: `docs/roadmap.md` P-143.
- [ ] **CU-73** **R5 · P-145.** The Hollows measured: fps below with 24 awake on the GPU; a scripted delve per warren
  (`nightsim --hollow`): time, deaths, pay against the same day's night. After GB-108. Details: `docs/roadmap.md` P-145.

#### R6 · Finish (1.0)

- [ ] **CU-55** **R6 · P-87.** Every test green and robust: t41 and friends onto startMatch; two identical full runs.
  Details: `docs/roadmap.md` P-87.
- [ ] **CU-56** **R6 · P-88.** The budgets hold on Jerry's GPU: title 15 s cold, 5 s warm; 60 fps with 48. Details:
  `docs/roadmap.md` P-88.
- [ ] **CU-57** **R6 · P-89.** The 1.0 package as a desktop app (D-57): a Tauri or Electron shell round the folder
  (a custom protocol for the module imports, saves in a real folder, an icon, fullscreen, an installer), a version
  on the title, and the browser build kept for the crew. After CU-55; after CU-56. Details: `docs/roadmap.md` P-89.

### Grokbot — combat (Grokbot)

#### R2 · The night has a shape

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

#### R3 · The day feeds the night

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

#### R4 · The way out

- [x] **GB-85** **R4 · P-50.** From night 20, with the relay up, the boat can be called; not calling it is "stay"
  (D-45). After GP-54; after GB-72. Details: `docs/roadmap.md` P-50.
- [x] **GB-86** **R4 · P-53.** Board the boat: hold E on the deck; a win, with no death-log entry; a "hot extraction"
  before the last kill. After CL-73. Details: `docs/roadmap.md` P-53.

#### R5 · Named nights and bigger systems

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
- [ ] **GB-92** **R5 · P-97.** The secret's fight: on a silenced night the guardian comes out of the chalk cave on its
  rig and can die there. After GP-70; after CL-78. Details: `docs/roadmap.md` P-97.
- [ ] **GB-93** **R5 · P-98.** Swarm Night on 17: runners from every cave, faster pushes. After AG-25. Details:
  `docs/roadmap.md` P-98.
- [x] **GB-106** **R5 · P-135.** The Hush (D-67): one charge a dawn once the relay is up; lit at a mouth it stops the
  walk-in grab and E goes down; the chalk mouth refuses; the poke chase unchanged. After CL-98; after GB-78. Details:
  `docs/roadmap.md` P-135.
- [ ] **GB-107** **R5 · P-138.** Fighting below: sleepers that wake to noise and light, nests to blow up, each Deep's
  set piece, cave roles, 24 awake at most. After CU-71; after CL-99; after CL-91. Details: `docs/roadmap.md` P-138.
- [ ] **GB-108** **R5 · P-139.** The stir: noise fills a meter (suppressed much less), the Hush holds it; full or flat,
  the guardian comes through the rock; bolt-holes, the kick-free, else the cave death. After GB-107; after GB-106;
  after GB-105. Details: `docs/roadmap.md` P-139.

#### R6 · Finish (1.0)

- [ ] **GB-94** **R6 · P-79.** Balance from medians over 20 nights: skull value and packs, never horde size. After
  CU-51. Details: `docs/roadmap.md` P-79.
- [x] **GB-95** **R6 · P-80.** The blades as D-51 says: measured, then the machete if melee is still over 40%. After
  CU-48. Details: `docs/roadmap.md` P-80.

### ChatGPT — what the player reads and decides (GPT-6 Sol High)

#### R2 · The night has a shape

- [x] **GP-85** **R2 · P-148.** A sound for the skulls the last kill pulls into the bag (D-68, Jerry on Q-3): one
  collect chime as they land (not one per skull), with the count on screen. Details: `docs/roadmap.md` P-148.
  Moved from Cursor (was CU-76) on 2026-09-29: audio cues and the HUD line are ChatGPT's. No `index.html` combat edits: hook the pull through the existing `skull` events, or ask Grokbot for one with `crew.mjs request`.
- [x] **GP-86** **R2 · P-147.** The flashlight's words (ChatGPT asked; Cursor's CU-75 request): the two lines that
  still sell the gun light say it comes with every gun, in `ui/strings.js`. After CU-75. Small.
- [x] **GP-53** **R2 · P-33.** "Kick free! (E)" during the haul, then "It took your skulls.". After GB-78. Details:
  `docs/roadmap.md` P-33.
- [x] **GP-50** **R2 · P-29.** The scouting report names the counter: plates stop bullets, kill the screamer first.
  After GB-75; after GB-76; after GB-77. Details: `docs/roadmap.md` P-29.

#### R3 · The day feeds the night

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

#### R4 · The way out

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

#### R5 · Named nights and bigger systems

- [ ] **GP-81** **R5 · P-124.** Two new deaths on the tombstone (D-63): `lightning` and `rabbit` in the death catalogue,
  their lines and their unlock; the names and pickup lines for the boots and the grenade; a badge for killing the
  rabbit. After CL-92, CL-93. Details: `docs/roadmap.md` P-124.
- [x] **GP-67** **R5 · P-60.** The board warns: "Fog Night", "The siege · they'll go for your walls". After GB-88.
  Details: `docs/roadmap.md` P-60.
- [x] **GP-68** **R5 · P-62.** "A colossus is walking the east trail" on the board; COLOSSUS DOWN from strings. After
  GB-89. Details: `docs/roadmap.md` P-62.
- [x] **GP-91** **R5 · P-86.** The props' notes as cards (docs/story.md §4): E at each of the ten sites reads its note
  from strings, once, as a short card. Where E already does something there (an objective's claim, the dock, the
  tower, the HQ), the note shows with that action instead of a second prompt. After GP-66. Details: `docs/roadmap.md` P-86.
- [x] **GP-69** **R5 · P-66.** Survivors on the board ("Someone lit a fire at the trapper's camp") and on the victory
  screen. After GB-90. Details: `docs/roadmap.md` P-66.
- [ ] **GP-70** **R5 · P-96.** The secret's UI: the glyphs at the radio, the silenced night on the board, the true
  ending, the rune gun at the dock. After CL-79. Details: `docs/roadmap.md` P-96.
- [ ] **GP-83** **R5 · P-140.** The Hollows' haul (D-67): `game/hollows-loot.js`: skulls, crates, one strongbox a
  warren a run (a blueprint, an early gun, a mod, a camo, a rune shard), the twelve dog tags; a delve pays about half
  a night. After CL-98; after GP-60. Details: `docs/roadmap.md` P-140.
- [ ] **GP-84** **R5 · P-141.** The words and the HUD below: the Hush's battery, the stir, the depth, "No building down
  here", pickups; the board's warrens and passages; the chalk mouth's refusal. After GB-108; after GP-83. Details:
  `docs/roadmap.md` P-141.

#### R6 · Finish (1.0)

- [!] **GP-72** **R6 · P-82.** One voice: every line read once, the same words for the same things. Details:
  `docs/roadmap.md` P-82.
- [x] **GP-73** **R6 · P-83.** Credits: Jerry, the crew, Quaternius (CC0), the music. Details: `docs/roadmap.md` P-83.

### Antigravity — the crew's eyes (Gemini 3.1 Pro High)

#### R2 · The night has a shape

- [x] **AG-30** **R2 · first tonight.** Eyes on what landed while the crew was halted, on Jerry's GPU: the marine's bored
  idle and cigarette (GP-74), the roll in all eight directions (GP-75), the kiosk hiding upgrades (CU-60), the CIF window
  with all 49 camos and the "Plain colours" heading (CU-61, Claude), and the horde under the map (type `swarm`, run over
  the hills shooting for 5 minutes: no zombie sinks). Shots in `qa/`, one report. Then answer the shot requests waiting
  for you in `handoffs/requests.md`, and take shots for each R2 change as it lands.
- [x] **AG-22** **R2.** R2 on the GPU: a fresh run to night 5, nights 10 and 13 from the debug start; the surge, the
  music, fps. After GB-73.

#### R3 · The day feeds the night

- [x] **AG-23** **R3.** R3 on the GPU: days 1-10 fresh; the relay, the calls, caches, drums, the vault, the kiosk by
  act. After GP-61.

#### R4 · The way out

- [x] **AG-24** **R4 · P-78.** A full run on Jerry's GPU to the boat: time it, win it, shots of the ending. After
  GB-86; after GP-64. Details: `docs/roadmap.md` P-78.

#### R5 · Named nights and bigger systems

- [ ] **AG-25** **R5.** Fog Night and the siege on the GPU: shots NVG on and off, fps. After CL-76; after GB-88.
- [ ] **AG-26** **R5.** Survivors, the wanderer and the secret quest walked through on the GPU. After GB-92.
- [ ] **AG-29** **R5 · P-146.** The Hollows on the GPU: each warren walked from the mouth to the Deep and out, shots of
  every depth, a video of the stir running out, fps. After GP-84. Details: `docs/roadmap.md` P-146.

#### R6 · Finish (1.0)

- [ ] **AG-27** **R6 · P-90.** Three full runs three ways (turtle, explorer, rusher) on the GPU; every bug on the
  board. After CU-57. Details: `docs/roadmap.md` P-90.
- [ ] **AG-28** **R6 · P-91.** The showcase shots and a trailer's worth of clips. After AG-27. Details:
  `docs/roadmap.md` P-91.

### Claude — lead; the world, the studio and the reactions (Opus 5.5 High)

#### R2 · The night has a shape

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

#### R3 · The day feeds the night

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

#### R4 · The way out

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

#### R5 · Named nights and bigger systems

- [ ] **CL-92** **R5 · P-122.** Lightning in storms (D-63): 5 strikes a storm; 1 in 50 burns a tree, 1 in 100 kills the
  zombies where it lands, 1 in 200 hits the marine for 70 (never under godmode); insulated boots hidden on the map
  make him immune. Details: `docs/roadmap.md` P-122.
- [ ] **CL-93** **R5 · P-123.** The rabbit mound (D-63): an out-of-the-way burrow with bones and a skull; shoot it and a
  white rabbit takes the marine's head off. The one answer: our knockoff holy grenade, hidden on the map, an angelic
  choir on the pin pull, and it kills the rabbit. Our own models, names, sounds and words. Details: `docs/roadmap.md`
  P-123.
- [ ] **CL-75** **R5 · P-63.** Survivor figures: unarmed, by the camp fire, then by the HQ. Details: `docs/roadmap.md`
  P-63.
- [ ] **CL-76** **R5 · P-57.** Fog Night's fog: about 30 m, goggles or not; the night keeps its music arc. After
  GB-87. Details: `docs/roadmap.md` P-57.
- [ ] **CL-77** **R5 · P-58.** Fog Night's own sectioned score. After CL-76. Details: `docs/roadmap.md` P-58.
- [ ] **CL-78** **R5 · P-67.** The guardian boss on the studio rig and clips (D-55). After CL-62. Details:
  `docs/roadmap.md` P-67.
- [x] **CL-79** **R5 · P-94, P-69.** The secret quest's spec, docs/specs/secret-quest.md, for Jerry's yes (D-56).
  After CL-74. Details: `docs/roadmap.md` P-94, P-69.
- [x] **CL-80** **R5 · P-95.** The secret's world: the pit stones pulse in order at night, seen from the tower; the
  lake goes quiet. After CL-79. Details: `docs/roadmap.md` P-95.
- [ ] **CL-81** **R5 · P-68.** The kick-free gets a real let-go beat in the studio. After GB-78; after CL-62. Details:
  `docs/roadmap.md` P-68.
- [x] **CL-98** **R5 · P-134.** The Hollows' spec (D-67), `docs/specs/hollows.md`: the Hush, the five warrens, the
  depths, the stir, the loot, the story, the runtime contract with Cursor, co-op, and Jerry's three calls (Q-4), for
  Jerry's yes. After CL-74. Details: `docs/roadmap.md` P-134.
- [ ] **CL-99** **R5 · P-137.** The five warrens: a tile kit per theme (root, shale, iron, wet, hill), three depths from
  their own dice per run, the convoy's wreckage, a sealed rune door in each Deep; nothing topside moves. After CL-98.
  Details: `docs/roadmap.md` P-137.
- [ ] **CL-100** **R5 · P-142.** What the Hollows say: the convoy went under, twelve dog tags, the rune doors, rune
  shards into the secret, in docs/story.md. After CL-98; after CL-79. Details: `docs/roadmap.md` P-142.
- [ ] **CL-101** **R5 · P-144.** The Hollows sound alive: drips, the Hush's hum, the stir, the guardian in the walls,
  the music's underground state. After GB-108. Details: `docs/roadmap.md` P-144.

#### R6 · Finish (1.0)

- [ ] **CL-82** **R6 · P-84.** The caves and the pit sound alive: the screech, cave groans, the pit's rumble. Details:
  `docs/roadmap.md` P-84.
- [ ] **CL-83** **R6 · P-85.** Night dark but readable: threats, attack sides and hurt builds picked out (after Jerry
  answers CL-11). Details: `docs/roadmap.md` P-85.
- [ ] **CL-84** **R6 · P-93.** The marine's own animation through the studio: walk, run, reload. After CL-62. Details:
  `docs/roadmap.md` P-93.
- [ ] **CL-85** **R6 · P-99.** The guardian's final fight gets its own music. After GB-92. Details: `docs/roadmap.md`
  P-99.
- [ ] **CL-86** **R6 · P-92.** The last sweep: every report reviewed, the docs true, the board ready for after 1.0.
  After AG-27. Details: `docs/roadmap.md` P-92.

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
