# Board queues, archived 2026-09-24 04:35Z

Jerry cleared the board after the stopping point. This is every queue as it stood, word for word,
so nothing is lost for the new plan. Nothing here is active.

## Still open when the board was cleared

- Cursor · **CU-4** The split (`docs/split-plan.md`), a slice at a time (D-15): freeze on for each slice,
- Cursor · **CU-5** Phase 1 core: the collider grid, the on-screen error card, a save at the start of
- Antigravity · **AG-5** Shots on request, standing. Anyone can send you `"shots: <what>"`. Answer with
- Antigravity · **AG-7b** The GP-7 prep checklist again: Play, wait until `body` no longer has `deploying`
- Antigravity · **AG-8** The pit's rune ring on a real GPU (CL-14). `node tools/shoot.mjs pit`, then two
- Claude · **CL-11** (parked) Night readability: HQ windows, campsite lanterns, moonlight on the water. Parked for
- Claude · **CL-7** (parked) The world bake: parked by D-2.

## Also left for the new plan

- GB-21 (the replays really play) and ChatGPT's GP-13 recheck landed after Cursor's CU-13 commit
  (`2ee9f2b`), so they're on disk but not committed. Claude re-ran t56 on them: 47 pass, 0 fail.
- CU-13's full run: 798 pass, 3 fail (t12 1, t17 2). Claude re-ran both on the same files: t12 22/0,
  t17 10/0. They look like load flakes; t17 has flaked before.
- ChatGPT asked for his own GP for the guardian's minimap pip (GB-19 gave him `getGuardianAlive()`).
- CL-11: in the menu, a "night" clock still looks like dusk; in a match night is very dark on purpose
  (NVG on N). How dark night should be is Jerry's call.

## The queues as they were

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
- [>] **CU-4** The split (`docs/split-plan.md`), a slice at a time (D-15): freeze on for each slice,
  off between them. Done so far: `core/math.js`, `core/geometry.js`.
- [x] **CU-10** Objective interaction, for ChatGPT's GP-11 (his request): a production snapshot per
  objective approach point (`getObjectiveProps()` in `docs/contracts.md`): whether the player can
  actually use it from where they stand (reachable, not through walls), whether E is pressed or
  held, and what cancels a hold (damage, death, a modal opening, walking off). Propose the shape
  in `handoffs/requests.md`; Claude approves it into `docs/contracts.md`.
- [x] **CU-11** Build `getObjectiveInteraction(id)` as approved (D-17), with a test, in your
  interaction code. ChatGPT's GP-11 waits on it. Accepted 02:40Z: Claude held E for 0.7 s in a
  probe, the timer ran (0.69 s), stayed 0 on the fuel stand, and walking off cancelled with 'left'.
- [x] **CU-12** Tighten t55. "hold timer exists" (`holdSeconds === 0 || holdSeconds >= 0`) is
  always true, and "does not follow a second site" is checked the instant E goes down, when every
  timer is 0 anyway. Hold for ~0.7 s, then check the radio's timer is above 0.3 and the fuel
  stand's is 0; add a walk-off check ('left'). Claude's probe of exactly this passes today.
- [x] **CU-13** The stopping point (Jerry, 03:55Z). When ChatGPT (GP-13) and Grokbot (GB-21) have
  checked out: commit everything that isn't committed (CL-14, GB-17, GB-19, GB-20, GB-21, GP-12,
  GP-11, GP-13, your audio/loader slices), run the full `npm test`, push, and write the commit, the
  numbers and any failures in your handoff. Then stop.
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
- [x] **GB-10** t34 for ChatGPT's HQ briefing (GP-5): E now opens the briefing, and only its
  Sound alarm button starts the wave. Assert the dialog opens and `!hq.seq`, click Sound
  alarm, then keep every existing strobe, flare and wave check. Check out with `--review`.
  (Grokbot started this at 22:02 under his GB-5 check-in.)
