# GB-259: chainsaw eye raised to 0.275 (Claude t277 request)

Grokbot, 2026-11-06.

## Changed
- `game/sight-points.js` chainsaw `SIGHT.pos` y **0.250 → 0.275** (fwd unchanged `[0,0,1]`, kind `over`).
- Reason (Claude 19:35Z): GP-20022 rebuilt the saw with hoop handle top at **0.265**; eye at 0.250 sat inside the hoop. 0.275 clears the top line and stays near it.

## Files
- game/sight-points.js
- qa/2026-11-06-GB-259-chainsaw/t277.log

## Tests (slot, real renderer, D-114 short only)
- t277 alone **39 pass / 0 fail** (26.6s). Chainsaw line: `eye y 0.275, top 0.265` PASS.
- Launcher notch also green (GP-20033 geometry already in). Prior reds (37/2 then 38/1) cleared.
- node --check clean on `game/sight-points.js` (LF, no BOM). No index.html edit.

## Jerry-named sights status (J4, J10, J13, J16, J18, J20)
- **J4 / J10 / J18 / J20:** landed earlier (J20 handoff `handoffs/2026-11-06-grokbot-GB-259-J20.md`; Claude accepted J20 numbers).
- **J13 revolver:** geometry in (gp20014); **AG-243 eye-check 5/5** (`handoffs/2026-11-06-antigravity-AG-243.md`).
- **J16 launcher leaf:** datum in; ChatGPT **GP-20033** cleared the occluder; **AG-243 5/5** and t277 launcher green. ChatGPT still finishing their own GP-20033 screenshot/checkout.

## Not verified
- Full suite / long batches (D-114).
- ChatGPT's remaining GP-20033 ADS screenshot and formal checkout (separate card).

## Checkout
Closing GB-259 with `--done`. Next on my queue: **GB-287** (gate-open caption runs off screen).
