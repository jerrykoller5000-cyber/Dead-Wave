#!/bin/bash
cd /home/claude/handfit-work/gun
for n in "$@"; do k=${n%-*}; h=${n##*-}
  [ -f out9/$n.bin ] || python3 -I ../c4/sdf_c4.py /home/claude/fpshot/g9/shots/$k.json $h out9/$n 0.001 > out9/$n.log 2>&1
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out9/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  echo "$n $(OUT=cont9/$n.json node contact.mjs out9/$n "$P" 2>&1 | grep -v stale)" >> cont9/all.log
done
