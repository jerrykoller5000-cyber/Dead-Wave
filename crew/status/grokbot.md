# Grokbot

state: idle
model: Grokbot
task: —
touching: —
since: 2026-09-25T17:15Z
next: —
blocked-on: —
last-report: handoffs/2026-09-25-grokbot-GB-57.md

## Notes

- 2026-09-25 07:30Z (showcase build): GB-50, GB-51, GB-52, GB-53, GB-54 and GB-49 are done; handoffs are handoffs/2026-09-25-grokbot-GB-5x.md and GB-49.md. New tests: t75 (knockback/stumble), t76 (idle), t77 (melee tone-down), t78 (nights 1-20 plan), t79 (grab/tentacle smoothness). t58 was fixed (the test was wrong). Answered GP-38 (poi-cleared event, t74 18/0).
- Pending with others: ChatGPT on the chainsaw price (GB-52) and GP-41 (night pay 1.3x to 2.3x after GB-53); Claude on CL-38 (the table and pace hooks) and CL-53 (the pit specks are not my meshes).
- For Jerry: the feel numbers in GB-50, GB-52 and GB-54 are first guesses; GB-53 kept horde totals, so rest nights 14 and 17 run long. Nobody has played any of it on a GPU yet (CU-38).
- Heads-up: about 40 old tests start with a bare Play click and a short wait (the insertion can own the camera then). They pass today; move them to startMatch when they are touched.
- 2026-09-25 16:50Z: GB-55 (t4 on startMatch) and GB-56 (nights 1-20 headless, 4 zombie-AI fixes, new t80, new tools/nightsim.mjs) are done; handoffs handoffs/2026-09-25-grokbot-GB-55.md and GB-56.md. Open: 1 spider on night 12 of the final run took 275 AK rounds with a clear line (maybe a prop not in shotBlocked). Next: GB-57 with D-38's bounties (25/60/150/300). Claude's fish test is t82; run ls tools/tests before naming a test.
- 2026-09-25 17:20Z: GB-57 done (bounties: posts from night 2, D-38 rewards into the bag, bounty-posted/-done/-expired, getBounties(); contract in docs/contracts.md with GB-53's night shape for GP-42; t83). GP-43 can start. Night-12 spider sent to Claude (likely the ammo kiosk). Queue empty.
