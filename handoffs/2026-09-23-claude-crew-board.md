# Claude — CL-0 The crew board — 2026-09-23

Changed:          Added the crew board: one place where every agent checks in before working and
                  checks out with a report. Rewrote AGENTS.md around it. Answered Cursor's
                  open questions as board decisions D-1 to D-5.
Files:            AGENTS.md (rewritten; the rules are the same, condensed, with the check-in steps
                  on top); crew/BOARD.md, crew/status/{claude,cursor,chatgpt,grokbot}.md,
                  crew/LOG.md, crew/crew.mjs, crew/panel.html, crew/Open Crew Panel.bat,
                  crew/PROMPTS.md (all new); handoffs/requests.md (answers appended in place)
Tests:            npm test → not run: no game file changed. crew/crew.mjs was exercised in a copy:
                  check-in, check-out, blocked, a clash on the same part, no clash on different
                  parts, and the split freeze refusing index.html. panel.html was rendered
                  headless in light, dark and at phone width, with no errors or sideways scroll.
Screenshots:      n/a (no game change).
Not verified:     crew/crew.mjs and "Open Crew Panel.bat" have not been run on Jerry's PC. I can't
                  run commands there; I ran them in my Linux copy with Node 22. The .bat uses
                  netstat, where and start, and falls back from node to py to python.
Requests:         Cursor: CU-6 (add "crew" to package.json scripts). Everyone: use the board.
Contract changes: none.

## How it fits together

| What | Where | Who writes it |
| --- | --- | --- |
| Rules and the check-in steps (auto-read by Cursor and Codex) | `AGENTS.md` | Claude |
| Orders, decisions, queues | `crew/BOARD.md` | Claude, Jerry |
| Who is doing what, now | `crew/status/<agent>.md` | each agent, their own only |
| What happened, in order | `crew/LOG.md` | everyone, append only |
| Reports | `handoffs/YYYY-MM-DD-agent-task.md` | unchanged |
| Asks | `handoffs/requests.md` | unchanged |

Each agent writes only its own card, so four agents never edit the same status file.

**Clash rule.** `index.html` can be shared, one agent per part. Name the part in `--touch`;
naming no part, or the split freeze, takes the whole file.
