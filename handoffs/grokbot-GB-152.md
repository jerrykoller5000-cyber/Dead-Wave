# GB-152 Phase A: real fingered hands (Jerry, 2026-10-09 16:57 CT)

Jerry: "Make hands that have real finger. Make them manipulate the weapons accurately." Phase A of four (A hands, B grip poses per weapon, C triggers, D low ready). Each phase gets its own id.

Changed:
- New studio/marine-hand.js: a low-poly hand with a palm, four fingers of three segments each and a two-segment thumb (15 joints, all posable every frame). It is the old mitt's size, uses the same glove (with knuckle guards) and bare-skin materials, and sits on the same wrist with the same grip channel (wrist.userData.grip).
  - API: rig.set(pose).update(). A pose holds joint angles per finger [knuckle, middle, end, spread] plus the thumb [base curl, swing, end curl]. HAND_POSES has open, relaxed, fist (fitted round a 2.6 cm bar through the grip channel) and point. lerpPose/copyPose helpers. rig.point(name) gives palm, thumbTip/Base, and <finger>Tip/Base/Mid in hand space for tests and probes.
  - Cost: one mesh per material per hand, deformed rigidly on the CPU only when the pose changes. That's about 40-60 µs per hand per change, no skinning, and it works on the test build's three. A child Object3D keeps mergeRigidMeshes from baking it.
- Thumb side fixed in the mesh. The index finger and thumb are now on the +x*side edge. The mitt had them on the other edge, so each mitt was the mirror image of the hand it should be.
- studio/marine-body.js arm(): the mitt build (palm form, four digit ridges, two-piece thumb, guards, seam) is replaced by buildHandMeshes for the glove and the bare hand, with one shared rig on wrist.userData.hand. Dress lists (gloveOn/handBare), the wrist and its grip are unchanged.
- index.html:
  - holdHand flips its channel sign once, at the top, for every caller (sign = -sign). With the hand's chirality corrected, the index finger therefore points exactly where it did for every gun.
  - GB-151's mirror hack is removed (PISTOL_GRIP, handsMirrored, mirrorHands). Its call sites now pass plain signs. wrapG is now just HANDS.fore === 'grip', and sgL treats the wrap as GB-151 had it. The slide skip is HANDS.fore !== 'grip', which is the same behaviour as before.
  - New poseHands(ud, wR, wL), called where mirrorHands was: each holding hand blends from relaxed to fist with its hold (firing hand: holdW; support hand: holdWL*holdW, or 1 with the knife out, or holdW akimbo). Phase B replaces this with the per-weapon table.
  - Import of HAND_POSES/lerpPose.
- Survivors, the cinematic crew and the dressing-room preview all use makeMarine, so they get the hands, relaxed.
- Triangles: both hands together go from 1472 to 1784 (+312; 832 glove + 60 guards per hand). Visible meshes under the wrists stay at 4. Whole marine: 32,668-32,920 triangles, 111-112 meshes (some of that difference is other people's edits between my runs).
- FPS on the real renderer (headless Chrome, M4 in hand, training map, 8 s windows, A/B/A/B in one session): hands posing every frame 11.3 fps vs pose updates off 11.5 / 11.5. That's within noise; the first window was warm-up. Box micro-benchmark: 62 µs per forced update of all three skins.
- GB-145/146/148/149/151 behaviour is unchanged. t229 (GB-151 grip) passes 75/0 on the real renderer with the new hands.

Files: studio/marine-hand.js (new); studio/marine-body.js (arm(): hand build, plus one import); index.html (holdHand sign, GB-151 mirror block replaced by poseHands, mirror call sites, wrapG/sgL/slide conditions, import); tools/tests/t240.js (new); tools/tests/t229.js (mirror checks become chirality checks, hand points from the rig, "no air" now measured mesh to mesh); handoffs/2026-10-09-grokbot-GB-152/ (before/, after-A/, compare-A.png, grip-probe.mjs + grip-page.js (hand close-up views, __marineStats), fps-probe.mjs, real-test.mjs, t229-real.txt, t240-real.txt)

Tests:
- t215 4/0 after the index.html edit (and again before checkout).
- t240 (new): headless 17/0, real renderer 17/0 (t240-real.txt).
- t229: headless 13/0, real renderer 75/0 (t229-real.txt).
- t187 75/0, t188 91/0, t189 15/0, t194 35/0, t195 16/0, t218 44/0, t226 38/0, t228 13/0.
- t221 27/0 alone. It failed 1 check in the batch and in one solo run: the sniper case's gun-local vx is read at the end of a 1-2 s loop, after the case may already have bounced. That is a timing flake; the run-all retry marks it flaky.
- t188 failed once in the batch and passed on retry (flaky under load, as before).

Screenshots: handoffs/2026-10-09-grokbot-GB-152/compare-A.png (before/after: relaxed hand front and side, M4 support hand, pistol 3/4); after-A/unarmed-*-hand-*.png, after-A/m4-*-hand-*.png, after-A/pistol-*.png; before/ matches.

Not verified: the dressing-room preview and the burial-detail crew by eye (same makeMarine path, relaxed pose baked at build); the legacy body (GP-106 review) keeps its own mitts.

Requests: Claude, your holdHand now flips its sign at the top. Any new holdHand caller should pass the sign as it would have for the mitt. ChatGPT, arm() in studio/marine-body.js builds the hands through studio/marine-hand.js now.

Contract changes: wrist.userData.hand (the rig: set(pose), update(), point(name, out), layout, joints, skins). studio/marine-hand.js exports FINGERS, HAND_POSES, copyPose, lerpPose, handLayout, buildHandMeshes, makeHandRig.
