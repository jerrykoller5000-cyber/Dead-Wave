# Questions for Jerry

Asked with `node crew/crew.mjs ask <agent> "<question>"`. They show at the top of the crew panel.
Jerry answers in chat to Claude (or writes under the question); Claude closes them with
`node crew/crew.mjs answer Q-<n> "<answer>"`.

## Q-1 · answered · 2026-09-25T06:27Z · cursor

Load budget: since the splash can't be skipped (GP-27), it runs about 14 s on your GPU and the game finishes loading underneath it at 6-7 s, so a player never waits on the load. Keep chasing the 5 s warm target anyway (moving a 2 s shader compile behind the menu, some risk before Saturday), or call the load budget met by the splash?

**Answer (2026-09-25T08:55Z):** Jerry (08:50Z): "Go with what you think", so Claude's call: the load budget is met by the splash (D-36). Don't move the shader compile before Saturday; keep only the first-use stall fixes in CU-36.

## Q-2 · answered · 2026-09-26T03:53Z · claude

The studio is ready for your first note (CL-61). Open Tiny Trek\review\guardian-drag\index.html, watch v2, then write under a '## date - Jerry - v2' line in notes.md in the same folder. The guide is docs/studio-guide.md. Your notes start the guardian's rebuild (CL-62); gallop, pounce and throw are there too whenever you want.

**Answer (2026-09-29):** Jerry: "It's looking better but still needs a lot of work. Ask me the questions for it and I will answer." Claude asks him in chat and works CL-62 from his answers.

## Q-3 · answered · 2026-09-27T04:08Z · claude

Grokbot's GB-60 (skulls always reach the bag) rests on one question about the skull you couldn't pick up at dawn: did it have a glowing ring on the ground under it? A real skull drop always has one, in the colour of that zombie's eyes. If yours had no ring, what you saw wasn't a skull drop (maybe a corpse's head), and we'd chase a different bug.

**Answer (2026-09-29):** Jerry: close it. But the skulls pulled in after the last kill need to make a sound so he knows he collected them: CU-76 (D-68).

## Q-4 · answered · 2026-09-29T07:12Z · cursor

Hollows (D-67), three calls: (1) Does being caught below end the run (the plan), or only cost the haul? (2) A fresh warren layout every run (the plan), or the same every run so they can be learned? (3) Should the secret's final fight (D-56) be underground in the chalk heart, behind the rune doors, rather than at the chalk mouth?

**Answer (2026-09-29):** Jerry: (1) caught below ends the run; (2) the same layout every run; (3) deep in the heart. On the board in D-67 and P-97.

## Q-5 · answered · 2026-09-30T23:05Z · claude

Two specs for your yes: the Hollows (docs/specs/hollows.md: the Hush, five warrens, the stir, the haul, twelve dog tags kept for good) and the secret (docs/specs/secret-quest.md: a five-glyph word a run, learned from the tower, the static and rune shards, entered at the radio once a day; right, and a cleared warren's rune door opens to the chalk heart, where the guardian can be killed for the true ending). The crew builds on them now; say what to change and it changes.

**Answer (2026-09-30, ~23:25Z):** Jerry: "For the hollows and the secret, use your best judgement." Both specs stand as written (docs/specs/hollows.md, docs/specs/secret-quest.md); Claude's calls from here.

## Q-6 · open · 2026-10-05T22:40Z · claude

Grokbot found the marine is left-handed on screen: his gun arm is his anatomical left, so the stock sits in his left shoulder (GB-129; shots in handoffs/2026-10-02-grokbot-GB-129.md). You asked for the stock in the right shoulder. Mirror him so he is right-handed (Claude, CL-121: the arms swap, and the holsters, the draw, the reload pouch and the carry follow), or keep him as he is?
