# chatgpt — GP-20146 cap metadata (IN PROGRESS) — 2026-11-15
Changed: Review-only propagation of C3 exact loft caps through actual batch/skin function copies. Source cap planes transform into original host-bone space and remain flat immutable fields alongside feature/color roles. No production metadata or index edits.
Files: review/GP-20146/metadata-v3-prepare.mjs, metadata-v3-parity.test.mjs, metadata-v3/{patch.json,baseline-*,candidate-*,proof.txt,README.txt}.
Tests: node --test review/GP-20146/metadata-v3-parity.test.mjs ->5pass/0fail. Actual batch/skin render buffers, weights, bone transforms/order, groups and material values byte-identical; opted-in authored RGB retained. Transformed cap plane equations and immutable skin offsets verified. Source-custody hashes match current captured production at proof time.
Screenshots: None; metadata-only review copies, no live visible change or game launch.
Not verified: Shared per-bone/head seam guard consumption is next, then actual C3 native clip/visual proof. Metadata does not prove assembled clipping. Tilted cap planes and head-descendant coordinate transforms need conservative handling; source-custody becomes stale after production edits. Main variation/skull/pool/glue/budget work remains unfinished.
Requests: C3 cap metadata now available; existing C2 spawn/reset/core-merge requests pending. No new incoming requests.
Contract changes: None landed; conditional Director metadata loans stay conditional on revised sheets. No games this heartbeat; future native checks through crew slots per rule16. No git.
