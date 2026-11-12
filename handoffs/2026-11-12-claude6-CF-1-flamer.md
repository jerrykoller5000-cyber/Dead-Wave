# claude6 — CF-1 flamer: detail, controls, camo (J149, D-177) — 2026-11-12
Changed:          Controls: safety (thumb lever on the grip mount's left cheek, turns about x, slotted pivot screw), igniter (a lever on the front grip's leading edge under the collar, hinged at its top for the support fingers), valve (the tank's yellow handwheel with its bar, turns about the outlet axis, rides the tank bank in the reload); the trigger pin's two ends; hex clamp screws on the front collar; the outer side plates and both grips now painted. The red tanks stay red (Director, 17:36Z). No proportion changed.
Files:            studio/weapon-heavy.js (makeFlamerModel).
Tests:            Cloud copy (Claude 6, one instance, rule 16: cloud slot, no PC game runs): t333 16 pass 0 fail; tgt20076 75 fail = the 75 it fails at baseline (the same failing lines; unsupported groups, missing contacts and every sling count identical to baseline on all five; only "other intersection pairs" rise, by the seated heads and ridges); cloud-only tzc6m240 4/0 (not shipped). No test expectation changed. Flamer: other intersection pairs 154 -> 172.
Screenshots:      review/CF-1/flamer-sheet.jpg, review/CF-1/flamer-controls.jpg.
Not verified:     cloud software render only; CE-9 hands pending.
Requests:         none.
Contract changes: none.
Rule 16:          every browser run went through the cloud slot (tools/game-test-slot.mjs), one at a time; nothing ran on the PC.
