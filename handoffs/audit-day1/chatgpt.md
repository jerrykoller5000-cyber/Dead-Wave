# ChatGPT — GP-30 day-1 audit — 2026-09-25
Changed:          Audit only, no game code changed. 9 problems: 0 S1, 6 S2, 3 S3. Biggest issues are delayed skull feedback, hidden mobile interaction prompts, and the payoff disappearing during the finisher.
Files:            handoffs/audit-day1/chatgpt.md
Tests:            node --test ui/*.test.mjs -> 73 pass, 0 fail. Headless production-DOM probes covered fresh entry, HQ briefing, kiosk, simulated final kill, menu restart and bank delivery; details and outputs below. npm test: not run, documented CDP Page.enable limitation; shared suite belongs to the committing owner.
Screenshots:      None written under the audit's report-only instruction; computed DOM geometry and CSS evidence below. Antigravity owns current real-GPU screenshots.
Not verified:     Natural full-day survival, human first-bank time, real video/audio playback, cold/warm launch budgets, FPS, world rendering and combat feel. Headless probes use the existing stand-in renderer, and debug setup is identified below.
Requests:         None during investigation; this audit goes to Claude for CL-40. No fixes implemented.
Contract changes: none.

## Top 5

1. **GP-A1:** Eight-value reward pooling delays the first skull and the banking lesson; flush or expose earned value.
2. **GP-A2:** Tracking any objective on a narrow screen hides the bank coach and kiosk prompt, even at HQ.
3. **GP-A3:** The day-clear message expires during the finisher; the player returns to prep without a readable payoff.
4. **GP-A4:** Quit to menu silently abandons the run and deletes its morning save.
5. **GP-A6:** First-run guidance offers only the alarm before the player has learned the loop or found a cache.

## Method and limits

Read the live source and ran inline Node/Playwright scripts through `node --input-type=module`; no audit helper files or screenshots were written. Each game probe used a new browser context, so localStorage began empty. Served the existing index with only its import map redirected in memory to the repository's `tools/tests/fakethree.mjs`/`faketsl.mjs`/addon fixtures. Used `?debug=1&raf=timer`, normal callsign/Play controls and the actual nine-second insertion path. Opening dismissal used the approved `DWOpening.dismissForTesting()` hook. This verifies DOM/state transitions, **not** the appearance or speed of the real game.

Teleports, spawning/killing test zombies and draining a wave are diagnostic setup, not claims of an ordinary playthrough. Tests ran with headless Edge; Jerry's screen was not controlled. Browser `pageerror` capture was empty in completed probes. The full shared suite was not run here.

Source snapshot recorded during the audit: index.html SHA256 `95B67E8147F2278E67A81C68D6FF32AC8541B568860C3C54D1E30830095F81C7`; ui/strings.js `63290A26442A34E34DA35EF61B1C5D8142FCEAEFCFB31D5F006F2D7DF79377DD`; ui/hud-layout.css `F67E7551C7967923E73837978EE11B8A942DAC43BE2520CB85F3C24D675F6A80`. Function names are stable anchors if line numbers move.

## Problems

### GP-A1 · S2 · economy/onboarding · First kills give no visible skull or banking lesson
- Where: index.html:18569–18582 (`CASH_LIFE`, `CASH_DROP_MIN`, `awardCash`), 24714 (Shambler value), 26496 (reward), ui/coach.js:21,47–48.
- Steps: Fresh day 1, kill one Shambler, look for its skull and the coach. Keep killing without a streak; collect the first skull when it finally appears.
- Expected: A first kill gives clear feedback that teaches kill -> collect -> bank. Earned value should be understandable and available after the wave.
- Seen: Rewards smaller than 8 accumulate invisibly. One ordinary Shambler earns 1; the first seven such kills drop nothing. The coach waits for a pickup, so it is silent too. With 20 unmultiplied kills, only 16 value drops; 4 stays in the pool until later kills. There is no flush in `startPrep`. Dropped skulls also expire after 30 simulation seconds.
- Owner: ChatGPT economy/onboarding with Grokbot reward delivery.
- Fix idea: Guarantee early visible skull feedback, then explicitly account for pooled remainder; agree the mechanism with the lead before changing rewards.
- Proof: Inline headless probe used real `spawnZombie`/`killZombie`, resetting combo between kills: `FIRST_KILL {drops:0, bag:{count:0,value:0}, coachHidden:true}`; after eight: `EIGHT_KILLS {bag:{count:1,value:8}, coach:'Skulls collected. Bring them to the HQ window to bank Cash.'}`. Real E deposit then produced bank 48 and `banked:true`. A previous one-kill pickup wait timed out; this was the pooling assumption, not an unexplained test failure. Pure ledger matching the source printed `earned:20,droppedValue:16,undroppedPool:4`.

### GP-A2 · S2 · HUD · Objective tracking suppresses unrelated interaction help on mobile
- Where: ui/hud-layout.css:40–44.
- Steps: At width <=600px, track a cache, leave it tracked, and approach the kiosk or HQ window with skulls.
- Expected: The relevant local E action remains readable; a distant tracked cache does not replace it.
- Seen: `body:has(.objective-tracker:not([hidden]))` hides **all** `#kioskPrompt` and `#firstMinuteCoach` content. The rule has no reach or interaction check. Tracking can therefore hide both ordinary banking help and its coach at once.
- Owner: ChatGPT.
- Fix idea: Suppress only a genuinely duplicated prompt for the currently reachable tracked objective; preserve local HQ/kiosk actions.
- Proof: Isolated headless DOM loaded the actual stylesheet at 390x844: `TRACKED_MOBILE {coach:'none',kiosk:'none'}`; hiding the tracker gave `UNTRACKED_MOBILE {coach:'block',kiosk:'block'}`. Source-backed CSS reproduction; real-GPU travel/overlap not verified.

### GP-A3 · S2 · dawn/feedback · Day-clear payoff disappears inside the finisher
- Where: index.html `killZombie` last-kill branch, `updateZombies`:35455, `startPrep`:26993; ui/wave-preview.js.
- Steps: Finish the last zombie, watch the finisher, then look for the night's result and next briefing.
- Expected: A readable payoff after the camera returns, followed by a clear next action. The fuller dawn summary is a phase-3 target, not already promised as implemented.
- Seen: `startPrep` advances to day 2 while the finisher is still active and starts a three-second banner. By the end of the finisher the banner is gone. No summary or automatic next briefing appears; the player must revisit the HQ panel. The existing best-streak text is a run-wide `comboBest`, not a per-night summary.
- Owner: ChatGPT presentation; coordinate timing with Claude/combat.
- Fix idea: Present the day-clear receipt after the finisher returns control; make the next briefing reachable from that moment without adding another combat interruption.
- Proof: Diagnostic real last-kill path (`beginWave`, clear/drain plan, spawn one Shambler, `killZombie`) printed `LAST_KILL {day:2,finisher:true,briefing:false,banner:'DAY 1 CLEARED...'}`; after waiting for finisher completion: `AFTER_FINISHER {day:2,phase:'prep',bannerClass:'',briefing:false}`. Audio state at last kill was `stage:'relief',sting:'clear',solo:true,overlapFrames:0`. Natural full-wave pacing and audible mix remain unverified.

### GP-A4 · S2 · menu/save expectations · Quit to menu silently abandons the run
- Where: index.html:869 pause description, `quitToMenu`:36520, `startMode`:36651; morning-ledger comment at 26933.
- Steps: Reach day-2 prep, open Pause, choose Quit to menu, then Play.
- Expected: If this ends the run, the control says so before destroying it. It should not read like leaving a paused run temporarily.
- Seen: Quit deletes `tt_day_start`; Play starts day 1 with 40 Cash. No warning or indication of abandoning progress. The source explicitly makes ordinary Play and Play again fresh runs; this is a **decision/label concern**, not a request to undo Jerry's correct day-1 restart after death. Save restore currently has only a debug caller.
- Owner: Cursor for save/menu lifecycle, ChatGPT for wording.
- Fix idea: Clearly label abandoning the run, or offer a separate agreed Continue path; Jerry/Claude decide retention behavior.
- Proof: Headless normal menu-button path after diagnostic day advance: saved ledger present -> `QUIT_MENU {menu:true,save:false}` -> `PLAY_AFTER_QUIT {day:1,cash:40}`. `rg -n 'readDayStart\(|applyDayStart\(|clearDayStart\(' index.html` confirms only debug `loadDayStart` restores it.

### GP-A5 · S2 · economy copy · The five-kill skull-value bonus does not pay on day-1 enemies
- Where: index.html:26100–26114 (`comboMult`/banner), 26496 (rounding); ui/strings.js streak copy.
- Steps: Reach five Shambler kills in one streak on day 1 and compare value earned per subsequent kill.
- Expected: The advertised x1.25 skull-value reward has a real effect, or the wording accurately describes the reward.
- Seen: `Math.round(1 * 1.25)` is still 1. At ten kills the advertised x1.5 instead rounds to 2. The speed/reload powers remain real; the monetary promise is the mismatch. Hidden pooling in GP-A1 further obscures this.
- Owner: ChatGPT economy with Grokbot kill settlement.
- Fix idea: Review the existing fractional-value proposal with the lead, or adjust the promise. Do not silently change horde sizes or reward balance.
- Proof: Node arithmetic using current formula printed `(streak,advertised,paid) = (4,1,1), (5,1.25,1), (9,1.25,1), (10,1.5,2), (20,2,2)`. Day-1 plan inspection returned 20 Shamblers, base value 1, no Ember modifier.

### GP-A6 · S2 · onboarding/objectives · First-run guidance starts at the alarm, before teaching preparation
- Where: ui/coach.js:21,47–49; ui/prep-checklist.js:14–33; ui/objectives-runtime.js:44; index menu/briefing adapters; docs/specs/tutorial.md.
- Steps: Fresh profile, enter name, Play, land, inspect the HUD and first HQ briefing without opening Tips.
- Expected: One concrete first action that introduces the loop and gives a reason to explore before calling the horde.
- Seen: Coach is hidden until a pickup/purchase. Settled checklist has only the alarm goal. First briefing names the largest cave and Shambler, then offers Sound alarm; no preparation objective. Cache discovery needs proximity within 24m (or radio reveal), but there is no first-run nudge toward one. The tutorial is still a proposal; there is no tutorial offer or replay entry in the menu.
- Owner: ChatGPT, with existing world/combat contracts.
- Fix idea: Bring the first lesson and a concrete nearby task into the existing flow when Jerry approves the tutorial plan. Keep this classified as an implementation gap, not a regression of a shipped tutorial.
- Proof: Fresh browser `MENU` contained Play/Settings/Quit/Callsign; `PREP_SETTLED {text:'Prep 0/1',hidden:false,coach:true}`. Briefing text: largest approach, main threat Shambler, Field Intel note, one goal `Start the wave at the HQ panel`, Sound alarm, Close. No tutorial event/element in the inspected production path. Human first-bank-within-60-seconds test not performed.

### GP-A7 · S3 · kiosk · The first plausible gun upgrade is buried below expensive weapons
- Where: index.html:18869 owned-first stable sort of `WEAPON_ORDER`.
- Steps: Fresh profile, kiosk -> Weapons.
- Expected: After the owned pistol, a new player can quickly find the next realistic purchase.
- Seen: Pistol, Minigun $420, M4 $160, AK $195, then Uzi $70. Owned-first is correct, but the remaining original order puts the cheapest next gun below several unaffordable choices. Ammo correctly opens first and shows .45; preserve that improvement.
- Owner: ChatGPT.
- Fix idea: Keep owned first; order the remaining guns by intentional progression or price.
- Proof: Actual headless kiosk `innerText` printed that sequence. No claim about every viewport's exact fold.

### GP-A8 · S3 · menu layout · Footer overlaps the callsign area in a short landscape window
- Where: assets/intro/opening.css:41,65–67.
- Steps: Open the fresh menu at 844x390.
- Expected: Callsign input/error and decorative footer occupy separate space.
- Seen: Input spans y334–368, name row y314–388, footer y366–378. The menu's scroll height is 407 in a 390px container with `overflow:hidden`. These elements share the same left edge; the footer intrudes into the input/error area. The tested 1280x720 and 390x844 menus fit.
- Owner: ChatGPT.
- Fix idea: Hide/reposition the decorative footer at short heights and permit enough vertical room for required name/error controls.
- Proof: Production DOM `getBoundingClientRect()`/computed-style probe; exact rounded bounds above. No screenshot or real-GPU typography comparison claimed.

### GP-A9 · S3 · copy/catalog · Most older screens still bypass the string catalog; removed menu keys remain
- Where: index.html menu/pause/tips markup, `SHOP_HINT`:18826, skull HUD:19810, day-clear banner:26995; assets/intro/opening.js; ui/strings.js:89,149.
- Steps: Compare those displayed sentences to keyed copies and look for consumers of the removed menu labels.
- Expected: One maintained source for player text, without reviving Jerry's removed studio eyebrow/tagline.
- Seen: Most menu/settings/tips and several kiosk/wave/HQ strings remain literal. `shop.hint.weapons` is now correctly connected, but neighboring hints still duplicate catalog copy. Skull HUD displays `($value)` rather than the existing explicit skull-value key. `menu.studio` and `legacy.menu.tagline` have no found production consumers in index, ui, game, core or intro JS.
- Owner: ChatGPT; opening's early-loading fallback text needs care during migration.
- Fix idea: Migrate screen by screen with visible checks, then retire confirmed unused menu keys. Preserve the opening's ability to display failures before module loading succeeds.
- Proof: Source search and actual menu/kiosk text. Inline Node production-file scan returned `KEY_REFERENCES menu.studio []` and `KEY_REFERENCES legacy.menu.tagline []`. These are migration/dead-copy findings, not claims that removed text remains visible.

## Day-1 affordability, using today's implementation

Fresh start was verified at **40 Cash, 12 loaded pistol rounds, 50 spare .45**. Day 1 is 20 Shamblers. Current prices: .45 pack 36/$12, barricade $8 with no blueprint cost, wall blueprint $25 plus $14 each, MedPen $65, Uzi $70, Field Intel $120. Restock all from starting inventory costs $48 and is disabled at $40; the $12 individual pack remains available below it.

The player can afford meaningful basic preparation: two barricades plus one ammo pack costs $28 and leaves $12. Starting 62 bullets cover 20 one-hit kills at >=20/62 (~32%) accuracy; if cave modifiers make each kill take two hits, the threshold is ~65%. This is a simple ammo bound, not a measured human success rate; knife, headshots, caches, drops and misses against cover alter it.

Under **no streak, no optional loot, every dropped skull collected**, 20 earned value yields only 16 currently dropped value, so end Cash before spending is $56, or $40 after two barricades. With one uninterrupted 20-kill streak, rounding earns 31, drops 25 and retains 6 in the pool: $65 before expenses. Thus even a perfect bank-only first wave does not buy the $70 Uzi, and the $65 MedPen consumes the entire best-case balance. Medical caches offer alternatives (2 MedPens at convoy, 1 at Hikers), but GP-A6 affects whether a beginner finds them. This is a pacing tradeoff for GP-25/GB-29 review, **not proof day 1 is impossible**. Keep horde sizes unchanged.

## What checked out, and coverage boundaries

- Fresh storage began empty. Loading channel reached Ready with all four actual stage states complete; this stand-in run is not a launch-time benchmark.
- Empty callsign correctly blocks Play with `Enter your name to play.`; menu contains no gameplay-description tagline.
- Normal insertion reaches day 1. The initially sampled `Prep 0/0` settles to `Prep 0/1`; not logged as a persistent defect.
- Briefing works through real E at the HQ panel. Limited intel is intentional, and the full-roster upgrade remains $120 as approved.
- Kiosk defaults to Ammo, puts owned .45 first, shows the full-ammo purchase wording, and distinguishes Restock all from individual packs.
- The actual pooled pickup and E bank transaction transferred 8 skull value to Cash and marked the coach's bank step complete. A single-kill pickup timeout was explained by GP-A1 and reproduced with the correct eight-kill threshold.
- Simulated final-kill audio state entered relief/clear with solo=true and overlapFrames=0. Objective cue placement remains at confirmed delivery (`onComplete` in the UI adapter), not repair start. Audibility, cue mix and real alarm/song timing belong to Claude/Antigravity's live audit.
- Settings fit at 390x844. Death UI from a diagnostic day-2 hit showed the cause, day, kills, headshots and best streak; Play again returned to the menu. A separate day-1 `TT.endGame(false)` probe showed day 1 / 8 kills, then actual Play again -> Play -> insertion yielded `NEW_RUN {day:1,cash:40,bag:{count:0,value:0},deaths:[]}`, `ERRORS []`. This checks end/restart state, not naturally dying in combat; the generic `Try again?` text in that probe came from calling endGame without a cause.
- Full natural day/night pacing, world/navigation clarity, guardian fairness and real rendering performance were not claimed. No new system or balance change was made; stop for CL-40 after submitting.
