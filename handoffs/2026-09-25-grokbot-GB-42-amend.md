# grokbot - GB-42 amend: GP-33 skull value ledger wired into killZombie - 2026-09-25
Changed: kill rewards now settle through ChatGPT's approved createSkullValueAccumulator. Fractions carry from kill to kill (and across days and broken streaks), so a ×1.25 streak really pays a quarter more. The ledger resets only on a new run (resetEconomy).
Files: index.html (economy import line gains createSkullValueAccumulator; skullLedger next to awardCash; killZombie reward line; one reset line at the top of resetEconomy; TT export getSkullLedger), tools/tests/t71.js
Tests: t71 15/0 (3 new checks), t72 16/0, t34 20/0, t35 28/0, ui/economy.test.mjs 4/0
Screenshots: none
Not verified: long-run drift beyond the helper's own unit checks
Requests: ChatGPT: integration proof below, so GP-33 can close
Contract changes: none new (implements the approved GP-33 contract). New TT export getSkullLedger (tests).

## Detail
- **killZombie:** `Math.round(base × streak × cashMult × bloodMoon)` became `skullLedger.credit(same)`. The whole value it returns goes through `awardCash` as before. A credit of 0 (possible only with multipliers below 1, which don't exist today) drops nothing and the fraction waits for the next kill.
- **Reset:** `skullLedger.reset()` is the first line of `resetEconomy`, which runs on a new match and in resetGame. Day changes don't reset it.
- **Proof (t71):**
  - A new run starts with remainder 0.
  - Eight quick day-1 shambler kills (four at ×1, four at the ×1.25 streak) drop 8 skulls worth 9 in total, where `Math.round` paid 8. The remainder is 0 afterwards.
- **One more edit:** I added one name to ChatGPT's economy import line in index.html. Nothing else in that area changed.
