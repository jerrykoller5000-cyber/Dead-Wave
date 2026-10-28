# chatgpt — GP-19970 principles pass, supply terminal iteration — 2026-10-27

Changed:          The CRT prototype and first-person shop fix passed48 native comparisons and AG-136 review; its production stylesheet link still awaits Claude. The independent88-shot marine review found nose skin penetrating the fitted mask; added a local cloth/hem nose pocket, with native after-validation queued.
Files:            ui/supply-terminal.css; index.html (shop open/close and miniPanelOpen shop pointer guard only); ui/marine-face.js (balaclava cloth and matching hem only); handoffs/GP-19970/crt/; handoffs/GP-19970/live/; handoffs/GP-19970/remaining-pass.md.
Tests:            First native comparison: FAIL fp-day-1280-supplies pointer locked, after 24 before and 12 third-person after captures. Full retry PASS: 48 native before/after shots, identical row/price/button states, min visible text 11 px, no card clipping, no menu pointer lock, zero page errors. Real menu mouse movement holds yaw; the real close click restores FP lock. node --check native.mjs passes. Full suite and load/frame budgets belong to Cursor's coordinated integration run, currently CU-164.
Screenshots:      handoffs/GP-19970/crt/before-*.png (24) and after-*.png (24), all three tabs, 1280/390, fp/tp, day/night. Inspected TP supplies at both widths, FP night390 loadout and FP day1280 builds.
Not verified:     CRT production stylesheet link/integration; balaclava nose-pocket after validation and visual acceptance; remaining zombie bodies/motion and active warning effects. Marine captures are controlled Training Ground views, with a full carried armory; no valley/night-flashlight sweep claimed.
Requests:         Claude: GP-19970 supply terminal stylesheet link (one link in index.html), plus FYI with native pointer failure and scoped fix. Antigravity: GP-19970 supply terminal CRT look (captured visual deltas).
Contract changes: none.

## Scope and assessment

The archived supplies view and current styles document the first concrete remaining UI mismatch: provisional Consistency 2 and narrow Readability 3. This iteration serves UI principles §0 and §6. Those are provisional findings, not acceptance scores or a ranking of unviewed animation.

The native harness compares supplies/loadout/builds at 1280×720 and 390×844, first/third person, day/night. It preserves and compares all row text, prices, tab labels and button disabled states. The after phase additionally checks card bounds, horizontal clipping, at least 11 px visible labels, released pointer lock, actual top-tab/close hit targets and zero page errors. A prototype-only run records integrated:false when the production link is absent.

Rule 16: every game run uses the native machine-wide slot, one instance and one worker. First request 9fea9f80-f729-41ef-812d-6c86aa299c44 ran after CU-164 chunk-01 and closed/released on failure. Retry cd55af2f-2805-4e6e-af2c-731040d2ec54 ran after Cursor’s chunk and exited 0 at 02:30Z, browser closed/slot released; no concurrent game was launched.

GP-19970 remains open. Static four-light zombie sheets do not certify walk/attack/reaction cycles; the fitted marine helpers need live kit/turn/crouch views. Warning glows remain approved gameplay exceptions. See remaining-pass.md for the work map.

## Observed defect and fix

The shop sets paused=true, so updateOts does not run to release its existing first-person lock. openShop now calls the existing otsLockWanted(false) explicitly. shopOpen participates in the existing miniPanelOpen guard so menu cursor movement does not turn the view. closeShop requests lock only when the selected first-person view is again allowed. The first failed native state is retained in crt/failure-pointer-lock-first.json; the after-only pointer assertion remains intact. The retry also dispatches real menu mouse movement and a real close-button click, checking held yaw and restored lock.

The third-person 1280/390 after images have a distinct olive bezel, dark glass, amber controls and legible restrained scanlines. These observed views support the direction; the complete prototype passes native functional checks, while Antigravity accepted the captured CRT direction; production integration is still pending. No animation acceptance is claimed.

## Native retry output

Command: node crew/crew.mjs slot run chatgpt GP-19970 --checks "Supply terminal CRT retry: 48 native views, content/control parity, real cursor movement and close-click lock restore" -- node handoffs/GP-19970/crt/native.mjs

PASS GP-19970 supply terminal: 48 native before/after shots, unchanged tabs/row copy/prices/button states, after text >=11 px, no clipping/locked pointer, zero page errors. Production stylesheet link: false.

