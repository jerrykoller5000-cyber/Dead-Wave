# ChatGPT — GP-19970 live acid and silk contact — 2026-10-29

Changed: Verified that actual wave Spitter and Spider attacks launch projectiles and leave their distinct ground effects at the original aim spot. The marine was moved aside after release and the previous effect hidden between subjects in browser memory to expose each decal; no game code changed. Condensed my card Notes to a screenful; full history remains in prior reports.
Files: handoffs/GP-19970/live-projectile-contact/probe.mjs, compact-card.mjs, run.json, seven current PNGs; crew/status/chatgpt.md (Notes only).
Tests: `node crew/crew.mjs slot run chatgpt GP-19970 --checks "Isolated acid-pool and silk-web landing shots" -- node handoffs/GP-19970/live-projectile-contact/probe.mjs` → `spitter: launched=true landed=true shots=4 samples=25`; `spider: launched=true landed=true shots=3 samples=17`; `PASS live Spitter acid and Spider web projectiles reached visible ground effects; zero page errors`. Spitter glob launches t27.912 and pool appears at (0, 8.061) t29.418. Spider dart launches t30.301 and web appears at (-0.042, 8.747) t31.064. `npm test` not run: ChatGPT's Chrome runner stalls at `CDP timeout: Page.enable`; committer runs the coordinated suite.
Screenshots: handoffs/GP-19970/live-projectile-contact/spitter-01-wind.png, spitter-02-flight.png, spitter-03-flight.png, spitter-04-impact.png, spider-01-wind.png, spider-02-flight.png, spider-03-impact.png. The final impact frames show the separate acid pool and white ground web at gameplay scale.
Not verified: Actual damage/slow applied to the marine, four-light impact appearance, Antigravity's independent impact readability score, current-tree load/fps.
Requests: Sent `GP-19970 acid and web impact readability score` to Antigravity via `crew.mjs request`.
Contract changes: none.

Family: uncanny. Rule 16: both live attacks ran serially in one browser through the machine-wide game-test slot, which was released. The initial impact shot had both decals overlapping; the final run isolates them, and the stale image was removed.
