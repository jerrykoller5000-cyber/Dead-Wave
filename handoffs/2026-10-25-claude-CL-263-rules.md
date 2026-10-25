# Claude — CL-263 The story chain: the spec and the rules (N24, N7, N21) — 2026-10-25
Changed:          The spec (docs/specs/story-chain.md) and the chain's rules in the game. The day missions become the twelve's unfinished business, one lead a dawn from day 2 in the order the valley hands them over (the generator, the relay, the medical run, the missing, Clarke's truck, the search, the old man; then below), each opening the dawn after its cause is done, never before its day, at most one a dawn and two open, a lead left two dawns lets the next open anyway. The game now tells the chain each dawn and what got done (each mission's own done state, polled), and publishes 'story-lead' (open, done) for the way in. The gate that hides and locks a site whose lead isn't open is built but OFF: it goes on when GP-19969's way in lands (the dawn card, the duty board, the radio), so nothing in play changes today.
Files:            game/story-chain.js (new: LEADS, createStoryChain), game/story-chain.test.mjs (new); index.html (the import; storyChain, STORY_DONE, storyDawn/updateStoryChain/resetStoryChain/storyClosedSite before objectiveReach; objectiveReach's 'story' block; storyDawn at the morning; the reset in resetHQ; the 'story' dev command; TT.storyDbg); tools/tests/t292.js (new); docs/specs/story-chain.md
Tests:            node --test game/story-chain.test.mjs → 9/0 (order, earliest days, the two-dawn fallback, two open at most, jumps, the two threads, sites, reset). Test page on the cloud box: t292 15/0 (day 1 nothing; day 2's dawn opens the generator and says so; the relay done in play marks its lead; day 4 opens the medical run; the gate on locks a closed lead's site and not an open one; a new run starts again); t204 48/0, t286 11/0.
Screenshots:      none (no visible change while the gate is off)
Not verified:     The chain as a player meets it: that needs GP-19969 (the dawn card, the board, the radio) and the gate on; then Jerry plays it.
Requests:         ChatGPT GP-19969 (the events and hooks below); Grokbot GB-232; Antigravity AG-125.
Contract changes: new event 'story-lead' { phase: 'open' | 'done', id, site, by, thread, day } on the 'dw-game' bus (docs/contracts.md to add), and TT.storyDbg { read(), gate(on), closedSite(site), reach(site), sync(), leadForSite(site) }. Approved by Claude (lead) 2026-10-25.

## For GP-19969 (the way in)

- Listen for `story-lead` on `dw-game`: `open` is the dawn card's moment and a new card on the duty board; `done` ticks it.
- The leads, their sites, threads and who left them: `game/story-chain.js` LEADS. Their lines are in the spec §4 (one line each, in the voice of whoever left it); the hikers' names in §5.
- The map: a site whose lead is closed shows no marker while the gate is on (`TT.storyDbg.closedSite(site)`, or a `storyClosed(site)` you'd like exposed to ui/: say which).
- When your panels land, I turn the gate on (one line) and move the mission tests' setup to `story all`.
