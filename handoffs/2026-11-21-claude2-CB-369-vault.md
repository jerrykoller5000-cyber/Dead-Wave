# Claude 2 handoff, 21 Nov 2026 ~01:00Z: CB-369 step 1-3 (D-216), CB-368 v2, camera fix

Model: Claude Opus 5.5 (configured claude-opus-5-5). All work is REVIEW only, except one new unused file (see Landed).

## CB-369 (D-216 brute speed): see review/CB-369/RESULTS.md
- Step 1, relay vault static batch. New core/static-batch.js: inside each vault group (door, lift, roof, front, walls,
  reward stands) the parts sharing a material + shadow flags become one mesh in the group's space. Same materials,
  vertices, normals, uvs; the groups still move/scale/hide. index.html +4 lines (import + 3 after makeVaultModel).
  studio/relay-vault-model.js untouched (the vault is built there; game/relay-vault.js is reward logic only, so the loan
  on it and on landmark-details.js was not used).
  Numbers (cloud draw lists, 48-brute view): vault 124 -> 41 main, 115 -> 38 shadow; frame 571 -> 407 (-29 %).
  Checks: core/static-batch.test.mjs 2/2 (same world triangles, winding, normals, uvs in 5 states; fails on 3 planted
  bugs); t204 48/48; tcl288a, t271, t142 green (t272 skips on the fake page). Look: vault-before-after.jpg (looked: same).
  Candidate A: review/CB-369/index.cb369.html 5af04a41 = live ce43865a + 4 lines (make-candidate.py rebuilds on any live).
- Step 2 census: the ~90 unnamed meshes are mostly the forest (24 templates x wood+leaf = 48 draws, already instanced
  map-wide). No batch helps; rocks already batched. No change.
- Step 3, zombie shadow cap (LOOK change): candidate B review/CB-369/index.cb369b.html 5004b135 = A + 14 lines: only the
  nearest 16 zombies cast (ranked every 15 frames, 4 places slack). ?zshadowcap=999 = as before. Cloud check: 48 near
  brutes casting 48 -> 20 (16 + slack), nearest kept (the cloud runs ~1 fps, so the rank needed ~15 s; natively ~0.3 s).
- Asked: Director LOOK (vault sheet, B yes/no, camera fix OK); ChatGPT 2 native strict ABBA (live vs A, then B).
- Next after that: marine body 50 draws + 27 shadow (Claude 3's body; skin-merge like the zombies).

## CB-368 spider batch (HELD by the Director): copy fixed
- review/CB-368/manifest-v2.json: v1 MINUS spider hitH pick A (ChatGPT 2: with it t222 head 2/6, without 4/6, live 6/6;
  v1 minus that block = his fb7a4591 byte-exact). Rebased: index.cb368-v2.html 97e46660 on live ce43865a;
  zombie-concepts.cb368-v2.js 6883c0dc = clean 3-way merge on live e3bb0cab (Claude 3's jaw edits). Recipe:
  make-candidate-v2.py. Still RED: t222 reticle 4/6, CE-18d cost +8.01 %, hover. Not mine to fix (model).

## ChatGPT FYIs
- Training camera: tools/camera.mjs stale-frame check now also hashes the scene's middle (review copy
  review/CB-369/camera.cb369.mjs ac9f7254, make-camera.py; live b9d3b79b). Lands after the Director's OK.
  Training WebGPU zero draws: tick() early returns listed to ChatGPT (bet: DWOpening.active still true); waiting values.
- Request parser 'Reply DONE': crew.mjs is the Director's; fix idea sent to him in the LOOK request.
- ChatGPT 2's camera drift: advice sent (cursor-follow pan, easing, project from the player).

## Landed (D-211, no game effect)
- core/static-batch.js 530b3fc1 + core/static-batch.test.mjs (NEW files; nothing imports them until candidate A lands).
  Ready to commit with A after the Director's LOOK. Nothing else on the PC changed outside review/ and Claude outputs/.
- Moved to _DELETE ME/: cb369-partial-cloud-src.tgz, cb369-partial-code.tgz, index.cb369.next.html, index.cb369b.next.html.

## Later
- CB-370 Training Area performance pass (D-218 pass 3) after passes 1+2. Note: renderFrame skips sceneCull in Training
  (`gameStarted && !training.active`), a first thing to look at.
