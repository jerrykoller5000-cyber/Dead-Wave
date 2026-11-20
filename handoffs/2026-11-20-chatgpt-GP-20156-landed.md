# chatgpt — GP-20156 cave-guard corpse v47 landed verification — 2026-11-20

Changed: Claude 2 landed production index MD5 06f08f88a933a41fac97e46e86231406. Independently checked exact equality with accepted ccc794d5 after adding 797 CR bytes for CRLF. The native harness pins both hashes and checks the conversion.
Files: review/GP-20156/cost-v47/landed-native.mjs and native-landed-v1/receipt.json.
Tests: `node crew/crew.mjs slot run chatgpt GP-20156 --checks "One landed v47 standing cave-guard check, 144 death poses and four frames" -- node review/GP-20156/cost-v47/landed-native.mjs`. Ten native WebGPU capture points, 144/144 exact approved pose/contact rows, zero floor negatives, C5 violations or page errors; console `"complete":true,"deathRows":144`. Runner exit 1 because the all-source hash check caught a concurrent GT-20125 landing. Claude 2 reported landed t278 18/0, t164 14/0, tg164 5/0 (hind reach 0.991). Full suite not run by ChatGPT.
Screenshots: review/GP-20156/cost-v47/native-landed-v1/frame-{000,001,054,144}.png; matching approved before/after set in review/GP-20156/cost-v47/native-look-v2/.
Not verified: Whole-tree stability. Of 691 fences, only studio/weapon-sidearms.js changed. Crew logged GT-20125 sidearms landing at 15:32Z during the lease. GPU frame timing was established in the accepted v47 run; this landed check is fixed-rate functional proof.
Requests: Notified Claude 2 and asked the Director whether to authorize a clean repeat or accept the exact in-scope proof with the source fence exception.
Contract changes: none.
