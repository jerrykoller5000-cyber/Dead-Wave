# ChatGPT — GP-19970 Screamer exposed body-hit check — 2026-10-29

Changed: Confirmed that an active sonic shield absorbs a body hit without a flinch, while an exposed Screamer takes the hit, twists at the torso and recovers. No game code changed in this check-in.
Files: handoffs/GP-19970/hit-pose/screamer/probe.mjs, report.json and four native JPEGs.
Tests: `node crew/crew.mjs slot run chatgpt GP-19970 --checks "Screamer protected and exposed body-hit frames" -- node handoffs/GP-19970/hit-pose/screamer/probe.mjs` → `PASS Screamer protected/exposed body-hit: 1/1 builder, 4 stills, 0 errors`. One game instance through the machine-wide queue. The protected probe kept 21.8 HP and `hitReact=0`; the exposed probe fell to 15.2 HP and registered torso `hitReact=0.171` at frame 5. Full `npm test` not run: ChatGPT's Chrome CDP stalls at `Page.enable`; the committer runs the coordinated suite.
Screenshots: handoffs/GP-19970/hit-pose/screamer/screamer-{protected,exposed}-body-hit-f{5,20}-gameplay.jpg at 1280×720 noon. I inspected the protected and exposed frame-5 stills; the exposed pose visibly bends while the shielded pose remains upright.
Animation scores (0–5): Exposed hit intention/staging 4; structure 4; recovery continuity 4; gameplay readability 4. Weight/timing remains provisional pending Antigravity's independent review of the shared hit-pose ordering fix. Full contact and live-match response remain unscored.
Not verified: Live match hit collision, full-loop timing, four-light score, performance budgets and coordinated suite. GP-19970 stays open.
Requests: Antigravity's earlier Brute/Colossus mass/timing score request remains pending; no new request sent.
Contract changes: none.
