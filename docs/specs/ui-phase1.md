# Dead-Wave: player interface specification

Author: ChatGPT. Date: 2026-09-23. Status: Phase 0 specification, not implemented.
Authority: Jerry's task order and AGENTS.md. Claude leads; Cursor integrates.

## Release gates and ownership

Foundation comes first, load time second, then work within each owner's files.
This document does not lift the index.html split freeze. Implementation begins
only after Cursor hands off the split and Claude releases this work under that
order. At inspection, package.json, tools/shoot.mjs, docs/contracts.md and the
ui/game/core module directories were absent. Their absence is not permission to
create competing engine plumbing.

ChatGPT owns UI, keyed copy, economy, objectives and player-facing audio cues.
Proposed UI files are ui/strings.js, ui/coach.js, ui/settings.js,
ui/loading.js, ui/wave-preview.js, ui/prep-checklist.js and ui/audio-cues.js;
use Cursor's eventual filenames when equivalent modules already exist.
Economy and objectives live in game/economy.js and game/objectives.js.
Other owners migrate their own callers. Audio engine routing, the bootstrap and
error card stay with Cursor; world sound sources stay with Claude; combat sound
triggers stay with Grokbot. No new CDN, build step or world randomization.

All interfaces below are PROPOSALS for docs/contracts.md, not approved exports.
Claude approves them; owners supply their exports and Cursor wires integration.
No UI reads another module's mutable globals or uses window.TT in production.
Each of the six implementation tasks gets a separate dated handoff, in order.
The Phase 2 design is a later handoff, not extra scope inside an earlier task.

## Shared presentation and resource rules

- Kills drop skulls. Pickups increase carried skull count and skull value; they
  do not increase Cash. E at the HQ window deposits skulls; Cash increases when
  processing completes. Cash pays for kiosk purchases and builds.
- Use `Cash`, `skulls`, `skull value`, `HQ window`, `HQ panel` and `Supply Kiosk`
  consistently. The HQ window banks; the separate HQ panel starts the wave.
  Streak, Scavenger and Blood Moon multipliers increase skull value.
- Existing rare Cash stacks remain direct Cash pickups and must be labelled as
  that explicit exception. This pass does not rebalance existing prices or loot.
- Keep the cinematic menu and required callsign. No gameplay description on the
  opening menu. The current descriptive tagline needs removal by the shell owner
  or after the menu moves into UI; do not change index.html during the freeze.
- Compact bone-colored text, restrained amber emphasis, dark translucent panels.
  At most one coach message and three prep goals. Do not cover the reticle,
  health, ammo or urgent threat warnings. Never require sound or color alone.
- Keyboard focus is visible. Escape closes the top UI and returns focus to its
  trigger; it does not also fire, buy or sound the alarm. A held E must not both
  open an HQ panel and activate its first button. Suppress stale held input.
- Announce meaningful changes politely for assistive technology; do not announce
  every frame, loading counter increment or repeated proximity update.
- Respect existing SFX volume/mute, reduced motion and audio unlock state. Intro
  sound remains enabled by default; gameplay cues remain gated until the menu.

## 1. Centralize every player-facing string

Deliverable: ui/strings.js with stable semantic keys and a small native-module
lookup/formatting API, proposed `text(key, params = {})`. No localization library.
Use complete sentences with named parameters, not fragments concatenated by
callers. Singular/plural variants are selected from count; controls come from
action labels rather than hard-coded E/R/B in every message. User names render
through textContent, not HTML interpolation. Do not translate internal IDs.

Inventory includes shell/title/intro controls, menu validation, HUD labels and
units, kiosk tabs/items/descriptions/prices/states, build-wheel categories and
placement reasons, pause/settings/tips, maps and POI labels, developer-command
feedback shown to players, wave/streak banners, interaction prompts, objective
states, subtitles, scripted death captions, and accessible labels/tooltips.
Canvas-drawn labels and world signs are included; their owners consume keys.
Do not silently remove keys still used by another owner.

Key examples and canonical copy:

