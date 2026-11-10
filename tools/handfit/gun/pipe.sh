#!/bin/bash
# gungrip3 (SCAN) -> thumbgun -> gungrip3 again from there; the result per gun-hand in res2/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p res2
for n in "$@"; do
  [ -f res2/$n.txt ] && continue; [ -f out/$n.bin ] || continue
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  T=$(node touch.mjs $n 2>/dev/null)
  R1=$(SCAN=1 node gungrip3.mjs out/$n "$P" "$T" 12 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  R2=$(node thumbgun.mjs out/$n "$R1" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
  OUT=$(START="$R2" node gungrip3.mjs out/$n "$P2" "$T" 12 2>/dev/null)
  { echo "TOUCH $T"; echo "R1 $R1"; echo "R2 $R2"; echo "$OUT" | grep -E '^step 0.0125|^SELF|^RESULT'; } > res2/$n.txt
done
