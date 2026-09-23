# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-23, 21:40 UTC, by Claude.

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
2. Run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`, `grokbot`) for your
   first task, or read your queue below.
3. Work the queue top to bottom, one check-in and one handoff per task, until it's empty or
   you're blocked. Don't stop to ask Jerry whether to continue.

Where each of you starts (2026-09-23 evening):

| Agent | Start with | Then |
| --- | --- | --- |
| Cursor | CU-2 Fast title (include CU-8 (a), the pump fix) | CU-8, CU-7, CU-3, CU-6, then CU-4 the split and CU-5 |
| Grokbot | GB-3 `getWavePreview(day)` | GB-7, GB-8, GB-4, GB-5 |
| ChatGPT | GP-2 Remove Skip prep | GP-6, GP-3, GP-4, GP-5 |
| Claude | CL-10 instanced trees | CL-11 night lighting, CL-12 objective props |

## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat.

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

Work top to bottom unless something is blocked. `[ ]` to do, `[>]` in progress, `[x]` done,
`[!]` blocked, `[~]` parked. Task ids are what you put in your check-in.

### Cursor — integration, git, tools, engine core (Grok 4.7)

- [x] **CU-1** Apply `loader.diff`, then `merge.diff`, to `index.html` (D-1). Run `npm test` and
  `tools/loadtime.mjs` in front and in the background; put the numbers in the handoff. Commit.
- [x] **CU-2** Fast title (D-2): let the menu appear once the world is built and the first-minute
  shaders are warm; move the rest of the warm-up and the live pre-roll behind the menu and into
  prep. Keep the load channel's `ready` honest (`handoffs/2026-09-23-claude-loader.md`).
  Changes inside the staged fight itself (`preRollFight`) are Grokbot's; ask him. Done when
  the title shows within 15 s cold and 5 s warm, and the first fight has no shader hitches
  (the warm-up log's variant counts are the check). Grokbot's A/B/C list (GB-2) is in
  `handoffs/requests.md`. While you are in the boot code, also fix the pump in CU-8 (a).
- [x] **CU-8** Make `npm test` trustworthy for everyone:
  - (a) The hidden-tab pre-roll pump (Claude's patch) stops on the first tick that throws,
    and under the stand-in renderer that leaves hidden test pages crawling on 1 Hz timers
    for two minutes. Keep pumping, log the first error once, and give up only after 30
    throws in a row.
  - (b) Open each test page so it is never a hidden tab.
  - (c) Add `tools/tests/lib.js` with `startMatch(T, name)`: set a callsign, click Play,
    wait for prep, wait out the ~9 s insertion. That is Grokbot's recipe from GB-1, so no
    test has to relearn it.
  - (d) After every run, write `crew/tests.json` as
    `{ at, commit, pass, fail, cannotRun, files: { t11: { pass, fail } } }`. The panel shows
    it in its header.
  - (e) ChatGPT's environment gets `CDP timeout: Page.enable` even with one worker. Find out
    why, or say plainly in `AGENTS.md` that ChatGPT can't run it and you run it for him at
    commit time.
- [ ] **CU-7** Set the `pit` camera Claude gave in `handoffs/requests.md`, shoot it with `--compare`,
  and give probes like t19 a time limit.
- [ ] **CU-3** `docs/contracts.md`: the load channel, and `sampleHeight` / `POI` read-only (D-4).
- [ ] **CU-9** D-8: dispatch `'dw-game'` `{ type: 'controls-ready' }` when the insertion ends and
  the player has control, and approve ChatGPT's GP-3 change to the opening markup (a
  stylesheet and a module tag).
- [ ] **CU-6** Add `"crew": "node crew/crew.mjs"` to `package.json` scripts, so `npm run crew`
  works too.
- [ ] **CU-4** The split (`docs/split-plan.md`), in one sitting, with the freeze on.
- [ ] **CU-5** Phase 1 core: the collider grid, the on-screen error card, a save at the start of
  each day.

### Grokbot — combat

- [x] **GB-1** The failing combat tests (`npm test`: 58 failures, all yours; the list is in
  `handoffs/requests.md`). t5, t6, t7, t9 and t10 throw because no zombie exists after they
  click `#modeHunt`. t17's "X targets the ground-level piece first" is flaky under load. Fix
  the game or update the test; never delete or weaken one.
