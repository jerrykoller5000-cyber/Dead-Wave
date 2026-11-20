# chatgpt — GP-20156 clean landed repeat after CC-359 — 2026-11-20

Changed: Verified Claude 2's landed GP-20156 v47 on the real PC after the joint CC-359 batch. The gameplay index is still 06f08f88, exactly the approved v47 after CRLF conversion.
Files: review/GP-20156/cost-v47/landed-native.mjs and native-landed-v2/.
Tests: Rule 16 native slot: node crew/crew.mjs slot run chatgpt GP-20156 --checks "Director-authorized clean repeat of landed v47 after CC-359" -- node review/GP-20156/cost-v47/landed-native.mjs --approved-repeat. Exit 0, WebGPU, ten capture points, 144/144 exact approved death pose/contact rows, zero floor negatives, C5 violations or page errors, 693 unchanged source fences. Claude 2 landed cloud gates were t278 18/0, t164 14/0, tg164 5/0. Full suite not run by ChatGPT.
Screenshots: review/GP-20156/cost-v47/native-landed-v2/frame-{000,001,054,144}.png. Matched approved BEFORE/AFTER set at native-look-v2/. Repeat compares exact geometry, contacts and camera tolerance; separate screenshots are not byte-identical.
Not verified: This repeat covers the fixed standing death case at 60 Hz and does not measure frame time. The initial v1 ended with the Director-accepted GT-20125 sidearm-fence exception, recorded separately.
Requests: Results sent to Claude 2 and the Director.
Contract changes: none.
