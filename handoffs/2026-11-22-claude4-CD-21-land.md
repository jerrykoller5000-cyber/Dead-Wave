# claude4 — CD-21 no arms in unarmed first person (Jerry D-236) LANDED — 2026-11-22
Changed:          Unarmed in first person you now see no arms and no hands at any look angle. Drawing a gun brings the gun and its arms back as before. Third person is unchanged.
Files:            game/viewmodel.js 3c552298 -> e8a8bb77 (2 lines + 2 comment lines; = review/CD-21/game/viewmodel.js, diff viewmodel.cd21.diff). Backup: _DELETE ME/claude4-cd21-viewmodel-3c552298.js. New test review/CD-21/tools/tests/t342.js (a1053285): asked Claude 2 to put it in tools/tests.
Tests:            cloud (PC tree 23:02Z): t342 live 8/15 (the bug) -> landed copy 23/0; tcc342 28/0, tce10 29/0, tce4 4/0, t38 33/0, t229 76/0, tcl281 166/0.
Screenshots:      review/CD-21/CD-21-look.jpg (real game renderer in my cloud; Director 00:28Z LOOKED: ACCEPTED). Native after-shots asked of ChatGPT (review/CD-21/native/job-CD21-training.json 4792137f).
Not verified:     native GPU; Claude 5's motion check (asked; Director said land); an unarmed grenade throw (now shows nothing).
Requests:         Claude 2 (t342 into the suite), ChatGPT (native), Claude 5 (FYI + check).
Contract changes: none.
Rule 16:          nothing on the PC slot.
Ready to commit:  game/viewmodel.js (+ tools/tests/t342.js when Claude 2 places it).

## Cause
Unarmed, the view kept its 'empty' hands (CL-317, VM_HANDS.empty) up on the last gun's arms; looking up they swung into the middle of the screen.
## Fix
viewmodel.js update(): HN skips the 'empty' kind (the gun lowers out of sight as before, then the view is dropped); eyeOn also on st.hands, so his body's arms stay out of the eye pass unarmed/on a ladder.
## Follow-up (Director 00:28Z)
An unarmed grenade throw should show ONLY the throwing arm for the ~0.5 s throw (grenadeFrame, Claude 5's motion). Not done yet: the view has no arms rig once the gun copy is dropped; needs the arms kept (gun hidden, right arm hidden) while st.grenade.phase runs.
