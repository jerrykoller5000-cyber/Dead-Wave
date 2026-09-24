# chatgpt — GP-13 Replay chrome, waiting for GB-21 — 2026-09-23

Changed: Added Watch again for the current cave/pit death, replay buttons on discovered catalogue tiles, keyed copy, keyboard support and hidden/inert death-screen controls during playback. UI checks pass, but natural playback aborts immediately in combat; GP-13 is not done.
Files: index.html (death-screen UI only), ui/replays.js, ui/replays.css, ui/strings.js, ui/replays.browser.mjs.
Tests: npm test not run: documented CDP Page.enable limitation. `node --test ui/*.test.mjs` → tests 69, pass 69, fail 0. `node ui/replays.browser.mjs` → UI contract fixture PASS; production playback FAIL after 400 ms: {"playing":false,"phases":["start","abort"]}, assertion "production replay survives normal frames and advances".
Screenshots: Claude outputs/shots/gp13/death-screen.png and playback.png (Playwright, stand-in renderer, not tools/shoot comparisons). Inspected death screen: Watch again and catalogue Watch buttons are readable; cinematic graphics cannot be judged here.
Not verified: Natural completion and actual abort restoration are blocked on Grokbot GB-21; real GPU shots, load/FPS budgets and shared suite remain unverified. This is unfinished work; do not ship it as complete.
Requests: Grokbot received both combat failures and reproduction; Claude confirmed them and assigned GB-21. Cursor must wait for GP-13 recheck before CU-13 final commit. No new work after this task, per Jerry's stopping point.
Contract changes: None; consumes D-18 / GB-20 list/can/begin/isScriptedDeathReplay and scripted-death-replay event. Does not alter combat, profile storage, rewards or world data.

## Where to resume

1. Read crew board, check in GP-13 and confirm GB-21 has landed. Current production UI hooks are already in index; do not duplicate them.
2. Run `node ui/replays.browser.mjs` with NODE_PATH=C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules.
3. The fixture verifies locked state, discovered tiles, Enter activation, panel hidden/inert during playback, finish/abort focus return, ordinary death and victory. The live portion uses actual death-screen buttons and lets frames advance: no combat code replacement or forced replay finish.
4. Live test must pass natural cave replay, restored classes/day/bank/death log, and an actual pit replay aborted after frames advance. Owner t56 must also verify camera, pose and correct grab position. A prior pit unlock is an explicit profile fixture; cave unlock comes through the live death path.
5. Finish with real screenshots/QA delegated as AGENTS permits, replace this blocker report with a completion handoff, check out done, then stop.

## Combat findings (already sent to owner)

- updateScriptedKill aborts on gameOver even for replay; death-screen replay necessarily has gameOver true. Existing t56 manually finished each replay before a normal frame, missing this.
- beginScriptedKill snapshots after changing cine classes/pose/visibility, so restoration cannot recover the original state.
- Marine is not staged at the replay's selected cave/pit grab location. Claude independently confirmed camera restoration mismatch too.

No owner code was changed to work around these issues. UI remains in its own module and narrow death-screen hooks, preserving all concurrent world/combat changes.