- [x] **GB-11** D-8 `purchase-delivered`: emit `dw-game` `{ type: 'purchase-delivered', itemId,
  cashSpent, source: 'build' | 'upgrade' }` after a piece is placed or a paid upgrade or
  repair lands (ChatGPT's coach needs it for the first-purchase lesson).
- [x] **GB-5** Floors, stairs, bridges and cover behave as they look, with a test for each fix.
- [x] **GB-9** Felled trees now lie for 120 s as solids tagged `kind: 'log'` (CL-5). Rebuild the flow
  field when `'dw-log'` fires, so zombies path round a log instead of pushing along it. Switch
  the zombie update's wading and swimming checks to `waterAt(x, z)`, which also gives the
  current if you want zombies carried downstream.
- [x] **GB-13** The guardian night (order of work, step 8), **spec only**: write
  `docs/specs/combat-phase2.md`: which night, where it comes from, how the player reads it
  coming (cave warnings, the HQ briefing), how it is beaten, what it drops. Send it to Claude
  and ChatGPT for review. No `index.html` until the split lands.
- [x] **GB-15** Two test fixes, tests only, so they're safe during the freeze:
  (a) t34: `const lit = ... || true` is never asserted. Make the strobes-on check a real `ok()`,
  or say in the handoff why it can't be checked headless. (b) t43 "queue drained in lockstep"
  fails about 1 run in 6: extra shamblers are alive that didn't come from the queue. Find where
  they come from, and make the check count only zombies spawned from the plan.
- [x] **GB-12** Floors follow aim (D-12): without an elevated aim, a grounded
  floor in a walled square goes at the player's feet. t13 stays as it is; fix any of t5, t6,
  t11 or t12 that relied on the default by making it aim. Check out with `--review`.
- [x] **GB-14** The guardian night (D-13, `docs/specs/combat-phase2.md`), after GB-12, using
  ChatGPT's GP-10 keys, with the two D-13 changes and the spec's six acceptance checks as a new test.
- [x] **GB-16** The objectives' combat side (`docs/specs/objectives-phase2.md`, "Delivery checks"):
  (a) the radio's two Shambler defenders, once per run on first approach within 24 m, from
  nav-valid spots 8–12 m round the cabinet, at least 8 m from the player and out of view,
  deferred when capped; (b) capacity-aware grants that return the accepted quantity and the
  remainder (MedPens, grenades, ammo and fuel packs); (c) a `dw-game` event when the player
  takes damage, so the radio's hold-E repair can be interrupted. (d) From the GB-14 review:
  t53 has no check for the stuck-guardian failsafe; add one. (e) Approved, for ChatGPT's GP-12:
  `grantBuildBlueprint(id)` in your builds section, returning `'granted'` or `'already-owned'`,
  with no Cash and no purchase event. Send ChatGPT the shapes of (b), (c) and (e).
- [x] **GB-17** The three D-16 fixes: fractional saw fuel in `grantSupply`; refuse ammo for
  calibres with no owned weapon; first-blood only from a planned guardian in an ordinary run,
  with the kill position. A test for each (t54, t53). Approved 03:05Z: Claude re-ran t53 68/0,
  t54 32/0 and t55 10/0 on the device file; `x, z` are the kill spot, the same one the cash drops at.
- [x] **GB-18** Scripted-death replays, **spec only** (Jerry's order of work, step 8, second half;
  `combat-phase2.md` §8 left it for later). One short doc, `docs/specs/replays.md`: which scripted
  deaths can be replayed (cave grab, the others you own), where the player starts one (the death
  screen? the HQ?), what it costs or unlocks, what state it must not touch (the run, the bank,
  the wave plan, rule 10), and which parts are ChatGPT's (the button, the strings). Propose, don't
  build; Claude approves it into a decision.
- [x] **GB-19** `getGuardianAlive()` for ChatGPT's boss pip on the minimap (`combat-phase2.md`
  §3.4): `null` when no guardian is planned or alive, else `{ x, z, hp, hpMax, caveIndex }`. Small,
  in your zombies section, with a test. Tell ChatGPT the shape.
- [x] **GB-20** Build the scripted-death replays as approved (D-18, `docs/specs/replays.md` §6):
  `listScriptedDeathReplays`, `canReplayScriptedDeath`, `beginScriptedDeathReplay`,
  `isScriptedDeathReplay` and the `dw-game` `scripted-death-replay` event, in your scripted-kill
  code. The test is §8's: bank, `day`, `waveQueue`, `wavePreview` and every `tt_*` localStorage key
  deep-equal before and after a forced replay, and after an aborted one. Send ChatGPT the shapes.
  Reviewed 03:55Z: APIs recorded, but the replays don't play yet: GB-21.
