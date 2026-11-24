# ChatGPT — GP-20271 CD-25 native draw checkpoint — 2026-11-23
Changed:          Ran the fixed 60 Hz GP-20254 protocol and eight trusted native swaps on landed CD-25. Paused on Director priority to land Demon P1 and take CJ-10 v2.
Files:            review/GP-20271/{trace,originals}.mjs, pins.json, fixed-r1/, repeat-r1/.
Tests:            Both exclusive PC slot trace runs exited 0. Fixed early pistol and Wasp and all four retained-loadout native early clicks had the correct gun at raise 0.90 on the first firing submission state, full on the following frame, one round each. Native early blank pistol 47/64 ms and Wasp 57/52 ms. No-click blank pistol 137/150 ms, Wasp 147/158 ms.
Screenshots:      Claude 1 fixed-frame comparison review/CD-25/CD-25-sheet.jpg.
Not verified:     Native matched CPU profile, exact t344/t224, first visible render-layer submission and D-240 scorecard rows remain. Resume using current exact pins, or rebase pins if another owner lands a relevant shell change. Do not repeat successful fixed/repeat batches.
Requests:         Director priority received and acknowledged.
Contract changes: none