Proof: crt/report.json records native NVIDIA GeForce RTX 5080, 48 states and shots, minimum after text 11 px, errors []. Pointer yaw before and after menu mouse movement: 0.00006156904328275666; close result: open false, first true, pointer true. integrated:false means the harness injected the production CSS file for comparison; the game itself still needs the approved stylesheet link. This is not a production-integration pass.

## Antigravity review

AG-136, reply and later FYI in handoffs/requests.md: inspected the full48-shot retry and crt/report.json, including FP and TP. Readability5/5, Hierarchy5/5, Consistency5/5, Feedback5/5, Restraint5/5, Both views5/5. She specifically accepted the olive bezel, black glass, background scanlines, warm amber active controls, restrained Back control, dark amber scrollbar and corrected narrow HUD overlap. These are her recorded categories; her report does not separately score Placement or Safety for this supply-terminal iteration. Final visual review: handoffs/2026-10-26-antigravity-AG-136.md. No extra game instance was launched for that review.

This iteration is ready for the one-link shell integration requested from Claude. GP-19970 is not done; no broad model/motion acceptance is implied.

## Resumed helper review — next native batch

The one-link CRT integration still has no Claude reply. Continued independent GP-19970 evidence preparation: live/marine-review.mjs and live/marine-review-plan.md. No new production changes. Syntax check: node --check handoffs/GP-19970/live/marine-review.mjs → exit0.

Prepared88 original captures of the actual marine: light pistol/fullM4 kit; head and torso views under four inspector lights; existing walk/crouch-walk/turn-left stepped by15 frames between four samples; actual FP/TP gameplay cameras under noon/night. Public inspector API only, discovery and original camera/state/recipe metadata retained. Collection does not assign passing scores or prove every move/contact. These are controlled Training Ground views; no claim of a valley, stair or live-combat environment sweep.

Native queue request3dc0b3ff-670b-43f5-b851-80a9fd95593a, command node crew/crew.mjs slot run chatgpt GP-19970 --checks "Marine fitted waist and balaclava review:88 native inspector and actual FP/TP camera captures, light/full kit, four lights, existing walk/crouch/turn" -- node handoffs/GP-19970/live/marine-review.mjs. Waiting behind Cursor CU-164 chunk08; not run at this update. Resume terminal session71860, inspect live/marine/report.json or failure.json and the actual images before scoring/editing anything. Rule16: one instance, finally closes/releases, no concurrency.

## Marine collector follow-up

First marine job ran after Cursor chunk08:32 light-kit images, then FAIL: Exit Drive with Esc before capturing or running a review job. The collector had incorrectly called stepAsync while Drive was active; not a game model regression. Browser closed/slot released; zero page errors. Retained live/marine/failure-drive-first.json. Inspected light-noon-head-standing.jpg, light-noon-torso-standing.jpg, light-crouch-walk-f45-torso.jpg and light-turn-left-f45-torso.jpg; no obvious waist separation in those sampled views, no full fit/animation score assigned.

Collector corrected to run Drive on the real game clock, pause and save actual camera/pose, exit Drive, then pin that observed camera for the supported capture job. No inspector internals or product code changed. Uniform m81 is now selected before the explicit coyoteBrown mask so global camo cannot overwrite it. Syntax check passes. Native retry7359a946-eafb-42ac-841c-05c4cfe46dea queued behind CU-164 chunk10, terminal33669. Pending results; do not confuse the old partial failure with a successful complete report.

## Marine review complete; local defect correction queued

Collector retry7359a946 exited0: PASS collection:88 native marine helper captures; no inspector/page errors. Visual scoring remains required. Proof live/marine/report.json, RTX5080. Four-light head/waist views, pistol/no-armor and M4/armor, frame-stepped walk/crouch/turn and actual FP/TP context are in. Inspected head-standing, full-kit torso/crouch, TP crouch and FP night views. The flexible waist shows no obvious separation in those samples; the head close-ups expose a nose-skin patch through the mask. Construction3/local Integration3 before; no broad passing model/motion score assigned.

Changed only the balaclava cloth profile and corresponding rolled hem in ui/marine-face.js: narrow18mm upper-front nose room, no eye-opening height, face, motion or topology change. Source backup live/balaclava-before.js; reference/defect/protocol in live/balaclava-fit.md. node --check ui/marine-face.js and live/marine-review.mjs pass. No new test expectation changed.

After batch queued through native slot9a37bb9d-118e-4356-8703-ca27aaac11af (terminal23329), after Cursor CU-164 chunk11. Outputs live/marine-after/, real marine build checks plus90 captures (matching88 views and2 existing smoking/mask-lowering views). Native after result and Antigravity review pending; not done. All game runs serial, browser closes/releases in finally.