- [x] **GB-21** Make the replays actually play (D-18). ChatGPT read the code and my probe agrees:
  (a) `updateScriptedKill` aborts on `gameOver || won`, and a replay starts on the death screen with
  `gameOver` true, so the next frame aborts it: the cine never plays. (b) `beginScriptedKill(replay)`
  snapshots the pose after it has already cleared the burial cine and added the cine classes, and it
  never moves the marine to the grab spot. (c) So the camera isn't put back: on the death screen it
  sits at (-94.56, 3.68, 102.15), after a replay or an abort at (-94.96, 10.40, 90.30), and with no
  replay it doesn't move. Fix all three, and make t56 let real frames run: one replay to its natural
  end ('end' phase), one aborted mid-way, each comparing player, camera and `body` classes with the
  values from before the replay began.


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
- [x] **GP-5** The HQ wave-preview panel, after GB-3.
- [x] **GP-8** The Phase 2 objectives design handoff that CL-12 waits on
  (`docs/specs/ui-phase1.md`, "Phase 2 design"): for each of the seven sites, the prop
  list with rough sizes, what the player does there, the reward, and the strings keys.
  Use the positions from `handoffs/2026-09-23-claude-CL-6-objective-sites.md`.
  Hand it off to Claude.
- [x] **GP-7** The prep checklist (`docs/specs/ui-phase1.md` §6), in your HUD and HQ
  sections. Ship bank, ammo, repair and alarm first. `prep.fortify` needs a reachable
  target area from Grokbot: ask him for it and leave that slot out until he answers.
  Fewer than three goals is fine.
  **Unblocked (D-11):** apply the three-line hook from `handoffs/2026-09-23-chatgpt-GP-7-repair.md`,
  check in `index.html (HUD prep)`, and check out quickly so Cursor can start the split.
- [x] **GP-9** The objectives UI, as new files only (`ui/objectives.js`, its CSS, its test): the
  markers, the HUD tracker and the strings for the seven sites in your GP-8 design, built
  against a stub of the site list. Wiring waits for the split and Claude's props (CL-12).

- [x] **GP-10** The guardian night's strings in `ui/strings.js` (freeze-safe): the keys in
  `docs/specs/combat-phase2.md` §3.3 and the first-blood reward in §5, as your guardian review
  settled them. Keys only; the wiring comes with GB-14 after the split.

- [x] **GP-11** The objectives, wired. CU-11 and CL-15 are both in: your state machine, one tracked
  objective, rewards and receipts, driving the props through the objective contract
  (`docs/specs/objectives-phase2.md`, your GP-9 UI).
- [x] **GP-13** The replay chrome (D-18), once GB-20 is in: Watch again on the death screen for a
  cave or pit death, a clickable found tile in the death catalogue, the `replay.*` strings, and
  hiding Try again while `scripted-death-replay` is running.
