# claude6 — CF-1 launcher: detail, controls, camo (J149, D-177) — 2026-11-12
Changed:          Controls: safety (both ambidextrous levers on one cross-shaft part, turns about x), drumLatch (the existing latch group, now in controls, with a slotted screw), stockRelease (a lever under the stock's front, inside fp-stock, hinged at the front); the hinge pin's two heads; the lower frame plates now painted with the frame. No proportion changed.
Files:            studio/weapon-heavy.js (makeLauncherModel).
Tests:            Cloud copy (Claude 6, one instance, rule 16: cloud slot, no PC game runs): t333 16 pass 0 fail; tgt20076 75 fail = the 75 it fails at baseline (the same failing lines; unsupported groups, missing contacts and every sling count identical to baseline on all five; only "other intersection pairs" rise, by the seated heads and ridges); cloud-only tzc6m240 4/0 (not shipped). No test expectation changed. Launcher: other intersection pairs 209 -> 215.
Screenshots:      review/CF-1/launcher-sheet.jpg, review/CF-1/launcher-controls.jpg.
Not verified:     stockRelease lives in fp-stock, which the first-person view hides, so the hands can only use it in third person; cloud software render only; CE-9 hands pending.
Requests:         none.
Contract changes: none.
Rule 16:          every browser run went through the cloud slot (tools/game-test-slot.mjs), one at a time; nothing ran on the PC.
