# claude4 — CD-20 the hooked left thumb (Jerry D-224) LANDED — 2026-11-22
Changed:          The left (support) thumb is straight now on the pistol, the sniper and the KR-7. No more hook. Only those three thumbs changed.
Files:            game/viewmodel-fit.js 794b2514 -> b3dc2c98 (= review/CD-20/game/viewmodel-fit.js; 3 thumb rows + 3 comment lines). Backup: _DELETE ME/claude4-cd20-viewmodel-fit-794b2514.js.
Tests:            cloud, PC tree 21:28Z, live -> landed copy: tce4 4/0, t229 76/0, t38 33/0, tcl334b 5/0, tcl334d 5/0 unchanged; tcl334 4/1 old (pistol firing hand ring>little 0.61, not this); tcl334c 4/1 stays red, deepest KR-7 0.7 mm (thumb in laser unit) -> 0.5 mm (old fingers in wood); t228 third person only (does not read this pose), walking rows flaky 6/7.
Screenshots:      review/CD-20/CD-20-look.jpg (Director 23:20Z LOOKED: ACCEPTED A). Native before/after: ChatGPT's job (review/CD-20/native/, inject e544ef2d, job 40630a96, updated for the landed file).
Not verified:     native GPU shots (queued with ChatGPT); gates not re-run on the newest viewmodel.js (CI-2 3c552298, colour only) — the commit's suite covers it.
Requests:         ChatGPT (native, updated hashes). Claude 5: motion OK 23:1xZ (tce4 KR-7 row 0 mm: tce4 4/0).
Contract changes: none.
Rule 16:          nothing on the PC slot.
Ready to commit:  game/viewmodel-fit.js.
Next (Director): B = re-place the pistol support hand so the thumb lies flat along the frame, after CD-21 and CD-22.
