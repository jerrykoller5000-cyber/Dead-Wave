# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-24, 05:00 UTC, by Claude.

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

Where each of you is (2026-09-24, 05:00 UTC). **Phase 1 of the new plan (D-19, `docs/plan.md`): make it feel right.** Antigravity is out of usage for a few hours; his tasks wait for him.

| Agent | Now / start with | Then |
| --- | --- | --- |
| Cursor | CU-14 commit GB-21 and GP-13, then CU-15 megaswarm and an honest FPS counter | CU-16 measure the day-5 fight and the build hitch |
| Grokbot | GB-22 take out the death replay | GB-23 the .45, GB-24 mortar camera, GB-25 the cave proposal |
| ChatGPT | GP-14 take out Watch again, GP-15 ranger cache Search | GP-16 Ready panel, GP-17 Ember Night, GP-18 restock buttons |
| Claude | CL-21 music, part 1 | CL-17 caves in fog, CL-18 puddles, CL-19 railings, CL-20 the pit |
| Antigravity | out for a few hours | AG-9 real-GPU numbers after CU-15, then AG-7b, AG-8 |

## Waiting on

The panel's "Right now" box draws this. Claude keeps it current: one line for each thing that
others can't go on without, as `- **<who>** · <task> · waiting: <agents>`. A line whose task
ids are all ticked [x] drops off the panel by itself. The panel also works out waits it can see:
a card blocked on another agent, and a next task that says "after the split" or "after XX-n".



## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat.

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
  - **Cursor commits finished work at the end of each of his own tasks.** That means
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

- [>] **CU-14** Commit what landed after CU-13: GB-21 (`index.html`, t56) and ChatGPT's GP-13 recheck
  (`ui/replays.browser.mjs` and his reports). Small: do it first.
- [ ] **CU-15** An honest FPS counter and a `megaswarm` benchmark. Jerry spawned 500 zombies and the
  counter said 20 FPS when it felt like 4. (a) The counter reports from real frame times: the
  average over the last second, the 1% low and the worst frame, and it counts hitches over 50 ms.
  (b) A `megaswarm` command in the debug console that spawns 500 zombies around a fixed spot
  with a fixed seed: the all-out-chaos benchmark. It goes past `MAX_ZOMBIES` on purpose; ask
  Grokbot for a spawn path that allows it. (c) `tools/bench.mjs` runs megaswarm for 30 s and
  prints the four numbers, so anyone can compare before and after a change.
- [ ] **CU-16** Measure, don't fix: after CU-15, profile a day-5 fight and placing base-build pieces
  (Jerry: 45 FPS, down to 30 with big hitches). Report the top costs per frame with numbers, and
  what causes each hitch (a guess to check: the zombies' pathfinding being rebuilt on every
  placement). Claude decides the fixes from your report.
- [ ] **CU-5** Phase 1 core: the collider grid, the on-screen error card, a save at the start of
  each day. After CU-16.

### Grokbot — combat

- [ ] **GB-22** Take out the death replay (D-20): the four replay helpers, the `scripted-death-replay`
  event and the replay path in the scripted kill. The live cave and pit deaths stay exactly as
  they were. Retire t56 with a one-line reason in its header, and check t36/t37 still pass.
- [ ] **GB-23** The pistol gets its own ammo, .45 (it shares the Uzi's today). Its own ammo pack
  and price; tell ChatGPT the id for the kiosk and the strings.
- [ ] **GB-24** The mortar camera: zoomed in while the arc points back at the marine, the camera
  freaks out. Find it and fix it, with a test.
- [ ] **GB-25** A proposal only, in `handoffs/requests.md`: shooting into a cave. Jerry wants the
  guardian to run out after you. What comes out, how far it chases, whether it can die, how it
  goes back, and the screech (the sound is Claude's; say when it should play). Claude decides.

### ChatGPT — what the player reads and decides

- [ ] **GP-14** Take out Watch again and the catalogue tile buttons (D-20), with their strings and
  tests. After GB-22, or together: the page must not call a helper that's gone.
- [ ] **GP-15** Bug: after clicking Search on the ranger cache, the marine is stuck until you click
  Stop tracking. Find it (the hold and the tracking may be fighting; bring Cursor in if it's the
  CU-11 interaction), fix it, test it.
- [ ] **GP-16** The Ready panel sometimes overlaps the killstreak. Move it into the left panel with
  Dead-Wave and health, so the center of the screen stays clear.
- [ ] **GP-17** Blood Moon is now **Ember Night** in every string the player sees: HUD, briefing,
  banners, the wave preview. The code's own names (`bloodMoon`) can stay.
- [ ] **GP-18** In the kiosk, a Restock button next to each weapon's Buy that fills just that gun's
  ammo, plus Restock all. (The full kiosk cleanup is phase 2.)

### Antigravity — the crew's eyes (model: see its card)

Out of usage for a few hours (Jerry, 2026-09-24). Nobody waits on these.

- [ ] **AG-9** Real-GPU numbers on Jerry's machine after CU-15: `tools/bench.mjs` (megaswarm), a
  day-5 fight, and placing ten build pieces. The counter's four numbers for each. Report to Cursor
  and Claude.
- [ ] **AG-7b** The GP-7 prep checklist again: Play, wait until `body` no longer has `deploying`
  (the landing), then check the goals and tick them (bank, ammo, repair, alarm). Report to
  ChatGPT.
- [ ] **AG-8** The pit's rune ring on a real GPU (CL-14): the `pit` view, from the bank, and from
  overhead. Compare with `qa/shots/cl14/`. Report to Claude.

### Claude — lead; the world and wildlife

- [ ] **CL-21** Music, part 1 (D-21, `docs/audio/cue-sheet.md`): the fight music starts on the
  alarm with `sting_alarm`, jumps to the track's hit point, escalates by tiers, holds until the
  last zombie dies, then `sting_clear` and the aftermath. The corny `fight_*` tracks leave the
  pools. Built so Jerry's Suno files drop in as they arrive.
- [ ] **CL-17** Cave mouths show as sharp black spots from the air, at night and in Ember Night: the
  cave interiors most likely ignore the fog. Fade them with it.
- [ ] **CL-18** Puddles come out as half circles: probably laid flat on sloping ground, so the
  downhill half is under the terrain. Fit them to the ground.
- [ ] **CL-19** The watchtower's railings don't stop the marine: give them colliders.
- [ ] **CL-20** The pit: the tentacles show from outside the water before the cutscene. Keep them
  hidden in the hole until it starts, and send bubbles up over the hole. (The rumble comes with
  the music and sound work.)
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
