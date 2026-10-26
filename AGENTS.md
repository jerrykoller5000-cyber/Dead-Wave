# AGENTS.md — how the Grave Shift crew works

Every agent reads this first, every session: Cursor, ChatGPT, Grokbot, Claude and
Antigravity. Jerry has the final say. Claude leads.

Jerry moves agents between models, so no model is written into this file. The model each
agent runs on is on its card (`crew/status/<you>.md`) and on the panel, and every check-in
says it (D-14).

- Repo: jerrykoller5000-cyber/Dead-Wave
- Branch: `feature/Phis-changes`
- Folder: `C:\Users\Zero\Desktop\Tiny Trek`

## Every session: check in, work, check out

You won't remember earlier sessions. The crew board remembers for you. Jerry watches it all on
the crew panel, so what you log is how he knows what you're doing.

1. **Look.** Run `node crew/crew.mjs me <you>`. It is your whole briefing: your card and the notes
   you left yourself, Jerry's latest orders, the requests waiting for your answer, your queue, the
   game-test slot, and the commands. `node crew/crew.mjs` (no arguments) shows the whole crew.
   `crew/BOARD.md` has the orders, owners, decisions (one line each; in full in `docs/decisions.md`) and queues.
2. **Answer first.** For each request `me` lists:
   `node crew/crew.mjs reply <you> "<words from its title>" DONE|WONT|LATER|NOTE "<one line>"`.
   It writes your answer under the request in `handoffs/requests.md`. Telling someone something
   rather than asking? Send it with `--fyi` so it doesn't sit on their list.
3. **Check in.** `node crew/crew.mjs next <you>` names your next task. Then:
   `node crew/crew.mjs in <you> <task-id> "<what>" --model "<your model>" --touch "<file (part)>, <file>"`.
   - `--model` is required: the model this session actually runs on, as your editor or app
     names it (for example `"Claude Sonnet 4.6"`). Not sure? Say so: `"unsure (editor says X)"`.
     A new model is logged as a MODEL line, so Jerry can see who ran what.
   - It ticks the task ▶ on the board. A task Jerry gave you in chat (not on the board yet) is
     added under your name on the board by the same command.
   - It refuses if another active agent is already in one of those files. Then wait, or take
     another task. Never work around it.
   - Don't list the shared files (`crew/LOG.md`, `crew/QUESTIONS.md`, `handoffs/requests.md`):
     everyone appends to those.
4. **Work, and say what's happening.** Only in your own files (the table below), and only on
   that task. Whenever you find or finish something, roughly every 10-15 minutes:
   `node crew/crew.mjs note <you> "<one line: what you found or finished>"`.
   That line is what Jerry sees on your card while you work.
   **Game checks** go through the queue (rule 16): `node crew/crew.mjs slot run <you> <task> --checks "<batch>" -- <command>`.
   If your session has to end before your turn: `node crew/crew.mjs wait <you> "<what is ready>"`.
   That tells Jerry's panel "changes ready; waiting for testing slot" and gives him a resume prompt.
5. **Check out.** Write your handoff note in the template below, then:
   `node crew/crew.mjs out <you> --report handoffs/YYYY-MM-DD-<you>-<task>.md --done`.
   - `--done` ticks the task ✓. Leave it off if the task isn't finished.
   - Add `--review "<why>"` if you changed what a test expects, or anything else the lead
     should look at.
   - Stuck? Use `--blocked "<on what>"` instead.
   - Put anything your next session should know in the Notes section of your card. Keep it short
     (a screenful): `me` prints the top of it every session; history belongs in your reports.
