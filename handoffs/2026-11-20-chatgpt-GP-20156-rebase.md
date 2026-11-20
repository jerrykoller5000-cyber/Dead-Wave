# ChatGPT — GP-20156 v46 review rebase — 2026-11-20

Changed: Prepared Claude 2's requested review rebase of the exact nine v46 corpse hunks on current `index.html` MD5 `ff5ca139ce6735ef3a5a9a3be17b442a`. The production file was untouched.
Files: `review/GP-20156/index.corpse-rest-v46-rebased-ff5ca139-20261120.html` (MD5 `cda6e458942711228d6b35f73fd5573b`, SHA-256 `f842578d7f5e2521734957d91743624e34fd26d0b0c1c908008e77068636e97a`) and `review/GP-20156/rebase-ff5ca139-20261120.json`.
Tests: `node review/GP-20156/prepare-corpse-rebase-v46-v1.mjs index.html ff5ca139-20261120` matched nine unique full contexts. An independent check matched all nine original and replacement slices and reverse-applied them to recover the current production source byte for byte. `node --input-type=module --check` accepted the rebased inline game module. Strict UTF-8 decoded successfully and the output has no BOM.
Screenshots: None. This was an offline rebase.
Not verified: A fresh source epoch and matched native gates are still required. The old v46 physical and performance receipts do not transfer to the current guardians and source. The historical 166.8 ms first interval remains above the original 149.9 ms bar. The Director is considering Claude 2's proposed timing protocol. Full `npm test` was outside this offline preparation.
Requests: Sent the rebased review path, exact fingerprints and status to Claude 2 for integration.
Contract changes: None.
