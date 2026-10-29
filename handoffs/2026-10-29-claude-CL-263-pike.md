# claude — CL-263 The story chain: Pike where he hid (the survivors' last place) — 2026-10-29
Changed:          Pike now waits where he hid, beyond the hikers' camp (its far side from the HQ, 10 to 16 m out, a clear, dry, gentle spot), once the hikers' thread is done; with Grokbot's Brandt (the rangers' truck) and Okafor (the cellar), all three survivors are found at their thread's end (docs/specs/story-chain.md §6). t305 plays all three threads to their end.
Files:            index.html (buildHistoryProps, the hikers' camp: historyProps.pikeHide; survivorPlace: one line for the hikers, GB-232's hook as its comment said), tools/tests/t305.js (new)
Tests:            cloud, one instance (rule 16): t305 8/0 (twice), t148 23/0, t153 15/0, t167 20/0, t303 13/0. Node: world/history-props, first-people, lightning all pass. Inline scripts parse (0 errors).
Screenshots:      the cloud's software renderer now draws black (inspector) or times out (match), so the pictures are AG-152 (review/sweep/jobs/cl263-pike.json: the camp from three-quarter and above, and Pike close).
Not verified:     how his spot looks in the world until AG-152's shots; no full suite (Cursor's at the commit).
Requests:         AG-152 (Antigravity) for the shots.
Contract changes: none (survivorPlace's return is the same { x, z }).

## Addendum (2026-10-29, after AG-152)
AG-152's shots (review/sweep/pike-hide/) showed Pike in the open grass beyond the camp: a man in a field, not one in hiding. He now stands behind a tree 9 to 22 m beyond the camp (1.1 m past its trunk, the trunk between him and the fire), and in the open only when no tree is there. t305's distance bar widened from 10-16 m to 9.5-23.5 m for that (my own new test; --review).

## Addendum 2 (2026-10-29, after AG-154)
AG-154: on this map no tree stands in the first search's sector, so Pike was still in the open. The search now takes any side but the HQ's (125 degrees off straight out), 9 to 30 m, the spot at least 2 m farther from the HQ than the camp; a tree first, then a rock big enough to crouch behind; the open only when neither. On this seed: behind a tree 24 m west-southwest of the fire (cloud probe: nearest trunk 1.1 m). t305's bar is now 9.5-31.5 m out and at least 1.9 m farther from the HQ (my own test; --review). Cloud: t305 8/0, t167 20/0, t159 10/0. Also GP-19981: the two flat moustache bars on Brandt removed (his fitted beard's moustache stands alone).
