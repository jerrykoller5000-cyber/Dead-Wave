# GB-233 rulings 4-5: silhouettes and the heavies from his eyes (grokbot, 2026-10-26)

Status:  review
Model:   Grok Bot
Files:   studio/weapon-longarms.js (AK, M4), studio/weapon-sidearms.js (revolver), index.html (FP_HEAVY_HIP + TT.fpHeavyHipDbg; the flame stream's materials, size curve and edge blobs; the nozzle flare's material)
Shots:   qa/2026-10-26-GB-233-r45/before/ (taken before any edit), after/, after-models/ (the inspector's black frames retaken), tune/ (the framing trials)
Tools:   g233cam.mjs (shots), tune.mjs (live FP framing trials), handprobe.mjs (hand-to-grip distances at the hip and through a reload)

## Whose area
- Ruling 5 names the minigun hold and CL-260's first-person hip hooks as mine. The FP camera, FOV and FP_HIP/FP_HIP_HAND are Claude's (CL-249/250/260), so I left them alone and added a per-gun table on top: FP_HEAVY_HIP, eased out down the sights the same way FP_HIP_HAND is.
- The flame stream is weapon code (updateFlameStream), so it's mine. The campfire's shared flameCoreMat/flameHotMat are untouched; the stream has its own materials now.

## Ruling 4: silhouettes
- AK: the gas tube runs out past the upper handguard to a gas block moved about two-thirds down the barrel (was 0.515-0.595, now 0.655-0.705). The lower handguard is slimmer (86 -> 74 mm wide, 63 -> 53 mm deep). The banana curve is deeper (the foot moves 20 mm forward).
- M4: the magazine has a slight STANAG curve; the magwell flares at its mouth; the trigger guard is thicker (9.5 mm band) and gunDark so it reads against the lower.
- Revolver: the barrel is thinner (radius 21 -> 17 mm; the underlug and rib slimmer with it); the top strap is 3 mm taller; there's a new crane on his left of the window's front, with its pivot screw. The bore (y 0.083) and the sights didn't move.

## Ruling 5: the heavies
- Framing: minigun {x 0.18, y 0.1, z 0}, flamer {x 0.14, y 0.22, z 0}. +x carries the gun out on his gun side, which shows as screen left because he's left-handed (D-75). Claude asked for lower-right; I kept it on his side. Moving forward (+z) pulled the hands off the gun (the minigun's support hand 24 cm off at z 0.3), so z stays 0. The minigun shows its barrels and the front of the receiver in the lower left. **The carry handle and the trigger hand still don't show:** every offset that brought them into view also pulled the hands off. Getting them in view needs the FP camera or FOV, which is Claude's area.
- Flame: no white-hot stage; the stream has its own orange (glow 1.5 vs the campfire's 2.3, so bloom doesn't wash it out). It starts at 0.3x size and widens (grow 0.3 + t*3.4, was 1 + t*2.6). 30% of the blobs fly wider and burn dark brown (the sooty edge). From his eyes there's no white blob any more (after/fp-flamer-fire.png). In third person it reads as a widening orange line but still beaded; the dark edge only shows in the smoke.
- Glove: his support hand is on the front grip (handprobe: L-to-fore 0.000). From his eyes it now shows at the bottom of the view (after/fp-flamer-fire.png, the camo sleeve and glove).
- The 3 cm drift: it only happens in first person, where the arm runs out of reach. Before: 2.8-3.1 cm mid-reload with no offset (matches GB-228's 3.3). At z 0.35 it got worse (3.5-4.3 cm). Final: 0.0-0.1 cm. The minigun's support hand at the hip is 0.9-1.3 cm off (was 1.6).

## Rule-19 scores (0-5, before -> after)
| Asset | Silhouette | Proportions | Materials | Reads from his eyes |
|---|---|---|---|---|
| AK | 3 -> 4 | 3 -> 4 | 4 -> 4 | 4 -> 4 |
| M4 | 3 -> 3.5 | 4 -> 4 | 4 -> 4 | 4 -> 4 |
| Revolver | 3 -> 4 | 3 -> 4 | 4 -> 4 | 3 -> 3 |
| Minigun (FP) | 2 -> 3 | - | - | 2 -> 3 (handle/hand still off screen) |
| Flamer (FP) | 2 -> 4 | - | - | 1 -> 4 (orange, widening, glove in view) |
| Flame (TP) | 2 -> 3 | - | 2 -> 3 | - |

## Tests (real renderer, the slot, --jobs 1)
t215 4/0, t95 9/0, t188 121/0, t189 47/0 (budget), t284 7/0, t133 9/0, t136 36/0, t196 17/0. t277 33/3: the same three pistol/revolver eye-line reds from the old GB-228 bar, reported before; the bar is unchanged. node --check is clean on all 5 module scripts and both studio files; no duplicated blocks; the studio files keep CRLF.

## Ruling 6
Already done (the lure's -5 hp was my probe holding a stale build reference, not a game bug). Skipped.