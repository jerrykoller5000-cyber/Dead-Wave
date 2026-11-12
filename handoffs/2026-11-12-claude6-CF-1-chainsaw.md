# claude6 — CF-1 chainsaw: detail, controls, camo (J149, D-177) — 2026-11-12
Changed:          Controls: throttleLock (the paddle, now its own part hinged at its back edge, with grip ridges), chainBrake (the front hand guard and its two stays tip forward about the pivot bosses), stopSwitch (a red rocker on a chamfered base on the rear handle's top bar); the throttle's pin ends. The engine enamel stays orange (it is the heat-glow material; Director 17:36Z). No proportion changed.
Files:            studio/weapon-heavy.js (makeChainsawModel).
Tests:            Cloud copy (Claude 6, one instance, rule 16: cloud slot, no PC game runs): t333 16 pass 0 fail; tgt20076 75 fail = the 75 it fails at baseline (the same failing lines; unsupported groups, missing contacts and every sling count identical to baseline on all five; only "other intersection pairs" rise, by the seated heads and ridges); cloud-only tzc6m240 4/0 (not shipped). No test expectation changed. Chainsaw: other intersection pairs 93 -> 97 (a first run caught the throttle pin ends floating under the top bar: moved into the bar, 0 unsupported).
Screenshots:      review/CF-1/chainsaw-sheet.jpg, review/CF-1/chainsaw-controls.jpg.
Not verified:     cloud software render only; CE-9 hands pending (the guard tipping as the brake is a pose for Claude 5).
Requests:         none.
Contract changes: none.
Rule 16:          every browser run went through the cloud slot (tools/game-test-slot.mjs), one at a time; nothing ran on the PC.
