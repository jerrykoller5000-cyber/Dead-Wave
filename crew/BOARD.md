# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-26, 19:30 UTC, by Claude.

This is the one place to look before you work. `AGENTS.md` has the rules and the check-in
steps; this board has what to work on and what has been decided. **Claude (lead) and Jerry
edit this file.** The one exception: each agent ticks the box of its *own* tasks, which
`crew.mjs in` (▶) and `crew.mjs out --done` (✓) do for you. Everyone else reports through
their check-in card, `crew.mjs note`, their handoff note, and `handoffs/requests.md`.

**The work from here to 1.0 is the roadmap (D-43):** six phases, R1 to R6, below and in `docs/roadmap.md`
(every task's details: what the player gets, how it's built, what proves it). Your queue lists your tasks
phase by phase; the current phase is the Mission.

Live view for Jerry: double-click `crew/Open Crew Panel.bat`. In a terminal:
`node crew/crew.mjs`. The motion lab (D-42): `Open Motion Lab.bat`. The model lab: `Open Model Lab.bat`.

**Told to "check in with the crew work board and complete your tasks"?** This is the board.
1. Read `AGENTS.md` if you haven't this session. It has the rules, and its "Every session"
   steps say exactly how to check in, post notes and check out.
2. Run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`, `grokbot`,
   `antigravity`) for your first task, or read your queue below.
3. Work the queue top to bottom, one check-in and one handoff per task, until it's empty or
   you're blocked. Don't stop to ask Jerry whether to continue. A task that says "after XX-n"
   waits for it; take the next one meanwhile.

## Who runs on what (current)

Jerry moves agents between models; this table is the current truth (2026-09-25, 22:05 UTC, from Jerry).
Each agent's card (`crew/status/<you>.md`, `model:`) and its next check-in `--model` should match it.
Older notes and decisions below that name other models are history.

| Agent | Model now | Where it runs |
| --- | --- | --- |
| Claude (lead) | Claude Opus 5.5 | Cowork, writing through the desktop bridge |
| Cursor | Grok 4.7 | Cursor IDE on Jerry's PC |
| ChatGPT | GPT-ASTRA 6 (High) | ChatGPT / Codex app on Jerry's PC |
| Grokbot | not named on its card yet (Grokbot: put yours on your card) | Grok Bot app on Jerry's PC |
| Antigravity | Gemini 3.1 Pro (back 2026-09-25) | Antigravity editor with a browser, on Jerry's GPU |
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

**The roadmap, phase R1: trust the loop, and feel it (D-43).** Skulls reach the bag, building does what it
says, and the dead react when they're hit: the reaction engine, the motion lab and the game's wiring are in
(CL-65, CL-87, GB-65 to GB-67, behind the REACTIONS switch, off: D-57). Antigravity checks them on the GPU
(AG-21), Grokbot tunes the presets and turns them on (GB-70, GB-96). Jerry plays a fresh run to night 5 at the end, and leaves
his notes in the motion lab. Work your queue top to bottom; a task that says "after XX-n" waits for it.
- **Grokbot** · GB-60 · handoffs/2026-09-27-grokbot-GB-60.md
- **Grokbot** · GB-61 · handoffs/2026-09-27-grokbot-GB-61.md
- **Grokbot** · GB-62 · handoffs/2026-09-27-grokbot-GB-62.md
- **Grokbot** · GB-63 · handoffs/2026-09-27-grokbot-GB-63.md
- **Grokbot** · GB-64 · handoffs/2026-09-27-grokbot-GB-64.md
- **Grokbot** · GB-65 · handoffs/2026-09-27-grokbot-GB-65.md
- **Grokbot** · GB-66 · handoffs/2026-09-27-grokbot-GB-66.md
- **Grokbot** · GB-67 · handoffs/2026-09-27-grokbot-GB-67.md
- **Grokbot** · GB-68 · handoffs/2026-09-27-grokbot-GB-68.md
- **Grokbot** · GB-69 · handoffs/2026-09-27-grokbot-GB-69.md
- **Grokbot** · GB-70 · handoffs/2026-09-27-grokbot-GB-70.md
- **Grokbot** · GB-96 · handoffs/2026-09-27-grokbot-GB-96.md
- **ChatGPT** · GP-45 · handoffs/2026-09-27-chatgpt-GP-45.md
- **ChatGPT** · GP-46 · handoffs/2026-09-27-chatgpt-GP-46.md
- **ChatGPT** · GP-47 · handoffs/2026-09-27-chatgpt-GP-47.md
- **Claude** · CL-66 · handoffs/2026-09-27-claude-CL-66.md
- **Claude** · CL-67 · handoffs/2026-09-27-claude-CL-67.md
- **Claude** · CL-68 · handoffs/2026-09-27-claude-CL-68.md
- **Cursor** · CU-47 · handoffs/2026-09-27-cursor-CU-47.md
- **Cursor** · CU-48 · handoffs/2026-09-27-cursor-CU-48.md
- **Cursor** · CU-49 · handoffs/2026-09-27-cursor-CU-49.md
- **Cursor** · CU-50 · handoffs/2026-09-27-cursor-CU-50.md
- **Cursor** · CU-59 · handoffs/2026-09-27-cursor-CU-59.md
- **Antigravity** · AG-20 · handoffs/2026-09-27-antigravity-AG-20.md
- **Antigravity** · AG-21 · handoffs/2026-09-27-antigravity-AG-21.md
- **Antigravity** · AG-29 · handoffs/2026-09-27-antigravity-AG-29.md

## Waiting on

The panel's "Right now" box draws this. Claude keeps it current: one line for each thing that
others can't go on without, as `- **<who>** · <task> · waiting: <agents>`. A line whose task
ids are all ticked [x] drops off the panel by itself. The panel also works out waits it can see:
a card blocked on another agent, and a next task that says "after the split" or "after XX-n".

- **Jerry** · his first notes in the motion lab (GB-70, CL-68) · waiting: Grokbot, Claude
- **Cursor** · CU-47 the reaction scenes rendered on the GPU · waiting: Antigravity, Jerry
- **Antigravity** · AG-21 reactions in the game on the GPU (fps with 8 reacting) · waiting: Grokbot (GB-96)

## The roadmap (D-43)

Details for every task: `docs/roadmap.md` (the P-ids). A phase ends when Jerry has played it; the next one's
tasks can start as soon as their own "after" is met, so the lanes keep moving.

| Phase | Goal | Jerry plays | Tasks |
| --- | --- | --- | --- |
| **R1 · Trust the loop, and feel it** | Skulls reach the bag; building says what it does; the dead react when hit; the marine gets knocked around. | A fresh run to night 5; notes in the motion lab. | GB-60, GB-61, GB-62, GB-63, GB-64, GB-65, GB-66, GB-67, GB-68, GB-69, GB-70, GP-45, GP-46, GP-47, CL-66, CL-67, CL-68, CU-47, CU-48, CU-49, CU-50, AG-20, AG-21 |
| **R2 · The night has a shape** | One breather and a surge you can hear; plates, screamers, bomber chains; streaks heal; the best run saved; the first catch escapable. | Night 5 fresh, then 10 and 13 from the debug start. | GB-59, GB-71, GB-72, GB-73, GB-74, GB-75, GB-76, GB-77, GB-78, GP-48, GP-49, GP-50, GP-51, GP-52, GP-53, CL-62, CL-69, CL-70, CL-71, CU-51, AG-22 |
| **R3 · The day feeds the night** | The relay, then one call a day; caches, drums, the vault; guns by act at fixed prices, one mod each. | Days 1-10 fresh. | CU-58, GB-81, GB-82, GB-83, GB-84, GP-54, GP-55, GP-56, GP-57, GP-58, GP-59, GP-60, GP-61, GP-62, CL-72, CU-52, AG-23 |
| **R4 · The way out** | The boat at night 20; the victory screen and badges; the relay tells the story. | A run to the boat, and a win. | GB-85, GB-86, GP-63, GP-64, GP-65, GP-66, CL-73, CL-74, CU-53, AG-24 |
| **R5 · Named nights and bigger systems** | Fog Night, the siege, the day colossus, survivors, the guardian boss on its rig, the secret. | Nights 12-20 from the debug start; the secret. | GB-87, GB-88, GB-89, GB-90, GB-91, GB-92, GB-93, GP-67, GP-68, GP-69, GP-70, CL-75, CL-76, CL-77, CL-78, CL-79, CL-80, CL-81, CU-54, AG-25, AG-26 |
| **R6 · Finish (1.0)** | Balance from medians, the first hour teaching itself, sound and readability, green tests, the budgets, the package. | Three full runs; the release. | GB-94, GB-95, GP-71, GP-72, GP-73, CL-82, CL-83, CL-84, CL-85, CL-86, CU-55, CU-56, CU-57, AG-27, AG-28 |

**The story it tells (D-44, "The Signal").** The relay on the mast went silent three weeks ago; the convoy never
came; the camps stopped answering. One marine parachutes in to hold the HQ and get the relay talking. The dead
answer a signal from the runes under the lake, louder every night. Act 1 teaches the loop; in Act 2 the repaired
relay speaks each morning and offers one call a day, and the supply planes fly in new guns; Act 3 is the wave,
with Fog Night, the siege and a colossus walking by day. On night 20 the boat comes: hold the dock and board it.
For players who look, the relay's static and the pit stones hide a way to silence the signal and fight the
guardian for the true ending. `docs/roadmap.md` has it in full.

## Orders from Jerry

- **2026-09-26 · A reaction tool, the roadmap to finish the game, and the open calls.** "Create a hybrid
  animation/ragdoll tool similar to Euphoria, specifically tailored to be light enough to use in this game; work
  that into our current plan. The agents need to easily be able to use this tool and I need to be able to review
  and make notes on animation." Then the board as "a giant roadmap for the completion of this game with tasks for
  all the agents in each phase" that "plays to each model's strengths", and the plan's calls he'd left open:
  "use your best discretion to make it fun and tell a fun narrative." Done as CL-65 (D-42), the roadmap (D-43,
  `docs/roadmap.md`), the story (D-44) and D-45 to D-56. The compiled suggestions it grew from are its Coverage
  table.

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

Claude's calls as lead. They stand unless Jerry overrides them. Newest first.

- **D-57 · Reactions are in the game, off until the GPU says yes.** The horde (studio/motion-horde.js) and its
  wiring (index.html "=== Reactions") are built behind REACTIONS, off by default (`?reactions=1`, the dev console's
  `reactions on`). Grokbot turns it on (GB-96) once AG-21 shows 60 fps with 48 zombies and 8 reacting on Jerry's
  GPU. Melee stays GB-52's shove until the blade presets shove (P-75). The guardian uses the brute's preset.
  Models are data (`dw-model/1`, docs/studio.md §11) with their own lab and sheets (§12); the game adopts them
  one at a time (the drums with P-43, the boat with P-52).
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
  suggestions (30, from five agents and Jerry) are its Coverage table.
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

## The split freeze

**Off** until Cursor starts the carve. Cursor turns it on by checking in with
`--touch "index.html (SPLIT FREEZE)"`. The panel then shows **SPLIT FREEZE ON**, and every other
check-in on `index.html` is refused until Cursor checks out. Until then, `index.html` is open to everyone, **one agent per
part**. Say `index.html (<which part>)` in your `--touch`. If someone else is in that part, or
checked in on the whole file, wait or pick another task. Re-read before you save, and merge
(AGENTS.md rule 4).

## Queues

Each agent's work, phase by phase. `[ ]` to do, `[>]` in progress, `[x]` done, `[!]` blocked, `[~]` parked. The
finished work before the roadmap is in `crew/archive/board-queues-2026-09-26.md` and
`crew/archive/board-queues-2026-09-24.md`.

### Cursor — integration, git, tools, engine core (Grok 4.7)

- [x] **CU-46** **First. The studio renders scenes (D-41).** After CL-63. `node tools/studio.mjs scene
  <scene.json>` into `review/<scene name>/vN/`: every actor drawn (the marine as the `marine` rig, not the scale
  post), the camera following the scene's middle so the travel shows, a strip of side-on tiles plus a top-down row
  (the path and where each actor is), and the video (real speed, quarter speed; side, then the game's camera). Mark
  a tile red where `studio/scene.js` flags a check (hold gap, foot slide, speed out of range) and put the worst of
  each in `stats.json`. The player does the maths (`createScene`, `seek`, the `checks` it returns); the renderer
  only draws. Unchanged scene, no new version.

#### R1 · Trust the loop, and feel it

- [ ] **CU-47** **R1 · P-76.** Review the notes hook in tools/serve.mjs (D-42) and render `zombie-reactions` and
  `marine-knocked` into review folders on Jerry's GPU; fix the headless video step if it's small. Details:
  `docs/roadmap.md` P-76. Since CL-89 the hook sends every POST under `/__studio/` to studio/notes-endpoint.mjs,
  which refuses other sites (403); render `getting-up`, `zombie-dismembered` and `guardian-grab-drag-flop` too.
- [ ] **CU-59** **R1 · P-76.** `tools/studio-scene.html` fetches `sceneClipRefs(json)` (studio/scene.js), not only the
  actors' clips, so a rendered scene's bodies get up on their get-up clips (docs/studio.md §10.1). Small. Before
  CU-47's renders.
- [ ] **CU-60** **R1.** Two fixes to the browser checks' stand-in for three (tools/tests/fakethree.mjs): a real
  `Matrix4.makeBasis`, and a quaternion that keeps its object's Euler in step, so t85 can stand a reacting body
  facing any way and see what the game does when it sets one angle of a joint a body has turned.
- [ ] **CU-48** **R1 · P-13.** Nightsim: `--repeat N`, melee counted per kill, crowd seconds, signature-kind peaks,
  streak heals: medians, not one run. Details: `docs/roadmap.md` P-13.
- [ ] **CU-49** **R1 · P-14.** Three stale lines in docs/gameplay.md made true (prep clock, drops, window climbing).
  Details: `docs/roadmap.md` P-14.
- [ ] **CU-50** **R1 · P-23.** Builds report their damage: a `build-hit` event (throttled) for the HUD and the cue.
  Moved from Grokbot to spread the load (integration plumbing). Details: `docs/roadmap.md` P-23.

#### R2 · The night has a shape

- [ ] **CU-51** **R2 · P-13.** R2 measured: nightsim medians for the new shape, bench fps with 48 and 8 reacting.
  After GB-73; after GB-66. Details: `docs/roadmap.md` P-13.

#### R3 · The day feeds the night

- [ ] **CU-58** **R3 · P-34.** `spawnSupplyDrop({x, z, contents, source})` and a `supply-drop` event; the airdrop cue
  plays. Moved from Grokbot (integration plumbing). Details: `docs/roadmap.md` P-34.
- [ ] **CU-52** **R3 · P-44.** Vault your own barricades: Space beside a sandbag, wire, barricade or open window hops
  you over in 0.5 s. Player physics is Cursor's (lead call). Details: `docs/roadmap.md` P-44.

#### R4 · The way out

- [ ] **CU-53** **R4 · P-78.** A full run timed headless: `tools/nightsim.mjs --full`, the boat called on 20. After
  GB-86. Details: `docs/roadmap.md` P-78.

#### R5 · Named nights and bigger systems

- [ ] **CU-54** **R5.** R5 measured: fps on Fog Night and the siege, with the wanderer out, on the GPU. After CL-76;
  after GB-88.

#### R6 · Finish (1.0)

- [ ] **CU-55** **R6 · P-87.** Every test green and robust: t41 and friends onto startMatch; two identical full runs.
  Details: `docs/roadmap.md` P-87.
- [ ] **CU-56** **R6 · P-88.** The budgets hold on Jerry's GPU: title 15 s cold, 5 s warm; 60 fps with 48. Details:
  `docs/roadmap.md` P-88.
- [ ] **CU-57** **R6 · P-89.** The 1.0 package: a zip Jerry can hand over, a version on the title. After CU-55; after
  CU-56. Details: `docs/roadmap.md` P-89.

### Grokbot — combat


#### R1 · Trust the loop, and feel it

- [ ] **GB-60** **R1 · P-1.** Skulls you earn reach the bag, every night: the last kill pulls them in; none land in a
  grab zone. Claude's rule-10 OK is given (roadmap, lead calls). Details: `docs/roadmap.md` P-1.
- [ ] **GB-61** **R1 · P-2.** A skull within 4 m zips to you; skulls last 45 s; big drops still need the walk. After
  GB-60. Details: `docs/roadmap.md` P-2.
- [ ] **GB-62** **R1 · P-3.** Build refusals say why while you aim; no turret under your feet on a deck. Details:
  `docs/roadmap.md` P-3.
- [ ] **GB-63** **R1 · P-4.** T and X act on your own storey only, never through a floor. After GB-62. Details:
  `docs/roadmap.md` P-4.
- [ ] **GB-64** **R1 · P-5.** A mortar at a deck's rim keeps you on the deck; folding stairs won't fold from under
  you. After GB-63. Details: `docs/roadmap.md` P-5.
- [x] **GB-65** **R1 · P-70, P-6.** The dead react in the game (D-42): adopt each zombie as the `zombie` rig, one body
  through a pool of 8, a shell's pellets summed into one hit, the AI waits while it's down. The engine, presets and
  lab are in (CL-65). docs/studio.md §10 and docs/contracts.md (Reactions). Details: `docs/roadmap.md` P-70, P-6.
  Built by Claude behind REACTIONS (off, D-57): studio/motion-horde.js and index.html "=== Reactions" (your part,
  each change commented GB-65 to GB-67). `handoffs/2026-09-26-claude-CL-87.md`.
- [x] **GB-66** **R1 · P-71, P-7.** Deaths fall the way they were hit: `body.kill` replaces the corpse topple; settled
  corpses freeze. After GB-65. Details: `docs/roadmap.md` P-71, P-7. Built by Claude, as GB-65.
- [x] **GB-67** **R1 · P-72.** The marine gets knocked around (your GB-50 order, through D-42): swipes rock him, a
  brute's blow staggers him, a bomber puts him down. After GB-65. Details: `docs/roadmap.md` P-72. Built by Claude, as GB-65.
- [ ] **GB-96** **R1 · P-70 to P-72.** Reactions on by default (D-57): read the Reactions wiring in your part of
  index.html and say what you'd change, play it (`?reactions=1`), then flip REACTIONS on once AG-21 shows 60 fps with
  48 zombies and 8 reacting. docs/studio.md §10.6. After AG-21.
- [ ] **GB-68** **R1 · P-73.** Zombies' feet on the ground: check the 0.2 m sink (studio/zombie.js note) and fix it if
  it's a bug. Details: `docs/roadmap.md` P-73.
- [ ] **GB-69** **R1 · P-8.** The laser does what the kiosk sells: spread ×0.8 while it's on. Details:
  `docs/roadmap.md` P-8.
- [ ] **GB-70** **R1 · P-75.** Reaction presets tuned to Jerry's lab notes (studio/motion/*: bump version, answer with
  crew.mjs review). Ongoing through R2, whenever a motion-* review folder has a waiting note. Details:
  `docs/roadmap.md` P-75. Start from the sweep (docs/studio.md §10.7: `node studio/motion-report.mjs <preset> --sweep`):
  almost any blast drops a shambler or a feral, a rifle round staggers a feral, a brute's swing drops a shambler, the
  marine's blast response sits on an edge, and a knife or machete should shove before melee reacts again.

#### R2 · The night has a shape

- [ ] **GB-59** **R2.** Brought back: the fog cull (CU-42). Skip drawing and animating zombies past the fog's far
  distance (never a threat, a spit holder with a line, or the guardian); measure on the GPU with qa/run-cu42.mjs. The
  frame-budget lever for R2 and D-50.
- [ ] **GB-71** **R2 · P-16.** Test nights: early pushes run straight on, then one real breather with the cave eyes
  dimmed; a `wave-push` event. After CU-48. Details: `docs/roadmap.md` P-16.
- [ ] **GB-72** **R2 · P-17.** The last push surges from the caves and the treeline together, so the night ends harder
  and sooner. After GB-71; after GB-59. Details: `docs/roadmap.md` P-17.
- [ ] **GB-73** **R2 · P-18.** Headline packs as set pieces: six brutes side by side, the demon and bomber packs;
  night 19's short breathers made true. After GB-72. Details: `docs/roadmap.md` P-18.
- [ ] **GB-74** **R2 · P-22.** Streaks heal: from 5 kills, 1 HP a kill (2 from 20), up to 70% (D-52). Details:
  `docs/roadmap.md` P-22.
- [ ] **GB-75** **R2 · P-26.** Brutes wear plates: bullets and blades cut to 0.55, fire and blasts full (the unused
  `armored` flag). Matches the brute's reaction preset. Details: `docs/roadmap.md` P-26.
- [ ] **GB-76** **R2 · P-27.** The screamer's howl pulls up to 3 far zombies up out of the ground near it, even at the
  cap. After GB-59. Details: `docs/roadmap.md` P-27.
- [ ] **GB-77** **R2 · P-28.** A bomber shot inside the crowd: the chain feeds your streak and pays in full. Details:
  `docs/roadmap.md` P-28.
- [ ] **GB-78** **R2 · P-32.** The first guardian catch of a run can be escaped: five E presses, 50 HP and the
  unbanked skulls (D-46). After GB-67. Details: `docs/roadmap.md` P-32.

#### R3 · The day feeds the night

- [ ] **GB-81** **R3 · P-38.** A crate pick brings the plane over the mast; it lands with a small guard pack; the
  random timer stops once the relay is up (D-49). After GP-55; after CU-58. Details: `docs/roadmap.md` P-38.
- [ ] **GB-82** **R3 · P-39.** The Lights out dare: the HQ lamp stays dark tonight, kills pay 25% more. After GP-55.
  Details: `docs/roadmap.md` P-39.
- [ ] **GB-83** **R3 · P-45.** With the relay up, one crate falls in the breather toward tonight's caves: run for it
  or hold. After GB-81; after GB-71. Details: `docs/roadmap.md` P-45.
- [ ] **GB-84** **R3 · P-48.** One mod per gun: the extended mag (slower reload) or a heavy barrel (steadier, slower
  swap). After GP-60. Details: `docs/roadmap.md` P-48.

#### R4 · The way out

- [ ] **GB-85** **R4 · P-50.** From night 20, with the relay up, the boat can be called; not calling it is "stay"
  (D-45). After GP-54; after GB-72. Details: `docs/roadmap.md` P-50.
- [ ] **GB-86** **R4 · P-53.** Board the boat: hold E on the deck; a win, with no death-log entry; a "hot extraction"
  before the last kill. After CL-73. Details: `docs/roadmap.md` P-53.

#### R5 · Named nights and bigger systems

- [ ] **GB-87** **R5 · P-56.** Night mods: Fog Night on 14, named the prep before (D-54). Details: `docs/roadmap.md`
  P-56.
- [ ] **GB-88** **R5 · P-59.** The siege on 18 made real: brutes and soldiers go for your walls. Details:
  `docs/roadmap.md` P-59.
- [ ] **GB-89** **R5 · P-61.** A colossus walks a trail by day from night 7: loot around it or bring it down for a big
  payout. Details: `docs/roadmap.md` P-61.
- [ ] **GB-90** **R5 · P-64.** Survivor bounties: a camp from night 3 can hold one; clear the guards and press E
  (D-47). After CL-75. Details: `docs/roadmap.md` P-64.
- [ ] **GB-91** **R5 · P-65.** Survivors' help: the medic's regen to 50%, the trapper's cheaper repairs, the ranger's
  turret. After GB-90. Details: `docs/roadmap.md` P-65.
- [ ] **GB-92** **R5 · P-97.** The secret's fight: on a silenced night the guardian comes out of the chalk cave on its
  rig and can die there. After GP-70; after CL-78. Details: `docs/roadmap.md` P-97.
- [ ] **GB-93** **R5 · P-98.** Swarm Night on 17: runners from every cave, faster pushes. After AG-25. Details:
  `docs/roadmap.md` P-98.

#### R6 · Finish (1.0)

- [ ] **GB-94** **R6 · P-79.** Balance from medians over 20 nights: skull value and packs, never horde size. After
  CU-51. Details: `docs/roadmap.md` P-79.
- [ ] **GB-95** **R6 · P-80.** The blades as D-51 says: measured, then the machete if melee is still over 40%. After
  CU-48. Details: `docs/roadmap.md` P-80.

### ChatGPT — what the player reads and decides (GPT-ASTRA 6, High)


#### R1 · Trust the loop, and feel it

- [ ] **GP-45** **R1 · P-9.** Build mode's HUD: each key beside its word, no Reload row while R rotates. After GB-62.
  Details: `docs/roadmap.md` P-9.
- [ ] **GP-46** **R1 · P-10.** "Cabin" becomes "HQ" everywhere the player reads it (the landmark cabins stay cabins).
  After GB-62. Details: `docs/roadmap.md` P-10.
- [ ] **GP-47** **R1 · P-12.** One-time lines for the first cave poke and the first swim toward the pit. After CL-66.
  Details: `docs/roadmap.md` P-12.

#### R2 · The night has a shape

- [ ] **GP-48** **R2 · P-24.** The minimap shows hurt builds (amber, red, flashing) and rim pips for the ones out of
  range. Details: `docs/roadmap.md` P-24.
- [ ] **GP-49** **R2 · P-25.** One panned cue when a far build fails; an optional "West wall failing" line. After
  CU-50; after GP-48. Details: `docs/roadmap.md` P-25.
- [ ] **GP-50** **R2 · P-29.** The scouting report names the counter: plates stop bullets, kill the screamer first.
  After GB-75; after GB-76; after GB-77. Details: `docs/roadmap.md` P-29.
- [ ] **GP-51** **R2 · P-30.** First-use cards: B to build, Y for two guns, H for a MedPen; the tree-felling tip.
  After GP-45. Details: `docs/roadmap.md` P-30.
- [ ] **GP-52** **R2 · P-31.** The best run on the death card and the title (`tt_best_run`, a lifetime record like
  D-31). Details: `docs/roadmap.md` P-31.
- [ ] **GP-53** **R2 · P-33.** "Kick free! (E)" during the haul, then "It took your skulls.". After GB-78. Details:
  `docs/roadmap.md` P-33.

#### R3 · The day feeds the night

- [ ] **GP-54** **R3 · P-36.** The relay, once repaired, can be called once each prep (a per-day `callable` state).
  Details: `docs/roadmap.md` P-36.
- [ ] **GP-55** **R3 · P-37.** Tonight's call: three cards on the HQ board, one pick, gone at the alarm (D-53). After
  GP-54. Details: `docs/roadmap.md` P-37.
- [ ] **GP-56** **R3 · P-35.** Drop news as a small notice from strings, not a hard-coded banner. After CU-58.
  Details: `docs/roadmap.md` P-35.
- [ ] **GP-57** **R3 · P-40.** The dawn banner says what the dare earned. After GB-82. Details: `docs/roadmap.md`
  P-40.
- [ ] **GP-58** **R3 · P-41.** From day 2, two of the five caches restock with something new. Details:
  `docs/roadmap.md` P-41.
- [ ] **GP-59** **R3 · P-42.** The board lists what restocked; the minimap marks it after you've read the board. After
  GP-58. Details: `docs/roadmap.md` P-42.
- [ ] **GP-60** **R3 · P-46.** Fixed equipment prices; guns stocked by act (D-48); the economy model re-run. After
  GB-61; after GB-81. Details: `docs/roadmap.md` P-46.
- [ ] **GP-61** **R3 · P-47.** "Arrives night N" on unstocked guns; "New at the kiosk: AA-12" at dawn. After GP-60.
  Details: `docs/roadmap.md` P-47.
- [ ] **GP-62** **R3 · P-49.** Both mods on the Upgrades tab, the fitted one marked, a free switch. After GB-84.
  Details: `docs/roadmap.md` P-49.

#### R4 · The way out

- [ ] **GP-63** **R4 · P-51.** "Call the boat" beside "Sound the alarm"; the dock blinks on the minimap once it's due.
  After GB-85. Details: `docs/roadmap.md` P-51.
- [ ] **GP-64** **R4 · P-54.** The victory screen: the closing line, nights, kills, headshots, best streak, skulls
  banked, survivors aboard. After GB-86; after GP-52. Details: `docs/roadmap.md` P-54.
- [ ] **GP-65** **R4 · P-55.** About 12 lifetime badges on the death card and the title (store, then the UI). After
  GP-52. Details: `docs/roadmap.md` P-55.
- [ ] **GP-66** **R4 · P-86.** The relay's twenty morning lines, the survivors' lines and the props' notes in strings,
  on the board. After CL-74. Details: `docs/roadmap.md` P-86.

#### R5 · Named nights and bigger systems

- [ ] **GP-67** **R5 · P-60.** The board warns: "Fog Night", "The siege · they'll go for your walls". After GB-88.
  Details: `docs/roadmap.md` P-60.
- [ ] **GP-68** **R5 · P-62.** "A colossus is walking the east trail" on the board; COLOSSUS DOWN from strings. After
  GB-89. Details: `docs/roadmap.md` P-62.
- [ ] **GP-69** **R5 · P-66.** Survivors on the board ("Someone lit a fire at the trapper's camp") and on the victory
  screen. After GB-90. Details: `docs/roadmap.md` P-66.
- [ ] **GP-70** **R5 · P-96.** The secret's UI: the glyphs at the radio, the silenced night on the board, the true
  ending, the rune gun at the dock. After CL-79. Details: `docs/roadmap.md` P-96.

#### R6 · Finish (1.0)

- [ ] **GP-71** **R6 · P-81.** The first hour teaches itself: every key's first-use card; the controls page matches
  the game. After GP-51. Details: `docs/roadmap.md` P-81.
- [ ] **GP-72** **R6 · P-82.** One voice: every line read once, the same words for the same things. Details:
  `docs/roadmap.md` P-82.
- [ ] **GP-73** **R6 · P-83.** Credits: Jerry, the crew, Quaternius (CC0), the music. Details: `docs/roadmap.md` P-83.

### Antigravity — the crew's eyes (Gemini 3.1 Pro)


#### R1 · Trust the loop, and feel it

- [ ] **AG-20** **R1 · P-15.** A fresh run to night 5 on Jerry's GPU: night lengths, lost skulls, the skull-at-dawn
  report, accidental pokes, fps with 48, the Ways to Die padlocks. Do it again when GB-61 is in. Details:
  `docs/roadmap.md` P-15.
- [ ] **AG-21** **R1 · P-77.** The motion lab and both reaction folders on the GPU, then reactions in the game: shots
  and fps. After CU-47. Again for the game when GB-67 is in. Details: `docs/roadmap.md` P-77. GB-67 is in: open the
  game with `?reactions=1` and check docs/studio.md §10.6's "Before it's on by default" list, fps with 48 zombies and 8
  reacting first (`TT.getHorde().stats.ms` is the horde's own time). `node studio/check-labs.mjs --shots qa/<folder>`
  gives a screenshot of each lab step.
- [ ] **AG-29** **R1.** The model lab on the GPU (`Open Model Lab.bat`, docs/studio-guide.md §7): each model by day,
  at night and in night vision, a hit on the spider and the zombie, a note with its picture; shots of each beside its
  sheet in `review/model-*`. Say where the lab and the sheet disagree.

#### R2 · The night has a shape

- [ ] **AG-22** **R2.** R2 on the GPU: a fresh run to night 5, nights 10 and 13 from the debug start; the surge, the
  music, fps. After GB-73.

#### R3 · The day feeds the night

- [ ] **AG-23** **R3.** R3 on the GPU: days 1-10 fresh; the relay, the calls, caches, drums, the vault, the kiosk by
  act. After GP-61.

#### R4 · The way out

- [ ] **AG-24** **R4 · P-78.** A full run on Jerry's GPU to the boat: time it, win it, shots of the ending. After
  GB-86; after GP-64. Details: `docs/roadmap.md` P-78.

#### R5 · Named nights and bigger systems

- [ ] **AG-25** **R5.** Fog Night and the siege on the GPU: shots NVG on and off, fps. After CL-76; after GB-88.
- [ ] **AG-26** **R5.** Survivors, the wanderer and the secret quest walked through on the GPU. After GB-92.

#### R6 · Finish (1.0)

- [ ] **AG-27** **R6 · P-90.** Three full runs three ways (turtle, explorer, rusher) on the GPU; every bug on the
  board. After CU-57. Details: `docs/roadmap.md` P-90.
- [ ] **AG-28** **R6 · P-91.** The showcase shots and a trailer's worth of clips. After AG-27. Details:
  `docs/roadmap.md` P-91.

### Claude — lead; the world, the studio and the reactions (Opus 5.5)

- [x] **CL-63** **First. Scenes (D-41): the format, the marine rig, the scene player.** `docs/studio.md` §9 (the
  `dw-scene/1` format), the marine registered as a rig (`studio/marine.js`: a stand-in built with the game marine's
  joint offsets, plus `adopt` for the game's own marine), and `studio/scene.js`: actors on paths with keyed speed,
  holds (reach, tow, lift), stride-matched clip rates, per-frame checks (hold gap, planted-foot slide, speed), seek
  for the renderer. Unit tests. A demo scene the renderer can use until CL-64's.
- [x] **CL-64** **The guardian's grab and drag as the first scene; the game plays it.** After CU-46. The catch in
  beats you can see (pounce, catch, pull down) instead of all in 0.45 s; the hand held on the marine's real ankle;
  a heavy haul at a believable speed with the steps matched to it; the marine towed on his back, his leg lifted by
  the hand. Jerry (04:40Z): it lunges and grabs **facing him**, aiming for the leg whichever way he lies, then turns
  round (stepping, not spinning on planted feet) and heads for the cave dragging him. That needs facing that changes
  over time in the scene format (keyed `face`, or face an actor), which this task adds.
  `review/guardian-grab-drag/`, then the game's cave drag switched from its hand code to the scene.
  Then Jerry's notes.
- [x] **CL-65** **Reactions: light active ragdolls (D-42; Jerry: "similar to Euphoria, light enough for this game").**
  `studio/motion.js`, bodies for the marine and the zombies, presets (`studio/motion/`), scenes with hits, the motion
  lab with Jerry's notes into `review/motion-*`. 38/0 studio tests. `handoffs/2026-09-26-claude-CL-65.md`.
- [x] **CL-87** **Reactions, round two (D-42, D-57).** Bodies lie flat and get up on clips for their side (contract 1),
  a hand can hold one (2), parts come off (3), far bodies cost less (4), `body.shift`; the horde in the game behind
  REACTIONS (GB-65 to GB-67); the review's fixes. docs/studio.md §10. `handoffs/2026-09-26-claude-CL-87.md`.
- [x] **CL-88** **The battery, the report and expectations (contract 6).** `studio/motion-battery.js`,
  `motion-report.mjs` (tables, `--vs`, `--try`, `--sweep`), `motion-expect.js`. docs/studio.md §10.7. Same handoff.
- [x] **CL-89** **The motion lab, round two, and the write door (contract 5).** Timeline, replay, compare, power,
  pictures with a strip, save as scene, approved reactions; `/__studio/*` for any review folder, own pages only;
  `studio/check-labs.mjs`. docs/studio.md §10.8, studio-guide §6. Same handoff.
- [x] **CL-90** **Models as data (`dw-model/1`).** `studio/model.js`, `studio/models/` (the fuel drum, the evac boat,
  the spider with a body, the zombie). docs/studio.md §11. Same handoff.
- [x] **CL-91** **The model lab and sheets.** `studio/model-lab.html`, `studio/model-look.js`, `studio/render-sheet.mjs`,
  `studio/check-model-lab.mjs`, `Open Model Lab.bat`. docs/studio.md §12, studio-guide §7. Same handoff.

#### R1 · Trust the loop, and feel it

- [ ] **CL-66** **R1 · P-11.** A `pit-near` event once a run, before the arms can reach (contract line). Details:
  `docs/roadmap.md` P-11.
- [x] **CL-67** **R1 · P-74.** The held body flops: `hold` on a reacting body, and the guardian's drag victim uses it.
  CL-65's first intent. Details: `docs/roadmap.md` P-74. `body.hold`, `marine/held` and the scene
  `guardian-grab-drag-flop` (docs/studio.md §10.2); the game still plays the kinematic drag until Jerry's note says
  the flop is good. `handoffs/2026-09-26-claude-CL-87.md`.
- [ ] **CL-68** **R1 · P-75.** Engine fixes from Jerry's lab notes (studio/motion.js, studio/bodies.js); new bodies
  when a creature needs one. Ongoing. Details: `docs/roadmap.md` P-75.
- [ ] **CL-92** **R1.** The review's other low findings on CL-87 to CL-91 (listed in
  `handoffs/2026-09-26-claude-CL-87.md`): a body pushed sideways that sits, the scene's get-up turn that stays,
  reactions off standing corpses up, the battery's idle speed and `classify`, the lab's paused click and scene names.

#### R2 · The night has a shape

- [ ] **CL-62** **R2.** The rest of the guardian through the studio: the chase, the walk-out and the throw as scenes
  and clips, until Jerry's notes say good. Carried over. After CL-64 (done).
- [ ] **CL-69** **R2 · P-19.** The score follows the night's shape: a break in the breather, bridge and climax at the
  last push. After GB-71. Details: `docs/roadmap.md` P-19.
- [ ] **CL-70** **R2 · P-20.** Night 19 sounds bigger than night 2: a gain that climbs night by night. Details:
  `docs/roadmap.md` P-20.
- [ ] **CL-71** **R2 · P-21.** Late Ember and Guardian tiers, so nights 16 and 18 stop reusing nights 4 and 6. After
  CL-70. Details: `docs/roadmap.md` P-21.

#### R3 · The day feeds the night

- [ ] **CL-72** **R3 · P-43.** Fuel drums back at the guarded wrecks, sheds and the mast: they chain, and they're back
  each morning. Rule 10 signed off. Details: `docs/roadmap.md` P-43.

#### R4 · The way out

- [ ] **CL-73** **R4 · P-52.** The boat comes in: flares at the dock, a horn, a boat with a lamp sliding in during the
  last push. After GB-85. Details: `docs/roadmap.md` P-52.
- [ ] **CL-74** **R4 · P-86.** Docs/story.md: The Signal's bible (D-44), the relay's twenty lines, the survivors'
  lines, what each place says. Details: `docs/roadmap.md` P-86.

#### R5 · Named nights and bigger systems

- [ ] **CL-75** **R5 · P-63.** Survivor figures: unarmed, by the camp fire, then by the HQ. Details: `docs/roadmap.md`
  P-63.
- [ ] **CL-76** **R5 · P-57.** Fog Night's fog: about 30 m, goggles or not; the night keeps its music arc. After
  GB-87. Details: `docs/roadmap.md` P-57.
- [ ] **CL-77** **R5 · P-58.** Fog Night's own sectioned score. After CL-76. Details: `docs/roadmap.md` P-58.
- [ ] **CL-78** **R5 · P-67.** The guardian boss on the studio rig and clips (D-55). After CL-62. Details:
  `docs/roadmap.md` P-67.
- [ ] **CL-79** **R5 · P-94, P-69.** The secret quest's spec, docs/specs/secret-quest.md, for Jerry's yes (D-56).
  After CL-74. Details: `docs/roadmap.md` P-94, P-69.
- [ ] **CL-80** **R5 · P-95.** The secret's world: the pit stones pulse in order at night, seen from the tower; the
  lake goes quiet. After CL-79. Details: `docs/roadmap.md` P-95.
- [ ] **CL-81** **R5 · P-68.** The kick-free gets a real let-go beat in the studio. After GB-78; after CL-62. Details:
  `docs/roadmap.md` P-68.

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
| Orders, decisions, queues | `crew/BOARD.md` (this file) | Claude, Jerry |
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
