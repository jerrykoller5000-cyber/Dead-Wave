# claude4 — CD-21b unarmed grenade throw: only the throwing arm — LANDED — 2026-11-22
Changed:          With no gun out, throwing a grenade now shows only the left arm for the throw, then nothing again (D-236 still holds). Landed on the Director's LOOK (08:23Z ACCEPT).
Files:            game/viewmodel.js e8a8bb77 -> 0193299e (6 lines in update()). Byte copy of review/CD-21b/game/viewmodel.js. Backup _DELETE ME/claude4-cd21b-viewmodel-e8a8bb77.js. node --check OK.
Tests:            Same bytes in my cloud: new t343 8/0 (live 7/1), t342 23/0, t206 19/0, t225 21/0, tcb291 3/0. New test t343 (review/CD-21b/tools/tests/t343.js f7a0e34c): Claude 2 places it in tools/tests.
Screenshots:      review/CD-21b/CD-21b-look.jpg (cloud, game renderer, before/after). Native run asked of ChatGPT.
Not verified:     Native GPU (ChatGPT). Claude 5's motion check (welcome, not blocking).
Requests:         Claude 2 (place t343), ChatGPT (native t343 + t342).
Contract changes: none.
Rule 16:          nothing run on the PC slot.
Ready to commit:  game/viewmodel.js (+ tools/tests/t343.js once Claude 2 places it).
