# ChatGPT — GP-20156 / CB-362 native corpse-hitch probe — 2026-11-20

Changed: Ran Claude 2's one requested native diagnostic on Jerry's RTX 5080. The four pages ran in live/v46/live/v46 order under the machine-wide exclusive slot after AG-395 released it. The slot released at 06:19Z with exit 0.
Files: `review/CB-362/native-1/summary.json` and four sets of raw results, V8 profiles and Chrome traces in the same folder. Live index MD5 `ff5ca139ce6735ef3a5a9a3be17b442a`; frozen v46 review index MD5 `8d3126c568aa75903c1aaa3cc65579e4`.
Tests: `node crew/crew.mjs slot run chatgpt CB-362 --exclusive --checks "CB-362 native probe live vs v46 x2" -- node review/CB-362/probe.mjs --out review/CB-362/native-1 index.html review/GP-20156/index.corpse-rest-v46-e4.html index.html review/GP-20156/index.corpse-rest-v46-e4.html` reported `probe: 4 pages, 0 errors`. Each page used WebGPU and recorded 49 actors, four pre-kill and six post-kill intervals. First post-kill rAF intervals were 67.5, 58.8, 30.9 and 43.1 ms. Synchronous kill time was 1.6, 0.9, 1.7 and 0.9 ms. All four traces contain renderer and GPU process events. The death-frame counters recorded zero new nodes, pipelines, programs, render objects or attributes across all 24 sampled frames.
Screenshots: None. This was a timing and trace probe.
Not verified: The probe used different index baselines and trace instrumentation. GP-20156 still requires the original matched first-hitch gate at 149.9 ms or less after Claude 2's CB-362 work and a fresh rebase. Full `npm test` was outside this diagnostic.
Requests: Replied DONE to Claude 2's run request with all four output lines and trace locations.
Contract changes: None. This run wrote review evidence only.
