# claude — CL-296 ?gates=1, the story places ringed in stone (part 1) — 2026-11-03
Changed:          Behind ?gates=1 (off by default; only while the chain gates are on), four story places get a ring of the
                  bands' stone at their clearing's edge with one gate where their own trail comes in; the ring gate is the
                  chain gate (game/chain-gates.js) and opens with its key, then stays open for the run. Planned by
                  game/story-gates.js (rule 10, mine): R from 18 m down to 11 m, the first that keeps 3 m off every band,
                  6 m off every other place, off every other trail, off water and off anything already standing, with
                  the site and its approach 4 m inside. Spec: docs/specs/story-gates.md.
                  As built (the seed is fixed):  depot (-112.0, 8.0) r 11.5 · mast (-153.4, -4.2) r 18 ·
                  hikers (22, -126) r 18 · rangers (128, 0) r 18. One gate each.
                  No ring: the convoy (the mast's trail passes 7.9 m from the wreck: a ring would shut the mast's way),
                  Clarke's truck (the padlock is on the toolbox), the trapper (already a fenced yard). The convoy keeps its
                  point barrier for now (a Monday question).
Files:            game/story-gates.js (new), tools/tests/tcl296.js (new), docs/specs/story-gates.md (new),
                  index.html (sections: the ring hook after the shortcut bands; inHQThicket reads a ring's own line so no
                  tree grows in it; the gates before chainUpdate; chainUseE and chainPromptText ask the ring gate first;
                  poiPostList skips a shut ring (no guards, no bounty inside); the cordon checkpoint's trail ends skip a
                  ring; TT.storyGatesDbg). Patch script: Claude outputs/cl296/patch296.py.
Tests:            Cloud, through the slot. tcl296 with DW_TEST_QUERY="gates=1&chaingates=1": 43/0 (four rings; sites
                  inside, no other place inside; nothing standing in the wall; 24 bearings round each ring stop at the
                  wall; the gate's solids and the dead's field block while shut; E with the key at the ring opens the
                  chain gate, the leaves swing, solids and block go, the trail goes in; a run reset shuts it; without the
                  key it says why). Gates off: tcl296 2/0, t329 10/0, tcl285c 66/0, t313 19/0, t315 19/0, t316 8/0,
                  t142 10/0, t143 17/0, t83 31/0 (t315/t316 timed out once in the long batch; 40 s each alone, and with
                  the original index.html: the cloud's slowness, not this).
Screenshots:      none yet. The stone is the kit's far slab everywhere in the game (AG-211; Cursor's CU-234 fixes the LOD),
                  so the look is judged after that.
Not verified:     his way (AG-212: drive each ring from his launcher with ?gates=1, try the woods round, at night watch the
                  dead); the real page's numbers (a few hundred more solids, 4 more lines in the stone's three draws).
Requests:         ChatGPT: strings chain.<lead>.ringPrompt ('E — Open the gate' for now) for generator, relay, missing,
                  search. Cursor: CU-235 (a per-test query line) so tcl296's world checks run in the plain suite.
Contract changes: TT.storyGatesDbg { on, rings(), skipped(), gates(), shut(x, z), near(), build() }.

## 03:30Z: AG-213's night leak fixed
AG-213 (his way, RTX 5080): four rings clean, 0 breaches in 192 bearings, the key opens and he walks in; but at night 3
up to 6 dead appeared inside the shut depot and hikers' rings: screamerPull and groundRiseSpotOk placed them by trees and
distance with no ring check. Both now skip a spot inside a shut ring (index.html, patch296b.py); TT.storyGatesDbg.riseOk.
tcl296 47/0 (cloud, the flags; its first line now `// query: gates=1&chaingates=1` for CU-235's runner). AG re-watches.

## 04:20Z: the other ways the dead are placed (AG-216, and the audit)
AG-216 found a screamer's howl call-up (index.html ~59917) spawning inside shut rings: it skips them now. Then the rest of
the 22 spawnZombie callers: the wave edge spawns (map edge), the training, the dev and scripted ones can't land in a ring;
the ones that pick a spot near a place or near him now ask: isNavValidSpawn (the site calls' relaySpawnSpot, the radio
crates' guards and the others that use it) says no inside a shut ring, and so does the call-up at 46-54 m round him.
storyRingShut is now safe to call while the page is still building (nothing is shut before the rings and the chain exist).
