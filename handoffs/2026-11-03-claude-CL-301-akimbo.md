# CL-301: akimbo in first person, the minigun's right hand, the chainsaw (Claude, 3 Nov 2026)

Jerry, live, 3 Nov afternoon, on AG-221's 13-gun sheet: the akimbo panel was "one big pistol at the bottom left and no
hands"; then "Chainsaw and minigun still weird. Right hand is sticking through minigun." His references for all of
it: docs/jerry/2026-11-03-fp-refs/pair-heavy/ (MW pistols, Warzone revolvers, MW3 Uzis, a photo; L4D2 chainsaw and
minigun, a minigun viewmodel render), with what we take from each in its README.

## What was wrong

- **Akimbo.** updateViewmodel's `st.want` excluded `akimboOn()`, so a pair fell back to the old first person (his own
  body's guns from his eyes). The view gun had no idea of a second gun.
- **The minigun.** Its right-hand grip point (VM_SOCKETS.minigun.grip [0, 0.24, -0.19]) was 8 cm in front of the top
  grip, in its trigger guard, so the grip's block stood through the back of the hand. The forearm (fixed elbow
  [0.40, -0.86, -0.09]) ran steeply down through the housing and the drum.
- **The chainsaw.** Its hip was up the middle (at [0, -0.32, -0.68], pitch 0.40): the yellow body filled the middle of
  the view and hid the bar, one hand on top.

## What changed

game/viewmodel.js (mine; ChatGPT's GP-20021 vmMaterial/finishViewMaterial section untouched, merged 3-way):
- `copyGun(key, src, holder)` out of buildGun; `buildGun(key, pair)` adds `gun2`, a copy of the off hand's gun
  (`ctx.offhand(key)`, index.html's offhandMeshes) under `vm-gun-2`. One gun to two (or back) lowers and raises like a
  weapon change.
- `gunFrame(P, key, st, dt, AK)`: a pair's right gun at `VM.akimbo[key]` (no sights: right-click brings both in, up
  and out a little); its left gun is the mirror across the view (`mirrorFrame`: x to -x, the quaternion (x, -y, -z, w),
  a turn, not a reflection). Each gun its own kick spring (KA, KB) on its own shots (`userData.shots`, counted on the gun
  that fired), the view's share for both. The reload: both dip (down, muzzles up a little, canted in) and come back.
- The hands: the right hand on the right gun with its grip point on the hold's grip (WEAPON_HOLD grip, when the gun
  has no authored one); the left hand on the left gun as the right hand's hold mirrored (`mirrorSocket`, its grip point
  where the right one's is, mirrored), the right hand's fingers. Each first turns round its grip toward a point behind
  and below (VM.akimbo.behind, twistMax 1.1), then its elbow hangs at VM.akimbo.elbowRel: the forearms come up from the
  bottom corners as in the refs (the body's akimbo hold has them out flat to the sides). No reload hands for a pair.
- The off hand's own gun is out of the eye's pass; `muzzleWorld(out, 2)` gives the left gun's muzzle (index.html's
  laser for the off-hand gun now leaves from it).
- `info.akimbo`, `gun2`, `frame2`; live tuning: `info.tune.akimbo = { pistol: {hip}, elbowRel, behind, follow }`,
  `info.tune[key].hip` for any gun.

game/viewmodel-poses.js (mine this pass: VM.akimbo, the minigun and chainsaw rows, VM_SOCKETS.minigun):
- `VM.akimbo`: pistol (MW: low, nearly upright), revolver (Warzone: further out, turned in), uzi (MW3: big, close,
  high, turned in); elbowRel, behind, twistMax, aim, kick 1.2, dip.
- Minigun: grip [0, 0.235, -0.275] (the top grip's middle); elbowRel r [0.16, -0.22, 0.30] (the forearm from the lower
  right, outside the housing), l [-0.30, -0.45, 0.45]; hip at [0.22, -0.24, -0.62] yaw 0.12 (the barrels nearer the
  middle, L4D2).
- Chainsaw: hip at [0.24, -0.33, -0.62], yaw 0.55, pitch 0.45, roll 0.55 (the body low right, the bar up to the upper
  left, the left hand on the front handle with its forearm from the bottom left, L4D2).