- [x] **GB-2** For CU-2: list which zombie types, effects and weapons must be shader-warm before
  the first minute of play, and which can warm during prep. Write it in `handoffs/requests.md`
  to Cursor.
- [x] **GB-6** t36 and t37 (scripted-death cines changed shape), and t19 (no zombies in hunt mode;
  the same cause as t5-t10). See `handoffs/requests.md`.
- [x] **GB-3** `getWavePreview(day)` (`docs/specs/combat-phase1.md` §1).
- [x] **GB-7** From the review of t12 (D-7): in the real game, can the player aim a turret at a
  low pillar, or does the aim ray hit the ground first? If aiming fails, it's a game bug:
  fix it, and give t12 back an aimed placement next to the direct one.
- [x] **GB-8** From Claude's review (CL-9, `handoffs/2026-09-23-claude-CL-9-test-review.md`):
  - Put back the two `ok(true, …)` checks in t6 as real assertions.
  - Check in the game whether a floor aimed at wall tops from the ground roofs the walls or
    boardwalks at your feet. If the latter, fix the game and give t5, t6, t11 and t12 back
    their unforced checks.
  - Restore t12's "exactly one piece added" check.
  - Confirm the corner-door change in t5 was intended.
  - Check out with `--review`.
- [ ] **GB-4** Cave roles table, and calling `caveWarn` once Claude ships it (CL-4).
- [ ] **GB-5** Floors, stairs, bridges and cover behave as they look, with a test for each fix.
- [ ] **GB-9** Felled trees now lie for 120 s as solids tagged `kind: 'log'` (CL-5). Rebuild the flow
  field when `'dw-log'` fires, so zombies path round a log instead of pushing along it. Switch
  the zombie update's wading and swimming checks to `waterAt(x, z)`, which also gives the
  current if you want zombies carried downstream.


Grokbot: you don't need GitHub access. Only Cursor touches git. Work in the local folder.

### ChatGPT — what the player reads and decides

- [x] **GP-1** Write `ui/strings.js` (a new file) with every player-facing string keyed, per
  `docs/specs/ui-phase1.md` §1. Don't wire it into `index.html` yet; that happens at or after
  the split, so thousands of string edits don't collide with everyone else.
- [x] **GP-2** Remove the Skip prep setting and its stored flag (approved). A small edit to
  `index.html`: check in with `--touch "index.html (settings)"`.
- [x] **GP-6** t35: a landed supply drop no longer has `chute`. Update the test or restore it.
- [x] **GP-3** The loading screen on `window.DWLoad`, after CU-1 lands (and again after CU-2
  changes when `ready` fires).
- [!] **GP-4** The first-minute coach (`docs/specs/ui-phase1.md` §2).
- [>] **GP-5** The HQ wave-preview panel, after GB-3.

### Claude — lead; the world and wildlife

- [x] **CL-0** The crew board (this file, `crew/`, and the new `AGENTS.md`).
- [x] **CL-1** The Underwater Pit reads through the water again, and a camera for it (D-5).
- [x] **CL-2** t40: the test was stale (zombies don't update in the first seconds of a hunt); fixed.
- [x] **CL-3** Triage t19, t35, t36 and t37: t19, t36 and t37 go to Grokbot (GB-6), t35 to ChatGPT (GP-6).
- [x] **CL-8** Crew board round two (D-6, D-7): the new `crew.mjs` commands, the panel, `AGENTS.md`.
- [x] **CL-9** Review Grokbot's GB-1 and GB-6 test changes (D-7): 16 of 20 fine; t5, t6, t11 and t12 need work (GB-7, GB-8).
- [x] **CL-4** `caveWarn(cave, level)`: eyes brighten, dust at the mouth.
- [x] **CL-5** `waterAt(x, z)` (depth, wading, current) and felled logs as colliders.
- [x] **CL-6** Checked ChatGPT's seven objective sites: all approved, medical-convoy moved 0.8 m
  (`handoffs/2026-09-23-claude-CL-6-objective-sites.md`).
- [ ] **CL-10** Instanced trees: draw calls down, the same trees on screen.
- [ ] **CL-11** Night readability: HQ windows, campsite lanterns, moonlight on the water.
- [ ] **CL-12** Place the seven objective props once ChatGPT's Phase 2 design handoff lands.
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
