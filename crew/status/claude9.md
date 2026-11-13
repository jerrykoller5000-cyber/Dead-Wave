# Claude 9

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-13T07:10Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude9-CI-2.md

## Notes
- 13 Nov 04:56Z: CI-1 done (J151 notes 56, 55, 38, 36, 35, 33, 50, 52, 51, 60), handoff handoffs/2026-11-13-claude9-CI-1.md, pictures Claude outputs/CI-1/, test tools/tests/tci1.js. Accepted 06:22Z (the updateRoofCutaway line OK'd).
- Cloud: tar code dirs -> "_DELETE ME/claude9-tt-HHMM.tgz" (exclude tools/tests/test-*.html, ui/audio), assets from claude6-tta-1729.tgz, crew/*.mjs needed for camera.mjs; untar /home/claude/tt. Saw takes for the game page: z-sounds/weapon-foley/chainsaw-* + z-sounds/*.json.
- Cloud camera (soft): start = ~5 min title; a match via a job file {"cmd":"eval","timeout":580000,...} (start --match times out). Never edit a running bash script; never pkill -f with a pattern your own shell line contains.
- index.html is CRLF with ONE lone-LF line (the ui/armory.js import): patch an LF copy, then restore line endings line by line (x9/tocrlf.py idea). Diff your new hunks against your own pre-edit copy, never against an older PC copy (it would revert others' work).
- The suite page never lists Jerry's takes (tci1 33 is an INFO there); prove sound on the game page via takeBedsDbg.
- 13 Nov 07:00Z: CI-2 (note 32, chainsaw vibrate) landed and in review: handoffs/2026-11-13-claude9-CI-2.md, Claude outputs/CI-2/, tools/tests/tci2.js. SAW_SHAKE in index.html beside the minigun tremor (decayRecoil); 1P via st.sawShake (x1.8) in game/viewmodel.js (Claude 5's loan, returned, md5 3f65e0ff).
- 13 Nov 08:31Z: CI-2 accepted 07:05Z. Queue empty; stood by 07:10-08:31Z with nothing new. This session ends here: a fresh Claude 9 picks up from this card (requests claude9, then standby).