index.html: `offhand: (k) => offhandMeshes[k]` into createViewmodel; `st.want` no longer excludes a pair; `st.akimbo`;
the off-hand laser from `muzzleWorld(_, 2)`.

## Checks

- tools/tests/tcl301.js (new, 22/0 on the cloud): two view guns, mirrored, one each side, low; each hand on its own
  gun's grip; the forearms from below, not out flat; each gun kicks on its own shots only, the view's share for both;
  the reload dips both 8+ cm and brings them back, together, the elbows well ahead of the eye; the left muzzle left of
  the eye; the off hand's gun out of the eye's pass; back to one gun; the minigun's grip point inside the top grip.
- tcl281 140/0 and tcl293 24/0 on the cloud test page with the change.
- The cloud real-page looks (fptune, WebGL): Claude outputs/cl301/ (ak-pistol, ak-uzi, ak-revolver, the reload's dip,
  minigun, chainsaw).
- Then AG-228 from Jerry's launcher (the his-way rule): the pairs at rest, each hand firing, the reload, right-click;
  the minigun at rest and firing; the chainsaw idle and cutting.

## Left

- The gloves read as black blobs against the dark guns up close (GP-20021's materials; Jerry's glove refs are in).
- The minigun's right hand is mostly behind the tall top grip from the eye: it grips it now, but little of it shows.
- The chainsaw's right hand on the rear handle is off the frame (as in L4D2); its wrist sits at the bend limit.

## 4 Nov 01:25Z: the hands on GP-20022's rebuilt minigun and chainsaw

ChatGPT's GP-20022 rebuilt both to Jerry's references (handoffs/2026-11-03-chatgpt-GP-20022.md) and gave the handle
centres. game/viewmodel-poses.js: VM_SOCKETS minigun grip (0, -0.017, -0.52) (the rear firing grip) and support
(-0.075, 0.263, 0.16) (the top post); chainsaw grip (0, -0.014, -0.46) (the rear throttle) and support (-0.01, 0.246,
-0.035) (the hoop's top). game/viewmodel.js gunFrame now places a gun by its view grip (VM_SOCKETS grip) when it has one,
so the view holds still when Grokbot's GB-275 moves the third-person hold. The hips re-set so each gun sits where it did
(placed by the new grips), the forearms from below (elbowRel). Cloud looks: Claude outputs/cl301/minigun-gp20022.png
(the left hand on the top post, the rear grip below the frame as in L4D2) and chainsaw-gp20022.png (orange, the left
hand on the hoop). tcl301 22/0 (its minigun check now on the rear grip), tcl281 140/0 on the cloud. Then AG-232.

## 4 Nov 02:20Z: the chainsaw's motorcycle grip (Jerry: "Left hand should have a motorcycle grip on chainsaw palm facing down")

game/viewmodel.js readSockets: a hand's axes can be set outright in the gun's space (VM_SOCKETS gripBasis / supportBasis
{ x: the grip channel, y: toward the elbow }, live as info.tune[key][side].basis); the authored grip point still places
it. The chainsaw's left hand: channel along the hoop's top bar (gun -x), forearm down and back ([0, -0.85, -0.5]), the
fingers in HAND_POSES.fist round the bar (supportPose), each forearm on along its hand (elbowFollow [0.28, 0.04]). Cloud
look: Claude outputs/cl301/chainsaw-motorcycle-grip.png (the back of the hand up over the bar). tcl301 22/0, tcl281
140/0 on the cloud. The minigun waits on GP-20024 (ChatGPT's side peg, Jerry: "a grip that juts off to the side").

## 4 Nov 02:46Z: the minigun's left hand on GP-20024's side peg

Jerry: "create a grip that juts off to the side. Something like a peg to hold into. That way his arm will not clip through
the gun." ChatGPT's GP-20024 peg: centre (-0.304, 0.012, 0.16), axis vertical. VM_SOCKETS.minigun support there, its
axes set outright (supportBasis x [0, -1, 0], the channel along the peg; y [-0.6, -0.3, -0.74], the forearm out, down and
back), a fist round it; elbowRel l [-0.22, -0.25, 0.25]: the forearm from the lower left, outside the -X plate. Cloud
look: Claude outputs/cl301/minigun-side-peg.png. tcl301 22/0, tcl281 140/0 on the cloud. ChatGPT's final capture and
t188 next; AG-232 his way for both heavies (Grokbot's GB-275 third person when it lands).
