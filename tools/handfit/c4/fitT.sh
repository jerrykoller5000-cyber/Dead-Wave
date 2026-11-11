#!/bin/bash
# CD-1 pass 2: a firing hand placed so its index pad reaches the trigger's face (TGT), the other fingers out of the guard's
# opening (a keep-out field of their own), the roll left to the game's twist (NOX).
# fitT.sh <name gun-r> <export> "<ko x0 x1 y0 y1 z0 z1>" "<trigger face x y z, gun space>" [MV mm]  -> res10/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p out10 res10
n=$1; src=$2; h=${n##*-}; MVV=${5:-16}
[ -f out10/$n.bin ] || PAD=${PAD:-0.010} BAND=0.015 python3 -I ../c4/sdf_c4.py $src $h out10/$n 0.001 > out10/$n.log 2>&1
python3 -I ../c4/kojson.py $src out10/$n-ko.json $3 > /dev/null
[ -f out10/$n-ko.bin ] || PAD=${PAD:-0.010} BAND=0.015 python3 -I ../c4/sdf_c4.py out10/$n-ko.json $h out10/$n-ko 0.001 > out10/$n-ko.log 2>&1
TG=$(python3 -I ../c4/tgt.py $src $h $4)
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out10/$n');console.log(JSON.stringify(g.H.hand.pose))})")
T='[0,4,5,6,7,8,9,10,11,12]'
R1=$(NOX=1 KOGRID=out10/$n-ko TGT="$TG" SCAN=1 SCANR='{"x":[-12,-6,0,6,12],"z":[-12,-6,0,6,12],"y":[-12,-6,0,6,12]}' node gungrip3.mjs out10/$n "$P" "$T" $MVV 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R1")
OUT=$(NOX=1 KOGRID=out10/$n-ko TGT="$TG" START="$R1" node gungrip3.mjs out10/$n "$P2" "$T" $MVV 2>/dev/null)
{ echo "TGT $TG"; echo "R1 $R1"; echo "$OUT" | grep -E '^start|^step 0.0125|^SELF|^RESULT'; } > res10/$n.txt
echo "$n $(grep RESULT res10/$n.txt | grep -o '"byB":\[[^]]*\]\|"ko":[^,]*\|"tgd":[^,}]*' | tr '\n' ' ')"