- menu.play: `Play`; menu.callsign: `Callsign`; menu.nameRequired: `Enter your name.`
- hud.cash: `Cash`; hud.skulls: `Skulls`; hud.skullValue: `Skull value: {value}`.
- hq.deposit: `{interact} — Bank {count} skulls`; singular variant: `Bank 1 skull`.
- hq.processing: `Processing skulls…`; hq.banked: `Banked {amount} Cash`.
- hq.empty: `Bring skulls to the HQ window.`
- shop.title: `Supply Kiosk`; shop.buy: `Buy — {price} Cash`.
- shop.owned: `Owned`; shop.full: `Full`; shop.shortfall: `Need {amount} more Cash`.
- shop.blueprintsHelp: `Unlock a build here. Each placed piece costs Cash.`
- perks.scavenger.description: `+12% skull value per rank`.
- wave.bloodMoon.reward: `×1.5 skull value`.
- build.reason.funds: `Not enough Cash`; build.reason.locked: `Blueprint required`.

Preserve existing valid copy initially except the agreed vocabulary corrections,
the menu description removal and copy explicitly specified below. Migrate the
full inventory, not just these examples. Missing keys fail the test suite and
are visible in development diagnostics; known runtime failures have keyed,
human-readable fallback text rather than raw exception text.

Data/owner needs: Cursor supplies post-split shell and loader call sites and
early string import before Three.js. Grokbot supplies combat/build/type IDs,
catalog IDs and its full displayed-copy inventory; Claude supplies POI/cave IDs,
world label and caption inventory. Each owner replaces its own string callers.
ChatGPT maintains the catalog; additions by other owners are coordinated by key
namespace and handoff rather than simultaneous whole-file rewrites.

Acceptance: all inventoried surfaces match their keys; no unresolved keys or
placeholders; names containing HTML render literally; 0/1/many counts read
correctly; Cash and skull value are distinguished everywhere. Cursor's text scan
must cover DOM, canvas and string templates with explicit non-player exceptions.
Shots: menu, HUD, each kiosk tab, build wheel, settings, tips, map and banners.
Handoff: `YYYY-MM-DD-chatgpt-strings.md` with owner migration coverage and gaps.

## 2. First-minute coach

Screen: one small two-line HUD card above the interaction strip. Never a modal,
never an input lock, never a tips page. Existing urgent warnings take priority.
The three prompts are each eligible once per fresh player profile:

1. First positive skull pickup: coach.pickup = `Skulls collected.` / coach.return
   = `Bring them to the HQ window to bank Cash.` Show for up to 8 visible gameplay
   seconds. Mark the window on the minimap while unbanked skulls remain.
2. First reachable HQ-window proximity while carrying skulls: coach.bank =
   `Press {interact} to bank your skulls.` Replaces the pickup card immediately.
   Hide on accepted deposit, leaving `Processing skulls…` as ordinary status.
3. First successful paid purchase: coach.purchase = `Purchase ready.` /
   coach.loop = `Collect skulls. Bank Cash. Resupply.` Show for up to 6 seconds.
   Use the item's own receipt for its name; do not claim a failed purchase worked.

Track separate shown/completed bits for pickup, bank and purchase. Buying with
starting Cash before collecting skulls cannot suppress the bank lesson. Deposit
completion, not the empty bag or an E keydown, marks banking complete. Repeated
pickup/proximity events do not replay prompts or sounds. At most one queued card;
discard a lesson when its action is already complete, instead of replaying it late.
Pause display timers while hidden/paused/insertion/cinematics; re-check current
state before showing. A nearby-window prompt needs the engine's reachable target,
not distance through a floor or wall. Normal interaction text remains afterward.

Persistence proposal: versioned profile key `dw.coach.v1`, through Cursor's
settings adapter. Persist completion and displayed prompt IDs. New runs retain
completed onboarding; dev Reset resets run state but does not erase the profile.
Tests use a fresh profile explicitly. Blocked storage falls back to session state
without preventing play. A resumed run reconciles completed actions and pending
deposits before showing anything.

