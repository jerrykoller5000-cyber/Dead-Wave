# Dead-Wave crew board

Lead: Claude. Last updated 2026-09-23, 22:02 UTC, by Claude.

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
2. Run `node crew/crew.mjs next <you>` (`claude`, `cursor`, `chatgpt`, `grokbot`, `opencode`,
   `antigravity`) for your
   first task, or read your queue below.
3. Work the queue top to bottom, one check-in and one handoff per task, until it's empty or
   you're blocked. Don't stop to ask Jerry whether to continue.

Where each of you is (2026-09-23 night, after OpenCode and Antigravity joined, D-9):

| Agent | Now / start with | Then |
| --- | --- | --- |
| Cursor | CU-7 pit camera and probe time limits (in progress) | CU-4 the split, then CU-5 |
| Grokbot | GB-10 t34 for the HQ briefing (in progress) | GB-11 purchase events, GB-5, GB-9 logs |
| ChatGPT | GP-5 HQ briefing | GP-4 the coach (unblocked), GP-8 Phase 2 design, GP-7 prep checklist |
| Claude | CL-10 instanced trees | CL-11 night lighting, CL-12 objective props |
| OpenCode | OC-1 `controls-ready` (unblocks ChatGPT's GP-4) | OC-2, OC-3, then OC-4 every session |
| Antigravity | AG-1 run the game, baseline shots | AG-2, AG-3, AG-4, AG-5 |

## Orders from Jerry

Newest first. Claude writes these down when Jerry gives them in chat.

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

- **D-9 · Six agents; tasks by strength.**
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
- [x] **CU-8** Make `npm test` trustworthy for everyone (done: a window per check, `startMatch`
  in `tools/tests/lib.js`, `crew/tests.json` for the panel; `handoffs/2026-09-23-cursor-cu8.md`):
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
- [x] **CU-7** Set the `pit` camera Claude gave in `handoffs/requests.md` in `tools/shoot.mjs`, and
  give probes like t19 a time limit. Antigravity takes the shots (AG-2).
- [~] **CU-3** `docs/contracts.md`: moved to OpenCode (OC-3, D-9).
- [~] **CU-9** controls-ready: moved to OpenCode (OC-1, D-9). The GP-3 markup is approved by Claude.
- [~] **CU-6** `npm run crew`: moved to OpenCode (OC-2, D-9).
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
- [x] **GB-4** Cave roles table, and calling `caveWarn` once Claude ships it (CL-4).
- [>] **GB-10** t34 for ChatGPT's HQ briefing (GP-5): E now opens the briefing, and only its
  Sound alarm button starts the wave. Assert the dialog opens and `!hq.seq`, click Sound
  alarm, then keep every existing strobe, flare and wave check. Check out with `--review`.
  (Grokbot started this at 22:02 under his GB-5 check-in.)
- [ ] **GB-11** D-8 `purchase-delivered`: emit `dw-game` `{ type: 'purchase-delivered', itemId,
  cashSpent, source: 'build' | 'upgrade' }` after a piece is placed or a paid upgrade or
  repair lands (ChatGPT's coach needs it for the first-purchase lesson).
- [>] **GB-5** Floors, stairs, bridges and cover behave as they look, with a test for each fix.
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
- [x] **GP-4** The first-minute coach (`docs/specs/ui-phase1.md` §2). Unblocked: OpenCode's
  `controls-ready` (OC-1) is in `assets/intro/menu-camera.js`.
- [!] **GP-5** The HQ wave-preview panel, after GB-3.
- [>] **GP-8** The Phase 2 objectives design handoff that CL-12 waits on
  (`docs/specs/ui-phase1.md`, "Phase 2 design"): for each of the seven sites, the prop
  list with rough sizes, what the player does there, the reward, and the strings keys.
  Use the positions from `handoffs/2026-09-23-claude-CL-6-objective-sites.md`.
  Hand it off to Claude.
- [ ] **GP-7** The prep checklist (`docs/specs/ui-phase1.md` §6), in your HUD and HQ
  sections. Ship bank, ammo, repair and alarm first. `prep.fortify` needs a reachable
  target area from Grokbot: ask him for it and leave that slot out until he answers.
  Fewer than three goals is fine.

### OpenCode — runner and clerk (Nemotron 3.5 Lightning)

How you work: one small task at a time.
- **Check before you touch anything.** Read the task's files first, and check that no
  active agent is in them (`node crew/crew.mjs`).
- **Change only the lines the task describes.** Then run the proof command and paste its
  output in your handoff.
- **Never open or edit `index.html`.** Use `grep -n` if you need to find something in it.
- **Stuck for more than a few minutes?** Send a request to Claude and take the next task.

- [x] **OC-1** The `controls-ready` event that ChatGPT's coach waits for (D-8, was CU-9):
  - **Where:** in `assets/intro/menu-camera.js`, find the line in `advance(dt)` that ends
    `document.getElementById('hud').inert=false;d.finish();`.
  - **What:** right after `d.finish();` (same line or the next), add:
    `window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'controls-ready' } }));`
    Change nothing else.
  - **Proof:**
    - `node --check assets/intro/menu-camera.js`
    - `npm test -- t18 --jobs 1` (it plays through an insertion)
    - `grep -n "controls-ready" assets/intro/menu-camera.js`
  - **Then:** `node crew/crew.mjs request opencode chatgpt "controls-ready is in (OC-1)" "<the grep line>"`.
- [ ] **OC-2** `npm run crew` (was CU-6):
  - **What:** in `package.json`, add `"crew": "node crew/crew.mjs"` to `"scripts"`, after
    `"serve"`. Mind the comma on the line before.
  - **Proof:**
    - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
    - `npm run crew`
- [ ] **OC-3** `docs/contracts.md` (was CU-3):
  - **What:** one section per export or event that crosses an owner's boundary, each with:
    name, owner, signature or shape, events it fires, the date approved, and the source
    handoff.
  - **Sources, and only these:**
    - `handoffs/2026-09-23-claude-loader.md` (DWLoad)
    - `crew/BOARD.md` D-4 (sampleHeight, POI, reshapeGround, levelGroundRect) and D-8 (the
      dw-game events)
    - `handoffs/2026-09-23-claude-CL-4-cavewarn.md`
    - `handoffs/2026-09-23-claude-CL-5-water-logs.md`
    - `handoffs/2026-09-23-grokbot-GB-3.md` (getWavePreview)
  - **Copy, don't invent.** Where a source is unclear, write "unclear, asked" and send
    Claude a request.
- [ ] **OC-4** Test watch, every session:
  - **Run the suite:** `npm test` once (about 5 minutes). It writes `crew/tests.json`, which
    the panel shows. Your first run matters: nobody has run the full suite since Cursor's
    CU-8 changed how checks open, so say plainly if the runner itself misbehaves.
  - **Post the result:** `node crew/crew.mjs note opencode "npm test: <pass> pass, <fail> fail"`.
  - **New failures:** for each file that fails now but passed in the previous
    `crew/tests.json`, send a request to its owner. The owners are in
    `tools/tests/README.md`, or ask Claude.
  - **Handoffs with "Tests: not run":** when someone checks out like that, run the tests they
    name and post the result the same way. ChatGPT's machine can't run the suite at all
    (AGENTS.md), so his handoffs are the usual case.
### Antigravity — the crew's eyes (Gemini 3.8 Flash)

How you work:
- **Serve the game:** run `npm run serve` in a terminal, then open
  `http://127.0.0.1:8971/index.html?debug=1` in your browser. `window.TT` is there in
  DevTools; `tools/shoot.mjs` takes fixed views if you prefer.
- **Save your work:** screenshots go in `qa/shots/<date>-<task>/`, and a short report in
  `qa/<date>-<task>.md`. That is your handoff (use the template).
- **Proof:** every "works" and every "broken" names a screenshot and says what you did.
- **Send findings to the owner:** `node crew/crew.mjs request antigravity <owner> "<what's wrong>" "<steps, expected, seen, screenshot path>"`.
- **Never edit game code.** Not `index.html`, `assets/`, `ui/` or `tools/`.

- [>] **AG-1** Baseline:
  - Get the game to the title screen in your browser, and write down how long it took.
  - Screenshot: the title; the HQ; the pit (TT.LAKE_HOLE, from the bank); the shale cave
    from the front.
  - Put in `qa/README.md` exactly how you run and screenshot the game, so your next
    session can repeat it.
- [ ] **AG-2** Claude's world changes, seen for real (report to Claude):
  - (a) **The pit:** the rune ring should glow up through the water from the bank and
    from above (CL-1).
  - (b) **The cave warnings:** `TT.caveWarn('cave:shale', 1)` then `2` then `0`. Watch from
    30 m, 70 m and 120 m, in daylight and at night. Do the eyes read, and is the dust too
    much or too little? (CL-4)
  - (c) **A felled tree:** fell a tree near you with `TT.beginTreeFall(tree, 1, 0)`. Can you
    walk through the log? Do shots stop on it? After two minutes it should sink. (CL-5)
- [ ] **AG-3** Grokbot's build fixes, in real play (report to Grokbot):
  - (a) Put a turret on a low pillar by aiming at it from the side (GB-7).
  - (b) Standing on the ground inside four walls, aim a floor at the wall tops: do you get
    a roof, or a walkway at your feet? (GB-8; check after Grokbot checks it out.)
- [ ] **AG-4** ChatGPT's screens (report to ChatGPT):
  - The loading screen's stages as the game loads (GP-3).
  - Settings with no Skip prep row (GP-2).
  - Once they're checked out: the first-minute coach (GP-4) and the HQ briefing (GP-5).
- [ ] **AG-5** Shots on request, standing. Anyone can send you `"shots: <what>"`. Answer with
  the images and one line on what you see.

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
