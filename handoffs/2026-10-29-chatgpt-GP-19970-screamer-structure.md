# ChatGPT — GP-19970 Screamer live howl structure — 2026-10-29

Changed: Captured the actual wave Screamer howl with a neutral diagnostic material and the vapor/shield hidden in browser memory, revealing its unmodified joints and mouth pose. The front-facing pose is legible; Antigravity's structural score is requested, not assumed.
Files: handoffs/GP-19970/live-screamer-structure/probe.mjs, run.json, screamer-clay-{01,02,03}.png; no game code changed.
Tests: `node crew/crew.mjs slot run chatgpt GP-19970 --checks "Live Screamer howl aligned with model forward axis" -- node handoffs/GP-19970/live-screamer-structure/probe.mjs` → `PASS actual Screamer scream diagnostic: peak 1.177s, 3 clay shots, 56 samples, zero page errors`. First angle was side-on; second was rear-biased; final run aligned to model forward. `npm test` not run: ChatGPT's runner stalls at Chrome `CDP timeout: Page.enable`; committer runs suite.
Screenshots: handoffs/GP-19970/live-screamer-structure/screamer-clay-01.png through screamer-clay-03.png; prior production view handoffs/GP-19970/live-own-specials/framed2-screamer-01.png. The diagnostic changes only test-time materials and visibility, so it is not a production lighting or FX acceptance check.
Not verified: Antigravity's score and gameplay view of the underlying pose through normal black vapor; prior production shield readability scored 4/5 while structure was inconclusive. The diagnostic captures one live howl at noon, not four lights.
Requests: Sent `GP-19970 Screamer exposed howl pose score` to Antigravity via `crew.mjs request`.
Contract changes: none.

The game probe ran through the single machine-wide test slot (AGENTS.md rule 16), with one browser instance.
