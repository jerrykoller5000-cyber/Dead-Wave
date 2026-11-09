# claude - CL-322 (D-122 second round) 9 of 14: GP-20063's heavies into the hands and the game; t284's datums - 2026-11-08 16:10Z
Changed:          Claude outputs/cl322/patch322g.py, patch322h.py, patch322i.py (anchored, idempotent), on ChatGPT's requests and
                  AG-261's review:
                  The rotary gun (GP-20063 scales every part 0.70 about the origin, 1.040 m held): VM_SOCKETS.minigun grip
                  [0,-0.0119,-0.364] / support [-0.2128,0.0084,0.112] (AG-261: the glove 103 mm off the peg); WEAPON_HOLD.
                  minigun the same in third person; SIGHT.minigun through the scaled reflex dot (0.231 @ 0.0249); the case's
                  ejection point 0.7x (CASING_WEAPONS.minigun); VM.minigun hip 4 cm up, 2 cm forward (it sat low).
                  The saw (bar and chain 0.71): WEAPON_SIZE.chainsaw len 1.425 (re-measured; the old 1.715 held it at 0.78 m
                  and 0.53 m on the pack, AG-261), look 1.24, so it holds at GP-20063's 0.971 m. First person: at the hip the
                  nose up more (pitch 0.45 -> 0.58), the shorter bar above the left forearm. Down the sights: the saw has no
                  sights, and looking along it the left glove on the hoop's top bar hides the bar from any eye height t277
                  allows, so game/viewmodel.js now takes VM.<gun>.ads.pose for a sightless gun (a raised pose instead of the
                  sight line); the saw's is centred and nose-up, the bar up the middle of the view (J60), chosen live with
                  info.tune (four variants on the cloud page).
                  The flamer: WEAPON_SIZE.flamer.len stays 1.094 (with GP-20063's longer wand that is what holds it at his
                  1.293 m; AG-261's suggestion to set len 1.293 would shrink it back).
                  The launcher's reload on GP-20063's narrower drum (radius 0.14 -> 0.112, chambers' orbit 0.075 -> 0.065):
                  VM_STAGE2 launcherDrum drumOut rootAt y -0.15 -> -0.122, loadIn/load -0.115 -> -0.105 (the old 1 cm and
                  4 cm clearances). A cloud strip of the reload before this (p42/b2): latch, drum out, three rounds, wind,
                  close - the hand reaching the drum each time.
                  t284 (a probe on the test page, assertions on the real renderer): its datums follow the sights: the
                  revolver's rear notch 0.120 (CL-322's fix), the launcher through the M2A1 dot (no front post), and the
                  KR-7's notch/post 0.074/0.0745 (CL-311; t284 still had .090 and its INFO said "would fail").
                  The AA-12: ChatGPT may group the bolt face/extractor as userData.recoilBolt; I animate its stroke after.
Tests:            node --check; cloud (the tree re-synced from the PC: the container was reclaimed) tcl281 153/0, t277 38/0
                  (the minigun's new sight point passes), t284 INFO: every gun at 0.000 except the KR-7 (0.025/0.017 with the
                  old datum, fixed after). Cloud strips p41/p42: the rotary gun's glove on the peg, the saw's bar above the
                  forearm at the hip; the saw's ADS pose chosen from live variants (the code path itself verified by
                  node --check and tcl281 only: the cloud copy's strip tool went with the reclaimed container).
Screenshots:      none new for Jerry yet (the heavies' sheets come with GP-20063's re-shoot).
Not verified:     the saw's ADS pose and the launcher's reload hands in the game after this patch (ChatGPT re-shoots
                  GP-20063; AG on the 5080).
Requests:         ChatGPT: re-shoot GP-20063 FP (rotary hip/ADS, saw hip/ADS, launcher reload) and check out when green. AG:
                  the same on the 5080, and third person: the rotary gun's hands, the saw held and on the pack.
Contract changes: VM_POSES[*].ads.pose (optional; sightless guns); VM_SOCKETS.minigun; WEAPON_HOLD.minigun; SIGHT.minigun;
                  WEAPON_SIZE.chainsaw; CASING_WEAPONS.minigun; launcherDrum places; t284's datums.
Jerry:            J53: the pistol keeps 12 rounds ("leave it's capacity the same"); its size unchanged.
