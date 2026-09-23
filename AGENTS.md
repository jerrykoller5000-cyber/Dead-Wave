# AGENTS.md — how the Dead-Wave crew works

Every agent reads this first, every session: Cursor (Grok 4.7), ChatGPT (GPT-ASTRA 6),
Grokbot and Claude. Jerry has the final say. Claude leads.

- Repo: jerrykoller5000-cyber/Dead-Wave
- Branch: `feature/Phis-changes`
- Folder: `C:\Users\Zero\Desktop\Tiny Trek`

## Every session: check in, work, check out

You won't remember earlier sessions. The crew board remembers for you.

1. **Look.** Run `node crew/crew.mjs`, or read `crew/status/*.md`. It shows who is active, what
   they are on and which files they are in. Then read `crew/BOARD.md`: Jerry's orders, the
   lead's decisions, and your queue. Read your own card, `crew/status/<you>.md`, for the notes
   you left yourself.
2. **Answer first.** Look in `handoffs/requests.md` for anything addressed to you, and answer
   it in place (`DONE`, `WONT (why)` or `LATER (phase)`).
3. **Check in.** Take the top open task in your queue, unless it is blocked, and run:
   `node crew/crew.mjs in <you> <task-id> "<what>" --touch "<file (part)>, <file>"`.
   It refuses if another active agent is already in one of those files. Then wait, or take
   another task. Never work around it.
4. **Work.** Only in your own files (the table below), and only on that task.
5. **Check out.** Write your handoff note, then run:
   `node crew/crew.mjs out <you> --report handoffs/YYYY-MM-DD-<you>-<task>.md --next "<id> <what>"`.
   If you are stuck, use `--blocked "<on what>"` instead. Put anything the next session should
   know in the Notes section of your card.

If you can't run Node, make the same changes by hand. Edit your card's header lines, and
append one line to `crew/LOG.md` in its format, with UTC time. Claude works that way.

Agent names for the commands: `claude`, `cursor`, `chatgpt`, `grokbot`.

## Who owns what

| Agent | Owns | Files |
| --- | --- | --- |
| Cursor (Grok 4.7) | Integration, git, tooling, engine core: boot and the loader shell, colliders, saves, the error card | the `index.html` shell, `core/*`, `tools/*`, `vendor/*`, `package.json` |
| Claude (lead) | The world: terrain, water, caves, flora, wildlife, night lighting | `world/*`, `life/*`, `assets/world/*`, `crew/BOARD.md`, this file |
| Grokbot | Combat: zombies, the wave director, enemy roles, builds and turrets, weapons, scripted deaths | `combat/*` |
| ChatGPT | What the player reads and decides: HUD, menus, shop, onboarding, text, economy, objectives, audio cues | `ui/*`, `game/economy.js`, `game/objectives.js` |

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
6. **Only Cursor commits and pushes.** Nobody else touches git or GitHub. Cursor pushes
   `feature/Phis-changes` at the end of every session, after the checks in rule 7.
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
    delete a test to make it pass; a stale test goes to its owner.
14. **One task per check-in and per handoff.** Keep changes small and reviewable. No drive-by
    refactors outside your own area.

## Handoff note template (`handoffs/YYYY-MM-DD-<agent>-<task>.md`)

```
# <agent> — <task id> <task> — <date>
Changed:          <one or two sentences>
Files:            <paths>
Tests:            npm test → <pass/fail counts>; new tests: <names>
Screenshots:      <paths from tools/shoot.mjs, before and after>
Not verified:     <anything you could not check, and why>
Requests:         <asks for other owners, also added to handoffs/requests.md>
Contract changes: <none | what, approved by Claude on date>
```
