# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-23 (evening) by Claude.

This is the one place to look before you work. `AGENTS.md` has the rules and the check-in
steps; this board has what to work on and what has been decided. **Only Claude (lead) edits
this file**, and Jerry, whenever he likes. Everyone else reports through their own check-in
card in `crew/status/`, their handoff note, and `handoffs/requests.md`.

Live view for Jerry: double-click `crew/Open Crew Panel.bat`. In a terminal:
`node crew/crew.mjs`.

## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat.

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

Work top to bottom unless something is blocked. `[ ]` to do, `[>]` in progress, `[x]` done,
`[!]` blocked, `[~]` parked. Task ids are what you put in your check-in.

### Cursor — integration, git, tools, engine core (Grok 4.7)

- [ ] **CU-1** Apply `loader.diff`, then `merge.diff`, to `index.html` (D-1). Run `npm test` and
  `tools/loadtime.mjs` in front and in the background; put the numbers in the handoff. Commit.
- [ ] **CU-2** Fast title (D-2): let the menu appear once the world is built and the first-minute
  shaders are warm; move the rest of the warm-up and the live pre-roll behind the menu and into
  prep. Keep the load channel's `ready` honest (`handoffs/2026-09-23-claude-loader.md`).
  Changes inside the staged fight itself (`preRollFight`) are Grokbot's; ask him. Done when
  the title shows within 15 s cold and 5 s warm, and the first fight has no shader hitches
  (the warm-up log's variant counts are the check).
- [ ] **CU-3** `docs/contracts.md`: the load channel, and `sampleHeight` / `POI` read-only (D-4).
- [ ] **CU-4** The split (`docs/split-plan.md`), in one sitting, with the freeze on.
- [ ] **CU-5** Phase 1 core: the collider grid, the on-screen error card, a save at the start of
  each day.
- [ ] **CU-6** Add `"crew": "node crew/crew.mjs"` to `package.json` scripts, so `npm run crew`
  works too.
- [ ] **CU-7** Set the `pit` camera Claude gave in `handoffs/requests.md`, shoot it with `--compare`,
  and give probes like t19 a time limit.

### Grokbot — combat

- [ ] **GB-1** The failing combat tests (`npm test`: 58 failures, all yours; the list is in
  `handoffs/requests.md`). t5, t6, t7, t9 and t10 throw because no zombie exists after they
  click `#modeHunt`. t17's "X targets the ground-level piece first" is flaky under load. Fix
  the game or update the test; never delete or weaken one.
- [ ] **GB-2** For CU-2: list which zombie types, effects and weapons must be shader-warm before
  the first minute of play, and which can warm during prep. Write it in `handoffs/requests.md`
  to Cursor.
- [ ] **GB-3** `getWavePreview(day)` (`docs/specs/combat-phase1.md` §1).
- [ ] **GB-4** Cave roles table, and calling `caveWarn` once Claude ships it (CL-4).
- [ ] **GB-5** Floors, stairs, bridges and cover behave as they look, with a test for each fix.
- [ ] **GB-6** t36 and t37 (scripted-death cines changed shape), and t19 (no zombies in hunt mode;
  the same cause as t5-t10). See `handoffs/requests.md`.

Grokbot: you don't need GitHub access. Only Cursor touches git. Work in the local folder.

### ChatGPT — what the player reads and decides

- [ ] **GP-1** Write `ui/strings.js` (a new file) with every player-facing string keyed, per
  `docs/specs/ui-phase1.md` §1. Don't wire it into `index.html` yet; that happens at or after
  the split, so thousands of string edits don't collide with everyone else.
- [ ] **GP-2** Remove the Skip prep setting and its stored flag (approved). A small edit to
  `index.html`: check in with `--touch "index.html (settings)"`.
- [ ] **GP-3** The loading screen on `window.DWLoad`, after CU-1 lands (and again after CU-2
  changes when `ready` fires).
- [ ] **GP-4** The first-minute coach (`docs/specs/ui-phase1.md` §2).
- [ ] **GP-5** The HQ wave-preview panel, after GB-3.
- [ ] **GP-6** t35: a landed supply drop no longer has `chute`. Update the test or restore it.

### Claude — lead; the world and wildlife

- [x] **CL-0** The crew board (this file, `crew/`, and the new `AGENTS.md`).
- [x] **CL-1** The Underwater Pit reads through the water again, and a camera for it (D-5).
- [x] **CL-2** t40: the test was stale (zombies don't update in the first seconds of a hunt); fixed.
- [x] **CL-3** Triage t19, t35, t36 and t37: t19, t36 and t37 go to Grokbot (GB-6), t35 to ChatGPT (GP-6).
- [ ] **CL-4** `caveWarn(cave, level)`: eyes brighten, dust at the mouth.
- [ ] **CL-5** `waterAt(x, z)` (depth, wading, current) and felled logs as colliders.
- [ ] **CL-6** Phase 2: check ChatGPT's seven objective sites, then instanced trees and night
  lighting.
- [~] **CL-7** The world bake: parked by D-2.

## Where things live

| What | Where | Who writes it |
| --- | --- | --- |
| Rules and the check-in steps | `AGENTS.md` | Claude |
| Orders, decisions, queues | `crew/BOARD.md` (this file) | Claude, Jerry |
| Who is doing what, right now | `crew/status/<agent>.md` | each agent, their own only |
| What happened, in order | `crew/LOG.md` | everyone, append only |
| Reports | `handoffs/YYYY-MM-DD-agent-task.md` | the agent who did the work |
| Asking another owner for something | `handoffs/requests.md` | anyone; the owner answers in place |
| Specs | `docs/specs/` | each owner |
| Screenshots | `Claude outputs/shots/` (via `tools/shoot.mjs`) | anyone |
