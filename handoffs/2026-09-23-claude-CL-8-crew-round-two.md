# Claude — CL-8 Crew board, round two — 2026-09-23

Changed:          The crew works from the same board, with fewer ways to trip over each other,
                  and the panel now shows Jerry what is happening, not just who is checked in.
                  The rules are D-6 and D-7 on the board and are written into AGENTS.md.
Files:            crew/crew.mjs, crew/panel.html, crew/BOARD.md, crew/PROMPTS.md,
                  crew/QUESTIONS.md (new), AGENTS.md, handoffs/requests.md
Tests:            npm test → not run (no game file changed). Every crew.mjs command was run in a
                  copy of the real crew files (in, note, out --done / --review / --blocked, next,
                  ask, answer, request, reviewed, check, and the clash rules). The panel was
                  rendered headless against the real log, board, handoffs and git logs: light,
                  dark and phone width, no script errors.
Screenshots:      n/a (no game change).
Not verified:     Run on Jerry's PC. I can't run commands there. The panel reads .git/logs over
                  the local server; tools/serve.mjs serves it, but that's untested on Windows.
Requests:         Cursor: CU-8 (npm test trustworthy, crew/tests.json for the panel).
                  Grokbot: GB-7 (from reviewing t12).
Contract changes: none.

## What changed, and why (from what the first round showed)

- **Agents stopped to ask "shall I keep going?"** Rule: keep going down your queue. Questions
  only Jerry can answer go through `crew.mjs ask`, sit at the top of his panel, and the agent
  carries on with something else.
- **The board went stale.** Grokbot finished GB-1, GB-2 and GB-6, but the board still showed
  them open. Now `in` ticks your task ▶ and `out --done` ticks it ✓. Agents may change only the
  box of their own tasks.
- **Jerry couldn't see progress mid-task.** `crew.mjs note` lines show on the agent's card,
  in the feed, and as dots on the timeline.
- **My check-in on `requests.md` blocked ChatGPT's append.** Shared append-only files no
  longer clash.
- **The GB-2 request came out as mojibake** (`Â·`, `â†’`). I repaired it. `crew.mjs request`
  writes UTF-8.
- **Most handoff notes skipped the template.** `out` warns about it, and the panel shows each
  report's `Changed:` and `Not verified:`.
- **Tests were changed with no second look.** `--review` puts a report on the lead's list
  (D-7). Reviewing the first round started CL-9 and raised GB-7.
- **Finished work waited uncommitted without anyone knowing.** The panel counts finished
  reports since the last commit, and Cursor commits them at the end of each of his tasks
  (rule 6).

## The panel now shows

- **Needs attention:** open questions for Jerry, anyone blocked or stale, file clashes, and
  reviews waiting.
- **One card per agent:** working time, the files they're in, their latest note, their next
  task, and progress through their queue.
- **Today:** a timeline of every check-in, note and commit, with details on hover.
- **What happened:** a feed of finished work with each report's summary, whether it's been
  committed, and the commits.
- **Queues:** progress per agent.
- **Open requests:** grouped by who they're for.
- **Orders and decisions.**
- **Header:** the last push, how much finished work is waiting for a commit, and `npm test`
  results once Cursor's runner writes `crew/tests.json` (CU-8).
