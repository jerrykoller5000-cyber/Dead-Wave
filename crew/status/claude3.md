# Claude 3

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CC-369 D-242 shambler P3 + drowned P3 review copies (10 each), then military P2 when P1 lands, CC-366 speed
touching: review/CC-369/p3/, review/D-242/shambler/, review/D-242/drowned/, review/CC-366/
since: 2026-11-23T18:46Z
next: shambler P2 land (after Director LOOK + ChatGPT natives + Claude 5 motion); drowned P2 ChatGPT lands; CC-366 s53 decision; shambler P3
blocked-on: —
last-report: handoffs/2026-11-23-claude3-CC-369-s53.md

## Notes

### Session 53 (16:04Z - ~17:45Z 23 Nov, Opus 5.5, scheduled) - read this first
- Shambler P1 was LANDED by ChatGPT GP-20282 (08:31Z). Shambler P2 SENT for LOOK: review/CC-369/p2 (3 copies, mine), table review/D-242/shambler/pass2.md, sheet p2-shambler-LOOK.jpg. New build passes: lowerShoulderDomes, settleYokeOnChest (before the seam blend). Claude 5 motion asked.
- Drowned P2 SENT for LOOK: review/D-242/drowned/p2/zombie-concepts.d242p2.js 9321332d on live 2b7d79e6 (ChatGPT lands). LESSON: a slimmer drowned hem (or uneven hem points) sank into the kneecap and the stride pulled dark flaps over it: keep the hem width.
- CC-366 s53 = s51 + rips hunk (12/12). Warm timing by feature: s50 3.5 vs s51 6.4 ms; the WEAR pass is the +3 ms; 21 ms was a cold page. Asked the Director: precompute or land as is.
- CE-23 v6/v7 (Claude 5's copy of my neck-stump): OK given; my old bug: 'else { mesh.position.copy(u.head.position)' must be 'else if (!fit)'.
- Cloud kit s53: s42 a-code + s35 c-assets + newer7 + newer8 + _DELETE ME/claude3-s53-cloud/newer9.tgz. Folder access had to be requested at start (connectedFolders was empty).

### Session 52 (05:12Z - ~06:30Z 23 Nov, Opus 5.5, scheduled) - read this first
- CC-368 LANDED 05:17Z: index 0eab7b21, ui/marine-face.js 25b40d49, studio/marine-hats.js 0205c996, t146 12e013da (--review). ChatGPT landed-tree smoke asked.
- D-242 (Jerry: 5 passes x 10 fixes per kind; my kinds shambler, military, feral, screamer, drowned; D-241 joins = pass 1 Q1). Shambler pass 1 SENT for LOOK: review/D-242/shambler/pass1.md + review/CC-369/d241 (cand zombie-shambler-v5 610f0afc, zombie-atlas 1eb5e4fd). New pass restTankHemOnHips (tank hem rests 7 mm off belt/hips). Claude 6's joins list: review/D-241/joins-list.md (my kinds' items listed in my handoff).
- Card id note: CC-369 was also my old proportions id (review/CC-369/PROPORTIONS.md); D-241 work lives in review/CC-369/d241/.
- WRITES: cp/cat > on some PC files fail with "Invalid argument" (ui/marine-face.js): write in place with python open(r+b), seek 0, write, truncate.
- Cloud kit s52: s42 a-code + s35 c-assets + newer7 + _DELETE ME/claude3-s52-cloud/newer8.tgz (md5 = pc-md5.txt there, 326 files OK). node can build the shambler template directly (import vendor/three/three.core.js + studio/zombie-shambler-v5.js) for numbers. Pool bodies get their look at build: seeding Math.random does not give the same look.

### Session 51 (01:55Z - ~03:15Z 23 Nov, Opus 5.5, scheduled) - read this first
- CC-366 s51 SENT for LOOK: review/CC-366/s51 zombie-look.cc366.js fa720235 (soak from the front neckline + runs, knees 3-5 cm dark, beanie 13% / bandage 7% (head verts pushed), hairVol, tear strap/crop; own RNG stream, s50 picks same). 12/12 node. Cost cloud s50 8.9 vs s51 21 ms: speed pass if natives hitch. After LOOK: ask ChatGPT native pair + tcc366/t338/t222, then land (one file + test).
- CC-367 s51 SENT for LOOK: makeLimbStump in review/CC-367/s51 ab1904eb (s50 + limb part). Claude 5 wires it (hunk 3). His neck SPEED ask: cached vertex list tried, little gain + cut misses on drowned/spitter: LATER, profile measureNeck (cost may be traverse/updateMatrixWorld, not the loop).
- CC-368 s51: ADS cause = cheekWeld swung the lift + aimed the small head's eye. apply-neck 5 hunks 762bbd74 + face EYE_KEEP 25b40d49; weld-parity.mjs node proof 0.0000 mm. t146 copy 12e013da uses 4 cm (live bill only 5.6 cm past the brow): Director asked. ChatGPT natives asked. Claude 2 holds the loan.
- CF-24 (Claude 6): B shoulders 0.38/deltoid 0.51, C hips 0.21 are mine with Claude 9 AFTER CI-3 step 1; bar = review/CF-24/tcf24.js.
- Cloud kit s51: s42 a-code + s35 c-assets + _DELETE ME/claude3-s51-cloud/newer7.tgz + crew/notes.mjs (md5 = pc-md5.txt). hold-q.mjs (HOLD_QUERY='&nolook=1') + index line guarded by ?nolook=1 (cloud only) for bare bodies. NEVER run an eye/t146 job before shots in the same page (inspectHost held + startMatch break the camera): shots first, or a fresh page.

### Session 50 (17:15Z - ~18:45Z 22 Nov, Opus 5.5, scheduled) - read this first
- CC-366 s50 (ChatGPT GP-20226 reds) FIXED in my file: review/CC-366/s50 zombie-look.cc366.js ac28a31e. Cause: refreshZombieJoinLoss (pool reset, lost limb) writes joinBlend (taken in skinZombieMesh, BEFORE the look) back: anything editing skin after skinZombieMesh must update joinBlend (indices, weights, owners). Belly opened waist cut-outs: re-collapse after it. Look 18 -> 5.5 ms a body (cloud). WAITING: ChatGPT exact pair + gates, Director LOOK; then land (D-211, Claude 2's 2-line loan, apply-look.mjs on 26656706).
- D-237 #7 plan: review/CC-366/s50/PLAN-variety.md + s51 plan copy (grime, fade, soak, torn knees; own RNG stream). TODO: soak darker/ragged, knee holes smaller/darker. Head tilt = Claude 5's CE-24. Then other kinds.
- CC-368: ChatGPT HOLD fixed: review/CC-368/s50/apply-neck.mjs 9791c95f (eye correction along the torso's up; headG.userData.neckLift). t146 bill bar (world z > .15, now .14): asked the Director (my pick: measure from the brow, --review).
- CC-367: review/CC-367/s50 stump 76e4b38a = + warmNeckStump(THREE) for Claude 2's countdown warm (CE-23 HOLD idea 3). Ideas 1-2 are Claude 5's.
- Claude 6 CF-23 FYI: shoulders +61%, hips 0.32 vs 0.18: options B/C are mine later (with CI-3).
- Cloud kit s50: s42 a-code + s35 c-assets + s45..s49 newer + _DELETE ME/claude3-s50-cloud/newer6.tgz + game/training-infirmary-fence.js (md5 vs pc-md5.txt there). Hold: game-test-slot.mjs run claude3 CC-366 -- node review/CC-365/hold.mjs. The renderer CRASHED twice after ~100+ zombie bodies in one page (pool drains): keep jobs small, restart the hold when load goes ~0.

### Session 49 (04:52Z - ~06:05Z 22 Nov, Opus 5.5, scheduled) - read this first
- CC-366 s49 push ACCEPTED (Director 05:40Z): review/CC-366/s49/zombie-look.cc366.js b1479823 -> NEW studio/zombie-look.js, zombie-look.test.mjs (4/4), NEW tools/tests/tcc366.js, apply-look.mjs (Claude 2's 2-line loan, applies on a113bd7a). WAITING: ChatGPT natives (hitchhunt live vs look + t338/t222/t93/t111/t164/tcc366). Then LAND (md5 guard + backup), then the other kinds.
- Hair is painted in the shambler ATLAS (head tile), not the vertex colours: the look reads each head vertex's texel. Bind pose differs per body (game bakes tilt/lean before skin): the shared layout cache is keyed on UVs + skin indices only; positions are per body.
- Other kinds (m1 probe): feral/military/screamer/bomber/drowned/spitter all = ONE zombie-skin on the shared 1024x512 concept DATA atlas + vertex colours (military: + a 256 camo skin, bomber: + an untextured 5k skin + gut/vein meshes). Zones there: by vertex-colour clusters (skinColor vs cloth), not atlas rects.
- CC-367 step 2 sent (LOOK + Claude 5): review/CC-367/s49/zombie-neck-stump.cc367.js b9744413 (replaces 41ab6e9c): low rim, flesh fills, NEW cutNeckSkin/restoreNeckCut (needs 1 line in resetZombieMesh, in Claude 5's CE-23 batch). Shambler NOT cut: its neck knob stands behind the cut in the hunch: own pass on the shambler neck piece next. Bomber head cap: asked ChatGPT.
- CC-368 sent (LOOK): HEAD_SIZE .89 -> .73 + NECK_LIFT .04 (marine-face), ballcap bill .148 (marine-hats), index 3 lines (apply-neck.mjs, Claude 2 loan; FP eye kept). Pictures = live head set x0.82/+4 cm, copies not run in a game yet.
- CC-364 LATER: shadow pass still draws 2 single sleeves (ChatGPT GP-20200).
- Cloud kit s49: s42 a-code + s35 c-assets + s45..s48 newer + _DELETE ME/claude3-s49-cloud/newer5.tgz (+3 world/game files staged; whole-tree md5 = PC: pc-md5.txt there). hold.mjs as before. Cloud rm of a dir glob is refused by the safety check: use new dirs.

### Earlier (history in the handoffs)
- s48-s38: CC-365 dummy chip, CC-366 s48/s49 looks, CC-367 neck stump, CC-364 marine draw merge (landed s46), CC-359 shambler rebuild + jaw (landed s42/s44), CC-358 player shape, CC-362 option A (landed s43). Details: handoffs/2026-11-2*-claude3-*.md.
- Start: request folder access to ~/Desktop/Tiny Trek. crew.mjs EINVAL on the card: retry after 8 s. Never pkill: kill by PID. Never build twice on one Math.random seed in a job.

- Start: request folder access to ~/Desktop/Tiny Trek. crew.mjs EINVAL on the card: retry after 8 s. Never pkill: kill by PID. Never build twice on one Math.random seed in a job.
