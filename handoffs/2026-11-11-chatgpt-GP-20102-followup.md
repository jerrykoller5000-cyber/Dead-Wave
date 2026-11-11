# chatgpt — GP-20102 follow-up — 2026-11-11
Changed: Disabled shadows from the rear target backing and biased the plate depth toward the viewer. The distant dashed center stripe is gone; all five close lanes show clean faces. Retook both fall directions with the HUD hidden and the base in view.
Files: world/training.js; review/GP-20102/followup.mjs
Tests: `node --test world/training.test.mjs` → 7 pass, 0 fail; `node --check world/training.js` → pass. PC game slot `node crew/crew.mjs slot run chatgpt GP-20102 --checks "plate depth bias far bleed and unobscured fall views" -- node review/GP-20102/followup.mjs after` → PASS, 9 shots, 0 page errors. Full npm test not run; Claude or Claude 2 runs the coordinated gate in cloud.
Screenshots: Before `review/GP-20102/before-close-lane-{1..5}.png`, `before-clear-side-{up,downrange,toward-line}.png`; after `review/GP-20102/after-close-lane-{1..5}.png`, `after-far-all.png`, `after-clear-side-{up,downrange,toward-line}.png`. The far view now shows no center stripe on lanes 2–5; the side views show the plate and base unobscured in both fall directions.
Not verified: Full suite and GPU timing gate.
Requests: none.
Contract changes: none.
