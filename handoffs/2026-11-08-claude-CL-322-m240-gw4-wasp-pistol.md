# claude - CL-322 (D-122 second round) 5-8 of 14: the M240 (GP-20062), GW-4 (GP-20055), Wasp (GP-20054), pistol (GP-20057) - 2026-11-08 08:48Z
Changed:          5/14 the M240's belt change (Claude outputs/cl322/patch322f.py): the M240B handout's sequence (raise the feed
                  cover, lay the belt's first round in the tray, close the cover; charge: the handle to the rear and
                  forward). The Watchman's R ran 3.2 s with the left hand rising beside the gun and the right nudged
                  forward, the cover shut and the handle still. game/watchman-mg.js: watchmanFeed(reload) gives the beats
                  (the cover up .10-.22, down .56-.66; the left hand on the cover's rear catch .00-.66, down at the tray
                  .24-.54; the right hand to the charging handle .68-.99; the handle back .75-.82 and forward .84-.90);
                  watchmanPose returns them with feed/charge as before. index.html updateWatchmanExperiencePose: GP-20062's
                  feedCover turns +1.05 about its front pin at full, the chargingHandle runs 0.19 back, and the hands'
                  targets come from those parts in the elevating group's space (the catch, the tray's left edge, the knob),
                  blended from their old rest places.
                  6/14 the GW-4 (patch322e.py, ChatGPT's request): VM_SOCKETS.m4.support [0, -0.01, 0.43] (was [0, .004,
                  .36], the old 40 mm tube) and WEAPON_HOLD.m4 fore the same: the palm under GP-20055's quad rail's bottom
                  cover at the covers' middle.
                  7/14 the Wasp: checked, nothing to change. J44 ("keep the looks"): it stays stockless (the Micro look);
                  the FN manual's folding stock is not added. GP-20054's catches, grip safety, selector marks and the hidden
                  rails for the RMR and the laser/light are as they should be; the hands and sights fine in his 5080 frames.
                  8/14 the pistol: checked, nothing to change. The 12-round magazine and the model's 0.259 m (a G17 is 17
                  and 0.204 m) stay as the game has them: capacity is balance and the size moves every hand and sight point;
                  both go to Jerry as a question.
Tests:            node --check; cloud tcl281 153/0 (GW-4 support moved); t141 7/0, t243 23/0; t213 21/1 "a burst: 9 cases" in
                  the cloud with and without this change (the cloud's frame rate against the test's real-time 100 ms waits;
                  ChatGPT had 22/0 on the PC). Watchman: node of watchmanPose over the feed (the
                  beats as listed); FP strips p38 (the GW-4 at the hip and down the holo: the palm under the rail's
                  middle) and p39/p40 (the mounted M240, R: cover 0 -> 1.05 by 0.6 s, held, shut by 2.1 s; the handle
                  0.06 -> -0.129 -> 0.06 at 2.6-2.9 s).
Screenshots:      Claude outputs/cl322/gw4.jpg, wasp.jpg, pistol.jpg, m240-belt.jpg.
Not verified:     the 5080: the Watchman's hands reaching the raised catch (26 cm over the pivot) and the knob; the GW-4's
                  third-person fore on the rail.
Requests:         AG: a 5080 look at the Watchman's belt change (third person) and the GW-4's hands on the rail.
Contract changes: watchmanFeed (new export), watchmanPose's added fields; VM_SOCKETS.m4.support; WEAPON_HOLD.m4.fore.
