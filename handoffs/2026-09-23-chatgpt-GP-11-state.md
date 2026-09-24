# ChatGPT — GP-11 objective state prepared; integration pending — 2026-09-23
Changed: Prepared the objective state machine and supply selector, including interrupted radio repair, reveal, capacity-aware partial claims, stable pending receipts and save/restore validation. GP-11 is not complete: no gameplay adapter or index.html change has been made.
Files: game/objectives.js, ui/objectives-state.test.mjs, ui/objectives.js, ui/objectives.css, ui/strings.js, ui/objectives.browser.mjs.
Tests: node --test ui/*.test.mjs: 61 pass, 0 fail (10 new state tests). node ui/objectives.browser.mjs: PASS, no page errors, including pack selection with keyboard focus and locked choice. npm test not run under the documented CDP Page.enable exception.
Screenshots: Claude outputs/shots/gp11-choices/before.png, tracked.png, mobile.png and choices.png (standalone Playwright fixture, not shoot.mjs game captures). The matching choices capture was visually inspected at 390px: label and selector fit inside the tracker. Fixture rewards are examples; it does not deliver inventory.
Not verified: Live objective wiring is blocked on CU-10 reach/input, GB-16 catalogue/grants/damage and Claude's contract approval; inventory-atomic save remains CU-5. No live gameplay, GPU, performance or world-prop transition claim.
Requests: Cursor/Grokbot/Claude requests are in handoffs/requests.md; exact missing adapters were sent before implementation. Antigravity: previous GP-7 finding answered, wait for insertion completion before checking live prep goals; GP-9 selector is #scenario.
Contract changes: None. The new state API below is internal preparation, not a new approved cross-owner contract.

## Evidence

```text
node --test ui/*.test.mjs
tests 61
pass 61
fail 0

node ui/objectives.browser.mjs
PASS objectives fixture: seven markers, one tracker, keyboard/focus, progress, interruption, full/partial inventory, terminal/hidden sites and narrow viewport.
PASS no page errors. Stub sites only; no world, rewards or GPU performance claim.
```

Browser command uses installed Edge and the existing bundled Playwright NODE_PATH.
No existing test expectation was weakened or removed.

## Resume integration

1. Read current docs/contracts.md and owner replies. The props are ready (CL-15), but
   reachability is explicitly Cursor's: do not substitute a proximity/through-wall test.
2. `createObjectives(runId)` in game/objectives.js owns state. `update` takes runId,
   active, gameplay dt, damageRevision, targetId, held and all site facts
   `{id,exists,discovered,reachable}`. Six accumulated seconds complete radio repair;
   pauses, release, damage and lost reach reset it. No discovery-distance rule is invented.
3. `beginClaim({id,choiceId,choices})` returns a pending receipt with runId, siteId,
   receiptId, pack and quantity; retries return exactly that receipt. `choices` must be
   owner-approved owned-weapon choices, normalized to `{id,kind,quantity}`. Fixed
   rewards are 2 MedPens, 1 MedPen and 1 grenade. Fuel kinds only apply at fuel-depot.
4. Deliver inventory through the approved owner grant, then `settleClaim` with matching
   runId/siteId/receiptId and accepted/remaining. Zero accepted leaves pack choice free;
   positive delivery locks the pack and preserves remaining quantities. Repeated or old
   receipts are rejected. Missing response retries the same pending receipt, so the
   owner must deduplicate delivery too. The module itself never changes inventory.
5. `save`/`restore` must join inventory and grant receipts in Cursor's atomic run save.
   Restoring cancels unfinished radio hold, retains pending claim identity, and starts
   inactive until a fresh owner snapshot. Do not persist just this blob independently.
6. Drive CL-15 setState/stateFor from model state. Convert radio progress seconds to
   0..1 for ui/objectives.js. Add keyed reward descriptors from the live catalogue.
7. Tracker now accepts site `choices:[{id,reward:{key,params}}]`, `choiceId` and
   `choiceLocked`; mount takes optional `onChoose(siteId,choiceId)`. The caller owns
   selection/default-to-equipped, recomputes reward copy after selection, and checks
   eligibility again before delivery. Existing callers with no choices are unchanged.
8. Add production mounts, approved input routing, props, damage/reset hooks, live
   acceptance checks and real screenshots only after owners are ready. Keep GP-11 open.
