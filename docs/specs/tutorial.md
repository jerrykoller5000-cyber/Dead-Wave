# GP-24 — Optional tutorial day

Proposal for Jerry, 2026-09-24. No tutorial behavior is implemented by this document.
Recommended: a 3–5 minute practice session at the existing HQ, followed by a clean
Day 1. Preserve the normal game's horde counts and required callsign. Teach the
loop through completed actions, not a page of tips.

## Entry, choice and replay

After the first valid callsign and Play, before insertion, offer a small dialog:
**“First deployment?”** / **“Practice the essentials at HQ.”** Buttons:
**“Start training”** and **“Skip training”**. Both are visible without scrolling at
390 px. Neither starts automatically; Escape means Skip and continues the normal
entry. Opening the menu or editing a callsign alone does not consume the offer.

Record the explicit choice immediately. Future Play presses start the normal run
without the offer. Do not offer again after death, Reset, another callsign, or a
content update. Existing players with an established coach profile are treated as
returning players: no forced offer, but training remains available from the menu.

Add a single secondary **“Training”** action to the main menu. It starts a fresh
practice session without repeating the first-run dialog. This is tutorial replay;
it does not restore the removed scripted-death replay controls. If a saved run
exists, explain **“Your saved run will be kept.”** Practice must not overwrite it.

During every lesson, show an edge-aligned **“Skip training”** action, also present
in Pause and every tutorial-owned modal. Esc first closes a kiosk/briefing; Pause
still exposes Skip. Skipping a first deployment starts clean Day 1; leaving a menu
replay returns to the menu with its save intact. A blocked world action must never
hide or disable Skip. No confirmation dialog is needed for abandoning practice.

## What happens in order

1. **Get control (about 15 seconds).** Use the existing insertion, then wait for
   `controls-ready`. One compact hint: **“Move to the HQ marker.”** Show current
   bindings, not hard-coded WASD. A nearby marker, a short route and camera motion
   teach movement/aiming. No text overlays during the drop. Progress only after
   measured movement reaches the marker; opening a screen is not completion.
2. **Shoot, then collect (about 20 seconds).** Hint **“Stop the approaching zombie.”**
   Grokbot supplies a bounded practice encounter: one slow shambler first, up to
   three more only as needed for aim/reload practice; never a normal wave. Use
   normal pistol damage, ammo use, kill attribution and proposed Day-1 combat
   scales. Tutorial actors cannot escape toward caves or trigger ambient spawns.
   On the first player kill, flush any accumulated skull pool into a pickup without
   increasing its value. This prevents pooling from withholding the lesson. Show
   the existing `coach.pickup` / `coach.return` only after the real pickup event.
   If a turret or environment kills the actor, replace the exercise target; do not
   pretend the player shot it. A low-ammo reminder points at Reload; no arbitrary
   requirement to empty every round before continuing.
3. **Bank (target: within 60 seconds of controls-ready).** Point to the actual HQ
   skull window, not the kiosk or alarm panel. Reuse `coach.bank`: **“Press {interact}
   to bank your skulls.”** On deposit accepted show **“Banking…”**; advance only on
   matching-run `deposit-complete` with positive credited value. A carried skull
   is not spendable Cash. Keep this distinction visible in the ordinary HUD.
4. **Resupply (about 30 seconds).** Hint **“Buy .45 ammo at the kiosk.”** Enter the
   real Ammo page, buy one pack at its real price, and wait for `purchase-delivered`
   for that calibre with a positive Cash debit. Reuse `coach.purchase` / `coach.loop`
   after delivery. Start practice with the normal 40 Cash and a partly empty .45
   reserve, so the lesson is affordable after banking. If the player buys another
   item first or fills the reserve by another path, reconcile actual state: accept
   an equivalent paid .45 restock, otherwise offer **“Retry resupply”** to reset the
   practice checkpoint transparently. Never tick a purchase on a click or secretly
   grant currency to resolve a shortage.
5. **Fortify (about 45 seconds).** **“Place a barricade in the marked gap.”** Use a valid,
   reachable HQ-side build socket and the real Cash cost, preview, cancel and
   commit behavior. Advance on the committed placement receipt for that socket,
   not when the wheel opens. A barricade costs 8 Cash and its blueprint is already
   unlocked: 40 starting Cash covers one 12-Cash ammo pack plus the barricade even
   before skull proceeds. A wall would also need its 25-Cash blueprint on top of
   the 14-Cash placement, so it is deliberately left for later play. No placed
   barricade carries into the normal run. A shortage uses an explicit practice
   checkpoint retry, not an invisible subsidy. Building lessons beyond one piece,
   upgrades, mortar use and repairs remain contextual hints for later days.
6. **Read the approach and choose readiness (about 30 seconds).** **“Check the next
   approach at the HQ panel.”** Display a clearly labelled training briefing using
   the basic preview style; exact-count Field Intel is not granted. The player
   presses the normal **“Sound alarm”** action. Its accepted action completes
   training; it does not unleash an unbounded real horde inside the exercise.
   Grokbot/Claude own the isolated training alarm/encounter transition. If unavailable,
   the lesson must say **“Training briefing unavailable”**, retain Retry/Skip, and
   never claim a wave was read or started successfully.

