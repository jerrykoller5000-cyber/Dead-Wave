#!/bin/bash
# CD-1 pass 8: field (sdf_c4: multi-body parts split, corners keyed as clip-check.js keys them, BAND 15 mm) then the solve
# fit8.sh <name> <fire|wrap|wide> <export json>  -> out8/<name>.*, res8/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p out8 res8
n=$1; mode=$2; src=$3; h=${n##*-}
[ -f out8/$n.bin ] || BAND=0.015 python3 -I ../c4/sdf_c4.py $src $h out8/$n 0.001 > out8/$n.log 2>&1
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out8/$n');console.log(JSON.stringify(g.H.hand.pose))})")
case $mode in
  wrap) T='[0,2,3,5,6,8,9,11,12]'; SR='{"x":[-6,-3,0,3,6],"z":[-6,-3,0,3,6],"y":[-4,0,4]}'; MV=16;;
  wide) T=$(GDIR=out8 node touch4.mjs $n 2>/dev/null); SR='{"x":[-16,-10,-5,0,5,10,16],"z":[-16,-10,-5,0,5,10,16],"y":[-12,-6,0,6,12]}'; MV=24;;
  *) T=$(GDIR=out8 node touch4.mjs $n 2>/dev/null); SR='{"x":[-8,-4,0,4,8],"z":[-8,-4,0,4,8],"y":[-6,-3,0,3,6]}'; MV=16;;
esac
R1=$(SCAN=1 SCANR="$SR" node gungrip3.mjs out8/$n "$P" "$T" $MV 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
R2=$(node thumbgun.mjs out8/$n "$R1" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
OUT=$(START="$R2" node gungrip3.mjs out8/$n "$P2" "$T" $MV 2>/dev/null)
{ echo "TOUCH $T"; echo "R1 $R1"; echo "$OUT" | grep -E '^start|^step 0.0125|^SELF|^RESULT'; } > res8/$n.txt
echo "$n $(grep RESULT res8/$n.txt | grep -o '"byB":\[[^]]*\]')"
