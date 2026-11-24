# claude4 — CD-22 M4 bolt slap arm (Jerry D-237 #6) LANDED — 2026-11-22
Changed:          The M4 bolt slap in first person: the left elbow now stays low and out, the hand lies flat on the gun, no V fingers. Landed on the Director's LOOK (07:57Z ACCEPT); Claude 5 was out, FYI sent.
Files:            game/viewmodel-poses.js 13cbd0ea -> e06c4c05 (VM_STAGE2_RELOADS.carbine only, Claude 5's loan). Byte copy of review/CD-22/game/viewmodel-poses.js. Backup _DELETE ME/claude4-cd22-viewmodel-poses-13cbd0ea.js. node --check OK.
Tests:            On the same bytes (cloud, run-all --jobs 1): tce10 29/0, tce9 126/0, tcl281 166/0, t218 36/0. No new tests, no expectation change.
Screenshots:      Before/after review/CD-22/CD-22-look.jpg (cloud, game renderer). Native after-shots asked of ChatGPT: job review/CD-22/native/job-CD22-training.json -> review/CD-22/native/training/.
Not verified:     Native GPU look (ChatGPT's job). Claude 5's motion check (FYI sent; he is back).
Requests:         ChatGPT (native frames), Claude 5 (FYI + motion check).
Contract changes: none.
Rule 16:          nothing run on the PC slot this session for CD-22.
Ready to commit:  game/viewmodel-poses.js.
