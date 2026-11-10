#!/bin/bash
cd /home/claude/handfit-work/gun; mkdir -p res4
for n in "$@"; do
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  T=$(node touch.mjs $n 2>/dev/null)
  R1=$(SCAN=1 SCANR='{"x":[-12,-6,0,6,12],"z":[-12,-8,-4,0,4,8,12],"y":[-8,-4,0,4,8]}' node gungrip3.mjs out/$n "$P" "$T" 20 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  R2=$(node thumbgun.mjs out/$n "$R1" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
  OUT=$(START="$R2" node gungrip3.mjs out/$n "$P2" "$T" 20 2>/dev/null)
  { echo "TOUCH $T"; echo "R1 $R1"; echo "$OUT" | grep -E '^step 0.0125|^SELF|^RESULT'; } > res4/$n.txt
done
