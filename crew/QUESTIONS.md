# Questions for Jerry

Asked with `node crew/crew.mjs ask <agent> "<question>"`. They show at the top of the crew panel.
Jerry answers in chat to Claude (or writes under the question); Claude closes them with
`node crew/crew.mjs answer Q-<n> "<answer>"`.

## Q-1 · answered · 2026-09-25T06:27Z · cursor

Load budget: since the splash can't be skipped (GP-27), it runs about 14 s on your GPU and the game finishes loading underneath it at 6-7 s, so a player never waits on the load. Keep chasing the 5 s warm target anyway (moving a 2 s shader compile behind the menu, some risk before Saturday), or call the load budget met by the splash?

**Answer (2026-09-25T08:55Z):** Jerry (08:50Z): "Go with what you think", so Claude's call: the load budget is met by the splash (D-36). Don't move the shader compile before Saturday; keep only the first-use stall fixes in CU-36.
