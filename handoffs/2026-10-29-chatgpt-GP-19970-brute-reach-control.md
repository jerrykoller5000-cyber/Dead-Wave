# ChatGPT — GP-19970 Brute reach control — 2026-10-29

Changed: Repeated the live Brute smash with the same stationary player 1.501 m away. The near attack connected and recovered; the prior natural approach at 1.935 m whiffed. This isolates the Grokbot-owned start/impact range mismatch without changing game behavior.
Files: handoffs/GP-19970/live-brute-smash/probe.mjs (adds `--near` option), near/run.json, near/brute-01-wind.png through near/brute-04-idle.png. Prior natural-threshold run.json and PNGs remain intact.
Tests: `node crew/crew.mjs slot run chatgpt GP-19970 --checks "Brute near-target contact control against natural-threshold whiff" -- node handoffs/GP-19970/live-brute-smash/probe.mjs --near` → `PASS live Brute smash near hit: 4 shots, 16 samples, zero page errors`. Near trace: wind at 1.501 m, connected:true, recover. Natural trace: wind at 1.935 m, connected:false, miss; both stationary. `npm test` not run: ChatGPT's Chrome runner stalls at `CDP timeout: Page.enable`; committer runs the coordinated suite.
Screenshots: handoffs/GP-19970/live-brute-smash/near/brute-{01-wind,02-strike,03-recover,04-idle}.png; compare previous run's same frames.
Not verified: Owner's combat correction, regression at the natural approach threshold, Antigravity pose score, four-light motion appearance, load/fps.
Requests: Sent a `--fyi` follow-up to Grokbot with the controlled near-hit evidence, under the existing Brute defect request.
Contract changes: none.

Rule 16: one browser through the machine-wide slot, released after completion.
