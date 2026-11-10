#!/bin/bash
# from the fitted hold (g3, corrected fields out4): a wide scan, the thumb, then the fine solve -> res5/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p res5
for n in "$@"; do
  [ -f res5/$n.txt ] && continue
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out4/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  T=$(GDIR=out4 node touch4.mjs $n 2>/dev/null)
  R1=$(SCAN=1 SCANR='{"x":[-8,-4,0,4,8],"z":[-8,-4,0,4,8],"y":[-6,-3,0,3,6]}' node gungrip3.mjs out4/$n "$P" "$T" 16 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  R2=$(node thumbgun.mjs out4/$n "$R1" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
  OUT=$(START="$R2" node gungrip3.mjs out4/$n "$P2" "$T" 16 2>/dev/null)
  { echo "TOUCH $T"; echo "R1 $R1"; echo "$OUT" | grep -E '^start|^step 0.0125|^SELF|^RESULT'; } > res5/$n.txt
done