Exact data: committed `skullPickedUp` with eventId/runId/count/value;
`depositAccepted`, `depositCompleted` with receiptId/count/value/cashAfter;
`purchaseCompleted` with receiptId/itemId/quantity/cashSpent/source, where source
distinguishes kiosk/build/upgrade from debug grants. Initial snapshot includes
Cash, carried count/value, pending deposit, prior successful purchase/deposit.
Cursor supplies lifecycle/control-ready state, active gameplay time and reachable
interaction `{kind:'hq-window', canActivate, blockedReason}` plus input labels.
Claude supplies a stable HQ window map anchor. Economy owns committed receipts;
Grokbot must confirm successful inventory/build delivery before purchase receipt.

Audio: reuse existing skullPickup, hqDing and kioskBuy confirmations. Do not layer
a new coach beep over each. Effects do not replay when a snapshot is restored.

Acceptance: automated tests cover repeated events, reordered lessons, failed buys,
processing delay, no Cash on skull pickup, profile restore/storage failure and
menu/death/pause suppression. A human first-run check must show a new player banks
skulls within 60 seconds of gaining control, with Tips closed. Record elapsed
time and whether help was given; automation alone cannot prove this criterion.
Do not hide load or insertion time inside that measurement: report separately.
If combat supplies no early reachable skull, request Grokbot's first-wave change;
do not fabricate pickups, Cash or a successful onboarding result in the UI.
Shots: each card, processing and completed deposit. Handoff: `...-coach.md`.

## 3. Remove the dead Skip prep setting

Decision: remove it and its stored value. Manual HQ alarm activation is the
current behavior; automatic starts could cut off shopping or preparation. There
is no reason to introduce a second start policy while teaching the current one.

Settings screen: remove the hidden row, toggle listener and synchronization code;
no replacement toggle or countdown. Keep existing controls and tab order.
settings.prepHelp, where help is relevant: `Start the next wave at the HQ panel.`
Run idempotent `removeItem('tt_skip_prep')` via Cursor's storage adapter even for
legacy value `1`; never clear unrelated settings, coach progress or save data.
Handle inaccessible storage without failing boot.

Grokbot owns removal of obsolete AUTO_SKIP_PREP_S/autoSkipPrep state and checks
for all runtime consumers. Cursor owns any old save migration or debug skipPrep
export still used by tests. Do not delete a tested debug helper by assumption.
Existing docs/gameplay.md has stale prep/cash guidance; ask Cursor/Claude to
assign that documentation update rather than editing outside this task's area.

Acceptance: old flag on/off/absent/storage-disabled cases all retain manual prep;
no dead DOM listener exceptions; pressing the HQ alarm still works once; no
zombies start merely by waiting. Shots: settings before/after and prep HUD.
Handoff: `...-settings.md`, explicitly noting this removal decision and why.

## 4. Honest loading steps

Screen: existing splash/loading surface with a current stage and compact stage
list. Video/intro may play while work continues; they must not gate the work.
No fake percentage, timer-driven advancement or invented remaining time.

Keyed phase copy:

- loading.terrain: `Preparing terrain…`
- loading.world: `Preparing the world…`
- loading.zombies: `Preparing enemies…`
- loading.shaders: `Preparing graphics…`
- loading.ready: `Ready`
- loading.waiting: `Still working: {stage}`
- loading.failed: `Couldn't finish loading.`; loading.retry: `Try again`
- loading.unknown: `Preparing game…` (diagnose an unknown stage for developers).

Each stage has waiting/active/complete/failed states driven by owner events.
If a stage has real completed/total units, show those units or its own fraction.
Otherwise use an indeterminate indicator, with no aria-valuenow percentage.
Different tasks are not equally weighted; no aggregate percentage without a
measured owner-supplied denominator. Stage order follows actual execution.
Concurrent work may show two active stages; do not serialize it for presentation.
`ready` is only an explicit engine event after successful warm-up. Background
tabs must recover the latest snapshot; UI animation frames cannot advance or
block boot. Failure/retry mechanics and error card remain Cursor's responsibility.

