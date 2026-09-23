# AGENTS.md — how the Dead-Wave crew works

Read this before you start. It applies to every agent: Cursor (Opus 5), ChatGPT (GPT-ASTRA 6),
Grokbot and Claude. Jerry has the final say. Claude leads. The full plan, with each agent's
prompt, is the "Dead-Wave Crew Plan" doc.

- Repo: jerrykoller5000-cyber/Dead-Wave
- Branch: `feature/Phis-changes`
- Folder: `C:\Users\Zero\Desktop\Tiny Trek`

## Who owns what

| Agent | Owns | Files (after the split) |
| --- | --- | --- |
| Cursor | Integration, git, tooling, engine core: boot and loader shell, colliders, saves, error card | `index.html` shell, `core/*`, `tools/*`, `vendor/*` |
| Claude (lead) | The world: terrain, water, caves, flora, wildlife, night lighting, the world bake | `world/*`, `life/*`, `assets/world/*`, `tools/bake-world.mjs` |
| Grokbot | Combat: zombies, wave director, enemy roles, builds and turrets, weapons, scripted deaths | `combat/*` |
| ChatGPT | Player-facing: HUD, menus, shop, onboarding, text, economy, objectives, audio cues | `ui/*`, `ui/strings.js`, `game/economy.js`, `game/objectives.js` |

Until the split lands, "files" means the matching sections of `index.html`.

## Rules

1. **Jerry decides; Claude leads.** Priorities, ownership and disputes go to Claude. Claude's call stands unless Jerry overrides it.
2. **Touch only your own files.** If you need a change in someone else's area, add a request to `handoffs/requests.md` addressed to the owner, then carry on with something else. Never make the change yourself.
3. **Never revert, delete or reformat another agent's work** (Philip's included). If you think it is wrong, write a request saying why.
4. **Start from the freshest file, and never overwrite.** Re-read the file before you edit. Before you save, check it has not changed underneath you (modified time or hash). If it has, three-way merge onto the new version.
5. **Split freeze.** While Cursor splits `index.html` into modules, nobody else edits it. Use that time to write specs and tests in new files of your own.
6. **Only Cursor commits and pushes.** Everyone else hands off. Cursor pushes `feature/Phis-changes` at the end of every session, after the checks in rule 7.
7. **Done means all of these:**
   - `npm test` passes.
   - Anything visible has before-and-after shots from `tools/shoot.mjs`.
   - Load time and frame rate are no worse.
   - A handoff note is written.
8. **Every task ends with a handoff note** at `handoffs/YYYY-MM-DD-agent-task.md` (template below).
9. **Modules talk through contracts.** Calls between areas go through the exports listed in `docs/contracts.md`. To change one, the owner proposes it, Claude approves, and every caller is updated in the same handoff.
10. **The world stays deterministic.** Seeds, world layout and cave positions do not change without Claude's sign-off, because the baked world depends on them.
11. **One voice for the player.** Player-facing text lives in `ui/strings.js`, which ChatGPT owns. Add keys there; do not hard-code copy. The loop is always: skulls, then bank at the HQ window, then Cash.
12. **Budgets:**
    - The title screen appears within 15 s cold and 5 s warm on Jerry's PC.
    - The game holds 60 fps with 48 zombies from the standard view.
    - No new CDN dependencies.
    - No build step: the game stays native ES modules that run straight from the folder.
13. **Report honestly.** Say what failed and what you could not verify. Never skip, weaken or delete a test to make it pass. A test that is truly stale goes to its owner to fix or retire.
14. **One task per handoff.** Keep changes small and reviewable. No drive-by refactors or renames outside your own area.

## Handoff note template (`handoffs/YYYY-MM-DD-agent-task.md`)

```
# <agent> — <task> — <date>
Changed:          <one or two sentences>
Files:            <paths>
Tests:            npm test → <pass/fail counts>; new tests: <names>
Screenshots:      <paths from tools/shoot.mjs, before and after>
Not verified:     <anything you could not check, and why>
Requests:         <asks for other owners, also added to handoffs/requests.md>
Contract changes: <none | what, approved by Claude on date>
```
