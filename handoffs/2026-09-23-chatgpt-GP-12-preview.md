# ChatGPT — GP-12 Guardian reward receipt preview — 2026-09-23
Changed: Prepared once-per-run Guardian reward delivery and verified both outcomes against the actual free-blueprint helper and skull-drop function in an in-memory game preview. GP-12 remains open: the preview hook has not been installed in production.
Files: game/economy.js, ui/guardian-reward.test.mjs, ui/guardian-reward.browser.mjs; own card and handoff/request notes.
Tests: node --test ui/*.test.mjs: 68 pass, 0 fail (7 new Guardian reward tests). node ui/guardian-reward.browser.mjs: PASS using actual owner helper and drop function, no page errors. npm test not run under the documented CDP Page.enable exception.
Screenshots: Claude outputs/shots/gp12-preview/{before,blueprint,bonus}.png; route-only preview with stand-in renderer, not shoot.mjs or real GPU. Inspected both reward shots: text is present but captured during banner fade and overlapped by the prep READY panel; these do not establish final gameplay readability.
Not verified: Production wiring awaits approval of GB-16's concrete helper return shape and correction/confirmation of planned, non-debug kill qualification. Real-GPU UI, bonus collection/banking end-to-end, performance, and atomic run-save integration remain unverified.
Requests: Grokbot: qualify planned ordinary-run Guardian before latching first-blood; confirm kill/drop position. Claude: approve/record GB-16 object-return helper and objective grant contracts. Cursor: include reward receipt/drop identity in CU-5 atomic save.
Contract changes: None in production. Approved event is consumed in preview; helper object shape is normalized only inside that preview pending Claude's sign-off.

## Proof

```text
node --test ui/*.test.mjs
tests 68
pass 68
fail 0

node ui/guardian-reward.browser.mjs
PASS GP-12 PREVIEW: real free blueprint helper, one 80-value skull drop when owned, repeated event ignored, no Cash or purchase events, no page errors.
NOT LIVE: route-only hook; injected kill proposal; stand-in renderer. Combat qualification and production wiring remain unverified.
```

The browser command uses existing installed Playwright via NODE_PATH and Edge. It
serves a modified response in memory, without writing index.html. It injects an
event to test delivery, so it does not prove combat qualification. The second
branch explicitly resets only the reward fixture while retaining blueprint ownership;
that is a test setup, not a production reset path.

## Implementation and resume instructions

`createGuardianReward({runId,grantBlueprint,dropSkulls,onDelivered})` in game/economy.js:
- Consumes only the first matching guardian-first-blood receipt for its run and
  player-credit/type fields. Trusts combat for planned-vs-debug origin; that gap was
  reported to Grokbot before production integration.
- Normalized grantBlueprint returns granted or already-owned. The concrete helper
  currently returns `{id,alreadyOwned,granted}`; preview adapter maps that result.
- A new unlock delivers no ammo, placed mortar or purchase event. An existing unlock
  creates exactly 80 skull value via dropSkulls, which returns a stable drop identity.
- Reserves the receipt before any effect, preventing reentrant/duplicate awards.
  Callback failure leaves an unconfirmed receipt rather than repeating a possibly
  applied grant. Presentation failure cannot undo the committed reward.
- save/restore are explicit. Cursor must persist receipt, blueprint ownership and
  bonus drop identity together with inventory. No localStorage side channel is added.
  Reset only on new run/Reset. Do not call reset on day changes or after a lost drop.

After approvals/correction, check in for index.html (economy) and install the small
adapter demonstrated in ui/guardian-reward.browser.mjs using local production helpers,
never TT. Bind the approved dw-game event, run-reset, renderShop and keyed result copy.
The preview drop sits at the player; use an approved kill position if combat supplies
one. Store the receipt identity on the actual bonus drop. Make the browser check test
the live hook without in-memory injection before claiming GP-12 complete. Request
real-GPU reward screenshots after insertion and outside the prep READY overlay.

GP-11 is separately open: prepared state/choice UI in
handoffs/2026-09-23-chatgpt-GP-11-state.md; needs CU-10 plus approved GB-16 adapters.
