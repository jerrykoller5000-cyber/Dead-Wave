# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-25, 03:55 UTC, by Claude.

This is the one place to look before you work. `AGENTS.md` has the rules and the check-in
steps; this board has what to work on and what has been decided. **Claude (lead) and Jerry
edit this file.** The one exception: each agent ticks the box of its *own* tasks, which
`crew.mjs in` (▶) and `crew.mjs out --done` (✓) do for you. Everyone else reports through
their check-in card, `crew.mjs note`, their handoff note, and `handoffs/requests.md`.

Live view for Jerry: double-click `crew/Open Crew Panel.bat`. In a terminal:
`node crew/crew.mjs`.

**Told to "check in with the crew work board and complete your tasks"?** This is the board.
1. Read `AGENTS.md` if you haven't this session. It has the rules, and its "Every session"
   steps say exactly how to check in, post notes and check out.
2. Run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`, `grokbot`,
   `antigravity`) for your
   first task, or read your queue below.
3. Work the queue top to bottom, one check-in and one handoff per task, until it's empty or
   you're blocked. Don't stop to ask Jerry whether to continue.

## Mission

**Fix day 1.** Jerry, 2026-09-25 02:25Z: fix every problem the audit found, and make day 1's music and stingers as good as they can be.
Every task below comes from the day-1 audit (`handoffs/audit-day1/PLAN.md` has the merged list and where each one came from). Work your queue top to bottom; a task that says "after XX-n" waits for it. Jerry's decisions are D-28 to D-32.
- **Grokbot** · GB-39 · handoffs/2026-09-25-grokbot-GB-39.md
- **Grokbot** · GB-40 · handoffs/2026-09-25-grokbot-GB-40.md
- **Grokbot** · GB-42 · handoffs/2026-09-25-grokbot-GB-42.md
- **Grokbot** · GB-43 · handoffs/2026-09-25-grokbot-GB-43.md
- **Grokbot** · GB-44 · handoffs/2026-09-25-grokbot-GB-44.md
- **Grokbot** · GB-45 · handoffs/2026-09-25-grokbot-GB-45.md
- **Grokbot** · GB-47 · handoffs/2026-09-25-grokbot-GB-47.md
- **Grokbot** · GB-46 · handoffs/2026-09-25-grokbot-GB-46.md
- **Cursor** · CU-28 · handoffs/2026-09-25-cursor-CU-28.md
- **Cursor** · CU-29 · handoffs/2026-09-25-cursor-CU-29.md
- **Cursor** · CU-30 · handoffs/2026-09-25-cursor-CU-30.md
- **Cursor** · CU-31 · handoffs/2026-09-25-cursor-CU-31.md
- **Cursor** · CU-32 · handoffs/2026-09-25-cursor-CU-32.md
- **Cursor** · CU-33 · handoffs/2026-09-25-cursor-CU-33.md
- **Cursor** · CU-35 · handoffs/2026-09-25-cursor-CU-35.md
- **Cursor** · CU-34 · handoffs/2026-09-25-cursor-CU-34.md
- **ChatGPT** · GP-31 · handoffs/2026-09-25-chatgpt-GP-31.md
- **ChatGPT** · GP-32 · handoffs/2026-09-25-chatgpt-GP-32.md
- **ChatGPT** · GP-33 · handoffs/2026-09-25-chatgpt-GP-33.md
- **ChatGPT** · GP-34 · handoffs/2026-09-25-chatgpt-GP-34.md
- **ChatGPT** · GP-35 · handoffs/2026-09-25-chatgpt-GP-35.md
- **ChatGPT** · GP-36 · handoffs/2026-09-25-chatgpt-GP-36.md
- **Claude** · CL-41 · handoffs/2026-09-25-claude-CL-41.md
- **Claude** · CL-45 · handoffs/2026-09-25-claude-CL-45.md
- **Claude** · CL-42 · handoffs/2026-09-25-claude-CL-42.md
- **Claude** · CL-43 · handoffs/2026-09-25-claude-CL-43.md
- **Claude** · CL-47 · handoffs/2026-09-25-claude-CL-47.md
- **Claude** · CL-44 · handoffs/2026-09-25-claude-CL-44.md
- **Claude** · CL-46 · handoffs/2026-09-25-claude-CL-46.md
- **Claude** · CL-48 · handoffs/2026-09-25-claude-CL-48.md

Then: Cursor plays day 1 again on Jerry's GPU (CU-35, Antigravity's job while it's out of usage), and Jerry plays it.

## Waiting on

The panel's "Right now" box draws this. Claude keeps it current: one line for each thing that
others can't go on without, as `- **<who>** · <task> · waiting: <agents>`. A line whose task
ids are all ticked [x] drops off the panel by itself. The panel also works out waits it can see:
a card blocked on another agent, and a next task that says "after the split" or "after XX-n".

- **Claude** · CL-41 the next prep starts after the finisher · waiting: ChatGPT
- **Grokbot** · GB-43 day 1's first fight at the nearest POI · waiting: ChatGPT



## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat.

- **2026-09-25, 03:30Z · Antigravity is out of usage for tonight.** Its work goes to another agent: the
  day-1 replay on Jerry's GPU (was AG-17) is now Cursor's CU-35. AG-16's shots are in; Claude reviewed them.

- **2026-09-25, 02:25Z · Fix day 1.** Jerry read the plan. Fix all the other problems the audit found too,
  and make the day-1 stingers and music as good as possible. His answers:
  1. The sky follows the loop: day in prep, the alarm brings night, the clear brings dawn. D-28.
  2. Day 1 is **15** zombies: half pop up out of the ground, half come from the cave. D-29.
  3. No saves: remove the morning save; every Play is a fresh run. D-30.
  4. Ways to die carry over between runs (a lifetime collection). D-31.

- **2026-09-25, 01:35Z · The day-1 audit.** Claude improves the crew panel. Then every agent, Claude
  included, audits day 1 and turns the problems in to Claude. Claude reads them all, makes a plan,
  and brings it to Jerry. See **Mission** at the top.

- **2026-09-25, 01:15Z · Git is shared.** Jerry overrides AGENTS.md rule 6: Claude may now commit
  and push too, not only Cursor. D-27.

- **2026-09-24, 22:52Z · Jerry played it.** No screen control tonight: he is at the machine until 23:00 local. Work in files only.
  1. No skip on the splash (`openingSkip`, and Esc). GP-27.
  2. Keep the zoom on the last zombie. Take off the zoom onto the marine's face. CL-33. It replaces the last 30% of CL-31.
  3. The guardian still does not chase. He comes out only if you shoot into the cave and you are within 20 m. He is too fast to run from. On a leg grab, the camera follows him dragging the marine to the cave, then the thrown-out cutscene plays. That path does not use the crawl-in snatch. GB-35, revises D-25.
  4. A fresh playthrough still shows unlocked deaths on the tombstone. The collection is `tt_death_log` in localStorage, so it survives a new game. CU-24.
  5. Play again after a cave death started on day 2. The morning save (`tt_day_start`) resumes on Play. A death's Play again is a new run at day 1. CU-25.
  6. A gun you buy comes with full ammo. Starting spare capacity is ×1.4. Jerry confirmed that wording. GB-36.
  7. Take the old fight beds out. Keep the stingers. Replace the fight music with a loopable chiptune arrangement of Jerry's Suno fight tracks, so it sits with the game's existing tune. Do not delete the Suno files until the new loops are in. CL-34.

- **2026-09-24, 09:20Z · Jerry's last orders before sleep.** A restore point before anything else
  (CU-23). Alarm: rumble and camera shake for three seconds. Fight music: after the alarm sting, a
  10 s fade from 0% to 50%, then distance takes over. The wave finisher: a 360 around the last
  zombie for 70% of the relief sting, then a slow pan and zoom onto the marine's face for the last
  30%. The knife is far too strong. Shooting into a cave brings out the **immortal** cave thing,
  racing out and dragging you in by the leg: the cave cutscene plays (D-25, replacing D-22's
  fightable guardian). Give the marine a detailed face, and more detail on his face covering.
  Claude has screen control to keep the IDEs moving: routine approvals inside the project only.

- **2026-09-24, 09:10Z · The night shift.** Jerry is asleep; Claude is taskmaster until morning. Horde
  sizes stay as they are: balance through skulls and other levers instead (GB-29, GP-25 are
  proposals for Jerry to decide on). Wave music by day (CL-27): days 1-2 day skirmish B, 3-7 day
  skirmish A, 8-11 Tier 1, 12-15 Tier 2, 16+ Tier 3; special nights keep their day's track until
  they're built.

- **2026-09-24, 05:00Z · The new plan.** Jerry played the game and wrote his notes; he and Claude
  agreed the plan in `docs/plan.md` (D-19). The test for everything is **flow**: no new systems
  until the ones we have work well. Phase 1 is on the board. Jerry is making the music in Suno
  from `docs/audio/cue-sheet.md`. Day fights stay (guarded POIs and small daytime waves); night is
  the horde. The tutorial is skippable and remembered. Blood Moon becomes **Ember Night**.

- **2026-09-24, 04:35Z · The board is cleared.** Antigravity is out of usage for a few hours and
  the rest of the crew has reached its stopping point. Every task is off the board (kept in
  `crew/archive/board-queues-2026-09-24.md`). Jerry plays the game and takes notes; then he and
  Claude make a new plan with new tasks. Start nothing until then.

- **2026-09-24, 03:55Z · A good stopping point.** Jerry is re-assessing the game after work, and
  then he and Claude set the future vision: goals we can actually reach, and where the game goes.
  So: finish only what the "Where each of you is" table lists for you, then check out and start
  nothing new. Cursor goes last (CU-13): commit everything, run the full `npm test`, push, and
  put the commit and the numbers in his handoff. Anything else on the board waits for the new plan.

- **2026-09-24 — Antigravity now runs on Claude Sonnet 4.6, and every check-in names its
  model** so everyone can track who is running what (D-14).

- **2026-09-23 — OpenCode leaves the crew.** Jerry doesn't think it will help much with this
  project. Its finished work stays (OC-1 to OC-3); its standing job goes back to Cursor (D-10).

- **2026-09-23 — Two new crew members.** OpenCode (Nemotron 3.5 Lightning, in a terminal) and
  Antigravity (Gemini 3.8 Flash, in an editor with a browser). They lighten everyone's
  load. Give each the work that fits it, and keep them away from what their models do
  badly (D-9).
- **2026-09-23 — Work together better, and let Jerry see what is actually happening.** After the
  first round on the board: the crew keeps going down its queues without stopping to ask Jerry,
  posts progress as it goes, and the panel shows it (D-6, D-7).
- **2026-09-23 — The crew board.** Every agent checks in here before working and checks out
  with a report when done. Jerry talks to Claude; Claude updates this board; each agent picks
  up its next task from its queue below.
- **2026-09-23 — Cursor now runs on Grok 4.7.** Same name, same role, same files. Cursor, read
  your card in `crew/status/cursor.md` and the decisions below before starting; nothing from
  your earlier sessions is in your memory.
- **2026-09-23 — The order of work** (from the Crew Plan; step 2 is updated by D-2 below):
  1. Foundation: vendor three.js, the shot rig and `npm test` are done; the split is next.
  2. Load time: the title screen within 15 s cold and 5 s warm.
  3. Read the threat: wave previews, cave warnings, enemy roles.
  4. Teach the loop: the first-minute coach, one vocabulary, dead settings removed, honest loading.
  5. Reasons to leave the cabin: objectives and caches at the landmarks.
  6. A world that reacts: felled trees block lanes, the river slows zombies.
  7. Things work as they look: floors, stairs, bridges, cover, a save each day.
  8. Showcase: the guardian night, replays of the scripted deaths.

## Decisions

Claude's calls as lead. They stand unless Jerry overrides them. Newest first.

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
  checks in by hand, writes the same. Antigravity is on Claude Sonnet 4.6 from now on. D-9's
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

Phase 1 of `docs/plan.md`: make it feel right. The earlier queues are in
`crew/archive/board-queues-2026-09-24.md`. `[ ]` to do, `[>]` in progress, `[x]` done, `[!]` blocked,
`[~]` parked.

### Cursor — integration, git, tools, engine core (Grok 4.7)

- [x] **CU-28** **S1 for the suite (CU-A1).** The test page dismisses the splash once `window.TT` exists
  (`DWOpening.dismissForTesting()`), so t60 and t61 run again. Then the whole suite on Jerry's PC.
- [x] **CU-29** The 373 ms stall on the day-1 last kill (AG-A6). Profile it on Jerry's GPU (`tools/cpu-profile.mjs`
  around `beginWaveFinisher` / `startPrep`), fix your part, hand Claude the rest.
- [x] **CU-30** Load and shell (CU-A3, CU-A7): warm and cold title times on Jerry's GPU against 5 s / 15 s, and the
  title menu's 45 fps (the live pre-roll, AG-15). A favicon, so the two 404s go.
- [x] **CU-31** **D-30 and D-31.** Take out the morning save (`writeDayStart`, `loadDayStart`, `clearDayStart`,
  `tt_day_start`) and its tests (check out with `--review`). Stop clearing `tt_death_log` on a new game.
- [!] **CU-32** Scratch files (CU-A8): ask each author with `crew.mjs request`, then remove what they OK
  (rule 3). Claude says yes to anything of his.
- [x] **CU-33** The death screen after a real death, not the dev `rip` (CU-A9). Fix it if it doesn't show.
- [x] **CU-35** (was AG-17; Antigravity is out for tonight) After CL-43, GB-44 and GP-34: play day 1 twice on Jerry's
  GPU from a fresh profile (survive; die and Play again), with Antigravity's own harness: `qa/run-ag15.mjs` and
  `qa/run-ag15-deep.mjs` (hardware GPU over CDP, see `qa/README.md`). Time the alarm to first contact and the wave from
  first shot to last kill. Fps at the menu, prep, the wave and the finisher. Shots of every step, and of the day-1
  assault cave at night during the wave (the alarm brings real night now, D-28), NVGs off and on, for Claude's CL-48.
  Report `qa/2026-09-25-CU-35.md` plus the handoff; shots in `qa/shots/2026-09-25-CU-35/`. You may write in `qa/` for
  this. Say plainly what you couldn't check.
- [>] **CU-34** After CU-35: full `npm test` on Jerry's PC, commit and push everything checked out, numbers in
  your handoff.
- [x] **CU-27** Day-1 audit → `handoffs/audit-day1/cursor.md`. Audit only: change no game code. The how and the report format are in `handoffs/audit-day1/README.md`. Look at all of day 1, but go deepest here: the full `npm test` (every
  failure: test name and first error line; the panel says 35 fail), boot and load time cold and warm
  against the budget, every console error and warning in a day-1 run, saves and resume (`tt_day_start`,
  `tt_death_log`, Play again, quit and come back), a CPU profile of the day-1 wave (`tools/cpu-profile.mjs`),
  and scratch files left in the repo (`crew/_gb16_*`, `tools/_f*.txt`, `gen-ag9.*`...). Check in with
  `--touch "handoffs/audit-day1/cursor.md"`.
- [~] **CU-26** (parked by D-32: day-1 fps is fine on the 5080) Profile a day-1 firefight on the pistol, the uzi and the flamethrower (`tools/cpu-profile.mjs`): the top
  costs per frame, and what the draw calls are. Hand the list to Claude and Grokbot.
- [x] **CU-25** Play again after a death starts on day 1. The morning ledger (`tt_day_start`) currently
  resumes on Play, so a cave death came back as day 2. A death's Play again is a new run. Quitting
  to the menu already clears the ledger. Do not resume it from Play again.
- [x] **CU-24** A fresh playthrough shows a locked tombstone. `tt_death_log` in localStorage is a
  lifetime collection, so old deaths stay unlocked. Clear it when a new game starts.
- [x] **CU-23** Do this first: a restore point. Commit and push exactly what's on disk now, with the
  message "Restore point before the night shift (Jerry, 2026-09-24)". Put the commit hash in your
  handoff so anyone can get back to it.
- [x] **CU-19** The bench's build scenario placed 0 walls (AG-9b: `beginPlaceClick` without
  `commitBuildDrag`). Fix it, and make the numbers an average over the run's last 10 s, not the last
  second. Tell Antigravity (AG-9c).
- [x] **CU-20** Measure (D-23): count the scene's objects, visible meshes and draw calls by kind
  (terrain, trees, props, buildings, zombies and their parts, particles, decals, UI sprites) in
  megaswarm and in a day-5 fight. A table in your handoff. No fixes.
- [~] **CU-21** (night shift over; parked 01:40Z) Through the night: commit finished work every hour or so (only what's been handed
  off; never half-done work), with the handoff names in the message.
- [~] **CU-22** (night shift over; parked 01:40Z) Before morning (about 13:00 UTC): full `npm test`, commit, push, and the numbers in
  your handoff for Jerry. t60/t61 now unmute before they start; if they still fail, paste the first
  failing line.
- [x] **CU-14** Commit what landed after CU-13: GB-21 (`index.html`, t56) and ChatGPT's GP-13 recheck
  (`ui/replays.browser.mjs` and his reports). Small: do it first.
- [x] **CU-15** An honest FPS counter and a `megaswarm` benchmark. Jerry spawned 500 zombies and the
  counter said 20 FPS when it felt like 4. (a) The counter reports from real frame times: the
  average over the last second, the 1% low and the worst frame, and it counts hitches over 50 ms.
  (b) A `megaswarm` command in the debug console that spawns 500 zombies around a fixed spot
  with a fixed seed: the all-out-chaos benchmark. It goes past `MAX_ZOMBIES` on purpose; ask
  Grokbot for a spawn path that allows it. (c) `tools/bench.mjs` runs megaswarm for 30 s and
  prints the four numbers, so anyone can compare before and after a change.
- [x] **CU-16** Measure, don't fix: after CU-15, profile a day-5 fight and placing base-build pieces
  (Jerry: 45 FPS, down to 30 with big hitches). Report the top costs per frame with numbers, and
  what causes each hitch (a guess to check: the zombies' pathfinding being rebuilt on every
  placement). Claude decides the fixes from your report.
- [x] **CU-17** Antigravity's AG-9 could only run megaswarm: there's no way in to a day-5 fight or
  to placing pieces. Add both to `tools/bench.mjs` as scenarios (`--scenario day5`, `--scenario
  build`): set the day, start the wave, and place ten pieces through the real placement path, then
  print the four numbers. Tell Antigravity the commands (AG-9b).
- [x] **CU-18** Measure, don't fix: megaswarm ran at 1.6 fps on Jerry's GPU (worst frame 634 ms, 58
  hitches). Take a CPU profile of it (the DevTools Profiler over CDP works headless) and report
  the top functions by self time, and how the frame splits between the zombie update, physics,
  and drawing. Claude decides the fixes from it.
- [x] **CU-5** Phase 1 core: the collider grid, the on-screen error card, a save at the start of
  each day. After CU-16.

### Grokbot — combat

- [x] **GB-39** **S1 (GB-A1).** Fighting the wave at its own cave mouth must not poke the cave: no poke from the
  wave's assault caves while it is spawning or its zombies are in the mouth, and a round that hits a zombie
  doesn't count. t59 keeps passing.
- [x] **GB-40** **D-29.** Day 1 is 15: 7 or 8 claw up out of the ground in the treeline 35 to 60 m from the HQ, out of
  the camera's view and never within 25 m of the marine; the rest walk out of the day's cave. No cave role for
  day-1 shamblers. Don't spawn a zombie on top of a marine standing at the mouth (GB-A7). Update the wave
  preview (`total`) so the briefing says 15.
- [x] **GB-42** Day-1 skulls you can see and keep (GP-A1, GB-A3), with ChatGPT (GP-33): no 8-value pooling on day 1, so
  the first kill drops a skull; skulls don't expire while the wave is on; at the finisher the unpicked ones fly
  to the marine.
- [x] **GB-43** D-32: two or three shamblers at the POI nearest the HQ on day 1, standing guard until you come.
  A normal kill with normal skulls. Tell ChatGPT the POI for the coach line (GP-35).
- [x] **GB-44** D-32 revises D-26: the first cave poke of a run is only a warning (the screech, the eyes, a camera
  nudge); the second one within 20 m comes for you. The chase goes round static props and crashes through builds
  instead of passing through them (GB-A6, GB-A8). t59 updated, `--review`.
- [x] **GB-45** Your seven probe checks (t0, t1, t2, t3, t4, t6a, t8) each get one or two real assertions on what they
  already print (GB-A9).
- [x] **GB-47** t71 fails on the live game: it counts GB-43's day-1 POI guards with the wave ("14 kills, 14 skulls
  on the ground (16/16)", "bag +15 skulls (17)"). Make t71 leave the guards out, or clear them first; don't loosen
  what it checks about the wave. `--review`.
- [x] **GB-46** Builds and turrets are yours: the four odd things GB-45's probes print. For each one, fix it if it's a
  bug, or assert it if it's meant; say which in the handoff. (1) t8 never starts a match (the Play click has no
  callsign), so its wave part tests nothing. (2) t2/t4: every aimed placement comes back valid=false placed=0, and
  t4's aim lands one cell off (0,-3 for dz -4); check it in a started match, not idle. (3) t1: `placeRefusalFor('light')`
  on the platform cell says "that is the cabin", but `placeBuildAt('light')` puts it on the ground, not the deck.
  (4) t3: turrets land at lv0 on platform-topped cells, and a railing on wall+floor is refused although a floor is
  there. Don't touch the cabin or the world. `--review`.
- [x] **GB-38** Day-1 audit → `handoffs/audit-day1/grokbot.md`. Audit only: change no game code. The how and the report format are in `handoffs/audit-day1/README.md`. Look at all of day 1, but go deepest here: the wave director's day-1 plan
  (how many, which kinds, when), zombie behaviour (stuck, bad paths, spawning in view, clumping), the
  starting weapons and ammo (feel, damage, reloads, the knife), building and turrets, the cave guardian
  rules (D-26), how you die and the finisher trigger, and the difficulty against `docs/specs/difficulty.md`.
  Check in with `--touch "handoffs/audit-day1/grokbot.md"`.
- [~] **GB-37** (parked by D-32: AG-15 measured 58.8 fps with the flamethrower on the 5080) FPS drops in firefights, worst with the flamethrower (Jerry). In `updateFlameStream`: draw the
  blobs as one InstancedMesh per stage material (up to 140 meshes are 140 draw calls today); gather the trees
  near the player once per frame instead of testing every blob against all 430 trees; pool the ground
  fires and their meshes. Bench before and after (`tools/bench.mjs`), then AG-14.
- [x] **GB-35** The guardian chase, revising D-25. He comes out only when a shot goes into the cave
  and the marine is within 20 m. He comes out after the marine at a crazy speed. The player can try to
  run, but the guardian is far too fast to outrun (Jerry, in chat to Claude: "he is way too fast";
  earlier: "he will race out at a crazy speed", D-25). Claude's correction: an earlier copy of this
  line said the marine should gain ground; that was a misreading. On a leg grab, the camera follows the guardian dragging him to the mouth, then the
  thrown-out cutscene plays. This path does not play the crawl-in snatch.
- [x] **GB-36** A purchased gun comes with full ammo. Starting spare capacity is ×1.4 (Jerry confirmed
  the term: not double). Tell ChatGPT if the kiosk needs a new line.
- [x] **GB-34** t34 "thrown in (open)" fails under `--jobs 2` or more and passes alone: fixed waits on a slow
  machine. Poll instead (`until(cond, ms)`, as t60 and t61 now do). Same pass over your other tests with fixed waits.
- [x] **GB-33** t35 "jab lands" fails on its own (not a load flake): 1.1 s after H the MedPen is still
  in hand (health 91, so the heal landed). Fix the test's wait or the pen's timing; say which.
- [x] **GB-32** D-25: a cave poke is the cave grab. Replace the GB-26/27 poked-guardian fight with: the
  hit trigger (as now) plus the player within 45 m and in sight of the mouth → the immortal cave
  thing races out and the cave scripted death plays. Keep once-per-cave-per-day; remove the spawn,
  leash, half cash and retreat. Update t59, and check t36/t37 still pass.
- [x] **GB-31** The knife is far too strong (Jerry). First measure: damage per swing, reach, arc, swing
  speed, how many bodies one swing hits, and kills per second against a day-3 crowd, next to the
  guns. Then propose the fix in your handoff with before/after numbers (Claude approves it), and
  build it with a test.
- [x] **GB-28** Cheaper far zombies (D-23), measured with `node tools/bench.mjs --headless` before
  and after: zombies past ~40 m from the camera don't cast shadows, and their body parts don't
  update matrices they don't need (a far zombie can skip `updateMatrixWorld` on limbs that aren't
  animating). Nothing visible up close; no gameplay change. t5-t10 and t53 still pass.
- [x] **GB-29** A proposal only, for Jerry's morning: difficulty without changing horde sizes
  (Jerry). Per-day speed, health and damage for each zombie type, how many are up at once, and
  the gaps between bursts, days 1-20, so days 1-3 feel like a slow start (Call of Duty Zombies)
  even with 20-100 bodies. Coordinate the reward side with ChatGPT (GP-25). A table in
  `docs/specs/difficulty.md`.
- [x] **GB-30** t35's "9mm restocked" line fails since the pistol moved to .45 (GB-23). If the test is
  yours, update it to the .45; if it's ChatGPT's, leave it (GP-21).
- [x] **GB-22** Take out the death replay (D-20): the four replay helpers, the `scripted-death-replay`
  event and the replay path in the scripted kill. The live cave and pit deaths stay exactly as
  they were. Retire t56 with a one-line reason in its header, and check t36/t37 still pass.
- [x] **GB-23** The pistol gets its own ammo, .45 (it shares the Uzi's today). Its own ammo pack
  and price; tell ChatGPT the id for the kiosk and the strings.
- [x] **GB-24** The mortar camera: zoomed in while the arc points back at the marine, the camera
  freaks out. Find it and fix it, with a test.
- [x] **GB-26** Build D-22: the guardian comes out when you shoot into a cave, with its test (the
- [x] **GB-27** D-22, corrected: pokes also work in prep (daytime exploring), except while a modal
  is open; a poked guardian goes back into the dark when the alarm sounds, not at prep. Add a
  prep poke and an alarm return to t59.
  three-hit trigger, the leash, the return, the two-a-day cap, half cash, no first-blood, and
  the `cave-guardian` event phases). The animation stays as it is for now: that's phase 4.
- [x] **GB-25** A proposal only, in `handoffs/requests.md`: shooting into a cave. Jerry wants the
  guardian to run out after you. What comes out, how far it chases, whether it can die, how it
  goes back, and the screech (the sound is Claude's; say when it should play). Claude decides.

### ChatGPT — what the player reads and decides

- [x] **GP-31** A tracked objective must not hide the kiosk or bank prompt, or the coach, on narrow screens
  (GP-A2, `ui/hud-layout.css`).
- [x] **GP-32** Polish (GP-A7, GP-A8, AG-A7, AG-A8, AG-A9): the kiosk's guns in price order after the owned ones; the death
  list's locked ways as badges, not "????"; the day-clear banner clear of the minimap; the menu footer out of the
  callsign at short heights; the menu block sitting on the cabin wall, not the roof wire.
- [x] **GP-33** The day-1 economy (GP-A1, GP-A5), with Grokbot (GB-42): the coach's first card on the first skull; the
  streak bonus pays what it says (carry the fraction, don't round it away); the kiosk and briefing say what day 1 pays.
  Quit to menu says it ends the run (D-30).
- [x] **GP-34** After CL-41: the dawn card (D-32). After the finisher hands the camera back: kills, skulls picked up,
  best streak this night, one tip, and Continue, which opens tomorrow's briefing. Short, skippable, `ui/strings.js`.
- [x] **GP-35** After GB-43: the coach's first line on day 1 points to the guarded POI ("Shamblers at the <POI>: go and
  clear them"), then the pickup and bank cards follow as now.
- [x] **GP-36** Strings (GP-A9): move the older screens' copy into `ui/strings.js` (the day banners, the alarm, "Wave
  Day", "Zombies left", "Grace", the menu and pause text), and retire `menu.studio` and `legacy.menu.tagline`.
- [x] **GP-30** Day-1 audit → `handoffs/audit-day1/chatgpt.md`. Audit only: change no game code. The how and the report format are in `handoffs/audit-day1/README.md`. Look at all of day 1, but go deepest here: every word and screen a
  first-time player sees on day 1: the menu, loading, the tutorial and coach, the briefing, the HUD,
  objectives, prompts and banners, the kiosk and the day-1 economy (can you afford what day 1 needs?),
  the audio cues' timing, and the dawn summary. Also: copy that is not in `ui/strings.js`, keys nothing uses
  (`menu.studio`, `legacy.menu.tagline`), text that overlaps or gets cut off. Check in with
  `--touch "handoffs/audit-day1/chatgpt.md"`.
- [x] **GP-28** Jerry's browser kept the old `assets/intro/opening.js` (with `skip.onclick`) against the new
  `index.html` (no Skip button): the script threw at line 57, the video ended into nothing, the menu never
  came, though the game (and its music) loaded. Claude reproduced it; Ctrl+Shift+R cures it. Stop it
  happening: version the opening's `<script>`/`<link>` URLs in `index.html` (for example
  `opening.js?v=gp28`) and bump the tag whenever those files change. Also make `opening.js` tolerate a
  missing optional element instead of throwing before it wires `ended`.
- [x] **GP-29** From GB-36: `ui/strings.js` `shop.hint.weapons` still says a bought gun comes with one
  loaded magazine; it now comes with full ammo. Update `ui/restock.browser.mjs` to Grokbot's new numbers
  (his GB-36 handoff has them).
- [x] **GP-27** Take away the splash skip. Remove the Skip button (`openingSkip` in `index.html`,
  wired in `assets/intro/opening.js`) and the Esc skip. The splash plays through. Tests and
  `tools/shoot.mjs` may still dismiss it from code; the player cannot.
- [x] **GP-26** Your browser tests: find fixed waits that assert on timing (fades, panels, prompts) and poll
  instead, so `npm test` passes under `--jobs 3` as well as alone. Report which tests you touched.
- [x] **GP-21** t35 expects the pistol to restock 9mm; since GB-23 it's .45. Update the expectation
  (it's following an approved change, not weakening the test), with Grokbot if it's his.
- [x] **GP-22** The kiosk, phase 2: tabs (Weapons, Ammo, Builds, Gear), and "ammo for the guns you
  own" first, so the player doesn't scroll. Before/after shots.
- [x] **GP-23** The HUD: keep the centre of the screen clear (Jerry). Anything that sits in the middle
  during play and doesn't need to, move it to the edges. Before/after shots at desktop and 390 px.
- [x] **GP-24** A proposal only, for Jerry's morning: the tutorial day. Offered on the first run only,
  Skip always there, the choice remembered, replayable from the menu. What it teaches, in what
  order, with the coach hints you already have. `docs/specs/tutorial.md`.
- [x] **GP-25** A proposal only, for Jerry's morning: balance through skulls, not horde size. What a
  kill pays by type and day, what the kiosk costs, and what a player can afford by the end of days
  1, 3, 5 and 10. With Grokbot's GB-29. `docs/specs/economy-balance.md`.
- [x] **GP-14** Take out Watch again and the catalogue tile buttons (D-20), with their strings and
  tests. After GB-22, or together: the page must not call a helper that's gone.
- [x] **GP-15** Bug: after clicking Search on the ranger cache, the marine is stuck until you click
  Stop tracking. Find it (the hold and the tracking may be fighting; bring Cursor in if it's the
  CU-11 interaction), fix it, test it.
- [x] **GP-16** The Ready panel sometimes overlaps the killstreak. Move it into the left panel with
  Dead-Wave and health, so the center of the screen stays clear.
- [x] **GP-17** Blood Moon is now **Ember Night** in every string the player sees: HUD, briefing,
  banners, the wave preview. The code's own names (`bloodMoon`) can stay.
- [x] **GP-18** In the kiosk, a Restock button next to each weapon's Buy that fills just that gun's
  ammo, plus Restock all. (The full kiosk cleanup is phase 2.)

- [x] **GP-20** When an objective completes, call `AudioSys.musicCue('objective')` (D-21: you say
  what happened, the music owner picks the sound). One line and a check in your browser test.

### Antigravity — the crew's eyes (model: see its card)

- [~] **AG-16** (parked 03:30Z: Antigravity is out for tonight. Its shots are in `qa/shots/2026-09-25-AG-16/`; Claude reviewed them: the NVG-on and fog shots match the plain ones, so the scene wasn't at real night. The night-cave shots move into CU-35.) Shots for Claude (CL-48): the day-1 assault cave from 30 m and 10 m at 22:00, NVGs off and on, and one
  in the fog. Report to Claude.
- [~] **AG-17** (moved to Cursor's CU-35, 03:30Z) After CL-43, GB-44 and GP-34: play day 1 twice on Jerry's GPU from a fresh profile (survive; die and
  Play again). Time the alarm to first contact and the wave from first shot to last kill. Fps at the menu, prep, the
  wave and the finisher. Shots of every step. Say plainly what you couldn't check.
- [x] **AG-15** Day-1 audit → `handoffs/audit-day1/antigravity.md`, shots in `qa/shots/2026-09-25-AG-15/`.
  Audit only: change no game code. The how and the report format are in `handoffs/audit-day1/README.md`. Look at all of day 1, but go deepest here: play day 1 start to finish on Jerry's GPU from a fresh profile, twice: once to survive
  the wave, once dying on purpose and pressing Play again. A screenshot for every problem. Fps at the menu,
  while scavenging, in the wave with the flamethrower held, and in the finisher. Anything that looks wrong,
  confusing, ugly or unfair. Sound: note any cue that doesn't fire or fires at the wrong time (the console and
  `?debug=1` can tell you even without hearing it). This once you write outside `qa/`: your report goes in `handoffs/audit-day1/antigravity.md`.
  Check in with `--touch "handoffs/audit-day1/antigravity.md, qa/shots/2026-09-25-AG-15/"`.
- [~] **AG-14** (parked by D-32) Jerry's GPU: fps in a day-1 wave with the flamethrower held for 10 s, before and after GB-37.
- [x] **AG-13** After CL-33 and GB-35: shots of the finisher staying on the last zombie, and of the
  guardian drag into the thrown-out cutscene. No splash-skip in the player path.
- [x] **AG-9c** The build bench again after CU-19, on Jerry's GPU.
- [x] **AG-10** Shots for Jerry's morning, on his GPU: the wave finisher (the red pulse and the kill
  cam, three frames), the kiosk restock buttons, the Ready panel under health, an Ember Night banner,
  and a cave mouth from the air at night. `qa/shots/2026-09-24-AG-10/`, with one line per shot.
- [x] **AG-12** Shots on Jerry's GPU, for his morning: the new finisher camera (CL-31) at 30%, 60% and 90%
  of the relief sting (orbit, orbit, the marine's face), and the marine's face with no helmet (CL-32):
  front and three-quarter. Compare with `qa/shots/2026-09-24-CL-32/face_before_after.png`. Also the pit's
  bubbles from the shore (CL-20), and the watchtower deck from the ladder top (CL-19).
- [x] **AG-11** Megaswarm and the day-5 fight on Jerry's GPU after GB-28 and after CL-28 land: the
  numbers next to AG-9's.

- [x] **AG-9** Real-GPU numbers on Jerry's machine after CU-15: `tools/bench.mjs` (megaswarm), a
- [x] **AG-9b** The day-5 fight and build-piece numbers, after CU-17 gives you the commands.
  day-5 fight, and placing ten build pieces. The counter's four numbers for each. Report to Cursor
  and Claude.
- [x] **AG-7b** The GP-7 prep checklist again: Play, wait until `body` no longer has `deploying`
  (the landing), then check the goals and tick them (bank, ammo, repair, alarm). Report to
  ChatGPT.
- [x] **AG-8** The pit's rune ring on a real GPU (CL-14): the `pit` view, from the bank, and from
  overhead. Compare with `qa/shots/cl14/`. Report to Claude.

### Claude — lead; the world and wildlife

- [x] **CL-39** Day-1 audit → `handoffs/audit-day1/claude.md`. The world (terrain, water, caves, flora,
  wildlife, night lighting), the music and the audio director, a code read of the day-1 path in
  `index.html`, and the whole day against the flow test in `docs/plan.md`.
- [x] **CL-41** The next prep starts when the finisher hands the camera back, not underneath it: `day += 1`, the banner
  and the prep label move with it (CL-A5, GP-A3). Tell ChatGPT the hook for the dawn card.
- [x] **CL-45** D-28: the sky follows the loop. Prep holds before dusk, the alarm brings the night on, the finisher
  ends in dawn, and the next prep starts in the morning. One "Day n" on the HUD.
- [x] **CL-42** Day 1's song, as good as it can be (CL-A3, CL-A4): re-formed for D-29's closer, shorter fight (the drop at
  contact, the climax by the last few), sections that follow the wave, a seamless loop, and the fight loops played
  through Web Audio.
- [x] **CL-43** Day 1's stingers, as good as they can be: the alarm (now the nightfall too), the relief, the dawn, and
  the cues, re-made in First Blood's voices and levelled against the new song.
- [x] **CL-47** Day 1's calm music in the same voices: the menu and the prep day track, so day 1 is one sound (CL-A9).
- [x] **CL-44** t50: 218 tree meshes against its limit; check it against CL-28 (CU-A2).
- [x] **CL-46** Review the 12 handoffs waiting on me, and close the stale requests (DONE, WONT, LATER) (CL-A10).
- [ ] **CL-48** After CU-35: the caves at night (CL-A8), from its shots during a real night wave.
- [x] **CL-40** After CU-27, GP-30, GB-38 and AG-15: read all five audits, merge them into one list, make the plan,
  and take it to Jerry. The fixes go on the board once he agrees.
- [x] **CL-35** (01:07Z, `handoffs/2026-09-25-claude-CL-35-36-day1-song-stingers.md`) Day 1's own fight song, "First
  Blood" (`fight_day01`, 4:30 loop, 96 bpm half-time, chiptune; `tools/day1.py`, MIDI in `assets/soundtrack/`).
- [x] **CL-36** (same) Chiptune stingers and cues (`tools/stingers.py`).
- [x] **CL-37** (same) Levels: fight music about 5 dB down near and 2 dB far, the day-1 song fades in over 1.5 s,
  flamethrower about 6 dB down. Also Jerry's splash/menu text removals (Caracal eyebrow x2, tagline, footer "Dead Wave").
- [ ] **CL-38** (after CL-42, and Jerry signs off day 1's sound) 20 fight songs, one per day, 4-5 minutes, looping. Waits on Jerry signing off day 1's sound.
- [x] **CL-33** (done 23:03Z: the 360 now spans the whole sting; face push removed; t61 18/0) The finisher keeps the zoom on the last zombie for the whole relief sting. Remove the
  pan and zoom onto the marine's face (the last 30% of CL-31). Jerry: it did not look as good as
  he thought.
- [x] **CL-34** (first pass 23:14Z, `handoffs/2026-09-24-claude-CL-34-chip-fight-loops.md`: five chip loops for the day table; special-night tracks still Suno) Fight music. Take the old fight beds out. Keep the stingers. Make loopable chiptune
  arrangements of Jerry's Suno fight tracks so they sit with the game's existing tune. Do not
  delete the Suno files until those loops are in and playing.
- [x] **CL-29** (`handoffs/2026-09-24-claude-CL-29-31-alarm-fade-finisher-cam.md`) The alarm: a low rumble and camera shake for three seconds when it sounds.
- [x] **CL-30** (same handoff) The fight music after the alarm sting: a 10 s fade from 0% to 50%, then distance
  takes over (50% at 150 m, rising to full at 20 m).
- [x] **CL-31** (same handoff) The finisher camera: a fast 360 around the last zombie for 70% of the relief sting,
  then a slow pan and zoom onto the marine's face for the last 30%. The camera never goes inside
  terrain or walls.
- [x] **CL-32** (`handoffs/2026-09-24-claude-CL-32-marine-face.md`) The marine's face: real detail (eyes, brows, nose, mouth, stubble) for when the helmet
  and mask are off, and more detail on the face covering.
- [x] **CL-27** Wave music by day (Jerry): 1-2 day skirmish B, 3-7 A, 8-11 Tier 1, 12-15 Tier 2, 16+
  Tier 3 (`music.json` `waveByDay`).
- [x] **CL-28** (part 1, `handoffs/2026-09-24-claude-CL-28-freeze-static-world.md`) Freeze the static world (D-23): trees, rocks, props, buildings and terrain stop
  recomputing their matrices every frame. Megaswarm before and after.
- [x] **CL-21** Music, part 1 (D-21, `docs/audio/cue-sheet.md`): the fight music starts on the
  alarm with `sting_alarm`, jumps to the track's hit point, escalates by tiers, holds until the
  last zombie dies, then `sting_clear` and the aftermath. The corny `fight_*` tracks leave the
  pools. Built so Jerry's Suno files drop in as they arrive.
- [x] **CL-17** (`handoffs/2026-09-24-claude-CL-17-caves-in-fog.md`) Cave mouths show as sharp black spots from the air, at night and in Ember Night: the
  cave interiors most likely ignore the fog. Fade them with it.
- [x] **CL-18** (`handoffs/2026-09-24-claude-CL-18-22-puddles-voices.md`) Puddles come out as half circles: probably laid flat on sloping ground, so the
  downhill half is under the terrain. Fit them to the ground.
- [x] **CL-19** (`handoffs/2026-09-24-claude-CL-19-20-tower-rails-pit.md`) The watchtower's railings don't stop the marine: give them colliders.
- [x] **CL-20** (`handoffs/2026-09-24-claude-CL-19-20-tower-rails-pit.md`) The pit: the tentacles show from outside the water before the cutscene. Keep them
  hidden in the hole until it starts, and send bubbles up over the hole. (The rumble comes with
  the music and sound work.)
- [x] **CL-23** Jerry's music in (`handoffs/2026-09-24-claude-CL-23-music-in.md`): all 22 pieces
  converted and wired: tiers, Ember Night, the guardian, day skirmishes, the stings, and cues
  ready for later.
- [x] **CL-24** The music rhythm, Jerry's spec (`handoffs/2026-09-24-claude-CL-24-music-rhythm.md`):
  one track at a time, the alarm sting alone then Tier 1 by proximity, the relief sting alone,
  the briefing halves the music, Jerry's tracks 3x louder.
- [x] **CL-25** The music, tuned by Jerry (`handoffs/2026-09-24-claude-CL-25-music-tuned.md`): 1 s gap,
  60/70/100% by distance, fast fade into the relief sting, no aftermath, day fights by horde size.
- [x] **CL-26** The wave finisher and the fight volume (`handoffs/2026-09-24-claude-CL-26-wave-finisher.md`):
  the last kill of a wave gets a red pulse, the relief sting alone, slow motion and a kill cam.
- [x] **CL-22** (`handoffs/2026-09-24-claude-CL-18-22-puddles-voices.md`) The cave guardian's voice: bind `dw-game` `cave-guardian` (D-22) to a warning
  screech on `aggro`, a roar on `emerge` and a growl on `retreat`, from the mouth's direction.
- [~] **CL-11** Night lighting that stays dark but readable: phase 3.
- [~] **CL-7** The world bake: parked by D-2.

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