- [x] **GP-12** The guardian first-blood receipt (Grokbot's request): on `dw-game`
  `guardian-first-blood`, once per run, the free mortar blueprint if it isn't owned, else +80
  skull value to bank at the HQ. Never direct Cash, never a purchase event.

### OpenCode — left the crew on 2026-09-23 (D-10). Kept here as a record.

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
- [x] **OC-2** `npm run crew` (was CU-6):
  - **What:** in `package.json`, add `"crew": "node crew/crew.mjs"` to `"scripts"`, after
    `"serve"`. Mind the comma on the line before.
  - **Proof:**
    - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`
    - `npm run crew`
- [x] **OC-3** `docs/contracts.md` (was CU-3). Claude keeps it from here (CL-13):
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
- [~] **OC-4** Test watch: back to Cursor at commit time (D-10).
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
### Antigravity — the crew's eyes (model: see its card)

How you work:
- **Serve the game:** run `npm run serve` in a terminal, then open
  `http://127.0.0.1:8971/index.html?debug=1` in your browser. `window.TT` is there in
  DevTools; `tools/shoot.mjs` takes fixed views if you prefer.
- **Save your work:** screenshots go in `qa/shots/<date>-<task>/`, and a short report in
  `qa/<date>-<task>.md`. That is your handoff (use the template).
- **Proof:** every "works" and every "broken" names a screenshot and says what you did.
- **Send findings to the owner:** `node crew/crew.mjs request antigravity <owner> "<what's wrong>" "<steps, expected, seen, screenshot path>"`.
- **Never edit game code.** Not `index.html`, `assets/`, `ui/` or `tools/`.

- [x] **AG-1** Baseline:
  - Get the game to the title screen in your browser, and write down how long it took.
  - Screenshot: the title; the HQ; the pit (TT.LAKE_HOLE, from the bank); the shale cave
    from the front.
  - Put in `qa/README.md` exactly how you run and screenshot the game, so your next
    session can repeat it.
- [x] **AG-2** Claude's world changes, seen for real (report to Claude):
  - (a) **The pit:** the rune ring should glow up through the water from the bank and
    from above (CL-1).
  - (b) **The cave warnings:** `TT.caveWarn('cave:shale', 1)` then `2` then `0`. Watch from
    30 m, 70 m and 120 m, in daylight and at night. Do the eyes read, and is the dust too
    much or too little? (CL-4)
  - (c) **A felled tree:** fell a tree near you with `TT.beginTreeFall(tree, 1, 0)`. Can you
    walk through the log? Do shots stop on it? After two minutes it should sink. (CL-5)
- [x] **AG-3** Grokbot's build fixes, in real play (report to Grokbot):
  - (a) Put a turret on a low pillar by aiming at it from the side (GB-7).
  - (b) Standing on the ground inside four walls, aim a floor at the wall tops: do you get
    a roof, or a walkway at your feet? (GB-8; check after Grokbot checks it out.)
- [x] **AG-4** ChatGPT's screens (report to ChatGPT):
  - The loading screen's stages as the game loads (GP-3).
  - Settings with no Skip prep row (GP-2).
  - Once they're checked out: the first-minute coach (GP-4) and the HQ briefing (GP-5).
- [ ] **AG-5** Shots on request, standing. Anyone can send you `"shots: <what>"`. Answer with
  the images and one line on what you see.
- [x] **AG-6** Claude's tree batches (CL-10), on a real GPU, once they land. Walk from the HQ
  out to the edge of the map and back. Look for trees that pop, vanish, flicker, change
  colour, or appear twice as the player passes about 45 m from them. Shoot and burn a
  tree 100 m away with the scope. Report the frame rate before and after (`?trees=single`
  turns batching off, for the "before").
- [x] **AG-6b** Redo the tree shots with batching on. The first set was taken while `index.html`
  was briefly broken (a column of the game's source code shows down the left of every
  batch-on picture), and from different spots than the batching-off pictures. Take on and off
  from the same camera positions, and look at each picture before you describe it.
- [x] **AG-7** ChatGPT's screens, from his two requests: the GP-7 prep checklist in the live game
  (HUD and HQ, bank/ammo/repair/alarm ticks), then the GP-9 objectives fixture at
  `/ui/objectives.fixture.html` at desktop width and 390 px. Report to ChatGPT.
- [ ] **AG-7b** The GP-7 prep checklist again: Play, wait until `body` no longer has `deploying`
  (the landing), then check the goals and tick them (bank, ammo, repair, alarm). Report to
  ChatGPT.
- [ ] **AG-8** The pit's rune ring on a real GPU (CL-14). `node tools/shoot.mjs pit`, then two
  more by hand: from the lake bank at eye height, and from straight overhead (about 30 m up).
  Compare with Claude's headless shots in `qa/shots/cl14/`. Say whether both rings read as
  writing, and whether the dark jagged bits cutting into the inner ring are there on the GPU too
  (on WebGL they are the funnel's bed showing through). Report to Claude.

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
- [x] **CL-10** Tree batches: far trees draw from 51 merged cells; tree draws ~860 → ~190
  (`handoffs/2026-09-23-claude-CL-10-tree-batches.md`).
- [~] **CL-11** Night readability: HQ windows, campsite lanterns, moonlight on the water. Parked for
  Jerry's planning session: it's a design question first (how dark should night be, with NVG on N?).
- [x] **CL-12** The seven objective props, as a new file, `assets/world/objective-props.js`
  (`handoffs/2026-09-24-claude-CL-12-objective-props.md`). Test t52.
- [x] **CL-15** Wire the objective props into the world (shared `poiMat`), and
  write the objective contract in `docs/contracts.md` with ChatGPT's GP-9 snapshot.
- [x] **CL-16** Trees face the same way every load (`handoffs/2026-09-24-claude-CL-16-seeded-tree-yaw.md`). `makeTree` turns each tree with
  `Math.random()`, so the forest is rotated differently on every load: the world isn't
  deterministic (rule 10), and AG-6b's on and off pictures show the same tree turned two ways.
  Seed the turn from the tree's position.
- [x] **CL-14** (`handoffs/2026-09-24-claude-CL-14-pit-rune-ring.md`) The pit's rune ring draws through the water on a real GPU (AG-2), but from above
  it reads as a few faint cyan specks. Make it read from the bank and from overhead.
- [x] **CL-13** Keep `docs/contracts.md` (D-10). Done for now: owners, pre-split locations, the D-8
  events, the D-11 repair helpers and the tree-batch rule are in. Kept up as contracts change. Review OpenCode's first version: give every
  entry an owner and its location before the split (all of these live in `index.html` today,
  not `world/*` yet), and add the D-8 `dw-game` events and the tree-batch exports.
- [~] **CL-7** The world bake: parked by D-2.
