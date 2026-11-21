# chatgpt — GP-20163 seeded Military camouflage landed — 2026-11-20

Changed: Director LOOK accepted at 20:10Z and authorized the single-file D-211 landing. Initial camouflage now uses the body's existing seeded phase. Pool respawns still cycle through all five tiles. The approved source is live byte-for-byte.
Files: game/military-appearance.js MD5 4fe1cd812c9f284a27cb587aed1846d0 -> 82d3e5e9a50a5b5a156d664f05d3be72. Exact named backup: review/GP-20163/military-appearance.before-4fe1cd81.js.
Tests: Rule 16 native slot, one worker and one browser at a time. node crew/crew.mjs slot run chatgpt GP-20163 --checks "Landed military camo: native original body checks, then exact seeded cache and horde" -- node review/GP-20163/run-landed.mjs. Original t93 11/0, t164 14/0, t338 5/1, total 30/1. Only existing Feral fall ankle gap at 2.15 s, 5.6 mm. Actual normal-source WebGPU cache/horde exit 0: all 14 kinds exact cold + three warm; Military M81 in each; no page errors and 698 source hashes stable. Review A/B preserves all 13 other kinds byte-for-byte. The combined shell exit 1 records the original Feral failure.
Screenshots: review/GP-20163/native-camo-v2/{before,after}-horde.png. Production review/GP-20163/native-camo-landed-v1/landed-horde.png is byte-identical to the approved after PNG, with 20 actors and all five original tiles (MARPAT/M81/UCP/Multicam/DCU 2/4/9/2/3).
Not verified: Full suite and runtime performance. t338 reported two Drowned concept shin groups at 19.8 mm during fall as INFO.
Requests: Sent landed proof to the Director, Claude 3 and ChatGPT 2.
Contract changes: none.
