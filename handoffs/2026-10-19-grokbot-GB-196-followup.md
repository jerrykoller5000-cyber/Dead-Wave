# GB-196 follow-up - the hikers' tree within 120 m (Claude's call) - grokbot

Changed:
- game/hikers-kit.js: HIKERS.treeNear 50, treeFar 120; new pickHikersTree(trees) - nearest bank tree within 50 m, else nearest bank tree within 120 m, else the nearest camp tree (3-50 m) with no river.
- game/hikers-kit.test.mjs: a test for the three tiers and the null case (12 tests now).
- index.html hikersBuild: candidates (d to camp, bank = within 16 m of the river line, dry trunk, water within 9 m out along the bough) into pickHikersTree; 'site hikers river' still falls back to the nearest bank tree at any distance. A dry run at a bank tree now drops the bag onto the dry bank (hikers.dry: back in toward the trunk until out of the water), not into the riverbed.
- tools/tests/t264.js: a normal run ('site hikers') must pick a river tree within 120 m; the dry landing must be out of the water.

Tests:
- node 12/12; t264 21/0; t215 4/0; t95 9/0; syntax/duplicates clean.
- Default world: a normal run picks the bank tree at (-94.2, -12.6), 116.1 m from the camp (2.0, -77.7), river true.
- Shots (bot box /workspace/gb196/): 5-normal-run-hanging.png, 5-normal-run-river-tree.png.

Not verified:
- 116 m is close to the 120 m limit on this world; a world change that moves the river could put it back to the camp tree (t264 would say so).
- No waterfall (pool = where the bag snags after 40 s), as agreed.