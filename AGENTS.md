# AGENTS.md — how the Dead-Wave crew works

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

1. **Look.** Run `node crew/crew.mjs`. It shows the current **mission** (the one job the whole
   crew is on, if there is one), who is active and in which files, open questions, and reviews
   waiting. `node crew/crew.mjs mission` shows just the mission. Then read `crew/BOARD.md` (Jerry's orders, the decisions,
   your queue) and your own card, `crew/status/<you>.md`, for the notes you left yourself.
2. **Answer first.** Look in `handoffs/requests.md` for anything addressed to you, and answer
   it in place (`DONE`, `WONT (why)` or `LATER (phase)`).
3. **Check in.** `node crew/crew.mjs next <you>` names your next task. Then:
   `node crew/crew.mjs in <you> <task-id> "<what>" --model "<your model>" --touch "<file (part)>, <file>"`.
   - `--model` is required: the model this session actually runs on, as your editor or app
     names it (for example `"Claude Sonnet 4.6"`). Not sure? Say so: `"unsure (editor says X)"`.
     A new model is logged as a MODEL line, so Jerry can see who ran what.
   - It ticks the task ▶ on the board.
   - It refuses if another active agent is already in one of those files. Then wait, or take
     another task. Never work around it.
   - Don't list the shared files (`crew/LOG.md`, `crew/QUESTIONS.md`, `handoffs/requests.md`):
     everyone appends to those.
4. **Work, and say what's happening.** Only in your own files (the table below), and only on
   that task. Whenever you find or finish something, roughly every 10-15 minutes:
   `node crew/crew.mjs note <you> "<one line: what you found or finished>"`.
   That line is what Jerry sees on your card while you work.
5. **Check out.** Write your handoff note in the template below, then:
   `node crew/crew.mjs out <you> --report handoffs/YYYY-MM-DD-<you>-<task>.md --done`.
   - `--done` ticks the task ✓. Leave it off if the task isn't finished.
   - Add `--review "<why>"` if you changed what a test expects, or anything else the lead
     should look at.
   - Stuck? Use `--blocked "<on what>"` instead.
   - Put anything your next session should know in the Notes section of your card.
6. **Keep going.** Take the next task and go round again. Don't stop to ask Jerry whether to
   continue. Stop only when:
   - your queue is empty, or `crew.mjs next` says your next task waits on someone else's
     (a task that says "after XX-n" can't start until XX-n is ticked);
   - you're blocked; or
   - you need a decision only Jerry can make. Then run
     `node crew/crew.mjs ask <you> "<the question>"`, which puts it at the top of his panel,
     and work on something else meanwhile.

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

| Agent | Owns | Files |
| --- | --- | --- |
| Cursor | Integration, git (shared with Claude, rule 6), tooling, engine core: boot and the loader shell, colliders, saves, the error card | the `index.html` shell, `core/*`, `tools/*`, `vendor/*`, `package.json` |
| Claude (lead) | The world: terrain, water, caves, flora, wildlife, night lighting; the studio's clips, rigs and player (D-40) | `world/*`, `life/*`, `assets/world/*`, `studio/*`, `assets/anim/*`, `crew/BOARD.md`, this file |
| Grokbot | Combat: zombies, the wave director, enemy roles, builds and turrets, weapons, scripted deaths | `combat/*` |
| ChatGPT | What the player reads and decides: HUD, menus, shop, onboarding, text, economy, objectives, audio cues | `ui/*`, `game/economy.js`, `game/objectives.js` |
| Antigravity | The crew's eyes: plays the real game in a real browser, takes screenshots, checks every visible change, reports what it sees | `qa/*` (reports and screenshots). No game code. |

Until the split lands, "files" means the matching sections of `index.html`. Several agents
can work in it at once, one per part: name your part in `--touch`, for example
`index.html (build wheel)`. The check-in refuses a part someone else is in, and the whole file
if you name no part. Rule 4 applies every time you save it. Everyone writes their own
card in `crew/status/`, appends to `crew/LOG.md`, and writes their own handoff notes.

## Rules

1. **Jerry decides; Claude leads.** Priorities, ownership and disputes go to Claude, and
   Claude's call stands unless Jerry overrides it. Orders and decisions are in `crew/BOARD.md`.
2. **Touch only your own files.** If you need something from another area, add a request to
   `handoffs/requests.md` addressed to its owner, then carry on with something else.
3. **Never revert, delete or reformat another agent's work,** Philip's included. If you think
   it is wrong, write a request saying why.
4. **Start from the freshest file and never overwrite.** Re-read a file before you edit it.
   Before you save, check it hasn't changed underneath you (modified time or hash). If it has,
   three-way merge onto the new version.
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
     (`--compare`: under 1% is unchanged, over 3% is a regression).
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
    - The title screen appears within 15 s cold and 5 s warm on Jerry's PC.
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
