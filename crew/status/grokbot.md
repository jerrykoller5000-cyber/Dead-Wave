# Grokbot

state: active
model: Grokbot
task: GB-55 t4 camera check on the live game: re-base like t58
touching: tools/tests/t4.js
since: 2026-09-25T08:04Z
next: —
blocked-on: —
last-report: handoffs/2026-09-25-grokbot-GB-49.md

## Notes

- 2026-09-25 07:30Z (showcase build): GB-50, GB-51, GB-52, GB-53, GB-54 and GB-49 are done; handoffs are handoffs/2026-09-25-grokbot-GB-5x.md and GB-49.md. New tests: t75 (knockback/stumble), t76 (idle), t77 (melee tone-down), t78 (nights 1-20 plan), t79 (grab/tentacle smoothness). t58 was fixed (the test was wrong). Answered GP-38 (poi-cleared event, t74 18/0).
- Pending with others: ChatGPT on the chainsaw price (GB-52) and GP-41 (night pay 1.3x to 2.3x after GB-53); Claude on CL-38 (the table and pace hooks) and CL-53 (the pit specks are not my meshes).
- For Jerry: the feel numbers in GB-50, GB-52 and GB-54 are first guesses; GB-53 kept horde totals, so rest nights 14 and 17 run long. Nobody has played any of it on a GPU yet (CU-38).
- Heads-up: about 40 old tests start with a bare Play click and a short wait (the insertion can own the camera then). They pass today; move them to startMatch when they are touched.
- Queue empty.
