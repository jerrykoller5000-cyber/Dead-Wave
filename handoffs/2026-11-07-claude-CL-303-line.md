# claude — CL-303 the story places' new locks and the line, behind ?gates=1 (D-116) — 2026-11-07
Changed:          Jerry's D-116, all behind ?gates=1 (off by default). The depot and the rangers keep stone. The mast yard is a
                  chain-link ring with wire on top and a chain-link gate grown over with vines: the machete (or the katana)
                  cuts them in three chops. The machete lies in the depot shed by the pump (inside the depot's ring); taking it
                  is having it (macheteOwned). The hikers' camp is a ring of trees (two rows grown and one young, the band's
                  solids hold the line) with a crashed truck across its mouth: the winch from the convoy (by the escort truck's
                  spot behind the ambulance) is bolted to the truck, its line tied to the big tree outside, then E held at the
                  remote (on its lead, the other side, clear of the swing) for 7 s drags the truck out and round until it lies
                  beside the trail; the noise calls the dead. No Sato's key, no glovebox key on the line.
                  The line: one lead open at a time, in LEADS' order (search after truck), no two-dawn fallback, no spare keys,
                  a closed lead can't be done, no gate opens before its lead is open. The Grave Shift orders: a done lead's
                  order is stamped at the HQ duty board (E there, before its briefing), and the next prints at the dawn after.
                  Looks are placeholders (AG-245 fence and vines, AG-246 trucks, AG-247 teleprinter; GB-288 the real chop).
Files:            game/story-chain.js (LINE_RULES, stamp/stamped/due/rules), game/chain-gates.js (CU-200's, taken under D-115:
                  LINE_GATES, the line option, has(); old behaviour unchanged), game/story-gates.js (ring kind, winchSpots),
                  index.html (patch: Claude outputs/cl303/patch303.py; backups there), game/chain-line.test.mjs (new),
                  tools/tests/tcl303.js (new), tools/tests/tcl296.js (its key-at-the-ring check moved to the rangers' stone
                  ring), docs/specs/story-gates.md (§ CL-303).
Tests:            Cloud (fake renderer): tcl303 44/0, tcl296 47/0; gates off: tcl285c 66/0, t83 31/0, t142 10/0, t143 17/0,
                  t313 19/0, t315 19/0, t316 8/0. Node: chain-line 7/0, story-chain 9/0, chain-gates 7/0, utilities 6/0.
Screenshots:      none yet (placeholders; AG-244 after AG-245/246).
Not verified:     the real renderer (the chain-link texture's alpha, the trees' look, the frame rate with ~170 more trees under
                  ?gates=1); his way.
Requests:         AG-245/246/247 (modules named on the board), GB-288 (the chop: TT.storyGatesDbg.line.use('mast','gate')),
                  GP-20034 (the machete off the kiosk and the vault's pool, the line's words chain.<lead>.line.* and order.*,
                  the eight orders in Hale's voice).
Contract changes: storyChain: stamp(id), stamped(id), due(), rules(); LINE_RULES. chainGates: LINE_GATES, createChainGates({ line,
                  leadOpen, hasTool }), has(key), whyShut 'not-yet'. TT.storyGatesDbg.line; rings() carries kind.
