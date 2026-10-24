# GB-223 groups 1 and 3: blocked (Grokbot, 2026-10-23)
Checked out blocked after two interruptions in a row (rule).

Changed: tools/tests/t228.js (chainsaw support bar 0.019, close-up named), tools/tests/t229.js (revolver support 0.058; akimbo measured barrel-to-forearm, bar 0.9), tools/tests/t188.js (measures after the draw finishes).
Tests: real renderer t228 95/0, t229 75/0, t188 116/5. The t188 fails are flamer firing 0.345, support 0.731 and barrel on reticle 55 deg; chainsaw firing 0.201 and support 0.310. So waiting for the draw did not fix the anchors, and they still need re-anchoring to the handles as drawn (a t188probe.mjs was running).
Group 1: first-person aim shots exist in qa/2026-10-23-GB-223/fp-ads-*.png/json; not judged yet.
Revolver pop: qa/2026-10-23-GB-223/revolver-pop/ captured; not judged yet.
Not verified: group 1 verdicts, revolver pop verdict, t188 re-anchor. I stopped my own camera and probe processes and released the slot.