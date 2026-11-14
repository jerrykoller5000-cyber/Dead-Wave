#!/bin/bash
# CE-12 review sheets: before (b-) above after (a-), same cameras
cd /home/claude/ce12/out; S=/home/claude/ce12/sheets; mkdir -p $S
A=""; for p in b a; do for u in 008 02 033 05 06 075 085 095; do A="$A $p-pistol-reload-u$u-game2x.png::$([ $p = b ] && echo BEFORE || echo AFTER)-u.$u"; done; done
python3 ../sheet.py $S/CE-12-pistol-reload-game-camera.png "CE-12 pistol 3P reload at the game camera (2x aim zoom), beats u: BEFORE top, AFTER bottom, noon" 8 360 $A
A=""; for u in 008 033 05 075 085; do for v in right left; do A="$A b-pistol-reload-u$u-$v.png::BEFORE-u.$u-$v a-pistol-reload-u$u-$v.png::AFTER-u.$u-$v"; done; done
python3 ../sheet.py $S/CE-12-pistol-reload-close.png "CE-12 pistol 3P reload, close views front-right/front-left of the hands, BEFORE | AFTER pairs, noon" 4 480 $A
for u in 05 085; do A=""; for L in noon overcast dusk night; do for v in game2x right; do A="$A b-pistol-reload-u$u-L-$v-$L.png::BEFORE-$v-$L a-pistol-reload-u$u-L-$v-$L.png::AFTER-$v-$L"; done; done
python3 ../sheet.py $S/CE-12-pistol-reload-u$u-4lights.png "CE-12 pistol 3P reload at u .$u in four lights (BEFORE | AFTER)" 4 420 $A; done
A=""; for L in noon overcast dusk night; do for v in game2x right left; do A="$A a-pistol-hold-L-$v-$L.png::hold-$v-$L"; done; done
python3 ../sheet.py $S/CE-12-pistol-hold-4lights.png "CE-12 pistol 3P hold (unchanged, CD-9 fit) in four lights" 6 360 $A
A=""; for t in 012 03 045 06 08; do for v in game2x wide; do A="$A b-saw-start-t$t-$v.png::BEFORE-t.$t-$v a-saw-start-t$t-$v.png::AFTER-t.$t-$v"; done; done
python3 ../sheet.py $S/CE-12-saw-start-sequence.png "CE-12 chainsaw start in 3P, SAW_START t: BEFORE | AFTER (game camera 2x, and wide front-right)" 4 480 $A
A=""; for L in noon overcast dusk night; do for v in game2x wide right; do A="$A b-saw-start-t045-L-$v-$L.png::BEFORE-$v-$L a-saw-start-t045-L-$v-$L.png::AFTER-$v-$L"; done; done
python3 ../sheet.py $S/CE-12-saw-start-top-of-pull-4lights.png "CE-12 chainsaw start at the top of the pull (t .45), four lights, BEFORE | AFTER" 6 360 $A
