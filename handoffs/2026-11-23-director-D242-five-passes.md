# D-242 Zombie five passes (card CZ-5P) - Director plan

Jerry, 2026-11-23 ~05:35Z: "Zombies are looking better than their predecessors but a long way off from done. Do five passes on every zombie. Find 10 issues each pass and resolve them." Jerry clarified: "That's 10 issues per zombie" = 10 issues PER ZOMBIE KIND, PER PASS (14 kinds x 5 passes x 10 = 700 fixes). Every pass asks:
- Q1 Connections: do the points of connection look right? Jagged edges, shelves or gaps where there should not be?
- Q2 Physics: does it physically make sense? Would it work in motion? Pieces that don't realistically make sense?
- Q3 Budget: best look within our performance budget.
- Q4 Fidelity: will it pass in our game? Will players easily spot incomplete or lacking areas?
- Q5 Clipping: things poking out, clipping, rough transitions?

D-241 (smooth joins, shambler hip shelf, boots) is pass 1, Q1.

## The 14 kinds and the lead for each
| Kind | Lead (geometry) |
|---|---|
| shambler, feral, screamer, military, drowned | Claude 3 |
| brute, spitter, bomber | Claude 6 (Director loans as needed; he also measures for everyone) |
| leaper, spider | Claude 5 (motion owner; also checks EVERY kind in motion for Q2/Q5) |
| demon, colossus, guardian, caveguard | Claude 7 (Director loans; plated armour is a style: smooth flesh-to-flesh) |
ChatGPT shoots natively. File owners keep ownership: ask a named loan in the LOOK.

## One pass, one kind
1. Shots: ChatGPT native front/side/back (review/D-241/zombiesheet3.mjs) + a motion strip (walk, attack, death).
2. Find 10 issues ON THIS KIND. Write review/D-242/<kind>/pass<N>.md: #, Q-tag (Q1-Q5), part, what is wrong, the fix, cost (tris/draws/spawn ms), a crop each.
3. Fix all 10 in one review copy. Cost flat or better per kind unless the Director OKs a trade (Q3).
4. Before/after front/side/back + motion strip. Director LOOK.
5. ChatGPT native check + original gates. Land per D-211.
6. Next pass starts from the landed kind: the next 10 worst issues on it.

## Order
Common kinds first: shambler, military, feral, spitter, bomber, drowned, brute, screamer; then leaper, spider; then bosses. Leads work their kinds in parallel. A kind finishes pass N before pass N+1.

## Scoreboard
review/D-242/SCOREBOARD.md (Claude 6 keeps it).

## For Jerry
After each kind's pass lands: one front/side/back before-vs-after in chat, plain words, 3 lines max.