Current loadMark observations: `terrain+water+sky built`, `rocks`, `trees`,
`player+weapons+zombie types`, `foliage scattered`, `POIs+minimap+foliage chunks`,
`contact shading + rest of setup`, `post + pools + compile + warm frame`, `ready`.
These are completion marks, not reliable start notifications. The present ordinal
24/32/43/etc percentages must not be relabelled as measured progress.

Exact proposed event/snapshot fields from Cursor and Claude:
`{loadId, sequence, stageId, state, completedUnits?, totalUnits?, unitId?,
startedAt?, finishedAt?, errorCode?}`. Stable stage IDs: terrain/world/zombies/
shaders; allow approved substages. Supply begin/end/error around actual work,
including baked-world read/decode and any live-generation fallback. Never expose
an arbitrary internal stage string directly as final player copy. Cursor supplies
subscribe + current snapshot so early events are not lost before UI attaches;
Grokbot supplies zombie preparation marks through that same owner-owned channel.

Acceptance: fake test events exercise stalled, reordered, concurrent, duplicate,
failed/retried and already-ready loads; a late old loadId cannot overwrite retry.
Real cold/warm/background-tab runs use tools/shoot.mjs and Cursor's measurements.
Targets: title within 15 seconds cold/5 warm on Jerry's PC; 60 fps at 48 zombies.
This UI must not claim those targets were achieved without measurement.
Shots: each active stage, ready, failure; handoff: `...-loading.md`.

## 5. HQ wave preview and kiosk Field Intel upgrade

Screen: E at the HQ panel opens a compact `Day {day} briefing` during prep,
with preview, up to three checklist rows, `Sound alarm` and `Close`. Opening it
does not itself start the wave; explicit activation requests the existing alarm.
That input-flow change needs Grokbot/Cursor's integration, not a UI-side direct
beginWave call. Close/dismiss when the engine confirms alarm start. During a
wave show read-only `Wave under way`; no second alarm request.

Default preview: show the largest approach's cave name and bearing, plus the
dominant enemy type there. For tied largest approaches show both (at most two),
then `Multiple approaches`. No exact counts or full roster by default.
Always retain urgent warnings from the combat owner regardless of upgrade.
wavePreview.locked = `Field Intel reveals the full roster and counts.`

Kiosk > Upgrades: fieldIntel.name = `Field Intel`; description =
`See every enemy type, count and approach at the HQ panel.` Proposed starting
price: 120 Cash, once per run, no prerequisite. Use economy's purchase path;
Cash shortfall, owned and unavailable states follow normal kiosk behavior.
This is a UI/economy upgrade, not a modifier to the wave. Persist with the run;
new run/dev Reset clears it, restore preserves it. Repeated clicks charge once.
Price is proposed tuning to review with Claude before release.

Unlocked preview: group rows by source, showing localized type + count and total
per source; a total across all sources at the bottom. A source can be non-cave
(e.g. river): never assign it to a cave just to fit the UI. Exclude scripted
guardians unless Grokbot explicitly includes a real scheduled showcase encounter.
Empty valid roster says `No attack scheduled`; missing/stale/error says
`Briefing unavailable`, never zero enemies. Allow starting a valid wave even if
its optional briefing is unavailable. Keep last valid same-day revision only.

Required Grokbot export: `getWavePreview(day)` from combat/waves.js, synchronous,
read-only and independent of UI visibility. Proposed result:
`{day, revision, status:'ready'|'unavailable', entries:[{typeId, count,
caveId:null|string, sourceId}], total, primarySourceIds, dominantTypeId}`.
Counts are nonnegative integers and total equals their sum. `sourceId` identifies
every approach; caveId is nullable. Grokbot owns dominant/tie semantics and must
derive this from the same plan that actually spawns. Asking repeatedly must not
consume RNG, advance a queue or reroll the wave. Also needed: plan-change/day/
phase events and requestStartWave() result with a structured denial reason.