The completion panel says **“Training complete”** and **“Collect skulls. Bank Cash.
Resupply.”** First deployment offers **“Start Day 1”**; a replay offers **“Back to
menu”** and optionally **“New run”**, following the normal saved-run replacement
flow. Starting Day 1 resets the training inventory, bank, builds, drops, zombies,
damage, objective rewards and music state before normal insertion. No double
insertion on retry within training.

## Presentation and failure states

Use one small lesson card at an edge and one destination marker, with **“Training
2 of 6”**. Do not compete with GP-23's aiming corridor. Banking/purchase hints use
the existing coach rather than a second simultaneous card. The current auto-expiring
coach can remain ephemeral; the lesson card keeps the actionable instruction until
the condition is met. Pause, hidden tab, deployment, menus and cinematics pause
lesson timers. Training copy and bindings will be keyed in `ui/strings.js` when
implementation is approved; this document does not add unused production keys.

Do not fail the entire tutorial on death. Offer **“Retry lesson”** / **“Skip training”**;
retry restores a known practice checkpoint, without duplicating pickups or debit
events. Failed purchases, interrupted banking and out-of-order actions leave the
lesson pending and reconcile from the current snapshot. Completed actions can be
recognized out of order if they genuinely satisfy a later condition. Missing contracts
or corrupt state fail back to the menu with a short error and a normal Play option.
Accessible focus returns to the prior control on closing a dialog; input hints use
the user's bindings. No completion depends only on color, audio or a timed reaction.

## Persistence and coach integration

Propose a separate versioned profile record, `dw.tutorial.v1`, containing
`offerAnswered`, `choice: start|skip`, and `completed`; no callsign-keyed records.
Migration recognizes a valid existing `dw.coach.v1` history. If storage is denied,
remember the choice for the session and allow play. Across reloads without working
storage it can be offered again; do not promise permanent memory in that case.

Accepting but closing the browser must not force training at the next boot: the
choice is already remembered; Training in the menu permits another attempt. Store
no partial tutorial run in the production run-save slot. Replay uses a fresh local
coach instance; it must not erase the real profile or suppress unlearned normal-run
hints. On first training completion, merge only verified lessons (banked/purchased)
into the real coach profile. A skip marks only the tutorial choice, not all coach
lessons as learned. Reset preserves both onboarding profile records.

## Exact owner needs — proposed, not approved contracts

- **Cursor:** isolated run context `mode: training|survival`, unique `runId`, begin/end
  acknowledgements and checkpoint restart; saved-run isolation; remapped input
  labels; existing controls-ready notification; fresh-run and return-to-menu paths.
  End must wait for all cleanup before acknowledging readiness. UI never edits
  `window.TT` or reaches into the renderer to manufacture a practice state.
- **Grokbot:** exercise actors and player-kill receipt `{runId, actorId, source}`;
  scoped skull-pool flush preserving earned value; completed barricade-placement receipt
  `{runId, buildId, socketId, cashSpent}`; practice encounter/alarm controller that
  cannot alter normal `waveComposition`, day totals or first-blood rewards. Snapshot
  must expose current exercise, remaining targets and eligible completed actions.
- **Claude:** approve a flat, safe route around the existing HQ with no cave/water
  proximity; named move/target/build anchors and reachable interaction approaches,
  terrain-derived heights and verified colliders. Reuse existing world, don't add a
  map or alter seeds. Training alarm/music ownership remains Claude's.
- **ChatGPT:** lesson controller, single card, menu offer, persistent choice and
  keyed copy; consume existing pickup/deposit/purchase events with run IDs. Cash
  still moves only through the ordinary economy after real committed actions.
- **Antigravity:** first-time playthrough at desktop/390 px; required callsign,
  Skip from every stage and modal, replay with saved run, changed bindings, and
  time to first bank without opening Tips.

All new contracts require Claude's rule-9 approval before implementation. These
are requests for an implementation plan, not instructions to edit other owners'
files tonight.

## Acceptance and morning decision

Recommend the isolated practice session above, reusing the existing HQ and coach.
Jerry can accept it or prefer integrated Day-1 coaching; the latter is cheaper to
build but cannot safely promise unrestricted retry/skip without affecting a run.
No choice is needed tonight to finish this proposal.

Acceptance: fresh profile offered once; skip remembered; returning player not
interrupted; training replay does not mutate a saved run; completion cannot be
faked by menu clicks; currency/rewards cannot cross modes. Validate reload at
offer/accept/skip/completion, denied storage, death/retry, Reset, stale events and
duplicate receipts. On real GPU, observe five fresh players: aim for four to bank
within 60 seconds of gaining control, without reading Tips. Record actual times
and bottlenecks; this is a target, not a result we have measured.
