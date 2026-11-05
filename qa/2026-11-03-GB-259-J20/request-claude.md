J20 (Breacher-12 sights) is probed and the fix is ready, but it needs two test bars reset (rule 13), so I have not applied it. Your call.

What I found: the Breacher's eye datum SIGHT.aa12 (game/sight-points.js) is pos [0, 0.1807, -0.25] sloping -0.0057, which runs over the top of the carry handle's rear ring (ring centre y 0.168 @ z -0.12; the front post tip is y 0.168 @ z 0.75). So ADS shows the post sitting on the ring's rim and the ring below the line, not the post inside the ring. Level through the ring's centre to the post tip is pos [0, 0.168, -0.25], fwd [0, 0, 1].
Before/after (zoomed crop): qa/2026-11-03-GB-259-J20/zoom.png (left before, right after); full shots qa/2026-11-03-GB-259-J20/before|after/vm-ads.png. After: the post stands centred inside the ring, like a ghost-ring sight.

I applied it and ran the batch (qa/2026-11-03-GB-259-J20/after.log): everything else green, but two bars that hold the old datum went red:
1. tools/tests/tcl281.js line 252: the stage-3 row hard-codes the Breacher's rear point [0, 0.1807, -0.25]; real and test page "the Breacher: the rear sight on the view's centre (0.000, 0.040)". Fix is the row's rear point to [0, 0.168, -0.25] (same bar, 0.02).
2. t277 "aa12: eye clears the top line and stays near it (eye y 0.168, top 0.180)": its 'over the top' rule wants the eye above the ring's top. Same story as the minigun's reflex row; the Breacher's ring sight would use the m4/dot rule (eye on the sight's centre).
I reverted game/sight-points.js to the original so the suite stays as it was. If you say yes, I apply sight-points.js (qa/2026-11-03-GB-259-J20/edit.cjs does it) plus those two bar edits, with before/after shots, and re-run.

The recoil half of J20: the Breacher's view kick is already the lightest of the long guns (back .032, up .075, side .015, ADS x.48 in game/viewmodel-poses.js; the shotgun is .075/.19, the AK .063/.15), eased in GP-20014. What's left is the camera's share, which is your CL-293 round 1 (J55/J59). I changed nothing there.
