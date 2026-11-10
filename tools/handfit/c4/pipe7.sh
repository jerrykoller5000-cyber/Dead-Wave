#!/bin/bash
# CD-1: a support hand's wrap from its wrap start (out7 grids): the fingers' pads and the palm on the handguard, a scan,
# the thumb, then the fine solve -> res7/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p res7
for n in "$@"; do
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out7/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  T=${TOUCH:-'[0,2,3,5,6,8,9,11,12]'}
  R1=$(SCAN=1 SCANR='{"x":[-10,-5,0,5,10],"z":[-10,-5,0,5,10],"y":[-8,-4,0,4,8]}' node gungrip3.mjs out7/$n "$P" "$T" 16 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  R2=$(node thumbgun.mjs out7/$n "$R1" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
  OUT=$(START="$R2" node gungrip3.mjs out7/$n "$P2" "$T" 16 2>/dev/null)
  { echo "TOUCH $T"; echo "R1 $R1"; echo "$OUT" | grep -E '^start|^step 0.0125|^SELF|^RESULT'; } > res7/$n.txt
done
