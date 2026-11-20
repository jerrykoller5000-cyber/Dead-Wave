# claude5 — CE-17 LAND brute ankle clamp — 2026-11-19
Changed:          Landed the brute ankle fix (Director 08:52Z, D-211): the ankle's roll stop holds as the reader reads it. The brute's 6 old legR ankle reds go away. Same stop; reader and range unchanged.
Files:            game/zombie-feet.js e116eace -> c6c56542; game/zombie-feet.test.mjs 1c07c850 -> 333483c3. Backups: _DELETE ME/zombie-feet.js.e116eace.before-CE-17, _DELETE ME/zombie-feet.test.mjs.1c07c850.before-CE-17
Tests:            node --test game/zombie-feet.test.mjs (live) 9/9. Cloud slot: t330 18/0 x3 (once 17/1 on "both hands near the ground" right after a t222 time-out: hands, not feet; passed twice right after). t222 could not run in my cloud (time limit).
Screenshots:      none (1.6 deg roll at the stop; not visible)
Not verified:     the PC-slot t330 + t222 the Director asked for: my device shell has no Chrome; asked Antigravity.
Requests:         antigravity (t330 + t222 on the PC slot)
Contract changes: none (clampAnkle exported; optional 5th arg)
Game tests: cloud slot only (rule 16).