Claude supplies `sourceId -> {nameKey, position, bearingFromHQ, caveId?}` and stable
cave IDs; Grokbot supplies type label keys and role description keys. ChatGPT
does not infer enemy roles from model color, cave appearance or last wave.
Economy supplies fieldIntel ownership and purchase receipts. Cursor supplies
focus/input routing and run-save integration. One restrained intel-purchase cue;
do not play the alarm when merely previewing.

Acceptance: locked/unlocked, ties, non-cave sources, unavailable/empty preview,
changed day/revision, affordability, repeated purchase, reset/restore and no-RNG
side effects. Counts must match the actual scheduled plan in Grokbot's fixture.
Shots: basic briefing, full briefing, unavailable, upgrade buy/owned/shortfall.
Handoff: `...-wave-preview.md`.

## 6. Prep checklist: at most three concrete goals

Screen: beneath the HQ briefing; a collapsed `Prep {done}/{total}` HUD summary
can expand without opening a full-screen panel. Show only in prep. No bonus
currency, forced task completion or alarm lock. Fewer than three goals is fine.

Select once at the beginning of each prep, using a snapshot and stable goal IDs.
Priority order, filling at most three applicable slots:

1. prep.bank = `Bank your skulls` when carried or pending count > 0.
   Tick on the matching depositCompleted receipt, not on deposit start.
2. prep.ammo = `Restock {calibre}` for one owned usable weapon whose loaded plus
   reserve ammo is below one standard magazine. Only recommend if an appropriate
   pack is affordable or an already available cache can supply it. Tick when the
   inventory reaches that threshold, regardless of shop/cache source.
3. prep.fortify = `Fortify the {bearing} approach` only if Grokbot provides a
   reachable target area, eligible unlocked build/repair and affordable cost.
   Tick when a committed matching build/repair event satisfies its target.
4. prep.repair = `Repair the damaged {buildName}` as a fallback when an affordable,
   reachable damaged player build exists. Tick at the nominated HP threshold.
5. prep.alarm = `Start the wave at the HQ panel` if no useful third preparation
   goal exists. Tick only on confirmed alarm start, then collapse the checklist.

Do not add both fortify and repair for the same target. Do not recommend already
full ammo, unowned blueprints, empty bank deposits or information hidden by basic
intel. A bearing goal uses the public primary approach, not hidden roster data.
Preserve a goal's completed tick for that prep. Do not shuffle on every purchase;
if a target is destroyed/unavailable, label it `No longer available` or replace
that uncompleted goal once with a concrete fallback. Restore goals by day and
plan revision; a new day builds a fresh checklist. No repeated success chimes.

Exact data: economy snapshot/receipts; Grokbot inventory snapshot with type IDs,
loaded/reserve, magazine threshold and pack cost; affordable blueprint/build
options; `getPrepRecommendations(day)` returning stable recommendationId,
sourceId/bearing, targetArea (center/radius or bounded sector), eligibleBuildIds,
targetEntityId?, requiredHp?, minimumCost and completion predicate ID.
Committed build/repair events include eventId, ownerId, position, buildId, HP and
recommendationId if applicable. Grokbot defines whether the defense actually
protects the approach; UI does not approximate tactical coverage from a dot
product. Cursor supplies interaction reachability and day-restore lifecycle.

Acceptance: 0-3 tasks, priority selection, no impossible recommendations,
completion on receipts, out-of-order/duplicate events, invalid target fallback,
reset/restore and wave-start suppression. Shots: empty, three pending, mixed
complete, changed target. Handoff: `...-prep-checklist.md`.

## Proposed shared data boundaries

Economy is the sole writer of Cash, carried skull value, pending deposits and
purchase receipts after extraction. Proposed `getEconomySnapshot()` returns
`{runId, revision, cash, skulls:{count,value}, pendingDeposit:null|{id,count,value},
ownedUpgrades, firstDepositCompleted, firstPurchaseCompleted}`. Subscription
events include a monotonically increasing revision and unique receipt/event ID.
Money remains integer, nonnegative and never inferred from rendered text.

Grokbot supplies item/build validation and committed delivery hooks; Cursor
approves an atomic purchase boundary with economy before migration. Failed
delivery must not debit Cash; a successful request cannot debit/grant twice.
Do not build a second purchase path just for Field Intel or objectives. Prices,
owned flags and inventory are checked at commit, not only when rendering a row.

