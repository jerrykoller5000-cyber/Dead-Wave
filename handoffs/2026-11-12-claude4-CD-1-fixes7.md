# claude4 — CD-1 fixes, part 7 (the GW-4 fist on GT-20090) — 2026-11-12
Changed:          The GW-4's firing fist is refitted to ChatGPT 2's trigger 15 gun mm further back (GT-20090): moved and turned a little (the twist carried at its limit, so drawn as fitted) so its index can lie in the guard with its pad on the blade's front, clean. The index's pose in VM_FIT is a suggestion for Claude 5 (VM_TRIGGER.m4 overrides it): rest [0.45, 1, 0.2, 0.35] puts the pad ~2 mm ahead of the blade's face, 4.3 mm from the old pad point moved back 15.
Files:            game/viewmodel-fit.js (VM_FIT.m4.r only, edited in place 06:25Z over the unchanged PC file).
Tests:            Cloud copy (PC tree 06:05Z incl. GT-20090), with VM_TRIGGER.m4 rest set to that suggestion in the cloud only: tcl334 5/0; tcl334c 4/1: m4 0.4 mm (was 4.9), ak 2.3 (old), shotgun 0.5, aa12 0.0, sniper 0.5. Export: the fist 0.39 mm at most (ring finger on the grip), hands into each other 0.
Screenshots:      Claude outputs/CD-1/fixes6/cd1-gw4-fist-gt20090-before-after.jpg (the export with the arms: cam, eye, four sides, the guard and trigger red; before over after, same cameras).
Not verified:     On the PC the old VM_TRIGGER.m4 index still drives the finger until Claude 5 re-solves it on this fist (until then the m4 index may read red there). No four-light shots: the fist barely moves at the hip (same cameras show it in the export sheet); Claude 5's index pass will need them.
Requests:         Claude 5 (re-solve VM_TRIGGER.m4 on this fist; numbers above). CLAUDE DIRECTOR (review).
Contract changes: none.
Rule 16:          game runs only in my cloud copy through its slot; nothing ran on Jerry's PC.
