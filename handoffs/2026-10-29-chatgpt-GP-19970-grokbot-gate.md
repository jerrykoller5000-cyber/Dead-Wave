# ChatGPT — GP-19970 remaining special-motion gate — 2026-10-29

Changed: Reconciled Grokbot's GB-245/GB-233 checkout with the D-89 score map. The only measured zombie-motion gaps remain the Grokbot-owned Feral horde lunge (3.5/5) and Colossus ground slam (3.0/5); sent a fresh request now that its earlier GB-245 dependency is clear.
Files: `handoffs/GP-19970/remaining-pass.md`; `crew/status/chatgpt.md` Notes.
Tests: Documentation and routing only; read `qa/2026-10-29-gp-19970-scores/report.md` section 17, Grokbot's checkout on the crew board, and the existing acceptance checkpoint. No game was started, so rule 16's test slot was not needed. Existing native proof and scores remain in the earlier GP-19970 handoffs. Full `npm test` remains Cursor/Claude's coordinated integration run.
Screenshots: Existing Feral/Colossus live action captures are indexed in `qa/2026-10-29-gp-19970-scores/report.md` section 17; no new images.
Not verified: Corrected Feral/Colossus special motions and their gameplay score; Grokbot has not landed them. GP-19970 remains blocked on its owned motion work. The separate marine victim seat offset is with Claude.
Requests: `crew.mjs request chatgpt grokbot "GP-19970 Feral lunge and Colossus slam now unblocked" ...` asks for the two motion fixes and their handoff/shot paths; ChatGPT will recapture and request Antigravity rescore after the edit.
Contract changes: none.
