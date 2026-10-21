# ChatGPT — Phase 0 UI specification — 2026-09-23

Changed:          Wrote the six ordered Phase 1 UI specifications with keyed copy,
                  states, owner data needs and acceptance evidence. Added a Phase 2
                  objective/cache design with inspected candidate coordinates and
                  explicit world/combat owner requests. No game implementation.
Files:            docs/specs/ui-phase1.md; appended handoffs/requests.md;
                  this handoff note.
Tests:            npm test → FAILED before discovery (ENOENT: package.json absent);
                  0 tests executed, no pass count claimed. New tests: none in this
                  documentation-only task. Test cases are specified for each phase.
Screenshots:      None. tools/shoot.mjs is absent; no visible game behavior changed.
Not verified:     Required npm suite, before/after rig images, cold/warm load times,
                  48-zombie frame rate, novice banking within 60 seconds, proposed
                  API compatibility after extraction and final objective placement.
                  Read-only old browser harness inspection confirmed seven proposed
                  centers are dry and clear of current circular solid footprints;
                  this does not prove safe paths, slopes or production performance.
Requests:         Cursor: split/harness/shots, input/lifecycle/storage/loader wiring,
                  atomic purchases, shell copy and documentation assignment.
                  Claude: contracts/work gate, world IDs/stages, Phase 2 props and
                  placement validation. Grokbot: previews, item/build events, prep
                  recommendations, dead prep state, objective defenders/rewards.
                  All are recorded in handoffs/requests.md.
Contract changes: None. Interface shapes in the spec are proposals pending Claude's
                  approval and owner implementation in docs/contracts.md.

## Decisions for review

- Remove Skip prep and tt_skip_prep instead of creating an automatic alarm.
  Manual preparation preserves control and matches the current HQ flow.
- Preserve skulls -> HQ window -> Cash. Multipliers say skull value. Purchase
  receipts happen only after successful delivery; banking completes after the
  HQ processing sequence, not when the bag is emptied.
- Propose Field Intel at 120 Cash, once per run, for full wave counts/sources.
  Basic preview remains available; no paywall on urgent combat warnings.
- Phase 2 uses one-time supply rewards, with overflow retained and claims saved
  atomically. Radio repair reveals supply locations, not the purchased wave intel.

## Scope and next handoff

Read AGENTS.md first and respected the split freeze. No edits to index.html,
tools, world, combat, runtime UI or assets; no commits or pushes. index.html
changed externally during this task and was never rewritten or restored.

This is a specification handoff, not a claim that Phase 1 shipped or rule 7's
release gates passed. After Cursor's split and Claude's work release/contract
approval, start task 1 (strings) and hand it off separately before task 2.
