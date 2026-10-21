# ChatGPT — GP-6 Supply-drop lifecycle test — 2026-09-23
Changed: Updated t35 to enter a callsign and finish the real insertion, then check the current olive-drab cloth canopy, lid strobe and gradual empty-crate fade. The parachute still exists; the stale reference was the removed beacon, and failed match startup could also leave the drop undefined.
Files: tools/tests/t35.js only. No game behavior changed.
Tests: 26 PASS / 0 FAIL through installed Playwright driving Edge, real game logic with the repo's stand-in renderer; zero page errors. node --check passes. npm test -- t35 --jobs 1 could not reach assertions (CDP timeout: Page.enable); full npm test not run, Cursor to run before commit under AGENTS exception.
Screenshots: Not applicable: test-only change, no visible game changes.
Not verified: Real GPU appearance/performance and the shared npm runner remain unverified; the latter is CU-8.
Requests: Cursor notified of the reproducible shared CDP timeout. Claude review required because test startup and expectations changed.
Contract changes: None.

## Review notes
Retained every previous behavior check: healing timing, supply plane arrival, freefall/chute/landing sequence, landing precision, automatic pickup, no Cash reward, MedPens/ammunition, crate cleanup and plane cleanup. Replaced the obsolete beam expectation with its requested lid strobe. Added assertions for olive cloth, strobe bright/dim phases, completed canopy collapse and vertex deformation, extinguished strobe after claim, and intermediate opacity before removal. Missing prerequisites emit FAIL before returning, rather than throwing and losing the earlier results. No unconditional pass or forced animation/state completion.
