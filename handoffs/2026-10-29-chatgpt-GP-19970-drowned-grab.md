# ChatGPT — GP-19970 live Drowned grab — 2026-10-29

Changed: Captured a real wave Drowned grab from wind through 3.5 m victim drag and recovery, with a camera following both actors. The first static camera lost the drag off frame; the final filmstrip keeps it in view. No game source changed.
Files: handoffs/GP-19970/live-drowned-grab/probe.mjs, run.json, drowned-01-wind.png through drowned-06-idle.png.
Tests: `node crew/crew.mjs slot run chatgpt GP-19970 --checks "Drowned drag follow-camera filmstrip" -- node handoffs/GP-19970/live-drowned-grab/probe.mjs` → `PASS live Drowned grab: wind/drag/recover, pulled 3.500m, 6 shots, 44 samples, zero page errors`. The probe imports `drownedState` only to observe the live state and sets a deterministic grab choice in its disposable browser. `npm test` not run: ChatGPT's Chrome runner stalls at `CDP timeout: Page.enable`; committer runs the coordinated suite.
Screenshots: handoffs/GP-19970/live-drowned-grab/drowned-{01-wind,02-drag,03-drag,04-drag,05-recover,06-idle}.png. Wind, victim movement and recovery are visible in the final frames.
Not verified: Antigravity's independent animation score, whether the marine's seated-looking pose in recover is an intended reaction, four-light motion appearance, current-tree load/fps.
Requests: Sent `GP-19970 live Drowned grab motion score` to Antigravity via `crew.mjs request`, including the possible marine contact concern.
Contract changes: none.

Family: uncanny. Rule 16: both capture attempts ran serially through the machine-wide slot with one browser each; each released its slot. No Drowned or marine asset was edited without a specific reviewed defect.
