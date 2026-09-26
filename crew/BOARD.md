# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-26, 02:40 UTC, by Claude.

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

## Mission

**Scenes: two bodies, one moment (D-41).** Jerry, 2026-09-26 ~04:30Z: looking at the studio's guardian, he thinks the
trouble was less the animation than where the limbs meet on the grab, and the speed and movement, and the strips can't
show that because they draw the guardian alone, in place. So the studio learns scenes: one data file that says who is
in a moment, what each plays, what holds what, how they travel and what to check; the studio renders it and the game
plays the same file. Built to be reused scene to scene (the pit's arm, the throw, a zombie grab, the tower climb), not
as a one-off. The guardian's grab and drag are the first scene (CL-64), then Jerry's notes. The studio mission before
this one closed with all 8 tasks in.
Work your queue top to bottom; a task that says "after XX-n" waits for it.
- **Claude** · CL-63 · handoffs/2026-09-26-claude-CL-63.md
- **Cursor** · CU-46 · handoffs/2026-09-26-cursor-CU-46.md
- **Claude** · CL-64 · handoffs/2026-09-26-claude-CL-64.md

## Waiting on

The panel's "Right now" box draws this. Claude keeps it current: one line for each thing that
others can't go on without, as `- **<who>** · <task> · waiting: <agents>`. A line whose task
ids are all ticked [x] drops off the panel by itself. The panel also works out waits it can see:
a card blocked on another agent, and a next task that says "after the split" or "after XX-n".

- **Cursor** · CU-46 the studio renders scenes · waiting: Claude (CL-64)



## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat. The older ones (the showcase and
before) are in `crew/archive/board-queues-2026-09-26.md`.

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

Each agent's open work. `[ ]` to do, `[>]` in progress, `[x]` done, `[!]` blocked, `[~]` parked. Jerry cleared
the finished work on 2026-09-26 (the studio and everything before it): it is word for word in
`crew/archive/board-queues-2026-09-26.md`, and the older queues in `crew/archive/board-queues-2026-09-24.md`.

### Cursor — integration, git, tools, engine core (Grok 4.7)

- [x] **CU-46** **First. The studio renders scenes (D-41).** After CL-63. `node tools/studio.mjs scene
  <scene.json>` into `review/<scene name>/vN/`: every actor drawn (the marine as the `marine` rig, not the scale
  post), the camera following the scene's middle so the travel shows, a strip of side-on tiles plus a top-down row
  (the path and where each actor is), and the video (real speed, quarter speed; side, then the game's camera). Mark
  a tile red where `studio/scene.js` flags a check (hold gap, foot slide, speed out of range) and put the worst of
  each in `stats.json`. The player does the maths (`createScene`, `seek`, the `checks` it returns); the renderer
  only draws. Unchanged scene, no new version.

### Grokbot — combat

Nothing queued.

### ChatGPT — what the player reads and decides (GPT-ASTRA 6, High)

Nothing queued.

### Antigravity — the crew's eyes (Gemini 3.1 Pro)

Nothing queued.

### Claude — lead; the world and wildlife (Opus 5.5)

- [x] **CL-63** **First. Scenes (D-41): the format, the marine rig, the scene player.** `docs/studio.md` §9 (the
  `dw-scene/1` format), the marine registered as a rig (`studio/marine.js`: a stand-in built with the game marine's
  joint offsets, plus `adopt` for the game's own marine), and `studio/scene.js`: actors on paths with keyed speed,
  holds (reach, tow, lift), stride-matched clip rates, per-frame checks (hold gap, planted-foot slide, speed), seek
  for the renderer. Unit tests. A demo scene the renderer can use until CL-64's.
- [ ] **CL-64** **The guardian's grab and drag as the first scene; the game plays it.** After CU-46. The catch in
  beats you can see (pounce, catch, pull down) instead of all in 0.45 s; the hand held on the marine's real ankle;
  a heavy haul at a believable speed with the steps matched to it; the marine towed on his back, his leg lifted by
  the hand. `review/guardian-grab-drag/`, then the game's cave drag switched from its hand code to the scene.
  Then Jerry's notes.
- [ ] **CL-62** **The rest of the guardian through the studio.** After CL-64. The chase, the walk-out and the throw
  as scenes and clips the same way (the throw is a scene: the marine is in it), timed against the UAL references,
  one review folder each, until Jerry's notes say good.

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
