# claude2 — CB-349 v9 LANDED (the D-199 whip) — 2026-11-20
Changed:          The cave guard boss pose: each joint turns in the world at most 24 rad/s x min(dt, 1/30) a frame (planted hind legs and the trunk are not capped), and the pose clock runs on min(dt, 1/30). Landed 05:29Z: index.html b9506b47 -> ff5ca139 (v9 c80075c1 + Claude 5's comment wording only).
Files:            index.html (boss pose, CB-349 block only). Backup: _DELETE ME/index.html.b9506b47.before-CB-349v9. Review copies: review/CB-349/v6/ (index.cb349v9.html, index.cb349v9b.html = what landed).
Tests:            Native AG-395 (--exclusive, review/CB-349/v6/native-landed.log): tg164 5/0 (guardian worst 0.615, cave guard 0.445; bar 0.9), t164 14/0, t340 19/0, t330 16/2 (the two OLD 15 cm brute get-up lines, as GP-20152's 18 Nov triage pre-landing; not this change). Cloud on ff5ca139: t164 14/0, t330 18/0, t340 19/0.
Screenshots:      none (motion; Claude 5 reviewed the per-joint numbers, CE-20).
Not verified:     t330's two 15 cm lines on b9506b47 vs ff5ca139 side by side (offered to the Director). Optional v10 (guardianHindKeep on real dt) not built.
Requests:         Director FYI sent (landed + t330 reading). ChatGPT: GP-20156 v46 must rebase onto ff5ca139.
Contract changes: none. Bars unchanged. Ready to commit: index.html.