Cursor supplies lifecycle snapshots (runId, mode, day, phase, paused, gameOver,
insertion, controlsReady, visibleGameplaySeconds), input labels, interaction
targets, storage/save adapter, subscriptions and deterministic test fixtures.
One subscription per UI controller, disposed on teardown. No frame-loop polling
of every world object to update text. Render only on meaningful state changes.

## Phase 2 design: landmark objectives and caches

Implement only after the six Phase 1 handoffs and owner approvals. Objectives
use existing landmarks; no new random POI placement or terrain/water/cave edits.
All rewards are one-time supplies per run, not automatic Cash from kills and not
a new currency. Existing Cash economy and Field Intel purchase retain their roles.

UI: map marker + one tracked objective with verb, distance and reward. E/hold-E
prompts use the engine's reachable target, not a second UI distance check.
States: undiscovered -> available -> active -> interrupted/ready-to-claim ->
claimed. Destruction may mark unavailable; do not leave an impossible active goal.
Ordinary caches claim on E; radio repair takes 6 seconds of continuous hold-E,
cancelled by release, loss of reach, damage, death or modal UI. Progress resets
on interruption; no reward is consumed. Core/Grokbot approve interaction support.

Copy keys: objectives.track = `Track`; untrack = `Stop tracking`;
interact = `{interact} — {action}`; repairing = `Restoring signal…`;
interrupted = `Repair interrupted`; claim = `Take supplies`;
full = `Inventory full — supplies remain`; claimed = `Supplies collected`;
unavailable = `Site unavailable`. Reward receipt shows actual granted amounts.
Partial capacity grants only the accepted amount and keeps the remainder at
the cache; returning does not grant previously claimed units. No silent overflow.

Objective/reward proposals:

- radio-repair: `Restore the radio mast`. Six-second repair at a service cabinet.
  Reward: reveal unclaimed supply objective markers and one existing ammo pack
  for an owned compatible weapon. Does not unlock Field Intel or hidden wave data.
- medical-convoy: `Recover medical supplies`. Open a sealed case near wreck 0.
  Reward: two MedPens, with any unclaimed remainder retained at the case.
- ranger-cache: `Search the ranger cache`. One ammo pack for an owned weapon.
- hikers-cache: `Recover the hikers' first-aid kit`. One MedPen.
- trapper-cache: `Recover the trapper's supplies`. One grenade, subject to capacity.
- fuel-depot: `Recover the depot fuel`. Annex beside the existing generator shed.
  Reward: one existing fuel pack for an owned compatible fuel weapon; alternatively
  one ammo pack for an owned ballistic weapon. Choose once; no new weapon unlock.
- wreck-salvage: `Salvage the utility truck`. One ammo pack for an owned weapon.

For generic ammo rewards, the claim UI offers only owned compatible calibres,
showing the existing pack quantity; do not invent quantities or conversion prices.
Default to equipped compatible calibre. Grokbot supplies pack/capacity IDs and
grant results. The entire reward set needs economy review against current pack
prices before release; no repeatable cache farming or day-refresh payout.

### Exact proposed positions for Claude and Grokbot

World coordinates below are metres, (x, y, z), sampled from the current running
game on 2026-09-23. They are proposed interaction centers, NOT approved spawn
points or world edits. X/Z are expressed to six decimals; Y must be resampled by
Claude after bake/collider validation. Anchor + world-axis offset is authoritative
if serialization precision differs. Do not rotate these offsets with the prop.

- radio-repair: POI.mast + (3.5, 3.0) in X/Z;
  (-149.868140, 0.384489, -1.152802). Cabinet footprint at most 0.8 x 0.6 m.
- medical-convoy: POI.wrecks[0] + (4.0, 4.0);
  (-113.646726, -0.126267, 49.972118). Medical case at most 0.65 x 0.5 m.
- ranger-cache: POI.campsites[0] + (-5.0, 4.0);
  (30.518463, -5.269634, -19.240429). Ranger-marked case at most 0.65 x 0.5 m.
