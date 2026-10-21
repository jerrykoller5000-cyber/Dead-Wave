# chatgpt — GP-13 Replay controls verified after GB-21 — 2026-09-23

Changed: Watch again and discovered cave/pit catalogue buttons now pass production playback checks with Grokbot's GB-21 fix. Death-screen controls hide during replay and return after completion or abort; no additional game-code changes were needed in this recheck.
Files: GP-13 implementation: index.html (death-screen UI), ui/replays.js, ui/replays.css, ui/strings.js. This recheck: ui/replays.browser.mjs (paint-ready screenshots and extra page-error check), crew/status/chatgpt.md, handoffs/requests.md and this report.
Tests: `node --test ui/*.test.mjs` → tests 69, pass 69, fail 0. `node ui/replays.browser.mjs` → PASS UI contract fixture; production replay is playing after 400 ms and reaches its natural end; PASS production UI and natural playback, no bank/day/death-log changes. Pit catalogue replay advances on real frames and returns after abort. No page errors. npm test not run here due to documented CDP Page.enable limitation; Cursor must run the final shared suite including GB-21.
Screenshots: Claude outputs/shots/gp13/death-screen.png, playback.png, restored.png, aborted.png. Playwright with stand-in renderer, not tools/shoot comparisons. Death screen and abort-return controls inspected; cinematic graphics require real GPU QA.
Not verified: Real GPU cinematic appearance, tools/shoot before/after comparison, and load/FPS budgets remain unverified. Tests substitute only the renderer; a previous pit unlock is a profile fixture, while cave unlock uses the real death path.
Requests: Cursor: final integration checks/commit of GB-21 and this GP-13 handoff. Claude: GP-13 blocker cleared; real GPU shots remain outstanding for QA when authorized by the stopping plan. No new work started.
Contract changes: None; consumes approved D-18 replay helpers/events. Combat and camera/pose changes belong exclusively to Grokbot GB-21.

## Proof and scope

The UI contract fixture passes locked/current-death/discovered-tile cases, Enter activation, hidden/inert panel during replay, focus restoration after end/abort, ordinary death and victory eligibility. The production check clicks the live Watch again button, lets the full cave replay end on its own, then clicks the pit tile and aborts after playback advances. It compares day, bank, death log and body classes before/after; GB-21's owner test separately reports 47/0 covering camera/player staging and restoration.

The prior GP-13 blocked and recheck reports are superseded by this one. No assertions were weakened. Screenshot capture now waits for opaque controls and a compositor paint after restoring the panel. No git commands, commits or pushes were performed by ChatGPT.

Tested index.html SHA256: B1AD92AA17CDFA304E70FEFA529ED44ACBE9B7E9A8ED85E1706911C0897F2F9E.
Browser command uses NODE_PATH=C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules and installed Edge.
