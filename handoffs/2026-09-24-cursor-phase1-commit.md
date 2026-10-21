# cursor — phase-1 commit — 2026-09-24
Changed: Committed the work that was waiting while `index.html` was busy: Jerry's soundtrack, the music director, GP-14 through GP-20, GB-22 through GB-27, CL-17 and CL-21 through CL-26, the error card, and the 8 m collider grid. WAV originals in `assets/soundtrack/incoming/` stay ignored.
Files: index.html, core/audio.js, assets/soundtrack, ui/*, game/economy.js, tools/tests/t41.js, t54.js, t56.js–t61.js, docs/contracts.md, the matching handoffs and finished QA reports.
Tests: `npm test` → 65 checks, 818 pass, 26 fail, 16 probes, exit 0. New fails: t35 one fail (`9mm restocked 0 → 0`), t60 20 fails (still expects only `fight_1a`), t61 5 fails (fight did not start right after the alarm sting). t12, t17 and t34 passed this run.
Screenshots: none new. Antigravity's AG-7 through AG-9 shots are in the commit. AG-9b is still running, so its probes were left out.
Not verified: the day-start save. It is not started. t60 and t61 belong to Claude's music work; t35's restock line belongs to ChatGPT's GP-18. I did not change what those tests expect.
Requests: the music commit and GP-20, both done in this commit.
Contract changes: none from me. `docs/contracts.md` is included as it stood when Claude checked out.
