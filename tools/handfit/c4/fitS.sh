#!/bin/bash
# CD-1 fixes 4 (Claude 1): a firing fist fitted under its trigger guard, the index left to Claude 5's VM_TRIGGER:
# fitT's fields (the gun; the guard's opening as a keep-out for every bone but the index) with the index's middle and tip
# bones out of the gun's cost (SKIPB, default [2,3]: the root, bone 1, stays in), the roll left to the twist (NOX).
# fitS.sh <name gun-r> <export> "<ko x0 x1 y0 y1 z0 z1>" [MV mm] [SCANR json]  -> res11/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p out10 res11
n=$1; src=$2; h=${n##*-}; MVV=${4:-16}; SR=${5:-'{"x":[-9,-6,-3,0,3,6,9],"z":[-9,-6,-3,0,3,6,9],"y":[-9,-6,-3,0,3,6,9]}'}
[ -f out10/$n.bin ] || PAD=${PAD:-0.010} BAND=0.015 python3 -I ../c4/sdf_c4.py $src $h out10/$n 0.001 > out10/$n.log 2>&1
[ -f out10/$n-ko.bin ] || python3 -I ../c4/kojson.py $src out10/$n-koexp.json $3 > /dev/null
[ -f out10/$n-ko.bin ] || PAD=${PAD:-0.010} BAND=0.015 python3 -I ../c4/sdf_c4.py out10/$n-koexp.json $h out10/$n-ko 0.001 > out10/$n-ko.log 2>&1
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out10/$n');console.log(JSON.stringify(g.H.hand.pose))})")
T='[0,4,5,6,7,8,9,10,11,12]'; export SKIPB=${SKIPB:-'[2,3]'}
R1=$(NOX=1 KOGRID=out10/$n-ko SCAN=1 SCANR="$SR" node gungrip3.mjs out10/$n "$P" "$T" $MVV 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R1")
OUT=$(NOX=1 KOGRID=out10/$n-ko START="$R1" node gungrip3.mjs out10/$n "$P2" "$T" $MVV 2>/dev/null)
{ echo "SKIPB $SKIPB"; echo "R1 $R1"; echo "$OUT" | grep -E '^start|^step 0.0125|^SELF|^RESULT'; } > res11/$n.txt
echo "$n $(grep RESULT res11/$n.txt | grep -o '"byB":\[[^]]*\]\|"ko":[^,]*\|"move":\[[^]]*\]' | tr '\n' ' ')"