6. **Keep going.** Take the next task and go round again. Don't stop to ask Jerry whether to
   continue. Stop only when:
   - your queue is empty, or `crew.mjs next` says your next task waits on someone else's
     (a task that says "after XX-n" can't start until XX-n is ticked);
   - you're blocked; or
   - you need a decision only Jerry can make. **While D-81 stands (Jerry, 2026-10-19: "Cut me out of the loop for
     approval for the time being"), that goes to Claude instead:** `node crew/crew.mjs request <you> claude "<the
     question>" "<the choices and what you'd pick>"`, and work on something else meanwhile; Claude answers it. Only
     his files, money and accounts, publishing outside the repo and his own orders still go to him, with
     `node crew/crew.mjs ask <you> "<the question>"`, which puts it at the top of his panel.

**A new task** (Jerry asks you directly for something that isn't on the board): get its id with
`node crew/crew.mjs newid <you> "<what>"` and use that one; checking in with it puts it on the board. Never make an id up: two jobs with one id
confuse the board and the panel. The same for a new test: take the next `tNNN.js` that is neither in `tools/tests/`
nor named in a LOG IN line, and name it in your own IN line (`touching ... tools/tests/tNNN.js (new)`) so nobody else
takes it (three of them were saved over on 2026-10-05 and 06).

**Asking another agent for something:**
`node crew/crew.mjs request <you> <them> "<title>" "<body>"` (or `--body-file <path>`). It
appends to `handoffs/requests.md` in UTF-8. Don't use PowerShell's `Add-Content`: it mangles
`·` and `→`.

**If you can't run Node,** make the same changes by hand:
- edit your card's header lines, `model:` included;
- append one line to `crew/LOG.md` in its format, with UTC time;
- tick your own task's box on the board.
Claude works that way.

**If you can't run `npm test`,** write "not run" and why under Tests:, and Cursor runs it
before committing (or Claude, when he commits). ChatGPT's runner does not get past Chrome: `CDP timeout: Page.enable`
in `tools/cdp.mjs`, even with one worker. That is his environment, not a failing check.
He writes "not run" and whoever commits runs the suite for him at commit time.

Agent names for the commands: `claude`, `cursor`, `chatgpt`, `grokbot`,
`antigravity`. Task ids: `CL-`, `CU-`, `GP-`, `GB-`, `AG-`.

## Who owns what

The current split (Jerry, 2026-10-15) is on the board under **Who owns what**; in short:

| Agent | Owns | Files |
| --- | --- | --- |
| Claude (lead) | The board and reviews; the marine's body and fabric (blouse, trousers, hats, gloves), his ears; the inspector; the world, the studio and reactions; story | `crew/BOARD.md`, `studio/marine-body.js`, `studio/marine-cloth.js`, `studio/marine-hats.js`, `studio/inspector/*`, `world/*`, `life/*`, `docs/*` |
| Cursor | Integration, git (with Claude, rule 6), tools and the game-test queue, the full suite, engine core; direct fixes from Jerry | the `index.html` shell, `core/*`, `tools/*`, `vendor/*`, `package.json` |
| ChatGPT | Every zombie's look; the marine's fitted helpers, waist and balaclava; what the player reads and decides | `studio/zombie-*.js`, `combat/demon-visual.js`, `combat/zombie-joins.js`, `ui/*`, `game/*` |
| Grokbot | Every weapon (sole owner); combat: the director, builds' behaviour, scripted deaths | `studio/weapon-*.js`, `combat/*` (not the zombie looks) |
| Antigravity | The look of buildables and props; eyes on Jerry's GPU (screenshots and reports) | `index.html` (build meshes), `qa/*` |

A file not in this table: ask Claude before you start. Until the split lands, "files" means the matching sections of `index.html`. Several agents
can work in it at once, one per part: name your part in `--touch`, for example
`index.html (build wheel)`. The check-in refuses a part someone else is in, and the whole file
if you name no part. Rule 4 applies every time you save it. Everyone writes their own
card in `crew/status/`, appends to `crew/LOG.md`, and writes their own handoff notes.

## Rules

1. **Jerry decides; Claude leads.** Priorities, ownership and disputes go to Claude, and
   Claude's call stands unless Jerry overrides it. Orders and decisions are in `crew/BOARD.md` (each decision in full: `docs/decisions.md`).
2. **Touch only your own files.** If you need something from another area, add a request to
   `handoffs/requests.md` addressed to its owner, then carry on with something else.
3. **Never revert, delete or reformat another agent's work,** Philip's included. If you think
   it is wrong, write a request saying why.
4. **Start from the freshest file and never overwrite.** Re-read a file before you edit it.
   Before you save, check it hasn't changed underneath you (modified time or hash). If it has,
   three-way merge onto the new version.
   **Every file is UTF-8 with no BOM; read and write it as UTF-8.** Windows PowerShell's `Get-Content`,
   `Set-Content` and `Out-File` use the system code page by default and turn `·` into `Â·`, `×` into `Ã—` and `—`
   into `â€”`: that happened to all of index.html once (2026-10-06, about 09:09Z) and the HUD showed it to Jerry
   (CL-132). Edit with your editor, Node or Python; in PowerShell use `Get-Content -Encoding UTF8` and
   `[IO.File]::WriteAllText($p, $t, [Text.UTF8Encoding]::new($false))`. t215 fails on any such pair.
5. **The split freeze.** While Cursor has the freeze on (the panel shows **SPLIT FREEZE ON**),
   nobody else edits `index.html`. Use that time for specs and tests in new files.
6. **Only Cursor and Claude commit and push** (Jerry, 2026-09-25, D-27). Nobody else touches
   git or GitHub. At the end of each of their own tasks, either one may commit the finished
   work that is waiting: everything checked out since the last commit, never a file an active
   agent is still in. After the checks in rule 7 they push `feature/Phis-changes`. The panel
   shows what's waiting.
   - **One committer at a time.** Before touching git, check in with `git` in `--touch`
     (for example `--touch "git"`). The check-in refuses if the other is already in it; wait
     until they check out.
   - `git pull --rebase` before you push, and never force-push.
7. **Done means all of these:**
   - `npm test` passes, or fails only where it already failed.
   - Anything visible has before-and-after shots from `tools/shoot.mjs`
     (`--compare`: under 1% is unchanged, over 3% is a regression), or from `tools/camera.mjs`, which
     takes any picture of the game quickly: any weapon, zombie, survivor, buildable or place, from any angle,
     moved round step by step, or a whole group at once (`turrets`, `zombie:*`) with one contact sheet; agents
     without a shell drop a job file in `review/camera/jobs/` (`tools/CAMERA.md`).
   - Models and animations are looked at in the inspector (`Open Marine Inspector.bat`, `index.html?inspect`,
     `studio/inspector/README.md`, CL-196): every model built and every move run by the game itself, at any speed,
     frame by frame. Agents drive it through `window.DWInspect` or the camera (`start --inspect`); after changing a
     model, `node tools/camera.mjs check <its id>` builds it and pictures it.
   - Load time and frame rate are no worse.
   - A handoff note is written, and you have checked out.
8. **Every task ends with a handoff note** at `handoffs/YYYY-MM-DD-<agent>-<task>.md`, using the
   template below.
9. **Modules talk through contracts.** Calls between areas go through the exports in
   `docs/contracts.md`. To change one, the owner proposes it, Claude approves, and every
   caller is updated in the same handoff.
10. **The world stays deterministic.** Seeds, world layout and cave positions don't change
    without Claude's sign-off.
11. **One voice for the player.** Player-facing text lives in `ui/strings.js` (ChatGPT's). Add
    keys there; don't hard-code copy. The loop is always: skulls, then bank at the HQ window,
    then Cash.
12. **Budgets.**
    - The title screen appears within about 18 s cold and 15 s warm on Jerry's PC (D-85, 2026-10-21: ~14 s warm accepted
      for 1.0, the shader warm-up included; it was about 6 s before the warm-up, D-76).
    - 60 fps with 48 zombies, from the standard view.
    - No CDN dependencies, and no build step: the game runs straight from the folder.
13. **Report honestly.** Say what failed and what you couldn't verify. Never skip, weaken or
    delete a test to make it pass; a stale test goes to its owner. If you change what a test
    expects, check out with `--review` so the lead looks at it (D-7).
14. **One task per check-in and per handoff.** Keep changes small and reviewable. No drive-by
    refactors outside your own area.
15. **Show your proof.** "Done" and "it works" need evidence in the handoff: the command you
    ran with the lines of output that show it passed, or a screenshot path. A claim with no
    proof counts as not verified.
16. **One game test at a time on Jerry's PC** (Jerry, 2026-10-15; the queue is Cursor's CU-146, verified 07:43Z). Anything that
    starts the game is a game test: the Marine Inspector, the camera and screenshots, browser-based `npm test` runs, and
    hidden or headless instances. They all go through the machine-wide queue, which grants one at a time, first come first
    served, Jerry first, and wakes the next in line itself:
    - `node crew/crew.mjs slot status` shows the holder and who waits.
    - `node crew/crew.mjs slot run <you> <task> --checks "<batch>" -- <command>` queues your prepared batch, waits for
      its turn, runs it and releases when its browser has closed. `slot request` (with `--minutes`) queues without
      running; `slot cancel <you> <id>` leaves the queue. The camera, shoot, `npm test` and the launchers queue themselves.
    - Never start a game any other way, and never work around the queue's refusal. Jerry's own game or Marine Inspector
      comes first; never close his windows or another agent's processes.
    - One game instance and one test worker (`--jobs 1`); no overlapping helpers or extra tabs.
    - The slot is only for running the game, never for coding: make your changes and prepare your checks, queue them, keep
      working while you wait. If your session ends before your turn, say so plainly on your card and in the log:
      "Changes ready; waiting for testing slot". Never stop silently or call the task done before its checks have run.
    - The full suite is one coordinated integration job (Cursor, or Claude when he commits), not a check after each edit.
    - Claude's cloud workspace is a separate computer (the queue keeps a separate state there); Claude keeps it to one
      instance at a time and logs those runs. Every test on Jerry's PC, Claude's included, goes through the queue.
    - Record the rule in your handoff notes.

17. **The world and quest rules** (Jerry, 2026-10-24, D-88). Before you place, move, scale or build anything in the
    world, read `docs/world-design.md` (the placement and transition sweeps, the 15 rules of spatial world design, the
    look). Before you design or change a quest, a day mission or a story beat, read `docs/quest-design.md` and answer
    its five questions in the spec first. A finding or a fix names the rule it serves.

18. **The animation principles** (Jerry, 2026-10-24, D-89). Before you make or change any motion (the marine, a zombie,
    a creature, a prop, a camera), read `docs/animation-principles.md` and follow its construction protocol: define the
    action, find a reference first (the libraries at the end of the file), key poses, construct, secondary motion,
    test it in the game from the gameplay camera, validate. Every animation handoff carries the 0-5 score table with at
    least 4 in each category that applies, filmstrips or shots from the gameplay camera, and the defects you couldn't
    fix, named. Reference clips come into the repo one by one, each with its source and terms in
    `assets/anim/reference/LICENSE.txt`.

19. **The asset principles and the art direction** (Jerry, 2026-10-24, D-89). Before you make or change a model, a
    material or a color, read `docs/art-direction.md` (the four families, how the uncanny breaks the rules, the reserved
    colors, scale by camera) and `docs/asset-principles.md` (silhouette first, materials before textures, the protocol,
    the 0-5 table). Never judge a model from code or numbers alone: render it and look, from several angles, in the four
    lights (noon, overcast, dusk, night), at gameplay scale, in three passes (geometry, materials, context). The
    handoff names the family, the shots and the scores (4 or more each). Sound and the UI have theirs too:
    `docs/sound-principles.md` and `docs/ui-principles.md` (approved, D-92; a sound plays only if it's immersive or
    impactful).

## Playing to strengths

Five agents, each good at something different. The board gives each one tasks that fit.
The roadmap to 1.0 (`crew/BOARD.md` and `docs/roadmap.md`, D-43) is laid out that way: the board's "Who
does what" says what to give each agent and what to keep away from it.
- **Claude, Cursor, ChatGPT and Grokbot** take the big, cross-cutting work inside
  `index.html` and their modules.
- **Antigravity** can see: it runs the game in a real browser on a real GPU. Every visible
  change goes through it: the pit, the cave warnings, the loading screen, the build aiming.
  It reports with screenshots and never edits game code.
- **Reactions and animation** (D-42): `studio/` has the engine, the bodies, the presets and the motion lab;
  `docs/studio.md` §9-10. Jerry's notes on a reaction land in `review/motion-*` like any review.
- **Owners, ask for help:**
  - `node crew/crew.mjs request <you> antigravity "shots: <what>" "<how to set it up>"`
    when you need eyes on something.
  - If you can't run the tests, write "Tests: not run" and whoever commits (Cursor or Claude) runs them.

## Handoff note template (`handoffs/YYYY-MM-DD-<agent>-<task>.md`)

```
# <agent> — <task id> <task> — <date>
Changed:          <one or two sentences>
Files:            <paths>
Tests:            npm test → <pass/fail counts>; new tests: <names>
Screenshots:      <paths from tools/shoot.mjs, before and after>
Not verified:     <anything you could not check, and why>
Requests:         <asks for other owners, sent with crew.mjs request>
Contract changes: <none | what, approved by Claude on date>
```

The panel shows `Changed:` and `Not verified:` for every report, so keep them to a sentence or
two that Jerry can read at a glance.