- hikers-cache: POI.campsites[1] + (4.0, 4.0);
  (2.023837, 0.892436, -77.683512). First-aid pouch at most 0.4 x 0.3 m.
- trapper-cache: POI.campsites[2] + (-4.0, 4.0);
  (-37.486564, 0.414693, 47.809068). Metal case at most 0.55 x 0.4 m.
- fuel-depot: POI.sheds[2] + (4.0, -2.0);
  (-44.127540, -3.117211, -18.339650). Bunded drum stand at most 1.0 x 0.8 m.
- wreck-salvage: POI.wrecks[1] + (4.0, -4.0);
  (-95.909287, -0.135304, -45.769562). Parts case at most 0.65 x 0.5 m.

Read-only probes found no water at these seven centers and at least 1.65 m from
each center to existing body-height circular collision surfaces. This checks
neither continuous route accessibility nor slope/prop footprint and is not world
placement approval. An initial ranger proposal intersected scenery and was
discarded; the final one above has approximately 4.06 m measured clearance.
Claude must confirm paths, floor height, visibility, camp layout and safe standing
space. If any fails, return a specific alternative; never move a cave/seed to fit.

Claude request: assign stable IDs and validated interaction anchors/approach
points; place props with untouched/active/open/empty/disabled visual states;
export existence, destruction and visibility state; preserve existing landmarks.
No extra lights or per-frame object scans required. Fuel depot is an annex, not
a new randomly generated landmark. Reuse an existing suitable prop if it can
expose the requested state without confusing ownership.

Grokbot request: Phase 2 first version uses ambient threats at campsites, fuel
depot and wrecks; no additional guards there. For radio-repair, propose two
ordinary Shamblers, with a defender area centered at the radio coordinate above,
annulus 8-12 m, once per run, only after approach within 24 m. Owner must choose
nav-valid positions at least 8 m from the marine, outside the player's immediate
view, respecting caps/water/builds. If no valid spawn is available, defer the
spawn rather than pop an enemy beside the player. No immortal guardians, cave
opening, new archetypes or mandatory all-guards-dead lock. Register these as
objective defenders (not scheduled-wave count); ordinary kill/skull rules apply.

Grokbot also supplies capacity-aware/idempotent reward grants, damage interruption,
and defender lifecycle events. ChatGPT owns objective progress/reward ledger;
Cursor owns serializing it in day-start saves. Proposed record:
`{runId, objectiveId, state, remainingRewards, receipts, defendersTriggered}`.
Grant and record must commit together to prevent retry/save reload duplication.
On loading a day-start checkpoint, restore its complete objective/inventory
snapshot together; don't retain one side of a later claim. New run/dev Reset
restores both objectives and economy to run-start state. Completed quests and
remaining cache amounts never reset solely because a new day begins.

Acceptance: claim once, partial capacity, full inventory, ownership changes,
interruptions, destroyed props, inaccessible anchors, death/new run/dev Reset,
save/restore, defender cap/defer and no alteration of the scheduled wave count.
Shots: all seven props with prompt, tracked map state, repair progress, partial
claim, empty case. Handoff: `...-landmark-objectives-design.md`, then separate
implementation handoffs per objective rather than one large cross-owner edit.

## Handoff evidence and current limits

Every implementation handoff includes npm test pass/fail counts, named new tests,
before/after tools/shoot.mjs artifacts for all visible states, measured cold/warm
load and 48-zombie frame-rate comparison, and explicit unverified items. Ask
Cursor to add fixtures/views; ChatGPT does not edit tools/*. No tests weakened.

For this documentation-only task, npm test was attempted and failed before test
discovery: package.json is absent (ENOENT). tools/shoot.mjs is also absent; no
before/after images were produced and no visible game behavior was changed.
The old local browser harness was used read-only to inspect POI coordinates and
candidate clearance; it is not a substitute for the required screenshot rig.
No performance, novice onboarding or contract approval has been verified.
No Phase 1 feature is claimed complete by this specification.
